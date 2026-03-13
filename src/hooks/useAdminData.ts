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

  // Manager assignments (many-to-many)
  const userManagers = useQuery({
    queryKey: ['admin-user-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_managers' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
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

  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const workplaces = useQuery({
    queryKey: ['admin-workplaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplaces')
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const absenceReasons = useQuery({
    queryKey: ['admin-absence-reasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .order('label');
      if (error) throw error;
      return data;
    },
  });

  const reminderRules = useQuery({
    queryKey: ['admin-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminder_rules' as any)
        .select('*')
        .eq('company_id', DEMO_COMPANY_ID)
        .order('created_at');
      if (error) throw error;
      return data as any[];
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

  const allTimeEntries = useQuery({
    queryKey: ['admin-all-time-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const allWorkBank = useQuery({
    queryKey: ['admin-all-work-bank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_bank_transactions')
        .select('*')
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

  // Mutations
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

  const createCompany = useMutation({
    mutationFn: async (data: { name: string; km_rate: number }) => {
      const { error } = await supabase.from('companies').insert(data);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; km_rate?: number; company_id_code?: string | null; address?: string | null; country?: string | null }) => {
      const { error } = await supabase.from('companies').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const createWorkplace = useMutation({
    mutationFn: async (data: { name: string; latitude: number; longitude: number; radius_meters: number }) => {
      const { error } = await supabase.from('workplaces').insert({ ...data, company_id: DEMO_COMPANY_ID });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-workplaces'] }),
  });

  const deleteWorkplace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workplaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-workplaces'] }),
  });

  const createReminder = useMutation({
    mutationFn: async (data: { type: string; time: string; message: string }) => {
      const { error } = await supabase.from('reminder_rules' as any).insert({ ...data, company_id: DEMO_COMPANY_ID } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reminders'] }),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('reminder_rules' as any).update({ enabled } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reminders'] }),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminder_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reminders'] }),
  });

  const createAbsenceReason = useMutation({
    mutationFn: async (data: { label: string }) => {
      const { error } = await supabase.from('absence_reasons').insert({ ...data, company_id: DEMO_COMPANY_ID });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-absence-reasons'] }),
  });

  const toggleAbsenceReason = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('absence_reasons').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-absence-reasons'] }),
  });

  const deleteAbsenceReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('absence_reasons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-absence-reasons'] }),
  });

  // Manager assignment mutations
  const setEmployeeManagers = useMutation({
    mutationFn: async ({ userId, managerIds }: { userId: string; managerIds: string[] }) => {
      // Delete existing assignments
      const { error: delError } = await supabase
        .from('user_managers' as any)
        .delete()
        .eq('user_id', userId);
      if (delError) throw delError;
      // Insert new assignments
      if (managerIds.length > 0) {
        const rows = managerIds.map(mid => ({ user_id: userId, manager_id: mid }));
        const { error: insError } = await supabase
          .from('user_managers' as any)
          .insert(rows as any);
        if (insError) throw insError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user-managers'] }),
  });

  return {
    employees, projects, companies, workplaces, reminderRules, userManagers, absenceReasons,
    pendingTravel, pendingHours, absences, vacationRequests,
    allTimeEntries, allWorkBank,
    approveTravel, approveHours, approveAbsence, approveVacation,
    updateEmployee, toggleProject, createProject, createEmployee,
    createCompany, updateCompany,
    createWorkplace, deleteWorkplace,
    createReminder, toggleReminder, deleteReminder,
    createAbsenceReason, toggleAbsenceReason, deleteAbsenceReason,
    setEmployeeManagers,
  };
}
