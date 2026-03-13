import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export function ActionButton({ icon: Icon, label, onClick, variant = 'default', disabled, className = '' }: ActionButtonProps) {
  const variantClasses: Record<string, string> = {
    success: 'bg-success text-success-foreground hover:bg-success/90',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`touch-target flex flex-col items-center justify-center gap-1.5 h-auto py-4 px-3 rounded-xl ${variantClasses[variant]} ${className}`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium leading-tight text-center">{label}</span>
    </Button>
  );
}
