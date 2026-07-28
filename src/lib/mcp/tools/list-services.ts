import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "list_services",
  title: "List purchased services",
  description: "List the services and products purchased by the signed-in user.",
  inputSchema: {
    status: z.string().optional().describe("Filter by purchase status, e.g. 'active'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("user_purchases")
      .select("id,product_id,price_paid,status,purchased_at,next_billing_date,cancelled_at,fulfilled,notes")
      .order("purchased_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { services: data ?? [] } };
  },
});
