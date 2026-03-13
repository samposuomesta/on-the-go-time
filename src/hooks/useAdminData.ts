import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_COMPANY_ID } from '@/lib/demo-user';

export function useAdminData() {
  const queryClient = useQueryClient();

  const employees = useQuery({
    queryKey: ['admin-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const projects = useQuery({
    queryKey: ['admin-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const pendingTravel = useQuery({
    queryKey: ['admin-travel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_expenses')
        .select('*, users(name), projects(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendingHours = useQuery({
    queryKey: ['admin-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_hours')
        .select('*, users(name), projects(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const absences = useQuery({
    queryKey: ['admin-absences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*, users(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const vacationRequests = useQuery({
    queryKey: ['admin-vacation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*, users(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveTravel = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('travel_expenses').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-travel'] }),
  });

  const approveHours = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('project_hours').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-hours'] }),
  });

  const approveAbsence = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('absences').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-absences'] }),
  });

  const approveVacation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('vacation_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-vacation'] }),
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('users').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-employees'] }),
  });

  const toggleProject = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('projects').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-projects'] }),
  });

  const createProject = useMutation({
    mutationFn: async (data: { name: string; customer: string | null }) => {
      const { error } = await supabase.from('projects').insert({ ...data, company_id: DEMO_COMPANY_ID });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-projects'] }),
  });

  const createEmployee = useMutation({
    mutationFn: async (data: { name: string; email: string; role: 'employee' | 'manager' | 'admin'; contract_start_date?: string; annual_vacation_days?: number }) => {
      const { error } = await supabase.from('users').insert({ ...data, company_id: DEMO_COMPANY_ID });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-employees'] }),
  });

  return {
    employees, projects, pendingTravel, pendingHours, absences, vacationRequests,
    approveTravel, approveHours, approveAbsence, approveVacation,
    updateEmployee, toggleProject, createProject, createEmployee,
  };
}
