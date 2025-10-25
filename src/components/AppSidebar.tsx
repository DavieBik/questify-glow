import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Upload,
  LogOut
} from 'lucide-react';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Course Catalog', url: '/catalog', icon: BookOpen },
  { title: 'My Courses', url: '/courses', icon: GraduationCap },
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
  { title: 'Certificates', url: '/admin/certificates', icon: Award },
  { title: 'Import Courses', url: '/admin/imports/courses-modules', icon: Upload },
  { title: 'Import Users & Enrollments', url: '/admin/imports/users-enrollments', icon: Upload },
  { title: 'Approvals', url: '/admin/approvals', icon: Clock },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'Analytics', url: '/admin/analytics', icon: FileText },
  { title: 'Branding', url: '/admin/branding', icon: Building2 },
];

export function AppSidebar() {
  const location = useLocation();
  const { userRole, signOut } = useAuth();
  const { unreadCount } = useNotificationCount();
  const currentPath = location.pathname;

  // Use effective role for permissions
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'admin';

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const navButtonClasses =
    'text-white/80 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:border-l-4 data-[active=true]:border-primary data-[active=true]:ring-1 data-[active=true]:ring-ring/30';

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
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={navButtonClasses}
                  >
                    <NavLink to={item.url} end={item.url === '/'}>
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
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={navButtonClasses}
                    >
                      <NavLink to={item.url}>
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
                {managementItems
                  .filter((item) => {
                    // Show Admin Dashboard only to admins
                    if (item.url === '/admin/dashboard') return isAdmin && userRole === 'admin';
                    // Show Manager Dashboard only to managers (not admins)
                    if (item.url === '/manager/dashboard') return userRole === 'manager';
                    return true;
                  })
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        className={navButtonClasses}
                      >
                        <NavLink to={item.url}>
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

      </SidebarContent>
      
      {/* Sign out button at bottom of sidebar */}
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
