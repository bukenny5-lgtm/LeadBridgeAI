# Architecture

## Target shape

The future system will likely separate into three layers:

1. A user-facing web application for reviewing inquiries, drafts, and escalation states.
2. A runtime agent that interprets channel messages and applies workflow rules.
3. Support services for product, inventory, delivery, order capture, and trace recording.

## Verified tool layer

Phase 3 now implements a deterministic, read-only tool layer over synthetic fixtures. It covers product lookup, catalogue search, inventory checks, delivery options, negotiation policy checks, offer evaluation, missing-order-field detection, and evidence-aware traces.

The tool layer is intentionally separate from model-driven orchestration. It gives later agent work a reusable lower boundary that can be validated without live APIs, customer data, or hidden runtime dependencies.

## Phase 1 status

None of those layers are implemented yet. This document exists to record the intended separation early so later work can stay disciplined.

## Design principles

- Keep verification separate from response generation.
- Treat uncertain actions as human review candidates.
- Prefer synthetic evaluation hooks before any live dependencies.
- Make traces and decisions inspectable.
- Keep tool arguments sanitized and evidence-backed.
- Prefer self-contained validation when external schema packages are unavailable.

## Open questions

- What is the minimum trusted data model for product and stock verification?
- Which response actions should always require human approval?
- How much of the workflow should remain deterministic versus agent-assisted?
