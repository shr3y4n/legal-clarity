import math
import re
from collections import Counter, defaultdict
from typing import Dict, List, Tuple

from app.models.schemas import Chunk

_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "its",
    "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
    "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "should",
    "shouldn't", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "were", "weren't", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "won't", "would", "wouldn't", "you", "your", "yours", "yourself",
    "yourselves"
}


def tokenize(text: str) -> List[str]:
    tokens = re.findall(r"\b[a-zA-Z0-9_\-\$%\.]+\b", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


class LexicalIndex:
    """
    BM25 lexical index for fast, deterministic document chunk retrieval.
    Zero external dependencies, highly efficient and reproducible.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Chunk] = []
        self.doc_len: List[int] = []
        self.avg_doc_len: float = 0.0
        self.doc_freq: Dict[str, int] = defaultdict(int)
        self.term_freq: List[Dict[str, int]] = []

    def fit(self, chunks: List[Chunk]) -> None:
        self.chunks = chunks
        self.doc_len = []
        self.term_freq = []
        self.doc_freq = defaultdict(int)

        for chunk in chunks:
            text_to_index = f"{chunk.heading or ''} {chunk.clause_number or ''} {chunk.text}"
            tokens = tokenize(text_to_index)
            tf = Counter(tokens)
            self.term_freq.append(tf)
            self.doc_len.append(len(tokens))

            for term in tf:
                self.doc_freq[term] += 1

        total_tokens = sum(self.doc_len)
        self.avg_doc_len = (total_tokens / len(chunks)) if chunks else 1.0

    def query(self, query_text: str, top_k: int = 5) -> List[Tuple[Chunk, float]]:
        if not self.chunks:
            return []

        query_tokens = tokenize(query_text)
        if not query_tokens:
            return [(c, 0.0) for c in self.chunks[:top_k]]

        scores: List[float] = [0.0] * len(self.chunks)
        num_docs = len(self.chunks)

        for term in query_tokens:
            if term not in self.doc_freq:
                continue
            df = self.doc_freq[term]
            idf = math.log((num_docs - df + 0.5) / (df + 0.5) + 1.0)

            for i, tf_dict in enumerate(self.term_freq):
                tf = tf_dict.get(term, 0)
                if tf > 0:
                    numerator = tf * (self.k1 + 1.0)
                    denominator = tf + self.k1 * (1.0 - self.b + self.b * (self.doc_len[i] / self.avg_doc_len))
                    scores[i] += idf * (numerator / denominator)

        # Pair with chunks and sort
        ranked = sorted(zip(self.chunks, scores), key=lambda x: x[1], reverse=True)
        return ranked[:top_k]


# Global in-memory index store per document
_INDEX_STORE: Dict[str, LexicalIndex] = {}


def index_document_chunks(document_id: str, chunks: List[Chunk]) -> LexicalIndex:
    idx = LexicalIndex()
    idx.fit(chunks)
    _INDEX_STORE[document_id] = idx
    return idx


def get_document_index(document_id: str) -> LexicalIndex | None:
    return _INDEX_STORE.get(document_id)


def retrieve_relevant_chunks(document_id: str, query: str, top_k: int = 4) -> List[Chunk]:
    idx = get_document_index(document_id)
    if not idx:
        return []
    results = idx.query(query, top_k=top_k)
    return [chunk for chunk, score in results]
