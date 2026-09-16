import time
import uuid

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.models.schemas import ErrorResponse
from app.utils.logger import log_document_event, logger

settings = get_settings()

# Initialize Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"]
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies security headers to every HTTP response.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # X-XSS-Protection is intentionally omitted: it is deprecated by OWASP/W3C and
        # superseded by Content-Security-Policy; legacy XSS filters introduced client vulnerabilities.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none';"
        )
        return response


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Attaches a unique Request ID for traceability and measures latency safely.
    """
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        request.state.request_id = req_id
        start_time = time.time()

        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"

        # Safe access log without request bodies
        log_document_event(
            event=f"{request.method} {request.url.path}",
            request_id=req_id,
            duration_ms=duration_ms
        )

        return response


async def safe_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches unhandled exceptions and masks them safely, ensuring no stack traces
    or internal secrets are leaked in production responses.
    """
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Unhandled Exception for req_id={req_id}: {type(exc).__name__}: {str(exc)}")

    error_model = ErrorResponse(
        detail="An internal error occurred while processing the request. The issue has been safely logged.",
        code="INTERNAL_SERVER_ERROR",
        request_id=req_id
    )
    return JSONResponse(
        status_code=500,
        content=error_model.model_dump(),
        headers={"X-Request-ID": req_id}
    )
