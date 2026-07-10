from __future__ import annotations

import argparse
from pathlib import Path

from glassbox_sre.benchmark_runner import run_replay_fast_benchmark


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Glassbox SRE benchmark scenarios.")
    parser.add_argument("--mode", choices=["replay-fast"], default="replay-fast")
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--scenarios-dir",
        type=Path,
        default=Path("scenarios/benchmark"),
    )
    parser.add_argument("--runbook-root", type=Path, default=Path("runbooks"))
    parser.add_argument(
        "--artifact-root",
        type=Path,
        default=Path("artifacts/evaluations"),
    )
    args = parser.parse_args()

    output_dir = run_replay_fast_benchmark(
        scenarios_dir=args.scenarios_dir,
        repo_root=args.repo_root,
        runbook_root=args.runbook_root,
        artifact_root=args.artifact_root,
    )
    print(output_dir)


if __name__ == "__main__":
    main()
