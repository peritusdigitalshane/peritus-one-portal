import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { customer } = await req.json();
  const { data: s } = await supabase.from("admin_settings").select("value").eq("key", "STRIPE_SECRET_KEY").single();
  const r = await fetch(`https://api.stripe.com/v1/invoices?customer=${customer}&limit=100`, {
    headers: { Authorization: `Bearer ${s!.value}` },
  });
  const j = await r.json();
  if (!r.ok) return Response.json({ ok: false, error: j.error?.message });
  return Response.json({
    count: j.data?.length ?? 0,
    invoices: (j.data ?? []).map((i: any) => ({ id: i.id, number: i.number, status: i.status, amount: i.amount_due / 100, created: new Date(i.created * 1000).toISOString() })),
  });
});
