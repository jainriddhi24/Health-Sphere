try:
    import faiss
    HAS_FAISS = True
except Exception:
    faiss = None
    HAS_FAISS = False
import numpy as np
import os
import json
from typing import List, Dict, Any

# Path to store the index and docs metadata
DATA_DIR = os.getenv('ML_DATA_DIR', os.path.join(os.path.dirname(__file__), '..', '..', 'data'))
INDEX_PATH = os.path.join(DATA_DIR, 'faiss.index')
DOCS_PATH = os.path.join(DATA_DIR, 'docs.json')

# Default vector dim is unknown, will be created on first insert


class FaissStore:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        self.index = None
        self.dim = None
        self.docs: Dict[str, Dict[str, Any]] = {}
        # Fallback in-memory vector list when faiss is not available
        self.vectors: List[np.ndarray] = []
        self._load()

    def _load(self):
        if os.path.exists(DOCS_PATH):
            try:
                with open(DOCS_PATH, 'r', encoding='utf-8') as f:
                    self.docs = {d['id']: d for d in json.load(f)}
            except Exception:
                self.docs = {}
        if os.path.exists(INDEX_PATH) and HAS_FAISS:
            try:
                self.index = faiss.read_index(INDEX_PATH)
                self.dim = self.index.d
            except Exception:
                self.index = None
                self.dim = None

    def _save_docs(self):
        with open(DOCS_PATH, 'w', encoding='utf-8') as f:
            json.dump(list(self.docs.values()), f, ensure_ascii=False, indent=2)

    def _save_index(self):
        if self.index is not None and HAS_FAISS:
            faiss.write_index(self.index, INDEX_PATH)

    def add(self, doc_id: str, content: str, metadata: dict, vector: List[float]):
        arr = np.array(vector, dtype='float32')
        if self.index is None:
            self.dim = arr.shape[0]
            # Using IndexFlatIP for cosine similarity after normalizing
            if HAS_FAISS:
                self.index = faiss.IndexFlatL2(self.dim)
            else:
                self.index = None
        if arr.shape[0] != self.dim:
            raise ValueError('Vector dimension mismatch')
        # Add to index (faiss), or fallback: append to in-memory vectors
        if HAS_FAISS and self.index is not None:
            self.index.add(np.expand_dims(arr, axis=0))
        else:
            self.vectors.append(arr)
        # Save doc metadata
        self.docs[doc_id] = { 'id': doc_id, 'content': content, 'metadata': metadata }
        self._save_docs()
        self._save_index()

    def search(self, vector: List[float], k: int = 5) -> List[Dict[str, Any]]:
        if self.index is None and not HAS_FAISS:
            # Use simple numpy-based kNN search in fallback mode
            if len(self.vectors) == 0:
                return []
            xq = np.array(vector, dtype='float32')
            arr = np.stack(self.vectors, axis=0)
            dists = np.sum((arr - xq) ** 2, axis=1)
            idxs = np.argsort(dists)[:k]
            results = []
            for idx in idxs:
                try:
                    doc_keys = list(self.docs.keys())
                    doc_id = doc_keys[idx]
                    doc = self.docs[doc_id]
                    results.append({ 'id': doc['id'], 'content': doc['content'], 'metadata': doc['metadata'], 'score': float(dists[idx]) })
                except Exception:
                    continue
            return results
        xq = np.array(vector, dtype='float32')
        xq = np.expand_dims(xq, axis=0)
        D, I = self.index.search(xq, k)
        results = []
        for i, dist in zip(I[0], D[0]):
            # index returns -1 when it doesn't exist
            if i < 0:
                continue
            # Find doc by position: faiss doesn't keep IDs by default; naive approach: docs insertion order
            # Our docs dict cannot provide index -> id mapping. We'll store a list of IDs in order of insertion.
            # But for simplicity, we will rely on reading docs.json order
            try:
                doc_keys = list(self.docs.keys())
                doc_id = doc_keys[i]
                doc = self.docs[doc_id]
            except Exception:
                doc = None
            if doc:
                results.append({ 'id': doc['id'], 'content': doc['content'], 'metadata': doc['metadata'], 'score': float(dist) })
        return results


# Singleton store
_store = None


def get_store() -> FaissStore:
    global _store
    if _store is None:
        _store = FaissStore()
    return _store
