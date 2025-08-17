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

    const { title, moduleId } = await req.json();

    if (!title || !moduleId) {
      return new Response(JSON.stringify({ error: 'Title and moduleId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let uploadUrl, assetId, playbackUrl;

    if (isMux) {
      // Mux implementation
      const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
      const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

      if (!muxTokenId || !muxTokenSecret) {
        return new Response(JSON.stringify({ error: 'Mux credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Mux asset
      const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
        },
        body: JSON.stringify({
          input: [{ url: `https://storage.googleapis.com/muxdemofiles/mux-video-intro.mp4` }],
          playback_policy: ['signed'],
          mp4_support: 'standard',
        }),
      });

      if (!muxResponse.ok) {
        const error = await muxResponse.text();
        console.error('Mux API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create Mux asset' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const muxData = await muxResponse.json();
      assetId = muxData.data.id;
      playbackUrl = `https://stream.mux.com/${muxData.data.playback_ids[0].id}.m3u8`;

      // Create direct upload for Mux
      const uploadResponse = await fetch('https://api.mux.com/video/v1/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
        },
        body: JSON.stringify({
          new_asset_settings: {
            playback_policy: ['signed'],
            mp4_support: 'standard',
          },
          cors_origin: '*',
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        console.error('Mux upload creation error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create Mux upload' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const uploadData = await uploadResponse.json();
      uploadUrl = uploadData.data.url;
      assetId = uploadData.data.id;

    } else if (isCloudflare) {
      // Cloudflare implementation
      const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
      const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');

      if (!cfAccountId || !cfApiToken) {
        return new Response(JSON.stringify({ error: 'Cloudflare credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Cloudflare Stream upload
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/direct_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600,
          requireSignedURLs: false,
        }),
      });

      if (!cfResponse.ok) {
        const error = await cfResponse.text();
        console.error('Cloudflare API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create Cloudflare upload' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cfData = await cfResponse.json();
      uploadUrl = cfData.result.uploadURL;
      assetId = cfData.result.uid;

    } else {
      return new Response(JSON.stringify({ error: `Unsupported VIDEO_PROVIDER: ${VIDEO_PROVIDER}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update module with provider asset ID
    const { error: updateError } = await supabase
      .from('modules')
      .update({ 
        provider_asset_id: assetId,
        provider: VIDEO_PROVIDER,
        status: 'uploading',
        content_url: playbackUrl || uploadUrl
      })
      .eq('id', moduleId);

    if (updateError) {
      console.error('Error updating module:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update module' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      uploadUrl,
      assetId,
      provider: VIDEO_PROVIDER
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video-create-upload:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});