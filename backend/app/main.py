import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.middleware import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    limiter,
    safe_exception_handler,
)
from app.api.routes import router
from app.config import get_settings
from app.services.storage.document_store import document_store
from app.utils.logger import logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Legal Clarity API starting in {settings.ENVIRONMENT} mode...")
    provider_type = "Gemini" if settings.GEMINI_API_KEY.strip() else "Deterministic Demo"
    logger.info(f"Active AI Provider: {provider_type}")
    yield
    logger.info("Cleaning up ephemeral document store on shutdown...")
    document_store.cleanup_expired()
    logger.info("Legal Clarity API safely shut down.")


app = FastAPI(
    title="Legal Clarity API",
    description=(
        "Document-grounded legal companion built strictly around evidence, "
        "traceability, safe failure, and non-lawyer plain-language comprehension."
    ),
    version="0.1.0",
    lifespan=lifespan
)

# SlowAPI Limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda r, e: safe_exception_handler(r, e))
app.add_middleware(SlowAPIMiddleware)

# Middleware stack
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"]
)

# Global safe exception handler
if settings.ENVIRONMENT.lower() == "production":
    app.add_exception_handler(Exception, safe_exception_handler)

# Include API router
app.include_router(router)

# Mount frontend build if available (for production / Docker single-container distribution)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
