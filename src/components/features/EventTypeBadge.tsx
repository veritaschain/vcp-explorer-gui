import { cn, getEventTypeColor, getEventTypeBgColor } from '@/lib/utils';
import type { EventType } from '@/types/vcp';

interface EventTypeBadgeProps {
  type: EventType;
  showCode?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const eventTypeLabels: Record<EventType, string> = {
  SIG: 'Signal',
  ORD: 'Order',
  ACK: 'Acknowledged',
  EXE: 'Executed',
  PRT: 'Partial Fill',
  REJ: 'Rejected',
  CXL: 'Cancelled',
  MOD: 'Modified',
  CLS: 'Closed',
  ALG: 'Algorithm',
  RSK: 'Risk',
  AUD: 'Audit',
  HBT: 'Heartbeat',
  ERR: 'Error',
  REC: 'Recovery',
  SNC: 'Sync',
};

export function EventTypeBadge({ type, showCode = false, size = 'md' }: EventTypeBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded',
        getEventTypeBgColor(type),
        getEventTypeColor(type),
        sizeClasses[size]
      )}
    >
      {type}
      {showCode && (
        <span className="opacity-60">#{eventTypeLabels[type]}</span>
      )}
    </span>
  );
}
