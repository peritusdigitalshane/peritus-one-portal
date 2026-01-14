import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
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

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Verifying checkout session: ${sessionId} for user: ${user.email}`);

    // Get Stripe secret key
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

    // Retrieve the checkout session from Stripe with line items
    const sessionResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`,
      {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.error("Failed to retrieve session:", errorData);
      return new Response(JSON.stringify({ error: "Failed to retrieve checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await sessionResponse.json();
    console.log("Session status:", session.status, "payment_status:", session.payment_status);

    // Verify the session belongs to this user
    if (session.client_reference_id !== user.id) {
      console.error("Session user mismatch:", session.client_reference_id, "vs", user.id);
      return new Response(JSON.stringify({ error: "Session does not belong to this user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if payment was successful
    if (session.payment_status !== "paid" && session.status !== "complete") {
      console.log("Payment not complete:", session.payment_status, session.status);
      return new Response(JSON.stringify({ 
        error: "Payment not completed",
        status: session.payment_status 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get products map
    const { data: products } = await supabase
      .from("products")
      .select("id, stripe_product_id, stripe_price_id, name, price, billing_type");

    const productMap = new Map(
      products?.map((p) => [p.stripe_price_id, p]) || []
    );

    const purchasesCreated: string[] = [];
    const metadata = session.metadata || {};

    // Handle based on session mode
    if (session.mode === "subscription") {
      // Single subscription checkout
      const subscriptionId = session.subscription;
      
      if (subscriptionId) {
        // Get subscription details
        const subResponse = await fetch(
          `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
          {
            headers: { Authorization: `Bearer ${stripeSecretKey}` },
          }
        );
        
        if (subResponse.ok) {
          const subscription = await subResponse.json();
          
          for (const item of subscription.items.data) {
            const product = productMap.get(item.price.id);
            if (!product) continue;

            // Check if already exists
            const { data: existing } = await supabase
              .from("user_purchases")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .eq("product_id", product.id)
              .maybeSingle();

            if (existing) {
              console.log("Purchase already exists for subscription:", subscriptionId);
              continue;
            }

            // Extract customer details from metadata
            const customerDetails = extractCustomerDetails(metadata, 0);

            const nextBillingDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
              : null;

            const { error: insertError } = await supabase.from("user_purchases").insert({
              user_id: user.id,
              product_id: product.id,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: session.customer,
              status: "active",
              price_paid: item.price.unit_amount ? item.price.unit_amount / 100 : product.price,
              purchased_at: new Date().toISOString(),
              next_billing_date: nextBillingDate,
              customer_first_name: customerDetails.firstName,
              customer_last_name: customerDetails.lastName,
              customer_email: customerDetails.email,
              customer_phone: customerDetails.phone,
              customer_address: customerDetails.address,
              customer_city: customerDetails.city,
              customer_state: customerDetails.state,
              customer_postcode: customerDetails.postcode,
            });

            if (insertError) {
              console.error("Failed to insert purchase:", insertError);
            } else {
              purchasesCreated.push(product.name);
              console.log("Created purchase for:", product.name);
            }
          }
        }
      }
    } else if (session.mode === "payment") {
      // One-time payment - process line items
      const lineItems = session.line_items?.data || [];
      
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const product = productMap.get(item.price?.id);
        
        if (!product) {
          console.log("No product found for price:", item.price?.id);
          continue;
        }

        // Check if already exists (by session + product to prevent duplicates)
        const { data: existing } = await supabase
          .from("user_purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .gte("created_at", new Date(Date.now() - 60000).toISOString()) // Within last minute
          .maybeSingle();

        if (existing) {
          console.log("Recent purchase already exists for product:", product.name);
          purchasesCreated.push(product.name);
          continue;
        }

        const customerDetails = extractCustomerDetails(metadata, i);

        const { error: insertError } = await supabase.from("user_purchases").insert({
          user_id: user.id,
          product_id: product.id,
          stripe_customer_id: session.customer,
          status: "active",
          price_paid: item.amount_total ? item.amount_total / 100 : product.price,
          purchased_at: new Date().toISOString(),
          customer_first_name: customerDetails.firstName,
          customer_last_name: customerDetails.lastName,
          customer_email: customerDetails.email,
          customer_phone: customerDetails.phone,
          customer_address: customerDetails.address,
          customer_city: customerDetails.city,
          customer_state: customerDetails.state,
          customer_postcode: customerDetails.postcode,
        });

        if (insertError) {
          console.error("Failed to insert purchase:", insertError);
        } else {
          purchasesCreated.push(product.name);
          console.log("Created purchase for:", product.name);
        }
      }
    } else if (session.mode === "setup") {
      // Setup mode - subscriptions created separately
      // Check for any subscriptions created from this setup
      console.log("Setup mode session - checking for created subscriptions");
      
      // Get customer's active subscriptions
      const subsResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${session.customer}&status=active&limit=10`,
        {
          headers: { Authorization: `Bearer ${stripeSecretKey}` },
        }
      );

      if (subsResponse.ok) {
        const subsData = await subsResponse.json();
        
        for (const subscription of subsData.data) {
          for (const item of subscription.items.data) {
            const product = productMap.get(item.price.id);
            if (!product) continue;

            // Check if already recorded
            const { data: existing } = await supabase
              .from("user_purchases")
              .select("id")
              .eq("stripe_subscription_id", subscription.id)
              .maybeSingle();

            if (existing) continue;

            // Find matching metadata by index
            let customerDetails: CustomerDetails = {};
            for (let i = 0; i < 10; i++) {
              if (metadata[`item_${i}_product_id`] === product.id) {
                customerDetails = extractCustomerDetails(metadata, i);
                break;
              }
            }

            const nextBillingDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
              : null;

            const { error: insertError } = await supabase.from("user_purchases").insert({
              user_id: user.id,
              product_id: product.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer,
              status: "active",
              price_paid: item.price.unit_amount ? item.price.unit_amount / 100 : product.price,
              purchased_at: new Date().toISOString(),
              next_billing_date: nextBillingDate,
              customer_first_name: customerDetails.firstName,
              customer_last_name: customerDetails.lastName,
              customer_email: customerDetails.email,
              customer_phone: customerDetails.phone,
              customer_address: customerDetails.address,
              customer_city: customerDetails.city,
              customer_state: customerDetails.state,
              customer_postcode: customerDetails.postcode,
            });

            if (insertError) {
              console.error("Failed to insert purchase:", insertError);
            } else {
              purchasesCreated.push(product.name);
            }
          }
        }
      }
    }

    // Delete the pending order if this was from one
    const pendingOrderId = metadata.pending_order_id;
    if (pendingOrderId) {
      console.log("Cleaning up pending order:", pendingOrderId);
      
      // Delete items first (foreign key constraint)
      await supabase
        .from("pending_order_items")
        .delete()
        .eq("pending_order_id", pendingOrderId);
      
      // Delete the order
      await supabase
        .from("pending_orders")
        .delete()
        .eq("id", pendingOrderId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchasesCreated,
        message: purchasesCreated.length > 0 
          ? `Successfully verified ${purchasesCreated.length} purchase(s)`
          : "Payment verified (purchases may already exist)",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Verify checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractCustomerDetails(metadata: Record<string, string>, index: number): CustomerDetails {
  return {
    firstName: metadata[`item_${index}_firstName`] || metadata.customer_firstName || undefined,
    lastName: metadata[`item_${index}_lastName`] || metadata.customer_lastName || undefined,
    email: metadata[`item_${index}_email`] || metadata.customer_email || undefined,
    phone: metadata[`item_${index}_phone`] || metadata.customer_phone || undefined,
    address: metadata[`item_${index}_address`] || metadata.customer_address || undefined,
    city: metadata[`item_${index}_city`] || metadata.customer_city || undefined,
    state: metadata[`item_${index}_state`] || metadata.customer_state || undefined,
    postcode: metadata[`item_${index}_postcode`] || metadata.customer_postcode || undefined,
  };
}