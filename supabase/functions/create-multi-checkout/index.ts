import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem {
  productId: string;
  quantity: number;
  customerDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postcode?: string;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { items, successUrl, cancelUrl, pendingOrderId } = await req.json() as {
      items: LineItem[];
      successUrl?: string;
      cancelUrl?: string;
      pendingOrderId?: string;
    };

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one item is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all product IDs
    const productIds = items.map(item => item.productId);
    
    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError || !products || products.length === 0) {
      console.error("Products error:", productsError);
      return new Response(
        JSON.stringify({ error: "One or more products not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all products were found
    const foundProductIds = new Set(products.map(p => p.id));
    const missingProducts = productIds.filter(id => !foundProductIds.has(id));
    if (missingProducts.length > 0) {
      return new Response(
        JSON.stringify({ error: `Products not found: ${missingProducts.join(", ")}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Stripe secret key from admin settings
    const { data: settingData, error: settingError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "STRIPE_SECRET_KEY")
      .single();

    if (settingError || !settingData?.value) {
      console.error("Stripe key not configured:", settingError);
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = settingData.value;

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id;

    // Helper function to create a new Stripe customer
    const createStripeCustomer = async (): Promise<string> => {
      console.log("Creating new Stripe customer for user:", user.email);
      
      const createCustomerResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          name: profile?.full_name || "",
          "metadata[user_id]": user.id,
        }).toString(),
      });

      if (!createCustomerResponse.ok) {
        const error = await createCustomerResponse.text();
        console.error("Failed to create Stripe customer:", error);
        throw new Error("Failed to create customer");
      }

      const customer = await createCustomerResponse.json();
      console.log("Created Stripe customer:", customer.id);

      // Save Stripe customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);

      return customer.id;
    };

    // If we have a stored customer ID, verify it exists in Stripe
    if (stripeCustomerId) {
      console.log("Verifying existing Stripe customer:", stripeCustomerId);
      
      const verifyResponse = await fetch(`https://api.stripe.com/v1/customers/${stripeCustomerId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      });

      if (!verifyResponse.ok) {
        console.log("Stored customer ID is invalid, creating new customer");
        stripeCustomerId = await createStripeCustomer();
      }
    } else {
      stripeCustomerId = await createStripeCustomer();
    }

    // Check if any item is a subscription
    const hasSubscription = products.some(p => 
      p.billing_type === "monthly" || p.billing_type === "yearly"
    );
    
    // Build line items for Stripe
    const checkoutParams: Record<string, string> = {
      customer: stripeCustomerId,
      "success_url": successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
      "cancel_url": cancelUrl || `${req.headers.get("origin")}/shop?checkout=cancelled`,
      "client_reference_id": user.id,
      "metadata[user_id]": user.id,
      "metadata[multi_item]": "true",
      "metadata[item_count]": items.length.toString(),
    };

    if (pendingOrderId) {
      checkoutParams["metadata[pending_order_id]"] = pendingOrderId;
    }

    // Store customer details for each item in metadata
    items.forEach((item, index) => {
      checkoutParams[`metadata[item_${index}_product_id]`] = item.productId;
      checkoutParams[`metadata[item_${index}_quantity]`] = item.quantity.toString();
      
      if (item.customerDetails) {
        const details = item.customerDetails;
        if (details.firstName) checkoutParams[`metadata[item_${index}_first_name]`] = details.firstName;
        if (details.lastName) checkoutParams[`metadata[item_${index}_last_name]`] = details.lastName;
        if (details.email) checkoutParams[`metadata[item_${index}_email]`] = details.email;
        if (details.phone) checkoutParams[`metadata[item_${index}_phone]`] = details.phone;
        if (details.address) checkoutParams[`metadata[item_${index}_address]`] = details.address;
        if (details.city) checkoutParams[`metadata[item_${index}_city]`] = details.city;
        if (details.state) checkoutParams[`metadata[item_${index}_state]`] = details.state;
        if (details.postcode) checkoutParams[`metadata[item_${index}_postcode]`] = details.postcode;
      }
    });

    // Determine checkout mode
    if (hasSubscription) {
      checkoutParams["mode"] = "subscription";
      
      // For subscriptions, we can only have one subscription item
      // So we need to create separate line items
      let lineItemIndex = 0;
      
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)!;
        const isSubscription = product.billing_type === "monthly" || product.billing_type === "yearly";
        
        if (isSubscription) {
          if (product.stripe_price_id) {
            checkoutParams[`line_items[${lineItemIndex}][price]`] = product.stripe_price_id;
            checkoutParams[`line_items[${lineItemIndex}][quantity]`] = item.quantity.toString();
          } else {
            checkoutParams[`line_items[${lineItemIndex}][price_data][currency]`] = "aud";
            checkoutParams[`line_items[${lineItemIndex}][price_data][product_data][name]`] = product.name;
            if (product.description) {
              checkoutParams[`line_items[${lineItemIndex}][price_data][product_data][description]`] = product.description;
            }
            checkoutParams[`line_items[${lineItemIndex}][price_data][unit_amount]`] = Math.round(product.price * 100).toString();
            checkoutParams[`line_items[${lineItemIndex}][price_data][recurring][interval]`] = product.billing_type === "monthly" ? "month" : "year";
            checkoutParams[`line_items[${lineItemIndex}][quantity]`] = item.quantity.toString();
          }
          lineItemIndex++;
        }
      }
      
      // Add subscription metadata
      checkoutParams["subscription_data[metadata][user_id]"] = user.id;
      if (pendingOrderId) {
        checkoutParams["subscription_data[metadata][pending_order_id]"] = pendingOrderId;
      }
    } else {
      checkoutParams["mode"] = "payment";
      
      // Build line items for one-time payments
      items.forEach((item, index) => {
        const product = products.find(p => p.id === item.productId)!;
        
        if (product.stripe_price_id) {
          checkoutParams[`line_items[${index}][price]`] = product.stripe_price_id;
          checkoutParams[`line_items[${index}][quantity]`] = item.quantity.toString();
        } else {
          checkoutParams[`line_items[${index}][price_data][currency]`] = "aud";
          checkoutParams[`line_items[${index}][price_data][product_data][name]`] = product.name;
          if (product.description) {
            checkoutParams[`line_items[${index}][price_data][product_data][description]`] = product.description;
          }
          checkoutParams[`line_items[${index}][price_data][unit_amount]`] = Math.round(product.price * 100).toString();
          checkoutParams[`line_items[${index}][quantity]`] = item.quantity.toString();
        }
      });
      
      // Payment intent metadata
      checkoutParams["payment_intent_data[metadata][user_id]"] = user.id;
      if (pendingOrderId) {
        checkoutParams["payment_intent_data[metadata][pending_order_id]"] = pendingOrderId;
      }
    }

    console.log("Creating multi-item Checkout Session with", items.length, "items");

    // Create Stripe Checkout Session
    const checkoutResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(checkoutParams).toString(),
    });

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text();
      console.error("Failed to create Checkout Session:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await checkoutResponse.json();
    console.log("Created Checkout Session:", session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});