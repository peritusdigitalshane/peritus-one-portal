import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BreachNotification {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  assignedTo: string | null;
  slaDueAt: string;
  breachType: "at_risk" | "breached";
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting SLA breach check...");

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Fetch tickets that are at risk (due within 2 hours) or breached (past due)
    // Only check P1 (critical) and P2 (high) priority tickets
    // Only check tickets that are not resolved or closed
    // Only include tickets that haven't been notified yet for their current breach state
    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, priority, assigned_to, sla_due_at, status, sla_breach_notified_at, sla_at_risk_notified_at")
      .in("priority", ["critical", "high"])
      .not("status", "in", '("resolved","closed")')
      .not("sla_due_at", "is", null)
      .lte("sla_due_at", twoHoursFromNow.toISOString())
      .order("sla_due_at", { ascending: true });

    if (ticketsError) {
      console.error("Error fetching tickets:", ticketsError);
      throw new Error("Failed to fetch tickets");
    }

    if (!tickets || tickets.length === 0) {
      console.log("No tickets approaching or past SLA breach");
      return new Response(
        JSON.stringify({ success: true, message: "No SLA breaches to notify", notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${tickets.length} tickets to check for SLA notifications`);

    // Filter tickets that need notification (haven't been notified for their current state)
    const ticketsToNotify: Array<typeof tickets[0] & { breachType: "at_risk" | "breached" }> = [];
    
    for (const ticket of tickets) {
      const slaDue = new Date(ticket.sla_due_at);
      const isBreached = slaDue < now;
      
      if (isBreached) {
        // Only notify if we haven't sent a breach notification yet
        if (!ticket.sla_breach_notified_at) {
          ticketsToNotify.push({ ...ticket, breachType: "breached" });
        }
      } else {
        // Only notify if we haven't sent an at-risk notification yet
        if (!ticket.sla_at_risk_notified_at) {
          ticketsToNotify.push({ ...ticket, breachType: "at_risk" });
        }
      }
    }

    if (ticketsToNotify.length === 0) {
      console.log("All tickets have already been notified");
      return new Response(
        JSON.stringify({ success: true, message: "All tickets already notified", notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`${ticketsToNotify.length} tickets need notification`);

    // Fetch MondoTalk credentials from admin_settings
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["MONDOTALK_ID", "MONDOTALK_KEY", "MONDOTALK_USERNAME", "MONDOTALK_PASSWORD", "MONDOTALK_SENDER"]);

    if (settingsError) {
      console.error("Error fetching MondoTalk settings:", settingsError);
      throw new Error("Failed to fetch MondoTalk credentials");
    }

    const mondoSettings: Record<string, string> = {};
    settings?.forEach((s) => {
      mondoSettings[s.key] = s.value || "";
    });

    const requiredKeys = ["MONDOTALK_ID", "MONDOTALK_KEY", "MONDOTALK_USERNAME", "MONDOTALK_PASSWORD"];
    const missingKeys = requiredKeys.filter((k) => !mondoSettings[k]);
    
    if (missingKeys.length > 0) {
      console.error(`Missing MondoTalk credentials: ${missingKeys.join(", ")}`);
      return new Response(
        JSON.stringify({ success: false, error: `Missing MondoTalk credentials: ${missingKeys.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all super admins with mobile numbers
    const { data: superAdminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (rolesError) {
      console.error("Error fetching super admin roles:", rolesError);
      throw new Error("Failed to fetch super admins");
    }

    const superAdminIds = superAdminRoles?.map((r) => r.user_id) || [];

    if (superAdminIds.length === 0) {
      console.log("No super admins found");
      return new Response(
        JSON.stringify({ success: true, message: "No super admins to notify", notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: superAdmins, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, mobile_number")
      .in("id", superAdminIds)
      .not("mobile_number", "is", null);

    if (profilesError) {
      console.error("Error fetching super admin profiles:", profilesError);
      throw new Error("Failed to fetch super admin profiles");
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log("No super admins with mobile numbers");
      return new Response(
        JSON.stringify({ success: true, message: "No super admins with mobile numbers", notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let notificationsSent = 0;
    const notifications: BreachNotification[] = [];

    // Build notification list
    for (const ticket of ticketsToNotify) {
      notifications.push({
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        priority: ticket.priority,
        assignedTo: ticket.assigned_to,
        slaDueAt: ticket.sla_due_at,
        breachType: ticket.breachType,
      });
    }

    // Group by breach type for summary
    const breached = notifications.filter((n) => n.breachType === "breached");
    const atRisk = notifications.filter((n) => n.breachType === "at_risk");

    // Send SMS to each super admin
    for (const admin of superAdmins) {
      if (!admin.mobile_number) continue;

      const phoneNumber = admin.mobile_number.replace(/\D/g, "");
      
      // Compose message
      let smsMessage = "";
      
      if (breached.length > 0 && atRisk.length > 0) {
        smsMessage = `SLA ALERT: ${breached.length} breached, ${atRisk.length} at risk. `;
        // Add first breached ticket details
        const first = breached[0];
        const priorityLabel = first.priority === "critical" ? "P1" : first.priority === "high" ? "P2" : "P3";
        smsMessage += `First: ${first.ticketNumber} (${priorityLabel}) - ${first.subject.substring(0, 40)}`;
      } else if (breached.length > 0) {
        if (breached.length === 1) {
          const t = breached[0];
          const priorityLabel = t.priority === "critical" ? "P1" : t.priority === "high" ? "P2" : "P3";
          smsMessage = `SLA BREACHED: ${t.ticketNumber} (${priorityLabel}) - ${t.subject.substring(0, 60)}`;
        } else {
          smsMessage = `SLA BREACHED: ${breached.length} tickets have breached SLA. `;
          const first = breached[0];
          smsMessage += `First: ${first.ticketNumber} - ${first.subject.substring(0, 40)}`;
        }
      } else if (atRisk.length > 0) {
        if (atRisk.length === 1) {
          const t = atRisk[0];
          const priorityLabel = t.priority === "critical" ? "P1" : t.priority === "high" ? "P2" : "P3";
          const dueDate = new Date(t.slaDueAt);
          const minsRemaining = Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60)));
          smsMessage = `SLA AT RISK: ${t.ticketNumber} (${priorityLabel}) due in ${minsRemaining}min - ${t.subject.substring(0, 50)}`;
        } else {
          smsMessage = `SLA AT RISK: ${atRisk.length} tickets approaching breach. Check dashboard.`;
        }
      }

      if (!smsMessage) continue;

      console.log(`Sending SLA notification to ${admin.full_name || "admin"} at ${phoneNumber}`);

      try {
        const formData = new URLSearchParams();
        formData.append("id", mondoSettings.MONDOTALK_ID);
        formData.append("key", mondoSettings.MONDOTALK_KEY);
        formData.append("username", mondoSettings.MONDOTALK_USERNAME);
        formData.append("password", mondoSettings.MONDOTALK_PASSWORD);
        formData.append("to", phoneNumber);
        formData.append("sender", mondoSettings.MONDOTALK_SENDER || "");
        formData.append("msg", smsMessage);

        const smsResponse = await fetch("https://api.mondotalk.com/myaccount/v1/sendsinglesms", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const responseData = await smsResponse.json();
        console.log(`SMS response for ${admin.full_name}:`, responseData);

        if (responseData._meta?.status === "SUCCESS") {
          notificationsSent++;
        }
      } catch (smsError: any) {
        console.error(`Error sending SMS to ${admin.full_name}:`, smsError);
      }
    }

    // Mark tickets as notified (only if at least one SMS was sent successfully)
    if (notificationsSent > 0) {
      const nowIso = now.toISOString();
      
      // Update breached tickets
      const breachedIds = breached.map((n) => n.ticketId);
      if (breachedIds.length > 0) {
        const { error: updateBreachedError } = await supabase
          .from("support_tickets")
          .update({ sla_breach_notified_at: nowIso })
          .in("id", breachedIds);
        
        if (updateBreachedError) {
          console.error("Error marking breached tickets as notified:", updateBreachedError);
        } else {
          console.log(`Marked ${breachedIds.length} tickets as breach-notified`);
        }
      }
      
      // Update at-risk tickets
      const atRiskIds = atRisk.map((n) => n.ticketId);
      if (atRiskIds.length > 0) {
        const { error: updateAtRiskError } = await supabase
          .from("support_tickets")
          .update({ sla_at_risk_notified_at: nowIso })
          .in("id", atRiskIds);
        
        if (updateAtRiskError) {
          console.error("Error marking at-risk tickets as notified:", updateAtRiskError);
        } else {
          console.log(`Marked ${atRiskIds.length} tickets as at-risk-notified`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `SLA notifications sent`,
        notified: notificationsSent,
        breached: breached.length,
        atRisk: atRisk.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-sla-breach-sms function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
