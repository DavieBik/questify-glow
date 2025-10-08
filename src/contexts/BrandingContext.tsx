import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandingData {
  id?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  favicon_url?: string;
  banner_image_url?: string;
  external_link_title?: string;
  external_link_url?: string;
  organization_id?: string;
}

interface BrandingContextType {
  branding: BrandingData | null;
  loading: boolean;
  updateBranding: (data: Partial<BrandingData>) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('org_branding')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      // Use fallbacks from environment variables if no data or fields are empty
      const fallbackBranding = {
        logo_url: data?.logo_url || null,
        primary_color: data?.primary_color || '#059669',
        secondary_color: data?.secondary_color || '#10b981',
        favicon_url: data?.favicon_url || null,
        banner_image_url: data?.banner_image_url || null,
        external_link_title: data?.external_link_title || null,
        external_link_url: data?.external_link_url || null,
        organization_id: data?.organization_id || null,
        id: data?.id || null
      };

      setBranding(fallbackBranding);
      
      // Apply the theme colors to CSS custom properties
      applyThemeColor(fallbackBranding.primary_color, fallbackBranding.secondary_color);
      
      // Update favicon if provided
      if (fallbackBranding.favicon_url) {
        updateFavicon(fallbackBranding.favicon_url);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      // Use complete fallback if fetch fails
      const fallbackBranding = {
        logo_url: null,
        primary_color: '#059669',
        secondary_color: '#10b981',
        favicon_url: null,
        banner_image_url: null,
        external_link_title: null,
        external_link_url: null
      };
      setBranding(fallbackBranding);
      applyThemeColor(fallbackBranding.primary_color, fallbackBranding.secondary_color);
    } finally {
      setLoading(false);
    }
  };

  const applyThemeColor = (primaryColor?: string, secondaryColor?: string) => {
    if (!primaryColor) return;

    // Convert hex to HSL for CSS custom properties
    const primaryHsl = hexToHsl(primaryColor);
    if (primaryHsl) {
      const root = document.documentElement;
      root.style.setProperty('--primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
      
      // Set foreground color based on lightness
      root.style.setProperty('--primary-foreground', primaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%');
      
      // Set muted variant
      const lighterHsl = { ...primaryHsl, l: Math.min(95, primaryHsl.l + 20) };
      root.style.setProperty('--muted', `${lighterHsl.h} ${lighterHsl.s}% ${lighterHsl.l}%`);
    }

    // Apply secondary color if provided
    if (secondaryColor) {
      const secondaryHsl = hexToHsl(secondaryColor);
      if (secondaryHsl) {
        const root = document.documentElement;
        root.style.setProperty('--secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
        root.style.setProperty('--secondary-foreground', secondaryHsl.l > 50 ? '0 0% 0%' : '0 0% 100%');
      }
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    // Add new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  };

  const hexToHsl = (hex: string) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const updateBranding = async (data: Partial<BrandingData>) => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('org_branding')
        .select('id')
        .single();

      let result;
      if (existing) {
        // Update existing record
        result = await supabase
          .from('org_branding')
          .update(data)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('org_branding')
          .insert(data)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local state
      setBranding(prev => ({ ...prev, ...result.data }));
      
      // Apply new theme colors if provided
      if (data.primary_color || data.secondary_color) {
        applyThemeColor(
          data.primary_color || branding?.primary_color,
          data.secondary_color || branding?.secondary_color
        );
      }

      // Update favicon if provided
      if (data.favicon_url) {
        updateFavicon(data.favicon_url);
      }
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const refreshBranding = async () => {
    setLoading(true);
    await fetchBranding();
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const value: BrandingContextType = {
    branding,
    loading,
    updateBranding,
    refreshBranding,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};