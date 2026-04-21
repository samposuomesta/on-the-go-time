import { useState } from 'react';
import { Star, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WeeklyGoals, RATING_CLASSES, RATING_LABELS_EN, RATING_LABELS_FI } from '@/types/weekly-goals';
import { useTranslation } from '@/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyGoals: WeeklyGoals;
  onSubmit: (weeklyGoals: WeeklyGoals, ratings: Record<string, 1 | 2 | 3 | 4>, comments: Record<string, string>) => void;
}

export const RatingModal = ({ open, onOpenChange, weeklyGoals, onSubmit }: Props) => {
  const { t, language } = useTranslation();
  const labels = language === 'fi' ? RATING_LABELS_FI : RATING_LABELS_EN;
  const [ratings, setRatings] = useState<Record<string, 1 | 2 | 3 | 4>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showOptional, setShowOptional] = useState<Record<string, boolean>>({});

  const isCommentRequired = (id: string) => ratings[id] === 1 || ratings[id] === 2;
  const isCommentValid = (id: string) => !isCommentRequired(id) || (comments[id]?.trim().length ?? 0) > 0;

  const allRated = weeklyGoals.goals.every((g) => ratings[g.id]);
  const allCommentsValid = weeklyGoals.goals.every((g) => isCommentValid(g.id));
  const canSubmit = allRated && allCommentsValid;

  const ratingOptions: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 w-[calc(100vw-1rem)] sm:w-full">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg sm:text-xl">{t('weeklyGoals.rateTitle')}</DialogTitle>
              <DialogDescription>{t('weeklyGoals.week')} {weeklyGoals.weekNumber}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {weeklyGoals.goals.map((goal, index) => {
            const rating = ratings[goal.id];
            const needsComment = rating === 1 || rating === 2;
            const canAddOptional = rating === 3 || rating === 4;
            return (
              <div key={goal.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-foreground">{goal.text}</p>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {ratingOptions.map((r) => {
                    const selected = rating === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRatings((prev) => ({ ...prev, [goal.id]: r }))}
                        className={`p-2 sm:p-3 rounded-xl border-2 transition-colors text-center min-h-[64px] ${
                          selected
                            ? `${RATING_CLASSES[r]} border-current`
                            : 'border-border/50 hover:border-primary/30 bg-background'
                        }`}
                      >
                        <div className="text-xl sm:text-2xl font-bold mb-0.5">{r}</div>
                        <div className="text-[10px] sm:text-xs leading-tight text-muted-foreground">
                          {labels[r]}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {rating && (
                  <div className="mt-4">
                    {needsComment && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-destructive flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {t('weeklyGoals.commentRequired')}
                        </label>
                        <Textarea
                          placeholder={t('weeklyGoals.commentPlaceholder')}
                          value={comments[goal.id] || ''}
                          onChange={(e) => setComments((p) => ({ ...p, [goal.id]: e.target.value }))}
                          className={`min-h-[80px] resize-none ${!isCommentValid(goal.id) ? 'border-destructive' : ''}`}
                        />
                      </div>
                    )}

                    {canAddOptional && !showOptional[goal.id] && (
                      <button
                        onClick={() => setShowOptional((p) => ({ ...p, [goal.id]: true }))}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t('weeklyGoals.addOptionalComment')}
                      </button>
                    )}

                    {canAddOptional && showOptional[goal.id] && (
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {t('weeklyGoals.commentOptional')}
                        </label>
                        <Textarea
                          value={comments[goal.id] || ''}
                          onChange={(e) => setComments((p) => ({ ...p, [goal.id]: e.target.value }))}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <CheckCircle2 className={`w-4 h-4 ${canSubmit ? 'text-success' : ''}`} />
            <span>{Object.keys(ratings).length}/{weeklyGoals.goals.length} {t('weeklyGoals.ratedCount')}</span>
          </div>
          <Button
            onClick={() => canSubmit && onSubmit(weeklyGoals, ratings, comments)}
            disabled={!canSubmit}
            size="lg"
            className="bg-success text-success-foreground hover:bg-success/90 w-full sm:w-auto"
          >
            {t('weeklyGoals.saveRatings')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
