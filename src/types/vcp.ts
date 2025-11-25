// VCP Explorer API Types v1.1
// Based on VeritasChain Protocol Specification v1.0

// ============================================================
// Event Type Codes (Fixed per VCP Spec)
// ============================================================

export const EVENT_TYPE_CODES = {
  SIG: 1,   // Signal/Decision generated
  ORD: 2,   // Order sent
  ACK: 3,   // Order acknowledged
  EXE: 4,   // Full execution
  PRT: 5,   // Partial fill
  REJ: 6,   // Order rejected
  CXL: 7,   // Order cancelled
  MOD: 8,   // Order modified
  CLS: 9,   // Position closed
  ALG: 20,  // Algorithm update
  RSK: 21,  // Risk parameter change
  AUD: 22,  // Audit event
  HBT: 98,  // Heartbeat
  ERR: 99,  // Error
  REC: 100, // Recovery
  SNC: 101, // Sync
} as const;

export type EventType = keyof typeof EVENT_TYPE_CODES;
export type EventTypeCode = typeof EVENT_TYPE_CODES[EventType];

// ============================================================
// Enums
// ============================================================

export type TimestampPrecision = 'NANOSECOND' | 'MICROSECOND' | 'MILLISECOND' | 'SECOND';
export type ClockSyncStatus = 'PTP_LOCKED' | 'NTP_SYNCED' | 'BEST_EFFORT' | 'UNRELIABLE';
export type HashAlgorithm = 'SHA256' | 'SHA3_256' | 'BLAKE3';
export type SignatureAlgorithm = 'ED25519' | 'ECDSA_P256';
export type AnchorStatus = 'ANCHORED' | 'PENDING' | 'FAILED';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type AlgoType = 'RULE_BASED' | 'AI_MODEL' | 'HYBRID' | 'HFT';
export type RiskClassification = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CircuitBreakerStatus = 'NORMAL' | 'WARNING' | 'TRIGGERED' | 'HALTED';
export type ExplainabilityMethod = 'SHAP' | 'LIME' | 'FEATURE_IMPORTANCE' | 'RULE_TRACE';
export type CertificationTier = 'SILVER' | 'GOLD' | 'PLATINUM';

// ============================================================
// Header (VCP-CORE)
// ============================================================

export interface VCPHeader {
  event_id: string;          // UUID v7
  trace_id: string;          // UUID v7
  timestamp_int: string;     // String for nanosecond precision (JS 2^53 safe)
  timestamp_iso: string;     // ISO 8601 string
  event_type: EventType;
  event_type_code: EventTypeCode;
  timestamp_precision: TimestampPrecision;
  clock_sync_status: ClockSyncStatus;
  hash_algo: HashAlgorithm;
  venue_id: string;
  symbol: string;
  account_id?: string;
  anchor_status?: AnchorStatus;
}

// ============================================================
// VCP-TRADE Module
// ============================================================

export interface VCPTradeData {
  order_id?: string;
  broker_order_id?: string;
  side?: OrderSide;
  order_type?: OrderType;
  price?: string;            // String for precision
  quantity?: string;
  executed_qty?: string;
  remaining_qty?: string;
  execution_price?: string;
  commission?: string;
  slippage?: string;
  reject_reason?: string;
  cancel_reason?: string;
}

// ============================================================
// VCP-RISK Module
// ============================================================

export interface RiskSnapshot {
  total_equity?: string;
  margin_level_pct?: string;
  unrealized_pnl?: string;
  max_drawdown_pct?: string;
  news_trading_restricted?: string;
  max_drawdown_limit?: string;
  max_position_size?: string;
  exposure_utilization?: string;
  throttle_rate?: string;
  circuit_breaker_status?: CircuitBreakerStatus;
}

export interface TriggeredControl {
  control_name: string;
  trigger_value: string;
  action: 'ALERT' | 'REDUCE' | 'HALT' | 'REJECT';
  timestamp_int: string;
}

export interface VCPRisk {
  snapshot: RiskSnapshot;
  triggered_controls?: TriggeredControl[];
}

