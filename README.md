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

---

## API Endpoints (Phases 1, 2, 3, 4 & 5)

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
| `GET` | `/api/v1/tasks` | List all orchestration tasks |
| `POST` | `/api/v1/tasks` | Create task and generate intelligent DAG plan |
| `GET` | `/api/v1/tasks/current` | Retrieve active task goal |
| `DELETE` | `/api/v1/tasks/current` | Clear current active task goal |
| `GET` | `/api/v1/tasks/:id` | Get specific task details |
| `GET` | `/api/v1/tasks/:id/plan` | Get task plan and steps |
| `POST` | `/api/v1/tasks/:id/execute` | Execute task plan through DAG execution engine |
| `GET` | `/api/v1/tasks/:id/status` | Get execution status and step results |
| `POST` | `/api/v1/tasks/:id/cancel` | Cancel task execution safely |
| `GET` | `/api/v1/agents` | List registered agents and capabilities |
| `GET` | `/api/v1/agents/:id` | Get specific agent definition |
| `GET` | `/api/v1/agents/capabilities` | Map of available capabilities and agents |
| `GET` | `/api/v1/approvals` | List pending human approval requests |
| `POST` | `/api/v1/approvals/:id/approve` | Grant approval and resume execution |
| `POST` | `/api/v1/approvals/:id/reject` | Reject action |
| `GET` | `/api/v1/executions` | List agent execution telemetry records |
| `GET` | `/api/v1/orchestrator/status` | Full diagnostic report for Advanced Diagnostics |
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
