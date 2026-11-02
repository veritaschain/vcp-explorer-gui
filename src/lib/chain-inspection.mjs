/**
 * Inspect claimed links in a bounded, ordered API subset. No event digest,
 * signature, external anchor, source completeness or first-link boundary is
 * verified here. A mismatch can result from omitted or reordered events.
 */
export const MAX_CHAIN_EVENTS = 50;

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVENT_TYPES = new Set(['SIG', 'ORD', 'ACK', 'EXE', 'PRT', 'REJ', 'CXL', 'MOD',
  'CLS', 'ALG', 'RSK', 'AUD', 'HBT', 'ERR', 'REC', 'SNC']);
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})(?![\s\S])/;
const isId = value => typeof value === 'string' && value.length === 36 && UUID_V7.test(value);
const isHash = value => typeof value === 'string' && value.length === 64 && !/[^0-9a-fA-F]/.test(value);

export class ChainDataError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ChainDataError';
    this.code = code;
  }
}

function requireData(condition, code) {
  if (!condition) throw new ChainDataError(code);
}

// The browser receives JSON. Inspect only the fields used by this comparison;
// do not evaluate accessor properties supplied to the importable helper.
function field(value, key, code) {
  requireData(value !== null && typeof value === 'object' && !Array.isArray(value), code);
  const prototype = Object.getPrototypeOf(value);
  requireData(prototype === Object.prototype || prototype === null, code);
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  requireData(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, code);
  return descriptor.value;
}

function array(value, code) {
  requireData(Array.isArray(value), code);
  requireData(value.length <= MAX_CHAIN_EVENTS, 'EVENT_LIMIT_EXCEEDED');
  const copy = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index);
    requireData(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, code);
    copy.push(descriptor.value);
  }
  return copy;
}

function eventIds(value) {
  const ids = array(value, 'INVALID_EVENT_IDS');
  const seen = new Set();
  for (const id of ids) {
    requireData(isId(id), 'INVALID_EVENT_IDS');
    requireData(!seen.has(id), 'DUPLICATE_EVENT_ID');
    seen.add(id);
  }
  return ids;
}

/** Validate list IDs before using any of them in detail-request URLs. */
export function chainEventIds(response) {
  try {
    const events = array(field(response, 'events', 'INVALID_SEARCH_RESPONSE'), 'INVALID_SEARCH_RESPONSE');
    const total = field(response, 'total', 'INVALID_TOTAL');
    requireData(Number.isSafeInteger(total) && total >= events.length, 'INVALID_TOTAL');
    return eventIds(events.map(event => field(event, 'event_id', 'INVALID_EVENT_IDS')));
  } catch (error) {
    throw error instanceof ChainDataError ? error : new ChainDataError('INVALID_SEARCH_RESPONSE');
  }
}

/** Does not sort, infer genesis, or turn link matches into authenticated integrity. */
export function inspectChainLinks(traceId, requestedEventIds, details) {
  const result = {
    status: 'INVALID_DATA', reason: 'INVALID_EVENT_DATA', eventCount: 0,
    checkedLinks: 0, mismatchAt: null,
    cryptographicIntegrity: 'NOT_CHECKED', completeness: 'NOT_ESTABLISHED',
  };
  try {
    requireData(isId(traceId), 'INVALID_TRACE_ID');
    const requested = eventIds(requestedEventIds);
    const events = array(details, 'INVALID_EVENT_DATA');
    result.eventCount = events.length;
    requireData(events.length === requested.length, 'EVENT_COUNT_MISMATCH');
    const seen = new Set();
    const rows = events.map((event, index) => {
      const header = field(event, 'header', 'INVALID_EVENT_DATA');
      const security = field(event, 'security', 'INVALID_EVENT_DATA');
      const id = field(header, 'event_id', 'INVALID_EVENT_IDS');
      requireData(isId(id), 'INVALID_EVENT_IDS');
      requireData(!seen.has(id), 'DUPLICATE_EVENT_ID');
      seen.add(id);
      requireData(id === requested[index], 'EVENT_ID_MISMATCH');
      requireData(field(header, 'trace_id', 'TRACE_ID_MISMATCH') === traceId, 'TRACE_ID_MISMATCH');
      const eventType = field(header, 'event_type', 'INVALID_DISPLAY_FIELDS');
      const time = field(header, 'timestamp_iso', 'INVALID_DISPLAY_FIELDS');
      requireData(EVENT_TYPES.has(eventType) && typeof time === 'string' && time.length <= 64 &&
        ISO_TIME.test(time) && Number.isFinite(Date.parse(time)), 'INVALID_DISPLAY_FIELDS');
      const hash = field(security, 'event_hash', 'MALFORMED_HASH');
      const previous = field(security, 'prev_hash', 'MALFORMED_HASH');
      requireData(isHash(hash) && isHash(previous), 'MALFORMED_HASH');
      return { hash: hash.toLowerCase(), previous: previous.toLowerCase() };
    });
    if (rows.length < 2) return { ...result, status: 'INSUFFICIENT_DATA', reason: 'NOT_ENOUGH_EVENTS' };
    // All records passed their shape and request-binding checks before any
    // comparison is reported. The first record's previous link is unassessed.
    for (let index = 1; index < rows.length; index++) {
      result.checkedLinks++;
      if (rows[index].previous !== rows[index - 1].hash && result.mismatchAt === null) {
        result.mismatchAt = index;
      }
    }
    return { ...result, status: result.mismatchAt === null ? 'LINKS_MATCH' : 'LINK_MISMATCH',
      reason: result.mismatchAt === null ? 'CLAIMED_LINKS_MATCH' : 'CLAIMED_LINK_MISMATCH' };
  } catch (error) {
    return { ...result, reason: error instanceof ChainDataError ? error.code : 'INVALID_EVENT_DATA' };
  }
}
