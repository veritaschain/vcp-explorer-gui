import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bytesToHex, sha256 } from '../src/lib/crypto.ts';

const abcDigest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('SHA-256 matches the standard abc test vector', async () => {
  assert.equal(bytesToHex(await sha256(new TextEncoder().encode('abc'))), abcDigest);
});

test('SHA-256 respects a view offset and length', async () => {
  const bytes = new TextEncoder().encode('xabcx');
  assert.equal(bytesToHex(await sha256(bytes.subarray(1, 4))), abcDigest);
});

test('SHA-256 accepts shared backing storage by copying the supplied bytes', async () => {
  const bytes = new Uint8Array(new SharedArrayBuffer(3));
  bytes.set(new TextEncoder().encode('abc'));
  assert.equal(bytesToHex(await sha256(bytes)), abcDigest);
});
