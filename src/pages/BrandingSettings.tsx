import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Palette, Image, Link as LinkIcon, Save, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function BrandingSettings() {
  const { isAdmin } = useAuth();
  const { branding, updateBranding, loading } = useBranding();
  const [formData, setFormData] = useState({
    logo_url: branding?.logo_url || '',
    favicon_url: branding?.favicon_url || '',
    primary_color: branding?.primary_color || '#059669',
    secondary_color: branding?.secondary_color || '#10b981',
    banner_image_url: branding?.banner_image_url || '',
    external_link_title: branding?.external_link_title || '',
    external_link_url: branding?.external_link_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Update form data when branding changes
  React.useEffect(() => {
    if (branding) {
      setFormData({
        logo_url: branding.logo_url || '',
        favicon_url: branding.favicon_url || '',
        primary_color: branding.primary_color || '#059669',
        secondary_color: branding.secondary_color || '#10b981',
        banner_image_url: branding.banner_image_url || '',
        external_link_title: branding.external_link_title || '',
        external_link_url: branding.external_link_url || '',
      });
    }
  }, [branding]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'banner') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const fieldName = type === 'logo' ? 'logo_url' : type === 'favicon' ? 'favicon_url' : 'banner_image_url';
      handleInputChange(fieldName, publicUrl);

      toast({
        title: "Upload Successful",
        description: `${type} uploaded successfully`,
      });
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${type}`,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranding(formData);
      toast({
        title: "Success",
        description: "Branding settings updated successfully. Changes will apply immediately.",
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
              Upload your organization's logo and images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex gap-2">
                <Input
                  id="logo-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'logo')}
                  className="flex-1"
                  disabled={uploading === 'logo'}
                />
                <Button
                  variant="outline"
                  disabled={uploading === 'logo'}
                  onClick={() => document.getElementById('logo-file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading === 'logo' ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              {formData.logo_url && (
                <div className="mt-2">
                  <img 
                    src={formData.logo_url} 
                    alt="Logo preview" 
                    className="h-16 w-auto object-contain border rounded p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Used in header and certificates (PNG recommended, max 2MB)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon</Label>
              <div className="flex gap-2">
                <Input
                  id="favicon-file"
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleFileUpload(e, 'favicon')}
                  className="flex-1"
                  disabled={uploading === 'favicon'}
                />
                <Button
                  variant="outline"
                  disabled={uploading === 'favicon'}
                  onClick={() => document.getElementById('favicon-file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading === 'favicon' ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              {formData.favicon_url && (
                <div className="mt-2">
                  <img 
                    src={formData.favicon_url} 
                    alt="Favicon preview" 
                    className="h-8 w-8 object-contain border rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Browser tab icon (ICO, PNG, or SVG, 32x32px recommended)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="banner_image_url">Banner Image (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="banner-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'banner')}
                  className="flex-1"
                  disabled={uploading === 'banner'}
                />
                <Button
                  variant="outline"
                  disabled={uploading === 'banner'}
                  onClick={() => document.getElementById('banner-file')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading === 'banner' ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
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
              <p className="text-xs text-muted-foreground">
                Optional banner image for dashboard
              </p>
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
                Main brand color for buttons, links, and interactive elements
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  placeholder="#10b981"
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Accent color for highlights and secondary actions
              </p>
            </div>

            <Separator />

            <div className="p-4 border rounded-lg space-y-3">
              <p className="text-sm font-medium">Color Preview</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button style={{ backgroundColor: formData.primary_color }} className="flex-1">
                    Primary Button
                  </Button>
                  <Button 
                    variant="secondary" 
                    style={{ backgroundColor: formData.secondary_color }}
                    className="flex-1"
                  >
                    Secondary Button
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="h-12 rounded border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: formData.primary_color, color: 'white' }}
                  >
                    Primary
                  </div>
                  <div 
                    className="h-12 rounded border flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: formData.secondary_color, color: 'white' }}
                  >
                    Secondary
                  </div>
                </div>
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