import { useState, useEffect, useMemo, useCallback } from 'react';
import { Goal, WeeklyGoals, TeamMemberWeeklyGoals } from '@/types/weekly-goals';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from '@/contexts/AuthContext';

// ISO week number (Mon-based)
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const useWeeklyGoals = () => {
  const userId = useUserId();
  const [currentWeekGoals, setCurrentWeekGoals] = useState<WeeklyGoals | null>(null);
  const [currentWeekTemplateGoals, setCurrentWeekTemplateGoals] = useState<WeeklyGoals[]>([]);
  const [pastWeeks, setPastWeeks] = useState<WeeklyGoals[]>([]);
  const [pastTemplateWeeks, setPastTemplateWeeks] = useState<WeeklyGoals[]>([]);
  const [allWeeklyGoals, setAllWeeklyGoals] = useState<WeeklyGoals[]>([]);
  const [teamGoals, setTeamGoals] = useState<TeamMemberWeeklyGoals[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalGoals, setRatingModalGoals] = useState<WeeklyGoals | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  const currentWeek = getWeekNumber(new Date());
  const currentYear = new Date().getFullYear();

  const fetchGoals = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data: weeklyData, error } = await supabase
        .from('weekly_goals')
        .select('id, week_number, year, rated_at, is_admin_assigned, template_name, template_id, created_at, goals(id, text, rating, comment, created_at)')
        .eq('user_id', userId)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) throw error;

      const formatted: WeeklyGoals[] = (weeklyData ?? []).map((wg: any) => ({
        id: wg.id,
        weekNumber: wg.week_number,
        year: wg.year,
        goals: (wg.goals ?? []).map((g: any) => ({
          id: g.id,
          text: g.text,
          rating: g.rating as 1 | 2 | 3 | 4 | undefined,
          comment: g.comment || undefined,
          createdAt: new Date(g.created_at),
        })),
        isRated: wg.rated_at !== null,
        createdAt: new Date(wg.created_at),
        isAdminAssigned: wg.is_admin_assigned,
        templateName: wg.template_name || undefined,
        templateId: wg.template_id || undefined,
      }));

      setAllWeeklyGoals(formatted);

      const own = formatted.filter((w) => !w.isAdminAssigned);
      const tmpl = formatted.filter((w) => w.isAdminAssigned);

      setCurrentWeekGoals(own.find((w) => w.weekNumber === currentWeek && w.year === currentYear) || null);
      setCurrentWeekTemplateGoals(tmpl.filter((w) => w.weekNumber === currentWeek && w.year === currentYear));
      setPastWeeks(own.filter((w) => w.year < currentYear || (w.year === currentYear && w.weekNumber < currentWeek)));
      setPastTemplateWeeks(tmpl.filter((w) => w.year < currentYear || (w.year === currentYear && w.weekNumber < currentWeek)));

      // Team goals: fetch user_teams to discover teammates, then fetch their weekly goals
      const { data: myTeams } = await supabase
        .from('user_teams')
        .select('team_id')
        .eq('user_id', userId);

      const teamIds = (myTeams ?? []).map((t: any) => t.team_id);
      if (teamIds.length > 0) {
        const { data: teammates } = await supabase
          .from('user_teams')
          .select('user_id, team_id')
          .in('team_id', teamIds);

        const teammateIds = Array.from(new Set((teammates ?? []).map((t: any) => t.user_id))).filter((id) => id !== userId);

        if (teammateIds.length > 0) {
          const [{ data: teamGoalsData }, { data: profiles }] = await Promise.all([
            supabase
              .from('weekly_goals')
              .select('id, user_id, week_number, year, rated_at, is_admin_assigned, template_name, created_at, goals(id, text, rating, comment, created_at)')
              .in('user_id', teammateIds)
              .order('week_number', { ascending: false }),
            supabase.from('users').select('id, name').in('id', teammateIds),
          ]);

          const nameMap = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.name]));
          const formattedTeam: TeamMemberWeeklyGoals[] = (teamGoalsData ?? []).map((wg: any) => ({
            id: wg.id,
            weekNumber: wg.week_number,
            year: wg.year,
            goals: (wg.goals ?? []).map((g: any) => ({
              id: g.id,
              text: g.text,
              rating: g.rating as 1 | 2 | 3 | 4 | undefined,
              comment: g.comment || undefined,
              createdAt: new Date(g.created_at),
            })),
            isRated: wg.rated_at !== null,
            createdAt: new Date(wg.created_at),
            isAdminAssigned: wg.is_admin_assigned,
            templateName: wg.template_name || undefined,
            memberId: wg.user_id,
            memberName: nameMap.get(wg.user_id) ?? 'Unknown',
          }));
          setTeamGoals(formattedTeam);
        } else {
          setTeamGoals([]);
        }
      } else {
        setTeamGoals([]);
      }
    } catch (e) {
      console.error('useWeeklyGoals fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentWeek, currentYear]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createWeeklyGoals = async (goals: string[], weekOffset: number = 0) => {
    if (!userId) return;
    const targetWeek = currentWeek + weekOffset;
    const targetYear = targetWeek > 52 ? currentYear + 1 : currentYear;
    const adjustedWeek = targetWeek > 52 ? targetWeek - 52 : targetWeek;
    try {
      const { data: weekly, error: wErr } = await supabase
        .from('weekly_goals')
        .insert({ user_id: userId, week_number: adjustedWeek, year: targetYear, is_admin_assigned: false })
        .select()
        .single();
      if (wErr) throw wErr;
      const toInsert = goals.filter((g) => g.trim().length > 0).map((text) => ({ weekly_goal_id: weekly.id, text }));
      const { error: gErr } = await supabase.from('goals').insert(toInsert);
      if (gErr) throw gErr;
      fetchGoals();
    } catch (e) {
      console.error('createWeeklyGoals error:', e);
    }
  };

  const rateGoals = async (
    weeklyGoalsToRate: WeeklyGoals,
    ratings: Record<string, 1 | 2 | 3 | 4>,
    comments: Record<string, string> = {}
  ) => {
    if (!weeklyGoalsToRate || !userId) return;
    try {
      for (const goal of weeklyGoalsToRate.goals) {
        const rating = ratings[goal.id];
        const comment = comments[goal.id];
        if (rating) {
          await supabase.from('goals').update({ rating, comment: comment || null }).eq('id', goal.id);
        }
      }
      await supabase.from('weekly_goals').update({ rated_at: new Date().toISOString() }).eq('id', weeklyGoalsToRate.id);
      setShowRatingModal(false);
      setRatingModalGoals(null);
      fetchGoals();
    } catch (e) {
      console.error('rateGoals error:', e);
    }
  };

  const triggerRating = (goalsToRate?: WeeklyGoals) => {
    const target = goalsToRate || currentWeekGoals;
    if (target && !target.isRated) {
      setRatingModalGoals(target);
      setShowRatingModal(true);
    }
  };

  const selectedWeekGoals = useMemo(() => {
    const own = allWeeklyGoals.filter((w) => !w.isAdminAssigned);
    if (selectedWeek === currentWeek) return currentWeekGoals;
    return own.find((w) => w.weekNumber === selectedWeek && w.year === currentYear) || null;
  }, [selectedWeek, currentWeek, currentWeekGoals, allWeeklyGoals, currentYear]);

  const selectedWeekTemplateGoals = useMemo(() => {
    return allWeeklyGoals.filter((w) => w.isAdminAssigned && w.weekNumber === selectedWeek && w.year === currentYear);
  }, [selectedWeek, allWeeklyGoals, currentYear]);

  const selectedWeekTeamGoals = useMemo(() => {
    return teamGoals.filter((g) => g.weekNumber === selectedWeek && g.year === currentYear);
  }, [selectedWeek, teamGoals, currentYear]);

  return {
    currentWeekGoals,
    currentWeekTemplateGoals,
    selectedWeekGoals,
    selectedWeekTemplateGoals,
    pastWeeks,
    pastTemplateWeeks,
    allWeeklyGoals,
    teamGoals,
    selectedWeekTeamGoals,
    showRatingModal,
    setShowRatingModal,
    ratingModalGoals,
    setRatingModalGoals,
    createWeeklyGoals,
    rateGoals,
    triggerRating,
    currentWeek,
    currentYear,
    selectedWeek,
    setSelectedWeek,
    isLoading,
  };
};
