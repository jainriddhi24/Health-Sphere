from typing import List, Dict, Any
import re


def rerank_candidates(candidates: List[Dict[str, Any]], facts: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rerank by boosting candidates that directly contain the fact value or field name.
    Keep the structure of the candidate and return a newly scored list.
    """
    reranked = []
    for c in candidates:
        score = c.get('score', 0.0)
        snippet = c.get('snippet', '').lower()

        # Boost if snippet mentions a fact name or exact numeric value
        for f, v in facts.items():
            if f.replace('_', ' ') in snippet:
                score += 0.15
            try:
                if isinstance(v, (int, float)) and str(v) in snippet:
                    score += 0.25
            except Exception:
                pass

        c['score'] = score
        reranked.append(c)

    reranked.sort(key=lambda x: x['score'], reverse=True)
    return reranked
