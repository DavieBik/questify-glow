import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This is a webhook endpoint that can be called by external cron services
// like GitHub Actions, Vercel Cron, or any other scheduler
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('⏰ Cron job triggered - starting notifications');

  try {
    // Get the webhook secret for security
    const webhookSecret = Deno.env.get('CRON_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');

    // Basic security check
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.log('❌ Unauthorized cron request');
      return new Response('Unauthorized', { status: 401 });
    }

    // Call the notifications service
    const notificationsUrl = new URL('/notifications-service', req.url);
    
    const response = await fetch(notificationsUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        type: 'all',
        days_ahead: 3,
        dry_run: false
      })
    });

    const result = await response.json();

    console.log('✅ Cron job completed:', result);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
      result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error in cron job:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);