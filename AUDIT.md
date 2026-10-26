# AICTE Samanvay (समन्वय) — Comprehensive System & Security Audit (Phase 0)

> **Date:** October 26, 2026  
> **Status:** Phase 0 Complete — No code changes made.  
> **Scope:** Entire repository (`frontend/`, `backend/`, `ai-engine/`, `db/`, orchestration scripts, and configuration).

---

## 1. Executive Summary

This audit establishes the ground truth of the current codebase prior to beginning Phase 1. While the application presents a sophisticated UI and comprehensive data models covering 14 regulatory novelties, critical subsystems rely on **in-memory/localStorage mock fallbacks, naive keyword matching, non-semantic hashing fallbacks, and unauthenticated mock JWT generation**.

---

## 2. Live vs. Mocked Inventory

### 2.1 Frontend (`frontend/src/services/api.ts`)
The frontend client contains a full duplicate in-memory & `localStorage` simulation engine. When any backend request fails or returns empty data, it **silently falls back to local data without warning the user**:

| Function / Endpoint | Live Backend Call | Fallback Mock Behavior | Exact Location |
| :--- | :--- | :--- | :--- |
| `getCases()` | `GET /api/cases` | Falls back to `localStorage['samanvay_complaints_v2']` or `INITIAL_COMPLAINTS`. Filters locally by region/bureau. | `api.ts:163-191` |
| `getCaseById()` | `GET /api/cases/:id` | Searches `localStorage`. | `api.ts:194-201` |
| `createCase()` | `POST /api/cases` | Creates object in `localStorage`, generates client-side Genesis SHA-256 block. | `api.ts:204-266` |
| `updateStatus()` | `PUT /api/cases/:id/status` | Updates `localStorage`, computes and appends deterministic audit block in browser. | `api.ts:269-298` |
| `getAuditLogs()` | `GET /api/audit/:caseId` | Auto-generates 3 synthetic audit blocks in browser if not found in `localStorage`. | `api.ts:331-433` |
| `verifyChain()` | `GET /api/audit/verify/:caseId` | Recomputes Web Crypto SHA-256 hashes across blocks in browser; performs client-side verification. | `api.ts:436-531` |
| `getOverlaps()` | `GET /api/overlaps` | Returns `localStorage['samanvay_overlaps_v2']` or `INITIAL_OVERLAPS`. | `api.ts:534-540` |
| `resolveOverlap()` | `POST /api/overlaps/:id/resolve` | Updates overlap in `localStorage`, sets paired cases to `JOINT_INQUIRY`. | `api.ts:543-586` |
| `getStats()` | `GET /api/stats/summary` | Aggregates `localStorage` complaints. Hardcodes fallback ₹42,60,000 relief & 142 students. | `api.ts:589-647` |
| `getGraphData()` | `GET /api/graph/relationships` | Generates Cytoscape nodes/edges from `INITIAL_INSTITUTIONS` and local cases. | `api.ts:650-745` |
| `getRegionalRootCauses()` | `POST /api/analytics/root-causes` | Returns static hardcoded root-cause clusters (e.g. Certificate Retention, Caution Money). | `api.ts:748-800` |
| `getSeasonalForecast()` | `GET /api/analytics/seasonal-forecast` | Multiplies 12 static monthly numbers by regional coefficients. | `api.ts:803-840` |
| `checkContradictions()` | `GET /api/workflow/contradictions/:pid` | Returns static mock object with refund vs withhold conflict. | `api.ts:843-870` |
| `Workflow Subtasks / Transfers` | `GET / POST /api/workflow/*` | Full fallback to `localStorage` or initial fixtures. | `api.ts:873-1144` |

### 2.2 AI Microservice (`ai-engine/main.py`)
| Capability | Production / Model Path | Fallback Mode | Issue / Evaluation |
| :--- | :--- | :--- | :--- |
| **Dense Vector Embeddings** | `SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")` | **Deterministic Hash Projection** (`generate_airgapped_embedding`) | If model weights are not pre-downloaded, it computes `SHA-256(token) % 384`. **This is purely pseudo-random lexical hashing, not semantic embedding.** Two synonyms have 0.0 cosine similarity. |
| **Root Cause Text Corpus** | `req.get("complaint_texts")` | 8 hardcoded complaint strings about caution deposit and certificate bonds | `ai-engine/main.py:533-542`. If empty array passed, falls back to static test strings. |
| **Seasonal Forecaster** | Heuristic monthly calendar | 12 fixed month entries with regional multiplier | `ai-engine/main.py:627-664`. Not connected to database grievance history. |

