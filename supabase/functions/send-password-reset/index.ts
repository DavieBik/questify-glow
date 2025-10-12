import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL for send-password-reset function");
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY for send-password-reset function");
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectTo && redirectTo !== "DISABLE" ? redirectTo : undefined,
    });

    if (resetError) {
      const message = resetError.message ?? "Unknown error";
      console.warn(`[${requestId}] Supabase resetPasswordForEmail failed:`, {
        email: normalizedEmail,
        error: resetError,
        message,
      });

      const normalizedMessage = message.toLowerCase();
      const isUserMissing =
        normalizedMessage.includes("not found") ||
        normalizedMessage.includes("no user") ||
        normalizedMessage.includes("does not exist");

      return new Response(
        JSON.stringify({
          success: false,
          requestId,
          error: {
            code: isUserMissing ? "user_not_found" : "reset_failed",
            message: isUserMissing
              ? "We couldn't find an account with that email address. Please sign up first."
              : message,
            details: resetError,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log(`[${requestId}] Supabase password reset email requested successfully`, {
      email: normalizedEmail,
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        data: {
          provider: "supabase",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
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
