# Legal Clarity - Adversarial Grounding Benchmark Suite

This directory houses the deterministic evaluation dataset and test runner used to benchmark Legal Clarity's evidence-grounding, refusal accuracy, extraction precision, security defenses, and document comparison.

## Methodology & Objectives

Unlike generic AI evaluations that grade creative fluency, Legal Clarity evaluates **grounding and safe failure**:
1. **Source Evidence Traceability**: Can the system cite the exact page and clause supporting every factual claim?
2. **Deterministic Containment Verification**: Does the cited source text actually appear in the uploaded document?
3. **Safe Refusal (Anti-Hallucination)**: When a question cannot be answered purely from the document text, does the system refuse cleanly rather than hallucinating from external legal knowledge?
4. **Adversarial Resilience**: Does the system neutralize prompt injection attacks embedded in untrusted document text or user questions?
5. **Material Difference Isolation**: In document version comparisons, does the system differentiate substantive legal meaning changes (deadlines, financial exposure) from non-material formatting changes?

## Dataset Overview

All documents under `benchmarks/dataset/` are synthetic, license-safe contracts:
- `lease_v1.txt` & `lease_v2.txt`: Residential lease with substantive rate and notice changes.
- `employment_agreement.docx`: Executive employment contract with compensation, severance, and non-compete terms.
- `nda_v1.pdf` & `nda_v2.pdf`: Mutual NDA with confidentiality duration expansion and liquidated damages clause.
- `master_service_agreement.txt`: Service contract containing embedded prompt injection vectors.
- `purchase_agreement.pdf`: Asset purchase agreement with closing conditions and escrow provisions.

## Running the Benchmark

From the project root:
```powershell
.\.venv\Scripts\python.exe benchmarks/run_benchmark.py
```

Outputs:
- Console summary with per-test timing.
- Raw metric JSON: `benchmarks/results/benchmark_report.json`.
- Markdown report: `BENCHMARK.md`.
