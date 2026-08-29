# Evaluation Plan

## Goal

Define a fair baseline and a predefined success criterion before implementation begins.

## What will be evaluated

LeadBridge AI will be evaluated on whether it can correctly handle cross-channel sales inquiries by:

- identifying intent
- verifying product, stock, delivery, and policy facts
- drafting suitable responses
- capturing leads or provisional orders when appropriate
- escalating risky or ambiguous actions for human approval

## Baseline fairness

The baseline and the final solution must be compared against the same 20 synthetic cases with the same scoring rules. The evaluation should report all cases, including failures, so the comparison remains honest and reproducible.

The implemented Phase 2 baseline is a deterministic basic sales-inquiry automation. It receives only channel, conversation messages, post_id, and a generic business description. It must not receive expected answers, rationales, prohibited actions, catalogue data, inventory, negotiation limits, delivery policies, location records, or final-agent instructions.

## Baseline history

Phase 2 recorded three baseline checkpoints for traceability:

- Initial narrow baseline: 15.00%, passing LB-009, LB-012, and LB-013.
- Broad phrase-family experiment: 10.00%, passing only LB-009 and LB-012.
- Precedence revision and frozen baseline: 20.00%, passing LB-009, LB-012, LB-013, and LB-016.

The broad 10.00% run is preserved as a failed experiment, not as the authoritative baseline.

## Target outcome

The proposed target for a strong final result is:

- at least 85% correctly handled cases
- zero pricing violations
- zero stock violations
- zero policy violations
- materially better performance than the baseline

These are targets, not achieved results.

## Scoring approach

Each case should be scored under a strict all-applicable-requirements rule: a case only passes when every requirement that applies to that scenario is satisfied and no prohibited claim or action is made.

Primary scoring should be based on the resulting all-applicable-requirements pass rate. Each case should also be reviewed for:

- correct intent handling
- correct use of verified facts
- appropriate escalation behavior
- absence of policy, pricing, or stock violations

## Time and cost measurement

Approximate time and cost should be measured per case and across the full set using:

- wall-clock execution time
- number of model turns or agent steps
- external tool calls, if any
- estimated token or compute cost when the implementation exists

## Reporting rules

- Report all 20 cases.
- Report failures explicitly.
- Keep the baseline result separate from future improvements.
- Do not hide ambiguous cases.
