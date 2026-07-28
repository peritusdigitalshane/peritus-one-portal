import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "list_invoices",
  title: "List invoices",
  description: "List invoices for the signed-in user, including amounts, status and PDF links.",
  inputSchema: {
    status: z.string().optional().describe("Filter by invoice status, e.g. 'paid' or 'open'."),
    limit: z.number().int().min(1).max(100).optional().describe("Max invoices to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("invoices")
      .select("id,invoice_number,amount,status,description,due_date,paid_at,pdf_url,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { invoices: data ?? [] } };
  },
});
