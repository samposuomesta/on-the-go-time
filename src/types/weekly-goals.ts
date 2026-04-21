export interface Goal {
  id: string;
  text: string;
  rating?: 1 | 2 | 3 | 4;
  comment?: string;
  createdAt: Date;
}

export interface WeeklyGoals {
  id: string;
  weekNumber: number;
  year: number;
  goals: Goal[];
  isRated: boolean;
  createdAt: Date;
  isAdminAssigned?: boolean;
  templateName?: string;
  templateId?: string;
}

export interface TeamMemberWeeklyGoals extends WeeklyGoals {
  memberId: string;
  memberName: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
}

export const RATING_LABELS_EN: Record<1 | 2 | 3 | 4, string> = {
  1: 'Did not succeed',
  2: 'Partly succeeded',
  3: 'Succeeded',
  4: 'Succeeded very well',
};

export const RATING_LABELS_FI: Record<1 | 2 | 3 | 4, string> = {
  1: 'Ei onnistunut',
  2: 'Ei ihan onnistunut',
  3: 'Onnistui',
  4: 'Onnistui tosi hyvin',
};

// Map ratings to semantic Tailwind utility classes (uses design tokens)
export const RATING_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-destructive/15 text-destructive border-destructive/30',
  2: 'bg-warning/15 text-warning border-warning/30',
  3: 'bg-primary/15 text-primary border-primary/30',
  4: 'bg-success/15 text-success border-success/30',
};