---

## 3. Hardcoded Constants & Weights Inventory

### 3.1 Overlap Detection Weights & Thresholds
Found in **both** `ai-engine/main.py:270-340` and `backend/service/OverlapService.java:80-120`:
- **$w_1$ (Institution PID Match):** `0.35` (35%)
- **$w_2$ (Semantic Cosine Similarity):** `0.35` (35%)
- **$w_3$ (Category Match):** `0.15` (15%)
- **$w_4$ (Keyword Token Jaccard Match):** `0.15` (15%)
- **Overlap Threshold:** `total_score >= 0.65`
- **Critical Coordination Alert Threshold:** `total_score >= 0.80`
- **PID Mismatch Penalty Cap:** If PIDs differ, max score is capped at `0.45`.
*Note: These weights are duplicated across Java and Python with no calibration on real or labeled benchmark data.*

### 3.2 Anomaly Engine ("3-Sigma" Deficit)
In `ai-engine/main.py:581-585`:
```python
z = round(float((count - mean_freq) / std_freq), 2)
is_anom = z >= 2.0 or count >= 3
```
- The documentation and UI claim **"3-Sigma Systemic Anomaly Detection"** ($\ge 3.0\sigma$).
- The actual implementation uses **$z \ge 2.0$** (2-sigma, 95% confidence).
- Worse, the condition `or count >= 3` completely bypasses the statistical test whenever any phrase appears 3 times, guaranteeing false positives on small sample sets.

### 3.3 Cumulative Institutional Index (CII)
In `StatsController.java` and `db/init.sql:32-34`:
- Base Score: `850`
- Grade Cutoffs:
  - Grade **A**: $\ge 800$
  - Grade **B**: $\ge 700$
  - Grade **C**: $\ge 600$
  - Grade **D**: $< 600$
- Penalties:
  - Volume penalty: `-15` points per active complaint.
  - Recurring grievance penalty: `-30` points.
  - Overdue SLA breach: `-25` points.
  - Disobeyed directive penalty: `-50` points.
*Note: Hardcoded constants with no appeal/review mechanism or empirical weighting.*

### 3.4 Seasonal Influx Heuristics
In `ai-engine/main.py:627-651`:
- Base volumes: Jan: 28, Feb: 32, Mar: 40, Apr: 48, May: 74, Jun: 88, Jul: 125, Aug: 115, Sep: 68, Oct: 92, Nov: 84, Dec: 45.
- Surge percentages: May/Jun: `+65%`, Jul/Aug: `+120%`, Oct/Nov: `+85%`.
- Regional multipliers: Southern: `1.15`, Northern: `1.10`, Western: `0.95`, Eastern: `0.85`.
*Note: Purely synthetic constants hardcoded directly in Python.*

### 3.5 Delay Risk Scoring
In `ai-engine/main.py:417-476`:
- Base score: `0.10`
- Institution risk score $\ge 0.70$: `+0.35`
- Institution risk score $\ge 0.40$: `+0.20`
- SLA breached ($\le 0$ days): `+0.40`
- SLA imminent ($\le 3$ days): `+0.28`
- Active multi-bureau overlap: `+0.20`
- Procedurally complex category: `+0.15`
- Risk level thresholds: Critical $\ge 0.75$, High $\ge 0.50$, Moderate $\ge 0.30$, Low $< 0.30$.

---

## 4. Deep Dive: Contradiction Detection Mechanism

### Current Implementation Flow
1. **Trigger**:
   - `backend/service/ContradictionDetectionService.java` receives `institutionPid`.
   - Fetches active complaints for the institution across bureaus.
   - For each pair where `sourceBureau_A != sourceBureau_B`, extracts directive text from `resolutionNotes` or `subject`.
   - Sends payload to `ai-engine` POST `/detect-contradictions`.
2. **AI Engine Evaluation (`ai-engine/main.py:380-407`)**:
   - Compares lowercased strings against two hardcoded keyword arrays:
     ```python
     refund_words = ["refund", "disburse", "pay back", "return deposit", "release caution", "immediate restitution"]
     hold_words = ["maintain status quo", "withhold", "stay order", "pending scrutiny", "frozen", "do not disburse", "pending bank guarantee"]
     ```
   - Evaluates:
     $$\text{has\_conflict} = (A_{\text{refund}} \land B_{\text{hold}}) \lor (A_{\text{hold}} \land B_{\text{refund}})$$
   - If true: returns `dissonance_score = 0.88`, badge = `"Contradictory Bureau Orders Detected"`.
   - If false: returns `dissonance_score = 0.12`.
