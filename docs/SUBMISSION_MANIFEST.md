# Submission Manifest

This manifest defines the allowlist used for the submission ZIP.

## Include

- Tracked source code under `src/`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.build.json`
- `data/`
- `prompts/`
- `evaluation/cases/`
- `evaluation/results/`
- `tests/`
- `docs/`
- `traces/coding-agent/`
- `traces/runtime-agent/`
- `README.md`
- `AGENTS.md`

## Exclude

- `.git/`
- `node_modules/`
- `dist/`
- `.env`
- `.env.*`
- editor caches
- temporary logs
- unrelated ZIP files
- any local scratch directory outside the allowlist

## Packaging rule

Only tracked source and the explicitly listed documentation, data, evaluation, and trace directories are packaged. Build outputs are reproducible locally and are not included in the ZIP.
