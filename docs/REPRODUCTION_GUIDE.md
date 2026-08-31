# Reproduction Guide

## Current state

This guide is now a working reproduction reference rather than a skeleton.

Phase 6 keeps the local synthetic demo hub on top of the deterministic baseline, verified tool layer, and self-contained validation path. The authoritative frozen baseline is still 20.00% on the 20-case synthetic set, and the tool-assisted pass currently measures 60.00% on the same cases.

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

`npm.cmd test` now runs `pretest` first, so the compiled browser assets are created automatically before Vitest starts.

The model-driven evaluator writes partial live runs to limit-specific files. For example, `npm run evaluate:agent:live -- --limit 1` writes `evaluation/results/agent-luna-limit-1.json` and `evaluation/results/agent-luna-limit-1.md`, while `--limit 5` writes `evaluation/results/agent-luna-limit-5.json` and `evaluation/results/agent-luna-limit-5.md`.

Those partial reports are intentionally non-authoritative. Only a completed 20-case Luna run may use the plain `evaluation/results/agent-luna.json` and `evaluation/results/agent-luna.md` names.

The earlier `npm install --strict-ssl=false` retry was an environment-specific workaround for a certificate verification failure and is not part of normal reproduction.

Phase 3 attempted to install `zod` twice, but both installs timed out in this workspace. The shipped validator is therefore self-contained and does not require a new runtime schema dependency.

The Phase 5 demo hub uses the existing verified-tools workflow, an in-memory approval queue, and synthetic inbox fixtures. It does not require a database, Docker, or any live platform connection.

## Clean-room result

A clean temporary archive made from the current tracked files and extracted outside the repository can reproduce the project. In that archive, `npm.cmd ci` succeeded, `npm.cmd test` now succeeded immediately afterward because `pretest` ran `build:web` automatically, `npm.cmd run check` succeeded, and the local smoke probe on `http://127.0.0.1:4173/` and `http://127.0.0.1:4173/api/health` returned `200`.

The previous failure mode, where `npm.cmd test` required a manual `npm.cmd run build:web` first, is corrected by the `pretest` hook.

## What will be documented later

- environment setup
- dependency installation
- test commands
- evaluation execution
- trace capture steps
- troubleshooting notes

## Status note

The current local demo command is `npm.cmd run dev`, which builds the server/browser demo code and then starts the Node HTTP server. After building once, `npm.cmd run start` can launch the already-built server.

If the generated output folders are restored as read-only in a fresh checkout, make them writable before rerunning the evaluation commands so the reports and trajectories can be regenerated in place.
