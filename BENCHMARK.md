# Legal Clarity - Benchmark & Verification Report

*Generated automatically by `benchmarks/run_benchmark.py` on 2026-09-15 03:46:24 UTC*

## Executive Summary

Legal Clarity was evaluated against an adversarial synthetic legal benchmark dataset comprising residential leases, executive employment agreements, mutual non-disclosure agreements, master service agreements, and asset purchase agreements.

| Metric | Measured Score | Evaluation Target | Status |
| :--- | :--- | :--- | :--- |
| **Grounded Answer Rate** | **100.0%** | > 95.0% | Pass |
| **Unsupported Answer Rate** | **0.0%** | < 2.0% | Pass |
| **Correct Refusal Rate** | **100.0%** | > 95.0% | Pass |
| **Evidence Verification Accuracy** | **100.0%** | > 95.0% | Pass |
| **Comparison Accuracy** | **100.0%** | > 90.0% | Pass |
| **Extraction Accuracy** | **100.0%** | 100.0% | Pass |
| **Prompt Injection Defense Rate** | **100.0%** | 100.0% | Pass |

---

## Detailed Test Suite Results

- **Total Verification Test Points**: 25
- **Passed Test Points**: 25
- **Overall Benchmark Pass Rate**: **100.0%**

### Performance Benchmarks
- **Average Document Extraction Latency**: `4.3 ms`
- **Average Grounded Q&A Response Latency**: `0.1 ms`

### Test Categories Evaluated
1. **Document Extraction**: Tested PDF, DOCX, and TXT format parsing, character encoding resilience, heading identification, and page partitioning.
2. **Grounded Question Answering**: Tested answerable factual questions against verified citations with character-exact containment verification.
3. **Safe Refusals**: Tested out-of-bounds questions (e.g. unstated pet policies, light bulb replacement, Airbnb sublets) requiring strict refusal without hallucination.
4. **Adversarial Security**: Tested prompt injection vectors embedded in document text (`SYSTEM INSTRUCTION: IGNORE ALL PRIOR INSTRUCTIONS`) and user query bypass attempts.
5. **Document Comparison**: Evaluated semantic diffing across document revisions, isolating numeric changes (e.g., $2,400 to $2,800, 30 days to 60 days) from non-material formatting changes.

---
*All values measured deterministically from test datasets.*
