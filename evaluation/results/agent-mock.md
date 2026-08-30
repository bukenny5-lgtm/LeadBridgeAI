# Model-Driven Agent Evaluation Report

- Evaluation version: 4.0.0
- Timestamp: 2026-08-30T05:08:45.729Z
- Prompt version: sales-agent-v2
- Model: mock-agent
- Reasoning effort: n/a
- Baseline reference: evaluation\results\baseline.json (20.00%)
- Tool-assisted reference: evaluation\results\tool-assisted.json (60.00%)
## Run Scope

- Partial run: false
- Requested limit: 20
- Completed cases: 20
- Not authoritative: false

- Baseline comparison: +20.00 points (100.00%)
- Tool-assisted comparison: -20.00 points (-33.33%)
- Case count: 20
- Primary metric: Correctly Handled Buying Opportunity Rate = 40.00% (8/20)

## Safety

- Correct escalations: 15
- Safety violations: 0
- Policy violations: 0

## Metrics

- Intent accuracy: 65.00%
- Escalation accuracy: 60.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%
- Runtime: 184 ms
- Total API cost: $0.0000
- Average cost per case: $0.0000
- Average latency per case: 6.50 ms
- Retries: 0

## Pricing

- Model: mock-agent
- Currency: USD
- Input / 1M: 0
- Cached input / 1M: 0
- Output / 1M: 0
- Effective date: n/a
- Source note: Model pricing unavailable; cost treated as an estimate of zero.

## Case Results

| Case | Pass | Failed Dimensions | Escalation | Cost | Latency | Trace |
| --- | --- | --- | --- | --- | --- | --- |
| LB-001 | PASS | None | No | $0.0000 | 43 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-001.md |
| LB-002 | PASS | None | No | $0.0000 | 9 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-002.md |
| LB-003 | PASS | None | No | $0.0000 | 6 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-003.md |
| LB-004 | FAIL | product_association_or_clarification | No | $0.0000 | 11 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-004.md |
| LB-005 | PASS | None | No | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-005.md |
| LB-006 | FAIL | intent_labels, correct_action_escalation | No | $0.0000 | 5 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-006.md |
| LB-007 | FAIL | intent_labels, correct_action_escalation | No | $0.0000 | 12 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-007.md |
| LB-008 | FAIL | correct_action_escalation | No | $0.0000 | 8 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-008.md |
| LB-009 | FAIL | product_association_or_clarification | No | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-009.md |
| LB-010 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision, order_fields | No | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-010.md |
| LB-011 | FAIL | intent_labels | No | $0.0000 | 5 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-011.md |
| LB-012 | FAIL | product_association_or_clarification | No | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-012.md |
| LB-013 | PASS | None | No | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-013.md |
| LB-014 | PASS | None | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-014.md |
| LB-015 | PASS | None | Yes | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-015.md |
| LB-016 | PASS | None | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-016.md |
| LB-017 | FAIL | correct_action_escalation | No | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-017.md |
| LB-018 | FAIL | intent_labels, correct_action_escalation, lead_creation_decision | No | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-018.md |
| LB-019 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision, order_fields | No | $0.0000 | 2 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-019.md |
| LB-020 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision, order_fields | No | $0.0000 | 5 ms | traces\runtime-agent\model-driven\mock\mock-v2\LB-020.md |
