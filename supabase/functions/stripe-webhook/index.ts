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
        
        // Get the subscription details
        if (session.mode === "subscription" && session.subscription) {
          await handleSubscriptionCreated(supabase, stripeSecretKey, session.subscription, session.customer, session.client_reference_id || session.metadata?.user_id);
        } else if (session.mode === "payment") {
          // One-time payment
          await handleOneTimePayment(supabase, session);
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
  userId: string | null
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

  await updateSubscriptionInDatabase(supabase, stripeSecretKey, subscription, userId);
}

async function updateSubscriptionInDatabase(
  supabase: any,
  stripeSecretKey: string,
  subscription: any,
  userId?: string
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
    // Update existing purchase
    await supabase
      .from("user_purchases")
      .update(purchaseData)
      .eq("id", existingPurchase.id);
    console.log("Updated existing purchase:", existingPurchase.id);
  } else if (userId && product) {
    // Create new purchase
    await supabase.from("user_purchases").insert({
      ...purchaseData,
      user_id: userId,
      product_id: product.id,
      price_paid: product.price,
      purchased_at: new Date(subscription.created * 1000).toISOString(),
    });
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

async function handleOneTimePayment(supabase: any, session: any) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) {
    console.log("No user_id for one-time payment");
    return;
  }

  // For one-time payments, we'd need to look up the product from line items
  console.log("One-time payment completed for user:", userId);
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
