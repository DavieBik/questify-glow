import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CreditCard, Users, Calendar } from 'lucide-react';

interface SubscriptionData {
  plan_name: string;
  max_users: number;
  price_aud_cents: number;
  billing_cycle: string;
  status: string;
  current_period_end?: string;
}

export const BillingSection: React.FC = () => {
  const { organization, isOrgAdmin } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const pricingPlans = [
    { 
      name: 'starter', 
      title: 'Starter', 
      price: 29, 
      users: 5,
      description: 'Perfect for small teams getting started'
    },
    { 
      name: 'professional', 
      title: 'Professional', 
      price: 49, 
      users: 25,
      description: 'Ideal for growing organizations',
      popular: true
    },
    { 
      name: 'enterprise', 
      title: 'Enterprise', 
      price: 99, 
      users: 50,
      description: 'For large teams with advanced needs'
    }
  ];

  useEffect(() => {
    if (organization) {
      fetchSubscription();
    }
  }, [organization]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organization?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string, billingCycle: string = 'monthly') => {
    if (!isOrgAdmin) {
      toast.error('Only organization administrators can manage billing');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan_name: planName, billing_cycle: billingCycle }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!isOrgAdmin) {
      toast.error('Only organization administrators can manage billing');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      // Open Stripe customer portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
            <CardDescription>Your current billing plan and usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium capitalize">{subscription.plan_name} Plan</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Up to {subscription.max_users} users
                  </span>
                  {subscription.current_period_end && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatPrice(subscription.price_aud_cents || 0)}
                </div>
                <div className="text-sm text-muted-foreground">per {subscription.billing_cycle}</div>
                <Badge className={getStatusColor(subscription.status)}>{subscription.status}</Badge>
              </div>
            </div>

            {isOrgAdmin && subscription.status === 'active' && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                  variant="outline"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Choose the plan that best fits your organization's needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const isCurrentPlan = subscription?.plan_name === plan.name;
              
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-lg border p-6 ${
                    plan.popular ? 'border-primary shadow-md' : 'border-border'
                  } ${isCurrentPlan ? 'bg-muted' : 'bg-card'}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">{plan.title}</h3>
                    <div className="text-3xl font-bold">
                      ${plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    
                    <div className="text-left space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        Up to {plan.users} users
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        Monthly billing
                      </div>
                    </div>

                    {isCurrentPlan ? (
                      <Badge variant="secondary" className="w-full py-2">Current Plan</Badge>
                    ) : (
                      <Button
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={!isOrgAdmin || actionLoading}
                        className="w-full"
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {!isOrgAdmin ? 'Admin Required' : 'Upgrade'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!isOrgAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              Only organization administrators can manage billing settings. Contact your admin to make changes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};