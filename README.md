# Glassbox SRE

Read-only, glass-box AI SRE incident investigation agent.

Start with the project memory files before making changes:

1. `PROJECT.md`
2. `ROADMAP.md`
3. `DECISIONS.md`

## Local Python Setup

Use `python3` consistently for local commands and scripts.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.example .env
```

The project uses the standard-library `venv` module so the setup works anywhere Python 3.11+ is available without requiring a separate package manager.
