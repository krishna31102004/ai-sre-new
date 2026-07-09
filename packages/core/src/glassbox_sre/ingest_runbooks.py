from pathlib import Path

from glassbox_sre.config import get_settings
from glassbox_sre.runbooks import embedding_text_for_chunk, generate_openai_embeddings, load_runbook_chunks
from glassbox_sre.storage import (
    ensure_runbook_vector_storage,
    init_db,
    make_session_factory,
    upsert_runbook_chunks,
    upsert_runbook_embeddings,
)


def ingest_runbooks(runbook_root: Path) -> int:
    settings = get_settings()
    chunks = load_runbook_chunks(runbook_root)
    embeddings = generate_openai_embeddings(
        [embedding_text_for_chunk(chunk) for chunk in chunks],
        settings,
    )
    by_chunk_id = {
        chunk.chunk_id: embedding
        for chunk, embedding in zip(chunks, embeddings, strict=True)
    }
    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)
    with session_factory.begin() as session:
        ensure_runbook_vector_storage(session)
        upsert_runbook_chunks(session, chunks, by_chunk_id)
        upsert_runbook_embeddings(session, by_chunk_id)
    return len(chunks)


def main() -> None:
    count = ingest_runbooks(Path("runbooks"))
    print(f"ingested {count} runbook chunks")


if __name__ == "__main__":
    main()
