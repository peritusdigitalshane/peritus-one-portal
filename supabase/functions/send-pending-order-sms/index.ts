import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!token || token.split(".").length !== 3) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some(r => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pendingOrderId, mobileNumber, customerName, link } = await req.json();
    if (!pendingOrderId || !mobileNumber || !link) {
      return new Response(JSON.stringify({ error: "Missing pendingOrderId, mobileNumber, or link" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("admin_settings").select("key, value")
      .in("key", ["MONDOTALK_ID","MONDOTALK_KEY","MONDOTALK_USERNAME","MONDOTALK_PASSWORD","MONDOTALK_SENDER"]);

    const mondo: Record<string,string> = {};
    settings?.forEach(s => { mondo[s.key] = s.value || ""; });

    const required = ["MONDOTALK_ID","MONDOTALK_KEY","MONDOTALK_USERNAME","MONDOTALK_PASSWORD"];
    const missing = required.filter(k => !mondo[k]);
    if (missing.length) {
      return new Response(JSON.stringify({ error: `Missing MondoTalk credentials: ${missing.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = customerName ? `Hi ${customerName.split(" ")[0]}, ` : "Hi, ";
    const msg = `${greeting}your Peritus order is ready. Pay here: ${link}`;

    let phone = String(mobileNumber).replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "61" + phone.slice(1);

    const formData = new URLSearchParams();
    formData.append("id", mondo.MONDOTALK_ID);
    formData.append("key", mondo.MONDOTALK_KEY);
    formData.append("username", mondo.MONDOTALK_USERNAME);
    formData.append("password", mondo.MONDOTALK_PASSWORD);
    formData.append("to", phone);
    formData.append("sender", mondo.MONDOTALK_SENDER || "");
    formData.append("msg", msg);

    const smsResp = await fetch("https://api.mondotalk.com/myaccount/v1/sendsinglesms", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const respData = await smsResp.json();
    console.log("MondoTalk response:", respData);

    const success = respData?._meta?.status === "SUCCESS";
    return new Response(JSON.stringify({ success, response: respData, sentTo: phone, message: msg }), {
      status: success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-pending-order-sms error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
