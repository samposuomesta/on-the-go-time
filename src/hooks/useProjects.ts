import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_COMPANY_ID } from '@/lib/demo-user';

export interface Project {
  id: string;
  name: string;
  customer: string | null;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, customer')
      .eq('company_id', DEMO_COMPANY_ID)
      .eq('active', true)
      .then(({ data }) => {
        if (data) setProjects(data);
      });
  }, []);

  return projects;
}
