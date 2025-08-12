import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

export const OrgSwitcher: React.FC = () => {
  const { user } = useAuth();

  // Only show security notice in development mode
  if (!user || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Security Notice - Demo Mode Disabled
        </CardTitle>
        <CardDescription className="text-destructive/80">
          Organization switching has been disabled for security reasons
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-destructive/70">
          The organization switcher was removed to prevent privilege escalation vulnerabilities. 
          Users can only access organizations they are properly authorized for through the secure invitation system.
        </p>
      </CardContent>
    </Card>
  );
};