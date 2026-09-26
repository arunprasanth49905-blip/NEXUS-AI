# NEXUS EDGE

> **"Understand what you're doing. Get intelligent help. Keep your data private."**

NEXUS EDGE is a context-aware edge AI workspace designed to operate with strict local-first boundaries, truthful hardware disclosures, and zero remote cloud telemetry.

---

## Architecture Milestone: Phase 2 — AI Runtime Engine / Hardware-Aware Inference

Phase 2 builds a production-grade, hardware-aware execution layer that answers: **"Where should this AI task run?"**

```
USER TASK
   ↓
TASK & MODEL REQUIREMENTS
   ↓
RUNTIME MANAGER
   ↓
HARDWARE DETECTOR
   ↓
PROVIDER REGISTRY
┌─────────────────────────────────┐
│ 1. Qualcomm® QNN / Snapdragon® │
│ 2. GPU (CUDA / DirectML)       │
│ 3. CPU (Native Host Baseline)   │
└─────────────────────────────────┘
   ↓
MODEL MANAGER & COMPATIBILITY
   ↓
RUNTIME SELECTION (QNN → GPU → CPU)
   ↓
INFERENCE ENGINE
   ↓
ACTUAL MEASURED TELEMETRY
   ↓
RESULT + EXPLANATION
```

### Core Architecture Components

1. **Hardware Detector (`server/detector.ts`)**:
   - Inspects host processor, architecture, CPU physical cores, and logical threads.
   - Detects Snapdragon processor signatures without false positives.
   - Distinguishes between **GPU hardware presence** and **accelerated inference runtime availability**.
   - Validates Qualcomm QNN SDK paths and dynamic libraries (`libQnnHtp.so` / `QnnHtp.dll`).

2. **Runtime Providers (`server/providers/`)**:
   - **`CPUProvider` (`server/providers/cpu.ts`)**: Reliable baseline execution engine. Executes real semantic context classification, intent detection, and measures authentic clock cycles and latency.
   - **`GPUProvider` (`server/providers/gpu.ts`)**: Honest GPU detection. Returns `NOT_AVAILABLE` or `NOT_CONFIGURED` unless native compute runtimes are initialized.
   - **`QNNProvider` (`server/providers/qnn.ts`)**: Snapdragon Hexagon NPU provider. Returns `NOT_AVAILABLE` on x86_64 machines without Qualcomm hardware.

3. **Runtime Selection Engine (`server/selection.ts`)**:
   - Evaluates provider chain: `QNN → GPU → CPU`.
   - Selects only genuinely available, initialized, and model-compatible providers.
   - Transparently exposes `fallback_used` and `fallback_reason`.

4. **Model Manager (`server/models.ts`)**:
   - Manages model lifecycle (`DISCOVERED → VALIDATING → READY → UNLOADED`).
   - Supports ONNX, GGUF, TorchScript, and Qualcomm QNN DLC model containers.

5. **Runtime Explanation Engine**:
   - Answers: *"Why did NEXUS select this runtime?"* with verifiable facts based on current hardware state.

6. **Benchmarking & Telemetry**:
   - Computes authentic inference latency (min, max, average) across test iterations.
   - Zero synthetic benchmark generation or fabricated TOPS.

---

## Truthful Hardware Disclosure Policy

In accordance with strict technical integrity standards:
- **No Synthetic Benchmarks**: Latency metrics are measured directly from execution using `performance.now()`.
- **No Fabricated Acceleration**: Snapdragon NPU and Qualcomm QNN are never reported as active unless native libraries and hardware are detected.
- **Normal PC Compatibility**: On a standard Windows or Linux x86_64 computer, NEXUS EDGE truthfully reports:
  - CPU: **READY**
  - GPU: **NOT CONFIGURED** / **NOT AVAILABLE**
  - QNN: **NOT DETECTED**
  - Snapdragon: **NOT DETECTED**
  - Active Provider: **CPU (Fallback)**

---

## API Endpoints (Phase 1 & Phase 2)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health, service status, and active provider |
| `GET` | `/api/v1/system` | Authentic host hardware specs and acceleration state |
| `GET` | `/api/v1/context` | Active context, boundary state, and model reference |
| `POST` | `/api/v1/assistant/query` | Primary assistant endpoint (executes hardware-aware inference) |
| `GET` | `/api/v1/runtime/status` | Comprehensive runtime state, selection, and explanation |
| `GET` | `/api/v1/runtime/providers` | Status and capabilities for QNN, GPU, and CPU providers |
| `GET` | `/api/v1/runtime/capabilities` | Detailed hardware acceleration feature matrix |
| `GET` | `/api/v1/runtime/models` | Registered model metadata and supported provider targets |
| `POST` | `/api/v1/runtime/models/load` | Load model into runtime memory |
| `POST` | `/api/v1/runtime/models/unload` | Unload model from runtime memory |
| `POST` | `/api/v1/runtime/select` | Test runtime provider selection against criteria |
| `POST` | `/api/v1/inference` | Direct inference execution endpoint with telemetry |
| `GET` | `/api/v1/runtime/telemetry` | Recent execution latency and memory usage log |
| `POST` | `/api/v1/runtime/benchmark` | Run iterative benchmark on selected provider |

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Run Development Server

```bash
npm run dev
```

Server starts on `http://0.0.0.0:3000`.

### 4. Run Automated Test Suite

```bash
npm test
```

### 5. Production Build

```bash
npm run build
npm start
```

---

## Verification Checklist

- [x] Phase 1 UI and routes preserved (Home, Ask NEXUS, Knowledge, Activity, Settings, Diagnostics)
- [x] Honest hardware detection (zero fabricated Snapdragon or NPU claims on x86_64)
- [x] Distinct GPU device vs GPU inference provider state
- [x] QNN provider with Qualcomm SDK and library discovery
- [x] Hierarchical runtime selection (`QNN → GPU → CPU`) with transparent fallback
- [x] Model Manager with multi-format support
- [x] "Why this runtime?" explanation card in UI
- [x] Real iterative latency benchmarking (min/max/average)
- [x] Automated test suite passing with 100% success
- [x] Clean production build (`npm run build`)
