export type EvidenceStatus = 'VALID' | 'INVALID' | 'INDETERMINATE';

export interface EvidenceDemoCases {
  format: 'vcp-evidence-demo/1';
  sdk_version: string;
  spec_version: string;
  disclosure: string[];
  cases: Array<{ id: string; title: string; description: string }>;
}

export interface EvidenceCheck {
  name: string;
  status: EvidenceStatus;
  reason?: string;
  detail?: string;
  subject?: string;
  group: 'batch' | 'chain' | 'inclusion';
  scope: 'local' | 'external';
}

export interface EvidenceInclusionProof {
  event_id: string;
  index: number;
  tree_size: number;
  event_hash: string;
  merkle_root: string;
  proof: string[];
}

export interface EvidenceVerification {
  format: 'vcp-evidence-demo-verification/1';
  case_id: string;
  case_title: string;
  description: string;
  sdk: { version: string; spec_version: string; spec_commit: string };
  scope: string;
  local_status: EvidenceStatus;
  overall_status: EvidenceStatus;
  checks: EvidenceCheck[];
  notes: string[];
  evidence: {
    // Retain the API's exact strings: native JSON.parse/stringify would round
    // int64 nanosecond timestamps in the signed evidence.
    events_jsonl: string;
    anchor_record_json: string;
    inclusion_proofs: EvidenceInclusionProof[];
  };
  trust: { notice: string; key_configured: boolean };
}
