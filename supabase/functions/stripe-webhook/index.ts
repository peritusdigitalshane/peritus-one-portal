import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe secret key from admin_settings
    const { data: settingData } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "STRIPE_SECRET_KEY")
      .maybeSingle();

    if (!settingData?.value) {
      console.error("Stripe secret key not configured");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = settingData.value;

    // Get the raw body for signature verification
    const body = await req.text();
    const event = JSON.parse(body);

    console.log("Received Stripe webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout session completed:", session.id);
        
        // Extract customer details from session metadata
        const customerDetails = {
          customer_first_name: session.metadata?.customer_first_name || null,
          customer_last_name: session.metadata?.customer_last_name || null,
          customer_email: session.metadata?.customer_email || null,
          customer_phone: session.metadata?.customer_phone || null,
          customer_address: session.metadata?.customer_address || null,
          customer_city: session.metadata?.customer_city || null,
          customer_state: session.metadata?.customer_state || null,
          customer_postcode: session.metadata?.customer_postcode || null,
        };
        
        // Get the subscription details
        if (session.mode === "subscription" && session.subscription) {
          await handleSubscriptionCreated(
            supabase, 
            stripeSecretKey, 
            session.subscription, 
            session.customer, 
            session.client_reference_id || session.metadata?.user_id,
            customerDetails
          );
        } else if (session.mode === "payment") {
          // One-time payment
          await handleOneTimePayment(supabase, session, customerDetails);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("Subscription created/updated:", subscription.id);
        await updateSubscriptionInDatabase(supabase, stripeSecretKey, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("Subscription deleted:", subscription.id);
        await cancelSubscriptionInDatabase(supabase, subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        console.log("Invoice paid:", invoice.id);
        if (invoice.subscription) {
          await updateNextBillingDate(supabase, invoice.subscription, invoice.lines?.data?.[0]?.period?.end);
        }
        // Create invoice record
        await createInvoiceRecord(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("Invoice payment failed:", invoice.id);
        // Could update subscription status to 'past_due' or send notification
        if (invoice.subscription) {
          await supabase
            .from("user_purchases")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleSubscriptionCreated(
  supabase: any,
  stripeSecretKey: string,
  subscriptionId: string,
  customerId: string,
  userId: string | null,
  customerDetails?: Record<string, string | null>
) {
  // Fetch full subscription details from Stripe
  const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { "Authorization": `Bearer ${stripeSecretKey}` },
  });
  const subscription = await subResponse.json();

  // If we don't have a user_id, try to find it from the profiles table by stripe_customer_id
  if (!userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    
    userId = profile?.id;
  }

  if (!userId) {
    console.error("Could not find user for subscription:", subscriptionId);
    return;
  }

  await updateSubscriptionInDatabase(supabase, stripeSecretKey, subscription, userId, customerDetails);
}

async function updateSubscriptionInDatabase(
  supabase: any,
  stripeSecretKey: string,
  subscription: any,
  userId?: string,
  customerDetails?: Record<string, string | null>
) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const productId = subscription.items?.data?.[0]?.price?.product;

  // Find the product in our database by stripe_price_id or stripe_product_id
  const { data: product } = await supabase
    .from("products")
    .select("id, price")
    .or(`stripe_price_id.eq.${priceId},stripe_product_id.eq.${productId}`)
    .maybeSingle();

  // Check if purchase already exists
  const { data: existingPurchase } = await supabase
    .from("user_purchases")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const purchaseData = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: subscription.status === "active" ? "active" : subscription.status === "canceled" ? "cancelled" : subscription.status,
    next_billing_date: subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
      : null,
    cancelled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  if (existingPurchase) {
    // Update existing purchase (including customer details if provided)
    const updateData = { ...purchaseData };
    if (customerDetails) {
      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) (updateData as any)[key] = value;
      });
    }
    
    await supabase
      .from("user_purchases")
      .update(updateData)
      .eq("id", existingPurchase.id);
    console.log("Updated existing purchase:", existingPurchase.id);
  } else if (userId && product) {
    // Create new purchase with customer details
    const insertData: any = {
      ...purchaseData,
      user_id: userId,
      product_id: product.id,
      price_paid: product.price,
      purchased_at: new Date(subscription.created * 1000).toISOString(),
    };
    
    // Add customer details if provided
    if (customerDetails) {
      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) insertData[key] = value;
      });
    }
    
    await supabase.from("user_purchases").insert(insertData);
    console.log("Created new purchase for subscription:", subscription.id);
  } else {
    console.log("Cannot create purchase - missing userId or product", { userId, product, subscription: subscription.id });
  }
}

async function cancelSubscriptionInDatabase(supabase: any, subscriptionId: string) {
  const { error } = await supabase
    .from("user_purchases")
    .update({ 
      status: "cancelled", 
      cancelled_at: new Date().toISOString() 
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error("Error cancelling subscription in database:", error);
  } else {
    console.log("Cancelled subscription:", subscriptionId);
  }
}

async function updateNextBillingDate(supabase: any, subscriptionId: string, periodEnd: number | undefined) {
  if (!periodEnd) return;

  await supabase
    .from("user_purchases")
    .update({ 
      next_billing_date: new Date(periodEnd * 1000).toISOString().split("T")[0],
      status: "active"
    })
    .eq("stripe_subscription_id", subscriptionId);
}

async function handleOneTimePayment(
  supabase: any, 
  session: any, 
  customerDetails?: Record<string, string | null>
) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  
  if (!userId) {
    console.log("No user_id for one-time payment");
    return;
  }

  if (!productId) {
    console.log("No product_id for one-time payment");
    return;
  }

  // Get product details
  const { data: product } = await supabase
    .from("products")
    .select("id, price")
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    console.log("Product not found for one-time payment:", productId);
    return;
  }

  // Create purchase record with customer details
  const purchaseData: any = {
    user_id: userId,
    product_id: product.id,
    price_paid: product.price,
    status: "active",
    stripe_customer_id: session.customer,
    purchased_at: new Date().toISOString(),
  };

  // Add customer details if provided
  if (customerDetails) {
    Object.entries(customerDetails).forEach(([key, value]) => {
      if (value) purchaseData[key] = value;
    });
  }

  const { error } = await supabase.from("user_purchases").insert(purchaseData);
  
  if (error) {
    console.error("Error creating one-time purchase:", error);
  } else {
    console.log("Created one-time purchase for user:", userId, "product:", productId);
  }
}

async function createInvoiceRecord(supabase: any, invoice: any) {
  // Find the user from the subscription or customer
  let userId: string | null = null;
  
  if (invoice.subscription) {
    const { data: purchase } = await supabase
      .from("user_purchases")
      .select("user_id, id")
      .eq("stripe_subscription_id", invoice.subscription)
      .maybeSingle();
    
    userId = purchase?.user_id;
    
    if (userId) {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id")
        .eq("stripe_invoice_id", invoice.id)
        .maybeSingle();

      if (!existingInvoice) {
        await supabase.from("invoices").insert({
          user_id: userId,
          purchase_id: purchase?.id,
          stripe_invoice_id: invoice.id,
          invoice_number: invoice.number || `INV-${Date.now()}`,
          amount: (invoice.amount_paid || 0) / 100,
          status: invoice.status === "paid" ? "paid" : "pending",
          paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
          due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split("T")[0] : null,
          description: invoice.lines?.data?.[0]?.description || "Subscription payment",
        });
        console.log("Created invoice record:", invoice.id);
      }
    }
  }
}
