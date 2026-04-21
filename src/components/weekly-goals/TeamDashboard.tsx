import { Users, TrendingUp, CalendarX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TeamMemberWeeklyGoals,
  RATING_CLASSES,
  RATING_LABELS_EN,
  RATING_LABELS_FI,
  GOAL_CATEGORY_LABELS_EN,
  GOAL_CATEGORY_LABELS_FI,
} from '@/types/weekly-goals';
import { useTranslation } from '@/lib/i18n';

interface Props {
  teamGoals: TeamMemberWeeklyGoals[];
  currentWeek: number;
  selectedWeek: number;
}

export const TeamDashboard = ({ teamGoals, currentWeek, selectedWeek }: Props) => {
  const { t, language } = useTranslation();
  const labels = language === 'fi' ? RATING_LABELS_FI : RATING_LABELS_EN;
  const categoryLabels = language === 'fi' ? GOAL_CATEGORY_LABELS_FI : GOAL_CATEGORY_LABELS_EN;

  const ratedGoals = teamGoals.filter((m) => m.isRated).flatMap((m) => m.goals).filter((g) => g.rating);
  const stats = ratedGoals.length
    ? {
        avgRating: ratedGoals.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGoals.length,
        successRate: (ratedGoals.filter((g) => (g.rating || 0) >= 3).length / ratedGoals.length) * 100,
      }
    : null;

  if (teamGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle>{t('weeklyGoals.teamGoals')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('weeklyGoals.week')} {selectedWeek}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <CalendarX className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {t('weeklyGoals.noGoalsForWeek')} {selectedWeek}
            </h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle>{t('weeklyGoals.teamGoals')}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">{t('weeklyGoals.week')} {selectedWeek}</p>
                {selectedWeek === currentWeek && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    {t('weeklyGoals.current')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4">
              <div className="py-2 px-3 sm:px-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs sm:text-sm text-muted-foreground">{t('weeklyGoals.successRate')}</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold">{stats.successRate.toFixed(0)}%</div>
              </div>
              <div className="py-2 px-3 sm:px-4 rounded-lg border bg-muted/30">
                <div className="text-xs sm:text-sm text-muted-foreground">{t('weeklyGoals.average')}</div>
                <div className="text-xl sm:text-2xl font-bold">{stats.avgRating.toFixed(1)}/4</div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {teamGoals.map((member) => (
          <div
            key={member.id}
            className={`p-3 sm:p-4 rounded-xl border ${
              member.isRated ? 'bg-muted/20 border-border/40' : 'bg-warning/5 border-warning/30'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  member.isRated ? 'bg-primary/10 text-primary' : 'bg-warning/20 text-warning'
                }`}
              >
                {member.memberName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{member.memberName}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs ${member.isRated ? 'text-muted-foreground' : 'text-warning font-medium'}`}>
                    {member.isRated ? t('weeklyGoals.rated') : t('weeklyGoals.notRatedYet')}
                  </span>
                  {member.templateName && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {member.templateName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {member.goals.map((goal, idx) => (
                <div key={goal.id} className="flex items-start gap-2 sm:gap-3 p-2.5 rounded-lg bg-background">
                  <div className="w-6 h-6 rounded text-xs flex items-center justify-center bg-muted text-muted-foreground font-medium shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-1 text-[10px] font-normal h-5 px-1.5">
                      {categoryLabels[goal.category]}
                    </Badge>
                    <div className="text-sm break-words">{goal.text}</div>
                  </div>
                  {goal.rating ? (
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <div className={`px-2 py-0.5 rounded-md text-sm font-semibold border ${RATING_CLASSES[goal.rating]}`}>
                        {goal.rating}
                      </div>
                      <span className="text-xs text-muted-foreground hidden md:inline">{labels[goal.rating]}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 italic shrink-0 mt-0.5">
                      {t('weeklyGoals.notRated')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
