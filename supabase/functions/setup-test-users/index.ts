import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating test users...');

    // Test users to create
    const testUsers = [
      {
        email: 'admin@skillbridge.com',
        password: 'admin123',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      },
      {
        email: 'manager@skillbridge.com', 
        password: 'manager123',
        role: 'manager',
        first_name: 'Manager',
        last_name: 'User'
      },
      {
        email: 'staff@skillbridge.com',
        password: 'staff123', 
        role: 'staff',
        first_name: 'Staff',
        last_name: 'User'
      }
    ];

    const results = [];

    for (const user of testUsers) {
      console.log(`Creating user: ${user.email}`);
      
      // Create user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name
        }
      });

      if (authError) {
        console.log(`Auth error for ${user.email}:`, authError);
        if (authError.message.includes('already registered')) {
          results.push({ email: user.email, status: 'already_exists' });
          continue;
        } else {
          results.push({ email: user.email, status: 'error', error: authError.message });
          continue;
        }
      }

      console.log(`Auth user created for ${user.email}, ID: ${authData.user?.id}`);

      // Get default org ID
      const { data: orgData } = await supabaseAdmin
        .from('app_settings')
        .select('default_org_id')
        .single();

      const defaultOrgId = orgData?.default_org_id;

      // Create or update user in public.users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          organization_id: defaultOrgId,
          is_active: true
        });

      if (userError) {
        console.log(`User table error for ${user.email}:`, userError);
        results.push({ email: user.email, status: 'auth_created_user_table_error', error: userError.message });
      } else {
        console.log(`User table record created for ${user.email}`);
        results.push({ email: user.email, status: 'created', role: user.role });
      }
    }

    // Also update existing user to admin
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'daviebik@gmail.com');

    if (updateError) {
      console.log('Error updating existing user:', updateError);
    } else {
      results.push({ email: 'daviebik@gmail.com', status: 'updated_to_admin' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test users setup completed',
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});