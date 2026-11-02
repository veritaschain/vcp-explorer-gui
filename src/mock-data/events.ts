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
import { DEMO_MERKLE_FIXTURE } from './merkle-fixture.ts';

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
  '01934e3e-2e5e-7000-8000-eeeeeeeeeeee',
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

// Deterministic synthetic hashes and genuine inclusion paths for this demo
// set. These hashes are not hashes of the displayed event payloads, signed
// records, or externally anchored evidence.
const MOCK_HASHES = ['0'.repeat(64), ...DEMO_MERKLE_FIXTURE.event_hashes];

// Explicit fixture membership: XAUUSD lifecycle, EURUSD lifecycle, risk,
// BTCUSDT lifecycle, then the two system events. This is not index / 4.
const TRACE_MEMBERSHIP = [0, 0, 0, 0, 1, 1, 1, 2, 3, 3, 4, 4];
const EVENT_TRACES = new Map(MOCK_EVENTS.map((event, index) =>
  [event.event_id, TRACE_IDS[TRACE_MEMBERSHIP[index]]] as const
));

// Get mock events with filtering
export function getMockEvents(params: EventSearchParams = {}): EventSearchResponse {
  let filtered = MOCK_EVENTS.map((event, index) => ({
    ...event,
    hash_prefix: MOCK_HASHES[index + 1].slice(0, 6),
  }));

  if (params.symbol) {
    filtered = filtered.filter((e) => e.symbol === params.symbol);
  }

  if (params.event_type) {
    filtered = filtered.filter((e) => e.type === params.event_type);
  }

  if (params.trace_id !== undefined) {
    filtered = filtered.filter((event) => EVENT_TRACES.get(event.event_id) === params.trace_id);
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
  if (index < 0) throw new Error('Demo event is not available for this event ID');
  const event = MOCK_EVENTS[index];
  const eventHash = MOCK_HASHES[index + 1];
  const prevHash = MOCK_HASHES[index];

  const baseTimestamp = new Date(event.timestamp);
  const nsTimestamp = generateNsTimestamp(baseTimestamp);

  return {
    header: {
      event_id: event.event_id,
      trace_id: TRACE_IDS[TRACE_MEMBERSHIP[index]],
      timestamp_int: nsTimestamp,
      timestamp_iso: event.timestamp,
      event_type: event.type as EventType,
      event_type_code: event.event_type_code,
      timestamp_precision:…1639 tokens truncated…n_url: 'https://explorer.veritaschain.org/entities/alpha-quant',
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
