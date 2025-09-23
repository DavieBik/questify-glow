import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { usePreviewRole, type PreviewRole } from '@/lib/rolePreview';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  FileText, 
  Award, 
  Home,
  MessageCircle,
  Megaphone,
  Users,
  Settings,
  User,
  Building2,
  Clock,
  Bell,
  GraduationCap,
  Upload
} from 'lucide-react';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Courses', url: '/courses', icon: BookOpen },
  { title: 'Curricula', url: '/curricula', icon: GraduationCap },
  { title: 'Messages', url: '/messages', icon: MessageCircle },
  { title: 'Announcements', url: '/announcements', icon: Megaphone },
  { title: 'Group Projects', url: '/projects', icon: Users },
  { title: 'Certificates', url: '/certificates', icon: Award },
  { title: 'Notifications', url: '/alerts', icon: Bell, showBadge: true },
  
  { title: 'Profile', url: '/profile', icon: User },
];

const managementItems = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Settings },
  { title: 'Manager Dashboard', url: '/manager/dashboard', icon: Settings },
];

const adminItems = [
  { title: 'Management Hub', url: '/admin/management', icon: Settings },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Courses', url: '/admin/courses', icon: BookOpen },
  { title: 'Curricula', url: '/admin/curricula', icon: GraduationCap },
  { title: 'Import Courses', url: '/admin/imports/courses-modules', icon: Upload },
  { title: 'Import Users & Enrollments', url: '/admin/imports/users-enrollments', icon: Upload },
  { title: 'Approvals', url: '/admin/approvals', icon: Clock },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'Analytics', url: '/admin/analytics', icon: FileText },
  { title: 'Branding', url: '/admin/branding', icon: Building2 },
];

const organizationItems = [
  { title: 'Organization Settings', url: '/organization/settings', icon: Building2 },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { isAdmin, isManager } = useAuth();
  const { unreadCount } = useNotificationCount();
  const currentPath = location.pathname;
  const { toast } = useToast();
  
  // Role preview and dev elevation state
  const [selectedDevRole, setSelectedDevRole] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  
  // Check environment variables
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true';
  const isRoleElevationEnabled = import.meta.env.VITE_ALLOW_ROLE_ELEVATION === 'true';
  
  // Safely get preview role context (only if preview is enabled)
  let previewRole: PreviewRole = null;
  let setPreviewRole: (role: PreviewRole) => void = () => {};
  let clearPreview: () => void = () => {};
  
  if (isPreviewEnabled) {
    try {
      const previewContext = usePreviewRole();
      previewRole = previewContext.previewRole;
      setPreviewRole = previewContext.setPreviewRole;
      clearPreview = previewContext.clearPreview;
    } catch {
      // Preview context not available, use defaults
    }
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"

  const handleDevRoleChange = async () => {
    if (!selectedDevRole) return;
    
    setIsUpdatingRole(true);
    try {
      const { data, error } = await supabase.functions.invoke('dev-set-role', {
        body: { role: selectedDevRole }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Role updated",
        description: `Role updated to ${selectedDevRole}`,
      });

      // Reload the page to refresh all auth state
      window.location.reload();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r"
      variant="sidebar"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Learning Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex items-center gap-2">
                        {item.title}
                        {item.showBadge && unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Manager/Admin Dashboard Section */}
        {(isAdmin || isManager) && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Dev Controls Section */}
        {(isPreviewEnabled || isRoleElevationEnabled) && (
          <>
            <Separator className="mx-4 my-2" />
            <SidebarGroup>
              <SidebarGroupLabel>Development</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 space-y-3">
                  
                  {/* Role Preview */}
                  {isPreviewEnabled && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Role Preview (temp)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['worker', 'manager', 'admin'].map((role) => (
                          <Button
                            key={role}
                            variant={previewRole === role ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs relative"
                            onClick={() => setPreviewRole(role as any)}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                            {previewRole === role && (
                              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                                Active
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                      
                      {previewRole && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={clearPreview}
                        >
                          Reset to real role
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Dev Role Elevation */}
                  {isRoleElevationEnabled && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Set Real Role (dev)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Changes actual role in database
                      </div>
                      
                      <Select value={selectedDevRole} onValueChange={setSelectedDevRole}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={handleDevRoleChange}
                        disabled={!selectedDevRole || isUpdatingRole}
                      >
                        {isUpdatingRole ? 'Updating...' : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}