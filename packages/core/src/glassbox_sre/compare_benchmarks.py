from __future__ import annotations

import argparse
from pathlib import Path

from glassbox_sre.benchmark_compare import write_comparison_artifacts


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two Glassbox SRE benchmark runs.")
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts/evaluation-comparisons/latest"),
    )
    args = parser.parse_args()

    write_comparison_artifacts(args.before, args.after, args.output_dir)
    print(args.output_dir)


if __name__ == "__main__":
    main()
