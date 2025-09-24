import { NavLink, useLocation } from 'react-router-dom';
import { Home, BookOpen, Award, MessageCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const tabs = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/courses', label: 'Courses', icon: BookOpen },
  { path: '/certificates', label: 'Certificates', icon: Award },
  { path: '/messages', label: 'Messages', icon: MessageCircle },
  { path: 'signout', label: 'Sign Out', icon: LogOut, isAction: true },
];

export function BottomTabs() {
  const location = useLocation();
  const { unreadCount } = useNotificationCount();
  const { signOut } = useAuth();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border md:hidden z-50">
      <div className="flex items-center safe-area-inset-bottom">
        {tabs.map(({ path, label, icon: Icon, isAction }) => {
          const isActive = location.pathname === path || 
            (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard'));
          
          // Handle sign out action
          if (isAction && path === 'signout') {
            return (
              <button
                key={path}
                onClick={signOut}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors relative",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="truncate">{label}</span>
              </button>
            );
          }
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors relative",
                isActive 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-primary"
                )} />
                {/* Show notification badge on messages tab */}
                {path === '/messages' && unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "truncate",
                isActive && "text-primary font-medium"
              )}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}