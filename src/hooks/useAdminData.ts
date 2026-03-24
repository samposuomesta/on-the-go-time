import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/contexts/AuthContext';

export function useAdminData() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  const employees = useQuery({
    queryKey: ['admin-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
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

  const allTravel = useQuery({
    queryKey: ['admin-all-travel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_expenses')
        .select('*, users(name), projects(name)')
        .order('date', { ascending: false });
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

  const allHours = useQuery({
    queryKey: ['admin-all-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_hours')
        .select('*, users(name), projects(name)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pendingTimeEntries = useQuery({
    queryKey: ['admin-pending-time-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, users(name), projects(name)')
        .eq('status', 'pending')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const allTimeEntriesWithNames = useQuery({
    queryKey: ['admin-all-time-entries-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, users(name), projects(name)')
        .order('start_time', { ascending: false });
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

  const auditLog = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
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

  const approveTimeEntry = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('time_entries').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-time-entries'] });
    },
  });

  const updateTimeEntry = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; start_time?: string; end_time?: string; break_minutes?: number }) => {
      const { error } = await supabase.from('time_entries').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-time-entries'] });
    },
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
    mutationFn: async (data: { name: string; customer: string | null; target_hours?: number | null }) => {
      const { error } = await supabase.from('projects').insert({ ...data, company_id: companyId } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-projects'] }),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; customer?: string | null; target_hours?: number | null }) => {
      const { error } = await supabase.from('projects').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-projects'] }),
  });

  const createEmployee = useMutation({
    mutationFn: async (data: { name: string; email: string; role: 'employee' | 'manager' | 'admin'; company_id?: string; contract_start_date?: string; annual_vacation_days?: number; daily_work_hours?: number; auto_subtract_lunch?: boolean; lunch_threshold_hours?: number; employee_number?: string | null }) => {
      const { error } = await supabase.from('users').insert({ ...data, company_id: data.company_id || companyId });
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
      const { error } = await supabase.from('workplaces').insert({ ...data, company_id: companyId });
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
    mutationFn: async (data: { type: string; time: string; message: string; message_fi?: string; day_of_month?: number; resend_after_days?: number }) => {
      const { error } = await supabase.from('reminder_rules' as any).insert({ ...data, company_id: companyId } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reminders'] }),
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; type?: string; time?: string; message?: string; message_fi?: string | null; day_of_month?: number | null; resend_after_days?: number | null }) => {
      const { error } = await supabase.from('reminder_rules' as any).update(data as any).eq('id', id);
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
    mutationFn: async (data: { label: string; label_fi?: string }) => {
      const { error } = await supabase.from('absence_reasons').insert({ ...data, company_id: companyId } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-absence-reasons'] }),
  });

  const updateAbsenceReason = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; label?: string; label_fi?: string | null }) => {
      const { error } = await supabase.from('absence_reasons').update(data as any).eq('id', id);
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

  const updateProjectHours = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; hours?: number; date?: string; description?: string | null; project_id?: string }) => {
      const { error } = await supabase.from('project_hours').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hours'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-hours'] });
    },
  });

  const updateTravelExpense = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; kilometers?: number; parking_cost?: number; date?: string; description?: string | null; project_id?: string | null }) => {
      const { error } = await supabase.from('travel_expenses').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-travel'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-travel'] });
    },
  });

  const insertAuditReason = useMutation({
    mutationFn: async ({ tableName, recordId, action, oldData, newData, reason }: { tableName: string; recordId: string; action: string; oldData?: any; newData?: any; reason: string }) => {
      const { error } = await supabase.from('audit_log' as any).insert({
        table_name: tableName,
        record_id: recordId,
        action,
        old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
        changed_by: reason,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] }),
  });

  // Work bank adjustment mutation
  const addBankAdjustment = useMutation({
    mutationFn: async ({ userId, hours }: { userId: string; hours: number }) => {
      const { error } = await supabase.from('work_bank_transactions').insert({
        user_id: userId,
        hours,
        type: 'adjustment' as any,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-all-work-bank'] }),
  });

  // Set absolute work bank balance
  const setBankBalance = useMutation({
    mutationFn: async ({ userId, desiredBalance }: { userId: string; desiredBalance: number }) => {
      // Delete all existing adjustments for this user
      const { error: delError } = await supabase
        .from('work_bank_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'adjustment' as any);
      if (delError) throw delError;

      // Insert single adjustment with the desired balance value
      // The work bank calculation adds this to the computed balance from entries
      // So we need: adjustment = desiredBalance - computedBalanceFromEntries
      // But since we just deleted all adjustments, we insert the raw desired offset
      const { error: insError } = await supabase.from('work_bank_transactions').insert({
        user_id: userId,
        hours: desiredBalance,
        type: 'adjustment' as any,
      });
      if (insError) throw insError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-all-work-bank'] }),
  });

  return {
    employees, projects, companies, workplaces, reminderRules, userManagers, absenceReasons, auditLog,
    pendingTravel, pendingHours, pendingTimeEntries, absences, vacationRequests,
    allTimeEntries, allWorkBank, allTravel, allHours, allTimeEntriesWithNames,
    approveTravel, approveHours, approveAbsence, approveVacation, approveTimeEntry, updateTimeEntry,
    updateProjectHours, updateTravelExpense, insertAuditReason,
    updateEmployee, toggleProject, createProject, updateProject, createEmployee,
    createCompany, updateCompany,
    createWorkplace, deleteWorkplace,
    createReminder, updateReminder, toggleReminder, deleteReminder,
    createAbsenceReason, updateAbsenceReason, toggleAbsenceReason, deleteAbsenceReason,
    setEmployeeManagers, addBankAdjustment, setBankBalance,
  };
}
