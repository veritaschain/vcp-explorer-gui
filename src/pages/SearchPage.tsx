import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  X,
  ArrowRight,
  Calendar,
  Hash,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { vcpClient } from '@/lib/api-client';
import { resolveSearchQuery, SEARCH_SYMBOLS } from '@/lib/search-query';
import { formatDate, cn, getEventTypeColor } from '@/lib/utils';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import { StatusBadge } from '@/components/features/StatusBadge';
import type { EventType, EventSearchParams } from '@/types/vcp';
import { EVENT_TYPE_CODES } from '@/types/vcp';

const EVENT_TYPES = Object.keys(EVENT_TYPE_CODES) as EventType[];
const SYMBOLS = SEARCH_SYMBOLS;

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const urlQuery = searchParams.get('q') || '';
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [query, setQuery] = useState(urlQuery);
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [symbol, setSymbol] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // A global search can navigate to this same mounted page, including the same
  // URL after the local input changed. Start that navigation's search afresh.
  useEffect(() => {
    setQuery(urlQuery);
    setEventType('');
    setSymbol('');
    setStartTime('');
    setEndTime('');
    setPage(1);
  }, [location.key, urlQuery]);
  const queryInput = resolveSearchQuery(query);

  // Build search params
  const buildParams = (): EventSearchParams => {
    const params: EventSearchParams = {
      ...queryInput.params,
      limit,
      offset: (page - 1) * limit,
    };

    if (eventType) params.event_type = eventType;
    if (symbol) params.symbol = symbol;
    if (startTime) params.start_time = new Date(startTime).toISOString();
    if (endTime) params.end_time = new Date(endTime).toISOString();

    return params;
  };

  // Fetch events
  const { data: response, isLoading, isFetching, fetchStatus, error, refetch } = useQuery({
    queryKey: ['searchEvents', query, eventType, symbol, startTime, endTime, page],
    queryFn: ({ signal }) => vcpClient.searchEvents(buildParams(), signal),
    enabled: !queryInput.error,
  });
  const searchPaused = !queryInput.error && fetchStatus === 'paused';
  const data = queryInput.error || error || searchPaused ? undefined : response;

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.error) return;
    setPage(1);
    // A page change already starts the new query. Do not also refetch the old offset.
    if (page === 1) void refetch();
  };

  // Clear filters
  const clearFilters = () => {
    setQuery('');
    setEventType('');
    setSymbol('');
    setStartTime('');
    setEndTime('');
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = eventType || symbol || startTime || endTime;

  // The real API's total is the returned-page count, not a global match count.
  // A full page permits trying the next page; it does not establish one exists.
  const hasNextPage = data?.events.length === limit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Search Events</h1>
        <p className="text-vcp-400 mt-1">
          Search by Trace ID, event type, symbol, or time range. Open individual Event IDs separately.
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vcp-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              aria-label="Search query"
              placeholder="Search by Trace ID, Symbol, or Event Type..."
              className="input-field pl-12 text-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary flex items-center gap-2',
              showFilters && 'bg-vcp-700/50'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-vcp-400 rounded-full" />
            )}
          </button>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-vcp-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-vcp-400">Advanced Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-vcp-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Event Type */}
              <div>
                <label className="text-xs text-vcp-500 uppercase tracking-wider mb-1 block">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value as EventType | ''); setPage(1); }}
                  className="input-field"
                >
                  <option value="">All Types</option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type} - {EVENT_TYPE_CODES[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Symbol */}
              <div>
                <label className="text-xs text-vcp-500 uppercase tracking-wider mb-1 block">
                  Symbol
                </label>
                <select
                  value={symbol}
                  onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
                  className="input-field"
                >
                  <option value="">All Symbols</option>
                  {SYMBOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div>
                <label className="text-xs text-vcp-500 uppercase tracking-wider mb-1 block">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setPage(1); }}
                  className="input-field"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="text-xs text-vcp-500 uppercase tracking-wider mb-1 block">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setPage(1); }}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {queryInput.eventId && (
        <p className="text-sm text-vcp-300">
          UUID searches filter by Trace ID. For this individual event,{' '}
          <Link className="text-vcp-200 underline hover:text-white" to={`/events/${encodeURIComponent(queryInput.eventId)}`}>
            Open as Event ID
          </Link>.
        </p>
      )}

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-vcp-500 py-1">Quick filters:</span>
        {EVENT_TYPES.slice(0, 8).map((type) => (
          <button
            key={type}
            onClick={() => {
              setEventType(type);
              setPage(1);
            }}
            className={cn(
              'px-3 py-1 text-sm rounded-full border transition-all',
              eventType === type
                ? `${getEventTypeColor(type)} border-current bg-current/10`
                : 'text-vcp-400 border-vcp-700 hover:border-vcp-500'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="glass-card">
        {/* Results Header */}
        <div className="p-4 border-b border-vcp-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-vcp-400">
              {queryInput.error ? 'Search not run' : searchPaused ? 'Waiting for a connection' : error ? 'Results unavailable' : isFetching ? 'Searching...' : data ? (
                <>
                  {data.events.length > 0 && <>Showing {((page - 1) * limit) + 1}-{((page - 1) * limit) + data.events.length} · </>}
                  <span className="text-white font-medium">{data.events.length}</span> records returned
                </>
              ) : (
                'Loading...'
              )}
            </span>
          </div>

          <span className="text-sm text-vcp-400">Page {page}</span>
        </div>

        {/* Loading State */}
        {searchPaused && (
          <p role="status" className="p-12 text-center text-vcp-300">
            The search is waiting for a connection. No current results are shown.
          </p>
        )}
        {isLoading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-vcp-400 mx-auto mb-4 animate-spin" />
            <p className="text-vcp-400">Searching events...</p>
          </div>
        )}

        {/* Error State */}
        {(queryInput.error || (error && !searchPaused)) && (
          <div role="alert" className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-reject-400 mx-auto mb-4" />
            <p className="text-reject-400">{queryInput.error || 'Error loading events. No current results are available.'}</p>
            {!queryInput.error && (
              <button type="button" onClick={() => void refetch()} disabled={isFetching} className="btn-secondary mt-4">
                Retry search
              </button>
            )}
          </div>
        )}

        {/* No Results */}
        {data && data.events.length === 0 && (
          <div className="p-12 text-center">
            <Search className="w-8 h-8 text-vcp-600 mx-auto mb-4" />
            <p className="text-vcp-400">No events returned on this page.</p>
            <button
              onClick={page > 1 ? () => setPage(1) : clearFilters}
              disabled={isFetching}
              className="mt-4 text-sm text-vcp-400 hover:text-white"
            >
              {page > 1 ? 'Back to first page' : 'Clear filters and try again'}
            </button>
          </div>
        )}

        {/* Results List */}
        {data && data.events.length > 0 && (
          <div data-testid="search-results" className="divide-y divide-vcp-800">
            {data.events.map((event) => (
              <Link
                key={event.event_id}
                to={`/events/${event.event_id}`}
                className="flex items-center gap-4 p-4 hover:bg-vcp-800/30 transition-all group"
              >
                {/* Event Type */}
                <div className="w-20">
                  <EventTypeBadge type={event.type as EventType} />
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-white truncate">
                      {event.event_id}
                    </span>
                    <StatusBadge status={event.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-vcp-500">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {event.symbol}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(event.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {event.hash_prefix}...
                    </span>
                  </div>
                </div>

                {/* Venue */}
                <div className="hidden md:block text-sm text-vcp-400">
                  {event.venue}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-vcp-600 group-hover:text-vcp-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Pagination */}
        {(page > 1 || hasNextPage) && (
          <nav aria-label="Search result pages" className="p-4 border-t border-vcp-800 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1 || isFetching}
                className="px-3 py-1 text-sm text-vcp-400 hover:text-white disabled:opacity-50"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="inline-flex items-center gap-1 p-2 text-sm text-vcp-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft aria-hidden="true" className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage || isFetching}
                className="inline-flex items-center gap-1 p-2 text-sm text-vcp-400 hover:text-white disabled:opacity-50"
              >
                Next <ChevronRight aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-vcp-400">Total matching count is unavailable. A full page may have more results.</p>
          </nav>
        )}
      </div>
    </div>
  );
}
