import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing expiry reminders check...");

    const today = new Date();
    const reminders = [
      { days: 30, urgency: "early", color: "#2563eb", emoji: "📅" },
      { days: 14, urgency: "medium", color: "#f59e0b", emoji: "⚠️" },
      { days: 7, urgency: "urgent", color: "#dc2626", emoji: "🚨" }
    ];

    const results = [];

    for (const reminder of reminders) {
      const expiryDate = new Date(today);
      expiryDate.setDate(today.getDate() + reminder.days);
      const expiryDateString = expiryDate.toISOString().split('T')[0];

      console.log(`Checking for certificates expiring on ${expiryDateString} (${reminder.days} days out)`);

      // Get certificates expiring on this specific date
      const { data: certificates, error } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          expiry_date,
          final_score_percentage,
          user_id,
          users!inner(first_name, last_name, email),
          courses!inner(title, description)
        `)
        .eq("expiry_date", expiryDateString)
        .eq("is_valid", true);

      if (error) {
        console.error(`Error fetching certificates for ${reminder.days} day reminder:`, error);
        continue;
      }

      console.log(`Found ${certificates?.length || 0} certificates expiring in ${reminder.days} days`);

      if (!certificates || certificates.length === 0) {
        continue;
      }

      // Send reminder emails
      for (const cert of certificates) {
        try {
          const user = cert.users;
          const course = cert.courses;

          const emailResponse = await resend.emails.send({
            from: "Training System <reminders@resend.dev>",
            to: [user.email],
            subject: `${reminder.emoji} Certificate Expiry Reminder - ${course.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: ${reminder.color}; text-align: center;">
                  ${reminder.emoji} Certificate Expiry Reminder
                </h1>
                
                <p>Dear ${user.first_name} ${user.last_name},</p>
                
                <p>This is a ${reminder.urgency} reminder that your certificate is expiring soon:</p>
                
                <div style="background: ${reminder.urgency === 'urgent' ? '#fef2f2' : reminder.urgency === 'medium' ? '#fefbf2' : '#f0f9ff'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${reminder.color};">
                  <h2 style="margin: 0; color: ${reminder.color};">${course.title}</h2>
                  <p style="margin: 10px 0 0 0; color: #64748b;">Certificate #${cert.certificate_number}</p>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1e293b;">📋 Certificate Details:</h3>
                  <ul style="margin: 0; color: #475569;">
                    <li><strong>Expiry Date:</strong> ${new Date(cert.expiry_date).toLocaleDateString()}</li>
                    <li><strong>Days Remaining:</strong> ${reminder.days} days</li>
                    <li><strong>Original Score:</strong> ${cert.final_score_percentage}%</li>
                  </ul>
                </div>
                
                ${reminder.urgency === 'urgent' ? 
                  '<div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0;"><p style="margin: 0; color: #991b1b;"><strong>🚨 URGENT:</strong> Your certificate expires in just 7 days! Immediate action required.</p></div>' : 
                  reminder.urgency === 'medium' ?
                  '<div style="background: #fefbf2; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;"><p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Your certificate expires in 2 weeks. Please plan your renewal.</p></div>' :
                  '<div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;"><p style="margin: 0; color: #1e40af;"><strong>📅 Advance Notice:</strong> Your certificate expires in 30 days. You have time to plan your renewal.</p></div>'
                }
                
                <h3 style="color: #1e293b;">🔄 Renewal Options:</h3>
                <ol>
                  <li><strong>Retake the Course:</strong> Complete the full training program again</li>
                  <li><strong>Refresher Assessment:</strong> Take a condensed review and test</li>
                  <li><strong>Continuing Education:</strong> Complete approved CE credits (if applicable)</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${new URL(req.url).origin}/courses/${cert.courses.id}" 
                     style="background: ${reminder.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                    📚 Renew Certificate
                  </a>
                  <a href="${new URL(req.url).origin}/certificates" 
                     style="background: #64748b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    📄 View All Certificates
                  </a>
                </div>
                
                <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; color: #475569; font-size: 14px;">
                    <strong>💡 Tip:</strong> Don't wait until the last minute! Starting your renewal process early ensures you maintain continuous certification without any gaps.
                  </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                  Questions about renewal? Contact your training administrator or visit our support center.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                  Training Management System - Automated Reminder Service
                </p>
              </div>
            `,
          });

          console.log(`Reminder email sent for certificate ${cert.certificate_number}:`, emailResponse.data?.id);

          results.push({
            certificateNumber: cert.certificate_number,
            userName: `${user.first_name} ${user.last_name}`,
            courseTitle: course.title,
            expiryDate: cert.expiry_date,
            daysToExpiry: reminder.days,
            urgency: reminder.urgency,
            emailId: emailResponse.data?.id
          });

        } catch (emailError) {
          console.error(`Failed to send reminder for certificate ${cert.certificate_number}:`, emailError);
          results.push({
            certificateNumber: cert.certificate_number,
            error: emailError.message
          });
        }
      }
    }

    console.log(`Expiry reminders process completed. Processed ${results.length} certificates.`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in expiry-reminders function:", error);
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