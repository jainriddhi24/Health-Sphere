"""
vector_db: In-memory vector index using sentence-transformers and FAISS where available.
This implementation is intentionally simple and meant as a starting point.
"""
from typing import List, Dict, Any
import math
import os

# We'll avoid importing heavy ML libraries at module import time so the service
# can start even when those dependencies are missing or incorrectly installed.
# The imports will be attempted lazily inside the Indexer class when needed.

SentenceTransformer = None
faiss = None
use_st = False
use_faiss = False


class Indexer:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = None
        # Attempt to lazily import SentenceTransformer and build the model only
        # if the dependency is present and can be initialized. If an error
        # occurs, we leave the model as None and rely on the embedding fallback.
        global SentenceTransformer, use_st
        try:
            if SentenceTransformer is None:
                from sentence_transformers import SentenceTransformer as _ST
                SentenceTransformer = _ST
            self.model = SentenceTransformer(model_name)
            use_st = True
        except Exception:
            self.model = None
            use_st = False
        self._ids = []
        self._chunks = []
        self._embeddings = None
        self._faiss_index = None

    def index_chunks(self, chunks: List[Dict[str, Any]]):
        texts = [c['text'] for c in chunks]
        if self.model:
            emb = self.model.encode(texts, show_progress_bar=False)
            # Normalize to list-of-lists
            if hasattr(emb, 'tolist'):
                emb = [e.tolist() if hasattr(e, 'tolist') else list(e) for e in emb]
        else:
            # fallback to naive random embeddings (not recommended for production)
            from app.services.embed import _fallback_embed
            emb = [_fallback_embed(t, dim=384) for t in texts]

        self._ids = [c['id'] for c in chunks]
        self._chunks = chunks
        self._embeddings = emb

        # Attempt to use faiss if available (lazy import)
        global faiss, use_faiss
        try:
            if faiss is None:
                import faiss as _faiss
                faiss = _faiss
            try:
                dim = emb.shape[1]
            except Exception:
                dim = len(emb[0])
            self._faiss_index = faiss.IndexFlatIP(dim)
            # faiss expects numpy arrays
            import numpy as _np
            self._faiss_index.add(_np.array(emb, dtype='float32'))
            use_faiss = True
        except Exception:
            # If faiss fails to import or initialize, fall back to numpy/scikit search
            self._faiss_index = None
            use_faiss = False

    def search_by_embedding(self, query: str, top_k: int = 5):
        if self.model:
            q_emb = self.model.encode([query])
            if hasattr(q_emb, 'tolist'):
                q_emb = [e.tolist() if hasattr(e, 'tolist') else list(e) for e in q_emb]
        else:
            from app.services.embed import _fallback_embed
            q_emb = [_fallback_embed(query, dim=384)]

        if use_faiss and self._faiss_index is not None:
            import numpy as np
            q_emb_np = np.array(q_emb, dtype='float32')
            D, I = self._faiss_index.search(q_emb_np, top_k)
            ids = I[0].tolist()
            results = []
            for idx, score in zip(ids, D[0].tolist()):
                results.append({
                    'id': self._ids[idx],
                    'text': self._chunks[idx]['text'],
                    'score': float(score)
                })
            return results

        # fallback: compute cosine similarity over embeddings using pure Python
        try:
            query_vec = q_emb.tolist()[0] if hasattr(q_emb, 'tolist') else list(q_emb[0])
        except Exception:
            query_vec = list(q_emb[0])
        def cosine(a, b):
            dot = sum(x*y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x*x for x in a))
            norm_b = math.sqrt(sum(y*y for y in b))
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return dot / (norm_a * norm_b)
        sims = [cosine(query_vec, e) for e in self._embeddings]
        order = sorted(range(len(sims)), key=lambda i: sims[i], reverse=True)[:top_k]
        return [{'id': self._ids[int(i)], 'text': self._chunks[int(i)]['text'], 'score': float(sims[int(i)])} for i in order]
