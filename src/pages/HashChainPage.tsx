import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Link as LinkIcon, Search, AlertTriangle, Loader2, Minus, Check, X } from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { isValidUUIDv7, truncateHash } from '@/lib/crypto';
import { chainEventIds, inspectChainLinks, MAX_CHAIN_EVENTS, type ChainInspection } from '@/lib/chain-inspection.mjs';
import { formatDate, cn } from '@/lib/utils';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import type { EventDetailResponse } from '@/types/vcp';

const reasonMessages: Record<string, string> = {
  INVALID_TRACE_ID: 'Enter a complete UUID v7 Trace ID.',
  INVALID_EVENT_IDS: 'The event list contains an invalid identifier.',
  DUPLICATE_EVENT_ID: 'The response repeats an event identifier.',
  INVALID_SEARCH_RESPONSE: 'The event search returned an unsupported response.',
  INVALID_TOTAL: 'The reported event count is inconsistent with the returned list.',
  EVENT_LIMIT_EXCEEDED: 'The response exceeds the inspection limit.',
  INVALID_EVENT_DATA: 'The event details are incomplete or malformed.',
  EVENT_COUNT_MISMATCH: 'The number of detail records does not match the requested events.',
  EVENT_ID_MISMATCH: 'An event detail does not match the requested event identifier.',
  TRACE_ID_MISMATCH: 'An event detail belongs to a different trace.',
  MALFORMED_HASH: 'A recorded hash is not a 64-character hexadecimal value.',
  INVALID_DISPLAY_FIELDS: 'An event contains an unsupported type or timestamp.',
  NOT_ENOUGH_EVENTS: 'At least two returned events are needed to compare adjacent links.',
  CLAIMED_LINK_MISMATCH: 'At least one previous-hash value differs from the preceding returned event hash.',
  CLAIMED_LINKS_MATCH: 'The adjacent hash references match in the returned order.',
};

const resultTitles: Record<ChainInspection['status'], string> = {
  LINKS_MATCH: 'Link values match',
  LINK_MISMATCH: 'Link values differ',
  INSUFFICIENT_DATA: 'Not enough events to compare',
  INVALID_DATA: 'Returned data cannot be inspected',
};

