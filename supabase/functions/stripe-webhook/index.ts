import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const body = await req.text();
    const event = JSON.parse(body);

    console.log("Received Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout session completed:", session.id, "mode:", session.mode);
        
        if (session.mode === "setup") {
          await handleSetupCompleted(supabase, stripeSecretKey, session);
        } else if (session.mode === "subscription" && session.subscription) {
          const customerDetails = extractCustomerDetails(session.metadata, 0);
          await handleSubscriptionCreated(
            supabase, 
            stripeSecretKey, 
            session.subscription, 
            session.customer, 
            session.client_reference_id || session.metadata?.user_id,
            customerDetails
          );
        } else if (session.mode === "payment") {
          await handleMultiItemPayment(supabase, session);
        }

        // Clean up pending order after purchases are created
        await cleanupPendingOrder(supabase, session.metadata, session.client_reference_id || session.metadata?.user_id);
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
        await createInvoiceRecord(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("Invoice payment failed:", invoice.id);
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

function extractCustomerDetails(metadata: any, itemIndex: number): Record<string, string | null> {
  const prefix = `item_${itemIndex}_`;
  return {
    customer_first_name: metadata?.[`${prefix}first_name`] || metadata?.customer_first_name || null,
    customer_last_name: metadata?.[`${prefix}last_name`] || metadata?.customer_last_name || null,
    customer_email: metadata?.[`${prefix}email`] || metadata?.customer_email || null,
    customer_phone: metadata?.[`${prefix}phone`] || metadata?.customer_phone || null,
    customer_address: metadata?.[`${prefix}address`] || metadata?.customer_address || null,
    customer_city: metadata?.[`${prefix}city`] || metadata?.customer_city || null,
    customer_state: metadata?.[`${prefix}state`] || metadata?.customer_state || null,
    customer_postcode: metadata?.[`${prefix}postcode`] || metadata?.customer_postcode || null,
  };
}

// ─── Cleanup pending orders after successful purchase creation ───────
async function cleanupPendingOrder(supabase: any, metadata: any, userId: string | null) {
  const pendingOrderId = metadata?.pending_order_id;
  const pendingOrderItemId = metadata?.pending_order_item_id;

  if (!pendingOrderId) return;

  // First verify that purchases were actually created for this user
  const { data: purchases } = await supabase
    .from("user_purchases")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 10 * 60000).toISOString());

  if (!purchases || purchases.length === 0) {
    console.log("Webhook: No purchases found yet for pending order:", pendingOrderId, "- skipping cleanup");
    return;
  }

  console.log("Webhook: Cleaning up pending order:", pendingOrderId, "purchases found:", purchases.length);

  if (pendingOrderItemId) {
    // Delete only the specific item
    await supabase
      .from("pending_order_items")
      .delete()
      .eq("id", pendingOrderItemId);

    // Check if any items remain
    const { data: remainingItems } = await supabase
      .from("pending_order_items")
      .select("id")
      .eq("pending_order_id", pendingOrderId);

    if (!remainingItems || remainingItems.length === 0) {
      await supabase
        .from("pending_orders")
        .delete()
        .eq("id", pendingOrderId);
      console.log("Webhook: Deleted empty pending order:", pendingOrderId);
    }
  } else {
    // Full order cleanup
    await supabase
      .from("pending_order_items")
      .delete()
      .eq("pending_order_id", pendingOrderId);

    await supabase
      .from("pending_orders")
      .delete()
      .eq("id", pendingOrderId);
    console.log("Webhook: Deleted entire pending order:", pendingOrderId);
  }
}

