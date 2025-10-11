import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials for send-password-reset function");
}

if (!resendApiKey) {
  console.error("Missing Resend API key for send-password-reset function");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const resend = new Resend(resendApiKey);

interface PasswordResetRequest {
  email?: string;
  redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase credentials are not configured.");
    }

    if (!resendApiKey) {
      throw new Error("Resend API key is not configured.");
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkError) {
      // Hide user existence to prevent account enumeration.
      console.warn("Failed to generate recovery link:", linkError);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Link data received:", JSON.stringify(linkData, null, 2));

    const actionLink = linkData?.properties?.action_link || linkData?.action_link;

    if (!actionLink) {
      console.error("No action link in response. Link data:", linkData);
      // Still return success to prevent account enumeration
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "Training System <support@resend.dev>",
      to: [normalizedEmail],
      subject: "Password Reset Instructions",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; text-align: center;">Reset Your Password</h1>

          <p>Hello,</p>

          <p>We received a request to reset the password for your Training Management System account.</p>

          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0;">Click the button below to choose a new password. This link will expire shortly.</p>
          </div>

          <p style="text-align: center; margin: 32px 0;">
            <a href="${actionLink}"
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>

          <p>If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${actionLink}</p>

          <p>If you did not request this change, you can safely ignore this email.</p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Training Management System • Automated security notification
          </p>
        </div>
      `,
    });

    console.log("Password reset email dispatched:", {
      emailId: emailResponse.data?.id,
      to: normalizedEmail,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error occurred.";
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
