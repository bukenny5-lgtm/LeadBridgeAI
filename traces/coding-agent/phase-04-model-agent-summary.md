# Phase 4 Model Agent Summary

## Recovery Context

- The preceding recovery note described an interruption caused by a context-compaction HTTP 404 while the model-driven agent work was mid-stream.
- That note also reported earlier Responses API contract repairs, including a temporary `NODE_OPTIONS=--use-system-ca` workaround, reasoning-effort payload correction, structured-output schema corrections, strict function-tool schema corrections, and removal of `previous_response_id` after a non-stored continuation failure.
- This pass continued from the existing dirty worktree on `main` and did not recreate the agent from scratch.
- The report stem was corrected so the recovered partial live outputs are stored under `evaluation/results/agent-luna-limit-1.json`, `evaluation/results/agent-luna-limit-5.json`, and `evaluation/results/agent-mock.json` instead of being conflated with a full 20-case Luna report.
- The strict v2 contract was kept at the agent boundary so the frozen baseline and tool-assisted workflows did not need contract-propagation edits.

## Verified Repairs

- Added explicit partial-run metadata to the model-driven report path.
- Marked limited runs as `partial_run: true` and `not_authoritative: true`.
- Fixed `src/evaluation/run-agent.ts` so importing it no longer executes the CLI entrypoint as a side effect.
- Added a focused unit test for the run-scope metadata helper.
- Repaired the interrupted structured-output test by using the exact mock tool evidence refs emitted by the trajectory, including a valid policy lookup argument.
- Kept specialized fallback paths grounded in a real escalation reason.

## Verification

- `npm.cmd run typecheck` passed.
- `npm.cmd test` passed.
- `npm.cmd run evaluate:baseline` confirmed 20.00%.
- `npm.cmd run evaluate:tools` confirmed 60.00%.
- `npm.cmd run evaluate:agent:mock` passed after the import-guard fix and wrote the v2 mock report.
- `npm.cmd run check` passed.

## One-Case Live Recheck

- Command: `LIVE_EVAL_CONFIRM=YES`, `NODE_OPTIONS=--use-system-ca`, `npm.cmd run evaluate:agent:live -- --limit 1`.
- Case run: `LB-001`.
- Request completed without transport, API, or schema errors.
- Model: `gpt-5.6-luna`.
- Outcome: 0.00% primary score on the single case.
- Failed dimensions: `intent_labels`, `correct_action_escalation`, `order_fields`.
- Approval required: `true`.
- Approval queue: `specialized`.
- Escalation required: `true`.
- Escalation reason: `Repeated identical tool call rejected: getNegotiationPolicy`.
- Tools requested and executed: `findProductByPost`, `getNegotiationPolicy` (invalid/rejected), `getProduct`.
- Tool results were grounded in synthetic evidence refs.
- Response draft was safe and did not expose secrets, expected answers, or internal policy values.
- Prediction versus expected: the live run added `buying_opportunity` to the intent labels, escalated, and produced `quantity` and `variant` order fields where the expected result required no order fields.

## Usage And Cost

- Input tokens: 7789
- Cached input tokens: 6192
- Output tokens: 213
- Reasoning tokens: 93
- Total tokens: 8002
- API cost: `$0.00069884`
- Runtime: `16189 ms`
- Retries: `0`

## Report Status

- The live report is now explicitly marked `partial_run: true`.
- `requested_limit` is `1`.
- `completed_cases` is `1`.
- `not_authoritative` is `true`.

## LB-001 Repair Pass

- The initial one-case recovery run failed LB-001 because a repeated identical `getNegotiationPolicy` tool call triggered the safe-fallback path, which then leaked a generic fallback intent and order fields into the scorer-facing prediction.
- The repair narrowed order-field extraction to actual order-capture actions, removed the generic fallback intent label, and treated repeated identical tool calls as a recoverable stopping point instead of forcing a human-review fallback.
- The repaired one-case live recheck passed LB-001.
- Case: `LB-001`.
- Model: `gpt-5.6-luna`.
- Primary score: `100.00%` on the single case.
- Failed dimensions: none.
- Approval required: `true`.
- Approval queue: `normal`.
- Escalation required: `false`.
- Tools requested and executed: `findProductByPost`, `getNegotiationPolicy` (invalid/rejected), `getProduct`.
- Tool evidence remained grounded in synthetic refs.
- Response draft stayed safe and did not expose secrets, expected answers, or confidential pricing values.
- Input tokens: `7786`.
- Cached input tokens: `6192`.
- Output tokens: `213`.
- Reasoning tokens: `93`.
- Total tokens: `7999`.
- API cost: `$0.00069824`.
- Runtime: `8768 ms`.
- Retries: `0`.

## Local v2 Mock

