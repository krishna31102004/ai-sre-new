import json
from pathlib import Path

from glassbox_sre.schemas import DeployRecord


def load_seed_deployments(path: Path) -> list[DeployRecord]:
    data = json.loads(path.read_text())
    return [DeployRecord.model_validate(item) for item in data]
