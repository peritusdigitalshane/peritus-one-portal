import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Creating customer portal for user:", user.id);

    // Get Stripe secret key from admin_settings
    const { data: settingData, error: settingError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "STRIPE_SECRET_KEY")
      .single();

    if (settingError || !settingData?.value) {
      console.error("Stripe key not found:", settingError);
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = settingData.value;

    // Get the user's Stripe customer ID from their profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let stripeCustomerId = profileData?.stripe_customer_id;

    // If no customer ID, create a new Stripe customer and save to profile
    if (!stripeCustomerId) {
      console.log("Creating new Stripe customer for user:", user.email);
      
      const createCustomerResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          name: profileData?.full_name || "",
          "metadata[user_id]": user.id,
        }).toString(),
      });

      if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text();
        console.error("Failed to create Stripe customer:", errorText);
        return new Response(JSON.stringify({ error: "Failed to create Stripe customer" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

    // Get return URL from request body
    const body = await req.json().catch(() => ({}));
    const returnUrl = body.return_url || `${req.headers.get("origin")}/dashboard/billing`;

    console.log("Creating portal session with return URL:", returnUrl);

    // Create Customer Portal session
    const portalResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        return_url: returnUrl,
      }).toString(),
    });

    if (!portalResponse.ok) {
      const errorText = await portalResponse.text();
      console.error("Failed to create portal session:", errorText);
      return new Response(JSON.stringify({ error: "Failed to create billing portal session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const portalSession = await portalResponse.json();
    console.log("Portal session created:", portalSession.id);

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating customer portal:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
