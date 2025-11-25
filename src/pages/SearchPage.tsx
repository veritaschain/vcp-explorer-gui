import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
import { formatDate, cn, getEventTypeColor } from '@/lib/utils';
import { EventTypeBadge } from '@/components/features/EventTypeBadge';
import { StatusBadge } from '@/components/features/StatusBadge';
import type { EventType, EventSearchParams } from '@/types/vcp';
import { EVENT_TYPE_CODES } from '@/types/vcp';

const EVENT_TYPES = Object.keys(EVENT_TYPE_CODES) as EventType[];
const SYMBOLS = ['XAUUSD', 'EURUSD', 'BTCUSDT', 'USDJPY', 'GBPUSD'];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [symbol, setSymbol] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build search params
  const buildParams = (): EventSearchParams => {
    const params: EventSearchParams = {
      limit,
      offset: (page - 1) * limit,
    };

    // Check if query looks like UUID (trace_id or event_id)
    if (query) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(query)) {
        params.trace_id = query;
      } else if (SYMBOLS.includes(query.toUpperCase())) {
        params.symbol = query.toUpperCase();
      } else if (EVENT_TYPES.includes(query.toUpperCase() as EventType)) {
        params.event_type = query.toUpperCase() as EventType;
      }
    }

    if (eventType) params.event_type = eventType;
    if (symbol) params.symbol = symbol;
    if (startTime) params.start_time = new Date(startTime).toISOString();
    if (endTime) params.end_time = new Date(endTime).toISOString();

    return params;
  };

  // Fetch events
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['searchEvents', query, eventType, symbol, startTime, endTime, page],
    queryFn: () => vcpClient.searchEvents(buildParams()),
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
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

  // Calculate pagination
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Search Events</h1>
        <p className="text-vcp-400 mt-1">
          Search and filter VCP events by ID, type, symbol, or time range
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Event ID, Trace ID, Symbol, or Event Type..."
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
                  onChange={(e) => setEventType(e.target.value as EventType | '')}
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
                  onChange={(e) => setSymbol(e.target.value)}
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
                  onChange={(e) => setStartTime(e.target.value)}
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
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}
      </div>

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
              {data ? (
                <>
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, data.total)} of{' '}
                  <span className="text-white font-medium">{data.total}</span> results
                </>
              ) : (
                'Loading...'
              )}
            </span>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-vcp-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-vcp-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-vcp-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-vcp-400 mx-auto mb-4 animate-spin" />
            <p className="text-vcp-400">Searching events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-reject-400 mx-auto mb-4" />
            <p className="text-reject-400">Error loading events. Please try again.</p>
          </div>
        )}

        {/* No Results */}
        {data && data.events.length === 0 && (
          <div className="p-12 text-center">
            <Search className="w-8 h-8 text-vcp-600 mx-auto mb-4" />
            <p className="text-vcp-400">No events found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-vcp-400 hover:text-white"
            >
              Clear filters and try again
            </button>
          </div>
        )}

        {/* Results List */}
        {data && data.events.length > 0 && (
          <div className="divide-y divide-vcp-800">
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
        {data && totalPages > 1 && (
          <div className="p-4 border-t border-vcp-800 flex justify-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm text-vcp-400 hover:text-white disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-vcp-400 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-8 h-8 text-sm rounded',
                      page === pageNum
                        ? 'bg-vcp-600 text-white'
                        : 'text-vcp-400 hover:text-white hover:bg-vcp-800/50'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-vcp-400 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm text-vcp-400 hover:text-white disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
