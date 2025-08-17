import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Video provider configuration
const VIDEO_PROVIDER = (Deno.env.get('VIDEO_PROVIDER') || 'mux').toLowerCase();
const isMux = VIDEO_PROVIDER === 'mux';
const isCloudflare = VIDEO_PROVIDER === 'cloudflare';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.text();
    let webhookData;

    if (isMux) {
      // Mux webhook verification and processing
      const muxWebhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET');
      
      if (!muxWebhookSecret) {
        return new Response(JSON.stringify({ error: 'Mux webhook secret not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify Mux webhook signature
      const signature = req.headers.get('mux-signature');
      if (!signature) {
        console.error('Missing Mux signature');
        return new Response('Unauthorized', { status: 401 });
      }

      // Parse webhook data
      webhookData = JSON.parse(body);
      console.log('Mux webhook received:', webhookData.type);

      // Handle different Mux event types
      if (webhookData.type === 'video.asset.ready') {
        const assetId = webhookData.data.id;
        const playbackIds = webhookData.data.playback_ids;
        
        if (playbackIds && playbackIds.length > 0) {
          const playbackUrl = `https://stream.mux.com/${playbackIds[0].id}.m3u8`;
          
          // Update module status and playback URL
          const { error } = await supabase
            .from('modules')
            .update({ 
              status: 'ready',
              content_url: playbackUrl,
              duration_seconds: webhookData.data.duration || null
            })
            .eq('provider_asset_id', assetId);

          if (error) {
            console.error('Error updating module:', error);
          } else {
            console.log(`Updated module for Mux asset ${assetId}`);
          }
        }
      } else if (webhookData.type === 'video.asset.errored') {
        const assetId = webhookData.data.id;
        
        // Update module status to error
        const { error } = await supabase
          .from('modules')
          .update({ status: 'error' })
          .eq('provider_asset_id', assetId);

        if (error) {
          console.error('Error updating module status:', error);
        } else {
          console.log(`Marked module as errored for Mux asset ${assetId}`);
        }
      }

    } else if (isCloudflare) {
      // Cloudflare webhook processing
      const cfWebhookSecret = Deno.env.get('CLOUDFLARE_WEBHOOK_SECRET');
      
      if (!cfWebhookSecret) {
        return new Response(JSON.stringify({ error: 'Cloudflare webhook secret not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse webhook data
      webhookData = JSON.parse(body);
      console.log('Cloudflare webhook received:', webhookData);

      // Handle Cloudflare Stream events
      if (webhookData.outcome === 'success') {
        const assetId = webhookData.uid;
        const playbackUrl = `https://customer-${Deno.env.get('CLOUDFLARE_ACCOUNT_ID')}.cloudflarestream.com/${assetId}/manifest/video.m3u8`;
        
        // Update module status and playback URL
        const { error } = await supabase
          .from('modules')
          .update({ 
            status: 'ready',
            content_url: playbackUrl,
            duration_seconds: webhookData.duration || null
          })
          .eq('provider_asset_id', assetId);

        if (error) {
          console.error('Error updating module:', error);
        } else {
          console.log(`Updated module for Cloudflare asset ${assetId}`);
        }
      } else if (webhookData.outcome === 'error') {
        const assetId = webhookData.uid;
        
        // Update module status to error
        const { error } = await supabase
          .from('modules')
          .update({ status: 'error' })
          .eq('provider_asset_id', assetId);

        if (error) {
          console.error('Error updating module status:', error);
        } else {
          console.log(`Marked module as errored for Cloudflare asset ${assetId}`);
        }
      }

    } else {
      return new Response(JSON.stringify({ error: `Unsupported VIDEO_PROVIDER: ${VIDEO_PROVIDER}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});