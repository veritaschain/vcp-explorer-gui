import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveUseMock } from '../src/lib/api-config.ts';

test('an explicit VITE_USE_MOCK=false enables real API requests', () => {
  assert.equal(resolveUseMock('false'), false);
});

test('the existing offline demonstration remains the default', () => {
  for (const value of [undefined, '', 'true']) {
    assert.equal(resolveUseMock(value), true);
  }
});

test('a misspelled API-mode setting cannot silently show synthetic data', () => {
  for (const value of ['False', '0', 'true ', 'flase']) {
    assert.throws(() => resolveUseMock(value), /VITE_USE_MOCK/);
  }
});
