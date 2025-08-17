import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { moduleId, position, duration, watchedPct } = await req.json()

    if (!moduleId || position === undefined || duration === undefined || watchedPct === undefined) {
      throw new Error('Missing required fields: moduleId, position, duration, watchedPct')
    }

    console.log(`Updating progress for user ${user.id}, module ${moduleId}: ${position}s/${duration}s (${Math.round(watchedPct * 100)}%)`)

    // Get module to check completion requirements
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('require_watch_pct')
      .eq('id', moduleId)
      .single()

    if (moduleError) {
      console.error('Error fetching module:', moduleError)
      throw new Error('Module not found')
    }

    const requireWatchPct = module.require_watch_pct || 0.9
    const isCompleted = watchedPct >= requireWatchPct

    // Upsert user module progress
    const { error: progressError } = await supabase
      .from('user_module_progress')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        last_position_seconds: position,
        watched_pct: watchedPct,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_id'
      })

    if (progressError) {
      console.error('Error updating progress:', progressError)
      throw new Error('Failed to update progress')
    }

    // If completed, also create/update completion record
    if (isCompleted) {
      console.log(`Module ${moduleId} completed by user ${user.id}`)
      
      // Check if completion already exists
      const { data: existingCompletion } = await supabase
        .from('completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .eq('status', 'completed')
        .maybeSingle()

      if (!existingCompletion) {
        // Get course_id for the module
        const { data: moduleData, error: moduleDataError } = await supabase
          .from('modules')
          .select('course_id')
          .eq('id', moduleId)
          .single()

        if (moduleDataError) {
          console.error('Error fetching module course:', moduleDataError)
        } else {
          // Create completion record
          const { error: completionError } = await supabase
            .from('completions')
            .insert({
              user_id: user.id,
              module_id: moduleId,
              course_id: moduleData.course_id,
              status: 'completed',
              score_percentage: 100,
              time_spent_minutes: Math.ceil(duration / 60),
              completed_at: new Date().toISOString()
            })

          if (completionError) {
            console.error('Error creating completion:', completionError)
          } else {
            console.log(`Completion record created for user ${user.id}, module ${moduleId}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed: isCompleted,
        watchedPct: Math.round(watchedPct * 100) / 100
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Video progress error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to update video progress'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})