export function HashChainPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTraceId = (traceId || searchParams.get('trace_id') || '').trim().toLowerCase();
  const [searchInput, setSearchInput] = useState(activeTraceId);
  const usingMock = vcpClient.isUsingMock();
  const source = usingMock ? 'synthetic' : 'api';
  const validTrace = activeTraceId.length === 36 && isValidUUIDv7(activeTraceId);

  useEffect(() => setSearchInput(activeTraceId), [activeTraceId]);

  // A single query binds the list, requested detail IDs and result to one trace.
  // Cancellations and errors never reuse a previously displayed result.
  const query = useQuery({
    queryKey: ['chain-inspection', source, activeTraceId],
    enabled: validTrace,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const events = await vcpClient.searchEvents({ trace_id: activeTraceId, limit: MAX_CHAIN_EVENTS }, signal);
      const ids = chainEventIds(events);
      const details = await Promise.all(ids.map(id => vcpClient.getEventById(id, signal)));
      signal.throwIfAborted();
      if (vcpClient.isUsingMock() !== usingMock) throw new Error('Data source changed during inspection');
      return {
        traceId: activeTraceId,
        source,
        total: events.total,
        details,
        inspection: inspectChainLinks(activeTraceId, ids, details),
      };
    },
  });

  const visible = validTrace && query.fetchStatus === 'idle' && query.status === 'success' &&
    query.data?.traceId === activeTraceId && query.data.source === source ? query.data : null;
  const result = visible?.inspection;
  const details = visible && result?.status !== 'INVALID_DATA' ? visible.details : null;
  const inputError = !!activeTraceId && !validTrace;

  const selectTrace = (value: string) => {
    const next = value.trim().toLowerCase();
    setSearchInput(next);
    if (next === activeTraceId && validTrace) {
      void query.refetch();
      return;
    }
    navigate({ pathname: '/chain', search: next ? '?trace_id=' + encodeURIComponent(next) : '' });
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center gap-4">
        <Link to="/" aria-label="Back to dashboard" className="p-2 text-vcp-300 hover:text-white hover:bg-vcp-800/50 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-vcp-300 shrink-0" />
            Hash Chain Link Inspection
          </h1>
          <p className="text-sm text-vcp-300">Compare recorded hash references for a trace.</p>
        </div>
      </div>

      <div data-testid="chain-source" className="rounded-lg border border-vcp-600 bg-vcp-800/40 p-4">
        <p className="font-medium text-white">{usingMock ? 'Synthetic demo data' : 'Configured API data'}</p>
        <p className="mt-1 text-sm text-vcp-300">
          {usingMock
            ? 'These sample hash values are synthetic and are not hashes of the displayed event payloads.'
            : 'Records are supplied by the configured API. Their source and contents are not authenticated by this page.'}
        </p>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <form onSubmit={event => { event.preventDefault(); selectTrace(searchInput); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="chain-trace-id" className="mb-2 block text-sm font-medium text-vcp-200">Trace ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vcp-300" />
              <input id="chain-trace-id" value={searchInput} onChange={event => setSearchInput(event.target.value)}
                placeholder="Enter a UUID v7 Trace ID" maxLength={128} autoComplete="off"
                className="input-field pl-10" aria-describedby="chain-scope" />
            </div>
          </div>
          <button type="submit" className="btn-primary shrink-0">Inspect links</button>
        </form>
        {usingMock && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-vcp-300">Sample traces:</span>
            {['01934e3a-6a1a-7000-8000-aaaaaaaaaaaa', '01934e3b-5b2b-7000-9000-bbbbbbbbbbbb'].map((id, index) => (
              <button key={id} type="button" onClick={() => selectTrace(id)}
                className="rounded bg-vcp-800/50 px-3 py-2 text-xs text-vcp-200 hover:bg-vcp-700/50">
                Sample {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="chain-scope" className="glass-card p-4 sm:p-6 text-sm text-vcp-300">
        <h2 className="font-semibold text-white">What this page checks</h2>
        <p className="mt-2">Event identifiers and trace membership are checked before comparing adjacent recorded hash values in the returned order.</p>
        <p className="mt-2"><strong className="text-vcp-100">Record integrity is not verified.</strong> Event payload hashes, signatures and external anchors are not checked. The first event's predecessor and completeness of the trace are not established.</p>
        <p className="mt-2">A trace can omit intervening events from a larger sequence. Different link values alone do not establish tampering.</p>
        <Link to="/evidence-demo" className="mt-3 inline-flex items-center gap-1 text-vcp-200 underline underline-offset-4">
          Open the separate signed-evidence demo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {(inputError || query.isError) && (
        <div data-testid="chain-error" role="alert" className="rounded-lg border border-reject-500/40 bg-reject-500/10 p-4">
          <h2 className="font-semibold text-white">Inspection unavailable</h2>
          <p className="mt-1 text-sm text-vcp-200">
            {inputError ? reasonMessages.INVALID_TRACE_ID : 'The requested event data could not be loaded or was malformed. Check the Trace ID and try again.'}
          </p>
          <p className="mt-1 text-sm text-vcp-300">No comparison result is shown.</p>
        </div>
      )}

      {query.isPaused && (
        <div data-testid="chain-paused" role="status" className="glass-card p-8 text-center">
          <h2 className="font-semibold text-white">Waiting for a connection</h2>
          <p className="mt-2 text-sm text-vcp-300">The requested trace has not been refreshed. No comparison result is shown.</p>
        </div>
      )}

      {query.isFetching && (
        <div data-testid="chain-loading" role="status" className="glass-card p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-vcp-300" />
          <p className="text-vcp-200">Loading the requested trace…</p>
        </div>
      )}

      {!activeTraceId && (
        <div className="glass-card p-8 text-center">
          <h2 className="font-semibold text-white">Enter a Trace ID</h2>
          <p className="mt-2 text-sm text-vcp-300">Inspect a returned sequence of related events.</p>
        </div>
      )}

      {visible && result && visible.details.length === 0 && result.status === 'INSUFFICIENT_DATA' ? (
        <div data-testid="chain-empty" role="status" className="glass-card p-8 text-center">
          <h2 className="font-semibold text-white">No events returned for this Trace ID</h2>
          <p className="mt-2 text-sm text-vcp-300">No links were compared. This does not establish that no event occurred.</p>
        </div>
      ) : result && visible ? (
        <div data-testid="chain-result" data-status={result.status} role="status"
          className={cn('rounded-lg border p-4 sm:p-6',
            result.status === 'LINK_MISMATCH' || result.status === 'INVALID_DATA'
              ? 'border-reject-500/40 bg-reject-500/10' : 'border-vcp-600 bg-vcp-800/40')}>
          <h2 className="font-semibold text-white">{resultTitles[result.status]}</h2>
          <p className="mt-2 text-sm text-vcp-200">{reasonMessages[result.reason] || 'The supplied values could not be compared.'}</p>
          <p className="mt-2 text-sm text-vcp-300">
            {result.eventCount} returned events · {result.checkedLinks} adjacent links compared.
            {visible.total > visible.details.length ? ' The search reports more events than this page retrieved.' : ''}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-vcp-300">Trace: {activeTraceId}</p>
          <p className="mt-2 text-sm text-vcp-200">Cryptographic integrity: not checked. Completeness: not established.</p>
        </div>
      ) : null}

      {details && details.length > 0 && (
        <>
          <div className="glass-card min-w-0 p-4 sm:p-6">
            <h2 className="mb-5 text-lg font-semibold text-white">Returned sequence ({details.length} events)</h2>
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex min-w-max items-stretch">
                {details.map((event, index) => (
                  <ChainNode key={event.header.event_id} event={event} index={index}
                    link={index === 0 ? 'BOUNDARY' : event.security.prev_hash.toLowerCase() === details[index - 1].security.event_hash.toLowerCase() ? 'MATCH' : 'DIFFERENT'} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-vcp-300">The first displayed event is a boundary of this selection; a zero previous hash does not authenticate a genesis event.</p>
          </div>

          <div className="glass-card min-w-0 p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Recorded hash references</h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <caption className="sr-only">Recorded hash values and adjacent comparisons for the selected trace</caption>
                <thead><tr>
                  <th scope="col">#</th><th scope="col">Type</th><th scope="col">Timestamp</th>
                  <th scope="col">Event hash</th><th scope="col">Previous hash</th><th scope="col">Comparison</th>
                </tr></thead>
                <tbody>
                  {details.map((event, index) => {
                    const match = index > 0 && event.security.prev_hash.toLowerCase() === details[index - 1].security.event_hash.toLowerCase();
                    return (
                      <tr key={event.header.event_id}>
                        <td>{index}</td>
                        <td><EventTypeBadge type={event.header.event_type} size="sm" /></td>
                        <td className="text-sm text-vcp-200">{formatDate(event.header.timestamp_iso)}</td>
                        <td><code className="font-mono text-xs text-vcp-200">{truncateHash(event.security.event_hash, 12)}</code></td>
                        <td><code className="font-mono text-xs text-vcp-200">{truncateHash(event.security.prev_hash, 12)}</code></td>
                        <td><span className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-vcp-200">
                          {index === 0 ? <Minus className="h-4 w-4" /> : match ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 text-reject-400" />}
                          {index === 0 ? 'Not compared' : match ? 'Matches' : 'Differs'}
                        </span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChainNode({ event, index, link }: { event: EventDetailResponse; index: number; link: 'BOUNDARY' | 'MATCH' | 'DIFFERENT' }) {
  return (
    <div className="flex items-stretch">
      {index > 0 && (
        <div className="flex items-center px-2" aria-hidden="true">
          {link === 'DIFFERENT' ? <AlertTriangle className="h-5 w-5 text-reject-400" /> : <ArrowRight className="h-5 w-5 text-vcp-300" />}
        </div>
      )}
      <Link to={'/events/' + encodeURIComponent(event.header.event_id)}
        className={cn('flex w-44 flex-col items-center rounded-lg border bg-vcp-800/50 p-4 hover:bg-vcp-800/70',
          link === 'DIFFERENT' ? 'border-reject-500/50' : 'border-vcp-600')}>
        <span className="mb-2 text-xs text-vcp-300">#{index} · {link === 'BOUNDARY' ? 'Selection boundary' : link === 'MATCH' ? 'Reference matches' : 'Reference differs'}</span>
        <EventTypeBadge type={event.header.event_type} />
        <span className="mt-2 text-xs text-vcp-300">{new Date(event.header.timestamp_iso).toLocaleTimeString()}</span>
        <span className="mt-3 text-xs text-vcp-300">Event hash</span>
        <code className="mt-1 font-mono text-xs text-vcp-200">{truncateHash(event.security.event_hash, 6)}</code>
        <span className="mt-2 text-xs text-vcp-300">Previous hash</span>
        <code className="mt-1 font-mono text-xs text-vcp-200">{truncateHash(event.security.prev_hash, 6)}</code>
      </Link>
    </div>
  );
}
