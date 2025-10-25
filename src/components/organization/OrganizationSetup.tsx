import React, { useState } from 'react';
import { Building2, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OrganizationSetupProps {
  onComplete?: () => void;
}

const planOptions = [
  { value: 'trial', label: 'Trial (10 users)', maxUsers: 10 },
  { value: 'starter', label: 'Starter (25 users)', maxUsers: 25 },
  { value: 'professional', label: 'Professional (100 users)', maxUsers: 100 },
  { value: 'enterprise', label: 'Enterprise (Unlimited)', maxUsers: 999 },
];

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('join'); // Default to join
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'trial',
    contactEmail: '',
    inviteCode: '',
  });
  const { user, refreshOrganization } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const validateStep1 = () => {
    if (mode === 'join') {
      return formData.inviteCode.trim() || formData.slug.trim();
    }
    return formData.name.trim() && formData.slug.trim();
  };

  const validateStep2 = () => {
    if (mode === 'join') return true; // No step 2 for join mode
    return formData.plan && formData.contactEmail.includes('@');
  };

  const handleJoinOrganization = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Try to find organization by slug or invite code
      const searchValue = formData.inviteCode || formData.slug;
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .or(`slug.eq.${searchValue},contact_email.eq.${searchValue}`)
        .maybeSingle();

      if (orgError || !orgData) {
        toast.error('Organization not found. Please check your organization code or slug.');
        setLoading(false);
        return;
      }

      // Add user to the organization
      const { error: memberError } = await supabase
        .from('org_members')
        .upsert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'worker', // Default role for joining users
        }, {
          onConflict: 'organization_id,user_id'
        });

      if (memberError) throw memberError;

      // Update user's organization_id
      const { error: userUpdateError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          organization_id: orgData.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: 'worker',
          is_active: true,
          password_hash: 'placeholder_hash'
        }, {
          onConflict: 'id'
        });

      if (userUpdateError) throw userUpdateError;

      await refreshOrganization();
      toast.success(`Successfully joined ${orgData.name}!`);
      onComplete?.();

    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error(error.message || 'Failed to join organization');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if slug already exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', formData.slug)
        .maybeSingle();

      if (existingOrg) {
        toast.error('This subdomain is already taken. Please choose a different one.');
        setLoading(false);
        return;
      }

      // Create organization - this will be secured by RLS policies
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          subscription_plan: formData.plan,
          max_users: planOptions.find(p => p.value === formData.plan)?.maxUsers || 10,
          contact_email: formData.contactEmail,
          is_active: true,
        })
        .select()
        .single();

      if (orgError) {
        if (orgError.code === '23505' && orgError.message.includes('organizations_slug_key')) {
          toast.error('This subdomain is already taken. Please choose a different one.');
          return;
        }
        throw orgError;
      }

      // Add user as admin in org_members (use upsert to handle duplicates)
      const { error: memberError } = await supabase
        .from('org_members')
        .upsert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'admin',
        }, {
          onConflict: 'organization_id,user_id'
        });

      if (memberError) throw memberError;

      await refreshOrganization();
      toast.success('Organization created successfully!');
      onComplete?.();

    } catch (error: any) {
      console.error('Error creating organization:', error);
      if (error.code === '23505' && error.message.includes('organizations_slug_key')) {
        toast.error('This subdomain is already taken. Please choose a different one.');
      } else {
        toast.error(error.message || 'Failed to create organization');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (mode === 'join') {
      if (validateStep1()) {
        handleJoinOrganization();
      }
    } else if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleCreateOrganization();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">Set Up Your Organization</CardTitle>
            <CardDescription className="text-base">
              Configure your organization to start managing courses and teams
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Mode Toggle */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex">
                <button
                  type="button"
                  onClick={() => setMode('join')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'join' 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Join Organization
                </button>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === 'create' 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Create New
                </button>
              </div>
            </div>

            {/* Progress indicator - only show for create mode */}
            {mode === 'create' && (
              <div className="flex items-center justify-center mb-8">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600'
                }`}>
                  1
                </div>
                <div className={`w-12 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600'
                }`}>
                  2
                </div>
              </div>
            )}

            {mode === 'join' && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="inviteCode" className="text-base font-medium">
                    Organization Code or Slug
                  </Label>
                  <Input
                    id="inviteCode"
                    placeholder="roots-2025 or organization email"
                    value={formData.inviteCode}
                    onChange={(e) => handleInputChange('inviteCode', e.target.value)}
                    className="mt-2 text-base"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the organization slug or contact email provided by your administrator
                  </p>
                </div>
              </div>
            )}

            {mode === 'create' && step === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">
                    Organization Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Acme Disability Services"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-2 text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="slug" className="text-base font-medium">
                    Subdomain
                  </Label>
                  <div className="mt-2 flex items-center">
                    <Input
                      id="slug"
                      placeholder="acme-disability"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      className="text-base"
                    />
                    <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">
                      .skillbridge.com.au
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your organization will be accessible at: <strong>{formData.slug || 'your-org'}.skillbridge.com.au</strong>
                  </p>
                </div>
              </div>
            )}

            {mode === 'create' && step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="plan" className="text-base font-medium">
                    Subscription Plan
                  </Label>
                  <Select value={formData.plan} onValueChange={(value) => handleInputChange('plan', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-base font-medium">
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="admin@acme.org.au"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="mt-2 text-base"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h4 className="font-medium">Plan Summary</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {planOptions.find(p => p.value === formData.plan)?.label} - 
                    Start managing your team with professional learning tools.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {mode === 'create' && step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              <Button
                onClick={nextStep}
                disabled={
                  loading || 
                  (mode === 'join' && !validateStep1()) ||
                  (mode === 'create' && step === 1 && !validateStep1()) || 
                  (mode === 'create' && step === 2 && !validateStep2())
                }
                className={`ml-auto ${(mode === 'join' || step === 1) ? 'w-full' : ''}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (mode === 'join' || step === 2) ? null : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {loading ? 
                  (mode === 'join' ? 'Joining...' : 'Creating...') : 
                  mode === 'join' ? 'Join Organization' :
                  step === 2 ? 'Create Organization' : 'Continue'
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}