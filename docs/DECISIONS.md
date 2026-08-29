# Decisions

## Recorded decisions

### D-001: Start with documentation and evaluation foundations only

Status: Accepted

The first phase will not include web app implementation, runtime agent implementation, API integrations, or an evaluation runner.

### D-002: Use synthetic evaluation data

Status: Accepted

All evaluation cases in Phase 1 will be synthetic and will not include real customer data, credentials, or live platform access.

### D-003: Keep uncertainty visible

Status: Accepted

Any action that is consequential, ambiguous, or policy-sensitive must be represented as a human review or escalation candidate in the future workflow.

### D-004: Preserve traceability

Status: Accepted

Future work should keep coding-agent and runtime-agent traces readable, structured, and redacted.

### D-005: Require human approval for customer-facing commitments

Status: Accepted

For the hackathon version, every customer-facing response must be approved by a human before it is sent, even when all facts and policies have been verified. Ordinary verified responses go to the normal approval queue.

Escalation is separate from approval. Responses must be escalated for specialized human review when the case is ambiguous, unsupported, out of policy, low confidence, or otherwise consequential, including price, stock, delivery, discounts, refunds, order capture, and call-back requests.

### D-006: Use a deterministic basic-automation baseline

Status: Accepted

The implemented Phase 2 baseline replaces the earlier prompt-style idea with a deterministic basic sales-inquiry automation. It must use only the allowed runnable inputs, remain fully reproducible without an API key, and serve as the stable lower bound for later agent comparisons.

### D-007: Use self-contained validation after zod installation timeouts

Status: Accepted

Phase 3 attempted to install `zod` twice, but both installs timed out in this workspace. The implementation therefore uses a self-contained TypeScript validation layer over the synthetic fixtures instead of a new runtime schema dependency.

### D-008: Add a verified tool layer before model-driven orchestration

Status: Accepted

Phase 3 introduces a deterministic, read-only tool layer over synthetic fixtures for product, inventory, delivery, and negotiation checks. The layer is designed as a reusable lower boundary for later model-driven agent orchestration and keeps tool arguments, evidence, and trace output sanitized.

## Pending decisions

- Final product and inventory data source design.
- Response drafting policy details.
- Human approval thresholds.
- Evaluation scoring calibration.
