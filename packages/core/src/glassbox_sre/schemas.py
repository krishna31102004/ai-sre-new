from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class AlertmanagerAlert(BaseModel):
    labels: dict[str, str] = Field(default_factory=dict)
    annotations: dict[str, str] = Field(default_factory=dict)
    starts_at: datetime = Field(alias="startsAt")


class AlertmanagerWebhook(BaseModel):
    status: str
    alerts: list[AlertmanagerAlert]


class DeployRecord(BaseModel):
    deployment_id: str
    service_name: str
    environment: str
    deployed_at: datetime
    commit_sha: str
    commit_title: str
    repo_path: str


class EvidenceItem(BaseModel):
    kind: Literal["deploy", "commit", "diff", "heuristic", "alert"]
    summary: str
    reference: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class HypothesisValidationState(StrEnum):
    VALIDATED = "validated"
    INVALIDATED = "invalidated"
    INCONCLUSIVE = "inconclusive"


class CommitCorrelationFinding(BaseModel):
    commit_sha: str
    commit_title: str
    service_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    validation_state: HypothesisValidationState
    evidence: list[EvidenceItem] = Field(min_length=1)
    reasoning: str

    @field_validator("commit_sha")
    @classmethod
    def commit_sha_must_look_like_git_sha(cls, value: str) -> str:
        if len(value) < 7 or not all(character in "0123456789abcdef" for character in value.lower()):
            raise ValueError("commit_sha must be a hexadecimal Git SHA")
        return value


class CommitCorrelationResult(BaseModel):
    findings: list[CommitCorrelationFinding] = Field(default_factory=list)
