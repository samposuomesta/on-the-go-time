import { History, TrendingUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyGoals, RATING_CLASSES, RATING_LABELS_EN, RATING_LABELS_FI } from '@/types/weekly-goals';
import { useTranslation } from '@/lib/i18n';

interface Props {
  pastWeeks: WeeklyGoals[];
  title?: string;
}

export const WeeklyHistory = ({ pastWeeks, title }: Props) => {
  const { t, language } = useTranslation();
  const labels = language === 'fi' ? RATING_LABELS_FI : RATING_LABELS_EN;
  if (pastWeeks.length === 0) return null;

  const allRatings = pastWeeks.flatMap((w) => w.goals.map((g) => g.rating || 0)).filter((r) => r > 0);
  const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
  const successRate = allRatings.length ? (allRatings.filter((r) => r >= 3).length / allRatings.length) * 100 : 0;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{title ?? t('weeklyGoals.myHistory')}</CardTitle>
              <p className="text-sm text-muted-foreground">{pastWeeks.length} {t('weeklyGoals.weeksRated')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4">
            <div className="py-2 px-3 sm:px-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-xs sm:text-sm text-muted-foreground">{t('weeklyGoals.successRate')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">{successRate.toFixed(0)}%</div>
            </div>
            <div className="py-2 px-3 sm:px-4 rounded-lg border bg-muted/30">
              <div className="text-xs sm:text-sm text-muted-foreground">{t('weeklyGoals.average')}</div>
              <div className="text-xl sm:text-2xl font-bold">{avgRating.toFixed(1)}/4</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="space-y-4">
          {pastWeeks.map((week) => (
            <div key={week.id} className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('weeklyGoals.week')} {week.weekNumber}</span>
                  {week.templateName && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {week.templateName}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{week.year}</span>
              </div>

              <div className="space-y-2">
                {week.goals.map((goal, idx) => (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-start gap-2 sm:gap-3 p-2.5 rounded-lg bg-background">
                      <div className="w-6 h-6 rounded text-xs flex items-center justify-center bg-muted text-muted-foreground font-medium shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="flex-1 text-sm break-words">{goal.text}</span>
                      {goal.rating && (
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <div className={`px-2 py-0.5 rounded-md text-sm font-semibold border ${RATING_CLASSES[goal.rating]}`}>
                            {goal.rating}
                          </div>
                          <span className="text-xs text-muted-foreground hidden md:inline">{labels[goal.rating]}</span>
                        </div>
                      )}
                    </div>
                    {goal.comment && (
                      <div className="ml-2 sm:ml-9 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="break-words">{goal.comment}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
