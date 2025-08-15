import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔄 Starting scheduled analytics refresh...');

    // List of materialized views to refresh
    const views = [
      'mv_user_course_progress',
      'mv_course_metrics', 
      'mv_retention_metrics',
      'mv_user_progress_analytics',
      'mv_course_performance_analytics',
      'mv_module_analytics'
    ];

    const results = [];

    // Refresh each materialized view
    for (const view of views) {
      try {
        console.log(`📊 Refreshing ${view}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: `REFRESH MATERIALIZED VIEW CONCURRENTLY public.${view};`
        });

        if (error) {
          console.error(`❌ Error refreshing ${view}:`, error);
          results.push({ view, status: 'error', error: error.message });
        } else {
          console.log(`✅ Successfully refreshed ${view}`);
          results.push({ view, status: 'success' });
        }
      } catch (err) {
        console.error(`❌ Exception refreshing ${view}:`, err);
        results.push({ view, status: 'error', error: err.message });
      }
    }

    // Log the refresh operation
    try {
      await supabase.from('security_audit_log').insert({
        action: 'ANALYTICS_REFRESH',
        resource: 'materialized_views',
        details: {
          refreshed_at: new Date().toISOString(),
          method: 'scheduled',
          results: results
        },
        user_id: null, // System operation
        ip_address: 'edge-function',
        user_agent: 'analytics-refresh-scheduler'
      });
    } catch (logError) {
      console.error('Failed to log refresh operation:', logError);
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`🎯 Refresh completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analytics refresh completed: ${successCount} successful, ${errorCount} failed`,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Analytics refresh failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});