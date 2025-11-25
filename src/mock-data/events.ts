// VCP Explorer Mock Data
// Realistic mock data for offline demo mode

import type {
  EventSearchParams,
  EventSearchResponse,
  EventDetailResponse,
  MerkleProofResponse,
  CertificateResponse,
  SystemStatusResponse,
  CertifiedEntitiesResponse,
  EventListItem,
  EventType,
} from '@/types/vcp';

// Generate UUID v7-like strings
function generateUUIDv7(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2, 26);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-7${random.substring(0, 3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${random.substring(3, 6)}-${random.substring(6, 18)}`;
}

// Generate realistic SHA-256 hash
function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Generate nanosecond timestamp string
function generateNsTimestamp(date: Date = new Date()): string {
  return (BigInt(date.getTime()) * BigInt(1_000_000)).toString();
}

// Sample trace IDs for linked events
const TRACE_IDS = [
  '01934e3a-6a1a-7000-8000-aaaaaaaaaaaa',
  '01934e3b-5b2b-7000-9000-bbbbbbbbbbbb',
  '01934e3c-4c3c-7000-a000-cccccccccccc',
  '01934e3d-3d4d-7000-b000-dddddddddddd',
  '01934e3e-2e5e-7000-c000-eeeeeeeeeeee',
];

// Sample events
const MOCK_EVENTS: EventListItem[] = [
  // Trade Lifecycle: SIG → ORD → ACK → EXE
  {
    event_id: '01934e3a-6a1a-7c82-9d1b-000000000001',
    type: 'SIG',
    event_type_code: 1,
    timestamp: '2025-11-25T12:00:00.000Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'XAUUSD',
    hash_prefix: 'e3b0c4',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3a-6a1b-7c82-9d1b-000000000002',
    type: 'ORD',
    event_type_code: 2,
    timestamp: '2025-11-25T12:00:00.050Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'XAUUSD',
    hash_prefix: 'd7a8fb',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3a-6a1c-7c82-9d1b-000000000003',
    type: 'ACK',
    event_type_code: 3,
    timestamp: '2025-11-25T12:00:00.120Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'XAUUSD',
    hash_prefix: '2cf24d',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3a-6a1d-7c82-9d1b-000000000004',
    type: 'EXE',
    event_type_code: 4,
    timestamp: '2025-11-25T12:00:00.180Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'XAUUSD',
    hash_prefix: 'ef2d12',
    status: 'ANCHORED',
  },
  // EURUSD Trade
  {
    event_id: '01934e3b-5b2b-7c82-9d1b-000000000005',
    type: 'SIG',
    event_type_code: 1,
    timestamp: '2025-11-25T12:01:00.000Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'EURUSD',
    hash_prefix: 'a1b2c3',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3b-5b2c-7c82-9d1b-000000000006',
    type: 'ORD',
    event_type_code: 2,
    timestamp: '2025-11-25T12:01:00.045Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'EURUSD',
    hash_prefix: 'b2c3d4',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3b-5b2d-7c82-9d1b-000000000007',
    type: 'REJ',
    event_type_code: 6,
    timestamp: '2025-11-25T12:01:00.100Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'EURUSD',
    hash_prefix: 'c3d4e5',
    status: 'ANCHORED',
  },
  // Risk Event
  {
    event_id: '01934e3c-4c3c-7c82-9d1b-000000000008',
    type: 'RSK',
    event_type_code: 21,
    timestamp: '2025-11-25T12:05:00.000Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'XAUUSD',
    hash_prefix: 'd4e5f6',
    status: 'ANCHORED',
  },
  // BTCUSDT Trade
  {
    event_id: '01934e3d-3d4d-7c82-9d1b-000000000009',
    type: 'SIG',
    event_type_code: 1,
    timestamp: '2025-11-25T12:10:00.000Z',
    venue: 'BINANCE',
    symbol: 'BTCUSDT',
    hash_prefix: 'e5f6a7',
    status: 'ANCHORED',
  },
  {
    event_id: '01934e3d-3d4e-7c82-9d1b-000000000010',
    type: 'ORD',
    event_type_code: 2,
    timestamp: '2025-11-25T12:10:00.025Z',
    venue: 'BINANCE',
    symbol: 'BTCUSDT',
    hash_prefix: 'f6a7b8',
    status: 'PENDING',
  },
  // Heartbeat
  {
    event_id: '01934e3e-2e5e-7c82-9d1b-000000000011',
    type: 'HBT',
    event_type_code: 98,
    timestamp: '2025-11-25T12:15:00.000Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'SYSTEM',
    hash_prefix: 'a7b8c9',
    status: 'ANCHORED',
  },
  // Algorithm Update
  {
    event_id: '01934e3e-2e5f-7c82-9d1b-000000000012',
    type: 'ALG',
    event_type_code: 20,
    timestamp: '2025-11-25T12:20:00.000Z',
    venue: 'MT5-BROKER-ALPHA',
    symbol: 'SYSTEM',
    hash_prefix: 'b8c9d0',
    status: 'ANCHORED',
  },
];

// Hash chain for mock events
const MOCK_HASHES = MOCK_EVENTS.map(() => generateHash());
MOCK_HASHES.unshift('0000000000000000000000000000000000000000000000000000000000000000');

// Get mock events with filtering
export function getMockEvents(params: EventSearchParams = {}): EventSearchResponse {
  let filtered = [...MOCK_EVENTS];

  if (params.symbol) {
    filtered = filtered.filter((e) => e.symbol === params.symbol);
  }

  if (params.event_type) {
    filtered = filtered.filter((e) => e.type === params.event_type);
  }

  if (params.trace_id) {
    // For demo, show first 4 events as a trace
    filtered = filtered.slice(0, 4);
  }

  if (params.start_time) {
    const start = new Date(params.start_time);
    filtered = filtered.filter((e) => new Date(e.timestamp) >= start);
  }

  if (params.end_time) {
    const end = new Date(params.end_time);
    filtered = filtered.filter((e) => new Date(e.timestamp) <= end);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  const total = filtered.length;

  return {
    events: filtered.slice(offset, offset + limit),
    query: params as Record<string, string | number>,
    total,
  };
}

// Get mock event detail
export function getMockEventDetail(eventId: string): EventDetailResponse {
  const index = MOCK_EVENTS.findIndex((e) => e.event_id === eventId);
  const event = MOCK_EVENTS[index] || MOCK_EVENTS[0];
  const eventHash = MOCK_HASHES[index + 1] || generateHash();
  const prevHash = MOCK_HASHES[index] || MOCK_HASHES[0];

  const baseTimestamp = new Date(event.timestamp);
  const nsTimestamp = generateNsTimestamp(baseTimestamp);

  return {
    header: {
      event_id: event.event_id,
      trace_id: TRACE_IDS[Math.floor(index / 4)] || TRACE_IDS[0],
      timestamp_int: nsTimestamp,
      timestamp_iso: event.timestamp,
      event_type: event.type as EventType,
      event_type_code: event.event_type_code,
      timestamp_precision: 'MILLISECOND',
      clock_sync_status: 'NTP_SYNCED',
      hash_algo: 'SHA256',
      venue_id: event.venue,
      symbol: event.symbol,
      account_id: 'acc_7f83b162a9c4e521',
      anchor_status: event.status,
    },
    payload: {
      trade_data:
        event.type === 'ORD' || event.type === 'EXE' || event.type === 'ACK'
          ? {
              order_id: '12345678',
              broker_order_id: 'BRK-2025112500001234',
              side: 'BUY',
              order_type: 'MARKET',
              price: event.symbol === 'XAUUSD' ? '2650.50' : event.symbol === 'BTCUSDT' ? '97500.00' : '1.0845',
              quantity: event.symbol === 'BTCUSDT' ? '0.15' : '1.00',
              execution_price: event.type === 'EXE' ? (event.symbol === 'XAUUSD' ? '2650.55' : '1.0846') : undefined,
              executed_qty: event.type === 'EXE' ? '1.00' : undefined,
              commission: event.type === 'EXE' ? '7.50' : undefined,
              slippage: event.type === 'EXE' ? '0.05' : undefined,
            }
          : event.type === 'REJ'
            ? {
                order_id: '33445566',
                reject_reason: 'INSUFFICIENT_MARGIN',
              }
            : undefined,
      vcp_risk:
        event.type === 'RSK' || event.type === 'SIG'
          ? {
              snapshot: {
                total_equity: '125000.00',
                margin_level_pct: '180.00',
                unrealized_pnl: '2500.00',
                max_drawdown_pct: '8.5',
                news_trading_restricted: 'false',
                max_drawdown_limit: '10000.00',
                max_position_size: '50.00',
                exposure_utilization: '0.45',
                throttle_rate: '100',
                circuit_breaker_status: 'NORMAL',
              },
              triggered_controls:
                event.type === 'RSK'
                  ? [
                      {
                        control_name: 'MAX_DRAWDOWN_WARNING',
                        trigger_value: '8.5',
                        action: 'ALERT',
                        timestamp_int: nsTimestamp,
                      },
                    ]
                  : [],
            }
          : undefined,
      vcp_gov:
        event.type === 'SIG' || event.type === 'ALG'
          ? {
              algo_id: 'gold-momentum-v2.3',
              algo_version: '2.3.1',
              algo_type: 'HYBRID',
              model_hash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              risk_classification: 'MEDIUM',
              last_approval_by: 'risk-committee@example.com',
              approval_timestamp_int: '1732449600000000000',
              decision_factors: {
                features: [
                  { name: 'rsi_14', value: '28.5', weight: '0.35', contribution: '0.12' },
                  { name: 'macd_signal', value: '1.25', weight: '0.25', contribution: '0.08' },
                  { name: 'bollinger_position', value: '0.15', weight: '0.20', contribution: '0.06' },
                  { name: 'volume_ratio', value: '1.45', weight: '0.20', contribution: '0.05' },
                ],
                confidence_score: '0.87',
                explainability_method: 'SHAP',
              },
            }
          : undefined,
    },
    security: {
      event_hash: eventHash,
      prev_hash: prevHash,
      signature: 'MEUCIQDXyz123abc456def789ghi012jkl345mno678pqr901stu234vwx567yza890==',
      sign_algo: 'ED25519',
      merkle_root: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      anchor:
        event.status === 'ANCHORED'
          ? {
              network: 'ethereum-mainnet',
              tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
              block_number: 1942055 + index,
              anchored_at: new Date(baseTimestamp.getTime() + 300000).toISOString(),
            }
          : undefined,
    },
  };
}

// Get mock Merkle proof
export function getMockProof(eventId: string): MerkleProofResponse {
  const index = MOCK_EVENTS.findIndex((e) => e.event_id === eventId);
  const eventHash = MOCK_HASHES[index + 1] || generateHash();

  return {
    event_id: eventId,
    event_hash: eventHash,
    merkle_proof: {
      root_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      leaf_index: index >= 0 ? index : 42,
      audit_path: [
        '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        '9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
        '1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
      ],
    },
    verification_steps: [
      'Compute leaf hash: SHA256(0x00 || event_hash)',
      'Combine with sibling[0] at level 0',
      'Combine with sibling[1] at level 1',
      'Combine with sibling[2] at level 2',
      'Compare computed root with Merkle root',
    ],
  };
}

// Get mock certificate
export function getMockCertificate(eventId: string): CertificateResponse {
  const detail = getMockEventDetail(eventId);
  const proof = getMockProof(eventId);

  return {
    event_id: eventId,
    generated_at: new Date().toISOString(),
    system: {
      vcp_version: '1.0',
      tier: 'GOLD',
    },
    header: detail.header,
    payload: detail.payload,
    security: {
      event_hash: detail.security.event_hash,
      prev_hash: detail.security.prev_hash,
      signature: detail.security.signature,
      sign_algo: detail.security.sign_algo,
      merkle_root: detail.security.merkle_root,
    },
    merkle_proof: proof.merkle_proof,
    anchor_info: detail.security.anchor || {
      network: 'ethereum-mainnet',
      tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      block_number: 1942055,
      anchored_at: new Date().toISOString(),
    },
  };
}

// Get mock system status
export function getMockSystemStatus(): SystemStatusResponse {
  return {
    total_events: 12160243,
    last_anchor: {
      network: 'ethereum-mainnet',
      block_number: 1942055,
      tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      anchored_at: new Date(Date.now() - 300000).toISOString(),
    },
    active_nodes: 42,
    precision: 'NANOSECOND',
    tier: 'PLATINUM',
  };
}

// Get mock certified entities
export function getMockCertifiedEntities(): CertifiedEntitiesResponse {
  return {
    entities: [
      {
        name: 'Alpha Quant Exchange',
        type: 'EXCHANGE',
        tier: 'PLATINUM',
        status: 'COMPLIANT',
        verification_url: 'https://explorer.veritaschain.org/entities/alpha-quant',
        audit_report: '2025-Q3',
      },
      {
        name: 'Prime Trading Prop',
        type: 'PROP_FIRM',
        tier: 'GOLD',
        status: 'COMPLIANT',
        verification_url: 'https://explorer.veritaschain.org/entities/prime-trading',
        audit_report: '2025-Q3',
      },
      {
        name: 'Nexus Futures',
        type: 'BROKER',
        tier: 'GOLD',
        status: 'COMPLIANT',
        verification_url: 'https://explorer.veritaschain.org/entities/nexus-futures',
        audit_report: '2025-Q2',
      },
      {
        name: 'Digital Asset Fund',
        type: 'FUND',
        tier: 'SILVER',
        status: 'PENDING',
        verification_url: 'https://explorer.veritaschain.org/entities/digital-asset',
        audit_report: '2025-Q4',
      },
    ],
  };
}
