import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CertificatePDFRequest {
  certificateNumber: string;
  userName: string;
  courseTitle: string;
  issueDate: string;
  expiryDate: string;
  finalScore: number;
  completionTime: number;
  qrCodeData: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      certificateNumber, 
      userName, 
      courseTitle, 
      issueDate, 
      expiryDate, 
      finalScore, 
      completionTime, 
      qrCodeData 
    }: CertificatePDFRequest = await req.json();

    console.log("Generating PDF certificate:", certificateNumber);

    // Generate HTML template for PDF
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { 
            size: A4 landscape; 
            margin: 20mm; 
          }
          body { 
            font-family: 'Georgia', serif; 
            margin: 0; 
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .certificate {
            border: 8px solid #2563eb;
            border-radius: 20px;
            padding: 40px;
            background: white;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%);
            z-index: -1;
          }
          .header {
            color: #1e40af;
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          }
          .subtitle {
            color: #64748b;
            font-size: 24px;
            margin-bottom: 40px;
            font-style: italic;
          }
          .name {
            color: #1e293b;
            font-size: 42px;
            font-weight: bold;
            margin: 30px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
            display: inline-block;
          }
          .course {
            color: #374151;
            font-size: 28px;
            margin: 30px 0;
            font-weight: 600;
          }
          .details {
            display: flex;
            justify-content: space-around;
            margin: 40px 0;
            font-size: 16px;
            color: #64748b;
          }
          .detail-item {
            text-align: center;
          }
          .detail-label {
            font-weight: bold;
            color: #374151;
            display: block;
            margin-bottom: 5px;
          }
          .cert-number {
            position: absolute;
            bottom: 20px;
            left: 20px;
            font-size: 12px;
            color: #9ca3af;
          }
          .qr-placeholder {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 80px;
            height: 80px;
            border: 2px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          .signature-line {
            margin-top: 60px;
            border-top: 2px solid #374151;
            width: 300px;
            margin-left: auto;
            margin-right: auto;
            padding-top: 10px;
            color: #64748b;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">CERTIFICATE</div>
          <div class="subtitle">of Completion</div>
          
          <div style="margin: 40px 0; color: #64748b; font-size: 20px;">
            This certifies that
          </div>
          
          <div class="name">${userName}</div>
          
          <div style="margin: 30px 0; color: #64748b; font-size: 20px;">
            has successfully completed the course
          </div>
          
          <div class="course">${courseTitle}</div>
          
          <div class="details">
            <div class="detail-item">
              <span class="detail-label">Score Achieved</span>
              ${finalScore}%
            </div>
            <div class="detail-item">
              <span class="detail-label">Completion Time</span>
              ${completionTime} minutes
            </div>
            <div class="detail-item">
              <span class="detail-label">Issue Date</span>
              ${new Date(issueDate).toLocaleDateString()}
            </div>
            <div class="detail-item">
              <span class="detail-label">Valid Until</span>
              ${new Date(expiryDate).toLocaleDateString()}
            </div>
          </div>
          
          <div class="signature-line">
            Training Administrator
          </div>
          
          <div class="cert-number">
            Certificate No: ${certificateNumber}
          </div>
          
          <div class="qr-placeholder">
            QR Code<br>
            Verification
          </div>
        </div>
      </body>
      </html>
    `;

    // In a real implementation, you would use a PDF generation service like:
    // - Puppeteer
    // - wkhtmltopdf
    // - jsPDF
    // - A third-party service like PDFShift, Bannerbear, etc.
    
    // For this demo, we'll simulate PDF generation and return a mock URL
    // You should replace this with actual PDF generation logic
    
    const mockPdfUrl = `https://example.com/certificates/${certificateNumber}.pdf`;
    
    // In a real implementation, you might:
    // 1. Generate the PDF using a service
    // 2. Upload it to Supabase Storage or another cloud storage
    // 3. Return the public URL
    
    console.log("PDF generation completed for:", certificateNumber);
    console.log("Mock PDF URL:", mockPdfUrl);

    return new Response(JSON.stringify({ 
      success: true,
      pdfUrl: mockPdfUrl,
      certificateNumber,
      htmlTemplate // Return template for debugging
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in generate-certificate-pdf function:", error);
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