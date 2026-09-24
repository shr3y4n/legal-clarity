import io
import re
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

import pypdf
try:
    import pymupdf  # PyMuPDF
except ImportError:
    pymupdf = None  # type: ignore[assignment]

from app.models.schemas import Page, Section

# Matches Section Headers e.g. "3. FEES AND PAYMENT", "SECTION 1.0 SERVICES", "ARTICLE III"
_HEADING_PATTERN = re.compile(
    r"^(?:(?:ARTICLE|SECTION|CLAUSE)\s+([0-9A-Z\.]+)|([0-9]+)\.\s+([A-Z\s\&\,\-]+))\s*[:\.\-]?\s*(.*)$",
    re.IGNORECASE
)

# Matches Subclauses e.g. "3.1 The Client shall pay...", "3.3 Maintenance services...", "(a) ..."
_SUBCLAUSE_PATTERN = re.compile(
    r"^(?:(?:CLAUSE|SECTION)\s+)?(\d+\.\d+(?:\.\d+)?|\([a-z0-9]\))\s*[:\.\-]?\s*(.*)$",
    re.IGNORECASE
)

_COMMON_FOOTER_PATTERNS = [
    re.compile(r"^legal clarity synthetic benchmark.*", re.IGNORECASE),
    re.compile(r"^page\s+\d+(?:\s+of\s+\d+)?$", re.IGNORECASE),
    re.compile(r"^---\s*page\s+\d+\s*---$", re.IGNORECASE),
    re.compile(r"^confidential\s*[-–•]\s*page\s+\d+$", re.IGNORECASE),
]


def _normalize_header_footer_line(line: str) -> str:
    """Replaces numeric variations like page numbers with a placeholder for repeating line detection."""
    norm = re.sub(r"\b\d+\b", "<NUM>", line.strip().lower())
    norm = re.sub(r"\s+", " ", norm)
    return norm


def _identify_repeating_headers_footers(raw_pages_lines: List[List[str]]) -> Set[str]:
    """
    Identifies lines repeatedly occurring at the top (header) or bottom (footer) across >= 2 pages.
    """
    if len(raw_pages_lines) < 2:
        return set()

    top_candidates: Dict[str, int] = {}
    bottom_candidates: Dict[str, int] = {}

    for lines in raw_pages_lines:
        if not lines:
            continue
        # Check first 2 lines
        for top_line in lines[:2]:
            cleaned = top_line.strip()
            if cleaned and len(cleaned) < 120:
                norm = _normalize_header_footer_line(cleaned)
                top_candidates[norm] = top_candidates.get(norm, 0) + 1

        # Check last 2 lines
        for bot_line in lines[-2:]:
            cleaned = bot_line.strip()
            if cleaned and len(cleaned) < 120:
                norm = _normalize_header_footer_line(cleaned)
                bottom_candidates[norm] = bottom_candidates.get(norm, 0) + 1

    repeating: Set[str] = set()
    total_pages = len(raw_pages_lines)
    threshold = max(2, int(total_pages * 0.4))

    for norm, count in top_candidates.items():
        if count >= threshold:
            repeating.add(norm)

    for norm, count in bottom_candidates.items():
        if count >= threshold:
            repeating.add(norm)

    return repeating


def _is_header_or_footer(line: str, repeating_norms: Set[str]) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    norm = _normalize_header_footer_line(stripped)
    if norm in repeating_norms:
        return True
    for pat in _COMMON_FOOTER_PATTERNS:
        if pat.match(stripped):
            return True
    return False


