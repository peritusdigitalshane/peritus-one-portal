import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTicketsTool from "./tools/list-tickets";
import createTicketTool from "./tools/create-ticket";
import getTicketCommentsTool from "./tools/get-ticket-comments";
import addTicketCommentTool from "./tools/add-ticket-comment";
import listServicesTool from "./tools/list-services";
import listInvoicesTool from "./tools/list-invoices";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "peritus-one-mcp",
  title: "Peritus ONE",
  version: "0.1.0",
  instructions:
    "Tools for the Peritus ONE customer portal. Read and create support tickets, read and add ticket comments, and list purchased services and invoices for the signed-in customer. All data is scoped to the authenticated user (admins see all tickets).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listTicketsTool,
    createTicketTool,
    getTicketCommentsTool,
    addTicketCommentTool,
    listServicesTool,
    listInvoicesTool,
  ],
});
