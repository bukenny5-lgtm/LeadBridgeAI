# Reproduction Guide

## Current state

This guide is an initial skeleton only.

Phase 5 now adds a local synthetic demo hub on top of the deterministic baseline, verified tool layer, and self-contained validation path. The authoritative frozen baseline is still 20.00% on the 20-case synthetic set, and the tool-assisted pass currently measures 60.00% on the same cases.

## Known prerequisites

- Node.js 20 or newer
- npm

## Exact commands

- `npm run typecheck`
- `npm test`
- `npm run validate:data`
- `npm run evaluate:baseline`
- `npm run evaluate:tools`
- `npm run check`
- `npm.cmd run build:web`
- `npm.cmd run dev`
- `npm.cmd run start`

The model-driven evaluator writes partial live runs to limit-specific files. For example, `npm run evaluate:agent:live -- --limit 1` writes `evaluation/results/agent-luna-limit-1.json` and `evaluation/results/agent-luna-limit-1.md`, while `--limit 5` writes `evaluation/results/agent-luna-limit-5.json` and `evaluation/results/agent-luna-limit-5.md`.

Those partial reports are intentionally non-authoritative. Only a completed 20-case Luna run may use the plain `evaluation/results/agent-luna.json` and `evaluation/results/agent-luna.md` names.

The earlier `npm install --strict-ssl=false` retry was an environment-specific workaround for a certificate verification failure and is not part of normal reproduction.

Phase 3 attempted to install `zod` twice, but both installs timed out in this workspace. The shipped validator is therefore self-contained and does not require a new runtime schema dependency.

The Phase 5 demo hub uses the existing verified-tools workflow, an in-memory approval queue, and synthetic inbox fixtures. It does not require a database, Docker, or any live platform connection.

## What will be documented later

- environment setup
- dependency installation
- test commands
- evaluation execution
- trace capture steps
- troubleshooting notes

## Status note

Clean-environment reproduction has not been demonstrated yet.

The current local demo command is `npm.cmd run dev`, which builds the server/browser demo code and then starts the Node HTTP server. After building once, `npm.cmd run start` can launch the already-built server.

If the generated output folders are restored as read-only in a fresh checkout, make them writable before rerunning the evaluation commands so the reports and trajectories can be regenerated in place.
