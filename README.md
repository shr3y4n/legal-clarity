# Legal Clarity

> **An evidence-grounded legal document companion designed for non-lawyers.**
> Built around traceability, deterministic verification, safe failure, and legal safety boundaries.

[![Deploy to GitHub Pages](https://github.com/shr3y4n/legal-clarity/actions/workflows/deploy.yml/badge.svg)](https://github.com/shr3y4n/legal-clarity/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Website-GitHub%20Pages-2ea44f?logo=github)](https://shr3y4n.github.io/legal-clarity/)
[![Tests](https://img.shields.io/badge/pytest-29%20passed-success)](tests/)
[![Benchmark](https://img.shields.io/badge/grounding%20benchmark-100%25-brightgreen)](BENCHMARK.md)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA%20Compliant-blue)](docs/ACCESSIBILITY.md)
[![License](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

---

### 🌐 Live Static Website on GitHub Pages
Legal Clarity is available as an in-browser static web application hosted on GitHub Pages:
👉 **[https://shr3y4n.github.io/legal-clarity/](https://shr3y4n.github.io/legal-clarity/)**

- **Zero-Backend Required**: Operates with a client-side deterministic legal engine directly in your browser.
- **Preloaded Benchmark Agreements**: Instantly test Residential Leases (with version comparison), Mutual NDAs, and Master Services Agreements (with prompt injection defense).
- **Optional Direct Gemini API**: Users can enter their personal Google Gemini API key to run live neural analyses client-side without storing keys on any server.

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

---

## Grounding & Benchmark Results

Legal Clarity includes a built-in adversarial evaluation suite under `benchmarks/` tested against synthetic, license-safe contracts (Leases, NDAs, Employment, SaaS MSA, Asset Purchase Agreements).

Measured benchmark results from `BENCHMARK.md`:

| Metric | Measured Score | Benchmark Target |
| :--- | :--- | :--- |
| **Grounded Answer Rate** | **100.0%** | > 95.0% |
| **Unsupported Answer Rate** | **0.0%** | < 2.0% |
| **Correct Refusal Rate** | **100.0%** | > 95.0% |
| **Evidence Verification Accuracy** | **100.0%** | > 95.0% |
| **Comparison Accuracy** | **100.0%** | > 90.0% |
| **Extraction Accuracy** | **100.0%** | 100.0% |
| **Security Defense Rate** | **100.0%** | 100.0% |

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

---

## Legal Safety Disclaimer

> **LEGAL NOTICE**: Legal Clarity is an automated educational tool designed to assist non-lawyers in reading and understanding agreements. It **does not provide legal advice**, does not determine legal enforceability, and does not establish an attorney-client relationship. Always consult a licensed attorney in your jurisdiction for legal advice.
