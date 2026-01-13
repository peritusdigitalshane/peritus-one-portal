import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { productId, successUrl, cancelUrl } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "Product ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      console.error("Product error:", productError);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
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

    if (!stripeCustomerId) {
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
        return new Response(
          JSON.stringify({ error: "Failed to create customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const customer = await createCustomerResponse.json();
      stripeCustomerId = customer.id;
      console.log("Created Stripe customer:", stripeCustomerId);

      // Save Stripe customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
    }

    // Determine if this is a subscription or one-time payment
    const isSubscription = product.billing_type === "monthly" || product.billing_type === "yearly";

    // Build Checkout Session parameters
    const checkoutParams: Record<string, string> = {
      customer: stripeCustomerId,
      "success_url": successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
      "cancel_url": cancelUrl || `${req.headers.get("origin")}/shop?checkout=cancelled`,
      "client_reference_id": user.id,
      "metadata[user_id]": user.id,
      "metadata[product_id]": product.id,
    };

    if (isSubscription) {
      checkoutParams["mode"] = "subscription";
      
      // Use existing Stripe price or create line item with price_data
      if (product.stripe_price_id) {
        checkoutParams["line_items[0][price]"] = product.stripe_price_id;
        checkoutParams["line_items[0][quantity]"] = "1";
      } else {
        // Create price inline
        checkoutParams["line_items[0][price_data][currency]"] = "usd";
        checkoutParams["line_items[0][price_data][product_data][name]"] = product.name;
        if (product.description) {
          checkoutParams["line_items[0][price_data][product_data][description]"] = product.description;
        }
        checkoutParams["line_items[0][price_data][unit_amount]"] = Math.round(product.price * 100).toString();
        checkoutParams["line_items[0][price_data][recurring][interval]"] = product.billing_type === "monthly" ? "month" : "year";
        checkoutParams["line_items[0][quantity]"] = "1";
      }
      
      // Add subscription metadata
      checkoutParams["subscription_data[metadata][user_id]"] = user.id;
      checkoutParams["subscription_data[metadata][product_id]"] = product.id;
    } else {
      checkoutParams["mode"] = "payment";
      
      if (product.stripe_price_id) {
        checkoutParams["line_items[0][price]"] = product.stripe_price_id;
        checkoutParams["line_items[0][quantity]"] = "1";
      } else {
        // Create price inline for one-time payment
        checkoutParams["line_items[0][price_data][currency]"] = "usd";
        checkoutParams["line_items[0][price_data][product_data][name]"] = product.name;
        if (product.description) {
          checkoutParams["line_items[0][price_data][product_data][description]"] = product.description;
        }
        checkoutParams["line_items[0][price_data][unit_amount]"] = Math.round(product.price * 100).toString();
        checkoutParams["line_items[0][quantity]"] = "1";
      }
      
      // For one-time payments, we need payment_intent_data for metadata
      checkoutParams["payment_intent_data[metadata][user_id]"] = user.id;
      checkoutParams["payment_intent_data[metadata][product_id]"] = product.id;
    }

    console.log("Creating Checkout Session for product:", product.name, "mode:", checkoutParams["mode"]);

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
