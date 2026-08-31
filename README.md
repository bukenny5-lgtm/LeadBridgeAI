# LeadBridge AI

LeadBridge AI is a verified cross-channel sales-response workflow for small and medium-sized online sellers.

It is being prepared for the micro1 x HackerEarth Frontier Engineering Challenge 2026 as a new repository foundation. The current phase now includes a synthetic demonstration web hub on top of the deterministic baseline, verified-tool layer, hybrid policy-bounded agent work, and evaluation-engine work. No live platform integration, production deployment, or real customer messaging is implemented.

## Current phase

Phase 1 focused on:

1. Defining the project brief and scope.
2. Recording architecture and decision placeholders.
3. Establishing a fair baseline evaluation plan.
4. Creating a synthetic 20-case evaluation dataset.
5. Preparing trace organization guidance for future coding-agent and runtime-agent runs.

Phase 3 then recovered the verified tool layer, sanitized trajectories, and tool-assisted evaluation on top of the frozen 20.00% baseline. Phase 4 added a deterministic policy boundary around the model-driven agent so the model proposes language while policy controls lead qualification, claim permission, approval routing, and final rendering. Phase 5 adds a polished local demo hub that reuses the verified-tools workflow and keeps all messaging synthetic.

## What is not started yet

- Live platform integrations.
- Production deployment.
- Authentication and persistence.
- Docker or deployment infrastructure.

## Key documents

- [Project brief](docs/PROJECT_BRIEF.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)
- [Current status](docs/CURRENT_STATUS.md)
- [Evaluation plan](docs/EVALUATION_PLAN.md)
- [Improvement changelog](docs/IMPROVEMENT_CHANGELOG.md)
- [Reproduction guide](docs/REPRODUCTION_GUIDE.md)
- [Hot take](docs/HOT_TAKE.md)
- [Trace guide](docs/TRACE_GUIDE.md)
- [Evaluation cases](evaluation/cases/cases.json)

## Repository rule of thumb

Keep the work synthetic, documented, and auditable until the baseline is established. Do not commit credentials, fabricate results, or skip the status updates that future work depends on.

## Run commands

- `npm.cmd run dev` starts the synthetic demo hub locally after building it.
- `npm.cmd run build:web` compiles the server and browser demo code.
- `npm.cmd run start` starts the already-built demo server.
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run check`

## Demo note

The demo hub only shows synthetic messages, synthetic evidence, and stored evaluation summaries. It never connects to real Facebook, Instagram, TikTok, or email accounts, and every customer-facing response remains approval-gated.
