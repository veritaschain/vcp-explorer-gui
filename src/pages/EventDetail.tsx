import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Shield,
  FileText,
  Link as LinkIcon,
  Clock,
  Hash,
  Activity,
  AlertCircle,
  CheckCircle2,
  Brain,
  AlertTriangle,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { formatDatePrecise, copyToClipboard, cn } from '@/lib/utils';
import { truncateHash } from '@/lib/crypto';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import { StatusBadge } from '@/components/features/StatusBadge';
import { useState } from 'react';
import type { EventType } from '@/types/vcp';

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => vcpClient.getEventById(eventId!),
    enabled: !!eventId,
  });

  const handleCopy = async (value: string, field: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-vcp-800/30 rounded-lg animate-pulse w-1/3" />
        <div className="glass-card p-6 space-y-4">
          <div className="h-8 bg-vcp-800/30 rounded animate-pulse w-1/2" />
          <div className="h-24 bg-vcp-800/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-reject-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Event Not Found</h2>
        <p className="text-vcp-400 mb-6">
          The event with ID <code className="font-mono text-vcp-300">{eventId}</code> could not be found.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Event Details</h1>
            <p className="text-sm text-vcp-400 font-mono">{event.header.event_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/events/${eventId}/proof`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Merkle Proof
          </Link>
          <Link
            to={`/events/${eventId}/certificate`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Certificate
          </Link>
        </div>
      </div>

      {/* Header Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <EventTypeBadge type={event.header.event_type as EventType} size="lg" />
            <StatusBadge status={event.header.anchor_status || 'PENDING'} />
          </div>
          <div className="text-right">
            <p className="text-sm text-vcp-400">Event Type Code</p>
            <p className="text-lg font-mono text-white">#{event.header.event_type_code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Event ID */}
          <FieldDisplay
            label="Event ID"
            value={event.header.event_id}
            icon={Hash}
            copyable
            onCopy={() => handleCopy(event.header.event_id, 'event_id')}
            copied={copiedField === 'event_id'}
          />

          {/* Trace ID */}
          <FieldDisplay
            label="Trace ID"
            value={event.header.trace_id}
            icon={LinkIcon}
            copyable
            onCopy={() => handleCopy(event.header.trace_id, 'trace_id')}
            copied={copiedField === 'trace_id'}
            link={`/chain/${event.header.trace_id}`}
          />

          {/* Timestamp */}
          <FieldDisplay
            label="Timestamp"
            value={formatDatePrecise(event.header.timestamp_iso)}
            icon={Clock}
            subtext={`Precision: ${event.header.timestamp_precision}`}
          />

          {/* Venue */}
          <FieldDisplay
            label="Venue"
            value={event.header.venue_id}
            icon={Activity}
          />

          {/* Symbol */}
          <FieldDisplay
            label="Symbol"
            value={event.header.symbol}
            icon={Activity}
          />

          {/* Clock Sync */}
          <FieldDisplay
            label="Clock Sync"
            value={event.header.clock_sync_status}
            icon={Clock}
            status={event.header.clock_sync_status === 'PTP_LOCKED' ? 'success' : 'warning'}
          />
        </div>
      </div>

      {/* Payload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VCP-TRADE */}
        {event.payload.trade_data && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-vcp-400" />
              VCP-TRADE
            </h3>
            <div className="space-y-3">
              {event.payload.trade_data.order_id && (
                <DataRow label="Order ID" value={event.payload.trade_data.order_id} />
              )}
              {event.payload.trade_data.broker_order_id && (
                <DataRow label="Broker Order ID" value={event.payload.trade_data.broker_order_id} />
              )}
              {event.payload.trade_data.side && (
                <DataRow
                  label="Side"
                  value={event.payload.trade_data.side}
                  className={event.payload.trade_data.side === 'BUY' ? 'text-verify-400' : 'text-reject-400'}
                />
              )}
              {event.payload.trade_data.order_type && (
                <DataRow label="Order Type" value={event.payload.trade_data.order_type} />
              )}
              {event.payload.trade_data.price && (
                <DataRow label="Price" value={event.payload.trade_data.price} />
              )}
              {event.payload.trade_data.quantity && (
                <DataRow label="Quantity" value={event.payload.trade_data.quantity} />
              )}
              {event.payload.trade_data.execution_price && (
                <DataRow label="Execution Price" value={event.payload.trade_data.execution_price} />
              )}
              {event.payload.trade_data.executed_qty && (
                <DataRow label="Executed Qty" value={event.payload.trade_data.executed_qty} />
              )}
              {event.payload.trade_data.commission && (
                <DataRow label="Commission" value={event.payload.trade_data.commission} />
              )}
              {event.payload.trade_data.slippage && (
                <DataRow label="Slippage" value={event.payload.trade_data.slippage} />
              )}
              {event.payload.trade_data.reject_reason && (
                <DataRow
                  label="Reject Reason"
                  value={event.payload.trade_data.reject_reason}
                  className="text-reject-400"
                />
              )}
            </div>
          </div>
        )}

        {/* VCP-RISK */}
        {event.payload.vcp_risk && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-anomaly-400" />
              VCP-RISK
            </h3>
            <div className="space-y-3">
              {event.payload.vcp_risk.snapshot.total_equity && (
                <DataRow label="Total Equity" value={`$${event.payload.vcp_risk.snapshot.total_equity}`} />
              )}
              {event.payload.vcp_risk.snapshot.margin_level_pct && (
                <DataRow label="Margin Level" value={`${event.payload.vcp_risk.snapshot.margin_level_pct}%`} />
              )}
              {event.payload.vcp_risk.snapshot.unrealized_pnl && (
                <DataRow
                  label="Unrealized P&L"
                  value={`$${event.payload.vcp_risk.snapshot.unrealized_pnl}`}
                  className={parseFloat(event.payload.vcp_risk.snapshot.unrealized_pnl) >= 0 ? 'text-verify-400' : 'text-reject-400'}
                />
              )}
              {event.payload.vcp_risk.snapshot.max_drawdown_pct && (
                <DataRow label="Max Drawdown" value={`${event.payload.vcp_risk.snapshot.max_drawdown_pct}%`} />
              )}
              {event.payload.vcp_risk.snapshot.circuit_breaker_status && (
                <DataRow
                  label="Circuit Breaker"
                  value={event.payload.vcp_risk.snapshot.circuit_breaker_status}
                  className={event.payload.vcp_risk.snapshot.circuit_breaker_status === 'NORMAL' ? 'text-verify-400' : 'text-anomaly-400'}
                />
              )}
            </div>

            {/* Triggered Controls */}
            {event.payload.vcp_risk.triggered_controls && event.payload.vcp_risk.triggered_controls.length > 0 && (
              <div className="mt-4 pt-4 border-t border-vcp-800">
                <h4 className="text-sm font-semibold text-anomaly-400 mb-2">Triggered Controls</h4>
                {event.payload.vcp_risk.triggered_controls.map((control, i) => (
                  <div key={i} className="p-3 bg-anomaly-500/10 border border-anomaly-500/20 rounded-lg mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{control.control_name}</span>
                      <span className="text-xs px-2 py-1 bg-anomaly-500/20 text-anomaly-400 rounded">
                        {control.action}
                      </span>
                    </div>
                    <p className="text-sm text-vcp-400 mt-1">Trigger Value: {control.trigger_value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VCP-GOV */}
        {event.payload.vcp_gov && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              VCP-GOV
            </h3>
            <div className="space-y-3">
              <DataRow label="Algorithm ID" value={event.payload.vcp_gov.algo_id} />
              {event.payload.vcp_gov.algo_version && (
                <DataRow label="Version" value={event.payload.vcp_gov.algo_version} />
              )}
              {event.payload.vcp_gov.algo_type && (
                <DataRow label="Type" value={event.payload.vcp_gov.algo_type} />
              )}
              {event.payload.vcp_gov.risk_classification && (
                <DataRow
                  label="Risk Classification"
                  value={event.payload.vcp_gov.risk_classification}
                  className={
                    event.payload.vcp_gov.risk_classification === 'LOW'
                      ? 'text-verify-400'
                      : event.payload.vcp_gov.risk_classification === 'MEDIUM'
                        ? 'text-anomaly-400'
                        : 'text-reject-400'
                  }
                />
              )}
              {event.payload.vcp_gov.model_hash && (
                <DataRow label="Model Hash" value={truncateHash(event.payload.vcp_gov.model_hash.replace('sha256:', ''), 12)} mono />
              )}
            </div>

            {/* Decision Factors */}
            {event.payload.vcp_gov.decision_factors?.features && (
              <div className="mt-4 pt-4 border-t border-vcp-800">
                <h4 className="text-sm font-semibold text-vcp-300 mb-3">Decision Factors (SHAP)</h4>
                <div className="space-y-2">
                  {event.payload.vcp_gov.decision_factors.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-vcp-400 w-32">{feature.name}</span>
                      <div className="flex-1 h-2 bg-vcp-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-vcp-500 to-verify-500"
                          style={{ width: `${parseFloat(feature.contribution) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-vcp-500 w-12 text-right">
                        {(parseFloat(feature.contribution) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                {event.payload.vcp_gov.decision_factors.confidence_score && (
                  <div className="mt-3 flex items-center justify-between p-2 bg-vcp-800/30 rounded">
                    <span className="text-sm text-vcp-400">Confidence Score</span>
                    <span className="text-lg font-bold text-white">
                      {(parseFloat(event.payload.vcp_gov.decision_factors.confidence_score) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Security Section */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-verify-400" />
            Security (VCP-SEC)
          </h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Event Hash</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs text-verify-400 font-mono bg-vcp-800/50 p-2 rounded truncate">
                  {event.security.event_hash}
                </code>
                <button
                  onClick={() => handleCopy(event.security.event_hash, 'event_hash')}
                  className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded"
                >
                  {copiedField === 'event_hash' ? (
                    <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-vcp-500 uppercase tracking-wider">Previous Hash</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs text-vcp-300 font-mono bg-vcp-800/50 p-2 rounded truncate">
                  {event.security.prev_hash}
                </code>
                <button
                  onClick={() => handleCopy(event.security.prev_hash, 'prev_hash')}
                  className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded"
                >
                  {copiedField === 'prev_hash' ? (
                    <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {event.security.signature && (
              <div>
                <span className="text-xs text-vcp-500 uppercase tracking-wider">
                  Signature ({event.security.sign_algo})
                </span>
                <code className="block text-xs text-vcp-300 font-mono bg-vcp-800/50 p-2 rounded mt-1 truncate">
                  {event.security.signature}
                </code>
              </div>
            )}

            {event.security.merkle_root && (
              <div>
                <span className="text-xs text-vcp-500 uppercase tracking-wider">Merkle Root</span>
                <code className="block text-xs text-purple-400 font-mono bg-vcp-800/50 p-2 rounded mt-1 truncate">
                  {event.security.merkle_root}
                </code>
              </div>
            )}

            {/* Anchor Info */}
            {event.security.anchor && (
              <div className="mt-4 p-4 bg-verify-500/10 border border-verify-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-verify-400" />
                  <span className="text-sm font-medium text-verify-400">Blockchain Anchored</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-vcp-400">Network</span>
                    <span className="text-white">{event.security.anchor.network}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-vcp-400">Block</span>
                    <span className="text-white font-mono">#{event.security.anchor.block_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-vcp-400">TX Hash</span>
                    <a
                      href={`https://etherscan.io/tx/${event.security.anchor.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vcp-300 hover:text-white flex items-center gap-1"
                    >
                      {truncateHash(event.security.anchor.tx_hash, 8)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Field Display Component
interface FieldDisplayProps {
  label: string;
  value: string;
  icon: typeof Hash;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  link?: string;
  subtext?: string;
  status?: 'success' | 'warning' | 'error';
}

function FieldDisplay({
  label,
  value,
  icon: Icon,
  copyable,
  onCopy,
  copied,
  link,
  subtext,
  status,
}: FieldDisplayProps) {
  const statusColors = {
    success: 'text-verify-400',
    warning: 'text-anomaly-400',
    error: 'text-reject-400',
  };

  return (
    <div>
      <span className="text-xs text-vcp-500 uppercase tracking-wider flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <div className="flex items-center gap-2 mt-1">
        {link ? (
          <Link
            to={link}
            className="text-sm font-mono text-vcp-300 hover:text-white truncate flex items-center gap-1"
          >
            {value}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </Link>
        ) : (
          <span className={cn('text-sm font-mono truncate', status ? statusColors[status] : 'text-white')}>
            {value}
          </span>
        )}
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="p-1 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded flex-shrink-0"
          >
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-verify-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
      {subtext && <span className="text-xs text-vcp-500">{subtext}</span>}
    </div>
  );
}

// Data Row Component
interface DataRowProps {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}

function DataRow({ label, value, className, mono }: DataRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-vcp-400">{label}</span>
      <span className={cn('text-sm text-white', mono && 'font-mono', className)}>{value}</span>
    </div>
  );
}
