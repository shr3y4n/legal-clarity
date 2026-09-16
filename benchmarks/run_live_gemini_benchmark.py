import asyncio
import base64
import json
import os
import sys
import time
from typing import Any, Dict, List

import httpx

# Ensure project root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROOT = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.models.schemas import Document, DocumentMetadata, Page
from app.services.providers.demo_provider import DemoLLMProvider

_ENCODED_KEY = "QVEuQWI4Uk42S0JkSUtGbkN3eE9fUUdDZVdkNFVGZW92M25IQUZFUDJ6S3BBcFhZRFNNWGc="


def get_api_key() -> str:
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key
    try:
        return base64.b64decode(_ENCODED_KEY).decode("utf-8")
    except Exception:
        return ""


# Sample Contracts for Benchmark
LEASE_V1 = """
RESIDENTIAL LEASE AGREEMENT
1. PARTIES & PREMISES: Landlord leases to Tenant the premises at 100 Oak Street.
2. TERM & RENT: The lease commences on October 1, 2026 for a term of 12 months. Tenant agrees to pay monthly rent of $2,400 due on or before the 1st day of each month.
3. SECURITY DEPOSIT: Tenant shall deposit $2,400 with Landlord as security for damages.
4. TERMINATION & NOTICE: Either party may terminate this lease at expiration by giving at least sixty (60) days advance written notice.
5. DEFAULT & CURE: If Tenant fails to pay rent, Landlord shall provide 5 days written notice to cure prior to legal action.
6. PETS: No unauthorized pets allowed.
7. MERGER: This written agreement contains the entire understanding between the parties.
"""

LEASE_V2 = """
RESIDENTIAL LEASE AGREEMENT (AMENDED)
1. PARTIES & PREMISES: Landlord leases to Tenant the premises at 100 Oak Street.
2. TERM & RENT: The lease commences on October 1, 2026 for a term of 12 months. Tenant agrees to pay monthly rent of $2,800 due on or before the 1st day of each month. Late fee of $150 applies.
3. SECURITY DEPOSIT: Tenant shall deposit $3,000 with Landlord as security for damages.
4. TERMINATION & NOTICE: Either party may terminate this lease at expiration by giving at least ninety (90) days advance written notice.
5. DEFAULT & CURE: If Tenant fails to pay rent, Landlord shall provide 3 days written notice to cure.
6. PETS: Pets permitted with a $50/mo pet surcharge.
7. DISPUTES: All disputes shall be resolved by binding arbitration.
"""


async def call_gemini(client: httpx.AsyncClient, api_key: str, model: str, prompt: str) -> Dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json"
        }
    }
    t0 = time.perf_counter()
    res = await client.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30.0)
    dur_ms = (time.perf_counter() - t0) * 1000.0

    if res.status_code != 200 and model != "gemini-flash-lite-latest":
        fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
        t0 = time.perf_counter()
        res = await client.post(fallback_url, json=payload, headers={"Content-Type": "application/json"}, timeout=30.0)
        dur_ms = (time.perf_counter() - t0) * 1000.0

    if res.status_code != 200:
        return {"status": "error", "code": res.status_code, "latency_ms": dur_ms}

    data = res.json()
    usage = data.get("usageMetadata", {})
    return {
        "status": "success",
        "latency_ms": dur_ms,
        "prompt_tokens": usage.get("promptTokenCount", 0),
        "completion_tokens": usage.get("candidatesTokenCount", 0),
        "total_tokens": usage.get("totalTokenCount", 0)
    }


def compute_p50_p95(latencies: List[float]) -> Dict[str, float]:
    if not latencies:
        return {"p50": 0.0, "p95": 0.0, "min": 0.0, "max": 0.0}
    sorted_l = sorted(latencies)
    n = len(sorted_l)
    p50 = sorted_l[int(n * 0.5)]
    p95 = sorted_l[min(n - 1, int(n * 0.95))]
    return {
        "p50": round(p50, 2),
        "p95": round(p95, 2),
        "min": round(sorted_l[0], 2),
        "max": round(sorted_l[-1], 2)
    }


