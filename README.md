# NEXUS EDGE

> **"Understand what you're doing. Get intelligent help. Keep your data private."**

NEXUS EDGE is a context-aware edge AI workspace designed to operate with strict local-first boundaries, truthful hardware disclosures, multimodal perception, and zero remote cloud telemetry.

---

## Architecture Milestone: Phase 3 — Multimodal Perception Engine

Phase 3 upgrades NEXUS EDGE with an input perception layer across:
1. **TEXT** (Typed and pasted inquiries)
2. **SCREEN** (Explicit user-shared window/monitor frame capture via `getDisplayMedia`)
3. **CAMERA** (User-controlled on-demand snapshot via `getUserMedia` with live local preview)
4. **VOICE** (Push-to-talk speech recognition via Web Speech API)
5. **DOCUMENTS** (Local parsing for PDF, DOCX, TXT, MD, and CSV)

```
                    USER
                      |
        +-------------+-------------+
        |       MULTIMODAL INPUT    |
        +-------------+-------------+
                      |
       +--------------+--------------+
       |       PERCEPTION ENGINE     |
       +--------------+--------------+
          |      |      |      | 
        TEXT   SCREEN CAMERA VOICE
                          |
                      DOCUMENT
                          |
                          ↓
                 NORMALIZATION
                          |
                          ↓
               CONTEXT EXTRACTION
                          |
                          ↓
           UNIFIED MULTIMODAL CONTEXT
                          |
                          ↓
                 PHASE 2 RUNTIME
            (QNN/NPU → GPU → CPU)
                          |
                          ↓
                   AI INFERENCE
```

### Core Perception Components

1. **Privacy Guard (`server/perception/privacy.ts`)**:
   - Strictly enforces user-initiated capture.
   - Enforces zero persistent storage for raw audio, camera frames, and screen captures.
   - Validates file extensions and restricts document sizes (25 MB max).
   - Sanitizes and purges transient memory immediately upon context extraction.

2. **Perception Providers (`server/perception/providers.ts`)**:
   - **`LocalOCRProvider`**: Truthful extraction. Returns `NOT_AVAILABLE` when native binaries are absent; avoids fabricated text.
   - **`LocalVisionProvider`**: Inspects authentic image dimensions and structural headers without fake object/scene detection.
   - **`SpeechProvider`**: Native browser SpeechRecognition push-to-talk abstraction with graceful browser fallback.

3. **Document Extractor (`server/perception/extractor.ts`)**:
   - Parses CSV into column schemas, row counts, and sample records.
   - Extracts Markdown headings, structure, and word counts.
   - Inspects PDF text streams safely without heavy binary bloat.
   - Parses DOCX paragraph XML structures.

4. **Perception Manager (`server/perception/manager.ts`)**:
   - Normalizes all input modalities into a unified schema (`NexusContextObject`).
   - Merges multiple concurrent modalities into a cohesive prompt representation passed into the Phase 2 Hardware-Aware Runtime.

5. **User Interface Integration (`src/pages/AskNexus.tsx`)**:
   - Push-to-talk microphone button (`Listening...` / `Transcribed`).
   - Screen capture button with browser window picker.
   - Camera modal with start, live preview, on-demand snapshot, and stop controls.
   - Local document file attachment.
   - `ContextPreviewBar` displaying active attached modalities before sending.

---

## API Endpoints (Phases 1, 2, & 3)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health, service status, and active provider |
| `GET` | `/api/v1/system` | Authentic host hardware specs and acceleration state |
| `GET` | `/api/v1/context` | Active context, boundary state, and model reference |
| `POST` | `/api/v1/assistant/query` | Unified assistant query accepting text + multimodal context IDs |
| `GET` | `/api/v1/runtime/status` | Comprehensive runtime state, selection, and explanation |
| `POST` | `/api/v1/runtime/benchmark` | Iterative benchmark on selected provider |
| `GET` | `/api/v1/perception/status` | Availability status for text, screen, camera, voice, doc, OCR, vision |
| `POST` | `/api/v1/perception/text` | Normalize typed/pasted text into context |
| `POST` | `/api/v1/perception/screen` | Ingest and inspect user screen capture frame |
| `POST` | `/api/v1/perception/camera` | Ingest and inspect on-demand camera snapshot |
| `POST` | `/api/v1/perception/voice` | Ingest transcribed push-to-talk speech |
| `POST` | `/api/v1/perception/document` | Safe local upload and structural text extraction |
| `GET` | `/api/v1/perception/context` | Retrieve all active session perception contexts |
| `POST` | `/api/v1/perception/context/merge` | Merge multiple contexts into unified multimodal context |

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
