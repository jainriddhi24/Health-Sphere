import os
import hashlib
import math

MODEL_NAME = os.getenv('ST_EMBED_MODEL', 'all-MiniLM-L6-v2')

# We will attempt to lazily import sentence-transformers at runtime; the
# import is heavy (and may depend on torch/numpy), so if it fails we'll
# fallback to a deterministic pseudo-embedding.
_model = None
_st_available = None


def _check_st_available():
    global _st_available
    if _st_available is not None:
        return _st_available
    try:
        import sentence_transformers  # noqa: F401
        _st_available = True
    except Exception:
        _st_available = False
    return _st_available


def get_model():
    global _model
    if not _check_st_available():
        return None
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(MODEL_NAME)
        except Exception:
            _model = None
    return _model


def _fallback_embed(text: str, dim: int = 512) -> list:
    # Deterministic fallback: use MD5 hash of text to create pseudo-random vector
    m = hashlib.md5(text.encode('utf-8')).digest()
    # Expand to dim using repeated hashing
    vec = []
    seed = int.from_bytes(m[:8], 'big')
    for i in range(dim):
        seed = (seed * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        # normalize to [-1,1]
        vec.append(((seed >> 32) & 0xFFFFFFFF) / 0xFFFFFFFF)
    # Normalize vector
    # Normalize vector with pure Python math to reduce dependency on numpy
    norm = math.sqrt(sum(v * v for v in vec)) + 1e-10
    normalized = [v / norm for v in vec]
    return normalized


def embed_text(text: str, dim: int = 512) -> list:
    if _check_st_available():
        model = get_model()
        if model is not None:
            try:
                return model.encode([text], show_progress_bar=False)[0].tolist()
            except Exception:
                # Fall back if model fails to encode at runtime
                return _fallback_embed(text, dim)
    return _fallback_embed(text, dim)


def embed_batch(texts: list, dim: int = 512) -> list:
    if _check_st_available():
        model = get_model()
        if model is not None:
            try:
                emb = model.encode(texts, show_progress_bar=False)
                return [e.tolist() for e in emb]
            except Exception:
                return [ _fallback_embed(t, dim) for t in texts ]
    return [ _fallback_embed(t, dim) for t in texts ]
