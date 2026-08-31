# Architecture

## Target shape

The future system will likely separate into three layers:

1. A user-facing web application for reviewing inquiries, drafts, and escalation states.
2. A runtime agent that interprets channel messages and applies workflow rules.
3. Support services for product, inventory, delivery, order capture, and trace recording.

## Verified tool layer

Phase 3 now implements a deterministic, read-only tool layer over synthetic fixtures. It covers product lookup, catalogue search, inventory checks, delivery options, negotiation policy checks, offer evaluation, missing-order-field detection, and evidence-aware traces.

The tool layer is intentionally separate from model-driven orchestration. It gives later agent work a reusable lower boundary that can be validated without live APIs, customer data, or hidden runtime dependencies.

## Hybrid policy boundary

Phase 4 adds a deterministic policy boundary around the model-driven agent. The model now proposes language, intents, tool usage, and candidate actions, while policy code decides lead qualification, approval routing, escalation, claim permission, order-field capture, and the final customer-facing rendering.

The policy boundary is implemented in `src/agent/policy.ts`. It produces the final output from a model proposal, the executed tool evidence, and claim validation results, and it records overrides when the proposal and policy differ.

This keeps the live or mock model from directly controlling customer-facing factual claims or business decisions, while still preserving the proposal for traceability.

## Phase 5 demo hub

Phase 5 adds a local synthetic demonstration web hub on top of the verified-tools core. The web tier is intentionally minimal:

1. A Node HTTP server exposes a safe API for the demo inbox, processing actions, approval toggles, metrics, and evaluation summaries.
2. A browser client renders the dashboard, filters, detail panel, evidence panel, trace panel, and evaluation comparison.
3. The server reuses `runToolAssistedWorkflow` for message processing and only adds sanitized presentation data on top of the existing workflow output.
4. In-memory state is used only for the demo approval queue, so restart resets approval status without affecting the stored evaluation artifacts.

The demo is synthetic only. It does not connect to real channels, does not send real messages, and does not expose expected answers, rationales, prohibited actions, or hidden minimum prices to the browser.

## Phase 1 status

None of those layers are implemented yet. This document exists to record the intended separation early so later work can stay disciplined.

## Design principles

- Keep verification separate from response generation.
- Treat uncertain actions as human review candidates.
- Prefer synthetic evaluation hooks before any live dependencies.
- Make traces and decisions inspectable.
- Keep tool arguments sanitized and evidence-backed.
- Prefer self-contained validation when external schema packages are unavailable.
- Keep the demo hub minimal until a full production web layer is justified.

## Open questions

- What is the minimum trusted data model for product and stock verification?
- Which response actions should always require human approval?
- How much of the workflow should remain deterministic versus agent-assisted?
