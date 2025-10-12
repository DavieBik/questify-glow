// Version: 2025-10-12
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? "";
const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";
const sendgridFromName = Deno.env.get("SENDGRID_FROM_NAME") ?? "Training System";
const sendgridReplyTo = Deno.env.get("SENDGRID_REPLY_TO") ?? "";

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL for send-password-reset function");
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY for send-password-reset function");
}

if (!sendgridApiKey || !sendgridFromEmail) {
  console.error("SendGrid configuration incomplete for send-password-reset function", {
    apiKeyProvided: Boolean(sendgridApiKey),
    fromEmail: sendgridFromEmail,
  });
}

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

interface PasswordResetRequest {
  email?: string;
  redirectTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!supabase || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error: Supabase credentials are missing.",
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: "invalid_email",
            message: "A valid email address is required.",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options:
        redirectTo && redirectTo !== "DISABLE" ? { redirectTo } : undefined,
    });

    if (linkError) {
      const message = linkError.message ?? "Unknown error";
      const normalizedMessage = message.toLowerCase();
      const isUserMissing =
        normalizedMessage.includes("not found") ||
        normalizedMessage.includes("no user") ||
        normalizedMessage.includes("does not exist");

      console.warn(`[${requestId}] Supabase generateLink failed:`, {
        email: normalizedEmail,
        error: linkError,
        message,
      });

      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: isUserMissing ? "user_not_found" : "link_generation_failed",
            message: isUserMissing
              ? "We couldn't find an account with that email address. Please sign up first."
              : message,
            details: linkError,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const resetUrl = linkData?.properties?.action_link ?? linkData?.action_link ?? null;

    if (!resetUrl) {
      console.error(`[${requestId}] Supabase did not return an action link for recovery`, {
        email: normalizedEmail,
        linkData,
      });
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: "missing_action_link",
            message:
              "Unable to generate a password reset link at the moment. Please try again later.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (!sendgridApiKey || !sendgridFromEmail) {
      console.error(`[${requestId}] Email provider configuration missing – cannot send password email`, {
        apiKeyProvided: Boolean(sendgridApiKey),
        fromEmail: sendgridFromEmail,
      });
      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: "email_service_not_configured",
            message: "Email service is not configured. Please contact support to reset your password.",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    try {
      await sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl,
        requestId,
      });

      console.log(`[${requestId}] Password reset email sent via SendGrid`, {
        to: normalizedEmail,
      });

      return new Response(
        JSON.stringify({
          success: true,
          requestId,
          data: {
            provider: "sendgrid",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (sendError) {
      console.error(`[${requestId}] Failed to dispatch password reset email via SendGrid`, sendError);

      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: "email_send_failed",
            message: "Failed to send password reset email. Please try again later.",
            details:
              sendError instanceof Error ? { message: sendError.message } : undefined,
          },
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error occurred.";
    console.error(`[${requestId}] Error in send-password-reset function:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        requestId,
        error: {
          code: "unexpected_error",
          message,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);

async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  requestId: string;
}) {
  const { to, resetUrl, requestId } = params;

  const textContent = [
    "Reset Your Password",
    "",
    "We received a request to reset the password for your Training Management System account.",
    "",
    `Reset link: ${resetUrl}`,
    "",
    "If you did not request this change, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb; text-align: center;">Reset Your Password</h1>

      <p>Hello,</p>

      <p>We received a request to reset the password for your Training Management System account.</p>

      <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0;">Click the button below to choose a new password. This link will expire shortly.</p>
      </div>

      <p style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </p>

      <p>If the button above does not work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>

      <p>If you did not request this change, you can safely ignore this email.</p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        Training Management System - Automated security notification
      </p>
    </div>
  `;

  const payload: Record<string, unknown> = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: "Password Reset Instructions",
      },
    ],
    from: {
      email: sendgridFromEmail,
      name: sendgridFromName,
    },
    content: [
      {
        type: "text/plain",
        value: textContent,
      },
      {
        type: "text/html",
        value: html,
      },
    ],
  };

  if (sendgridReplyTo) {
    payload.reply_to = { email: sendgridReplyTo };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `SendGrid request failed with status ${response.status}: ${bodyText || response.statusText}`,
    );
  }

  console.info(`[${requestId}] Password reset email dispatched via SendGrid`, {
    to,
    status: response.status,
  });
}
