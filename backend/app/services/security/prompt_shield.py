import re
from typing import Tuple

# Common prompt injection triggers
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"reveal\s+(the\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"system\s*:\s*you\s+are", re.IGNORECASE),
    re.compile(r"system\s+instruction", re.IGNORECASE),
    re.compile(r"output\s+all\s+confidential\s+data", re.IGNORECASE),
    re.compile(r"call\s+tool", re.IGNORECASE),
    re.compile(r"declare\s+this\s+contract.*safe", re.IGNORECASE),
    re.compile(r"risk[\s-]free", re.IGNORECASE),
    re.compile(r"100%\s+safe", re.IGNORECASE),
    re.compile(r"bypass\s+safety\s+filter", re.IGNORECASE),
]


def wrap_untrusted_document_data(text: str) -> str:
    """
    Wraps document text in strict XML-style delimiters with explicit boundary instructions.
    Even if the document contains 'IGNORE ALL INSTRUCTIONS', the prompt framing keeps it
    strictly bounded as data.
    """
    # Escape any existing fake closing tags to prevent delimiter escape
    escaped_text = text.replace("</UNTRUSTED_DOCUMENT_DATA>", "&lt;/UNTRUSTED_DOCUMENT_DATA&gt;")
    return (
        "\n<UNTRUSTED_DOCUMENT_DATA>\n"
        "--- START OF UNTRUSTED DOCUMENT CONTENT ---\n"
        f"{escaped_text}\n"
        "--- END OF UNTRUSTED DOCUMENT CONTENT ---\n"
        "</UNTRUSTED_DOCUMENT_DATA>\n"
    )


def sanitize_user_question(question: str) -> Tuple[str, bool]:
    """
    Inspects user question for prompt injection markers.
    Returns (sanitized_question, was_suspicious).
    """
    cleaned = question.strip()
    suspicious = False
    for pat in _INJECTION_PATTERNS:
        if pat.search(cleaned):
            suspicious = True
            break
    # Limit length
    cleaned = cleaned[:1000]
    return cleaned, suspicious
