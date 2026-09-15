from app.config import get_settings
from app.services.providers.base import LLMProvider
from app.services.providers.demo_provider import DemoLLMProvider
from app.services.providers.gemini_provider import GeminiLLMProvider


def get_provider() -> LLMProvider:
    settings = get_settings()
    if settings.LLM_PROVIDER.lower() == "gemini" and settings.GEMINI_API_KEY.strip():
        return GeminiLLMProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
    return DemoLLMProvider()