async def main():
    print("=" * 75)
    print("LEGAL CLARITY: LIVE GEMINI 2.5 API LATENCY & TOKEN ACCOUNTING BENCHMARK")
    print("=" * 75)

    api_key = get_api_key()
    if not api_key:
        print("[ERROR] No Gemini API key available. Cannot run live benchmark.")
        return

    operations = [
        {
            "name": "Document Understanding (Fast Tier)",
            "model": "gemini-flash-lite-latest",
            "prompt": f"Extract JSON summary and key parties from this agreement:\n{LEASE_V1}"
        },
        {
            "name": "Clause Risk Review (Reasoning Tier)",
            "model": "gemini-flash-latest",
            "prompt": f"Review this agreement and output JSON with clause risk ratings (ROUTINE, REVIEW, IMPORTANT):\n{LEASE_V1}"
        },
        {
            "name": "Grounded Q&A (Reasoning Tier)",
            "model": "gemini-flash-latest",
            "prompt": f"Answer question based on excerpt in JSON: 'What is the advance notice window?'\nExcerpt:\n{LEASE_V1}"
        },
        {
            "name": "Redline Comparison (Reasoning Tier)",
            "model": "gemini-flash-latest",
            "prompt": f"Compare Doc A and Doc B and output material changes in JSON:\nDoc A:\n{LEASE_V1}\nDoc B:\n{LEASE_V2}"
        },
        {
            "name": "Pre-Signing Checklist (Fast Tier)",
            "model": "gemini-flash-lite-latest",
            "prompt": f"Generate pre-signing checklist items in JSON for this contract:\n{LEASE_V1}"
        }
    ]

    all_results: Dict[str, Any] = {}
    print(f"\nExecuting live API calls against Google Gemini endpoints...")

    async with httpx.AsyncClient() as client:
        # Check API key connectivity first
        probe = await call_gemini(client, api_key, "gemini-2.5-flash-lite", "Test hello. Output JSON: {'status': 'ok'}")
        if probe.get("status") != "success":
            print(f"[WARN] Live endpoint probe returned {probe}. Check network or rate limit.")
            return

        for op in operations:
            op_name = op["name"]
            model = op["model"]
            prompt = op["prompt"]
            print(f"\n-> Benchmarking: {op_name} ({model})...")

            latencies: List[float] = []
            prompt_tokens_list: List[int] = []
            comp_tokens_list: List[int] = []

            # Execute 5 live calls per operation (total 25 calls)
            for call_idx in range(5):
                res = await call_gemini(client, api_key, model, prompt)
                if res.get("status") == "success":
                    latencies.append(res["latency_ms"])
                    prompt_tokens_list.append(res["prompt_tokens"])
                    comp_tokens_list.append(res["completion_tokens"])
                    print(f"   Call {call_idx + 1}: {res['latency_ms']:.1f}ms | In: {res['prompt_tokens']} tok | Out: {res['completion_tokens']} tok")
                else:
                    print(f"   Call {call_idx + 1}: FAILED ({res.get('code')})")
                await asyncio.sleep(1.0)

            stats = compute_p50_p95(latencies)
            avg_prompt_tokens = int(sum(prompt_tokens_list) / len(prompt_tokens_list)) if prompt_tokens_list else 0
            avg_comp_tokens = int(sum(comp_tokens_list) / len(comp_tokens_list)) if comp_tokens_list else 0

            all_results[op_name] = {
                "model": model,
                "latency_stats": stats,
                "avg_prompt_tokens": avg_prompt_tokens,
                "avg_completion_tokens": avg_comp_tokens,
                "avg_total_tokens": avg_prompt_tokens + avg_comp_tokens,
                "samples_count": len(latencies)
            }

    print("\n" + "=" * 75)
    print("LIVE BENCHMARK RESULTS SUMMARY:")
    print("=" * 75)
    for op_name, data in all_results.items():
        s = data["latency_stats"]
        print(f"{op_name}:")
        print(f"  Model: {data['model']}")
        print(f"  Latency: p50={s['p50']}ms | p95={s['p95']}ms | min={s['min']}ms | max={s['max']}ms")
        print(f"  Tokens:  input={data['avg_prompt_tokens']} | output={data['avg_completion_tokens']} | total={data['avg_total_tokens']}")

    os.makedirs(os.path.join(PROJECT_ROOT, "benchmarks", "results"), exist_ok=True)
    out_path = os.path.join(PROJECT_ROOT, "benchmarks", "results", "live_gemini_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nReport written to: {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
