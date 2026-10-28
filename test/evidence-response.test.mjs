import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEvidenceCases, parseEvidenceVerification } from '../src/lib/evidence-response.ts';

function report() {
  return {
    format: 'vcp-evidence-demo-verification/1',
    case_id: 'intact', case_title: 'Intact evidence', description: 'Synthetic parser test only.',
    sdk: { version: '0.1.0', spec_version: '1.2', spec_commit: 'test-commit' },
    scope: 'Local synthetic checks; no external proof.',
    local_status: 'VALID', overall_status: 'INDETERMINATE',
    checks: [
      { name: 'event_hash', status: 'VALID', group: 'batch', scope: 'local' },
      { name: 'signature', status: 'VALID', group: 'batch', scope: 'local' },
      { name: 'external_anchor', status: 'INDETERMINATE', reason: 'Proof missing', group: 'batch', scope: 'external' },
    ],
    notes: ['Not a conformance result.'],
    evidence: {
      events_jsonl: ' {"TimestampInt":1793115048123456789,"text":"原文"}\n',
      anchor_record_json: '{ "Timestamp":1793115048123456790 }\n',
      inclusion_proofs: [],
    },
    trust: { notice: 'Public demo key.', key_configured: true },
  };
}

test('raw evidence preserves integer digits, whitespace and UTF-8 text exactly', () => {
  const source = report();
  const parsed = parseEvidenceVerification(source, 'intact');
  assert.equal(parsed.evidence.events_jsonl, source.evidence.events_jsonl);
  assert.equal(parsed.evidence.anchor_record_json, source.evidence.anchor_record_json);
  assert.match(parsed.evidence.events_jsonl, /1793115048123456789/);
  assert.equal(parsed.local_status, 'VALID');
  assert.equal(parsed.overall_status, 'INDETERMINATE');
});

test('a response for another case is rejected instead of displayed under the selection', () => {
  assert.throws(() => parseEvidenceVerification(report(), 'tampered'), /case_id/);
});

test('INVALID takes precedence over missing evidence in both summaries', () => {
  const source = report();
  source.checks[0].status = 'INVALID';
  source.checks[1].status = 'INDETERMINATE';
  source.local_status = source.overall_status = 'INVALID';
  assert.equal(parseEvidenceVerification(source, 'intact').overall_status, 'INVALID');
  for (const field of ['local_status', 'overall_status']) {
    for (const wrong of ['VALID', 'INDETERMINATE']) {
      const changed = structuredClone(source);
      changed[field] = wrong;
      assert.throws(() => parseEvidenceVerification(changed, 'intact'), /conflicts with checks/);
    }
  }
});

test('missing local key cannot be displayed as local VALID', () => {
  const source = report();
  source.checks[1].status = 'INDETERMINATE';
  assert.throws(() => parseEvidenceVerification(source, 'intact'), /local_status/);
  source.local_status = 'INDETERMINATE';
  assert.equal(parseEvidenceVerification(source, 'intact').local_status, 'INDETERMINATE');
});

test('missing external evidence cannot be displayed as overall VALID', () => {
  const source = report();
  source.overall_status = 'VALID';
  assert.throws(() => parseEvidenceVerification(source, 'intact'), /overall_status/);
});

test('local or external check scopes cannot silently disappear', () => {
  for (const scope of ['local', 'external']) {
    const source = report();
    source.checks = source.checks.filter(check => check.scope !== scope);
    assert.throws(() => parseEvidenceVerification(source, 'intact'), /scope|checks/);
  }
});

test('a failed signature cannot be excluded from the local summary by relabeling its scope', () => {
  const source = report();
  source.checks[1].status = 'INVALID';
  source.checks[1].scope = 'external';
  source.overall_status = 'INVALID';
  // The declared summaries otherwise match this misleading scope partition.
  assert.throws(() => parseEvidenceVerification(source, 'intact'), /check.scope/);
  for (const name of ['external_anchor', 'root_authenticity']) {
    const changed = report();
    changed.checks[2].name = name;
    assert.equal(parseEvidenceVerification(changed, 'intact').checks[2].scope, 'external');
    changed.checks[2].scope = 'local';
    assert.throws(() => parseEvidenceVerification(changed, 'intact'), /check.scope/);
  }
});

test('positive summaries cannot accompany absent raw event or AnchorRecord strings', () => {
  for (const field of ['events_jsonl', 'anchor_record_json']) {
    for (const empty of ['', '  ', '\n\t\r\n']) {
      const source = report();
      source.evidence[field] = empty;
      assert.throws(() => parseEvidenceVerification(source, 'intact'), new RegExp(field));
    }
  }
});

test('unknown verdicts, empty checks, wrong formats and malformed trust fail visibly', () => {
  const mutations = [
    x => { x.local_status = 'PASSED'; },
    x => { x.checks[0].status = true; },
    x => { x.checks = []; },
    x => { x.format = 'future-format'; },
    x => { x.trust.key_configured = 'false'; },
  ];
  for (const mutate of mutations) {
    const source = report();
    mutate(source);
    assert.throws(() => parseEvidenceVerification(source, 'intact'), /unsupported or incomplete report/);
  }
});

test('case discovery rejects duplicate IDs and unsupported data rather than selecting ambiguously', () => {
  const source = { format: 'vcp-evidence-demo/1', sdk_version: '0.1.0', spec_version: '1.2', disclosure: [], cases: [{ id: 'intact', title: 'Intact', description: 'Synthetic.' }] };
  assert.equal(parseEvidenceCases(source).cases[0].id, 'intact');
  assert.throws(() => parseEvidenceCases({ ...source, cases: [...source.cases, ...source.cases] }), /duplicate/);
  assert.throws(() => parseEvidenceCases({ ...source, cases: [] }), /cases/);
});
