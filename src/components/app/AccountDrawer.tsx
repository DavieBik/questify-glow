import { useState, useEffect } from 'react';
import { Menu, LogOut, Files, Settings, HelpCircle, RefreshCw, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedDevRole, setSelectedDevRole] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [forceDevMode, setForceDevMode] = useState(false);
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  // Check if role elevation is enabled in dev (or forced on)
  const isRoleElevationEnabled = import.meta.env.VITE_ALLOW_ROLE_ELEVATION === 'true' || forceDevMode;
  
  // Role preview functionality (also enable with force dev mode)
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true' || forceDevMode;
  let previewRole = null;
  let setPreviewRole = null;
  let clearPreview = null;
  let effectiveRole = userRole;
  
  if (isPreviewEnabled) {
    try {
      const preview = usePreviewRole();
      previewRole = preview.previewRole;
      setPreviewRole = preview.setPreviewRole;
      clearPreview = preview.clearPreview;
      effectiveRole = preview.effectiveRole;
    } catch {
      // Preview context not available, use real role
      effectiveRole = userRole;
    }
  }

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
              
              {(effectiveRole === 'admin' || effectiveRole === 'manager') && (
                <>
                  <div className="px-3 py-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Admin</h4>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10"
                    onClick={() => {
                      navigate('/admin/scorm');
                      setIsOpen(false);
                    }}
                  >
                    <Package className="mr-3 h-4 w-4" />
                    SCORM Packages
                  </Button>
                </>
              )}
              
              {/* Role Preview Controls */}
              {isPreviewEnabled && setPreviewRole && clearPreview && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 py-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Preview as</h4>
                    <p className="text-xs text-muted-foreground mt-1">Preview only — data permissions unchanged</p>
                  </div>
                  
                  <div className="space-y-1">
                    {(['student', 'staff', 'manager', 'admin'] as const).map((role) => (
                      <Button
                        key={role}
                        variant={previewRole === role ? "secondary" : "ghost"}
                        className="w-full justify-start h-8 text-sm"
                        onClick={() => {
                          setPreviewRole(role);
                          setIsOpen(false);
                        }}
                        data-testid={`preview-role-${role}`}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                        {previewRole === role && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Active
                          </Badge>
                        )}
                      </Button>
                    ))}
                    
                    {previewRole && (
                      <Button
                        variant="outline"
                        className="w-full justify-start h-8 text-sm mt-2"
                        onClick={() => {
                          clearPreview();
                          setIsOpen(false);
                        }}
                        data-testid="reset-preview-role"
                      >
                        Reset to real role
                      </Button>
                    )}
                  </div>
                </>
              )}
              
              {/* Dev Role Elevation */}
              {isRoleElevationEnabled && (
                <>
                  <Separator className="my-4" />
                  <div className="px-3 py-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Set my real role (dev)</h4>
                    <p className="text-xs text-muted-foreground mt-1">Changes actual role in database</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Select value={selectedDevRole} onValueChange={setSelectedDevRole}>
                      <SelectTrigger className="w-full">
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
                      className="w-full h-8 text-sm"
                      onClick={handleDevRoleChange}
                      disabled={!selectedDevRole || isUpdatingRole}
                    >
                      {isUpdatingRole ? 'Updating...' : 'Apply'}
                    </Button>
                  </div>
                </>
              )}
              
              
              {/* Dev Mode Toggle */}
              <Button
                variant="outline"
                className="w-full justify-start h-10 mb-2"
                onClick={() => setForceDevMode(!forceDevMode)}
              >
                <Settings className="mr-3 h-4 w-4" />
                {forceDevMode ? 'Disable' : 'Enable'} Dev Tools
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