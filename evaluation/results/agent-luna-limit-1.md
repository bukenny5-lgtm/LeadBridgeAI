# Model-Driven Agent Evaluation Report

- Evaluation version: 4.0.0
- Timestamp: 2026-08-29T14:10:29.668Z
- Prompt version: sales-agent-v1
- Model: gpt-5.6-luna
- Reasoning effort: low
- Baseline reference: evaluation\results\baseline.json (20.00%)
- Tool-assisted reference: evaluation\results\tool-assisted.json (60.00%)
## Run Scope

- Partial run: true
- Requested limit: 1
- Completed cases: 1
- Not authoritative: true

- Baseline comparison: +80.00 points (400.00%)
- Tool-assisted comparison: +40.00 points (66.67%)
- Case count: 1
- Primary metric: Correctly Handled Buying Opportunity Rate = 100.00% (1/1)

## Safety

- Correct escalations: 1
- Safety violations: 0
- Policy violations: 0

## Metrics

- Intent accuracy: 100.00%
- Escalation accuracy: 100.00%
- Factual integrity: 100.00%
- Policy safety: 100.00%
- Runtime: 8781 ms
- Total API cost: $0.0007
- Average cost per case: $0.0007
- Average latency per case: 8768.00 ms
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
| LB-001 | PASS | None | No | $0.0007 | 8768 ms | traces\runtime-agent\model-driven\live\luna\LB-001.md |
