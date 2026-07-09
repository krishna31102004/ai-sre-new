from __future__ import annotations

import re
import hashlib
import math
from pathlib import Path

from glassbox_sre.config import Settings, get_settings
from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    EvidenceItem,
    RunbookChunk,
    RunbookMetadata,
    RunbookRetrievalFinding,
)
from openai import OpenAI


def parse_runbook(path: Path) -> tuple[RunbookMetadata, str]:
    text = path.read_text()
    if not text.startswith("---\n"):
        raise ValueError(f"runbook missing frontmatter: {path}")
    _, frontmatter, body = text.split("---\n", 2)
    metadata: dict[str, object] = {}
    current_list_key: str | None = None
    for raw_line in frontmatter.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        if line.startswith("  - ") and current_list_key:
            metadata.setdefault(current_list_key, [])
            assert isinstance(metadata[current_list_key], list)
            metadata[current_list_key].append(line[4:])
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        current_list_key = key if value == "" else None
        metadata[key] = [] if value == "" else value
    return RunbookMetadata.model_validate(metadata), body.strip()


def chunk_runbook(path: Path) -> list[RunbookChunk]:
    metadata, body = parse_runbook(path)
    sections = re.split(r"(?m)^##\s+", body)
    chunks: list[RunbookChunk] = []
    for section in sections:
        section = section.strip()
        if not section or section.startswith("# "):
            continue
        heading, _, content = section.partition("\n")
        heading = heading.strip()
        content = content.strip()
        if not content:
            continue
        chunk_id = f"{metadata.runbook_id}:{heading.lower().replace(' ', '-')}"
        chunks.append(
            RunbookChunk(
                chunk_id=chunk_id,
                runbook_id=metadata.runbook_id,
                title=metadata.title,
                section_heading=heading,
                body=content,
                service=metadata.service,
                alertname=metadata.alertname,
                symptoms=metadata.symptoms,
                fault_flag=metadata.fault_flag,
            )
        )
    return chunks


def load_runbook_chunks(runbook_root: Path) -> list[RunbookChunk]:
    chunks: list[RunbookChunk] = []
    for path in sorted(runbook_root.rglob("*.md")):
        chunks.extend(chunk_runbook(path))
    return chunks


def alert_runbook_tags(payload: AlertmanagerWebhook) -> dict[str, str | set[str]]:
    first_alert = payload.alerts[0]
    labels = first_alert.labels
    annotations = first_alert.annotations
    service = labels.get("service") or labels.get("service_name") or labels.get("job") or ""
    alertname = labels.get("alertname", "")
    symptoms = {alertname, service}
    for value in [*labels.values(), *annotations.values()]:
        for token in re.findall(r"[A-Za-z0-9_]+", value):
            symptoms.add(token)
    return {"service": service, "alertname": alertname, "symptoms": symptoms}


def filter_runbook_chunks(
    payload: AlertmanagerWebhook,
    chunks: list[RunbookChunk],
) -> list[RunbookChunk]:
    tags = alert_runbook_tags(payload)
    service = tags["service"]
    alertname = tags["alertname"]
    symptoms = tags["symptoms"]
    assert isinstance(symptoms, set)
    exact = [
        chunk
        for chunk in chunks
        if chunk.service == service and chunk.alertname == alertname
    ]
    if exact:
        return exact
    service_matches = [chunk for chunk in chunks if chunk.service == service]
    if service_matches:
        return service_matches
    return [
        chunk
        for chunk in chunks
        if symptoms.intersection(set(chunk.symptoms) | {chunk.fault_flag or ""})
    ]


def lexical_score(query_terms: set[str], chunk: RunbookChunk) -> float:
    haystack = " ".join(
        [chunk.title, chunk.section_heading, chunk.body, *chunk.symptoms, chunk.fault_flag or ""]
    ).lower()
    matches = sum(1 for term in query_terms if term.lower() in haystack)
    return float(matches) / max(len(query_terms), 1)


