# NEXUS EDGE

> **"Understand what you're doing. Get intelligent help. Keep your data private."**

NEXUS EDGE is a context-aware edge AI workspace designed to operate with local-first boundaries, truthful system disclosures, and zero remote telemetry.

---

## Phase 1 Deliverable: Product Foundation + Application Shell

Phase 1 focuses on:
- **Commercial-Grade Product Interface**: Restrained charcoal dark theme, electric blue & cyan accents, 8px grid system, WCAG AA accessible contrast, and zero generic template artifacts.
- **Application Shell & Navigation**: Responsive sidebar, keyboard shortcuts (`Alt+1` to `Alt+5`, `Ctrl+K`), top bar with breadcrumbs and live edge connection indicators.
- **Full Screen Suite**:
  - `Home`: Welcome hero, prompt bar with modality triggers, quick action templates, current context panel, and recent interactions timeline.
  - `Ask NEXUS`: Dedicated AI interaction shell with conversation thread, copy utilities, session reset, and clearly labeled future perception controls (Voice, Screen, Camera, Documents).
  - `Knowledge`: Workspace knowledge references with filtering, search, and accessible modal for registering local documents and code snippets.
  - `Activity`: Grouped audit timeline (Today, Yesterday, Earlier) with category filtering and JSON export.
  - `Settings`: General, AI behavior, strict privacy guardrails, and runtime execution preferences.
  - `Advanced Diagnostics`: Low-level engineering diagnostics reporting authentic host metrics and truthful hardware disclosures (zero synthetic metrics or fabricated TOPS).
- **Backend System Foundation**: Python FastAPI service providing real host inspection (`/api/v1/health`, `/api/v1/system`, `/api/v1/context`, `/api/v1/assistant/query`).

---

## Architecture Overview

```
src/
├── components/
│   ├── ui/               # Button, IconButton, Card, StatusBadge, Input, SearchInput, EmptyState, Modal, Tabs, ContextIndicator, Skeleton
│   ├── layout/           # AppShell, Sidebar, TopBar
│   └── common/           # CommandBar (Ctrl+K), ToastContainer, PageHeader
├── pages/
│   ├── Home.tsx                  # Primary workspace dashboard & quick actions
│   ├── AskNexus.tsx              # Interaction shell & future perception controls
│   ├── Knowledge.tsx             # Document & code reference manager
│   ├── Activity.tsx              # Chronological event audit timeline
│   ├── Settings.tsx              # Privacy perimeter & interface preferences
│   └── AdvancedDiagnostics.tsx   # Truthful host diagnostics & raw JSON inspector
├── services/
│   ├── api.ts            # Central API client with timeout & error handling
│   └── system.ts         # Diagnostic fetching with graceful offline baseline
├── types/
│   └── index.ts          # Comprehensive TypeScript interface definitions
├── styles/
│   └── tokens.css        # Color tokens, typography, 8px grid spacing, radii
├── App.tsx               # Top-level state, routing, toast manager, health polling
└── index.css             # Base resets, typography, and utility classes

backend/
├── app/
│   ├── api/routes.py     # FastAPI endpoints (/health, /system, /context, /assistant/query)
│   ├── core/config.py    # Pydantic v2 application configuration & CORS
│   ├── services/system_service.py # Authentic psutil & platform inspection
│   └── main.py           # FastAPI app instance
└── tests/
    └── test_api.py       # Pytest unit tests for all endpoints
```

---

## Getting Started

### 1. Backend Service (FastAPI)

```bash
# Start the local edge service
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Endpoints available:
- `GET http://127.0.0.1:8000/api/v1/health`
- `GET http://127.0.0.1:8000/api/v1/system`
- `GET http://127.0.0.1:8000/api/v1/context`
- `POST http://127.0.0.1:8000/api/v1/assistant/query`
- Swagger UI: `http://127.0.0.1:8000/docs`

### 2. Frontend Application (Vite + React + TypeScript)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build
npm run build

# Run unit tests (backend)
python -m pytest backend/tests
```

Frontend runs at `http://127.0.0.1:5173`.

---

## Truthful Hardware Disclosure Policy

In accordance with competition rules and commercial design integrity:
- NEXUS EDGE strictly discloses authentic host metrics (Windows 11, physical cores, logical threads, RAM).
- Hardware acceleration (NPU, QNN, TOPS) is truthfully disclosed as **"Not detected"** or **"Not configured"** unless physical edge hardware is verified by the platform runtime.
- No synthetic benchmark numbers or fabricated model parameters are presented.

---

## Roadmap

- **Phase 1 (Complete)**: Product Foundation, Industrial-Grade User Interface, Application Shell, Basic System Foundation.
- **Phase 2 (Upcoming)**: Edge AI Runtime & Local Model Pipeline integration.
- **Phase 3 (Upcoming)**: Multimodal Perception (Voice, Screen, Camera).
- **Phase 4 (Upcoming)**: Local Context & Memory Vector Indexing (RAG).
