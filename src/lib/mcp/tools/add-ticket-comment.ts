import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "add_ticket_comment",
  title: "Add ticket comment",
  description: "Add a comment to a support ticket as the signed-in user.",
  inputSchema: {
    ticket_id: z.string().uuid().describe("The ticket UUID."),
    comment: z.string().trim().min(1).describe("Comment text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ ticket_id, comment }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("ticket_comments")
      .insert({ ticket_id, comment, user_id: ctx.getUserId(), is_internal: false })
      .select("id,ticket_id,comment,created_at")
      .single();
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { comment: data } };
  },
});
