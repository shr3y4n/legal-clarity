import hashlib
import time
from typing import Any, Dict, Optional, Tuple

from app.config import get_settings

settings = get_settings()

CACHE_VERSION = "v1.0"


class AnalysisCache:
    def __init__(self):
        self._cache: Dict[str, Tuple[Any, float]] = {}

    def _make_key(self, doc_hash: str, operation: str, extra: str = "") -> str:
        raw = f"{doc_hash}:{operation}:{CACHE_VERSION}:{extra}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, doc_hash: str, operation: str, extra: str = "") -> Optional[Any]:
        key = self._make_key(doc_hash, operation, extra)
        entry = self._cache.get(key)
        if not entry:
            return None
        val, ts = entry
        ttl_seconds = settings.DOCUMENT_TTL_HOURS * 3600
        if (time.time() - ts) > ttl_seconds:
            del self._cache[key]
            return None
        return val

    def set(self, doc_hash: str, operation: str, value: Any, extra: str = "") -> None:
        key = self._make_key(doc_hash, operation, extra)
        self._cache[key] = (value, time.time())

    def clear(self) -> None:
        self._cache.clear()


analysis_cache = AnalysisCache()
