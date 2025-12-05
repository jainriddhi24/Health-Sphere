from typing import Dict, Any, List
import math


def score_output(model_output: Dict[str, Any], verified: bool, issues: List[str]) -> float:
    """Compute a simple confidence score based on verification and error count.
    Returns a float between 0 and 1.
    """
    if not verified:
        return 0.0
    base = 0.5
    # if there are no issues, increase confidence; penalize proportionally by issue count
    penalty = min(0.5, 0.1 * len(issues))
    score = base + (0.5 - penalty)
    return max(0.0, min(1.0, score))


def hit_rate(retrieved_ids: List[str], relevant_ids: List[str]) -> float:
    if not relevant_ids:
        return 0.0
    hits = sum(1 for r in retrieved_ids if r in relevant_ids)
    return hits / len(relevant_ids)


def recall_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int) -> float:
    if not relevant_ids:
        return 0.0
    retrieved_topk = set(retrieved_ids[:k])
    hits = sum(1 for r in relevant_ids if r in retrieved_topk)
    return hits / len(relevant_ids)


def ndcg_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int) -> float:
    if not relevant_ids:
        return 0.0
    def dcg(rank_list):
        score = 0.0
        for i, r in enumerate(rank_list[:k]):
            rel = 1.0 if r in relevant_ids else 0.0
            score += (2**rel - 1) / math.log2(i + 2)
        return score
    ideal = sorted([1 if r in relevant_ids else 0 for r in retrieved_ids], reverse=True)
    idcg = dcg(ideal)
    if idcg == 0:
        return 0.0
    return dcg(retrieved_ids) / idcg