// ============================================================
// VCP-GOV Module (AI Governance & Explainability)
// ============================================================

export interface DecisionFeature {
  name: string;
  value: string;
  weight: string;
  contribution: string;
}

export interface DecisionFactors {
  features?: DecisionFeature[];
  confidence_score?: string;
  explainability_method?: ExplainabilityMethod;
}

export interface Governance {
  risk_classification?: RiskClassification;
  last_approval_by?: string;
  approval_timestamp?: string;
  approval_timestamp_int?: string;
  testing_record_link?: string;
}

export interface VCPGov {
  algo_id: string;
  algo_version?: string;
  algo_type?: AlgoType;
  model_hash?: string;
  risk_classification?: RiskClassification;
  last_approval_by?: string;
  approval_timestamp_int?: string;
  decision_factors?: DecisionFactors;
  governance?: Governance;
}

// ============================================================
// Payload Structure
// ============================================================

export interface VCPPayload {
  trade_data?: VCPTradeData;
  vcp_risk?: VCPRisk;
  vcp_gov?: VCPGov;
}

// ============================================================
// Security (VCP-SEC)
// ============================================================

export interface BlockchainAnchor {
  network: string;
  tx_hash: string;
  block_number: number;
  anchored_at: string;
}

export interface VCPSecurity {
  event_hash: string;        // SHA-256 hex (64 chars)
  prev_hash: string;         // SHA-256 hex (64 chars)
  signature?: string;        // Base64 encoded
  sign_algo?: SignatureAlgorithm;
  merkle_root?: string;
  anchor?: BlockchainAnchor;
}

// ============================================================
// Complete Event
// ============================================================

export interface VCPEvent {
  header: VCPHeader;
  payload: VCPPayload;
  security: VCPSecurity;
}

// ============================================================
// API Response Types
// ============================================================

// Event List Response
export interface EventListItem {
  event_id: string;
  type: EventType;
  event_type_code: EventTypeCode;
  timestamp: string;
  venue: string;
  symbol: string;
  hash_prefix: string;
  status: AnchorStatus;
}

export interface EventSearchResponse {
  events: EventListItem[];
  query: Record<string, string | number>;
  total: number;
}

// Event Detail Response
export interface EventDetailResponse {
  header: VCPHeader;
  payload: VCPPayload;
  security: VCPSecurity;
}

// Merkle Proof Response
export interface MerkleProof {
  root_hash: string;
  leaf_index: number;
  audit_path: string[];
}

export interface MerkleProofResponse {
  event_id: string;
  event_hash: string;
  merkle_proof: MerkleProof;
  verification_steps?: string[];
}

// Certificate Response
export interface CertificateResponse {
  event_id: string;
  generated_at: string;
  system: {
    vcp_version: string;
    tier: CertificationTier;
  };
  header: VCPHeader;
  payload: VCPPayload;
  security: Omit<VCPSecurity, 'anchor'>;
  merkle_proof: MerkleProof;
  anchor_info: BlockchainAnchor;
}

// System Status Response
export interface SystemStatusResponse {
  total_events: number;
  last_anchor: BlockchainAnchor;
  active_nodes: number;
  precision: TimestampPrecision;
  tier: CertificationTier;
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  service: string;
}

// Certified Entity
export interface CertifiedEntity {
  name: string;
  type: 'EXCHANGE' | 'BROKER' | 'PROP_FIRM' | 'FUND';
  tier: CertificationTier;
  status: 'COMPLIANT' | 'PENDING' | 'EXPIRED';
  verification_url: string;
  audit_report: string;
}

export interface CertifiedEntitiesResponse {
  entities: CertifiedEntity[];
}

// Error Response
export interface APIError {
  error: string;
  message: string;
}

// ============================================================
// Search Parameters
// ============================================================

export interface EventSearchParams {
  trace_id?: string;
  symbol?: string;
  event_type?: EventType;
  event_type_code?: EventTypeCode;
  start_time?: string;
  end_time?: string;
  algo_id?: string;
  venue_id?: string;
  limit?: number;
  offset?: number;
}
