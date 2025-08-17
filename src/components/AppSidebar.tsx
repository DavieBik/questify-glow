import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  
  { title: 'Profile', url: '/profile', icon: User },
];

const managementItems = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Settings },
  { title: 'Manager Dashboard', url: '/manager/dashboard', icon: Settings },
];

const adminItems = [
  { title: 'Branding', url: '/admin/branding', icon: Settings },
  { title: 'Admin Users', url: '/admin/users', icon: Settings },
  { title: 'Course Management', url: '/admin/courses', icon: BookOpen },
  { title: 'Curricula Management', url: '/admin/curricula', icon: GraduationCap },
  { title: 'Import Courses', url: '/admin/imports/courses-modules', icon: Upload },
  { title: 'Approvals', url: '/admin/approvals', icon: Clock },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'Analytics', url: '/admin/analytics', icon: FileText },
];

const organizationItems = [
  { title: 'Organization Settings', url: '/organization/settings', icon: Building2 },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { isAdmin, isManager } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"

  return (
    <Sidebar
      collapsible="icon"
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
                      <span>{item.title}</span>
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
      </SidebarContent>
    </Sidebar>
  );
}