import io
import re
from typing import List, Tuple

import pypdf

from app.models.schemas import Page, Section

_SECTION_PATTERN = re.compile(
    r"^(?:(?:ARTICLE|SECTION|CLAUSE)\s+([0-9A-Z\.]+)|([0-9]+\.[0-9]+(?:\.[0-9]+)?))\s*[:\.\-]?\s*(.*)",
    re.IGNORECASE
)


def extract_pdf(file_bytes: bytes) -> Tuple[List[Page], str]:
    """
    Extracts text from PDF bytes page-by-page, preserving page numbering,
    identifying clause headings and section anchors.
    """
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages: List[Page] = []
    full_text_parts: List[str] = []

    total_pages = len(reader.pages)
    if total_pages == 0:
        return [], ""

    global_offset = 0

    for idx, pdf_page in enumerate(reader.pages):
        page_num = idx + 1
        raw_page_text = pdf_page.extract_text() or ""
        # Clean control characters except newlines/tabs
        cleaned_page_text = "".join(ch for ch in raw_page_text if ch in "\n\r\t" or ch >= " ")
        lines = cleaned_page_text.splitlines()

        sections: List[Section] = []
        current_section_heading = None
        current_clause_num = None
        current_section_lines: List[str] = []
        sec_start = 0

        for line_idx, line in enumerate(lines):
            stripped = line.strip()
            match = _SECTION_PATTERN.match(stripped)
            if match:
                # Save previous section if exists
                if current_section_lines:
                    sec_text = "\n".join(current_section_lines).strip()
                    if sec_text:
                        sections.append(
                            Section(
                                section_id=f"p{page_num}_s{len(sections)+1}",
                                page_number=page_num,
                                heading=current_section_heading,
                                clause_number=current_clause_num,
                                text=sec_text,
                                start_char=sec_start,
                                end_char=sec_start + len(sec_text)
                            )
                        )
                clause_part = match.group(1) or match.group(2)
                heading_part = match.group(3) or stripped
                current_clause_num = clause_part.strip() if clause_part else None
                current_section_heading = heading_part.strip()
                current_section_lines = [stripped]
                sec_start = cleaned_page_text.find(stripped)
            else:
                current_section_lines.append(stripped)

        # Flush last section on the page
        if current_section_lines:
            sec_text = "\n".join(current_section_lines).strip()
            if sec_text:
                sections.append(
                    Section(
                        section_id=f"p{page_num}_s{len(sections)+1}",
                        page_number=page_num,
                        heading=current_section_heading or f"Page {page_num}",
                        clause_number=current_clause_num,
                        text=sec_text,
                        start_char=sec_start,
                        end_char=sec_start + len(sec_text)
                    )
                )

        pages.append(Page(page_number=page_num, text=cleaned_page_text, sections=sections))
        full_text_parts.append(cleaned_page_text)
        global_offset += len(cleaned_page_text) + 1

    return pages, "\n\n".join(full_text_parts)
