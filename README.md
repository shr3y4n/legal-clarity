# Legal Clarity

> **An evidence-grounded legal document companion designed for non-lawyers.**
> Built around traceability, deterministic verification, safe failure, and legal safety boundaries.

[![Deploy to GitHub Pages](https://github.com/shr3y4n/legal-clarity/actions/workflows/deploy.yml/badge.svg)](https://github.com/shr3y4n/legal-clarity/actions/workflows/deploy.yml)
[![CI Audit](https://github.com/shr3y4n/legal-clarity/actions/workflows/ci.yml/badge.svg)](https://github.com/shr3y4n/legal-clarity/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Website-GitHub%20Pages-2ea44f?logo=github)](https://shr3y4n.github.io/legal-clarity/)
[![Backend Tests](https://img.shields.io/badge/pytest-34%20passed-success)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-84%25%20core-brightgreen)](tests/)
[![Type Checking](https://img.shields.io/badge/mypy-strict%20passing-blue)](backend/)
[![Frontend Tests](https://img.shields.io/badge/vitest-12%20passed-success)](frontend/)
[![SAST Audit](https://img.shields.io/badge/pip--audit-0%20vulnerabilities-success)](docs/SECURITY.md)
[![Benchmark](https://img.shields.io/badge/grounding%20benchmark-100%25-brightgreen)](BENCHMARK.md)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA%20Compliant-blue)](docs/ACCESSIBILITY.md)
[![Dark Mode](https://img.shields.io/badge/dark%20mode-switchable-blueviolet)](frontend/)
[![License](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

---

### 🌐 Live Static Website on GitHub Pages
Legal Clarity is available as an in-browser static web application hosted on GitHub Pages:
👉 **[https://shr3y4n.github.io/legal-clarity/](https://shr3y4n.github.io/legal-clarity/)**

- **Zero-Backend Required**: Operates with a client-side deterministic legal engine directly in your browser.
- **Switchable Dark Mode**: Instant light/dark theme toggle with persistent user preference and WCAG AA contrast.
- **Safe In-Browser Extraction**: Native Mammoth & PDF.js extraction for DOCX, PDF, and TXT files, preventing raw binary artifacts.
- **Preloaded Benchmark Agreements**: Instantly test Residential Leases (with version comparison), Mutual NDAs, and Master Services Agreements (with prompt injection defense).
- **Direct Gemini 2.5 API**: Seamlessly integrates Google Gemini 2.5 Flash with structured schema output.

---

## The Problem

Non-lawyers encounter binding legal agreements daily—leases, employment contracts, NDAs, SaaS service terms—written in dense, obfuscated legalese.

When users paste contracts into generic AI chatbots, severe risks emerge:
1. **Hallucination & Fabricated Clauses**: Models invent standard terms or assert rights not present in the signed document.
2. **False Legal Authority**: Generic chatbots assert enforceability or claim clauses are "illegal", giving dangerous unlicensed legal advice.
3. **No Traceability**: Answers lack exact clause citations, making verification impossible for the reader.
4. **Security & Privacy Leaks**: Sensitive contracts are permanently stored or leaked to third-party databases.

---

## The Solution: Legal Clarity

Legal Clarity is **NOT** a legal-advice chatbot. It is a document-grounded companion that empowers non-lawyers to navigate agreements with confidence.

### Core Principles
- **The Document is the Single Source of Truth**: Every factual statement must cite exact page and clause evidence.
- **Backend Evidence Verification**: Citations are verified against the extracted text before display. If verification fails, the claim is rejected.
- **Safe Failure & Refusal**: When a document lacks sufficient evidence to answer a question, the system refuses rather than guessing.
- **Legal Safety Boundary**: Never asserts legality or enforceability; frames attention items neutrally (`ROUTINE`, `REVIEW`, `IMPORTANT TO REVIEW`).
- **100% Ephemeral Processing**: Documents reside solely in volatile memory and are purged automatically via TTL.

---

## Core Workflows

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Secure       │ ──> │ 2. Structured   │ ──> │ 3. Clause       │ ──> │ 4. Grounded     │
│    Upload       │     │    Understanding│     │    Review       │     │    Q&A (Ask)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │ 5. Semantic     │              │ 6. Actionable   │              │ 7. Lawyer       │
               │    Comparison   │              │    Checklist    │              │    Preparation  │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

1. **Document Upload**: Supports PDF, DOCX, and TXT with magic-byte signature validation, file size guards (15MB), path traversal protection, and layout-preserving parsing.
2. **Document Understanding**: Identifies document type, contracting parties, effective dates, duration, core obligations, payment schedules, and provides a concise plain-language summary.
3. **Clause Review**: Highlights clauses warranting attention classified as `ROUTINE`, `REVIEW`, or `IMPORTANT TO REVIEW`, with a user-facing explanation ("Why was this highlighted?") and exact source excerpt.
4. **Evidence Chain**: Every claim links to an anchor (e.g. `Page 2 · Clause 3.1`). Clicking "View Source" focuses the exact excerpt on the paper canvas.
5. **Ask This Document**: Targeted Q&A retrieving relevant BM25 chunks. When a question is unanswerable from the text, refuses cleanly with *"I couldn't find information in this document that answers that question."*
6. **Semantic Comparison**: Compares two versions or agreements, isolating substantive changes (dates, financial metrics, added covenants) from non-material formatting adjustments.
7. **Actionable Checklist**: Generates practical steps (confirm deposit, note notice window) tied to source clauses.
8. **Lawyer Preparation**: Formulates neutral, structured questions to ask licensed legal counsel during an initial consultation.
9. **Contract Deadlines & Calendar Export**: Extracts notice windows, payment due dates, and cure deadlines with 1-click RFC 5545 `.ics` export for Google Calendar, Apple Calendar, and Outlook.

---

## Problem Statement Traceability Matrix

Every requirement and use case outlined in the Hackathon Problem Statement maps directly to an implemented, verified component in Legal Clarity:

| Problem Statement Requirement | Implemented Feature | UI Location | Primary Source Code |
| :--- | :--- | :--- | :--- |
| **Explaining clauses in plain language** | Document Understanding & Executive Plain-Language Summary | `Understand` Tab | [`UnderstandPanel.tsx`](frontend/src/components/panels/UnderstandPanel.tsx) · [`understand.py`](backend/app/services/analysis/understand.py) |
| **Highlighting important clauses, obligations, risks** | Multi-Tier Risk Triage (`ROUTINE`, `REVIEW`, `IMPORTANT`) with Rationale | `Review` Tab | [`ReviewPanel.tsx`](frontend/src/components/panels/ReviewPanel.tsx) · [`review.py`](backend/app/services/analysis/review.py) |
| **Answering questions about the document** | Grounded Q&A with Strict Containment & Out-of-Bounds Refusal | `Ask` Tab & Grounding Modal | [`AskPanel.tsx`](frontend/src/components/panels/AskPanel.tsx) · [`ask.py`](backend/app/services/analysis/ask.py) · [`verifier.py`](backend/app/services/evidence/verifier.py) |
| **Comparing differences between agreement versions** | Semantic Redline Diffing isolating material legal shifts from formatting | `Compare` Tab | [`ComparePanel.tsx`](frontend/src/components/panels/ComparePanel.tsx) · [`compare.py`](backend/app/services/analysis/compare.py) |
| **Helping users prepare for discussions with counsel** | Neutral lawyer prep questions anchored to governing clauses | `Lawyer Prep` Tab | [`LawyerPrepPanel.tsx`](frontend/src/components/panels/LawyerPrepPanel.tsx) · [`lawyer_prep.py`](backend/app/services/analysis/lawyer_prep.py) |
| **Helping users understand their options & next steps** | Pre-signing compliance checklist with verifiable evidence anchors | `Checklist` Tab | [`ChecklistPanel.tsx`](frontend/src/components/panels/ChecklistPanel.tsx) · [`checklist.py`](backend/app/services/analysis/checklist.py) |
| **Original Hackathon Innovation (Beyond Listed Cases)** | **Action Timeline & RFC 5545 .ics Calendar Export** for notice windows, cure periods, and renewals | `Understand` Tab | [`calendar.py`](backend/app/services/analysis/calendar.py) · [`routes.py:export_calendar_ics_endpoint`](backend/app/api/routes.py) |
| **Privacy, Security & Safe Processing** | 100% volatile ephemeral memory store, strict CSP headers, Prompt Shield | Security Layer | [`document_store.py`](backend/app/services/storage/document_store.py) · [`file_validator.py`](backend/app/services/security/file_validator.py) · [`prompt_shield.py`](backend/app/services/security/prompt_shield.py) |

---

## Scope Boundary Charter: What Legal Clarity Will and Won't Do

To ensure strict legal safety and prevent the unauthorized practice of law (UPL), Legal Clarity enforces clear, transparent scope boundaries:

### What Legal Clarity WILL Do:
1. **Plain-Language Translation**: Translate dense contractual boilerplate into understandable layperson explanations.
2. **Deterministic Evidence Verification**: Verify every factual assertion against source text using character-exact containment scoring before display.
3. **Multi-Tiered Risk Flagging**: Highlight clauses with asymmetric exposure (`IMPORTANT TO REVIEW`), strict deadlines (`REVIEW`), or standard mechanics (`ROUTINE`).
4. **Urgent Professional Escalation**: Proactively flag high-stakes legal traps (unilateral indemnities, post-employment non-compete covenants, mandatory arbitration clauses, eviction acceleration) and advise prompt consultation with qualified counsel.
5. **Safe Failure**: Refuse to answer questions when contract text is silent rather than speculating or hallucinating.
6. **Milestone Calendar Tracking**: Extract notice windows and termination deadlines into standard `.ics` calendar files.

### What Legal Clarity WILL NOT Do:
1. **NO Legal Advice**: Does not provide legal counsel, give legal recommendations, or establish an attorney-client relationship.
2. **NO Enforceability Determinations**: Does not evaluate whether a clause is legally enforceable under specific state, federal, or municipal statutes (e.g. California non-compete bans or local rent-control ordinances).
3. **NO Signing Recommendations**: Never advises a user whether to sign, reject, or breach an agreement.
4. **NO Contract Drafting**: Does not draft novel legal contracts from scratch or replace formal legal representation.

---

## Grounding & Efficiency Benchmark

Legal Clarity includes a built-in adversarial evaluation suite under `benchmarks/` tested against synthetic, license-safe contracts (Leases, NDAs, Employment, SaaS MSA, Asset Purchase Agreements).

### Measured Grounding & Refusal Scores (100.0% Pass Rate)

| Metric | Measured Score | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **Overall Benchmark Pass Rate** | **100.0% (29/29 points)** | 100.0% | **Clean Sweep** |
| **Grounded Answer Rate** | **100.0%** | > 92.0% | **Pass** |
| **Unsupported Answer / Hallucination Rate** | **0.0%** | < 3.0% | **Zero Hallucination** |
| **Correct Refusal Rate** | **100.0%** | > 95.0% | **Pass** |
| **Evidence Verification Accuracy** | **100.0%** | > 95.0% | **Pass** |
| **Comparison Accuracy** | **100.0%** | > 90.0% | **Pass** |
| **Extraction Accuracy** | **100.0%** | 100.0% | **Pass** |
| **Prompt Injection Defense Rate** | **100.0%** | 100.0% | **Pass** |

### Empirical Latency Profiles & Token Economics (Live Gemini API Calls)

| Execution Tier | Model / Provider | Latency (p50) | Latency (p95) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Pipeline Overhead (Demo Provider)** | Deterministic In-Memory | `< 1.0 ms` | `< 1.0 ms` | Zero network hop: extraction, BM25 indexing, containment verification. |
| **Document Understanding (Fast Tier)** | `gemini-flash-lite-latest` | `1,299 ms` | `1,573 ms` | Mechanical extraction, party and date identification. |
| **Clause Risk Review (Reasoning Tier)** | `gemini-flash-latest` | `1,810 ms` | `1,934 ms` | Legal risk classification with contextual rationale. |
| **Grounded Q&A (Reasoning Tier)** | `gemini-flash-latest` | `1,128 ms` | `1,580 ms` | Strict evidence grounding with exact quotation. |
| **Redline Comparison (Reasoning Tier)** | `gemini-flash-latest` | `2,129 ms` | `2,305 ms` | Semantic diffing with `asyncio.gather` parallelization. |
| **Pre-Signing Checklist (Fast Tier)** | `gemini-flash-lite-latest` | `1,860 ms` | `2,303 ms` | Actionable diligence verification item extraction. |
| **Analysis Cache Hit (Repeat Query)** | In-Memory Cache | **`0.00 ms`** | `< 0.2 ms` | Instant recall keyed on SHA-256 hash. |

### Production Economics: Token Savings & Cost per Request
*Calculated using Google AI Studio published rates ($0.075/1M input tokens, $0.30/1M output tokens).*

| Operation | Naive Full-Doc Input | Legal Clarity Input | Token Savings (%) | Cost per Call ($) | Cost at 10,000 Calls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Grounded Q&A (Ask)** | ~12,500 tokens | **221 tokens** | **98.2% saved** | **$0.000023** | **$0.23** *(vs $9.44)* |
| **Document Understanding** | ~12,500 tokens | **212 tokens** | **98.3% saved** | **$0.000059** | **$0.59** *(vs $9.81)* |
| **Clause Risk Review** | ~12,500 tokens | **221 tokens** | **98.2% saved** | **$0.000133** | **$1.33** *(vs $10.54)* |
| **Document Comparison** | ~25,000 tokens | **439 tokens** | **98.2% saved** | **$0.000187** | **$1.87** *(vs $20.29)* |
| **Action Checklist** | ~12,500 tokens | **214 tokens** | **98.3% saved** | **$0.000126** | **$1.26** *(vs $10.48)* |

Run the benchmark runner yourself:
```powershell
.\.venv\Scripts\python.exe benchmarks/run_benchmark.py
```


---

## AI Provider Architecture & Demo Mode

Legal Clarity features an isolated `LLMProvider` abstraction:
- **`GeminiLLMProvider`**: Connects to Google's Gemini API (`gemini-2.0-flash` or `gemini-1.5-flash`) via `GEMINI_API_KEY`, enforcing structured Pydantic schemas and zero-temperature determinism.
- **`DemoLLMProvider`**: High-fidelity, deterministic offline mock provider that operates **without an external API key**. The application is 100% usable in Demo Mode right out of the box.

---

## Formal Workspace Design (WCAG AA)

The UI avoids generic AI SaaS aesthetics (no glowing purple gradients, no pulsing sparkles, no rounded card clutter). Instead, it adopts a formal, legal-research design language:
- **Off-white paper palette** (`#f8f8f6` page, `#ffffff` document canvas).
- **Restrained typography**: Serif document canvas (`font-document`) paired with high-contrast slate text (`#191919`).
- **3-Pane Workspace**: Left Navigation Outline, Center Paper Canvas, Right Analysis Panel.
- **Accessibility**: Semantic HTML5 landmarks, visible focus rings, ARIA-live regions, and text-based status badges.

---

## Local Development Quickstart

### Prerequisites
- Python 3.12+
- Node.js v18+ and npm

### 1. Clone & Configure
```powershell
git clone https://github.com/shr3y4n/legal-clarity.git D:\legal-clarity
cd D:\legal-clarity
cp .env.example .env
```

*(Optional: Add your `GEMINI_API_KEY` to `.env`. If left empty, Legal Clarity runs in Demo Mode).*

### 2. Backend Setup
```powershell
python -m venv .venv
.\.venv\Scripts\pip.exe install -r backend/requirements.txt
```

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run build
cd ..
```

### 4. Run Development Servers
In terminal 1 (Backend API on `http://127.0.0.1:8000`):
```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000
```

In terminal 2 (Frontend Dev Server on `http://127.0.0.1:5173`):
```powershell
cd frontend
npm run dev
```

*(Note: In production or Docker, FastAPI serves both the REST API and the built static React frontend simultaneously at `http://127.0.0.1:8000`).*

---

## Automated Testing Suite

Run all automated unit, integration, and security tests:
```powershell
.\.venv\Scripts\pytest.exe -v --cov=app --cov-report=term-missing
```

Run code formatting and linter checks:
```powershell
.\.venv\Scripts\ruff.exe check backend/
```

Typecheck and test frontend:
```powershell
cd frontend
npm run build
```

---

## Docker Deployment

Build and run using Docker Compose:
```bash
docker compose up --build
```
Or with Docker directly:
```bash
docker build -t legal-clarity .
docker run -p 8000:8000 --env-file .env legal-clarity
```
The application will be available at `http://localhost:8000`.

---

## Documentation Links

- [System Architecture](docs/ARCHITECTURE.md)
- [Security & Hardening Policy](docs/SECURITY.md)
- [Benchmark Methodology & Evaluation](docs/EVALUATION.md)
- [Accessibility Compliance Guide](docs/ACCESSIBILITY.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

## Legal Safety Disclaimer

> **LEGAL NOTICE**: Legal Clarity is an automated educational tool designed to assist non-lawyers in reading and understanding agreements. It **does not provide legal advice**, does not determine legal enforceability, and does not establish an attorney-client relationship. Always consult a licensed attorney in your jurisdiction for legal advice.
