import sys
import os

# Ensure we can import the backend `app` package when running via pytest from repo root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app.services.vector_service as vs


def test_vector_service_isolated_index(tmp_path, monkeypatch):
    # Redirect vector index root to a per-test temporary directory
    tmp_indexes_root = tmp_path / "indexes"
    monkeypatch.setattr(vs, "indexes_root", lambda: tmp_indexes_root)

    # 1) Create an empty index in the temp location
    index = vs.build_or_load_index(week_id=1)
    assert index is not None

    # 2) Add a single text
    texts = ["This is a test document for the vector index."]
    metadatas = [{"reading_id": 1, "chunk_idx": 0, "filename": "test.pdf"}]
    vs.add_texts(week_id=1, texts=texts, metadatas=metadatas)

    # 3) Add multiple texts
    texts_multi = [
        "First chunk of text.",
        "Second chunk of text.",
        "Third chunk of text.",
    ]
    metadatas_multi = [
        {"reading_id": 1, "chunk_idx": i, "filename": "test.pdf"}
        for i in range(len(texts_multi))
    ]
    vs.add_texts(week_id=1, texts=texts_multi, metadatas=metadatas_multi)

    # Ensure files were written only under the temp directory
    week_dir = tmp_indexes_root / "week_1"
    assert week_dir.exists()
    assert any((week_dir / name).exists() for name in ("index.pkl", "faiss_index"))

    # Optional: basic similarity search sanity check
    results = vs.similarity_search(week_id=1, query="test", k=2)
    assert isinstance(results, list)
    assert len(results) >= 1