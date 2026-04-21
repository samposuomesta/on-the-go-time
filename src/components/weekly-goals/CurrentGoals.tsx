import { Target, Clock, CheckCircle, CalendarClock, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WeeklyGoals, RATING_CLASSES, RATING_LABELS_EN, RATING_LABELS_FI } from '@/types/weekly-goals';
import { useTranslation } from '@/lib/i18n';

interface Props {
  weeklyGoals: WeeklyGoals;
  isFutureWeek?: boolean;
  onTriggerRating?: () => void;
}

export const CurrentGoals = ({ weeklyGoals, isFutureWeek = false, onTriggerRating }: Props) => {
  const { t, language } = useTranslation();
  const labels = language === 'fi' ? RATING_LABELS_FI : RATING_LABELS_EN;
  const showRateButton = !isFutureWeek && !weeklyGoals.isRated && onTriggerRating;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 flex-wrap text-base sm:text-lg">
                <span className="break-words">
                  {weeklyGoals.isAdminAssigned
                    ? `${weeklyGoals.templateName || t('weeklyGoals.template')} - ${t('weeklyGoals.week')} ${weeklyGoals.weekNumber}`
                    : `${t('weeklyGoals.title')} - ${t('weeklyGoals.week')} ${weeklyGoals.weekNumber}`}
                </span>
                {weeklyGoals.isAdminAssigned && (
                  <Badge variant="secondary" className="text-xs">{t('weeklyGoals.template')}</Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {showRateButton && (
              <Button onClick={onTriggerRating} variant="outline" size="sm" className="gap-2 h-9">
                <Star className="w-4 h-4" />
                {t('weeklyGoals.rate')}
              </Button>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {weeklyGoals.isRated ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{t('weeklyGoals.rated')}</span>
                </>
              ) : isFutureWeek ? (
                <>
                  <CalendarClock className="w-4 h-4" />
                  <span>{t('weeklyGoals.upcoming')}</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>{t('weeklyGoals.inProgress')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="space-y-3">
          {weeklyGoals.goals.map((goal, index) => (
            <div key={goal.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground leading-relaxed break-words">{goal.text}</p>
                {goal.comment && (
                  <p className="text-sm text-muted-foreground mt-1 italic break-words">"{goal.comment}"</p>
                )}
              </div>
              {goal.rating ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`px-2.5 py-1 rounded-md text-sm font-semibold border ${RATING_CLASSES[goal.rating]}`}>
                    {goal.rating}
                  </div>
                  <span className="text-xs text-muted-foreground hidden md:inline">{labels[goal.rating]}</span>
                </div>
              ) : (
                <CheckCircle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {!isFutureWeek && !weeklyGoals.isRated && (
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t('weeklyGoals.rateOnFriday')}</span>
            </div>
          </div>
        )}

        {isFutureWeek && (
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CalendarClock className="w-4 h-4" />
              <span>{t('weeklyGoals.activatesOn')} {t('weeklyGoals.week')} {weeklyGoals.weekNumber}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
