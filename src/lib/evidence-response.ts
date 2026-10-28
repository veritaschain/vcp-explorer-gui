import type {
  EvidenceCheck,
  EvidenceDemoCases,
  EvidenceInclusionProof,
  EvidenceStatus,
  EvidenceVerification,
} from '../types/evidence';

function invalid(field: string): never {
  throw new Error(`The evidence API returned an unsupported or incomplete report (${field}).`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string') invalid(field);
  return value;
}

function texts(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) invalid(field);
  return value.map((item, index) => text(item, `${field}[${index}]`));
}

function status(value: unknown, field: string): EvidenceStatus {
  if (value !== 'VALID' && value !== 'INVALID' && value !== 'INDETERMINATE') invalid(field);
  return value;
}

function optionalText(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : text(value, field);
}

function nonblankText(value: unknown, field: string): string {
  const source = text(value, field);
  if (source.trim().length === 0) invalid(field);
  return source; // Validate presence without changing any evidence bytes.
}

export function parseEvidenceCases(value: unknown): EvidenceDemoCases {
  const data = record(value, 'cases');
  if (data.format !== 'vcp-evidence-demo/1') invalid('format');
  if (!Array.isArray(data.cases) || data.cases.length === 0) invalid('cases');
  const cases = data.cases.map((value, index) => {
    const item = record(value, `cases[${index}]`);
    const id = text(item.id, 'case.id');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) invalid('case.id');
    return { id, title: text(item.title, 'case.title'), description: text(item.description, 'case.description') };
  });
  if (new Set(cases.map(item => item.id)).size !== cases.length) invalid('duplicate case.id');
  return {
    format: data.format,
    sdk_version: text(data.sdk_version, 'sdk_version'),
    spec_version: text(data.spec_version, 'spec_version'),
    disclosure: texts(data.disclosure, 'disclosure'),
    cases,
  };
}

function parseCheck(value: unknown): EvidenceCheck {
  const check = record(value, 'check');
  if (check.group !== 'batch' && check.group !== 'chain' && check.group !== 'inclusion') invalid('check.group');
  if (check.scope !== 'local' && check.scope !== 'external') invalid('check.scope');
  const name = text(check.name, 'check.name');
  const expectedScope = name === 'external_anchor' || name === 'root_authenticity' ? 'external' : 'local';
  if (check.scope !== expectedScope) invalid('check.scope does not match check.name');
  return {
    name,
    status: status(check.status, 'check.status'),
    reason: optionalText(check.reason, 'check.reason'),
    detail: optionalText(check.detail, 'check.detail'),
    subject: optionalText(check.subject, 'check.subject'),
    group: check.group,
    scope: check.scope,
  };
}

function parseProof(value: unknown): EvidenceInclusionProof {
  const proof = record(value, 'proof');
  if (typeof proof.index !== 'number' || !Number.isSafeInteger(proof.index) || proof.index < 0) invalid('proof.index');
  if (typeof proof.tree_size !== 'number' || !Number.isSafeInteger(proof.tree_size) || proof.tree_size <= proof.index) invalid('proof.tree_size');
  return {
    event_id: text(proof.event_id, 'proof.event_id'),
    index: proof.index,
    tree_size: proof.tree_size,
    event_hash: text(proof.event_hash, 'proof.event_hash'),
    merkle_root: text(proof.merkle_root, 'proof.merkle_root'),
    proof: texts(proof.proof, 'proof.proof'),
  };
}

function combineChecks(checks: EvidenceCheck[]): EvidenceStatus {
  if (checks.length === 0) invalid('empty verification scope');
  if (checks.some(check => check.status === 'INVALID')) return 'INVALID';
  if (checks.some(check => check.status === 'INDETERMINATE')) return 'INDETERMINATE';
  return 'VALID';
}

export function parseEvidenceVerification(value: unknown, requestedCaseId: string): EvidenceVerification {
  const data = record(value, 'verification');
  if (data.format !== 'vcp-evidence-demo-verification/1') invalid('format');
  const caseId = text(data.case_id, 'case_id');
  if (caseId !== requestedCaseId) invalid('case_id does not match the requested case');
  const sdk = record(data.sdk, 'sdk');
  const evidence = record(data.evidence, 'evidence');
  const trust = record(data.trust, 'trust');
  if (typeof trust.key_configured !== 'boolean') invalid('trust.key_configured');
  if (!Array.isArray(data.checks) || data.checks.length === 0) invalid('checks');
  if (!Array.isArray(evidence.inclusion_proofs)) invalid('evidence.inclusion_proofs');
  const checks = data.checks.map(parseCheck);
  const localStatus = status(data.local_status, 'local_status');
  const overallStatus = status(data.overall_status, 'overall_status');
  // Validate the API report's internal consistency, not the underlying crypto.
  // Format /1 includes both local and external checks; neither may disappear.
  if (!checks.some(check => check.scope === 'external')) invalid('external checks missing');
  if (combineChecks(checks.filter(check => check.scope === 'local')) !== localStatus) invalid('local_status conflicts with checks');
  if (combineChecks(checks) !== overallStatus) invalid('overall_status conflicts with checks');
  return {
    format: data.format,
    case_id: caseId,
    case_title: text(data.case_title, 'case_title'),
    description: text(data.description, 'description'),
    sdk: {
      version: text(sdk.version, 'sdk.version'),
      spec_version: text(sdk.spec_version, 'sdk.spec_version'),
      spec_commit: text(sdk.spec_commit, 'sdk.spec_commit'),
    },
    scope: text(data.scope, 'scope'),
    local_status: localStatus,
    overall_status: overallStatus,
    checks,
    notes: texts(data.notes, 'notes'),
    evidence: {
      events_jsonl: nonblankText(evidence.events_jsonl, 'evidence.events_jsonl'),
      anchor_record_json: nonblankText(evidence.anchor_record_json, 'evidence.anchor_record_json'),
      inclusion_proofs: evidence.inclusion_proofs.map(parseProof),
    },
    trust: { notice: text(trust.notice, 'trust.notice'), key_configured: trust.key_configured },
  };
}
