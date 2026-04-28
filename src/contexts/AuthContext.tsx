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

  // Resolve the users table row from the auth user's stable UUID
  useEffect(() => {
    if (!authUser?.id) return;
    supabase
      .from('users')
      .select('id, company_id')
      .eq('auth_user_id' as any, authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserId(data?.id ?? null);
        setCompanyId(data?.company_id ?? null);
        setLoading(false);

        // Save user's timezone
        if (data?.id) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          supabase
            .from('users')
            .update({ timezone: tz } as any)
            .eq('id', data.id)
            .then(() => {});
        }
      });
  }, [authUser?.email]);

  const signOut = async () => {
    // Store logout GPS in latest login session
    if (userId) {
      try {
        const { captureGPS } = await import('@/lib/gps');
        const gps = await captureGPS();
        const { data: session } = await supabase
          .from('login_sessions')
          .select('id')
          .eq('user_id', userId)
          .order('login_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (session) {
          await supabase
            .from('login_sessions')
            .update({
              logout_at: new Date().toISOString(),
              logout_lat: gps?.lat ?? null,
              logout_lng: gps?.lng ?? null,
            } as any)
            .eq('id', session.id);
        }
      } catch {
        // GPS/session update failed, continue with sign out
      }
    }
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
