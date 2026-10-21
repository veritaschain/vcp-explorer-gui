# VCP Explorer GUI

**VeritasChain Protocol Explorer - Web Dashboard for VCP Event Exploration and Verification**

![VCP Version](https://img.shields.io/badge/VCP-v1.0-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

A production-grade web dashboard for exploring, searching, and verifying VeritasChain Protocol (VCP) events. Built with React, TypeScript, and TailwindCSS.

## Features

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
- **Merkle Proof Verification**: RFC 6962 compliant inclusion proofs
- Client-side SHA-256 computation using Web Crypto API
- Visual step-by-step verification process

### 📜 Certificate Generation
- Regulatory-compliant event certificates
- PDF export for audit trails
- Blockchain anchor verification

### 🔗 Event Chain Visualization
- Transaction lifecycle tracking (SIG → ORD → ACK → EXE)
- Hash chain integrity verification
- Visual broken chain detection

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript 5.6
- **Styling**: TailwindCSS 3.4
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router 6
- **Icons**: Lucide React
- **Build Tool**: Vite 5

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

> **Note**: The VCP Explorer API is currently in development. Mock mode (`VITE_USE_MOCK=true`) is recommended for demonstrations and development.

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

See [API_REFERENCE.md](../API_REFERENCE.md) for complete API documentation.

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

- [VCP Specification v1.0](https://github.com/veritaschain/vcp-spec) - Protocol specification
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
