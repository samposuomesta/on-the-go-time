import { useState } from 'react';
import { Plus, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

interface GoalInputProps {
  onSubmit: (goals: string[]) => void;
  targetWeek: number;
}

export const GoalInput = ({ onSubmit, targetWeek }: GoalInputProps) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<string[]>(['', '', '']);

  const handleGoalChange = (index: number, value: string) => {
    if (value.length > 140) return;
    const next = [...goals];
    next[index] = value;
    setGoals(next);
  };

  const canSubmit = goals.every((g) => g.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(goals);
    setGoals(['', '', '']);
  };

  return (
    <Card className="border-2 border-dashed border-primary/30">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-xl break-words">
              {t('weeklyGoals.setGoalsForWeek')} {targetWeek}
            </CardTitle>
            <CardDescription>{t('weeklyGoals.writeThreeGoals')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {goals.map((goal, index) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                goal.trim().length > 0
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {goal.trim().length > 0 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder={`${t('weeklyGoals.goal')} ${index + 1}…`}
                value={goal}
                onChange={(e) => handleGoalChange(index, e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <span
                  className={`text-xs ${
                    goal.length >= 120 ? 'text-warning' : 'text-muted-foreground'
                  }`}
                >
                  {goal.length}/140
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-2 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="bg-success text-success-foreground hover:bg-success/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('weeklyGoals.saveForWeek')} {targetWeek}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
