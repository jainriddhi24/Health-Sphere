from typing import List, Dict, Any
from .vector_db import Indexer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def retrieve_candidates(indexer: Indexer, chunks: List[Dict[str, Any]], facts: Dict[str, Any], top_k: int = 12) -> List[Dict[str, Any]]:
    """Perform a hybrid retrieval: TF-IDF keyword matching + embedding similarity.
    Returns a list of candidates with snippet and raw scores.
    """
    # 1. Build a simple keyword query from facts
    fact_tokens = []
    for k, v in facts.items():
        fact_tokens.append(f"{k} {v}")
    query = ' '.join(fact_tokens) if fact_tokens else 'medical report'

    # 2. TF-IDF matching
    texts = [c['text'] for c in chunks]
    if not texts:
        return []
    try:
        tfidf = TfidfVectorizer().fit_transform(texts + [query])
        sims = cosine_similarity(tfidf[-1], tfidf[:-1])[0]
    except Exception:
        sims = np.zeros(len(texts))

    # 3. Embedding-based retrieval
    emb_results = indexer.search_by_embedding(query, top_k=top_k)
    emb_map = {r['id']: r['score'] for r in emb_results}

    candidates = []
    for i, txt in enumerate(texts):
        cid = chunks[i]['id']
        cand = {
            'id': cid,
            'snippet': txt,
            'tfidf_score': float(sims[i]),
            'emb_score': float(emb_map.get(cid, 0.0))
        }
        # combine scores: weight embeddings stronger but allow tfidf to influence
        cand['score'] = 0.65 * cand['emb_score'] + 0.35 * cand['tfidf_score']
        candidates.append(cand)

    # sort and return top_k
    candidates.sort(key=lambda x: x['score'], reverse=True)
    return candidates[:top_k]
