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

    console.log(`Syncing invoices for user: ${user.email}`);

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

    let syncedCount = 0;

    // For each customer, get their invoices
    for (const customer of customers) {
      console.log(`Fetching invoices for customer: ${customer.id}`);
      
      // Fetch all invoices (paid and open)
      const invoicesResponse = await fetch(
        `https://api.stripe.com/v1/invoices?customer=${customer.id}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!invoicesResponse.ok) {
        console.error(`Failed to fetch invoices for customer ${customer.id}`);
        continue;
      }

      const invoicesData = await invoicesResponse.json();
      const stripeInvoices = invoicesData.data || [];
      console.log(`Found ${stripeInvoices.length} invoice(s)`);

      for (const stripeInvoice of stripeInvoices) {
        // Skip draft invoices
        if (stripeInvoice.status === "draft") {
          continue;
        }

        // Map Stripe status to our status
        let status = "pending";
        if (stripeInvoice.status === "paid") {
          status = "paid";
        } else if (stripeInvoice.status === "void" || stripeInvoice.status === "uncollectible") {
          status = "cancelled";
        } else if (stripeInvoice.status === "open") {
          // Check if overdue
          const dueDate = stripeInvoice.due_date 
            ? new Date(stripeInvoice.due_date * 1000) 
            : new Date(stripeInvoice.created * 1000 + 30 * 24 * 60 * 60 * 1000); // Default 30 days
          if (dueDate < new Date()) {
            status = "overdue";
          } else {
            status = "pending";
          }
        }

        // Calculate due date
        const dueDate = stripeInvoice.due_date 
          ? new Date(stripeInvoice.due_date * 1000).toISOString().split("T")[0]
          : new Date(stripeInvoice.created * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Get description from first line item or invoice description
        let description = stripeInvoice.description || "";
        if (!description && stripeInvoice.lines?.data?.length > 0) {
          description = stripeInvoice.lines.data[0].description || "Service charge";
        }

        // Check if this invoice already exists
        const { data: existingInvoice } = await supabase
          .from("invoices")
          .select("id, pdf_url, status")
          .eq("stripe_invoice_id", stripeInvoice.id)
          .maybeSingle();

        if (existingInvoice) {
          // Update existing invoice if pdf_url is missing or status changed
          const needsUpdate = !existingInvoice.pdf_url || existingInvoice.status !== status;
          
          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from("invoices")
              .update({
                pdf_url: stripeInvoice.invoice_pdf || null,
                status: status,
                paid_at: stripeInvoice.status === "paid" && stripeInvoice.status_transitions?.paid_at
                  ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
                  : null,
              })
              .eq("id", existingInvoice.id);

            if (!updateError) {
              console.log(`Updated invoice ${stripeInvoice.id} with pdf_url and status`);
              syncedCount++;
            }
          }
          continue;
        }

        // Create the invoice record
        const { error: insertError } = await supabase.from("invoices").insert({
          user_id: user.id,
          stripe_invoice_id: stripeInvoice.id,
          invoice_number: stripeInvoice.number || `INV-${stripeInvoice.id.slice(-8).toUpperCase()}`,
          amount: stripeInvoice.amount_due / 100, // Convert from cents
          status: status,
          due_date: dueDate,
          paid_at: stripeInvoice.status === "paid" && stripeInvoice.status_transitions?.paid_at
            ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString()
            : null,
          description: description || "Service charge",
          created_at: new Date(stripeInvoice.created * 1000).toISOString(),
          pdf_url: stripeInvoice.invoice_pdf || null,
        });

        if (insertError) {
          console.error(`Failed to insert invoice:`, insertError);
          continue;
        }

        syncedCount++;
        console.log(`Synced invoice ${stripeInvoice.id} (${stripeInvoice.number})`);
      }
    }

    return new Response(
      JSON.stringify({
        message: syncedCount > 0 
          ? `Successfully synced ${syncedCount} invoice(s)` 
          : "No new invoices to sync",
        synced: syncedCount,
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
