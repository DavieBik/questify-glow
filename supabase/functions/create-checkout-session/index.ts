import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan_name, billing_cycle = 'monthly' } = await req.json();
    if (!plan_name) throw new Error("Plan name is required");
    logStep("Request data parsed", { plan_name, billing_cycle });

    // Get user's organization
    const { data: orgUser } = await supabaseClient
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (!orgUser?.organization_id) throw new Error("User must belong to an organization");
    logStep("Organization found", { orgId: orgUser.organization_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id, organization_id: orgUser.organization_id }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Australian pricing tiers (in cents)
    const pricingTiers = {
      'starter': { price: 2900, users: 5, name: 'Starter Plan' },      // $29 AUD
      'professional': { price: 4900, users: 25, name: 'Professional Plan' }, // $49 AUD  
      'enterprise': { price: 9900, users: 50, name: 'Enterprise Plan' }      // $99 AUD
    };

    const planConfig = pricingTiers[plan_name as keyof typeof pricingTiers];
    if (!planConfig) throw new Error(`Invalid plan: ${plan_name}`);
    logStep("Plan configuration", planConfig);

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: planConfig.name,
              description: `Up to ${planConfig.users} users`,
            },
            unit_amount: planConfig.price,
            recurring: { interval: billing_cycle === 'yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/organization/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/organization/settings`,
      metadata: {
        organization_id: orgUser.organization_id,
        plan_name,
        billing_cycle,
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout-session", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});