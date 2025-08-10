import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Users, CreditCard } from 'lucide-react';

interface DemoOrganization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  max_users: number;
  primary_color: string;
}

export const OrgSwitcher: React.FC = () => {
  const { user, organization, refreshOrganization } = useAuth();
  const [loading, setLoading] = useState(false);

  const demoOrganizations: DemoOrganization[] = [
    {
      id: 'acme-support',
      name: 'Acme Support',
      slug: 'acme-support',
      subscription_plan: 'professional',
      max_users: 25,
      primary_color: '#2563eb'
    },
    {
      id: 'diamondcare',
      name: 'DiamondCare',
      slug: 'diamondcare', 
      subscription_plan: 'enterprise',
      max_users: 50,
      primary_color: '#7c3aed'
    }
  ];

  const handleSwitchOrg = async (orgSlug: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the target organization
      const { data: targetOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;

      // Update user's organization_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ organization_id: targetOrg.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh the auth context to pick up the new organization
      await refreshOrganization();
      
      toast.success(`Switched to ${targetOrg.name}`);
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Failed to switch organization');
    } finally {
      setLoading(false);
    }
  };

  // Only show for demo/testing
  if (!user || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="border-dashed border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Building2 className="h-5 w-5" />
          Demo Mode - Organization Switcher
        </CardTitle>
        <CardDescription className="text-amber-700">
          Switch between demo organizations to test multi-tenant functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoOrganizations.map((org) => {
            const isCurrentOrg = organization?.slug === org.slug;
            
            return (
              <div
                key={org.id}
                className={`p-4 border rounded-lg ${
                  isCurrentOrg ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{org.name}</h4>
                    {isCurrentOrg && <Badge variant="secondary">Current</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {org.max_users} users
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      {org.subscription_plan}
                    </span>
                  </div>

                  {!isCurrentOrg && (
                    <Button
                      onClick={() => handleSwitchOrg(org.slug)}
                      disabled={loading}
                      size="sm"
                      className="w-full mt-2"
                    >
                      Switch to {org.name}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> This switcher is only visible in development mode for testing purposes.
            In production, users would be assigned to specific organizations during onboarding.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};