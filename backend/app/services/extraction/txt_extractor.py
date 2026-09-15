import re
from typing import List, Tuple

from app.models.schemas import Page, Section

_SECTION_PATTERN = re.compile(
    r"^(?:(?:ARTICLE|SECTION|CLAUSE)\s+([0-9A-Z\.]+)|([0-9]+\.[0-9]+(?:\.[0-9]+)?))\s*[:\.\-]?\s*(.*)",
    re.IGNORECASE
)

LINES_PER_PAGE = 45


def extract_txt(file_bytes: bytes) -> Tuple[List[Page], str]:
    """
    Extracts text from TXT bytes, parsing sections and chunking into logical pages.
    """
    try:
        content = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = file_bytes.decode("latin-1", errors="replace")

    # Normalize line endings
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    lines = content.split("\n")

    if not lines or all(not line.strip() for line in lines):
        return [], ""

    pages: List[Page] = []
    current_page_lines: List[str] = []
    current_sections: List[Section] = []
    current_page_num = 1

    current_heading = None
    current_clause = None
    current_sec_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        match = _SECTION_PATTERN.match(stripped) if stripped else None

        if match:
            # Flush previous section
            if current_sec_lines:
                sec_text = "\n".join(current_sec_lines).strip()
                if sec_text:
                    current_sections.append(
                        Section(
                            section_id=f"p{current_page_num}_s{len(current_sections)+1}",
                            page_number=current_page_num,
                            heading=current_heading or f"Section {len(current_sections)+1}",
                            clause_number=current_clause,
                            text=sec_text,
                            start_char=0,
                            end_char=len(sec_text)
                        )
                    )
            clause_part = match.group(1) or match.group(2)
            current_clause = clause_part.strip() if clause_part else None
            current_heading = stripped
            current_sec_lines = [stripped]
        else:
            if stripped:
                current_sec_lines.append(stripped)

        current_page_lines.append(line)

        # Page threshold
        if len(current_page_lines) >= LINES_PER_PAGE:
            if current_sec_lines:
                sec_text = "\n".join(current_sec_lines).strip()
                if sec_text:
                    current_sections.append(
                        Section(
                            section_id=f"p{current_page_num}_s{len(current_sections)+1}",
                            page_number=current_page_num,
                            heading=current_heading or f"Page {current_page_num}",
                            clause_number=current_clause,
                            text=sec_text,
                            start_char=0,
                            end_char=len(sec_text)
                        )
                    )
                current_sec_lines = []
            page_text = "\n".join(current_page_lines).strip()
            pages.append(Page(page_number=current_page_num, text=page_text, sections=current_sections))
            current_page_num += 1
            current_page_lines = []
            current_sections = []

    # Flush final
    if current_sec_lines:
        sec_text = "\n".join(current_sec_lines).strip()
        if sec_text:
            current_sections.append(
                Section(
                    section_id=f"p{current_page_num}_s{len(current_sections)+1}",
                    page_number=current_page_num,
                    heading=current_heading or f"Page {current_page_num}",
                    clause_number=current_clause,
                    text=sec_text,
                    start_char=0,
                    end_char=len(sec_text)
                )
            )

    if current_page_lines:
        page_text = "\n".join(current_page_lines).strip()
        if page_text:
            pages.append(Page(page_number=current_page_num, text=page_text, sections=current_sections))

    full_text = "\n\n".join(p.text for p in pages)
    return pages, full_text
