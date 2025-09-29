import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("FROM_EMAIL") || "noreply@example.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OverdueEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  due_at: string;
  user_email: string;
  user_name: string;
  course_title: string;
  enrollment_date: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting overdue notifications cron job");

    // Find overdue enrollments that are not completed and haven't been notified recently
    const { data: overdueEnrollments, error: overdueError } = await supabase
      .from('user_course_enrollments')
      .select(`
        id,
        user_id,
        course_id,
        due_at,
        enrollment_date,
        users!inner(email, first_name, last_name),
        courses!inner(title)
      `)
      .lt('due_at', new Date().toISOString())
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'denied');

    if (overdueError) {
      console.error('Error fetching overdue enrollments:', overdueError);
      throw overdueError;
    }

    console.log(`Found ${overdueEnrollments?.length || 0} overdue enrollments`);

    if (!overdueEnrollments || overdueEnrollments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue enrollments found", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const processedNotifications = [];

    for (const enrollment of overdueEnrollments) {
      const user = enrollment.users as any;
      const course = enrollment.courses as any;
      
      // Check if we already sent a notification for this enrollment in the last 24 hours
      const { data: recentNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', enrollment.user_id)
        .eq('type', 'overdue_enrollment')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .contains('metadata', { enrollment_id: enrollment.id });

      if (recentNotifications && recentNotifications.length > 0) {
        console.log(`Skipping notification for enrollment ${enrollment.id} - already notified recently`);
        continue;
      }

      const userName = user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.email;

      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(enrollment.due_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create notification
      const { data: notification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: enrollment.user_id,
          type: 'overdue_enrollment',
          title: 'Course Overdue',
          body: `Your course "${course.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Please complete it as soon as possible.`,
          metadata: {
            enrollment_id: enrollment.id,
            course_id: enrollment.course_id,
            days_overdue: daysOverdue,
            due_at: enrollment.due_at,
            email_sent: false
          }
        })
        .select()
        .single();

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        continue;
      }

      console.log(`Created notification for user ${userName}`);

      // Send email notification
      try {
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [user.email],
          subject: `Course Overdue: ${course.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Course Overdue Reminder</h2>
              <p>Hello ${userName},</p>
              <p>This is a reminder that your course <strong>"${course.title}"</strong> is now <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.</p>
              <p><strong>Original due date:</strong> ${new Date(enrollment.due_at).toLocaleDateString()}</p>
              <p>Please log in to your learning platform and complete this course as soon as possible to stay on track with your training requirements.</p>
              <div style="margin: 20px 0;">
                <a href="${supabaseUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Access Course
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                If you have any questions, please contact your administrator.
              </p>
            </div>
          `,
        });

        console.log(`Email sent successfully to ${user.email}:`, emailResult);

        // Update notification metadata to mark email as sent
        await supabase
          .from('notifications')
          .update({
            metadata: {
              ...notification.metadata,
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              email_id: emailResult.data?.id
            }
          })
          .eq('id', notification.id);

        processedNotifications.push({
          user_id: enrollment.user_id,
          user_email: user.email,
          course_title: course.title,
          days_overdue: daysOverdue,
          notification_created: true,
          email_sent: true
        });

      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
        
        // Update notification metadata to mark email as failed
        await supabase
          .from('notifications')
          .update({
            metadata: {
              ...notification.metadata,
              email_sent: false,
              email_error: emailError.message,
              email_attempted_at: new Date().toISOString()
            }
          })
          .eq('id', notification.id);

        processedNotifications.push({
          user_id: enrollment.user_id,
          user_email: user.email,
          course_title: course.title,
          days_overdue: daysOverdue,
          notification_created: true,
          email_sent: false,
          email_error: emailError.message
        });
      }
    }

    console.log(`Processed ${processedNotifications.length} notifications`);

    return new Response(
      JSON.stringify({
        message: "Overdue notifications processed successfully",
        processed: processedNotifications.length,
        total_overdue: overdueEnrollments.length,
        details: processedNotifications
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error in notifications cron:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);