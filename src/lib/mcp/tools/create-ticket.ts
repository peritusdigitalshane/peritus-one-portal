import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "./_supabase";

export default defineTool({
  name: "create_ticket",
  title: "Create support ticket",
  description: "Create a new support ticket for the signed-in user.",
  inputSchema: {
    subject: z.string().trim().min(1).describe("Short summary of the issue."),
    description: z.string().trim().min(1).describe("Full description of the issue."),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional().describe("ITIL priority, P1 highest."),
    category: z
      .enum(["incident", "service_request", "change_request", "problem", "question"])
      .optional()
      .describe("Ticket category."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ subject, description, priority, category }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("support_tickets")
      .insert({
        user_id: ctx.getUserId(),
        subject,
        description,
        ...(priority ? { priority } : {}),
        ...(category ? { category } : {}),
      })
      .select("id,ticket_number,subject,status,priority,category,created_at")
      .single();
    if (error) return errorResult(error.message);
    return { ...textResult(data), structuredContent: { ticket: data } };
  },
});
