import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const accounts = [
      {
        email: 'daviebiks@gmail.com',
        password: 'Steely123!!@',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      },
      {
        email: 'info@rootsandorigin.com', 
        password: 'Steely123!!@',
        role: 'manager',
        first_name: 'Manager',
        last_name: 'User'
      }
    ]

    const results = []

    for (const account of accounts) {
      console.log(`Creating account for ${account.email}`)

      // Create the auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          first_name: account.first_name,
          last_name: account.last_name
        }
      })

      if (authError) {
        console.error(`Auth error for ${account.email}:`, authError)
        results.push({ email: account.email, error: authError.message })
        continue
      }

      console.log(`Auth user created for ${account.email}, ID: ${authUser.user.id}`)

      // Get the default org ID
      const { data: orgData } = await supabaseAdmin.rpc('get_default_org_id')
      
      // Create/update the user record in public.users
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authUser.user.id,
          email: account.email,
          first_name: account.first_name,
          last_name: account.last_name,
          role: account.role,
          organization_id: orgData,
          is_active: true
        })

      if (userError) {
        console.error(`User table error for ${account.email}:`, userError)
        results.push({ email: account.email, error: userError.message })
      } else {
        console.log(`User record created for ${account.email}`)
        results.push({ 
          email: account.email, 
          role: account.role,
          success: true,
          user_id: authUser.user.id
        })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error creating test accounts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})