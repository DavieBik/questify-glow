import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, CheckSquare, Bell, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/tasks', label: 'To-Do', icon: CheckSquare },
  { path: '/alerts', label: 'Notifications', icon: Bell },
  { path: '/inbox', label: 'Inbox', icon: Inbox },
];

export function BottomTabs() {
  const location = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden z-50">
      <div className="flex items-center">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || 
            (path === '/dashboard' && location.pathname === '/');
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors",
                isActive 
                  ? "text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1",
                isActive && "text-accent-foreground"
              )} />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}