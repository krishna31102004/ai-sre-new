from pathlib import Path

from glassbox_sre.runbooks import deterministic_embedding, embedding_text_for_chunk, load_runbook_chunks
from glassbox_sre.seed_data import load_seed_deployments
from glassbox_sre.storage import (
    init_db,
    load_deployments,
    load_runbook_chunks_from_db,
    make_session_factory,
    upsert_deployments,
    upsert_runbook_chunks,
)

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_seed_deployments_round_trip_in_database(tmp_path) -> None:
    session_factory = make_session_factory(f"sqlite:///{tmp_path / 'glassbox.db'}")
    init_db(session_factory)
    deployments = load_seed_deployments(REPO_ROOT / "scenarios/otel-demo/deploy-history.json")

    with session_factory.begin() as session:
        upsert_deployments(session, deployments)

    with session_factory() as session:
        stored = load_deployments(session)

    assert [deployment.deployment_id for deployment in stored] == [
        "deploy-shipping-001",
        "deploy-frontend-001",
        "deploy-currency-001",
    ]


def test_runbook_chunks_round_trip_in_database(tmp_path) -> None:
    session_factory = make_session_factory(f"sqlite:///{tmp_path / 'glassbox.db'}")
    init_db(session_factory)
    chunks = load_runbook_chunks(REPO_ROOT / "runbooks")
    embeddings = {
        chunk.chunk_id: deterministic_embedding(embedding_text_for_chunk(chunk))
        for chunk in chunks
    }

    with session_factory.begin() as session:
        upsert_runbook_chunks(session, chunks, embeddings)

    with session_factory() as session:
        stored = load_runbook_chunks_from_db(session)

    assert stored
    assert any(chunk.runbook_id == "otel-demo.frontend-ad-failure" for chunk, _ in stored)
