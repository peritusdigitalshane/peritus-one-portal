import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.90.1";

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

interface LineItem {
  productId: string;
  quantity: number;
  customerDetails?: CustomerDetails | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    const productIds = items.map(item => item.productId);
    
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

    const foundProductIds = new Set(products.map(p => p.id));
    const missingProducts = productIds.filter(id => !foundProductIds.has(id));
    if (missingProducts.length > 0) {
      return new Response(
        JSON.stringify({ error: `Products not found: ${missingProducts.join(", ")}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = profile?.stripe_customer_id;

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

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user.id);

      return customer.id;
    };

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

    // Separate subscription items from one-time items
    const subscriptionItems: (LineItem & { product: any })[] = [];
    const oneTimeItems: (LineItem & { product: any })[] = [];

    items.forEach(item => {
      const product = products.find(p => p.id === item.productId)!;
      const isSubscription = product.billing_type === "monthly" || product.billing_type === "yearly";
      
      if (isSubscription) {
        subscriptionItems.push({ ...item, product });
      } else {
        oneTimeItems.push({ ...item, product });
      }
    });

    const hasMultipleSubscriptions = subscriptionItems.length > 1;
    const hasSubscriptions = subscriptionItems.length > 0;
    const hasOneTimeItems = oneTimeItems.length > 0;

    // Store items data for webhook processing
    const itemsMetadata: Record<string, string> = {
      user_id: user.id,
      item_count: items.length.toString(),
    };

    if (pendingOrderId) {
      itemsMetadata.pending_order_id = pendingOrderId;
    }

    // Store each item's details in metadata
    items.forEach((item, index) => {
      itemsMetadata[`item_${index}_product_id`] = item.productId;
      itemsMetadata[`item_${index}_quantity`] = item.quantity.toString();
      
      if (item.customerDetails) {
        const d = item.customerDetails;
        if (d.firstName) itemsMetadata[`item_${index}_first_name`] = d.firstName;
        if (d.lastName) itemsMetadata[`item_${index}_last_name`] = d.lastName;
        if (d.email) itemsMetadata[`item_${index}_email`] = d.email;
        if (d.phone) itemsMetadata[`item_${index}_phone`] = d.phone;
        if (d.address) itemsMetadata[`item_${index}_address`] = d.address;
        if (d.city) itemsMetadata[`item_${index}_city`] = d.city;
        if (d.state) itemsMetadata[`item_${index}_state`] = d.state;
        if (d.postcode) itemsMetadata[`item_${index}_postcode`] = d.postcode;
      }
    });

    let checkoutMode: string;
    let checkoutParams: Record<string, string> = {
      customer: stripeCustomerId,
      success_url: successUrl || `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/shop?checkout=cancelled`,
      client_reference_id: user.id,
    };

    // Add metadata
    Object.entries(itemsMetadata).forEach(([key, value]) => {
      checkoutParams[`metadata[${key}]`] = value;
    });

    if (hasMultipleSubscriptions || (hasSubscriptions && hasOneTimeItems)) {
      // Use setup mode to collect payment method, then create subscriptions separately
      checkoutMode = "setup";
      checkoutParams.mode = "setup";
      
      // For setup mode, we need to show what they're signing up for
      // We'll create the subscriptions in the webhook after payment method is confirmed
      
      console.log("Using setup mode for multiple subscriptions:", subscriptionItems.length);
      
    } else if (hasSubscriptions) {
      // Single subscription, use standard subscription mode
      checkoutMode = "subscription";
      checkoutParams.mode = "subscription";
      
      const item = subscriptionItems[0];
      const product = item.product;
      
      if (product.stripe_price_id) {
        checkoutParams["line_items[0][price]"] = product.stripe_price_id;
        checkoutParams["line_items[0][quantity]"] = item.quantity.toString();
      } else {
        checkoutParams["line_items[0][price_data][currency]"] = "aud";
        checkoutParams["line_items[0][price_data][product_data][name]"] = product.name;
        if (product.description) {
          checkoutParams["line_items[0][price_data][product_data][description]"] = product.description;
        }
        checkoutParams["line_items[0][price_data][unit_amount]"] = Math.round(product.price * 100).toString();
        checkoutParams["line_items[0][price_data][recurring][interval]"] = product.billing_type === "monthly" ? "month" : "year";
        checkoutParams["line_items[0][quantity]"] = item.quantity.toString();
      }
      
      // Add subscription metadata
      checkoutParams["subscription_data[metadata][user_id]"] = user.id;
      Object.entries(itemsMetadata).forEach(([key, value]) => {
        checkoutParams[`subscription_data[metadata][${key}]`] = value;
      });
      
    } else {
      // Only one-time items
      checkoutMode = "payment";
      checkoutParams.mode = "payment";
      
      oneTimeItems.forEach((item, index) => {
        const product = item.product;
        
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
      
      checkoutParams["payment_intent_data[metadata][user_id]"] = user.id;
      Object.entries(itemsMetadata).forEach(([key, value]) => {
        checkoutParams[`payment_intent_data[metadata][${key}]`] = value;
      });
    }

    console.log("Creating Checkout Session, mode:", checkoutMode, "items:", items.length);

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
        JSON.stringify({ error: "Failed to create checkout session", details: error }),
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