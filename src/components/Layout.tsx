import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  SidebarProvider, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { RolePreviewPill } from '@/components/RolePreviewPill';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { LogOut, ExternalLink } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut, user } = useAuth();
  const { branding } = useBranding();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              
              {/* Organization Logo */}
              {branding?.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Organization Logo" 
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Role Preview Pill */}
              <RolePreviewPill />
            </div>
            
            <div className="flex items-center gap-4">
              {/* External Link Button */}
              {branding?.external_link_title && branding?.external_link_url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex items-center gap-2"
                >
                  <a 
                    href={branding.external_link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {branding.external_link_title}
                  </a>
                </Button>
              )}
              
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.email}
              </span>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};