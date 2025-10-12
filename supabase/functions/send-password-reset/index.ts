// Version: 2025-10-12
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { BufReader, BufWriter } from "https://deno.land/std@0.190.0/io/buffer.ts";
import { TextProtoReader } from "https://deno.land/std@0.190.0/textproto/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const smtpHost = Deno.env.get("SMTP_HOST") ?? "";
const smtpPortString = Deno.env.get("SMTP_PORT") ?? "";
const smtpUsername = Deno.env.get("SMTP_USERNAME") ?? "";
const smtpPassword = Deno.env.get("SMTP_PASSWORD") ?? "";
const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL") ?? "";
const smtpFromName = Deno.env.get("SMTP_FROM_NAME") ?? "Training System";
const smtpSecure =
  (Deno.env.get("SMTP_SECURE") ?? "true").toLowerCase() !== "false";
const smtpReplyTo = Deno.env.get("SMTP_REPLY_TO") ?? "";
const smtpHeloDomain = Deno.env.get("SMTP_HELO_DOMAIN") ?? "localhost";

const smtpConfigured = Boolean(
  smtpHost && smtpUsername && smtpPassword && smtpFromEmail,
);

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL for send-password-reset function");
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY for send-password-reset function");
}

if (!smtpConfigured) {
  console.error("SMTP configuration incomplete for send-password-reset function", {
    smtpHost,
    smtpUsernameProvided: Boolean(smtpUsername),
    smtpFromEmail,
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

    if (!smtpConfigured) {
      console.error(`[${requestId}] SMTP configuration missing – cannot send password email`);
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
      await sendPasswordResetEmailViaSmtp({
        to: normalizedEmail,
        resetUrl,
        requestId,
      });

      console.log(`[${requestId}] Password reset email sent`, {
        to: normalizedEmail,
        provider: "smtp",
      });

      return new Response(
        JSON.stringify({
          success: true,
          requestId,
          data: {
            provider: "smtp",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    } catch (sendError) {
      console.error(
        `[${requestId}] Failed to dispatch password reset email via SMTP`,
        sendError,
      );

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

const encoder = new TextEncoder();

async function sendPasswordResetEmailViaSmtp(params: {
  to: string;
  resetUrl: string;
  requestId: string;
}) {
  const { to, resetUrl, requestId } = params;

  const port = Number.parseInt(smtpPortString, 10) ||
    (smtpSecure ? 465 : 587);

  const connection = smtpSecure
    ? await Deno.connectTls({ hostname: smtpHost, port })
    : await Deno.connect({ hostname: smtpHost, port });

  const reader = new TextProtoReader(new BufReader(connection));
  const writer = new BufWriter(connection);

  const sendCommand = async (command: string) => {
    await writer.write(encoder.encode(`${command}\r\n`));
    await writer.flush();
  };

  const readResponse = async () => {
    const line = await reader.readLine();
    if (line === null) {
      throw new Error("SMTP connection closed unexpectedly.");
    }
    const code = Number.parseInt(line.slice(0, 3), 10);
    let message = line.length > 4 ? line.slice(4) : "";
    let continuation = line[3] === "-";

    while (continuation) {
      const nextLine = await reader.readLine();
      if (nextLine === null) {
        break;
      }
      message += `\n${nextLine.length > 4 ? nextLine.slice(4) : ""}`;
      continuation = nextLine[3] === "-";
    }

    return { code, message };
  };

  const expect = async (expectedCodes: number[], context: string) => {
    const response = await readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP ${context} failed (${response.code}): ${response.message}`);
    }
  };

  try {
    await expect([220], "greeting");

    await sendCommand(`EHLO ${smtpHeloDomain}`);
    await expect([250], "EHLO");

    await sendCommand("AUTH LOGIN");
    await expect([334], "AUTH LOGIN challenge");

    await sendCommand(btoa(smtpUsername));
    await expect([334], "AUTH LOGIN username");

    await sendCommand(btoa(smtpPassword));
    await expect([235], "AUTH LOGIN password");

    const fromAddress = smtpFromName
      ? `${smtpFromName} <${smtpFromEmail}>`
      : smtpFromEmail;

    await sendCommand(`MAIL FROM:<${smtpFromEmail}>`);
    await expect([250], "MAIL FROM");

    await sendCommand(`RCPT TO:<${to}>`);
    await expect([250, 251], "RCPT TO");

    await sendCommand("DATA");
    await expect([354], "DATA");

    const { textContent, htmlContent } = buildEmailContent(resetUrl);
    const boundary = `BOUNDARY_${crypto.randomUUID()}`;

    const headers = [
      `From: ${fromAddress}`,
      `To: <${to}>`,
      `Subject: Password Reset Instructions`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
    ];

    if (smtpReplyTo) {
      headers.push(`Reply-To: ${smtpReplyTo}`);
    }

    const bodyParts = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="utf-8"`,
      ``,
      textContent,
      `--${boundary}`,
      `Content-Type: text/html; charset="utf-8"`,
      ``,
      htmlContent,
      `--${boundary}--`,
      ``,
    ];

    const message = `${headers.join("\r\n")}\r\n\r\n${bodyParts.join("\r\n")}`;
    const safeMessage = message.replace(/\n\./g, "\n..");

    await writer.write(encoder.encode(`${safeMessage}\r\n.\r\n`));
    await writer.flush();
    await expect([250], "message body");

    await sendCommand("QUIT");
    await expect([221], "QUIT");

    console.info(`[${requestId}] Password reset email dispatched via SMTP`, {
      to,
      host: smtpHost,
      port,
    });
  } finally {
    try {
      connection.close();
    } catch {
      // ignore
    }
  }
}

function buildEmailContent(resetUrl: string): {
  textContent: string;
  htmlContent: string;
} {
  const textContent = [
    "Reset Your Password",
    "",
    "We received a request to reset the password for your Training Management System account.",
    "",
    `Reset link: ${resetUrl}`,
    "",
    "If you did not request this change, you can safely ignore this email.",
  ].join("\n");

  const htmlContent = `
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

  return { textContent, htmlContent };
}
