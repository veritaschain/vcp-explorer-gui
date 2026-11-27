import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDatePrecise } from '../src/lib/utils.ts';

test('UTC display keeps the supplied fractional seconds across offset and day boundaries', () => {
  const cases = [
    ['2026-11-27T00:00:01.123456789Z', '2026-11-27 00:00:01.123456789 UTC'],
    ['2026-11-27T01:02:03.123456+09:00', '2026-11-26 16:02:03.123456 UTC'],
    ['2026-11-27T23:59:59.000000001-0230', '2026-11-28 02:29:59.000000001 UTC'],
    ['2026-11-27T00:00:00.123400000Z', '2026-11-27 00:00:00.123400000 UTC'],
  ];
  for (const [input, expected] of cases) assert.equal(formatDatePrecise(input), expected);
});

test('Date, short fraction and whole-second inputs keep their millisecond display', () => {
  for (const input of [new Date('2026-11-27T03:00:00Z'), '2026-11-27T12:00:00+09:00']) {
    assert.equal(formatDatePrecise(input), '2026-11-27 03:00:00.000 UTC');
  }
  assert.equal(formatDatePrecise('2026-11-27T03:00:00.1Z'), '2026-11-27 03:00:00.100 UTC');
  assert.equal(formatDatePrecise('2026-11-27T03:00:00.321Z'), '2026-11-27 03:00:00.321 UTC');
});
