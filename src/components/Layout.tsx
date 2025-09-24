import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  SidebarProvider, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { RolePreviewPill } from '@/components/RolePreviewPill';
import RoleSwitcher from '@/components/RoleSwitcher';
import { BottomTabs } from '@/components/app/BottomTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { LogOut, ExternalLink, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { signOut, user } = useAuth();
  const { branding } = useBranding();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        
        <div className="flex-1 flex flex-col">
          {/* Mobile-first responsive header */}
          <header className="h-14 flex items-center justify-between border-b bg-background px-3 md:px-4">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile menu trigger - only show on mobile */}
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              
              {/* Desktop sidebar trigger - only show on desktop */}
              <div className="hidden md:block">
                <SidebarTrigger />
              </div>
              
              {/* Organization Logo - responsive sizing */}
              {branding?.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Organization Logo" 
                  className="h-6 md:h-8 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Role Preview Pill - hidden on small mobile */}
              <div className="hidden sm:block">
                <RolePreviewPill />
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {/* External Link Button - responsive */}
              {branding?.external_link_title && branding?.external_link_url && (
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  asChild
                  className="hidden sm:flex items-center gap-2"
                >
                  <a 
                    href={branding.external_link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden lg:inline">{branding.external_link_title}</span>
                  </a>
                </Button>
              )}
              
              {/* User email - hidden on mobile */}
              <span className="hidden lg:block text-sm text-muted-foreground truncate max-w-32">
                Welcome, {user?.email}
              </span>
              
              {/* Theme toggle - ensure proper spacing */}
              <div className="flex-shrink-0">
                <ThemeToggle />
              </div>
              
              {/* Sign out button - responsive */}
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-1 md:gap-2 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          
          {/* Main content with mobile padding */}
          <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomTabs />
        
        {/* Role Switcher - Positioned below header to avoid overlap */}
        <div className="fixed top-20 right-4 z-40">
          <RoleSwitcher />
        </div>
      </div>
    </SidebarProvider>
  );
};