3. **Flaws & Limitations**:
   - **Single conflict dimension**: Only checks "refund vs. hold".
   - Completely ignores conflicting intake orders (e.g., Regional Office approval vs. Regulation Bureau punitive freeze), conflicting inspection findings, or date contradictions.
   - Relies on raw string inclusion (`"refund" in text`), easily fooled by negations (*"Do NOT refund"* matches `"refund"`).
   - No structured directive entity model (Action, Target, Subject, Effective Date).

---

## 5. Missing Tests

| Subsystem | Existing Tests | Status |
| :--- | :--- | :--- |
| **Backend (`backend/src/test/`)** | **0 tests** (`src/test` directory does not exist) | ❌ Critical gap. Zero JUnit tests for Spring Boot controllers, services, repositories, or hash chain. |
| **AI Engine (`ai-engine/`)** | **0 tests** (no pytest files or test scripts) | ❌ Critical gap. Zero tests for PII regex, embedding fallback, overlap scorer, or anomaly detection. |
| **Frontend (`frontend/`)** | **0 tests** (no Vitest / Jest configuration) | ❌ Critical gap. Zero component or service tests. |

---

## 6. Security & Air-Gap Compliance Gaps

### 6.1 Authentication & Authorization
- **Unauthenticated Persona Impersonation (`AuthController.java:17-62`)**:
  - `POST /api/auth/login` accepts any arbitrary `persona` string (e.g., `"APEX_ADMIN"`) with **no password validation**.
  - Any user can generate a signed JWT with `ROLE_APEX_ADMIN`.
- **Role Switcher in UI (`Header.tsx`)**:
  - The frontend navigation bar contains a live role dropdown allowing instantaneous switching between Admin, PGRC, Regulation, and Regional roles without re-authenticating.
- **Server-Side Region Scoping Missing**:
  - `CaseController.java:29-45` allows any authenticated user to pass `?region=Northern` and retrieve Northern records, even if their token has `region = Southern`.
  - Scoping is currently enforced only client-side.

### 6.2 Cryptographic Integrity & Audit Trail
- **No Digital Signatures**:
  - Blocks are hashed with SHA-256, but not signed with asymmetric keys (Ed25519/RSA).
  - Anyone with direct database access can alter an earlier row and recompute subsequent SHA-256 hashes cleanly.
- **No External Anchoring / Merkle Roots**:
  - No periodic checkpointing or export mechanism for anchoring the head hash outside the database.

### 6.3 Network & Transport
- **Plain HTTP (Port 80)**:
  - No TLS/HTTPS termination in `nginx.conf`.
  - Credentials and tokens are transmitted in cleartext.
- **Missing Security Headers**:
  - Missing HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy in Nginx reverse proxy.

### 6.4 Air-Gap Feasibility
- `ai-engine/Dockerfile` specifies `SentenceTransformer(model_name_or_path, local_files_only=True)`.
- If the model directory is missing or not pre-baked, the container silently reverts to the non-semantic hash projection instead of warning the administrator.
- No self-test on startup to verify air-gapped model integrity.

---

## 7. Recommended Action Plan for Phase 1

1. **Credibility & Correctness (Phase 1.1 - 1.6)**:
   - Make Anomaly Engine configurable (true $3.0\sigma$ default or time-windowed Poisson baseline) and rename UI/docs.
   - Bundle an actual multilingual model (`multilingual-e5-small` or `paraphrase-multilingual-MiniLM-L12-v2`) in the AI container with startup self-check; keep deterministic fallback behind a clear `TEST_MODE` flag.
   - Upgrade PII redaction: Verhoeff algorithm for Aadhaar validation, PAN card pattern, bank account/IFSC patterns, and offline rule-based entity recognition.
   - Replace keyword contradiction detection with a structured Directive Matrix (RELEASE, WITHHOLD, STAY, REFUND, PENALIZE, FREEZE_INTAKE) with negations handled.
   - Extract hardcoded constants into a single versioned configuration file (`governance-config.json`).
   - Clean up legal terminology across UI, docs, and PDF export (replace "court-admissible" and "tamper-proof").
2. **Testing**:
   - Establish JUnit 5 test suite for backend services.
   - Establish pytest test suite for AI engine algorithms.
