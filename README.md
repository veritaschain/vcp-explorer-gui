# VCP Explorer GUI

> **Status correction — 25 October 2026**
>
> - This is first-party demo code by VeritasChain Co., Ltd., which operates the VeritasChain Standards Organization (VSO). It was written against VCP v1.0, which is superseded by VCP v1.2 (Released, tag `v1.2.0`).
> - The legacy dashboard uses mock data by default. As corrected on 28 October 2026, `VITE_USE_MOCK=false` enables API requests; omitted, empty or `true` preserves mock mode, and other values are rejected. Network errors never fall back to mock data. The legacy events, anchors (including Ethereum transaction details) and certificates remain demo values, without on-chain verification. The separate Evidence Demo below runs real SDK checks over synthetic evidence and reports its limits explicitly.
> - Conformance to any VCP tier, or to VAP, has not been independently established. There are zero external implementations of VAP or any of its profiles, including VCP. Not certified: VSO does not issue certifications itself; the scheme requires a Conformity Assessment Body (CAB) independent of the scheme owner, and the only registered CAB, VeritasChain Co., Ltd., is not independent (VAP v1.2 ERRATA E-2026-10-21). Event "certificates" here are JSON/print views, not certification or a compliance finding.

**VeritasChain Protocol Explorer - Web Dashboard for VCP Event Exploration and Verification**

