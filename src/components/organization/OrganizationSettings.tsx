import React, { useState } from 'react';
import { Building2, Users, Settings, CreditCard, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BillingSection } from '@/components/billing/BillingSection';

export function OrganizationSettings() {
  const { organization, isOrgAdmin, refreshOrganization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    contact_email: organization?.contact_email || '',
    primary_color: organization?.primary_color || '#059669',
  });

  const handleSaveSettings = async () => {
    if (!organization || !isOrgAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          contact_email: formData.contact_email,
          primary_color: formData.primary_color,
        })
        .eq('id', organization.id);

      if (error) throw error;

      await refreshOrganization();
      toast.success('Settings updated successfully');
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No organization found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isOrgAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Subdomain</Label>
                  <div className="flex items-center">
                    <Input
                      id="slug"
                      value={organization.slug}
                      disabled
                      className="bg-muted"
                    />
                    <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">
                      .skillbridge.com.au
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  disabled={!isOrgAdmin}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Subscription Plan</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {organization.subscription_plan}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Max Users</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {organization.max_users} users
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge variant={organization.is_active ? "default" : "destructive"}>
                      {organization.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              {isOrgAdmin && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSettings} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your organization members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Member management coming soon</p>
                <p className="text-sm text-muted-foreground">
                  You'll be able to invite and manage team members here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Brand Customization
              </CardTitle>
              <CardDescription>
                Customize your organization's visual identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-20 h-10"
                    disabled={!isOrgAdmin}
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                    placeholder="#059669"
                    disabled={!isOrgAdmin}
                  />
                </div>
              </div>

              <div>
                <Label>Logo Upload</Label>
                <div className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Logo upload coming soon</p>
                </div>
              </div>

              {isOrgAdmin && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSettings} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Branding'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <BillingSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}