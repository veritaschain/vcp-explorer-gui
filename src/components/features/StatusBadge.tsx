import { cn } from '@/lib/utils';
import type { AnchorStatus } from '@/types/vcp';

interface StatusBadgeProps {
  status: AnchorStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    ANCHORED: {
      dot: 'bg-verify-500 shadow-[0_0_8px_theme(colors.verify.500/50)]',
      text: 'text-verify-400',
      bg: 'bg-verify-500/10',
      label: 'Anchored',
    },
    PENDING: {
      dot: 'bg-anomaly-500 animate-pulse',
      text: 'text-anomaly-400',
      bg: 'bg-anomaly-500/10',
      label: 'Pending',
    },
    FAILED: {
      dot: 'bg-reject-500',
      text: 'text-reject-400',
      bg: 'bg-reject-500/10',
      label: 'Failed',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.text,
        sizeClasses[size]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
