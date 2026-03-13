import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-user';

export function useWorkBank() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('work_bank_transactions')
        .select('hours, type')
        .eq('user_id', DEMO_USER_ID);

      if (error) {
        console.error('Error fetching work bank:', error);
        setLoading(false);
        return;
      }

      const total = (data ?? []).reduce((sum, t) => sum + Number(t.hours), 0);
      setBalance(total);
      setLoading(false);
    }
    fetch();
  }, []);

  return { balance, loading };
}
