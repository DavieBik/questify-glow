import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  employeeId?: string;
  department?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      firstName, 
      lastName, 
      role, 
      employeeId, 
      department 
    }: InvitationRequest = await req.json();

    const signUpUrl = `${new URL(req.url).origin}/auth`;

    const emailResponse = await resend.emails.send({
      from: "Training System <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome! You've been invited to join our Training System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
            Welcome to the Training System!
          </h1>
          
          <p>Hello ${firstName} ${lastName},</p>
          
          <p>You've been invited to join our Training Management System with the following details:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            ${employeeId ? `<p><strong>Employee ID:</strong> ${employeeId}</p>` : ''}
            ${department ? `<p><strong>Department:</strong> ${department}</p>` : ''}
          </div>
          
          <p>To get started, please follow these steps:</p>
          <ol>
            <li>Click the link below to access the registration page</li>
            <li>Create your account using this email address: <strong>${email}</strong></li>
            <li>Set up your password and complete your profile</li>
            <li>Start exploring the available training courses</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUpUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Create Your Account
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you have any questions or need assistance, please contact your administrator.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Training Management System
          </p>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
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