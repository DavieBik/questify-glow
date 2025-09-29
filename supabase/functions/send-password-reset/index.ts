import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    // Generate a temporary password - in a real system, you'd want to 
    // integrate with your auth system to generate proper reset tokens
    const tempPassword = Math.random().toString(36).slice(-8);

    const emailResponse = await resend.emails.send({
      from: "Training System <onboarding@resend.dev>",
      to: [email],
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            Password Reset Request
          </h1>
          
          <p>Hello,</p>
          
          <p>We received a request to reset your password for the Training Management System.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your temporary password is:</strong></p>
            <p style="font-family: monospace; font-size: 18px; color: #2563eb; font-weight: bold;">
              ${tempPassword}
            </p>
          </div>
          
          <p><strong>Important:</strong></p>
          <ul>
            <li>Use this temporary password to log in to your account</li>
            <li>Change your password immediately after logging in</li>
            <li>This temporary password will expire in 24 hours</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${new URL(req.url).origin}/auth" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login Now
            </a>
          </div>
          
          <p style="color: #dc2626; font-weight: bold;">
            If you didn't request this password reset, please contact your administrator immediately.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Training Management System - Password Reset Service
          </p>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Password reset email sent",
      tempPassword // In production, don't return this in the response
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);