async function handleSetupCompleted(
  supabase: any,
  stripeSecretKey: string,
  session: any
) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const itemCount = parseInt(session.metadata?.item_count || "0");
  const setupIntentId = session.setup_intent;

  if (!userId || !setupIntentId) {
    console.error("Missing user_id or setup_intent for setup session");
    return;
  }

  console.log("Processing setup completion for", itemCount, "items, user:", userId);

  // Get the setup intent to get the payment method
  const setupIntentRes = await fetch(`https://api.stripe.com/v1/setup_intents/${setupIntentId}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  const setupIntent = await setupIntentRes.json();
  const paymentMethodId = setupIntent.payment_method;

  if (!paymentMethodId) {
    console.error("No payment method found in setup intent");
    return;
  }

  // Set as default payment method for customer
  await fetch(`https://api.stripe.com/v1/customers/${session.customer}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "invoice_settings[default_payment_method]": paymentMethodId,
    }).toString(),
  });

  // Create individual subscriptions/charges for each item
  for (let i = 0; i < itemCount; i++) {
    const productId = session.metadata?.[`item_${i}_product_id`];
    const quantity = parseInt(session.metadata?.[`item_${i}_quantity`] || "1");
    const customerDetails = extractCustomerDetails(session.metadata, i);

    if (!productId) continue;

    // Get product details from Supabase
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (!product) {
      console.error("Product not found:", productId);
      continue;
    }

    const isSubscription = product.billing_type === "monthly" || product.billing_type === "yearly";

    if (isSubscription) {
      // Create subscription
      const subscriptionParams: Record<string, string> = {
        customer: session.customer,
        "default_payment_method": paymentMethodId,
        "metadata[user_id]": userId,
        "metadata[product_id]": productId,
      };

      // Add customer details to subscription metadata
      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) subscriptionParams[`metadata[${key}]`] = value;
      });

      if (product.stripe_price_id) {
        subscriptionParams["items[0][price]"] = product.stripe_price_id;
        subscriptionParams["items[0][quantity]"] = quantity.toString();
      } else {
        subscriptionParams["items[0][price_data][currency]"] = "aud";
        subscriptionParams["items[0][price_data][unit_amount]"] = Math.round(product.price * 100).toString();
        subscriptionParams["items[0][price_data][recurring][interval]"] = product.billing_type === "monthly" ? "month" : "year";
        
        if (product.stripe_product_id) {
          subscriptionParams["items[0][price_data][product]"] = product.stripe_product_id;
        } else {
          subscriptionParams["items[0][price_data][product_data][name]"] = product.name;
        }
        subscriptionParams["items[0][quantity]"] = quantity.toString();
      }

      console.log("Creating subscription for product:", product.name);

      const subResponse = await fetch("https://api.stripe.com/v1/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(subscriptionParams).toString(),
      });

      if (!subResponse.ok) {
        const error = await subResponse.text();
        console.error("Failed to create subscription:", error);
        continue;
      }

      const subscription = await subResponse.json();
      console.log("Created subscription:", subscription.id, "for product:", product.name);

      // Create user_purchase record
      const purchaseData: any = {
        user_id: userId,
        product_id: productId,
        price_paid: product.price * quantity,
        status: subscription.status === "active" ? "active" : subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer,
        next_billing_date: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString().split("T")[0]
          : null,
        purchased_at: new Date().toISOString(),
      };

      // Add customer details
      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) purchaseData[key] = value;
      });

      const { error: insertError } = await supabase.from("user_purchases").insert(purchaseData);
      if (insertError) {
        console.error("Failed to create purchase record:", insertError);
      } else {
        console.log("Created purchase record for subscription:", subscription.id);
      }
    } else {
      // One-time payment - create a payment intent and charge
      const paymentParams = new URLSearchParams({
        amount: Math.round(product.price * quantity * 100).toString(),
        currency: "aud",
        customer: session.customer,
        payment_method: paymentMethodId,
        confirm: "true",
        "metadata[user_id]": userId,
        "metadata[product_id]": productId,
      });

      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) paymentParams.append(`metadata[${key}]`, value);
      });

      const paymentResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: paymentParams.toString(),
      });

      if (!paymentResponse.ok) {
        const error = await paymentResponse.text();
        console.error("Failed to create payment:", error);
        continue;
      }

      const payment = await paymentResponse.json();
      console.log("Created payment:", payment.id, "for product:", product.name);

      // Create user_purchase record for one-time payment
      const purchaseData: any = {
        user_id: userId,
        product_id: productId,
        price_paid: product.price * quantity,
        status: "active",
        stripe_customer_id: session.customer,
        purchased_at: new Date().toISOString(),
      };

      Object.entries(customerDetails).forEach(([key, value]) => {
        if (value) purchaseData[key] = value;
      });

      const { error: insertError } = await supabase.from("user_purchases").insert(purchaseData);
      if (insertError) {
        console.error("Failed to create purchase record:", insertError);
      } else {
        console.log("Created purchase record for one-time payment");
      }
    }
  }
}

