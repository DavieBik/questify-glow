import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Palette, Image, Link as LinkIcon, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function BrandingSettings() {
  const { isAdmin } = useAuth();
  const { branding, updateBranding, loading } = useBranding();
  const [formData, setFormData] = useState({
    logo_url: branding?.logo_url || '',
    primary_color: branding?.primary_color || '#059669',
    banner_image_url: branding?.banner_image_url || '',
    external_link_title: branding?.external_link_title || '',
    external_link_url: branding?.external_link_url || '',
  });
  const [saving, setSaving] = useState(false);

  // Update form data when branding changes
  React.useEffect(() => {
    if (branding) {
      setFormData({
        logo_url: branding.logo_url || '',
        primary_color: branding.primary_color || '#059669',
        banner_image_url: branding.banner_image_url || '',
        external_link_title: branding.external_link_title || '',
        external_link_url: branding.external_link_url || '',
      });
    }
  }, [branding]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranding(formData);
      toast({
        title: "Success",
        description: "Branding settings updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving branding:', error);
      toast({
        title: "Error",
        description: "Failed to update branding settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Admin role required to access branding settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Branding Settings</h1>
        <p className="text-muted-foreground">
          Customize your organization's branding and appearance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo & Images
            </CardTitle>
            <CardDescription>
              Set your organization's logo and banner images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => handleInputChange('logo_url', e.target.value)}
              />
              {formData.logo_url && (
                <div className="mt-2">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview" 
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_image_url">Banner Image URL</Label>
              <Input
                id="banner_image_url"
                type="url"
                placeholder="https://example.com/banner.jpg"
                value={formData.banner_image_url}
                onChange={(e) => handleInputChange('banner_image_url', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional banner image for the dashboard
              </p>
              {formData.banner_image_url && (
                <div className="mt-2">
                  <img 
                    src={formData.banner_image_url} 
                    alt="Banner preview" 
                    className="h-20 w-full object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Colors
            </CardTitle>
            <CardDescription>
              Customize your organization's color scheme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  placeholder="#059669"
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This color will be applied to buttons, links, and other interactive elements
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Preview</p>
              <div className="space-y-2">
                <Button style={{ backgroundColor: formData.primary_color }}>
                  Sample Button
                </Button>
                <div 
                  className="h-4 w-full rounded"
                  style={{ backgroundColor: formData.primary_color }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Link */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              External Link
            </CardTitle>
            <CardDescription>
              Add a useful external link to your organization's header
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="external_link_title">Link Title</Label>
                <Input
                  id="external_link_title"
                  placeholder="e.g., Company Portal"
                  value={formData.external_link_title}
                  onChange={(e) => handleInputChange('external_link_title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_link_url">Link URL</Label>
                <Input
                  id="external_link_url"
                  type="url"
                  placeholder="https://portal.example.com"
                  value={formData.external_link_url}
                  onChange={(e) => handleInputChange('external_link_url', e.target.value)}
                />
              </div>
            </div>

            {formData.external_link_title && formData.external_link_url && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Preview:</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={formData.external_link_url} target="_blank" rel="noopener noreferrer">
                    {formData.external_link_title}
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}