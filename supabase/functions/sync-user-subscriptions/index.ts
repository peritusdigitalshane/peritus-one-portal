import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing subscriptions for user: ${user.email}`);

    // Get Stripe secret key from admin_settings
    const { data: settingData, error: settingError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "STRIPE_SECRET_KEY")
      .single();

    if (settingError || !settingData?.value) {
      console.error("Stripe not configured:", settingError);
      return new Response(JSON.stringify({ error: "Stripe is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = settingData.value;

    // Search for Stripe customers with this email
    console.log(`Searching Stripe for customers with email: ${user.email}`);
    const customersResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email!)}`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text();
      console.error("Failed to search customers:", errorText);
      return new Response(JSON.stringify({ error: "Failed to search Stripe customers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customersData = await customersResponse.json();
    const customers = customersData.data || [];
    console.log(`Found ${customers.length} Stripe customer(s) with this email`);

    if (customers.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No Stripe customers found with this email",
        synced: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all products from our database to match stripe_product_id
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, stripe_product_id, name, price");

    if (productsError) {
      console.error("Failed to fetch products:", productsError);
      return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productMap = new Map(products?.map(p => [p.stripe_product_id, p]) || []);
    let syncedCount = 0;
    const syncedServices: string[] = [];

    // Update the user's profile with the first customer ID if not set
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id && customers.length > 0) {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customers[0].id })
        .eq("id", user.id);
      console.log(`Updated profile with Stripe customer ID: ${customers[0].id}`);
    }

    // For each customer, get their subscriptions
    for (const customer of customers) {
      console.log(`Fetching subscriptions for customer: ${customer.id}`);
      
      const subsResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active`,
        {
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!subsResponse.ok) {
        console.error(`Failed to fetch subscriptions for customer ${customer.id}`);
        continue;
      }

      const subsData = await subsResponse.json();
      const subscriptions = subsData.data || [];
      console.log(`Found ${subscriptions.length} active subscription(s)`);

      for (const subscription of subscriptions) {
        // Each subscription can have multiple items
        for (const item of subscription.items.data) {
          const stripeProductId = item.price.product;
          const product = productMap.get(stripeProductId);

          if (!product) {
            console.log(`No matching product found for Stripe product: ${stripeProductId}`);
            continue;
          }

          // Check if this purchase already exists
          const { data: existingPurchase } = await supabase
            .from("user_purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (existingPurchase) {
            console.log(`Purchase already exists for subscription: ${subscription.id}`);
            continue;
          }

          // Create the user_purchase record with safe date handling
          let nextBillingDate: string | null = null;
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            try {
              nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString().split("T")[0];
            } catch (e) {
              console.error("Invalid current_period_end:", subscription.current_period_end);
            }
          }

          let purchasedAt: string;
          if (subscription.created && typeof subscription.created === 'number') {
            try {
              purchasedAt = new Date(subscription.created * 1000).toISOString();
            } catch (e) {
              console.error("Invalid created timestamp:", subscription.created);
              purchasedAt = new Date().toISOString();
            }
          } else {
            purchasedAt = new Date().toISOString();
          }

          const { error: insertError } = await supabase.from("user_purchases").insert({
            user_id: user.id,
            product_id: product.id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            status: "active",
            price_paid: item.price.unit_amount ? item.price.unit_amount / 100 : product.price,
            purchased_at: purchasedAt,
            next_billing_date: nextBillingDate,
          });

          if (insertError) {
            console.error(`Failed to insert purchase:`, insertError);
            continue;
          }

          syncedCount++;
          syncedServices.push(product.name);
          console.log(`Synced subscription ${subscription.id} for product: ${product.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: syncedCount > 0 
          ? `Successfully synced ${syncedCount} subscription(s)` 
          : "No new subscriptions to sync",
        synced: syncedCount,
        services: syncedServices,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