![VCP Version](https://img.shields.io/badge/VCP-v1.0_(superseded_by_v1.2)-lightgrey)
![License](https://img.shields.io/badge/License-Apache%202.0-green)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

A demo dashboard (mock data by default) for exploring, searching, and verifying VeritasChain Protocol (VCP) events. Built with React, TypeScript, and TailwindCSS.

## Features

### SDK Evidence Demo

`/evidence-demo` connects the SDK, Explorer API and GUI using three synthetic
cases: intact evidence, changed evidence and a missing trusted key. The GUI
displays per-check results, separate **Local checks** and **Full evidence**
summaries, trust configuration and unresolved external checks. An intact local
`VALID` result still has an overall `INDETERMINATE` verdict because the demo
does not supply independently authenticated external anchor proof.

This page always requests the explicitly configured API, independently of
legacy mock mode. Unavailable APIs and unsupported or inconsistent responses
show errors, never synthetic replacement verdicts. Case changes cancel pending
requests and clear the old result. The browser displays the API's SDK report;
it does not independently repeat those cryptographic checks. Raw event JSONL
and AnchorRecord strings are displayed and downloaded without JSON number
round-tripping, preserving nanosecond integers exactly.

See [the local integration recipe](docs/EVIDENCE_DEMO_INTEGRATION.md) for setup,
the fixed inputs and the actual verification boundary. This demo does not
establish VCP/VAP conformance, certification or production readiness.

### 🔍 Event Search & Exploration
- Advanced search by Event ID, Trace ID, Symbol, or Event Type
- Filter by time range, venue, and algorithm
- Paginated results with real-time updates

### 📄 Event Details
- Complete VCP event structure visualization
- VCP-TRADE: Order and execution data
- VCP-RISK: Risk parameter snapshots and triggered controls
- VCP-GOV: Algorithm governance and AI explainability (SHAP values)

### 🔐 Cryptographic Verification
- **Merkle Proof Verification**: inclusion proofs using RFC 6962 hash prefixes (conformance not assessed)
- Client-side SHA-256 computation using Web Crypto API
- Visual step-by-step verification process

The inclusion check requires a supplied `merkle_proof.tree_size` (positive
JavaScript safe integer) as well as the leaf index, full 32-byte hexadecimal
hashes and an exact-length audit path. Legacy API responses without a tree size
are shown as **not verified**; the GUI does not infer it from the path. The
traversal handles uneven trees using RFC 9162 §2.1.3.2. A match is only against
the supplied root and size: it does not authenticate them, recompute the event
hash from its contents, verify a signature or check an external anchor.

The demo uses a deterministic 12-leaf synthetic fixture with real inclusion
paths over `SHA-256("0")` through `SHA-256("11")`. Those values are not hashes of
the displayed event payloads and are not signed or anchored evidence. The
regression tests reconstruct the fixture independently with `node:crypto` and
exercise every leaf of balanced and uneven trees, malformed inputs, missing
sizes, path-length errors and indices above the 32-bit range.

### 📜 Certificate Generation
- Event certificate view (JSON/print; not a certification or compliance finding)
- Print view (browser-managed Print / Save as PDF); the resulting PDF has **not** been validated as tagged, screen-reader accessible or PDF/UA conformant. See [PDF print accessibility status](docs/PDF_PRINT_ACCESSIBILITY.md).
- Blockchain anchor display (demo data; not verified on-chain)

### 🔗 Event Chain Visualization
- Transaction lifecycle tracking (SIG → ORD → ACK → EXE)
- Hash chain integrity verification
- Visual broken chain detection

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript 5.6
- **Styling**: TailwindCSS 3.4
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router 7 (static-site publication uses the opt-in hash-router profile)
- **Icons**: Lucide React
- **Build Tool**: Vite 6

## Getting Started

### Prerequisites

- Node.js 24.22.1 (or a later 24.x patch; `.nvmrc` pins development and CI)
- npm 11+ (`.npmrc` enforces the required versions)

### Installation

```bash
# Clone the repository
git clone https://github.com/veritaschain/vcp-explorer-gui.git
cd vcp-explorer-gui

# Install dependencies
nvm install
nvm use
npm ci

# Copy environment configuration
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | VCP Explorer API endpoint | `https://explorer.veritaschain.org/api/v1` |
| `VITE_USE_MOCK` | Enable mock data for offline development | `true` |
| `VITE_EVIDENCE_API_BASE_URL` | API base for Evidence Demo; independent of legacy mock mode | Explicit `VITE_API_BASE_URL`, otherwise unconfigured |

Evidence Demo uses routes under `/evidence-demo/cases` on that API base. For a
local API, use `http://127.0.0.1:3001/v1`. Restart the development server or
rebuild after changing Vite environment variables. With no explicit API base,
the page displays setup information and performs no verification. The legacy
dashboard remains an offline demonstration when `VITE_USE_MOCK=true`.

## Project Structure

```
vcp-explorer-gui/
├── src/
│   ├── components/
│   │   ├── features/       # Feature-specific components
│   │   │   ├── EventTypeBadge.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── layout/         # Layout components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── EventDetail.tsx     # Event details view
│   │   ├── MerkleProofPage.tsx # Merkle proof verification
│   │   ├── CertificatePage.tsx # Certificate viewer
│   │   ├── HashChainPage.tsx   # Hash chain visualizer
│   │   ├── SearchPage.tsx      # Advanced search
│   │   └── NotFound.tsx        # 404 page
│   ├── lib/
│   │   ├── api-client.ts   # API client wrapper
│   │   ├── crypto.ts       # Cryptographic utilities
│   │   └── utils.ts        # Helper functions
│   ├── types/
│   │   └── vcp.ts          # VCP TypeScript types
│   ├── mock-data/
│   │   └── events.ts       # Mock data for demo
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
│   └── vcp-logo.svg
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint
```

## Docker Deployment

The bundled nginx configuration serves the static demo independently of any
external API hostname. `/api/` returns 404 until an operator configures a real
backend; an unreachable placeholder upstream must not prevent the UI starting.
The application currently uses mock data by default. This container check does
not establish connectivity to a deployed API.

### Build and run with Docker

```bash
# Build the image
docker build -t vcp-explorer-gui .

# Run the container
docker run -p 3000:80 vcp-explorer-gui
```

### Using Docker Compose

```bash
# Production mode
docker-compose up -d vcp-explorer-gui

# Development mode with hot reload
docker-compose --profile dev up vcp-explorer-dev
```

## API Integration

The GUI is designed to integrate with the VCP Explorer API v1.1. 

**Supported Endpoints:**

| Endpoint | Description | Status |
|----------|-------------|--------|
| `GET /v1/system/status` | System statistics | ✅ Implemented |
| `GET /v1/events` | Search events | ✅ Implemented |
| `GET /v1/events/:id` | Event details | ✅ Implemented |
| `GET /v1/events/:id/proof` | Merkle proof | ✅ Implemented |
| `GET /v1/events/:id/certificate` | Event certificate | ✅ Implemented |

> **Development Note**: Mock data is included for offline demonstrations. Set `VITE_USE_MOCK=true` in your environment.

See [API_REFERENCE.md](https://github.com/veritaschain/vcp-explorer-api/blob/main/API_REFERENCE.md) in vcp-explorer-api for API documentation.

## VCP Event Types

| Code | Type | Description |
|------|------|-------------|
| 1 | SIG | Signal/Decision generated |
| 2 | ORD | Order sent |
| 3 | ACK | Order acknowledged |
| 4 | EXE | Full execution |
| 5 | PRT | Partial fill |
| 6 | REJ | Order rejected |
| 7 | CXL | Order cancelled |
| 20 | ALG | Algorithm update |
| 21 | RSK | Risk parameter change |
| 98 | HBT | Heartbeat |
| 99 | ERR | Error |

## Screenshots

### Dashboard
- Real-time system status
- Recent events list
- Quick search functionality

### Event Details
- Complete event payload visualization
- VCP-TRADE, VCP-RISK, VCP-GOV modules
- Cryptographic security section

### Merkle Proof Verification
- Interactive proof visualization
- Client-side verification
- Step-by-step computation display

### Event Chain Visualizer
- Transaction lifecycle view
- Hash chain integrity status
- Broken chain detection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Related Projects

- [VCP Specification](https://github.com/veritaschain/vcp-spec) - Protocol specification (current release: v1.2)
- [VCP Explorer API](https://github.com/veritaschain/vcp-explorer-api) - Backend API server
- [VCP SDK (TypeScript)](https://github.com/veritaschain/vcp-sdk-typescript) - TypeScript SDK
- [VCP SDK (Python)](https://github.com/veritaschain/vcp-sdk-python) - Python SDK

> **Note**: Some repositories may be in private development. Contact VSO for early access.

## Support

- **Website**: https://veritaschain.org
- **GitHub Issues**: https://github.com/veritaschain/vcp-explorer-gui/issues
- **Email**: standards@veritaschain.org

---

**VeritasChain Standards Organization (VSO)**  
*"Verify, Don't Trust"*