def _segment_lines_into_sections(
    lines_with_bbox: Sequence[Tuple[str, Optional[List[float]]]],
    page_num: int
) -> List[Section]:
    """
    Segments page lines into fine-grained Section and subclause units.
    Every numbered subclause (e.g. 3.1, 3.2, 3.3) becomes its own retrievable Section.
    """
    sections: List[Section] = []
    current_heading = "Opening Provisions"
    current_clause_num: Optional[str] = None
    current_clause_text_lines: List[str] = []
    current_bbox: Optional[List[float]] = None
    char_offset = 0

    def flush_clause():
        nonlocal current_clause_text_lines, current_clause_num, current_bbox, char_offset
        if current_clause_text_lines:
            text = " ".join(current_clause_text_lines).strip()
            text = re.sub(r"\s+", " ", text)
            if text:
                clause_id = current_clause_num or f"p{page_num}_s{len(sections)+1}"
                sections.append(
                    Section(
                        section_id=f"p{page_num}_{clause_id.replace('.', '_').replace('(', '').replace(')', '')}",
                        page_number=page_num,
                        heading=current_heading,
                        clause_number=current_clause_num,
                        text=text,
                        start_char=char_offset,
                        end_char=char_offset + len(text),
                        page_start=page_num,
                        page_end=page_num,
                        bbox=current_bbox,
                        source_type="native_pdf"
                    )
                )
                char_offset += len(text) + 1
        current_clause_text_lines = []
        current_bbox = None

    for line, bbox in lines_with_bbox:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line is a major Section Heading (e.g. "3. FEES AND PAYMENT")
        head_match = _HEADING_PATTERN.match(stripped)
        if head_match:
            flush_clause()
            current_heading = stripped
            clause_p = head_match.group(1) or head_match.group(2)
            current_clause_num = clause_p.strip() if clause_p else None
            current_bbox = bbox
            continue

        # Check if line begins a Subclause (e.g. "3.3 Maintenance services after deployment...")
        sub_match = _SUBCLAUSE_PATTERN.match(stripped)
        if sub_match:
            flush_clause()
            current_clause_num = sub_match.group(1).strip()
            rest = sub_match.group(2).strip() if sub_match.group(2) else ""
            if rest:
                current_clause_text_lines.append(rest)
            else:
                current_clause_text_lines.append(stripped)
            current_bbox = bbox
            continue

        # Regular text line belonging to the current clause
        current_clause_text_lines.append(stripped)
        if bbox and not current_bbox:
            current_bbox = bbox
        elif bbox and current_bbox:
            # Expand bbox to cover the whole clause
            current_bbox = [
                min(current_bbox[0], bbox[0]),
                min(current_bbox[1], bbox[1]),
                max(current_bbox[2], bbox[2]),
                max(current_bbox[3], bbox[3]),
            ]

    flush_clause()
    return sections


def extract_pdf(file_bytes: bytes) -> Tuple[List[Page], str]:
    """
    Layout-aware PDF extraction using PyMuPDF (with fallback to pypdf).
    - Preserves structure and layout bounding boxes.
    - Strips repeating headers and footers across pages.
    - Segments legal clauses and subclauses into atomic evidence units.
    - Never injects synthetic page markers into document text.
    """
    # 1. Primary: PyMuPDF extraction
    if pymupdf is not None:
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            raw_pages_lines: List[List[Tuple[str, List[float]]]] = []

            for page_idx in range(len(doc)):
                page = doc[page_idx]
                blocks = page.get_text("blocks")
                page_lines: List[Tuple[str, List[float]]] = []
                for b in blocks:
                    # b: (x0, y0, x1, y1, text, block_no, block_type)
                    if len(b) >= 7 and b[6] == 0:  # Text block
                        text = b[4]
                        bbox = [float(b[0]), float(b[1]), float(b[2]), float(b[3])]
                        for line in text.splitlines():
                            if line.strip():
                                page_lines.append((line.strip(), bbox))
                raw_pages_lines.append(page_lines)

            # Detect repeated headers and footers
            repeating = _identify_repeating_headers_footers([[l[0] for l in pl] for pl in raw_pages_lines])

            pages: List[Page] = []
            full_text_parts: List[str] = []

            for idx, page_lines in enumerate(raw_pages_lines):
                page_num = idx + 1
                clean_lines: List[Tuple[str, Optional[List[float]]]] = [
                    (l, bb) for l, bb in page_lines if not _is_header_or_footer(l, repeating)
                ]

                sections = _segment_lines_into_sections(clean_lines, page_num)
                page_body_text = "\n".join(l for l, _ in clean_lines)
                pages.append(Page(page_number=page_num, text=page_body_text, sections=sections))
                if page_body_text.strip():
                    full_text_parts.append(page_body_text.strip())

            return pages, "\n\n".join(full_text_parts)
        except Exception:
            pass

    # 2. Fallback: pypdf extraction
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    fb_pages: List[Page] = []
    fb_full_text_parts: List[str] = []
    total_pages = len(reader.pages)
    if total_pages == 0:
        return [], ""

    raw_pages_lines_text: List[List[str]] = []
    for pdf_page in reader.pages:
        raw_text = pdf_page.extract_text() or ""
        cleaned = "".join(ch for ch in raw_text if ch in "\n\r\t" or ch >= " ")
        raw_pages_lines_text.append(cleaned.splitlines())

    repeating = _identify_repeating_headers_footers(raw_pages_lines_text)

    for idx, lines in enumerate(raw_pages_lines_text):
        page_num = idx + 1
        fb_clean_lines: List[Tuple[str, Optional[List[float]]]] = [
            (l.strip(), None) for l in lines if l.strip() and not _is_header_or_footer(l, repeating)
        ]
        sections = _segment_lines_into_sections(fb_clean_lines, page_num)
        page_body = "\n".join(l for l, _ in fb_clean_lines)
        fb_pages.append(Page(page_number=page_num, text=page_body, sections=sections))
        if page_body.strip():
            fb_full_text_parts.append(page_body.strip())

    return fb_pages, "\n\n".join(fb_full_text_parts)
