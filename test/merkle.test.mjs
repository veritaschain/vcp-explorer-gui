import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { verifyMerkleProof, hexToBytes } from '../src/lib/crypto.ts';
import { DEMO_MERKLE_FIXTURE } from '../src/mock-data/merkle-fixture.ts';
import { getMockEvents, getMockEventDetail, getMockProof, getMockCertificate } from '../src/mock-data/events.ts';

// A top-down RFC 6962 reference tree. This uses node:crypto, never the GUI's
// hash helpers or bottom-up verification traversal, to obtain expected proofs.
const hash = (...parts) => createHash('sha256').update(Buffer.concat(parts)).digest();
const leaf = data => hash(Buffer.from([0]), data);
const node = (left, right) => hash(Buffer.from([1]), left, right);
const leaves = Array.from({ length: 33 }, (_, i) => hash(Buffer.from(String(i))));
const hex = bytes => bytes.toString('hex');

function referenceTree(data) {
  if (data.length === 1) return { root: leaf(data[0]), paths: [[]] };
  let split = 1;
  while (split * 2 < data.length) split *= 2;
  const left = referenceTree(data.slice(0, split));
  const right = referenceTree(data.slice(split));
  return {
    root: node(left.root, right.root),
    paths: [
      ...left.paths.map(path => [...path, hex(right.root)]),
      ...right.paths.map(path => [...path, hex(left.root)]),
    ],
  };
}

for (const size of [1, 2, 3, 5, 6, 7, 9, 12, 15, 16, 17, 31, 32, 33]) {
  test(`RFC inclusion verifies every leaf of a ${size}-leaf tree`, async () => {
    const tree = referenceTree(leaves.slice(0, size));
    for (let index = 0; index < size; index++) {
      const result = await verifyMerkleProof(hex(leaves[index]), index, tree.paths[index], hex(tree.root), size);
      assert.equal(result.isValid, true, `size=${size} index=${index}: ${result.error}`);
      assert.equal(result.computedRoot, hex(tree.root));
    }
  });
}

test('the three-leaf/rightmost regression has a fixed independently computed root', async () => {
  const data = ['11', '22', '33'].map(pair => Buffer.from(pair.repeat(32), 'hex'));
  const tree = referenceTree(data);
  const expectedRoot = '9bee4401962e94b921336a7910a5a9718836ffcbc545dde0a3f34d858beb5752';
  assert.equal(hex(tree.root), expectedRoot);
  assert.equal(tree.paths[2].length, 1);
  assert.equal((await verifyMerkleProof(hex(data[2]), 2, tree.paths[2], expectedRoot, 3)).isValid, true);
});

