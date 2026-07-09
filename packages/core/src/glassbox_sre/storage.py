from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime
from typing import Any

from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    DeployRecord,
    RunbookChunk,
)
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, create_engine, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.types import JSON


class Base(DeclarativeBase):
    pass


def json_type() -> JSON:
    return JSONB().with_variant(JSON(), "sqlite")


class DeploymentRow(Base):
    __tablename__ = "deployments"

    deployment_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    environment: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    deployed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    commit_sha: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    commit_title: Mapped[str] = mapped_column(Text, nullable=False)
    repo_path: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(json_type(), default=dict)


class InvestigationRow(Base):
    __tablename__ = "investigations"

    investigation_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    alert_status: Mapped[str] = mapped_column(String(40), nullable=False)
    alert_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    final_brief: Mapped[str | None] = mapped_column(Text)
    payload_json: Mapped[dict[str, Any]] = mapped_column(json_type(), nullable=False)


class FindingRow(Base):
    __tablename__ = "investigation_findings"

    finding_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    investigation_id: Mapped[str] = mapped_column(
        ForeignKey("investigations.investigation_id"), nullable=False, index=True
    )
    commit_sha: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    commit_title: Mapped[str] = mapped_column(Text, nullable=False)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    validation_state: Mapped[str] = mapped_column(String(40), nullable=False)
    evidence_json: Mapped[list[dict[str, Any]]] = mapped_column(json_type(), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)


class RunbookChunkRow(Base):
    __tablename__ = "runbook_chunks"

    chunk_id: Mapped[str] = mapped_column(String(240), primary_key=True)
    runbook_id: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    section_heading: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    service_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    alertname: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    symptoms_json: Mapped[list[str]] = mapped_column(json_type(), nullable=False)
    fault_flag: Mapped[str | None] = mapped_column(String(120))
    embedding_json: Mapped[list[float]] = mapped_column(json_type(), nullable=False)


def make_session_factory(database_url: str) -> sessionmaker[Session]:
    engine = create_engine(database_url)
    return sessionmaker(engine)


def init_db(session_factory: sessionmaker[Session]) -> None:
    Base.metadata.create_all(session_factory.kw["bind"])


def ensure_runbook_vector_storage(session: Session, dimensions: int = 1536) -> None:
    session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    session.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS runbook_embeddings (
                chunk_id text PRIMARY KEY REFERENCES runbook_chunks(chunk_id) ON DELETE CASCADE,
                embedding vector({dimensions}) NOT NULL
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS runbook_embeddings_embedding_idx
            ON runbook_embeddings
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 1)
            """
        )
    )


def upsert_deployments(session: Session, deployments: list[DeployRecord]) -> None:
    for deployment in deployments:
        existing = session.get(DeploymentRow, deployment.deployment_id)
        row = existing or DeploymentRow(deployment_id=deployment.deployment_id)
        row.service_name = deployment.service_name
        row.environment = deployment.environment
        row.deployed_at = deployment.deployed_at
        row.commit_sha = deployment.commit_sha
        row.commit_title = deployment.commit_title
        row.repo_path = deployment.repo_path
        row.metadata_json = {}
        session.add(row)


def load_deployments(session: Session) -> list[DeployRecord]:
    rows = session.scalars(select(DeploymentRow).order_by(DeploymentRow.deployed_at)).all()
    return [
        DeployRecord(
            deployment_id=row.deployment_id,
            service_name=row.service_name,
            environment=row.environment,
            deployed_at=row.deployed_at,
            commit_sha=row.commit_sha,
            commit_title=row.commit_title,
            repo_path=row.repo_path,
        )
        for row in rows
    ]


def create_investigation(session: Session, payload: AlertmanagerWebhook) -> str:
    first_alert = payload.alerts[0]
    investigation_id = str(uuid.uuid4())
    service_name = (
        first_alert.labels.get("service")
        or first_alert.labels.get("service_name")
        or first_alert.labels.get("job")
        or "unknown-service"
    )
    session.add(
        InvestigationRow(
            investigation_id=investigation_id,
            alert_status=payload.status,
            alert_name=first_alert.labels.get("alertname", "unknown-alert"),
            service_name=service_name,
            started_at=first_alert.starts_at,
            created_at=datetime.now(UTC),
            final_brief=None,
            payload_json=payload.model_dump(mode="json", by_alias=True),
        )
    )
    return investigation_id


def save_findings(
    session: Session,
    investigation_id: str,
    findings: list[CommitCorrelationFinding],
) -> None:
    for finding in findings:
        session.add(
            FindingRow(
                finding_id=str(uuid.uuid4()),
                investigation_id=investigation_id,
                commit_sha=finding.commit_sha,
                commit_title=finding.commit_title,
                service_name=finding.service_name,
                confidence=finding.confidence,
                validation_state=finding.validation_state.value,
                evidence_json=[item.model_dump(mode="json") for item in finding.evidence],
                reasoning=finding.reasoning,
            )
        )


def update_investigation_brief(session: Session, investigation_id: str, brief: str) -> None:
    row = session.get(InvestigationRow, investigation_id)
    if row is None:
        raise ValueError(f"unknown investigation_id={investigation_id}")
    row.final_brief = brief


def upsert_runbook_chunks(
    session: Session,
    chunks: list[RunbookChunk],
    embeddings: dict[str, list[float]],
) -> None:
    for chunk in chunks:
        existing = session.get(RunbookChunkRow, chunk.chunk_id)
        row = existing or RunbookChunkRow(chunk_id=chunk.chunk_id)
        row.runbook_id = chunk.runbook_id
        row.title = chunk.title
        row.section_heading = chunk.section_heading
        row.body = chunk.body
        row.service_name = chunk.service
        row.alertname = chunk.alertname
        row.symptoms_json = chunk.symptoms
        row.fault_flag = chunk.fault_flag
        row.embedding_json = embeddings[chunk.chunk_id]
        session.add(row)


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in values) + "]"


def upsert_runbook_embeddings(session: Session, embeddings: dict[str, list[float]]) -> None:
    for chunk_id, embedding in embeddings.items():
        session.execute(
            text(
                """
                INSERT INTO runbook_embeddings (chunk_id, embedding)
                VALUES (:chunk_id, CAST(:embedding AS vector))
                ON CONFLICT (chunk_id)
                DO UPDATE SET embedding = EXCLUDED.embedding
                """
            ),
            {"chunk_id": chunk_id, "embedding": vector_literal(embedding)},
        )


def load_runbook_chunks_from_db(session: Session) -> list[tuple[RunbookChunk, list[float]]]:
    rows = session.scalars(select(RunbookChunkRow).order_by(RunbookChunkRow.chunk_id)).all()
    return [
        (
            RunbookChunk(
                chunk_id=row.chunk_id,
                runbook_id=row.runbook_id,
                title=row.title,
                section_heading=row.section_heading,
                body=row.body,
                service=row.service_name,
                alertname=row.alertname,
                symptoms=row.symptoms_json,
                fault_flag=row.fault_flag,
            ),
            row.embedding_json,
        )
        for row in rows
    ]


def count_runbook_embeddings(session: Session) -> int:
    return int(session.execute(text("SELECT count(*) FROM runbook_embeddings")).scalar_one())