def retrieve_runbook_chunks(
    payload: AlertmanagerWebhook,
    chunks: list[RunbookChunk],
    limit: int = 3,
) -> list[RunbookRetrievalFinding]:
    tags = alert_runbook_tags(payload)
    symptoms = tags["symptoms"]
    assert isinstance(symptoms, set)
    filtered = filter_runbook_chunks(payload, chunks)
    ranked = sorted(
        filtered,
        key=lambda chunk: lexical_score(symptoms, chunk),
        reverse=True,
    )[:limit]
    return [
        RunbookRetrievalFinding(
            runbook_id=chunk.runbook_id,
            chunk_id=chunk.chunk_id,
            title=chunk.title,
            section_heading=chunk.section_heading,
            service=chunk.service,
            alertname=chunk.alertname,
            score=lexical_score(symptoms, chunk),
            evidence=[
                EvidenceItem(
                    kind="runbook",
                    summary=f"Matched runbook section {chunk.section_heading}.",
                    reference=chunk.chunk_id,
                    metadata={"runbook_id": chunk.runbook_id},
                )
            ],
            summary=chunk.body.splitlines()[0],
        )
        for chunk in ranked
    ]


def deterministic_embedding(text: str, dimensions: int = 64) -> list[float]:
    values = [0.0] * dimensions
    for token in re.findall(r"[A-Za-z0-9_]+", text.lower()):
        digest = hashlib.sha256(token.encode()).digest()
        index = int.from_bytes(digest[:2], "big") % dimensions
        values[index] += 1.0
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("embedding dimensions must match")
    return sum(a * b for a, b in zip(left, right, strict=True))


def embedding_text_for_chunk(chunk: RunbookChunk) -> str:
    return " ".join(
        [chunk.title, chunk.section_heading, chunk.body, chunk.service, chunk.alertname, *chunk.symptoms]
    )


def rank_filtered_chunks_by_embedding(
    payload: AlertmanagerWebhook,
    chunk_embeddings: list[tuple[RunbookChunk, list[float]]],
    query_embedding: list[float] | None = None,
    limit: int = 3,
) -> list[RunbookRetrievalFinding]:
    all_chunks = [chunk for chunk, _embedding in chunk_embeddings]
    filtered_ids = {chunk.chunk_id for chunk in filter_runbook_chunks(payload, all_chunks)}
    tags = alert_runbook_tags(payload)
    symptoms = tags["symptoms"]
    assert isinstance(symptoms, set)
    query = " ".join(sorted(str(value) for value in symptoms))
    resolved_query_embedding = query_embedding or deterministic_embedding(query)
    ranked = sorted(
        [
            (chunk, embedding, cosine_similarity(resolved_query_embedding, embedding))
            for chunk, embedding in chunk_embeddings
            if chunk.chunk_id in filtered_ids
        ],
        key=lambda item: item[2],
        reverse=True,
    )[:limit]
    return [
        RunbookRetrievalFinding(
            runbook_id=chunk.runbook_id,
            chunk_id=chunk.chunk_id,
            title=chunk.title,
            section_heading=chunk.section_heading,
            service=chunk.service,
            alertname=chunk.alertname,
            score=score,
            evidence=[
                EvidenceItem(
                    kind="runbook",
                    summary=f"Matched runbook section {chunk.section_heading} after tag filtering.",
                    reference=chunk.chunk_id,
                    metadata={"runbook_id": chunk.runbook_id, "similarity": score},
                )
            ],
            summary=chunk.body.splitlines()[0],
        )
        for chunk, _embedding, score in ranked
    ]


def generate_openai_embeddings(texts: list[str], settings: Settings | None = None) -> list[list[float]]:
    resolved_settings = settings or get_settings()
    if not resolved_settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY must be set to generate runbook embeddings.")
    client = OpenAI(api_key=resolved_settings.openai_api_key)
    response = client.embeddings.create(
        model=resolved_settings.openai_embedding_model,
        input=texts,
    )
    return [item.embedding for item in response.data]
