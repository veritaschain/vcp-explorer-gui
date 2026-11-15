import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSearchQuery, SEARCH_SYMBOLS } from '../src/lib/search-query.ts';

test('only an empty search intentionally selects the unfiltered list', () => {
  for (const value of ['', ' ', '\t\n']) {
    assert.deepEqual(resolveSearchQuery(value), { params: {}, eventId: null, error: null });
  }
});

test('supported symbols and event types are trimmed and case-insensitive', () => {
  for (const symbol of SEARCH_SYMBOLS) {
    assert.deepEqual(resolveSearchQuery(' ' + symbol.toLowerCase() + ' '), {
      params: { symbol }, eventId: null, error: null,
    });
  }
  assert.deepEqual(resolveSearchQuery(' exe '), {
    params: { event_type: 'EXE' }, eventId: null, error: null,
  });
});

test('UUIDs use the supported trace filter and offer a separate event-detail target', () => {
  const id = '01934e3a-6a1a-7c82-9d1b-000000000001';
  const result = resolveSearchQuery(' ' + id.toUpperCase() + ' ');
  assert.deepEqual(result.params, { trace_id: id });
  assert.equal(result.eventId, id);
  assert.equal(result.error, null);
  assert.equal(Object.hasOwn(result.params, 'event_id'), false);
});

test('hashes, unsupported free text and malformed identifiers fail visibly', () => {
  for (const value of ['a'.repeat(64), 'unknown input', '01934e3a', 'XAUUSD EURUSD', 'constructor']) {
    const result = resolveSearchQuery(value);
    assert.match(result.error, /Unsupported search/);
    assert.equal(result.eventId, null);
  }
});
