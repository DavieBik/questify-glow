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

interface CertificateIssuanceRequest {
  completionId: string;
  userId: string;
  courseId: string;
  finalScore: number;
  completionTime: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { completionId, userId, courseId, finalScore, completionTime }: CertificateIssuanceRequest = await req.json();

    console.log("Processing certificate issuance for completion:", completionId);

    // Get user and course details
    const [userResult, courseResult] = await Promise.all([
      supabase.from("users").select("first_name, last_name, email").eq("id", userId).single(),
      supabase.from("courses").select("title, description").eq("id", courseId).single()
    ]);

    if (userResult.error || courseResult.error) {
      throw new Error("Failed to fetch user or course details");
    }

    const user = userResult.data;
    const course = courseResult.data;

    // Generate certificate number
    const certificateNumber = `CERT-${new Date().getFullYear()}-${Date.now()}`;
    
    // Calculate dates
    const issueDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from now

    // Generate QR code data (verification URL)
    const qrCodeData = `${Deno.env.get("SUPABASE_URL")}/certificate/verify/${certificateNumber}`;

    // Call PDF generator function
    const pdfResponse = await supabase.functions.invoke('generate-certificate-pdf', {
      body: {
        certificateNumber,
        userName: `${user.first_name} ${user.last_name}`,
        courseTitle: course.title,
        issueDate,
        expiryDate,
        finalScore,
        completionTime,
        qrCodeData
      }
    });

    if (pdfResponse.error) {
      console.error("PDF generation failed:", pdfResponse.error);
      throw new Error("Failed to generate certificate PDF");
    }

    const pdfUrl = pdfResponse.data?.pdfUrl;

    // Insert certificate record
    const { data: certificate, error: certError } = await supabase
      .from("certificates")
      .insert({
        user_id: userId,
        course_id: courseId,
        certificate_number: certificateNumber,
        issue_date: issueDate,
        expiry_date: expiryDate,
        final_score_percentage: finalScore,
        completion_time_minutes: completionTime,
        pdf_url: pdfUrl,
        verification_url: qrCodeData,
        qr_code_data: qrCodeData,
        is_valid: true
      })
      .select()
      .single();

    if (certError) {
      console.error("Certificate insertion failed:", certError);
      throw new Error("Failed to create certificate record");
    }

    // Send email with certificate
    const emailResponse = await resend.emails.send({
      from: "Training System <certificates@resend.dev>",
      to: [user.email],
      subject: `🎉 Certificate of Completion - ${course.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; text-align: center;">🎉 Congratulations!</h1>
          
          <p>Dear ${user.first_name} ${user.last_name},</p>
          
          <p>We're pleased to inform you that you have successfully completed the course:</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h2 style="margin: 0; color: #1e40af;">${course.title}</h2>
            <p style="margin: 10px 0 0 0; color: #64748b;">Final Score: ${finalScore}%</p>
          </div>
          
          <p>Your certificate details:</p>
          <ul>
            <li><strong>Certificate Number:</strong> ${certificateNumber}</li>
            <li><strong>Issue Date:</strong> ${new Date(issueDate).toLocaleDateString()}</li>
            <li><strong>Valid Until:</strong> ${new Date(expiryDate).toLocaleDateString()}</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${pdfUrl}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
              📄 Download Certificate
            </a>
            <a href="${qrCodeData}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              🔍 Verify Certificate
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Keep this certificate safe as proof of your successful completion.
          </p>
        </div>
      `,
    });

    console.log("Certificate issuance completed successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      certificateId: certificate.id,
      certificateNumber,
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in certificate-issuance function:", error);
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