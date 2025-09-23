import React from 'react';
import { usePreviewRole, PreviewRole } from '@/lib/rolePreview';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { User, Shield, Users, Eye, X } from 'lucide-react';

const RoleSwitcher: React.FC = () => {
  const { userRole } = useAuth();
  const { effectiveRole, previewRole, setPreviewRole, clearPreview, isPreviewActive } = usePreviewRole();

  const roles: { value: PreviewRole; label: string; icon: React.ReactNode }[] = [
    { value: 'worker', label: 'Worker', icon: <User className="w-4 h-4" /> },
    { value: 'manager', label: 'Manager', icon: <Users className="w-4 h-4" /> },
    { value: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" /> },
  ];

  const getCurrentRoleInfo = () => {
    const roleInfo = roles.find(r => r.value === effectiveRole);
    return roleInfo || { value: effectiveRole, label: effectiveRole || 'Unknown', icon: <User className="w-4 h-4" /> };
  };

  const currentRole = getCurrentRoleInfo();

  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {currentRole.icon}
            <span>{currentRole.label}</span>
            {isPreviewActive && (
              <Badge variant="secondary" className="text-xs">
                Preview
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Real Role: {userRole || 'Unknown'}
          </div>
          <DropdownMenuSeparator />
          {roles.map((role) => (
            <DropdownMenuItem
              key={role.value}
              onClick={() => setPreviewRole(role.value)}
              className="flex items-center gap-2"
            >
              {role.icon}
              <span>{role.label}</span>
              {effectiveRole === role.value && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          {isPreviewActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={clearPreview}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                <span>Clear Preview</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RoleSwitcher;