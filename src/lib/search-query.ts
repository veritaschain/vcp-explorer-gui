import { EVENT_TYPE_CODES } from '../types/vcp.ts';
import type { EventSearchParams, EventType } from '../types/vcp.ts';

export const SEARCH_SYMBOLS = ['XAUUSD', 'EURUSD', 'BTCUSDT', 'USDJPY', 'GBPUSD'];

export function resolveSearchQuery(query: string): {
  params: EventSearchParams;
  eventId: string | null;
  error: string | null;
} {
  const value = query.trim();
  if (!value) return { params: {}, eventId: null, error: null };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    const id = value.toLowerCase();
    // UUID list searches use the API's trace_id filter. Opening an individual
    // event is a separate, explicit navigation to the event-detail endpoint.
    return { params: { trace_id: id }, eventId: id, error: null };
  }
  const upper = value.toUpperCase();
  if (SEARCH_SYMBOLS.includes(upper)) return { params: { symbol: upper }, eventId: null, error: null };
  if (Object.prototype.hasOwnProperty.call(EVENT_TYPE_CODES, upper)) {
    return { params: { event_type: upper as EventType }, eventId: null, error: null };
  }
  return {
    params: {}, eventId: null,
    error: 'Unsupported search. Enter a Trace ID (UUID), a symbol from the filters, or an event type. Hash and free-text searches are not supported.',
  };
}