- `npm.cmd run evaluate:agent:mock` wrote `evaluation/results/agent-mock.json` and `evaluation/results/agent-mock.md`.
- Prompt version: `sales-agent-v2`.
- Trace directory: `traces/runtime-agent/model-driven/mock/mock-v2/`.
- Primary score: `60.00%`.
- The mock run stayed fully local and did not make a live API call.
- Historical v1 live artifacts remain preserved in `evaluation/results/agent-luna-limit-1.*`, `evaluation/results/agent-luna-limit-5.*`, and `traces/runtime-agent/model-driven/live/luna/`.

## Five-Case Live Audit

- Command: `npm.cmd run evaluate:agent:live -- --limit 5`.
- Cases run: `LB-001` through `LB-005`.
- Request completed without transport, API, or schema errors.
- Model: `gpt-5.6-luna`.
- Outcome: 0.00% primary score on the five cases.
- Passing cases: none.
- Failing cases: `LB-001`, `LB-002`, `LB-003`, `LB-004`, `LB-005`.
- Classification:
  - `LB-001`: genuine model judgment miss on intent-label selection.
  - `LB-002`: genuine model judgment miss that also overreached into grounded factual behavior, escalation, order fields, and policy safety.
  - `LB-003`: genuine model judgment miss on intent-label selection.
  - `LB-004`: genuine model judgment miss on product association and escalation.
  - `LB-005`: genuine model judgment miss that also overreached into grounded factual behavior, escalation, order fields, and policy safety.
- No structural, schema, or orchestration repair was required after the five-case audit.
- Approval remained required for all five outputs.
- All outputs stayed unsent and unfinalized.
- Tool evidence remained grounded in synthetic refs for each case.
- Total API cost: `$0.00478054`.
- Runtime: `50195 ms`.
- Retries: `0`.
- The five-case report is intentionally marked `partial_run: true` and `not_authoritative: true`.
- The twenty-case Luna gate is not ready yet.

## Five-Case V2 Live Audit

- Command: `LIVE_EVAL_CONFIRM=YES`, `NODE_OPTIONS=--use-system-ca`, `OPENAI_MODEL=gpt-5.6-luna`, `npm.cmd run evaluate:agent:live -- --limit 5 --prompt-version v2`.
- Cases run: `LB-001` through `LB-005`.
- Request completed without transport, API, or schema errors.
- Model: `gpt-5.6-luna`.
- Prompt version: `sales-agent-v2`.
- Outcome: 0.00% primary score on the five cases.
- Passing cases: none.
- Failing cases: `LB-001`, `LB-002`, `LB-003`, `LB-004`, `LB-005`.
- Classification:
  - `LB-001`: genuine model judgment miss on intent-label selection and verified-price grounding.
  - `LB-002`: genuine model judgment miss that also overreached into grounded factual behavior, escalation, and delivery validation.
  - `LB-003`: genuine model judgment miss on image-request intent handling.
  - `LB-004`: genuine model judgment miss on business-location handling and product association.
  - `LB-005`: genuine model judgment miss that also overreached into grounded factual behavior, escalation, and delivery validation.
- Approval remained required for all five outputs.
- All outputs stayed unsent and unfinalized.
- Tool evidence remained grounded in synthetic refs for each case.
- No structural, schema, or orchestration repair was required after the live v2 audit.
- Total API cost: `$0.0084`.
- Runtime: `78503 ms`.
- Retries: `0`.
- The five-case v2 report is intentionally marked `partial_run: true` and `not_authoritative: true`.
- The twenty-case Luna gate is still not ready, and the bounded next comparison is Terra rather than further Luna tuning.

## Hybrid Deterministic-Policy Boundary

- Added `src/agent/policy.ts` as the deterministic boundary around model proposals.
- The model now proposes intents, actions, and draft wording, while policy decides lead creation, approval routing, escalation, claim permission, order capture, and final rendering.
- Preserved the model proposal, evidence bundle, claim ledger, policy overrides, and final prediction in traces and reports.
- Added `prompts/sales-agent-hybrid-v1.md` and `tests/hybrid-policy.test.ts`.
- Added `npm run evaluate:agent:hybrid:mock`.
- `npm.cmd run evaluate:agent:mock` now writes `evaluation/results/agent-mock.json` at 40.00%.
- The initial 40.00% hybrid result matched the mock path because the runner was still model-led at the boundary and did not anchor a verified-tools backbone before policy merge.
- Repaired the hybrid runner so it carries `verified_tools_prediction` and `execution_mode` into the trace and report path, and rejected or unsupported proposals can no longer degrade the verified-tools decision.
- `npm.cmd run evaluate:agent:hybrid:mock` now writes `evaluation/results/agent-hybrid-mock.json` at 60.00%.
- Hybrid mock traces are written under `traces/runtime-agent/model-driven/mock/hybrid-v1/`.
- Phase 4 should stop here and submit verified-tools as the core workflow rather than hybrid.
- Verified locally with `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run evaluate:baseline`, `npm.cmd run evaluate:tools`, `npm.cmd run evaluate:agent:mock`, `npm.cmd run evaluate:agent:hybrid:mock`, and `npm.cmd run check`.
- No live API call was made during the hybrid boundary work.