test('the supplied tree size is required even for a one-leaf proof', async () => {
  const args = [hex(leaves[0]), 0, [], hex(leaf(leaves[0]))];
  for (const size of [undefined, null, '1', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const result = await verifyMerkleProof(...args, size);
    assert.equal(result.isValid, false, `tree size ${String(size)} must not pass`);
    assert.match(result.error, /tree size/i);
  }
});

test('leaf indices are safe integers in the supplied tree', async () => {
  for (const index of [-1, 0.5, 1, 999, undefined, null, '0', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const result = await verifyMerkleProof(hex(leaves[0]), index, [], hex(leaf(leaves[0])), 1);
    assert.equal(result.isValid, false, `index ${String(index)} must not pass`);
    assert.match(result.error, /index/i);
  }
});

test('malformed leaf, root and sibling hashes are rejected without byte coercion', async () => {
  const one = referenceTree(leaves.slice(0, 1));
  const two = referenceTree(leaves.slice(0, 2));
  const malformed = ['', '00', '0'.repeat(63), '0'.repeat(65), 'zz'.repeat(32),
    ` ${'0'.repeat(64)}`, `0x${'0'.repeat(64)}`, null, undefined, 0, ['00']];
  for (const value of malformed) {
    assert.equal((await verifyMerkleProof(value, 0, [], hex(one.root), 1)).isValid, false);
    assert.equal((await verifyMerkleProof(hex(leaves[0]), 0, [], value, 1)).isValid, false);
    assert.equal((await verifyMerkleProof(hex(leaves[0]), 0, [value], hex(two.root), 2)).isValid, false);
  }
  const zeroRoot = hex(leaf(Buffer.alloc(32)));
  assert.equal((await verifyMerkleProof('zz'.repeat(32), 0, [], zeroRoot, 1)).isValid, false);
  assert.throws(() => hexToBytes('zz'), /hex/i);
  assert.throws(() => hexToBytes('0'), /hex/i);
  assert.deepEqual(hexToBytes('00Ff'), new Uint8Array([0, 255]));
});

test('audit paths must be arrays and have the exact length required by index and size', async () => {
  const tree = referenceTree(leaves.slice(0, 3));
  const args = [hex(leaves[2]), 2];
  for (const path of [undefined, null, {}, tree.paths[2][0], [],
    [...tree.paths[2], hex(leaves[0])], new Array(1)]) {
    assert.equal((await verifyMerkleProof(...args, path, hex(tree.root), 3)).isValid, false);
  }
  assert.equal((await verifyMerkleProof(hex(leaves[0]), 0, [hex(leaves[1])], hex(leaf(leaves[0])), 1)).isValid, false);
  assert.equal((await verifyMerkleProof(...args, new Array(54), hex(tree.root), 3)).isValid, false);
});

test('well-formed but changed leaf, root, sibling or index cannot pass', async () => {
  const tree = referenceTree(leaves.slice(0, 5));
  const original = [hex(leaves[3]), 3, tree.paths[3], hex(tree.root), 5];
  const altered = [
    [hex(leaves[4]), ...original.slice(1)],
    [original[0], 2, ...original.slice(2)],
    [original[0], original[1], [hex(leaves[0]), ...tree.paths[3].slice(1)], original[3], 5],
    [...original.slice(0, 3), hex(leaves[0]), 5],
    [...original.slice(0, 4), 9],
  ];
  for (const args of altered) assert.equal((await verifyMerkleProof(...args)).isValid, false);
  const upper = original.map((value, index) => index === 0 || index === 3
    ? value.toUpperCase() : index === 2 ? value.map(x => x.toUpperCase()) : value);
  assert.equal((await verifyMerkleProof(...upper)).isValid, true);
});

test('indices above the 32-bit range retain their high bits', async () => {
  const data = Buffer.alloc(32, 7);
  let root = leaf(data);
  const path = [];
  for (let level = 0; level < 33; level++) {
    path.push(hex(root));
    root = node(root, root);
  }
  const result = await verifyMerkleProof(hex(data), 2 ** 33 - 1, path, hex(root), 2 ** 33);
  assert.equal(result.isValid, true, result.error);
});

test('demo fixture has a genuine 12-leaf proof for every displayed hash', async () => {
  const fixture = DEMO_MERKLE_FIXTURE;
  const tree = referenceTree(leaves.slice(0, fixture.tree_size));
  assert.equal(fixture.tree_size, 12);
  assert.deepEqual(fixture.event_hashes, leaves.slice(0, 12).map(hex));
  assert.equal(fixture.root_hash, hex(tree.root));
  assert.deepEqual(fixture.audit_paths, tree.paths);
  for (let index = 0; index < fixture.tree_size; index++) {
    const result = await verifyMerkleProof(fixture.event_hashes[index], index,
      [...fixture.audit_paths[index]], fixture.root_hash, fixture.tree_size);
    assert.equal(result.isValid, true, result.error);
  }
});

test('the demo caller supplies a bound index and tree size for each displayed event', async () => {
  const events = getMockEvents().events;
  assert.equal(events.length, DEMO_MERKLE_FIXTURE.tree_size);
  for (const [index, event] of events.entries()) {
    const proof = getMockProof(event.event_id);
    const detail = getMockEventDetail(event.event_id);
    const certificate = getMockCertificate(event.event_id);
    assert.equal(proof.merkle_proof.leaf_index, index);
    assert.equal(proof.merkle_proof.tree_size, events.length);
    assert.equal(proof.event_hash, detail.security.event_hash);
    assert.equal(proof.merkle_proof.root_hash, detail.security.merkle_root);
    assert.equal(event.hash_prefix, proof.event_hash.slice(0, 6));
    assert.deepEqual(certificate.merkle_proof, proof.merkle_proof);
    const result = await verifyMerkleProof(proof.event_hash, proof.merkle_proof.leaf_index,
      proof.merkle_proof.audit_path, proof.merkle_proof.root_hash, proof.merkle_proof.tree_size);
    assert.equal(result.isValid, true, result.error);
  }
  assert.throws(() => getMockProof('missing-event'), /not available/i);
});
