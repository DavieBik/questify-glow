import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalEmailRequest {
  approval_id: string;
  type: 'request' | 'approved' | 'denied';
  user_email?: string;
  course_title?: string;
  reviewer_notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { approval_id, type, user_email, course_title, reviewer_notes }: ApprovalEmailRequest = await req.json();

    console.log('Processing approval email:', { approval_id, type });

    // Fetch approval details if not provided
    let emailData = { user_email, course_title };
    
    if (!user_email || !course_title) {
      // Get approval details
      const { data: approval, error: approvalError } = await supabase
        .from('approvals')
        .select('*')
        .eq('id', approval_id)
        .single();

      if (approvalError) {
        throw new Error(`Failed to fetch approval: ${approvalError.message}`);
      }

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', approval.user_id)
        .single();

      if (userError) {
        throw new Error(`Failed to fetch user: ${userError.message}`);
      }

      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title')
        .eq('id', approval.course_id)
        .single();

      if (courseError) {
        throw new Error(`Failed to fetch course: ${courseError.message}`);
      }

      emailData = {
        user_email: userData.email,
        course_title: courseData.title
      };
    }

    let subject: string;
    let htmlContent: string;

    switch (type) {
      case 'request':
        subject = `Approval Required: Course Enrollment Request`;
        htmlContent = `
          <h1>Course Enrollment Approval Required</h1>
          <p>A new course enrollment request needs your approval:</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Course:</strong> ${emailData.course_title}</p>
            <p><strong>Requested by:</strong> ${emailData.user_email}</p>
            <p><strong>Request ID:</strong> ${approval_id}</p>
          </div>
          <p>Please log in to your dashboard to review and process this request.</p>
          <p><a href="${Deno.env.get('SITE_URL') || 'https://skillbridge.lovable.app'}/admin/approvals" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Approval</a></p>
        `;
        break;

      case 'approved':
        subject = `Course Enrollment Approved: ${emailData.course_title}`;
        htmlContent = `
          <h1>Course Enrollment Approved! 🎉</h1>
          <p>Great news! Your course enrollment request has been approved:</p>
          <div style="background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #c3e6cb;">
            <p><strong>Course:</strong> ${emailData.course_title}</p>
            <p><strong>Status:</strong> Approved ✅</p>
            ${reviewer_notes ? `<p><strong>Notes:</strong> ${reviewer_notes}</p>` : ''}
          </div>
          <p>You can now start your learning journey!</p>
          <p><a href="${Deno.env.get('SITE_URL') || 'https://skillbridge.lovable.app'}/courses" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Learning</a></p>
        `;
        break;

      case 'denied':
        subject = `Course Enrollment Request Update: ${emailData.course_title}`;
        htmlContent = `
          <h1>Course Enrollment Request Update</h1>
          <p>We've reviewed your course enrollment request:</p>
          <div style="background: #f8d7da; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #f5c6cb;">
            <p><strong>Course:</strong> ${emailData.course_title}</p>
            <p><strong>Status:</strong> Not approved at this time</p>
            ${reviewer_notes ? `<p><strong>Feedback:</strong> ${reviewer_notes}</p>` : ''}
          </div>
          <p>If you have questions about this decision, please contact your manager or training coordinator.</p>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Determine recipient email based on type
    const recipientEmail = type === 'request' 
      ? 'manager@company.com' // In a real app, this would be fetched from managers list
      : emailData.user_email!;

    const emailResponse = await resend.emails.send({
      from: "SkillBridge <noreply@skillbridge.com>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in approval-email function:", error);
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