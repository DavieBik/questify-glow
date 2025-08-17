import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { getOrganizationConfig } from '@/config/organization';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  max_users: number;
  is_active: boolean;
  logo_url?: string;
  primary_color?: string;
  contact_email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  organization: Organization;
  orgRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  canEdit: boolean;
  isOrgAdmin: boolean;
  isOrgManager: boolean;
  canEditOrg: boolean;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Single-tenant: organization is now static from config
  const organization = getOrganizationConfig();

  const fetchUserAndOrganization = async () => {
    if (!user) {
      console.log('AuthContext: No user, cannot fetch role');
      return;
    }

    console.log('AuthContext: Fetching user data for user:', user.id);
    try {
      // Fetch user data (simplified for single-tenant)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      console.log('AuthContext: User data query result:', { userData, userError });

      if (!userError && userData) {
        console.log('AuthContext: Setting user role to:', userData.role);
        setUserRole(userData.role);
        
        // Fetch org role from org_members
        const { data: orgMemberData } = await supabase
          .from('org_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', organization.id)
          .maybeSingle();

        console.log('AuthContext: Org member data:', orgMemberData);

        if (orgMemberData) {
          setOrgRole(orgMemberData.role);
        }
      } else {
        console.log('AuthContext: Error or no user data:', userError);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshOrganization = async () => {
    await fetchUserAndOrganization();
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed', { event, session: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthProvider: User authenticated, fetching data');
          // Fetch user data and organization separately to avoid deadlock
          setTimeout(async () => {
            await fetchUserAndOrganization();
          }, 0);
        } else {
          console.log('AuthProvider: No user session');
          setUserRole(null);
          setOrgRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect logic (simplified for single-tenant)
  useEffect(() => {
    if (!loading) {
      const isAuthPage = location.pathname === '/auth';
      
      if (!user && !isAuthPage) {
        navigate('/auth');
      } else if (user && isAuthPage) {
        navigate('/');
      }
    }
  }, [user, loading, location.pathname, navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setOrgRole(null);
    navigate('/auth');
  };

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const canEdit = isAdmin || isManager;
  
  const isOrgAdmin = orgRole === 'admin';
  const isOrgManager = orgRole === 'manager';
  const canEditOrg = isOrgAdmin || isOrgManager;

  const value = {
    user,
    session,
    loading,
    userRole,
    organization,
    orgRole,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isManager,
    canEdit,
    isOrgAdmin,
    isOrgManager,
    canEditOrg,
    refreshOrganization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};