import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "get_ticket_comments",
  title: "Get ticket comments",
  description: "Read the comment thread on a support ticket. Internal notes are only visible to admins.",
  inputSchema: { ticket_id: z.string().uuid().describe("The ticket UUID.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticket_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("ticket_comments")
      .select("id,comment,is_internal,user_id,created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true });
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { comments: data ?? [] } };
  },
});
