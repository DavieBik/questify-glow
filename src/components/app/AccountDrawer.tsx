import { useState, useEffect } from 'react';
import { Menu, LogOut, Files, Settings, HelpCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

export function AccountDrawer() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const getDisplayName = () => {
    if (!user) return 'User';
    
    const metadata = user.user_metadata;
    if (metadata?.full_name) return metadata.full_name;
    if (metadata?.first_name && metadata?.last_name) {
      return `${metadata.first_name} ${metadata.last_name}`;
    }
    if (metadata?.first_name) return metadata.first_name;
    
    // Fallback to email prefix
    if (user.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    
    return 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-base">{getDisplayName()}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Navigation Links */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => {
                  navigate('/files');
                  setIsOpen(false);
                }}
              >
                <Files className="mr-3 h-4 w-4" />
                Files
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => {
                  navigate('/profile');
                  setIsOpen(false);
                }}
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => {
                  navigate('/support');
                  setIsOpen(false);
                }}
              >
                <HelpCircle className="mr-3 h-4 w-4" />
                Support
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => {
                  navigate('/auth');
                  setIsOpen(false);
                }}
              >
                <RefreshCw className="mr-3 h-4 w-4" />
                Change User
              </Button>
            </nav>
          </div>

          <Separator />

          {/* Footer */}
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Log out
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              SkillBridge v{import.meta.env.VITE_APP_VERSION || '0.1.0'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}