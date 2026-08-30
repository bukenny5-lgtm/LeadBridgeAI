# Baseline Evaluation Report

- Evaluation version: 2.0.0
- Timestamp: 2026-08-29T18:34:26.403Z
- Baseline: Deterministic basic sales-inquiry automation
- Description: Rule-based baseline that classifies customer messages, drafts a generic reply, and respects the runnable-case privacy boundary.
- Exact command: `npm run evaluate:baseline`
- Case count: 20
- Primary metric: Correctly Handled Buying Opportunity Rate = 20.00% (4/20)

## Secondary Metrics

- Intent accuracy: 60.00%
- Escalation accuracy: 60.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%

## Aggregate Counts

- Passing cases: 4
- Failing cases: 16
- Runtime: 52 ms
- Model/API cost: $0.00

## Environment

- Node: v24.15.0
- npm: 11.12.1
- TypeScript: 5.9.3
- Vitest: 3.2.7
- Platform: win32
- Arch: x64

## Per-Case Results

| Case | Pass | Failed Dimensions |
| --- | --- | --- |
| LB-001 | FAIL | product_association_or_clarification |
| LB-002 | FAIL | product_association_or_clarification |
| LB-003 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation |
| LB-004 | FAIL | product_association_or_clarification |
| LB-005 | FAIL | product_association_or_clarification |
| LB-006 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation |
| LB-007 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation |
| LB-008 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation, provisional_order_decision, order_fields |
| LB-009 | PASS | None |
| LB-010 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation, provisional_order_decision, order_fields |
| LB-011 | FAIL | product_association_or_clarification, order_fields |
| LB-012 | PASS | None |
| LB-013 | PASS | None |
| LB-014 | FAIL | product_association_or_clarification |
| LB-015 | FAIL | lead_non_lead_decision, product_association_or_clarification, lead_creation_decision |
| LB-016 | PASS | None |
| LB-017 | FAIL | product_association_or_clarification |
| LB-018 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation, lead_creation_decision |
| LB-019 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation, provisional_order_decision, order_fields |
| LB-020 | FAIL | intent_labels, product_association_or_clarification, correct_action_escalation, order_fields |
