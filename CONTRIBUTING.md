# Contributing to Legal Clarity

Thank you for your interest in contributing to **Legal Clarity**! We welcome contributions from developers, legal technologists, and researchers committed to making complex legal documents transparent, accessible, and reliably grounded.

---

## 1. Core Architectural Principles

Before contributing code, please review our foundational design commitments:

1. **Grounding-First & Strict Containment**: We never permit unverified AI claims. Every finding, risk classification, or answer must link directly to an exact textual citation verified against the source document.
2. **Deterministic Fallbacks**: Legal Clarity must remain fully functional offline or without an external API key. The deterministic browser and demo provider engines must remain in parity with the schema contracts.
3. **Privacy & Ephemeral Storage**: User contracts are never persisted to long-term storage or relational databases. All backend storage uses in-memory ephemeral caches with automated time-to-live (TTL) eviction.
4. **Prompt Shielding & Untrusted Data Isolation**: All extracted contract text is treated as potentially untrusted data and wrapped in boundary tags (`<UNTRUSTED_DOCUMENT_DATA>`). System prompts strictly command the LLM to ignore embedded commands.
5. **Clear Legal Safety Boundaries**: Legal Clarity is an educational document companion, not a law firm. It never provides legal advice, predicts litigation outcomes, or advises users whether to sign. Disclaimers are strictly enforced.

---

## 2. Development Setup

### Backend Setup (Python)

```bash
# 1. Clone repository
git clone https://github.com/shr3y4n/legal-clarity.git
cd legal-clarity

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Start local development server
uvicorn backend.app.main:app --reload --port 8000
```

### Frontend Setup (React + Vite + TypeScript)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## 3. Testing & Verification Requirements

Every pull request must pass all continuous verification checks before merge:

### Backend Unit & Integration Tests
```bash
# Run pytest with code coverage report
pytest --cov=app --cov-report=term-missing
```
*Current test suite requires maintaining >80% core code coverage.*

### Strict Type Checking
```bash
# Verify Python type safety with mypy
mypy backend/
```
*Zero type errors permitted across all source files.*

### Frontend Component Tests
```bash
cd frontend
npm test
```
*Vitest runs in jsdom environment verifying UI components and user interaction flows.*

### Security & Dependency Auditing
```bash
# Scan Python virtual environment for known vulnerabilities
pip-audit

# Scan Node.js packages for dependency vulnerabilities
cd frontend
npm audit
```
*Zero high or critical vulnerabilities permitted.*

### Synthetic Grounding Benchmark
```bash
# Execute adversarial grounding evaluation
python benchmarks/run_benchmark.py
```
*Measures extraction precision, grounded Q&A rates, prompt injection defense, and comparison accuracy.*

---

## 4. Git Commit & Pull Request Guidelines

- **Atomic Commits**: Keep commits focused on a single logical change or bug fix.
- **Commit Messages**: Follow standard conventional commit formats:
  - `feat: add token accounting and BM25 savings metric`
  - `fix: resolve style attribute access in docx extractor`
  - `test: add vitest unit tests for header and evidence modal`
  - `docs: detail client-side API key trade-offs in security policy`
- **Zero Plain-Text Secrets**: Never commit live API keys or credentials. Pull requests containing raw secrets will be blocked by GitHub Push Protection.
