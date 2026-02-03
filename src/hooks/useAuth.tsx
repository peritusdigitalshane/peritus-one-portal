import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'user' | 'support_user';

interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isSuperAdmin: boolean;
  hasSupportAccess: boolean;
  // Impersonation
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  effectiveUserId: string | null;
  actAsUser: (userId: string, email: string, fullName: string | null) => void;
  stopActingAsUser: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key for impersonation (survives page refresh but not browser close)
const IMPERSONATION_KEY = 'impersonated_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  // Load impersonation state from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setImpersonatedUser(parsed);
      } catch (e) {
        sessionStorage.removeItem(IMPERSONATION_KEY);
      }
    }
  }, []);

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data?.map((r) => r.role as AppRole) || [];
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id).then(setRoles);
          }, 0);
        } else {
          setRoles([]);
          // Clear impersonation when logged out
          setImpersonatedUser(null);
          sessionStorage.removeItem(IMPERSONATION_KEY);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id).then(setRoles);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || '',
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setImpersonatedUser(null);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  };

  // Impersonation functions - only available for super admins
  const actAsUser = (userId: string, email: string, fullName: string | null) => {
    // This check is done at the UI level, but we double-check here
    if (!roles.includes('super_admin')) {
      console.error('Only super admins can impersonate users');
      return;
    }
    
    const impersonated: ImpersonatedUser = { id: userId, email, full_name: fullName };
    setImpersonatedUser(impersonated);
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonated));
  };

  const stopActingAsUser = () => {
    setImpersonatedUser(null);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  };

  const isSuperAdmin = roles.includes('super_admin');
  const hasSupportAccess = roles.includes('support_user') || roles.includes('admin') || roles.includes('super_admin');
  
  // When impersonating, use the impersonated user's ID for data fetching
  // Only super admins can impersonate, and impersonation clears if they're not super admin
  const isImpersonating = isSuperAdmin && impersonatedUser !== null;
  const effectiveUserId = isImpersonating ? impersonatedUser!.id : user?.id ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        isSuperAdmin,
        hasSupportAccess,
        impersonatedUser,
        isImpersonating,
        effectiveUserId,
        actAsUser,
        stopActingAsUser,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
