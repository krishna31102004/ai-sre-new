from pathlib import Path

from glassbox_sre.seed_data import load_seed_deployments
from glassbox_sre.storage import init_db, load_deployments, make_session_factory, upsert_deployments

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
