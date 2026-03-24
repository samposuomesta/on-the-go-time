import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  authUser: User | null;
  userId: string | null;
  companyId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  authUser: null,
  userId: null,
  companyId: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setUserId(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resolve the users table row from auth email
  useEffect(() => {
    if (!authUser?.email) return;
    supabase
      .from('users')
      .select('id, company_id')
      .eq('email', authUser.email)
      .single()
      .then(({ data }) => {
        setUserId(data?.id ?? null);
        setCompanyId(data?.company_id ?? null);
        setLoading(false);
      });
  }, [authUser?.email]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ authUser, userId, companyId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

/** Returns the users table id of the current user */
export function useUserId(): string {
  const { userId } = useContext(AuthContext);
  if (!userId) throw new Error('useUserId called without authenticated user');
  return userId;
}

/** Returns the company_id of the current user */
export function useCompanyId(): string {
  const { companyId } = useContext(AuthContext);
  if (!companyId) throw new Error('useCompanyId called without authenticated user');
  return companyId;
}
