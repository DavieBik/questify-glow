import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

export function WelcomeHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, []);

  const getDisplayName = () => {
    if (!user) return 'there';
    
    const metadata = user.user_metadata;
    if (metadata?.full_name) return toTitleCase(metadata.full_name.split(' ')[0]);
    if (metadata?.first_name) return toTitleCase(metadata.first_name);
    
    // Fallback to email prefix
    if (user.email) {
      const prefix = user.email.split('@')[0];
      return toTitleCase(prefix);
    }
    
    return 'there';
  };

  const toTitleCase = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">
        Welcome, {getDisplayName()}
      </h1>
    </div>
  );
}