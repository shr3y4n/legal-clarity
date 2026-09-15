from typing import List

from app.models.schemas import Chunk, Document


def chunk_document(doc: Document, max_chars: int = 1500, overlap_chars: int = 200) -> List[Chunk]:
    """
    Splits a document into traceable chunks. Each chunk retains exact page number,
    section ID, heading, and clause numbering for strict evidence attribution.
    """
    chunks: List[Chunk] = []
    chunk_counter = 1

    for page in doc.pages:
        # If page has well-defined sections, chunk by section first
        if page.sections:
            for sec in page.sections:
                sec_text = sec.text.strip()
                if not sec_text:
                    continue

                if len(sec_text) <= max_chars:
                    chunks.append(
                        Chunk(
                            chunk_id=f"chk_{doc.metadata.document_id}_{chunk_counter}",
                            document_id=doc.metadata.document_id,
                            page_number=page.page_number,
                            section_id=sec.section_id,
                            heading=sec.heading,
                            clause_number=sec.clause_number,
                            text=sec_text,
                            token_count=len(sec_text.split())
                        )
                    )
                    chunk_counter += 1
                else:
                    # Slide over long section
                    start = 0
                    while start < len(sec_text):
                        end = min(start + max_chars, len(sec_text))
                        slice_text = sec_text[start:end].strip()
                        if slice_text:
                            chunks.append(
                                Chunk(
                                    chunk_id=f"chk_{doc.metadata.document_id}_{chunk_counter}",
                                    document_id=doc.metadata.document_id,
                                    page_number=page.page_number,
                                    section_id=sec.section_id,
                                    heading=sec.heading,
                                    clause_number=sec.clause_number,
                                    text=slice_text,
                                    token_count=len(slice_text.split())
                                )
                            )
                            chunk_counter += 1
                        start += max_chars - overlap_chars
        else:
            # Chunk plain page text
            page_text = page.text.strip()
            if not page_text:
                continue

            start = 0
            while start < len(page_text):
                end = min(start + max_chars, len(page_text))
                slice_text = page_text[start:end].strip()
                if slice_text:
                    chunks.append(
                        Chunk(
                            chunk_id=f"chk_{doc.metadata.document_id}_{chunk_counter}",
                            document_id=doc.metadata.document_id,
                            page_number=page.page_number,
                            section_id=None,
                            heading=f"Page {page.page_number}",
                            clause_number=None,
                            text=slice_text,
                            token_count=len(slice_text.split())
                        )
                    )
                    chunk_counter += 1
                start += max_chars - overlap_chars

    return chunks
