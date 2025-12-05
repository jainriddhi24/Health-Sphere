#!/usr/bin/env python
"""
Ingests the content from docs/ folder into FAISS index using sentence-transformers for embeddings.
"""
import os
import sys
import glob
import json
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.embed import embed_text, embed_batch
from app.services.faiss_service import get_store

DOCS_DIR = os.getenv('DOCS_SOURCE_DIR', os.path.join(os.path.dirname(__file__), '..', '..', 'docs'))


def load_docs_from_docs_directory(path: str):
    txt_files = glob.glob(os.path.join(path, "**", "*.md"), recursive=True) + glob.glob(os.path.join(path, "**", "*.txt"), recursive=True)
    docs = []
    for f in txt_files:
        try:
            with open(f, 'r', encoding='utf-8') as fh:
                content = fh.read()
                docs.append({ 'id': os.path.basename(f), 'content': content, 'metadata': { 'source': f } })
        except Exception as e:
            print('skip', f, e)
    return docs


def ingest():
    docs = load_docs_from_docs_directory(DOCS_DIR)
    if not docs:
        print('[ingest_docs] No docs found in', DOCS_DIR)
        return
    store = get_store()
    texts = [d['content'] for d in docs]
    embeddings = embed_batch(texts)
    for d, v in zip(docs, embeddings):
        try:
            store.add(d['id'], d['content'], d['metadata'], v)
            print('[ingest_docs] added', d['id'])
        except Exception as e:
            print('[ingest_docs] failed to add', d['id'], e)


if __name__ == '__main__':
    ingest()
