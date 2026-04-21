import { useState } from 'react';
import { Plus, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import {
  GoalCategory,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABELS_EN,
  GOAL_CATEGORY_LABELS_FI,
} from '@/types/weekly-goals';

interface GoalInputProps {
  onSubmit: (goals: { text: string; category: GoalCategory }[]) => void;
  targetWeek: number;
}

interface DraftGoal {
  text: string;
  category: GoalCategory;
}

const EMPTY: DraftGoal[] = [
  { text: '', category: 'other' },
  { text: '', category: 'other' },
  { text: '', category: 'other' },
];

export const GoalInput = ({ onSubmit, targetWeek }: GoalInputProps) => {
  const { t, language } = useTranslation();
  const categoryLabels = language === 'fi' ? GOAL_CATEGORY_LABELS_FI : GOAL_CATEGORY_LABELS_EN;
  const [goals, setGoals] = useState<DraftGoal[]>(EMPTY);

  const handleTextChange = (index: number, value: string) => {
    if (value.length > 140) return;
    const next = [...goals];
    next[index] = { ...next[index], text: value };
    setGoals(next);
  };

  const handleCategoryChange = (index: number, value: GoalCategory) => {
    const next = [...goals];
    next[index] = { ...next[index], category: value };
    setGoals(next);
  };

  const canSubmit = goals.every((g) => g.text.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(goals);
    setGoals(EMPTY);
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
                goal.text.trim().length > 0
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {goal.text.trim().length > 0 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Select
                value={goal.category}
                onValueChange={(v) => handleCategoryChange(index, v as GoalCategory)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('weeklyGoals.category')} />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder={`${t('weeklyGoals.goal')} ${index + 1}…`}
                value={goal.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <span
                  className={`text-xs ${
                    goal.text.length >= 120 ? 'text-warning' : 'text-muted-foreground'
                  }`}
                >
                  {goal.text.length}/140
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
