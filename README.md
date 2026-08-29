# LeadBridge AI

LeadBridge AI is a verified cross-channel sales-response workflow for small and medium-sized online sellers.

It is being prepared for the micro1 x HackerEarth Frontier Engineering Challenge 2026 as a new repository foundation. The current phase is deterministic baseline, verified-tool layer, and evaluation-engine work on top of the Phase 1 documentation and synthetic test data. No web app, runtime agent, API integration, or production deployment is implemented yet.

## Current phase

Phase 1 focused on:

1. Defining the project brief and scope.
2. Recording architecture and decision placeholders.
3. Establishing a fair baseline evaluation plan.
4. Creating a synthetic 20-case evaluation dataset.
5. Preparing trace organization guidance for future coding-agent and runtime-agent runs.

Phase 3 then recovered the verified tool layer, sanitized trajectories, and tool-assisted evaluation on top of the frozen 20.00% baseline.

## What is not started yet

- Web application implementation.
- Runtime agent implementation.
- API integrations.
- Production deployment.

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
