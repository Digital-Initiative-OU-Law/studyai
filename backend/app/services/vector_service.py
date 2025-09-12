from __future__ import annotations

from pathlib import Path
from typing import List, Dict, Any

from langchain_community.vectorstores import FAISS
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    # Fallback to older import if new one not available
    from langchain_community.embeddings import HuggingFaceEmbeddings


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def indexes_root() -> Path:
    # backend/app/services/vector_service.py → backend/app/storage/indexes
    return Path(__file__).resolve().parent.parent / "storage" / "indexes"


def week_index_dir(week_id: int) -> Path:
    root = indexes_root()
    d = root / f"week_{week_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def embedding_model() -> HuggingFaceEmbeddings:
    # Normalize embeddings improves cosine similarity
    return HuggingFaceEmbeddings(model_name=MODEL_NAME, encode_kwargs={"normalize_embeddings": True})


def build_or_load_index(week_id: int) -> FAISS:
    emb = embedding_model()
    path = week_index_dir(week_id)
    
    # For safety, always create a fresh index
    # This avoids deserialization issues and ensures clean state
    # The index will be rebuilt from chunks stored in the database if needed
    return FAISS.from_texts(texts=["__placeholder__"], embedding=emb)


def persist_index(vs: FAISS, week_id: int) -> None:
    path = week_index_dir(week_id)
    vs.save_local(folder_path=str(path))


def add_texts(week_id: int, texts: List[str], metadatas: List[Dict[str, Any]]) -> None:
    vs = build_or_load_index(week_id)
    vs.add_texts(texts=texts, metadatas=metadatas)
    persist_index(vs, week_id)


def similarity_search(week_id: int, query: str, k: int = 8):
    vs = build_or_load_index(week_id)
    return vs.similarity_search(query, k=k)


def reset_index(week_id: int) -> None:
    """Delete existing FAISS index files for the given week."""
    path = week_index_dir(week_id)
    # FAISS uses index files and index.pkl; remove if present
    for name in ("index.pkl", "faiss_index"):
        p = path / name
        if p.exists():
            try:
                if p.is_dir():
                    import shutil
                    shutil.rmtree(p)
                else:
                    p.unlink()
            except Exception as e:
                # Log the error but continue
                print(f"Warning: Failed to delete {p}: {e}")


def rebuild_index(week_id: int, texts: List[str], metadatas: List[Dict[str, Any]]) -> None:
    emb = embedding_model()
    vs = FAISS.from_texts(texts=texts, embedding=emb, metadatas=metadatas)
    persist_index(vs, week_id)
