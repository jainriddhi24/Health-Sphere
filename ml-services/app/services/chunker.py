from typing import List, Dict
import uuid


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[Dict]:
    """Split a long text into overlapping chunks and return list of dicts {id, text, start, end}.
    This simple chunker is adequate for initial retrieval; replace with a smarter tokenizer for production.
    """
    if not text:
        return []

    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk_text = text[start:end]
        chunks.append({
            'id': str(uuid.uuid4()),
            'text': chunk_text,
            'start': start,
            'end': end
        })
        start += (chunk_size - overlap)
    return chunks
