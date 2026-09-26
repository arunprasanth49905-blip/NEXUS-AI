# NEXUS EDGE

> **"Understand what you're doing. Get intelligent help. Keep your data private."**

NEXUS EDGE is a context-aware edge AI workspace designed to operate with strict local-first boundaries, truthful hardware disclosures, multimodal perception, and zero remote cloud telemetry.

---

## Architecture Milestone: Phase 4 — Context Intelligence & Memory Engine

Phase 4 equips NEXUS EDGE with contextual understanding and responsible memory retention:
1. **Context Aggregator & Classifier**: Standardizes multimodal inputs into canonical context, classifying intents (`ASK`, `EXPLAIN`, `DEBUG`, `CREATE`, etc.) and categories.
2. **Active Task Manager**: Understands and anchors the user's current goal across interactions (e.g., *"Deploy React application"*, *"Resolve bundle failure"*).
3. **Layered Memory Engine**:
   - `SHORT_TERM`: Active context window items.
   - `SESSION`: Ephemeral troubleshooting context cleared upon reset.
   - `PROJECT`: Persistent project specifications and architecture rules.
   - `LONG_TERM`: Explicit user-controlled preferences retained across sessions.
4. **Secret Protection & Privacy Guard**: Automatically detects API keys, tokens, and private keys, preventing accidental persistence.
5. **Deterministic Retrieval & Ranking**: Transparently retrieves relevant memories using multi-factor relevance (task match, project scope, session recency, and keyword overlap).
6. **Bounded Context Window**: Assembles prompt payloads within strict token boundaries passed directly into the Phase 2 AI Runtime Engine.

```
                    USER
                      |
        +-------------+-------------+
        |       MULTIMODAL INPUT    |
        +-------------+-------------+
                      |
       +--------------+--------------+
       |       PERCEPTION ENGINE     | (Phase 3)
       +--------------+--------------+
                      |
       +--------------+--------------+
       |   CONTEXT INTELLIGENCE      | (Phase 4)
       |   - Intent & Category       |
       |   - Entities & Topics       |
       |   - Active Task Anchor      |
       +--------------+--------------+
                      |
       +--------------+--------------+
       |        MEMORY ENGINE        | (Phase 4)
       |   - Privacy Guard (Secrets) |
       |   - Storage (SQLite)        |
       |   - Deterministic Retrieval |
       +--------------+--------------+
                      |
                      ↓
               CONTEXT WINDOW
                      |
                      ↓
               PHASE 2 RUNTIME
            (QNN/NPU → GPU → CPU)
                      |
                      ↓
                 AI INFERENCE
```

---

## API Endpoints (Phases 1, 2, 3 & 4)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health, service status, and active provider |
| `GET` | `/api/v1/system` | Authentic host hardware specs and acceleration state |
| `GET` | `/api/v1/context` | Active context, session ID, and active task goal |
| `POST` | `/api/v1/assistant/query` | Unified inference query with context window & memory retrieval |
| `GET` | `/api/v1/runtime/status` | Comprehensive runtime state, selection, and explanation |
| `POST` | `/api/v1/runtime/benchmark` | Iterative benchmark on selected provider |
| `GET` | `/api/v1/perception/status` | Availability status for text, screen, camera, voice, doc, OCR, vision |
| `GET` | `/api/v1/context/status` | Status of Context Engine, Active Session, and Memory Repository |
| `GET` | `/api/v1/context/session` | Get active session metadata |
| `POST` | `/api/v1/context/session` | Reset or create workspace session |
| `GET` | `/api/v1/tasks/current` | Retrieve active task goal |
| `POST` | `/api/v1/tasks` | Explicitly set active task goal |
| `DELETE` | `/api/v1/tasks/current` | Clear current active task goal |
| `GET` | `/api/v1/memory` | List stored memories with optional `?type=` filter |
| `POST` | `/api/v1/memory` | Explicitly retain new memory (audited by Privacy Guard) |
| `POST` | `/api/v1/memory/search` | Retrieve memories using deterministic ranking |
| `DELETE` | `/api/v1/memory/:id` | Permanently delete individual memory |
| `DELETE` | `/api/v1/memory/session` | Clear ephemeral session memories |
| `DELETE` | `/api/v1/memory/project` | Clear project-scoped memories |

---

## Verification & Testing

Run all unit and integration test suites:

```bash
npm test
```

Build for production:

```bash
npm run build
npm start
```
