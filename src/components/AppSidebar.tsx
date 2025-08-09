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
  Settings
} from 'lucide-react';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Courses', url: '/courses', icon: BookOpen },
  { title: 'Messages', url: '/messages', icon: MessageCircle },
  { title: 'Certificates', url: '/certificates', icon: Award },
  { title: 'Badges', url: '/badges', icon: Award },
];

const adminItems = [
  { title: 'Admin Dashboard', url: '/admin/dashboard', icon: Settings },
  { title: 'Admin Users', url: '/admin/users', icon: Settings },
  { title: 'Course Management', url: '/admin/courses', icon: BookOpen },
  { title: 'Analytics', url: '/admin/analytics', icon: FileText },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { canEdit } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    return isActive(path) 
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
      : 'hover:bg-sidebar-accent/50';
  };

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
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canEdit && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavClasses(item.url)}
                      >
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