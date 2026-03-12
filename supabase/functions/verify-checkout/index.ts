import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    console.log("Session status:", session.status, "payment_status:", session.payment_status, "mode:", session.mode);

    // Verify the session belongs to this user
    if (session.client_reference_id !== user.id) {
      console.error("Session user mismatch:", session.client_reference_id, "vs", user.id);
      return new Response(JSON.stringify({ error: "Session does not belong to this user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if the session is complete
    if (session.status !== "complete") {
      console.log("Session not complete:", session.status);
      return new Response(JSON.stringify({ 
        error: "Checkout session not completed",
        status: session.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For payment and subscription modes, also check payment_status
    if (session.mode !== "setup" && session.payment_status !== "paid") {
      console.log("Payment not complete for non-setup session:", session.payment_status);
      return new Response(JSON.stringify({ 
        error: "Payment not completed",
        status: session.payment_status 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get products map (by stripe_price_id)
    const { data: products } = await supabase
      .from("products")
      .select("id, stripe_product_id, stripe_price_id, name, price, billing_type");

    const productByPriceId = new Map(
      products?.filter(p => p.stripe_price_id).map((p) => [p.stripe_price_id, p]) || []
    );
    const productById = new Map(
      products?.map((p) => [p.id, p]) || []
    );

    const purchasesCreated: string[] = [];
    const metadata = session.metadata || {};

    // Handle based on session mode
    if (session.mode === "subscription") {
      await handleSubscriptionMode(supabase, stripeSecretKey, session, user, metadata, productByPriceId, purchasesCreated);
    } else if (session.mode === "payment") {
      await handlePaymentMode(supabase, session, user, metadata, productByPriceId, purchasesCreated);
    } else if (session.mode === "setup") {
      await handleSetupMode(supabase, stripeSecretKey, session, user, metadata, productByPriceId, productById, purchasesCreated);
    }

    // CRITICAL: Only clean up pending order items AFTER purchases were successfully created
    const pendingOrderId = metadata.pending_order_id;
    const pendingOrderItemId = metadata.pending_order_item_id;
    
    if (pendingOrderId && purchasesCreated.length > 0) {
      console.log("Cleaning up pending order:", pendingOrderId, "item:", pendingOrderItemId, "purchases created:", purchasesCreated.length);
      
      if (pendingOrderItemId) {
        // Delete only the specific item that was paid for
        await supabase
          .from("pending_order_items")
          .delete()
          .eq("id", pendingOrderItemId);
        
        console.log("Deleted pending order item:", pendingOrderItemId);
        
        // Check if any items remain for this order
        const { data: remainingItems } = await supabase
          .from("pending_order_items")
          .select("id")
          .eq("pending_order_id", pendingOrderId);
        
        // If no items remain, delete the parent order
        if (!remainingItems || remainingItems.length === 0) {
          await supabase
            .from("pending_orders")
            .delete()
            .eq("id", pendingOrderId);
          console.log("Deleted empty pending order:", pendingOrderId);
        }
      } else {
        // Full order checkout - delete everything
        console.log("Cleaning up entire pending order:", pendingOrderId);
        
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
    } else if (pendingOrderId && purchasesCreated.length === 0) {
      // No purchases created - do NOT delete pending order items
      console.log("WARNING: No purchases created for pending order:", pendingOrderId, "- keeping pending order intact");
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchasesCreated,
        message: purchasesCreated.length > 0 
          ? `Successfully verified ${purchasesCreated.length} purchase(s)`
          : "Payment verified (purchases may already exist or will be provisioned by webhook)",
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

// ─── Subscription mode ───────────────────────────────────────────────
async function handleSubscriptionMode(
  supabase: any,
  stripeSecretKey: string,
  session: any,
  user: any,
  metadata: Record<string, string>,
  productByPriceId: Map<string, any>,
  purchasesCreated: string[],
) {
  const subscriptionId = session.subscription;
  if (!subscriptionId) {
    console.log("No subscription ID in session");
    return;
  }

  const subResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${stripeSecretKey}` } }
  );

  if (!subResponse.ok) {
    console.error("Failed to retrieve subscription:", subscriptionId);
    return;
  }

  const subscription = await subResponse.json();

  for (const item of subscription.items.data) {
    const product = productByPriceId.get(item.price.id);
    if (!product) {
      console.log("No product found for price:", item.price.id);
      continue;
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("product_id", product.id)
      .maybeSingle();

    if (existing) {
      console.log("Purchase already exists for subscription:", subscriptionId);
      purchasesCreated.push(product.name); // Still count as "handled"
      continue;
    }

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
      ...flattenCustomerDetails(customerDetails),
    });

    if (insertError) {
      console.error("Failed to insert purchase:", insertError);
    } else {
      purchasesCreated.push(product.name);
      console.log("Created purchase for:", product.name);
    }
  }
}

// ─── Payment mode ────────────────────────────────────────────────────
async function handlePaymentMode(
  supabase: any,
  session: any,
  user: any,
  metadata: Record<string, string>,
  productByPriceId: Map<string, any>,
  purchasesCreated: string[],
) {
  const lineItems = session.line_items?.data || [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const product = productByPriceId.get(item.price?.id);

    if (!product) {
      console.log("No product found for price:", item.price?.id);
      continue;
    }

    // Dedup: check for recent purchase of same product
    const { data: existing } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .gte("created_at", new Date(Date.now() - 5 * 60000).toISOString()) // 5 min window
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
      ...flattenCustomerDetails(customerDetails),
    });

    if (insertError) {
      console.error("Failed to insert purchase:", insertError);
    } else {
      purchasesCreated.push(product.name);
      console.log("Created purchase for:", product.name);
    }
  }
}

// ─── Setup mode (multi-subscription) ─────────────────────────────────
async function handleSetupMode(
  supabase: any,
  stripeSecretKey: string,
  session: any,
  user: any,
  metadata: Record<string, string>,
  productByPriceId: Map<string, any>,
  productById: Map<string, any>,
  purchasesCreated: string[],
) {
  console.log("Setup mode session - checking for created subscriptions and payments");

  const itemCount = parseInt(metadata.item_count || "0");
  
  // First, check if the webhook has already created subscriptions/purchases
  // by looking for recently created purchases for this user
  const { data: recentPurchases } = await supabase
    .from("user_purchases")
    .select("id, product_id")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 10 * 60000).toISOString()) // Last 10 minutes
    .order("created_at", { ascending: false });

  const recentProductIds = new Set((recentPurchases || []).map((p: any) => p.product_id));

  // Check customer's active subscriptions in Stripe
  const subsResponse = await fetch(
    `https://api.stripe.com/v1/subscriptions?customer=${session.customer}&status=active&limit=20`,
    { headers: { Authorization: `Bearer ${stripeSecretKey}` } }
  );

  if (!subsResponse.ok) {
    console.error("Failed to fetch customer subscriptions");
    return;
  }

  const subsData = await subsResponse.json();

  for (const subscription of subsData.data) {
    for (const item of subscription.items.data) {
      const product = productByPriceId.get(item.price.id);
      if (!product) continue;

      // Check if already recorded
      const { data: existing } = await supabase
        .from("user_purchases")
        .select("id")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (existing) {
        purchasesCreated.push(product.name);
        continue;
      }

      // Also skip if webhook already created a purchase for this product recently
      if (recentProductIds.has(product.id)) {
        purchasesCreated.push(product.name);
        continue;
      }

      // Find matching metadata by product ID to get customer details
      let customerDetails: CustomerDetails = {};
      for (let i = 0; i < itemCount; i++) {
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
        ...flattenCustomerDetails(customerDetails),
      });

      if (insertError) {
        console.error("Failed to insert purchase:", insertError);
      } else {
        purchasesCreated.push(product.name);
        console.log("Created purchase for setup-mode subscription:", product.name);
      }
    }
  }

  // Also check for one-time items that may have been charged via payment intent
  for (let i = 0; i < itemCount; i++) {
    const productId = metadata[`item_${i}_product_id`];
    if (!productId) continue;

    const product = productById.get(productId);
    if (!product) continue;

    // Skip subscription products (handled above)
    if (product.billing_type === "monthly" || product.billing_type === "yearly") continue;

    // Check if already purchased recently
    if (recentProductIds.has(productId) || purchasesCreated.includes(product.name)) {
      if (!purchasesCreated.includes(product.name)) {
        purchasesCreated.push(product.name);
      }
      continue;
    }

    // For one-time items in setup mode, the webhook should have created a payment intent
    // Check if a purchase exists
    const { data: existing } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .gte("created_at", new Date(Date.now() - 10 * 60000).toISOString())
      .maybeSingle();

    if (existing) {
      purchasesCreated.push(product.name);
    }
  }

  if (purchasesCreated.length === 0) {
    console.log("Setup mode: No purchases found yet - webhook may still be processing. NOT deleting pending orders.");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extractCustomerDetails(metadata: Record<string, string>, index: number): CustomerDetails {
  // Support both naming conventions:
  // Multi-item: item_X_first_name (from create-multi-checkout)
  // Single-item: customer_first_name (from create-checkout)
  return {
    firstName: metadata[`item_${index}_first_name`] || metadata[`item_${index}_firstName`] || metadata.customer_first_name || metadata.customer_firstName || undefined,
    lastName: metadata[`item_${index}_last_name`] || metadata[`item_${index}_lastName`] || metadata.customer_last_name || metadata.customer_lastName || undefined,
    email: metadata[`item_${index}_email`] || metadata.customer_email || undefined,
    phone: metadata[`item_${index}_phone`] || metadata.customer_phone || undefined,
    address: metadata[`item_${index}_address`] || metadata.customer_address || undefined,
    city: metadata[`item_${index}_city`] || metadata.customer_city || undefined,
    state: metadata[`item_${index}_state`] || metadata.customer_state || undefined,
    postcode: metadata[`item_${index}_postcode`] || metadata.customer_postcode || undefined,
  };
}

function flattenCustomerDetails(details: CustomerDetails): Record<string, string | undefined> {
  return {
    customer_first_name: details.firstName,
    customer_last_name: details.lastName,
    customer_email: details.email,
    customer_phone: details.phone,
    customer_address: details.address,
    customer_city: details.city,
    customer_state: details.state,
    customer_postcode: details.postcode,
  };
}
