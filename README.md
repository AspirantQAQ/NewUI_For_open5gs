# NewUI For Open5GS

Modern web UI for Open5GS, replacing the legacy Next.js WebUI with a React + MUI interface. Manage subscribers, profiles, accounts, and all 18 NF (Network Function) YAML configurations from a single dashboard.

## Features

### Subscriber / Profile / Account Management
- **Subscribers** — table with search (IMSI/MSISDN), view/create/edit/delete, nested slice/session/QoS form
- **Profiles** — reusable subscriber templates with security keys and slice configuration
- **Accounts** — admin/user account management with role assignment

### NF Configuration Management
- **Dashboard** — sync status overview for all 18 NFs (AMF, MME, SMF, UPF, NRF, SCP, etc.)
- **NF Detail** — click any NF to view its full running configuration in structured, collapsible sections
- **5 Config Panels**:
  1. **Global Settings** — log level/path, max UE, MongoDB connection (batch apply)
  2. **PLMN/Network Identity** — MCC/MNC/TAC, network name, S-NSSAI slices, security algorithms
  3. **5GC SBI Topology** — 10 NF tables with client mode switching (NRF/SCP/Direct)
  4. **Session/UPF** — SMF+UPF sessions, subnets, consistency check
  5. **4G EPC** — MME/SGWC/SGWU accordion cards
- **Sync** — edit configs in MongoDB, then sync to YAML files with backup & rollback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 + MUI 5 (v9) + React Router 6 + React Query + Zustand |
| Backend | Express 5 + Mongoose 8 + Passport + JWT + session |
| Config | js-yaml (YAML ↔ MongoDB) |
| Database | MongoDB |

## Architecture

Single-app deployment: Express serves the Vite build output.

- **Dev**: `npm run dev` — Vite (5173) + Express (9999) concurrently, Vite proxies `/api`
- **Prod**: `npm run build && npm start` — Express (9999) serves `dist/`

### Project Structure

```
webui-v2/
├── server/                  # Express backend
│   ├── index.js             # Entry point, MongoDB connect, auto-import YAML
│   ├── ensure-secret.js     # Generate JWT/session secrets
│   ├── models/
│   │   ├── account.js       # User accounts (passport-local-mongoose)
│   │   ├── subscriber.js    # Subscriber schema (IMSI, security, slice, session)
│   │   ├── profile.js       # Profile template schema
│   │   └── nf-config.js     # NF config schema (nfType + config JSON + meta)
│   └── routes/
│       ├── index.js         # JWT auth middleware, route mounting
│       ├── auth.js          # Login/logout/session/CSRF
│       ├── db.js            # Subscriber/Profile/Account REST (express-restify-mongoose)
│       └── config.js        # NF config CRUD, sync, import, status
├── src/                     # React frontend
│   ├── App.tsx              # Routes
│   ├── main.tsx             # Providers (QueryClient, Theme, Router)
│   ├── theme.ts             # MUI theme
│   ├── types/               # TypeScript interfaces
│   │   ├── index.ts         # NfConfig, SyncStatus, AuthSession
│   │   └── db.ts            # Subscriber, Profile, Account, Slice, Session
│   ├── services/
│   │   ├── api.ts           # Axios instance with JWT interceptor
│   │   ├── auth.ts          # Login/logout/session with CSRF
│   │   ├── config.ts        # NF config API calls
│   │   └── db.ts            # Subscriber/Profile/Account API calls
│   ├── hooks/
│   │   ├── useNfConfig.ts   # React Query hooks for NF config
│   │   └── useDb.ts         # React Query hooks for DB CRUD
│   ├── stores/
│   │   └── authStore.ts     # Zustand auth state
│   ├── components/
│   │   ├── Layout.tsx       # Main layout
│   │   ├── Header.tsx       # Top bar with user info
│   │   ├── Sidebar.tsx      # Navigation drawer
│   │   └── SyncStatusBar.tsx # Sync status + batch sync dialog
│   └── pages/
│       ├── Login.tsx
│       ├── Dashboard.tsx    # NF sync status grid + 查看配置 buttons
│       ├── Subscribers.tsx  # Subscriber CRUD with search
│       ├── Profiles.tsx     # Profile CRUD
│       ├── Accounts.tsx     # Account CRUD
│       └── config/
│           ├── GlobalSettings.tsx
│           ├── PlmnIdentity.tsx
│           ├── SbiTopology.tsx
│           ├── SessionUpf.tsx
│           ├── Epc4g.tsx
│           └── NfDetail.tsx  # NF config detail viewer
├── docs/                    # Design docs and implementation plans
└── dist/                    # Production build output
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running at `127.0.0.1:27017`

### Install & Run

```bash
npm install
npm run dev
```

Access at `http://localhost:5173`. Default login: **admin** / **1423**

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URI` | `mongodb://127.0.0.1/open5gs` | MongoDB connection string |
| `YAML_CONFIG_PATH` | `/etc/open5gs` | Path to Open5GS YAML config files |
| `PORT` | `9999` | Express server port |
| `HOSTNAME` | `localhost` | Server bind address (use `0.0.0.0` for external access) |

### Production Build

```bash
npm run build
npm start
```

### External Access

For access from other machines:

```bash
HOSTNAME=0.0.0.0 npm run dev
```

## API Endpoints

### Auth (`/api/auth`)
- `GET /csrf` — get CSRF token
- `POST /login` — authenticate
- `POST /logout` — end session
- `GET /session` — get current session + JWT

### NF Config (`/api/config`) — JWT required
- `GET /nfs` — list all NF configs (summary)
- `GET /nfs/:nfType` — get single NF full config
- `PUT /nfs/:nfType` — update NF config in MongoDB
- `POST /sync/:nfType` — sync single NF to YAML file
- `POST /sync` — sync all modified NFs
- `POST /import/:nfType` — re-import from YAML to MongoDB
- `GET /status` — sync status for all NFs

### DB (`/api/db`) — JWT required
- `/subscribers` — CRUD (id: IMSI)
- `/profiles` — CRUD (id: MongoDB _id)
- `/accounts` — CRUD (id: username)

## Supported NF Types

5GC: NRF, SCP, AMF, SMF, UPF, AUSF, UDM, UDR, PCF, NSSF, BSF

4G EPC: MME, HSS, SGWC, SGWU, PCRF

Roaming: SEPP1, SEPP2

## License

This project is part of Open5GS.
