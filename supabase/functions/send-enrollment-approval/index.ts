import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentApprovalRequest {
  userId: string;
  courseId: string;
  enrollmentId: string;
  courseName: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Parse request body
    const { userId, courseId, enrollmentId, courseName }: EnrollmentApprovalRequest = await req.json();

    console.log("Processing enrollment approval request:", { userId, courseId, courseName });

    // Get user details
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("first_name, last_name, email, department")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      throw new Error("Failed to fetch user data");
    }

    const userName = userData.first_name && userData.last_name 
      ? `${userData.first_name} ${userData.last_name}` 
      : userData.email;

    // Get managers' emails (users with 'admin' or 'manager' role)
    const { data: managers, error: managersError } = await supabaseClient
      .from("users")
      .select("email, first_name, last_name")
      .in("role", ["admin", "manager"])
      .eq("is_active", true);

    if (managersError) {
      console.error("Error fetching managers:", managersError);
      throw new Error("Failed to fetch managers");
    }

    if (!managers || managers.length === 0) {
      console.log("No managers found to send approval email");
      return new Response(
        JSON.stringify({ success: true, message: "No managers found to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const managerEmails = managers.map(manager => manager.email);
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "your-app";

    // Send approval email to each manager
    const emailPromises = managerEmails.map(async (managerEmail) => {
      const approvalUrl = `${appUrl}/admin/approvals?enrollment=${enrollmentId}`;
      
      return resend.emails.send({
        from: Deno.env.get("FROM_EMAIL") || "noreply@lovable.dev",
        to: [managerEmail],
        subject: `Course Enrollment Approval Required: ${courseName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
              Course Enrollment Approval Required
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Employee Details</h3>
              <p><strong>Name:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              ${userData.department ? `<p><strong>Department:</strong> ${userData.department}</p>` : ''}
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">Course Information</h3>
              <p><strong>Course:</strong> ${courseName}</p>
              <p><strong>Request Type:</strong> Course Enrollment</p>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${approvalUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Review & Approve Request
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; 
                        color: #6c757d; font-size: 14px;">
              <p>This is an automated message from your Learning Management System.</p>
              <p>Please review the enrollment request and approve or deny it through the admin dashboard.</p>
            </div>
          </div>
        `,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => result.status === "fulfilled").length;
    const failureCount = emailResults.filter(result => result.status === "rejected").length;

    console.log(`Email results: ${successCount} sent successfully, ${failureCount} failed`);

    // Log any failures
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to send email to ${managerEmails[index]}:`, result.reason);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Approval emails sent to ${successCount} managers`,
        emailsSent: successCount,
        emailsFailed: failureCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in send-enrollment-approval function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});