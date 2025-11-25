import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { verifyHashChain, truncateHash } from '@/lib/crypto';
import { formatDate, cn, getEventTypeColor, getEventTypeBgColor } from '@/lib/utils';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import type { EventType, EventDetailResponse } from '@/types/vcp';

export function HashChainPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(traceId || '');
  const [activeTraceId, setActiveTraceId] = useState(traceId || searchParams.get('trace_id') || '');

  // Fetch events by trace ID
  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['chain', activeTraceId],
    queryFn: () => vcpClient.searchEvents({ trace_id: activeTraceId, limit: 50 }),
    enabled: !!activeTraceId,
  });

  // Fetch full details for each event to get hash info
  const { data: eventDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['chainDetails', eventsData?.events.map(e => e.event_id)],
    queryFn: async () => {
      if (!eventsData?.events) return [];
      const details = await Promise.all(
        eventsData.events.map(e => vcpClient.getEventById(e.event_id))
      );
      return details;
    },
    enabled: !!eventsData?.events?.length,
  });

  // Verify hash chain integrity
  const chainVerification = eventDetails?.length
    ? verifyHashChain(
        eventDetails.map(e => ({
          event_hash: e.security.event_hash,
          prev_hash: e.security.prev_hash,
        }))
      )
    : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveTraceId(searchInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 text-vcp-400 hover:text-white hover:bg-vcp-800/50 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-vcp-400" />
            Hash Chain Visualizer
          </h1>
          <p className="text-sm text-vcp-400">Track transaction lifecycle and verify hash chain integrity</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vcp-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Trace ID to visualize transaction lifecycle..."
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Visualize Chain
          </button>
        </form>

        {/* Sample Trace IDs */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-vcp-500">Try:</span>
          {[
            '01934e3a-6a1a-7000-8000-aaaaaaaaaaaa',
            '01934e3b-5b2b-7000-9000-bbbbbbbbbbbb',
          ].map((id) => (
            <button
              key={id}
              onClick={() => {
                setSearchInput(id);
                setActiveTraceId(id);
              }}
              className="px-2 py-1 text-xs font-mono text-vcp-400 bg-vcp-800/50 
                       rounded hover:bg-vcp-700/50 transition-all"
            >
              {truncateHash(id, 8)}
            </button>
          ))}
        </div>
      </div>

      {/* Chain Integrity Status */}
      {chainVerification && (
        <div
          className={cn(
            'p-4 rounded-lg border flex items-center gap-4',
            chainVerification.isValid
              ? 'bg-verify-500/10 border-verify-500/30'
              : 'bg-reject-500/10 border-reject-500/30'
          )}
        >
          {chainVerification.isValid ? (
            <CheckCircle2 className="w-8 h-8 text-verify-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-reject-400 flex-shrink-0" />
          )}
          <div>
            <h3
              className={cn(
                'font-semibold',
                chainVerification.isValid ? 'text-verify-400' : 'text-reject-400'
              )}
            >
              {chainVerification.isValid
                ? 'Hash Chain Integrity Verified'
                : 'Hash Chain Integrity Broken'}
            </h3>
            <p className="text-sm text-vcp-400">
              {chainVerification.isValid
                ? `All ${eventDetails?.length} events in the chain are properly linked.`
                : `Chain broken at event index ${chainVerification.brokenAt}. Previous hash does not match.`}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || detailsLoading) && activeTraceId && (
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-vcp-400 mx-auto mb-4 animate-spin" />
          <p className="text-vcp-400">Loading hash chain...</p>
        </div>
      )}

      {/* No Trace ID */}
      {!activeTraceId && (
        <div className="glass-card p-12 text-center">
          <LinkIcon className="w-12 h-12 text-vcp-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Enter a Trace ID</h3>
          <p className="text-vcp-400 max-w-md mx-auto">
            A Trace ID links related events in a transaction lifecycle (SIG → ORD → ACK → EXE).
            Enter a Trace ID above to visualize the hash chain.
          </p>
        </div>
      )}

      {/* Chain Visualization */}
      {eventDetails && eventDetails.length > 0 && !detailsLoading && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Transaction Lifecycle ({eventDetails.length} events)
          </h2>

          {/* Horizontal Chain View */}
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-stretch gap-0 min-w-max">
              {eventDetails.map((event, index) => (
                <ChainNode
                  key={event.header.event_id}
                  event={event}
                  index={index}
                  isLast={index === eventDetails.length - 1}
                  isFirst={index === 0}
                  isBroken={chainVerification?.brokenAt === index}
                  prevEvent={index > 0 ? eventDetails[index - 1] : undefined}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-vcp-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-verify-500 rounded-full" />
              <span className="text-xs text-vcp-400">Valid Link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-reject-500 rounded-full" />
              <span className="text-xs text-vcp-400">Broken Link</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-vcp-500 rounded-full" />
              <span className="text-xs text-vcp-400">Genesis (prev_hash = 0)</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Hash Table */}
      {eventDetails && eventDetails.length > 0 && !detailsLoading && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Hash Chain Details</h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Timestamp</th>
                  <th>Event Hash</th>
                  <th>Previous Hash</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {eventDetails.map((event, index) => {
                  const isGenesis = event.security.prev_hash === '0000000000000000000000000000000000000000000000000000000000000000';
                  const prevEvent = index > 0 ? eventDetails[index - 1] : null;
                  const isValid = isGenesis || (prevEvent && event.security.prev_hash === prevEvent.security.event_hash);

                  return (
                    <tr key={event.header.event_id}>
                      <td className="font-mono text-vcp-400">{index}</td>
                      <td>
                        <EventTypeBadge type={event.header.event_type as EventType} size="sm" />
                      </td>
                      <td className="text-sm text-vcp-300">
                        {formatDate(event.header.timestamp_iso)}
                      </td>
                      <td>
                        <code className="text-xs font-mono text-verify-400">
                          {truncateHash(event.security.event_hash, 12)}
                        </code>
                      </td>
                      <td>
                        <code className={cn(
                          'text-xs font-mono',
                          isGenesis ? 'text-vcp-500' : 'text-vcp-300'
                        )}>
                          {isGenesis ? '(genesis)' : truncateHash(event.security.prev_hash, 12)}
                        </code>
                      </td>
                      <td>
                        {isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-verify-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-reject-400" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">How Hash Chain Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">1</span>
            </div>
            <h3 className="font-medium text-white mb-2">Event Hashing</h3>
            <p className="text-sm text-vcp-400">
              Each event is hashed using SHA-256 after JSON canonicalization (RFC 8785).
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">2</span>
            </div>
            <h3 className="font-medium text-white mb-2">Chain Linking</h3>
            <p className="text-sm text-vcp-400">
              Each event includes the hash of the previous event in its <code className="text-xs">prev_hash</code> field.
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-vcp-600/20 rounded-lg flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-vcp-400">3</span>
            </div>
            <h3 className="font-medium text-white mb-2">Tamper Detection</h3>
            <p className="text-sm text-vcp-400">
              Any modification to an event breaks the chain, making tampering immediately detectable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chain Node Component
interface ChainNodeProps {
  event: EventDetailResponse;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isBroken: boolean;
  prevEvent?: EventDetailResponse;
}

function ChainNode({ event, index, isFirst, isLast, isBroken, prevEvent }: ChainNodeProps) {
  const isGenesis = event.security.prev_hash === '0000000000000000000000000000000000000000000000000000000000000000';
  const isValidLink = isGenesis || (prevEvent && event.security.prev_hash === prevEvent.security.event_hash);

  return (
    <div className="flex items-stretch">
      {/* Connector from previous */}
      {!isFirst && (
        <div className="flex items-center">
          <div
            className={cn(
              'w-12 h-1',
              isBroken ? 'bg-reject-500' : 'bg-verify-500/50'
            )}
          />
          {isBroken && (
            <div className="absolute -mt-8">
              <AlertTriangle className="w-4 h-4 text-reject-400" />
            </div>
          )}
        </div>
      )}

      {/* Node */}
      <Link
        to={`/events/${event.header.event_id}`}
        className={cn(
          'relative flex flex-col items-center p-4 rounded-lg border transition-all hover:scale-105',
          'bg-vcp-800/50 hover:bg-vcp-800/70',
          isBroken
            ? 'border-reject-500/50'
            : isGenesis
              ? 'border-vcp-500/50'
              : 'border-verify-500/30'
        )}
        style={{ minWidth: '160px' }}
      >
        {/* Event Type Badge */}
        <EventTypeBadge type={event.header.event_type as EventType} />

        {/* Timestamp */}
        <span className="text-xs text-vcp-400 mt-2">
          {new Date(event.header.timestamp_iso).toLocaleTimeString()}
        </span>

        {/* Event Hash */}
        <div className="mt-3 text-center">
          <span className="text-[10px] text-vcp-500 uppercase tracking-wider">Hash</span>
          <code className="block text-xs font-mono text-verify-400 mt-0.5">
            {truncateHash(event.security.event_hash, 6)}
          </code>
        </div>

        {/* Prev Hash */}
        <div className="mt-2 text-center">
          <span className="text-[10px] text-vcp-500 uppercase tracking-wider">Prev</span>
          <code
            className={cn(
              'block text-xs font-mono mt-0.5',
              isGenesis ? 'text-vcp-500' : isBroken ? 'text-reject-400' : 'text-vcp-300'
            )}
          >
            {isGenesis ? '000...000' : truncateHash(event.security.prev_hash, 6)}
          </code>
        </div>

        {/* Status Indicator */}
        <div
          className={cn(
            'absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full',
            isBroken ? 'bg-reject-500' : isGenesis ? 'bg-vcp-500' : 'bg-verify-500'
          )}
        />

        {/* Index */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-vcp-900 rounded text-xs text-vcp-400">
          #{index}
        </div>
      </Link>

      {/* Connector to next */}
      {!isLast && (
        <div className="flex items-center">
          <ArrowRight className="w-4 h-4 text-vcp-600 mx-1" />
        </div>
      )}
    </div>
  );
}
