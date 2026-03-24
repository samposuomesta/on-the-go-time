import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
