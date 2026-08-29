# Repository Instructions

Future coding agents should read these files before changing anything:

- `README.md`
- `docs/CURRENT_STATUS.md`
- `docs/DECISIONS.md`
- `docs/EVALUATION_PLAN.md`

## Working rules

- Make minimal, scoped changes that match the current phase.
- Preserve prior decisions unless a new decision is recorded in `docs/DECISIONS.md`.
- Add tests for changed behavior once implementation exists.
- Report status honestly. Do not fabricate metrics, benchmarks, or evaluation outcomes.
- Avoid destructive commands unless the user explicitly requests them.
- Keep all new work compatible with Windows paths and later cross-platform npm scripts.
- Use synthetic data only.
- Do not commit credentials, tokens, or other secrets.

## Documentation workflow

- Update `docs/CURRENT_STATUS.md` when the phase or implementation state changes.
- Update `docs/IMPROVEMENT_CHANGELOG.md` when a meaningful iteration lands.
- Keep trace notes clear enough for another agent to reconstruct what happened without exposing private data.

## Current scope guardrails

- Do not implement the web app in this phase.
- Do not add real platform integrations in this phase.
- Do not initialize a framework in this phase.
- Do not install dependencies in this phase.
