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

---

## Architecture Milestone: Phase 5 — Agent Orchestration & Intelligent Task Planning

Phase 5 equips NEXUS EDGE with autonomous goal reasoning, structured DAG task decomposition, dynamic capability-based agent selection, human approval gates, and multi-agent execution verification:
1. **Agent Registry & 7 Specialized Agents**:
   - `knowledge-agent`: Conceptual explanation, summarization, technical synthesis
   - `productivity-agent`: Plan creation, outlining, structured deliverables
   - `study-agent`: Academic breakdowns, study guides, practice questions
   - `vision-agent`: Truthful visual context reasoning (Phase 3 screen/camera integration)
   - `document-agent`: Document perception, table extraction, report analysis
   - `debug-agent`: Stack trace diagnosis, failure root-cause analysis, actionable fixes
   - `research-agent`: Workspace evidence synthesis and information gap detection
2. **Deterministic Task Classifier & Decomposer**: Classifies goal complexity (`SIMPLE`, `MODERATE`, `COMPLEX`) and constructs a Directed Acyclic Graph (DAG) with explicit dependency milestones.
3. **Execution Engine & Idempotency**: Controlled agent execution with unique execution IDs, retry policies, configurable timeouts, and safe abort signals.
4. **Result Aggregator & Verification Engine**: Preserves partial progress on failures, evaluates DAG output schema completeness, and detects contradictory findings across agents.
5. **Human Approval Gate**: Identifies elevated-risk actions (`HIGH_RISK`, `EXTERNAL_SIDE_EFFECT`) and enforces explicit user confirmation before proceeding.
6. **Least-Privilege Context Scoping**: Restricts context delivered to each agent to the minimum necessary boundary, enforcing secret protection policies.

```
                     USER
                       |
                 NEXUS EDGE UI
                       |
               INPUT ORCHESTRATOR
                       |
              PHASE 3 PERCEPTION
                       |
              PHASE 4 CONTEXT + MEMORY
                       |
                  BRAINROUTER
                       |
              TASK CLASSIFICATION
                       |
               TASK DECOMPOSER
                       |
                   PLANNER
                       |
               AGENT SELECTOR
                       |
               AGENT REGISTRY
                       |
          +------------+------------+
          |            |            |
      KNOWLEDGE    DOCUMENT    PRODUCTIVITY
        AGENT        AGENT        AGENT
          |            |            |
          +------------+------------+
                       |
                EXECUTION ENGINE
                       |
               RESULT AGGREGATOR
                       |
                 VERIFICATION
                       |
                 FINAL RESPONSE
```

## Architecture Milestone: Phase 6 — Tool & Action Engine + Controlled AI Execution

Phase 6 transitions NEXUS EDGE from "an AI that plans" to "an AI that can safely perform controlled, auditable, and verifiable actions":
1. **Tool Registry & 10 Initial Safe Tools**:
   - `text-analyzer` (READ_ONLY): Lexical metrics, entity analysis, structural insights
   - `document-reader` (READ_ONLY): Reads PDF/CSV/MD/TXT via Phase 3 perception extractors
   - `file-inspector` (READ_ONLY): Path allowlisted file metadata & text inspection
   - `directory-inspector` (READ_ONLY): Safe directory listing without escape
   - `file-creator` (LOW_RISK): Creates new files within permitted workspace (approval required by default)
   - `file-editor` (HIGH_RISK): In-place file modification with replacement/append (approval required)
   - `file-deleter` (DESTRUCTIVE): Single file deletion (approval strictly required)
   - `text-exporter` (LOW_RISK): Exports deliverables to destination files (approval required)
   - `json-analyzer` (READ_ONLY): JSON parsing, depth calculation, key analysis
   - `csv-analyzer` (READ_ONLY): Tabular CSV structure, column profiling, row counting
2. **Filesystem Sandbox & Security Guard**: Enforces `ALLOWED_WORKSPACE_ROOTS`, blocks path traversal (`../../`), and strictly denies access to secret files (`.env`, `id_rsa`, `credentials`).
3. **Policy Engine & Approval Integration**: Evaluates tool requests against policies and agent capabilities (`ALLOW`, `DENY`, `REQUIRE_APPROVAL`). High-risk and destructive tools pause in `WAITING_FOR_APPROVAL`.
4. **Secret Protection & Redaction**: Automatically scans tool outputs, audit events, and logs to redact API keys (`sk-...`, `AIza...`), bearer tokens, and private keys.
5. **Idempotency, Retries & Timeouts**: Prevents duplicate executions of identical requests; controlled retry policy (`MAX_RETRIES = 2`) that never retries destructive or unapproved actions; default 30-second execution timeouts.
6. **Action Verification Engine**: Validates disk state after mutations (verifies file existence, sizes, modified timestamps, and output schemas).
7. **Action Audit Logger**: Immutable action ledger recording execution IDs, agents, tools, risk levels, and durations, surfaced in Activity and Advanced Diagnostics.

```
                  PHASE 5 AGENT
                        |
                   TOOL REQUEST
                        |
                   TOOL REGISTRY
                        |
                 CAPABILITY CHECK
                        |
             CONTEXT / PRIVACY CHECK
                        |
               RISK CLASSIFICATION
                        |
                PERMISSION POLICY
                        |
                  APPROVAL GATE
                        |
                  TOOL EXECUTOR
                        |
                   SANDBOX / FS
                        |
                  VERIFICATION
                        |
                   AUDIT LOGGER
                        |
                  FINAL RESPONSE
```

---

## API Endpoints (Phases 1 through 6)

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
| `GET` | `/api/v1/tasks` | List all orchestration tasks |
| `POST` | `/api/v1/tasks` | Create task and generate intelligent DAG plan |
| `POST` | `/api/v1/tasks/:id/execute` | Execute task plan through DAG execution engine |
| `GET` | `/api/v1/agents` | List registered agents and capabilities |
| `GET` | `/api/v1/approvals` | List pending human approval requests |
| `POST` | `/api/v1/approvals/:id/approve` | Grant approval and resume execution |
| `POST` | `/api/v1/approvals/:id/reject` | Reject action |
| `GET` | `/api/v1/tools` | List registered tools, categories, and schemas |
| `GET` | `/api/v1/tools/:id` | Get individual tool definition |
| `GET` | `/api/v1/tools/capabilities` | Map of available tool capabilities |
| `GET` | `/api/v1/tools/policies` | Policy engine settings and sandbox roots |
| `GET` | `/api/v1/tools/status` | Tool engine diagnostic status report |
| `POST` | `/api/v1/tools/validate` | Validate tool input against schema |
| `POST` | `/api/v1/tools/execute` | Controlled tool execution with policy & approval enforcement |
| `GET` | `/api/v1/tools/executions` | List tool execution records |
| `GET` | `/api/v1/tools/executions/:id` | Get specific tool execution details |
| `POST` | `/api/v1/tools/executions/:id/cancel` | Cancel tool execution |
| `GET` | `/api/v1/actions` | Auditable action history log |
| `GET` | `/api/v1/actions/:id` | Get specific action audit event |
| `GET` | `/api/v1/memory` | List stored memories with optional `?type=` filter |
| `POST` | `/api/v1/memory` | Explicitly retain new memory (audited by Privacy Guard) |
| `POST` | `/api/v1/memory/search` | Retrieve memories using deterministic ranking |
| `DELETE` | `/api/v1/memory/:id` | Permanently delete individual memory |

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

