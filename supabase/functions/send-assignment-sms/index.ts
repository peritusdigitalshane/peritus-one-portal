import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentSMSRequest {
  type: "task" | "ticket";
  assignedToUserId: string;
  title: string;
  identifier?: string; // ticket number or task ID
  priority?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, assignedToUserId, title, identifier, priority }: AssignmentSMSRequest = await req.json();
    
    console.log(`Processing assignment SMS notification for ${type}: ${title} to user ${assignedToUserId}`);

    if (!assignedToUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "No assignee specified" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if the assignee is a super_admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", assignedToUserId)
      .eq("role", "super_admin")
      .single();

    if (roleError || !roleData) {
      console.log("Assignee is not a super admin, skipping SMS");
      return new Response(
        JSON.stringify({ success: true, message: "SMS only sent to super admins" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch the assignee's profile with mobile number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, mobile_number")
      .eq("id", assignedToUserId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to fetch assignee profile");
    }

    if (!profile?.mobile_number) {
      console.log("Assignee does not have a mobile number");
      return new Response(
        JSON.stringify({ success: true, message: "Assignee has no mobile number" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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

    // Check if all required credentials are present
    const requiredKeys = ["MONDOTALK_ID", "MONDOTALK_KEY", "MONDOTALK_USERNAME", "MONDOTALK_PASSWORD"];
    const missingKeys = requiredKeys.filter((k) => !mondoSettings[k]);
    
    if (missingKeys.length > 0) {
      console.error(`Missing MondoTalk credentials: ${missingKeys.join(", ")}`);
      return new Response(
        JSON.stringify({ success: false, error: `Missing MondoTalk credentials: ${missingKeys.join(", ")}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Compose the message
    let smsMessage = "";
    if (type === "ticket") {
      const priorityLabel = priority === "critical" ? "P1" : priority === "high" ? "P2" : priority === "medium" ? "P3" : "P4";
      smsMessage = `Ticket ${identifier} assigned to you: ${priorityLabel} - ${title.substring(0, 80)}`;
    } else {
      const priorityLabel = priority === "urgent" ? "URGENT" : priority === "high" ? "HIGH" : "";
      smsMessage = `Task assigned to you${priorityLabel ? ` (${priorityLabel})` : ""}: ${title.substring(0, 100)}`;
    }

    const phoneNumber = profile.mobile_number.replace(/\D/g, "");
    console.log(`Sending SMS to ${profile.full_name || "user"} at ${phoneNumber}`);

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
      console.log(`SMS response:`, responseData);

      const success = responseData._meta?.status === "SUCCESS";

      return new Response(
        JSON.stringify({ 
          success, 
          message: success ? "SMS sent successfully" : "SMS failed to send",
          response: responseData 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (smsError: any) {
      console.error(`Error sending SMS:`, smsError);
      return new Response(
        JSON.stringify({ success: false, error: smsError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in send-assignment-sms function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
