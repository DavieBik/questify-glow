import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CertificatePDFRequest {
  certificateNumber: string;
  userName: string;
  courseTitle: string;
  completionDate: string;
  trainerSignature?: string;
  userId: string;
  courseId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      certificateNumber, 
      userName, 
      courseTitle, 
      completionDate,
      trainerSignature,
      userId,
      courseId
    }: CertificatePDFRequest = await req.json();

    console.log("Generating certificate PDF:", { certificateNumber, userName, courseTitle });

    // Fetch branding settings
    const { data: branding } = await supabase
      .from('org_branding')
      .select('logo_url, primary_color')
      .maybeSingle();

    const logoUrl = branding?.logo_url || '';
    const primaryColor = branding?.primary_color || '#059669';

    // Generate HTML certificate with branding
    const certificateHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    body {
      margin: 0;
      padding: 60px;
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .certificate {
      background: white;
      width: 100%;
      max-width: 800px;
      padding: 60px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border: 3px solid ${primaryColor};
      position: relative;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 20px; left: 20px; right: 20px; bottom: 20px;
      border: 1px solid #ddd;
    }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { max-height: 80px; max-width: 200px; }
    h1 {
      text-align: center;
      color: ${primaryColor};
      font-size: 48px;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .subtitle { text-align: center; font-size: 18px; color: #666; margin-bottom: 40px; }
    .recipient { text-align: center; margin: 30px 0; }
    .recipient-name {
      font-size: 36px;
      color: #333;
      font-weight: bold;
      margin: 10px 0;
      border-bottom: 2px solid ${primaryColor};
      display: inline-block;
      padding: 0 30px 10px;
    }
    .course-title {
      text-align: center;
      font-size: 24px;
      color: #444;
      margin: 30px 0;
      font-style: italic;
    }
    .details {
      display: flex;
      justify-content: space-around;
      margin: 40px 0;
      padding: 20px 0;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
    }
    .detail-item { text-align: center; }
    .detail-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .detail-value { font-size: 16px; color: #333; font-weight: bold; }
    .signature {
      margin-top: 50px;
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      width: 300px;
      margin: 0 auto 10px;
    }
    .signature-text { font-size: 14px; color: #666; }
    .certificate-number {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo"></div>` : ''}
    
    <h1>Certificate of Completion</h1>
    <div class="subtitle">This is to certify that</div>
    
    <div class="recipient">
      <div class="recipient-name">${userName}</div>
    </div>
    
    <div class="subtitle">has successfully completed the course</div>
    
    <div class="course-title">${courseTitle}</div>
    
    <div class="details">
      <div class="detail-item">
        <div class="detail-label">Completion Date</div>
        <div class="detail-value">${new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Certificate Number</div>
        <div class="detail-value">${certificateNumber}</div>
      </div>
    </div>
    
    ${trainerSignature ? `
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-text">${trainerSignature}</div>
    </div>
    ` : ''}
    
    <div class="certificate-number">Certificate ID: ${certificateNumber}</div>
  </div>
</body>
</html>`;

    // Store HTML (in production, use PDF conversion service)
    const storagePath = `${userId}/${courseId}/${certificateNumber}.html`;
    
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(storagePath, new Blob([certificateHTML], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload certificate: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(storagePath);

    console.log("Certificate saved to storage:", storagePath);

    return new Response(
      JSON.stringify({ 
        success: true,
        storagePath,
        pdfUrl: urlData.publicUrl,
        html: certificateHTML 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Error in generate-certificate-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
};

serve(handler);