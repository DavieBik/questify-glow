import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment-customizable email templates
const EMAIL_TEMPLATES = {
  due_soon: {
    subject: Deno.env.get('DUE_SOON_SUBJECT') || 'Course Due Soon: {course_title}',
    html: Deno.env.get('DUE_SOON_TEMPLATE') || `
      <h1>Course Due Soon</h1>
      <p>Hi {user_name},</p>
      <p>Your course <strong>{course_title}</strong> is due in {days_until_due} day(s).</p>
      <p><strong>Due Date:</strong> {due_date}</p>
      <p>Please complete your course to avoid any delays in your learning progress.</p>
      <p><a href="{course_url}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Continue Course</a></p>
      <br>
      <p>Best regards,<br>The SkillBridge Team</p>
    `
  },
  overdue: {
    subject: Deno.env.get('OVERDUE_SUBJECT') || 'Overdue Course: {course_title}',
    html: Deno.env.get('OVERDUE_TEMPLATE') || `
      <h1>Course Overdue</h1>
      <p>Hi {user_name},</p>
      <p>Your course <strong>{course_title}</strong> is now overdue.</p>
      <p><strong>Was Due:</strong> {due_date}</p>
      <p><strong>Days Overdue:</strong> {days_overdue} day(s)</p>
      <p>Please complete this course as soon as possible to stay on track with your learning goals.</p>
      <p><a href="{course_url}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Course Now</a></p>
      <br>
      <p>Best regards,<br>The SkillBridge Team</p>
    `
  }
};

interface NotificationRequest {
  type?: 'due_soon' | 'overdue' | 'all';
  days_ahead?: number;
  dry_run?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔔 Notifications service started');

  try {
    const { type = 'all', days_ahead = 3, dry_run = false }: NotificationRequest = 
      req.method === 'POST' ? await req.json() : {};

    console.log('📋 Parameters:', { type, days_ahead, dry_run });

    // Get users with due/overdue enrollments
    const { data: dueEnrollments, error: enrollmentError } = await supabase.rpc(
      'get_due_enrollments',
      { days_ahead }
    );

    if (enrollmentError) {
      throw new Error(`Failed to fetch due enrollments: ${enrollmentError.message}`);
    }

    console.log(`📊 Found ${dueEnrollments?.length || 0} due/overdue enrollments`);

    if (!dueEnrollments || dueEnrollments.length === 0) {
      await logToAudit('NOTIFICATION_RUN', 'notifications', {
        type,
        enrollments_found: 0,
        notifications_sent: 0,
        dry_run
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: 'No due or overdue enrollments found',
        processed: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const results = [];
    let sentCount = 0;
    let errorCount = 0;

    for (const enrollment of dueEnrollments) {
      const notificationType = enrollment.is_overdue ? 'overdue' : 'due_soon';
      
      // Skip if type filter doesn't match
      if (type !== 'all' && type !== notificationType) {
        continue;
      }

      try {
        // Check if notification was already sent recently (within 24 hours)
        const { data: recentNotification } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', enrollment.user_id)
          .eq('enrollment_id', enrollment.enrollment_id)
          .eq('notification_type', notificationType)
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentNotification && recentNotification.length > 0) {
          console.log(`⏭️ Skipping ${notificationType} notification for ${enrollment.user_email} - already sent recently`);
          continue;
        }

        const emailResult = await sendNotificationEmail(enrollment, notificationType, dry_run);
        
        if (!dry_run) {
          // Log notification
          await logNotification(enrollment, notificationType, emailResult.success, emailResult.error);
          
          if (emailResult.success) {
            sentCount++;
          } else {
            errorCount++;
          }
        }

        results.push({
          user_email: enrollment.user_email,
          course_title: enrollment.course_title,
          notification_type: notificationType,
          success: emailResult.success,
          error: emailResult.error,
          dry_run
        });

      } catch (error: any) {
        console.error(`❌ Error processing notification for ${enrollment.user_email}:`, error);
        errorCount++;
        
        if (!dry_run) {
          await logNotification(enrollment, notificationType, false, error.message);
        }

        results.push({
          user_email: enrollment.user_email,
          course_title: enrollment.course_title,
          notification_type: notificationType,
          success: false,
          error: error.message,
          dry_run
        });
      }
    }

    // Log audit entry
    await logToAudit('NOTIFICATION_RUN', 'notifications', {
      type,
      enrollments_found: dueEnrollments.length,
      notifications_sent: sentCount,
      errors: errorCount,
      dry_run,
      details: results
    });

    console.log(`✅ Notifications service completed. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} notifications`,
      sent: sentCount,
      errors: errorCount,
      dry_run,
      results: results.slice(0, 10) // Limit results in response
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error in notifications service:", error);
    
    await logToAudit('NOTIFICATION_ERROR', 'notifications', {
      error: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendNotificationEmail(enrollment: any, notificationType: string, dryRun: boolean) {
  const template = EMAIL_TEMPLATES[notificationType as keyof typeof EMAIL_TEMPLATES];
  const siteUrl = Deno.env.get('SITE_URL') || 'https://skillbridge.lovable.app';
  
  // Calculate days for display
  const days = Math.abs(enrollment.days_until_due);
  const daysDisplay = notificationType === 'overdue' ? days : enrollment.days_until_due;
  
  // Replace template variables
  const variables = {
    user_name: enrollment.user_name,
    course_title: enrollment.course_title,
    due_date: new Date(enrollment.due_at).toLocaleDateString(),
    days_until_due: enrollment.days_until_due,
    days_overdue: Math.abs(enrollment.days_until_due),
    course_url: `${siteUrl}/courses/${enrollment.course_id}`
  };

  let subject = template.subject;
  let html = template.html;

  // Replace all variables in subject and body
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    html = html.replace(new RegExp(placeholder, 'g'), String(value));
  });

  console.log(`📧 ${dryRun ? '[DRY RUN] ' : ''}Sending ${notificationType} notification to ${enrollment.user_email}`);

  if (dryRun) {
    return { success: true, dry_run: true };
  }

  try {
    const emailResponse = await resend.emails.send({
      from: Deno.env.get('FROM_EMAIL') || "SkillBridge <noreply@skillbridge.com>",
      to: [enrollment.user_email],
      subject: subject,
      html: html,
    });

    console.log(`✅ Email sent successfully to ${enrollment.user_email}`);
    return { success: true, email_id: emailResponse.data?.id };
    
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${enrollment.user_email}:`, error);
    return { success: false, error: error.message };
  }
}

async function logNotification(enrollment: any, notificationType: string, success: boolean, error?: string) {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        user_id: enrollment.user_id,
        enrollment_id: enrollment.enrollment_id,
        notification_type: notificationType,
        status: success ? 'sent' : 'failed',
        error_message: error,
        template_used: notificationType
      });
  } catch (logError: any) {
    console.error('Failed to log notification:', logError);
  }
}

async function logToAudit(action: string, resource: string, details: any) {
  try {
    await supabase
      .from('security_audit_log')
      .insert({
        action,
        resource,
        details,
        user_id: null, // System action
        ip_address: 'system',
        user_agent: 'notifications-service'
      });
  } catch (auditError: any) {
    console.error('Failed to log to audit:', auditError);
  }
}

serve(handler);