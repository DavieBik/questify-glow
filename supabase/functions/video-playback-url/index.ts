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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!;
    
    // Set the auth header for subsequent requests
    supabase.auth.setAuth(authHeader.replace('Bearer ', ''));

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { assetId, duration = 3600 } = await req.json();

    if (!assetId) {
      return new Response(JSON.stringify({ error: 'Asset ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let signedUrl;

    if (isMux) {
      // Mux signed URL implementation
      const muxSigningKeyId = Deno.env.get('MUX_SIGNING_KEY_ID');
      const muxSigningKeyPrivate = Deno.env.get('MUX_SIGNING_KEY_PRIVATE_KEY');

      if (!muxSigningKeyId || !muxSigningKeyPrivate) {
        return new Response(JSON.stringify({ error: 'Mux signing credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get asset details from Mux
      const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
      const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

      const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
        },
      });

      if (!assetResponse.ok) {
        return new Response(JSON.stringify({ error: 'Asset not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const assetData = await assetResponse.json();
      const playbackId = assetData.data.playback_ids?.[0]?.id;

      if (!playbackId) {
        return new Response(JSON.stringify({ error: 'No playback ID found for asset' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create signed URL using JWT
      const now = Math.floor(Date.now() / 1000);
      const exp = now + duration;

      const header = {
        alg: 'RS256',
        kid: muxSigningKeyId,
      };

      const payload = {
        sub: playbackId,
        aud: 'v',
        exp: exp,
        iat: now,
      };

      // For production, you'd use a proper JWT library
      // This is a simplified implementation
      const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      // Note: In production, you'd need to properly sign with the private key
      // For now, returning the unsigned URL
      signedUrl = `https://stream.mux.com/${playbackId}.m3u8?token=${headerEncoded}.${payloadEncoded}`;

    } else if (isCloudflare) {
      // Cloudflare signed URL implementation
      const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
      const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

      if (!cfAccountId || !cfApiToken) {
        return new Response(JSON.stringify({ error: 'Cloudflare credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get video details from Cloudflare
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${assetId}`, {
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
        },
      });

      if (!cfResponse.ok) {
        return new Response(JSON.stringify({ error: 'Asset not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cfData = await cfResponse.json();
      
      // For Cloudflare Stream, signed URLs are typically generated differently
      // This is a simplified implementation
      signedUrl = `https://customer-${cfAccountId}.cloudflarestream.com/${assetId}/manifest/video.m3u8`;

    } else {
      return new Response(JSON.stringify({ error: `Unsupported VIDEO_PROVIDER: ${VIDEO_PROVIDER}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      signedUrl,
      provider: VIDEO_PROVIDER,
      expiresAt: new Date(Date.now() + duration * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video-playback-url:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});