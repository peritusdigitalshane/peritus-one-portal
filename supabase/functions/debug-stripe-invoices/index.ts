import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { email } = await req.json();
  const { data: s } = await supabase.from("admin_settings").select("value").eq("key", "STRIPE_SECRET_KEY").single();
  const key = s!.value;
  const h = { Authorization: `Bearer ${key}` };
  const cr = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=100`, { headers: h });
  const cj = await cr.json();
  if (!cr.ok) return Response.json({ ok: false, error: cj.error?.message });
  const out: any[] = [];
  for (const c of cj.data ?? []) {
    const ir = await fetch(`https://api.stripe.com/v1/invoices?customer=${c.id}&limit=100`, { headers: h });
    const ij = await ir.json();
    const sr = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${c.id}&status=all&limit=100`, { headers: h });
    const sj = await sr.json();
    out.push({
      customer: c.id,
      livemode: c.livemode,
      email: c.email,
      invoices: (ij.data ?? []).map((i: any) => ({ number: i.number, status: i.status, amount: i.amount_due / 100, created: new Date(i.created * 1000).toISOString() })),
      subscriptions: (sj.data ?? []).map((x: any) => ({ id: x.id, status: x.status, current_period_end: x.current_period_end ? new Date(x.current_period_end * 1000).toISOString() : null, collection_method: x.collection_method })),
    });
  }
  return Response.json({ customers: out.length, out });
});
