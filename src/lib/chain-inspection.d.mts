export const MAX_CHAIN_EVENTS: 50;

export type ChainReason =
  | 'INVALID_TRACE_ID' | 'INVALID_EVENT_IDS' | 'DUPLICATE_EVENT_ID'
  | 'INVALID_SEARCH_RESPONSE' | 'INVALID_TOTAL' | 'EVENT_LIMIT_EXCEEDED'
  | 'INVALID_EVENT_DATA' | 'EVENT_COUNT_MISMATCH' | 'EVENT_ID_MISMATCH'
  | 'TRACE_ID_MISMATCH' | 'MALFORMED_HASH' | 'INVALID_DISPLAY_FIELDS'
  | 'NOT_ENOUGH_EVENTS' | 'CLAIMED_LINK_MISMATCH' | 'CLAIMED_LINKS_MATCH';

export class ChainDataError extends Error {
  readonly code: ChainReason;
  constructor(code: ChainReason);
}

export interface ChainInspection {
  status: 'LINKS_MATCH' | 'LINK_MISMATCH' | 'INSUFFICIENT_DATA' | 'INVALID_DATA';
  reason: ChainReason;
  eventCount: number;
  checkedLinks: number;
  /** The first mismatching adjacency's zero-based event index, otherwise null. */
  mismatchAt: number | null;
  cryptographicIntegrity: 'NOT_CHECKED';
  completeness: 'NOT_ESTABLISHED';
}

export function chainEventIds(response: unknown): string[];
export function inspectChainLinks(traceId: unknown, requestedEventIds: unknown, details: unknown): ChainInspection;
