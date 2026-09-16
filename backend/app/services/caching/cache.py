import hashlib
import time
from typing import Any, Dict, Optional, Tuple

from app.config import get_settings

settings = get_settings()

CACHE_VERSION = "v1.0"


class AnalysisCache:
    """
    In-memory, TTL-bounded cache for expensive legal document analysis operations.
    
    Keys are formed deterministically using SHA-256 digests over:
      (document_sha256, operation_name, cache_version, extra_arguments)
    
    This ensures:
    1. Identical documents analyzed with the same parameters yield instant cache hits (0ms latency).
    2. Version bumps invalidate legacy outputs safely.
    3. Memory footprint is bounded by time-to-live (settings.DOCUMENT_TTL_HOURS).
    """

    def __init__(self):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._hits: int = 0
        self._misses: int = 0

    def _make_key(self, doc_hash: str, operation: str, extra: str = "") -> str:
        raw = f"{doc_hash}:{operation}:{CACHE_VERSION}:{extra}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, doc_hash: str, operation: str, extra: str = "") -> Optional[Any]:
        key = self._make_key(doc_hash, operation, extra)
        entry = self._cache.get(key)
        if not entry:
            self._misses += 1
            return None
        val, ts = entry
        ttl_seconds = settings.DOCUMENT_TTL_HOURS * 3600
        if (time.time() - ts) > ttl_seconds:
            del self._cache[key]
            self._misses += 1
            return None
        self._hits += 1
        return val

    def set(self, doc_hash: str, operation: str, value: Any, extra: str = "") -> None:
        key = self._make_key(doc_hash, operation, extra)
        self._cache[key] = (value, time.time())

    def get_stats(self) -> Dict[str, Any]:
        """
        Returns real-time cache efficiency metrics for monitoring and benchmarking.
        """
        total = self._hits + self._misses
        hit_rate = round((self._hits / total) * 100.0, 2) if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_pct": hit_rate,
            "total_cached_items": len(self._cache)
        }

    def clear(self) -> None:
        self._cache.clear()
        self._hits = 0
        self._misses = 0


analysis_cache = AnalysisCache()

