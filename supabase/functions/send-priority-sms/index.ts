import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  ticketNumber: string;
  subject: string;
  priority: string;
  testMode?: boolean;
  testPhoneNumber?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketNumber, subject, priority, testMode, testPhoneNumber }: SMSRequest = await req.json();
    
    console.log(`Processing SMS notification for ticket ${ticketNumber} with priority ${priority}${testMode ? ' (TEST MODE)' : ''}`);

    // In test mode, skip priority check
    if (!testMode) {
      // Only send SMS for P1 (critical) or P2 (high) tickets
      if (priority !== "critical" && priority !== "high") {
        console.log(`Skipping SMS - priority ${priority} does not require notification`);
        return new Response(
          JSON.stringify({ success: true, message: "SMS not required for this priority" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Determine recipients
    let recipients: Array<{ phone: string; name: string }> = [];

    if (testMode && testPhoneNumber) {
      // Test mode: send to the specified phone number only
      recipients = [{ phone: testPhoneNumber, name: "Test Recipient" }];
      console.log(`Test mode: sending to ${testPhoneNumber}`);
    } else {
      // Production mode: fetch super admin user IDs
      const { data: superAdminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (rolesError) {
        console.error("Error fetching super admin roles:", rolesError);
        throw new Error("Failed to fetch super admin roles");
      }

      if (!superAdminRoles || superAdminRoles.length === 0) {
        console.log("No super admins found");
        return new Response(
          JSON.stringify({ success: true, message: "No super admins to notify" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch super admin profiles with mobile numbers
      const superAdminIds = superAdminRoles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, mobile_number")
        .in("id", superAdminIds)
        .not("mobile_number", "is", null);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw new Error("Failed to fetch super admin profiles");
      }

      if (!profiles || profiles.length === 0) {
        console.log("No super admins with mobile numbers found");
        return new Response(
          JSON.stringify({ success: true, message: "No super admins with mobile numbers to notify" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      recipients = profiles.map((p) => ({
        phone: p.mobile_number!,
        name: p.full_name || "Super Admin",
      }));
    }

    console.log(`Found ${recipients.length} recipient(s) to notify`);

    const priorityLabel = priority === "critical" ? "P1" : "P2";
    const smsMessage = `${priorityLabel} Ticket ${ticketNumber}: ${subject.substring(0, 100)}`;

    const results: Array<{ phone: string; success: boolean; response?: any; error?: string }> = [];

    // Send SMS to each recipient
    for (const recipient of recipients) {
      const phoneNumber = recipient.phone.replace(/\D/g, ""); // Remove non-digits
      
      console.log(`Sending SMS to ${recipient.name} at ${phoneNumber}`);

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
        console.log(`SMS response for ${phoneNumber}:`, responseData);

        results.push({
          phone: phoneNumber,
          success: responseData._meta?.status === "SUCCESS",
          response: responseData,
        });
      } catch (smsError: any) {
        console.error(`Error sending SMS to ${phoneNumber}:`, smsError);
        results.push({
          phone: phoneNumber,
          success: false,
          error: smsError.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`SMS notifications complete: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount}/${results.length} SMS notifications`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-priority-sms function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
