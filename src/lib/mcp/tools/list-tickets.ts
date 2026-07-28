import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "list_tickets",
  title: "List support tickets",
  description:
    "List support tickets visible to the signed-in user. Regular users see their own tickets; admins see all tickets.",
  inputSchema: {
    status: z
      .enum(["open", "in_progress", "resolved", "closed"])
      .optional()
      .describe("Filter tickets by status."),
    limit: z.number().int().min(1).max(100).optional().describe("Max tickets to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("support_tickets")
      .select("id,ticket_number,subject,description,status,priority,category,created_at,updated_at,sla_due_at,resolution_notes")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { tickets: data ?? [] } };
  },
});
