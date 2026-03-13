import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ApprovalCardProps {
  id: string;
  title: string;
  subtitle: string;
  detail?: string;
  status: string;
  onApprove: (id: string, status: 'approved' | 'rejected') => void;
  isPending?: boolean;
}

export function ApprovalCard({ id, title, subtitle, detail, status, onApprove, isPending }: ApprovalCardProps) {
  const statusConfig: Record<string, { icon: typeof Clock; className: string }> = {
    pending: { icon: Clock, className: 'bg-warning/15 text-warning border-warning/30' },
    approved: { icon: CheckCircle2, className: 'bg-success/15 text-success border-success/30' },
    rejected: { icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  };
  const cfg = statusConfig[status] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-card rounded-lg border border-border p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
        </div>
        <Badge variant="outline" className={cn("text-xs gap-1 capitalize shrink-0", cfg.className)}>
          <StatusIcon className="h-3 w-3" />
          {status}
        </Badge>
      </div>
      {status === 'pending' && (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs gap-1 border-success/30 text-success hover:bg-success/10"
            disabled={isPending}
            onClick={() => { onApprove(id, 'approved'); toast.success('Approved'); }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={() => { onApprove(id, 'rejected'); toast.success('Rejected'); }}
          >
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
