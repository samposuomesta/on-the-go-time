import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/contexts/AuthContext';

export interface Project {
  id: string;
  name: string;
  customer: string | null;
}

export function useProjects() {
  const companyId = useCompanyId();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, customer')
      .eq('company_id', companyId)
      .eq('active', true)
      .then(({ data }) => {
        if (data) setProjects(data);
      });
  }, [companyId]);

  return projects;
}
