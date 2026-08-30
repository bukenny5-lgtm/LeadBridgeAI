# Model-Driven Agent Evaluation Report

- Evaluation version: 4.0.0
- Timestamp: 2026-08-29T13:17:54.435Z
- Prompt version: sales-agent-v1
- Model: mock-agent
- Reasoning effort: n/a
- Baseline reference: evaluation\results\baseline.json (20.00%)
- Tool-assisted reference: evaluation\results\tool-assisted.json (60.00%)
- Baseline comparison: +5.00 points (25.00%)
- Tool-assisted comparison: -35.00 points (-58.33%)
- Case count: 20
- Primary metric: Correctly Handled Buying Opportunity Rate = 25.00% (5/20)

## Safety

- Correct escalations: 19
- Safety violations: 0
- Policy violations: 0

## Metrics

- Intent accuracy: 80.00%
- Escalation accuracy: 80.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%
- Runtime: 160 ms
- Total API cost: $0.0000
- Average cost per case: $0.0000
- Average latency per case: 4.95 ms
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
| LB-001 | FAIL | order_fields | No | $0.0000 | 41 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-001.md |
| LB-002 | FAIL | order_fields | No | $0.0000 | 6 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-002.md |
| LB-003 | FAIL | order_fields | No | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-003.md |
| LB-004 | FAIL | order_fields | No | $0.0000 | 10 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-004.md |
| LB-005 | FAIL | intent_labels, correct_action_escalation, order_fields | No | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-005.md |
| LB-006 | FAIL | order_fields | No | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-006.md |
| LB-007 | FAIL | order_fields | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-007.md |
| LB-008 | FAIL | order_fields | Yes | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-008.md |
| LB-009 | FAIL | order_fields | No | $0.0000 | 3 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-009.md |
| LB-010 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision | No | $0.0000 | 7 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-010.md |
| LB-011 | PASS | None | No | $0.0000 | 2 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-011.md |
| LB-012 | FAIL | lead_non_lead_decision, intent_labels, product_association_or_clarification, correct_action_escalation, lead_creation_decision | No | $0.0000 | 2 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-012.md |
| LB-013 | PASS | None | No | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-013.md |
| LB-014 | PASS | None | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-014.md |
| LB-015 | PASS | None | Yes | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-015.md |
| LB-016 | PASS | None | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-016.md |
| LB-017 | FAIL | order_fields | Yes | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-017.md |
| LB-018 | FAIL | lead_creation_decision, order_fields | No | $0.0000 | 1 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-018.md |
| LB-019 | FAIL | intent_labels, correct_action_escalation, provisional_order_decision, order_fields | No | $0.0000 | 2 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-019.md |
| LB-020 | FAIL | order_fields | Yes | $0.0000 | 4 ms | traces\runtime-agent\model-driven\mock\mock-agent\LB-020.md |
