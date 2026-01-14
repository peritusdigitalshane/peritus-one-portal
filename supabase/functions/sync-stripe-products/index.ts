import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify user is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is super_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - Super admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Stripe secret key from admin_settings
    const { data: settingData, error: settingError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "STRIPE_SECRET_KEY")
      .single();

    if (settingError || !settingData?.value) {
      return new Response(JSON.stringify({ error: "Stripe API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = settingData.value;

    // Fetch products from Stripe
    const stripeProductsResponse = await fetch("https://api.stripe.com/v1/products?active=true&limit=100", {
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
      },
    });

    if (!stripeProductsResponse.ok) {
      const errorText = await stripeProductsResponse.text();
      console.error("Stripe API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch products from Stripe" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeProducts = await stripeProductsResponse.json();

    // Fetch prices from Stripe
    const stripePricesResponse = await fetch("https://api.stripe.com/v1/prices?active=true&limit=100", {
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
      },
    });

    if (!stripePricesResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch prices from Stripe" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripePrices = await stripePricesResponse.json();

    // Create a map of product_id -> price info
    const priceMap: Record<string, { id: string; unit_amount: number; recurring: { interval: string } | null }> = {};
    for (const price of stripePrices.data) {
      // Prefer default price or first price for each product
      if (!priceMap[price.product] || price.metadata?.default === "true") {
        priceMap[price.product] = {
          id: price.id,
          unit_amount: price.unit_amount || 0,
          recurring: price.recurring,
        };
      }
    }

    let synced = 0;
    let updated = 0;
    let skipped = 0;

    for (const product of stripeProducts.data) {
      const priceInfo = priceMap[product.id];
      if (!priceInfo) {
        skipped++;
        continue;
      }

      // Determine billing type
      let billingType = "one-time";
      if (priceInfo.recurring) {
        billingType = priceInfo.recurring.interval === "year" ? "yearly" : "monthly";
      }

      // Check if product already exists (fetch existing local fields to preserve)
      const { data: existingProduct } = await supabase
        .from("products")
        .select("id, category, icon, sort_order, visibility")
        .eq("stripe_product_id", product.id)
        .single();

      // Base product data from Stripe
      const baseProductData = {
        name: product.name,
        description: product.description || null,
        price: (priceInfo.unit_amount || 0) / 100,
        billing_type: billingType,
        stripe_product_id: product.id,
        stripe_price_id: priceInfo.id,
        is_active: product.active,
        features: product.features?.map((f: { name: string }) => f.name) || [],
      };

      if (existingProduct) {
        // Preserve locally-set fields (category, icon, sort_order, visibility)
        // Only override category if Stripe explicitly provides one in metadata
        const updateData: Record<string, unknown> = { ...baseProductData };
        
        // Only update category if Stripe metadata explicitly sets it
        if (product.metadata?.category) {
          updateData.category = product.metadata.category;
        }
        // Otherwise keep existing category (don't include in update)

        await supabase
          .from("products")
          .update(updateData)
          .eq("id", existingProduct.id);
        updated++;
      } else {
        // New product - use Stripe metadata category or default to "other"
        const insertData = {
          ...baseProductData,
          category: product.metadata?.category || "other",
        };
        await supabase.from("products").insert(insertData);
        synced++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        updated,
        skipped,
        total: stripeProducts.data.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing Stripe products:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
