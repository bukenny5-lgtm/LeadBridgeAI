# LeadBridge AI

LeadBridge AI is a synthetic, verified cross-channel sales-response workflow for small and medium-sized online sellers.

It is being prepared for the micro1 x HackerEarth Frontier Engineering Challenge 2026. The repository now includes the deterministic baseline, verified-tool workflow, hybrid policy boundary, synthetic demo hub, evaluation reports, and the Phase 6 submission-preparation docs. No live platform integration, production deployment, or real customer messaging is implemented.

## Problem

Small sellers lose time and conversion when customer questions arrive across multiple channels and need consistent answers, evidence checks, escalation, and approval before anything is sent.

## Solution

LeadBridge AI centralizes synthetic customer messages in a unified inbox, checks verified evidence, drafts grounded replies, and keeps every customer-facing response inside a human approval boundary.

## Key differentiator

The project does not treat the model as the source of truth. Verified tools, deterministic policy, and human approval remain the operational core, which keeps the workflow auditable and safe for the hackathon scenario.

## Architecture

The implementation is intentionally small:

1. A deterministic baseline and scorer define the frozen evaluation floor.
2. A verified-tool layer reads synthetic fixtures for product, inventory, delivery, and policy evidence.
3. A deterministic policy boundary controls lead qualification, escalation, provisional orders, and final rendering.
4. A synthetic Node demo server and vanilla browser client present the inbox, evidence, and evaluation summaries.

See [Architecture notes](docs/ARCHITECTURE.md) for the longer design record.

## Human approval boundary

Every customer-facing response requires human approval before it is sent. Escalation is separate from approval and is used when the case is ambiguous, unsupported, low confidence, or policy-sensitive.

## Synthetic data disclaimer

All data, messages, evidence, traces, and evaluation cases in this repository are synthetic. The demo does not connect to real Facebook, Instagram, TikTok, or email accounts.

## Evaluation methodology

The authoritative comparison uses the same 20 synthetic cases and the same scorer across the baseline and the verified-tool run.

- Baseline: 20.00%
- Verified tools: 60.00%
- Model-led mock: 40.00%
- Guarded hybrid mock: 60.00%

These are stored report values, not fresh reruns.

## Current phase

Phase 6 is the submission-preparation phase. It focuses on final auditability, trace inventory, security review, clean-environment reproduction, and ZIP packaging rather than new product capability.

## What exists now

- Project brief
- Architecture notes
- Decision log
- Evaluation plan
- Improvement changelog
- Reproduction guide
- Hot take
- Trace guide
- Submission checklist and judging docs
- Synthetic evaluation dataset
- Deterministic baseline scaffold
- Evaluation loader, scorer, and report generation scaffold
- Baseline reports in `evaluation/results/`
- Verified tool layer backed by synthetic fixtures
- Tool-assisted evaluation report in `evaluation/results/`
- Sanitized runtime-agent trajectory sets in `traces/runtime-agent/`
- Model-driven agent scaffolding and live-report generation for partial runs
- Deterministic policy module around the model-driven boundary
- Hybrid prompt, policy test coverage, and hybrid mock report generation
- Synthetic demo web hub server and browser client scaffold

## What is not started yet

- Live platform integrations
- Production deployment
- Authentication and persistence
- Docker or deployment infrastructure

## Key documents

- [Project brief](docs/PROJECT_BRIEF.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [Decision log](docs/DECISIONS.md)
- [Current status](docs/CURRENT_STATUS.md)
- [Evaluation plan](docs/EVALUATION_PLAN.md)
- [Improvement changelog](docs/IMPROVEMENT_CHANGELOG.md)
- [Reproduction guide](docs/REPRODUCTION_GUIDE.md)
- [Trace guide](docs/TRACE_GUIDE.md)
- [Judging guide](docs/JUDGING_GUIDE.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)
- [Submission manifest](docs/SUBMISSION_MANIFEST.md)
- [Final audit](docs/FINAL_AUDIT.md)
- [Evaluation cases](evaluation/cases/cases.json)

## Repository rule of thumb

Keep the work synthetic, documented, and auditable. Do not commit credentials, fabricate results, or skip the status updates that future work depends on.

## Run commands

- `npm.cmd run dev` starts the synthetic demo hub locally after building it.
- `npm.cmd run build:web` compiles the server and browser demo code.
- `npm.cmd run start` starts the already-built demo server.
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run check`

## Local URL

- `http://127.0.0.1:4173/`

## Demo note

The demo hub only shows synthetic messages, synthetic evidence, and stored evaluation summaries. It never connects to real Facebook, Instagram, TikTok, or email accounts, and every customer-facing response remains approval-gated.

## Limitations

- No live integrations.
- No persistence beyond the demo session.
- No production deployment.
- No real customer data.

## Security and privacy

The repo is designed to stay synthetic and auditable. The `.gitignore` excludes `node_modules`, `dist`, and local environment files, and the trace guide requires redaction of secrets and personal data.
