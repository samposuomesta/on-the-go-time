import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useCurrentUser() {
  const { userId } = useAuthContext();

  return useQuery({
    queryKey: ['current-user', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
