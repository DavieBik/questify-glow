import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefresherSchedulingRequest {
  completionId: string;
  userId: string;
  courseId: string;
  attemptNumber: number;
  scorePercentage?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { completionId, userId, courseId, attemptNumber, scorePercentage }: RefresherSchedulingRequest = await req.json();

    console.log("Processing refresher scheduling for completion:", completionId);

    // Get user and course details
    const [userResult, courseResult] = await Promise.all([
      supabase.from("users").select("first_name, last_name, email").eq("id", userId).single(),
      supabase.from("courses").select("title, description, is_mandatory").eq("id", courseId).single()
    ]);

    if (userResult.error || courseResult.error) {
      throw new Error("Failed to fetch user or course details");
    }

    const user = userResult.data;
    const course = courseResult.data;

    // Calculate due date (30 days from now)
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const dueDateString = dueDate.toISOString().split('T')[0];

    // Check if user already has an active enrollment for refresher
    const { data: existingEnrollment } = await supabase
      .from("user_course_enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("status", "enrolled")
      .gte("due_date", new Date().toISOString().split('T')[0])
      .single();

    let enrollmentResult;

    if (existingEnrollment) {
      // Update existing enrollment
      enrollmentResult = await supabase
        .from("user_course_enrollments")
        .update({
          due_date: dueDateString,
          progress_percentage: 0,
          status: "enrolled"
        })
        .eq("id", existingEnrollment.id)
        .select()
        .single();
    } else {
      // Create new enrollment for refresher
      enrollmentResult = await supabase
        .from("user_course_enrollments")
        .insert({
          user_id: userId,
          course_id: courseId,
          due_date: dueDateString,
          progress_percentage: 0,
          status: "enrolled"
        })
        .select()
        .single();
    }

    if (enrollmentResult.error) {
      console.error("Enrollment creation/update failed:", enrollmentResult.error);
      throw new Error("Failed to schedule refresher enrollment");
    }

    // Send refresher notification email
    const emailResponse = await resend.emails.send({
      from: "Training System <refreshers@resend.dev>",
      to: [user.email],
      subject: `📚 Refresher Training Scheduled - ${course.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626; text-align: center;">📚 Refresher Training Required</h1>
          
          <p>Dear ${user.first_name} ${user.last_name},</p>
          
          <p>Based on your recent completion attempt, a refresher training has been scheduled for:</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="margin: 0; color: #991b1b;">${course.title}</h2>
            <p style="margin: 10px 0 0 0; color: #64748b;">
              Previous Score: ${scorePercentage ? `${scorePercentage}%` : 'Not passed'}
            </p>
            <p style="margin: 5px 0 0 0; color: #64748b;">
              Attempt Number: ${attemptNumber}
            </p>
          </div>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin: 0 0 10px 0; color: #15803d;">📅 Important Details:</h3>
            <ul style="margin: 0; color: #166534;">
              <li><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</li>
              <li><strong>Status:</strong> ${course.is_mandatory ? 'Mandatory' : 'Optional'}</li>
              <li><strong>Enrollment:</strong> Automatically enrolled</li>
            </ul>
          </div>
          
          <p>What happens next:</p>
          <ol>
            <li>Review the course materials thoroughly</li>
            <li>Take your time to understand the concepts</li>
            <li>Retake the assessment when you're ready</li>
            <li>Achieve the required passing score</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${new URL(req.url).origin}/courses/${courseId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              📖 Start Refresher Training
            </a>
          </div>
          
          ${course.is_mandatory ? 
            '<div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;"><p style="margin: 0; color: #92400e;"><strong>⚠️ Mandatory Training:</strong> This refresher training is required for compliance. Please complete it by the due date.</p></div>' : 
            ''
          }
          
          <p style="color: #64748b; font-size: 14px;">
            If you have any questions about this refresher training, please contact your supervisor or training administrator.
          </p>
        </div>
      `,
    });

    console.log("Refresher scheduling completed successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      enrollmentId: enrollmentResult.data.id,
      dueDate: dueDateString,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in refresher-scheduling function:", error);
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