async function handleMultiItemPayment(supabase: any, session: any) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const itemCount = parseInt(session.metadata?.item_count || "0");

  if (!userId) {
    console.log("No user_id for payment");
    return;
  }

  console.log("Processing multi-item payment with", itemCount, "items");

  for (let i = 0; i < itemCount; i++) {
    const productId = session.metadata?.[`item_${i}_product_id`];
    const quantity = parseInt(session.metadata?.[`item_${i}_quantity`] || "1");
    const customerDetails = extractCustomerDetails(session.metadata, i);

    if (!productId) continue;

    const { data: product } = await supabase
      .from("products")
      .select("id, price")
      .eq("id", productId)
      .single();

    if (!product) continue;

    // Check for existing purchase to prevent duplicates
    const { data: existing } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .gte("created_at", new Date(Date.now() - 5 * 60000).toISOString())
      .maybeSingle();

    if (existing) {
      console.log("Purchase already exists for product:", productId);
      continue;
    }

    const purchaseData: any = {
      user_id: userId,
      product_id: productId,
      price_paid: product.price * quantity,
      status: "active",
      stripe_customer_id: session.customer,
      purchased_at: new Date().toISOString(),
    };

    Object.entries(customerDetails).forEach(([key, value]) => {
      if (value) purchaseData[key] = value;
    });

    const { error } = await supabase.from("user_purchases").insert(purchaseData);
    if (error) {
      console.error("Failed to create purchase for product:", productId, error);
    } else {
      console.log("Created purchase for product:", productId);
    }
  }
}

async function handleSubscriptionCreated(
  supabase: any,
  stripeSecretKey: string,
  subscriptionId: string,
  customerId: string,
  userId: string | null,
  customerDetails?: Record<string, string | null>
) {
  const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { "Authorization": `Bearer ${stripeSecretKey}` },
  });
  const subscription = await subResponse.json();

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
  const metadataProductId = subscription.metadata?.product_id;

  // Try to find product by metadata first, then by stripe IDs
  let product = null;
  if (metadataProductId) {
    const { data } = await supabase
      .from("products")
      .select("id, price")
      .eq("id", metadataProductId)
      .maybeSingle();
    product = data;
  }
  
  if (!product && priceId) {
    const { data } = await supabase
      .from("products")
      .select("id, price")
      .eq("stripe_price_id", priceId)
      .maybeSingle();
    product = data;
  }

  if (!product && productId) {
    const { data } = await supabase
      .from("products")
      .select("id, price")
      .eq("stripe_product_id", productId)
      .maybeSingle();
    product = data;
  }

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

  // Extract customer details from subscription metadata if not provided
  if (!customerDetails && subscription.metadata) {
    customerDetails = {
      customer_first_name: subscription.metadata.customer_first_name || null,
      customer_last_name: subscription.metadata.customer_last_name || null,
      customer_email: subscription.metadata.customer_email || null,
      customer_phone: subscription.metadata.customer_phone || null,
      customer_address: subscription.metadata.customer_address || null,
      customer_city: subscription.metadata.customer_city || null,
      customer_state: subscription.metadata.customer_state || null,
      customer_postcode: subscription.metadata.customer_postcode || null,
    };
  }

  if (existingPurchase) {
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
    const insertData: any = {
      ...purchaseData,
      user_id: userId,
      product_id: product.id,
      price_paid: product.price,
      purchased_at: new Date(subscription.created * 1000).toISOString(),
    };
    
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

async function createInvoiceRecord(supabase: any, invoice: any) {
  let userId: string | null = null;
  
  if (invoice.subscription) {
    const { data: purchase } = await supabase
      .from("user_purchases")
      .select("user_id, id")
      .eq("stripe_subscription_id", invoice.subscription)
      .maybeSingle();
    
    userId = purchase?.user_id;
    
    if (userId) {
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
          pdf_url: invoice.invoice_pdf || null,
        });
        console.log("Created invoice record:", invoice.id);
      }
    }
  }
}
