import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

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
  organization: Organization | null;
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
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserAndOrganization = async () => {
    if (!user) return;

    try {
      // Fetch user data with organization
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          role,
          organization_id,
          organizations:organization_id(
            id,
            name,
            slug,
            subscription_plan,
            max_users,
            is_active,
            logo_url,
            primary_color,
            contact_email
          )
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (!userError && userData) {
        setUserRole(userData.role);
        if (userData.organizations) {
          setOrganization(userData.organizations as Organization);
          
          // Fetch org role if user has organization_id
          if (userData.organization_id) {
            const { data: orgMemberData } = await supabase
              .from('org_members')
              .select('role')
              .eq('user_id', user.id)
              .eq('organization_id', userData.organization_id)
              .maybeSingle();

            if (orgMemberData) {
              setOrgRole(orgMemberData.role);
            }
          }
        } else {
          // User has no organization_id set, check if they're a member of any organization
          const { data: orgMemberData } = await supabase
            .from('org_members')
            .select(`
              role,
              organization_id,
              organizations (
                id,
                name,
                slug,
                subscription_plan,
                max_users,
                is_active,
                logo_url,
                primary_color,
                contact_email
              )
            `)
            .eq('user_id', user.id)
            .maybeSingle();

          if (orgMemberData?.organizations) {
            setOrganization(orgMemberData.organizations as Organization);
            setOrgRole(orgMemberData.role);
            
            // Update user's organization_id for future queries
            await supabase
              .from('users')
              .update({ organization_id: orgMemberData.organization_id })
              .eq('id', user.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user and organization:', error);
    }
  };

  const refreshOrganization = async () => {
    await fetchUserAndOrganization();
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data and organization separately to avoid deadlock
          setTimeout(async () => {
            await fetchUserAndOrganization();
          }, 0);
        } else {
          setUserRole(null);
          setOrganization(null);
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

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      const isAuthPage = location.pathname === '/auth';
      const isOrgSetupPage = location.pathname === '/organization/setup';
      
      if (!user && !isAuthPage) {
        navigate('/auth');
      } else if (user && isAuthPage) {
        // If user has no organization, redirect to setup
        if (!organization) {
          navigate('/organization/setup');
        } else {
          navigate('/');
        }
      } else if (user && !organization && !isOrgSetupPage) {
        // If user is logged in but has no organization and isn't on setup page
        navigate('/organization/setup');
      }
    }
  }, [user, organization, loading, location.pathname, navigate]);

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