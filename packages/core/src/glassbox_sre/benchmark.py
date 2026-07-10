from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class ScenarioSourceKind(StrEnum):
    LIVE_CAPTURED = "live_captured"
    SYNTHETIC_REPLAY = "synthetic_replay"


class ExpectedImpact(BaseModel):
    severity: Literal["critical", "page", "ticket", "info"]
    total_requests: int = Field(ge=0)
    error_requests: int = Field(ge=0)
    affected_requests: int = Field(ge=0)
    error_rate: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def counts_must_be_coherent(self) -> "ExpectedImpact":
        if self.error_requests > self.total_requests:
            raise ValueError("error_requests cannot exceed total_requests")
        if self.affected_requests > self.total_requests:
            raise ValueError("affected_requests cannot exceed total_requests")
        return self


class ScenarioGroundTruth(BaseModel):
    root_cause_id: str
    bad_commit_sha: str
    bad_commit_top3_allowed: list[str] = Field(default_factory=list)
    service: str
    affected_services: list[str] = Field(min_length=1)
    runbook_id: str
    runbook_sections_allowed: list[str] = Field(min_length=1)
    impact: ExpectedImpact

    @field_validator("bad_commit_sha")
    @classmethod
    def commit_sha_must_look_like_git_sha(cls, value: str) -> str:
        if len(value) < 7 or not all(character in "0123456789abcdef" for character in value.lower()):
            raise ValueError("bad_commit_sha must be a hexadecimal Git SHA")
        return value

    @field_validator("bad_commit_top3_allowed")
    @classmethod
    def allowed_commits_must_look_like_git_shas(cls, value: list[str]) -> list[str]:
        for commit_sha in value:
            if len(commit_sha) < 7 or not all(
                character in "0123456789abcdef" for character in commit_sha.lower()
            ):
                raise ValueError("bad_commit_top3_allowed entries must be hexadecimal Git SHAs")
        return value

    @model_validator(mode="after")
    def expected_commit_must_be_allowed(self) -> "ScenarioGroundTruth":
        if self.bad_commit_sha not in self.bad_commit_top3_allowed:
            self.bad_commit_top3_allowed.insert(0, self.bad_commit_sha)
        return self


class BenchmarkScenario(BaseModel):
    id: str
    title: str
    source_kind: ScenarioSourceKind
    description: str
    fault_flag: str | None = None
    alert_fixture: str
    world_snapshot: str
    deploy_history_fixture: str
    expected: ScenarioGroundTruth
    tags: list[str] = Field(default_factory=list)
    provenance: str

    @field_validator("id")
    @classmethod
    def id_must_be_slug(cls, value: str) -> str:
        allowed = set("abcdefghijklmnopqrstuvwxyz0123456789-")
        if not value or any(character not in allowed for character in value):
            raise ValueError("id must be a lowercase slug using a-z, 0-9, and '-'")
        return value

    @model_validator(mode="after")
    def live_captured_requires_fault_flag(self) -> "BenchmarkScenario":
        if self.source_kind == ScenarioSourceKind.LIVE_CAPTURED and not self.fault_flag:
            raise ValueError("live_captured scenarios must name the fault_flag used to capture them")
        return self


class BenchmarkScenarioSet(BaseModel):
    generated_at: datetime
    scenarios: list[BenchmarkScenario] = Field(min_length=1)

    @model_validator(mode="after")
    def scenario_ids_must_be_unique(self) -> "BenchmarkScenarioSet":
        scenario_ids = [scenario.id for scenario in self.scenarios]
        if len(scenario_ids) != len(set(scenario_ids)):
            raise ValueError("scenario ids must be unique")
        return self


def load_benchmark_scenario(path: Path) -> BenchmarkScenario:
    return BenchmarkScenario.model_validate_json(path.read_text())


def load_benchmark_scenario_set(path: Path) -> BenchmarkScenarioSet:
    return BenchmarkScenarioSet.model_validate_json(path.read_text())


def validate_world_snapshot_shape(snapshot: dict[str, Any]) -> None:
    required_keys = {"captured_at", "prometheus", "service_graph", "evidence"}
    missing_keys = required_keys - set(snapshot)
    if missing_keys:
        raise ValueError(f"world snapshot missing required keys: {sorted(missing_keys)}")
