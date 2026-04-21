import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { useWeeklyGoals } from '@/hooks/useWeeklyGoals';
import { GoalInput } from '@/components/weekly-goals/GoalInput';
import { CurrentGoals } from '@/components/weekly-goals/CurrentGoals';
import { RatingModal } from '@/components/weekly-goals/RatingModal';
import { WeeklyHistory } from '@/components/weekly-goals/WeeklyHistory';
import { TeamDashboard } from '@/components/weekly-goals/TeamDashboard';

export default function WeeklyGoalsPage() {
  const { t } = useTranslation();
  const {
    currentWeekGoals,
    currentWeekTemplateGoals,
    selectedWeekGoals,
    selectedWeekTemplateGoals,
    pastWeeks,
    pastTemplateWeeks,
    selectedWeekTeamGoals,
    showRatingModal,
    setShowRatingModal,
    ratingModalGoals,
    createWeeklyGoals,
    rateGoals,
    triggerRating,
    currentWeek,
    selectedWeek,
    setSelectedWeek,
  } = useWeeklyGoals();

  const isCurrentWeek = selectedWeek === currentWeek;
  const isPastWeek = selectedWeek < currentWeek;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-display font-bold flex-1">{t('weeklyGoals.title')}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedWeek(selectedWeek - 1)} aria-label={t('weeklyGoals.previousWeek')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[80px] text-center">
            {t('weeklyGoals.week')} {selectedWeek}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setSelectedWeek(selectedWeek + 1)} aria-label={t('weeklyGoals.nextWeek')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-3xl mx-auto w-full">
        <Tabs defaultValue="my-goals" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto">
            <TabsTrigger value="my-goals" className="flex items-center gap-2 data-[state=active]:bg-background h-10">
              <Target className="w-4 h-4" />
              <span className="truncate">{t('weeklyGoals.myGoals')}</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 data-[state=active]:bg-background h-10">
              <Users className="w-4 h-4" />
              <span className="truncate">{t('weeklyGoals.teamGoals')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-goals" className="space-y-4">
            {isCurrentWeek && currentWeekTemplateGoals.map((tg) => (
              <CurrentGoals
                key={tg.id}
                weeklyGoals={tg}
                onTriggerRating={!tg.isRated ? () => triggerRating(tg) : undefined}
              />
            ))}
            {isCurrentWeek && currentWeekGoals && (
              <CurrentGoals
                weeklyGoals={currentWeekGoals}
                onTriggerRating={!currentWeekGoals.isRated ? () => triggerRating(currentWeekGoals) : undefined}
              />
            )}
            {isCurrentWeek && !currentWeekGoals && (
              <GoalInput onSubmit={(goals) => createWeeklyGoals(goals, 0)} targetWeek={currentWeek} />
            )}

            {!isCurrentWeek && selectedWeekTemplateGoals.map((tg) => (
              <CurrentGoals
                key={tg.id}
                weeklyGoals={tg}
                isFutureWeek={!isPastWeek}
                onTriggerRating={isPastWeek && !tg.isRated ? () => triggerRating(tg) : undefined}
              />
            ))}
            {!isCurrentWeek && selectedWeekGoals && (
              <CurrentGoals
                weeklyGoals={selectedWeekGoals}
                isFutureWeek={!isPastWeek}
                onTriggerRating={isPastWeek && !selectedWeekGoals.isRated ? () => triggerRating(selectedWeekGoals) : undefined}
              />
            )}
            {!isCurrentWeek && !isPastWeek && !selectedWeekGoals && selectedWeekTemplateGoals.length === 0 && (
              <GoalInput onSubmit={(goals) => createWeeklyGoals(goals, selectedWeek - currentWeek)} targetWeek={selectedWeek} />
            )}
            {!isCurrentWeek && isPastWeek && !selectedWeekGoals && selectedWeekTemplateGoals.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t('weeklyGoals.noGoalsThisWeek')}
                </CardContent>
              </Card>
            )}

            {isCurrentWeek && pastTemplateWeeks.length > 0 && (
              <WeeklyHistory pastWeeks={pastTemplateWeeks} title={t('weeklyGoals.templateHistory')} />
            )}
            {isCurrentWeek && <WeeklyHistory pastWeeks={pastWeeks} />}
          </TabsContent>

          <TabsContent value="team">
            <TeamDashboard teamGoals={selectedWeekTeamGoals} currentWeek={currentWeek} selectedWeek={selectedWeek} />
          </TabsContent>
        </Tabs>
      </main>

      {ratingModalGoals && (
        <RatingModal
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          weeklyGoals={ratingModalGoals}
          onSubmit={rateGoals}
        />
      )}
    </div>
  );
}
