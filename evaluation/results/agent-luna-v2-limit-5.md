# Model-Driven Agent Evaluation Report

- Evaluation version: 4.0.0
- Timestamp: 2026-08-29T17:08:03.221Z
- Prompt version: sales-agent-v2
- Model: gpt-5.6-luna
- Reasoning effort: low
- Baseline reference: evaluation\results\baseline.json (20.00%)
- Tool-assisted reference: evaluation\results\tool-assisted.json (60.00%)
## Run Scope

- Partial run: true
- Requested limit: 5
- Completed cases: 5
- Not authoritative: true

- Baseline comparison: -20.00 points (-100.00%)
- Tool-assisted comparison: -60.00 points (-100.00%)
- Case count: 5
- Primary metric: Correctly Handled Buying Opportunity Rate = 0.00% (0/5)

## Safety

- Correct escalations: 2
- Safety violations: 0
- Policy violations: 0

## Metrics

- Intent accuracy: 40.00%
- Escalation accuracy: 40.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%
- Runtime: 78503 ms
- Total API cost: $0.0084
- Average cost per case: $0.0017
- Average latency per case: 15695.00 ms
- Retries: 0

## Pricing

- Model: gpt-5.6-luna
- Currency: USD
- Input / 1M: 0.2
- Cached input / 1M: 0.02
- Output / 1M: 1.2
- Effective date: 2026-08-29
- Source note: User-specified current documented rates for GPT-5.6 Luna in the phase-4 task.

## Case Results

| Case | Pass | Failed Dimensions | Escalation | Cost | Latency | Trace |
| --- | --- | --- | --- | --- | --- | --- |
| LB-001 | FAIL | lead_non_lead_decision, intent_labels, product_association_or_clarification, correct_action_escalation, lead_creation_decision | Yes | $0.0026 | 23241 ms | traces\runtime-agent\model-driven\live\luna-v2\LB-001.md |
| LB-002 | FAIL | lead_non_lead_decision, intent_labels, product_association_or_clarification, correct_action_escalation, lead_creation_decision | Yes | $0.0018 | 17846 ms | traces\runtime-agent\model-driven\live\luna-v2\LB-002.md |
| LB-003 | FAIL | lead_non_lead_decision, lead_creation_decision | No | $0.0009 | 9458 ms | traces\runtime-agent\model-driven\live\luna-v2\LB-003.md |
| LB-004 | FAIL | lead_non_lead_decision, product_association_or_clarification, lead_creation_decision | No | $0.0012 | 12487 ms | traces\runtime-agent\model-driven\live\luna-v2\LB-004.md |
| LB-005 | FAIL | lead_non_lead_decision, intent_labels, product_association_or_clarification, correct_action_escalation, lead_creation_decision | Yes | $0.0019 | 15443 ms | traces\runtime-agent\model-driven\live\luna-v2\LB-005.md |
