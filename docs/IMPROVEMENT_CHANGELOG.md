# Improvement Changelog

## Phase 1

### Baseline planned

- Establish the documentation foundation.
- Define the evaluation plan before implementation.
- Create a synthetic 20-case dataset.
- Keep all results pending until an actual run exists.

### Foundation delivered

- Project brief recorded.
- Architecture placeholder recorded.
- Decision log initialized.
- Current status documented.
- Trace guide outlined.
- Reproduction guide skeleton created.

### Phase 1 audit repair

- Expanded the synthetic dataset to cover the required 20-case scenario set and structural fields.
- Aligned the status and evaluation docs with the deterministic baseline milestone, strict scoring language, and human-approval rule for customer-facing commitments.

### Approval boundary clarified

- Recorded the universal human-approval gate for all customer-facing responses before implementation.

### Phase 2 baseline chosen

- Replaced the earlier prompt-style baseline idea with a deterministic basic automation baseline that respects the runnable-case boundary.

### Phase 2 verified

- Implemented and verified the deterministic baseline and evaluation engine.
- Generated `evaluation/results/baseline.json` and `evaluation/results/baseline.md`.
- Recorded a 15.00% primary score on the 20-case synthetic set.

### Generic language coverage refinement

- Broadened the baseline matcher to use generic phrase families for paraphrased price, availability, purchase-intent, variant, media, delivery, location/contact, negotiation, complaint, spam, and injection language.
- Added paraphrase-based unit tests that avoid copying evaluation sentences.
- Refreshed the baseline report after the matcher update, resulting in a 10.00% primary score on the 20-case synthetic set.

### Precedence and suppression revision

- Reworked the deterministic baseline around general intent precedence and contextual suppression instead of independent keyword accumulation.
- Added paraphrase-based tests for spam, complaint, phone handoff, delivery cost, pickup location, prompt injection, multi-intent sales inquiries, explicit purchase quantity, and generic need language.
- Added a root `.gitignore` for generated output and local dependency directories.
- Refreshed the frozen baseline report after the precedence revision, resulting in a 20.00% primary score on the 20-case synthetic set.
- Preserved the earlier 15.00% and 10.00% checkpoints as historical baseline runs, including the failed broad-language experiment.

### Phase 3 verified-tool recovery

- Added a verified read-only tool layer over the synthetic fixtures for product, search, inventory, delivery, negotiation, and order-field checks.
- Chose a self-contained TypeScript validator after two `zod` installation timeouts in the workspace.
- Added tool-assisted evaluation output in `evaluation/results/tool-assisted.json` and `evaluation/results/tool-assisted.md`.
- Generated sanitized runtime-agent trajectories in `traces/runtime-agent/tool-assisted/` for price, media, delivery, in-policy negotiation, below-minimum negotiation, confirmed order capture, prompt injection, a failed evaluation case, and an unavailable-variant case.
- Regenerated the tool-assisted evaluation after precedence and variant-branch repairs, landing on a 60.00% primary score with 12 passing cases and 8 failing cases.
- Kept the frozen baseline unchanged at 20.00% and used it as the comparison point for the verified-tool pass.
- Resolved workspace ACL issues on generated output files so the evaluators could overwrite the reports in place.

### Phase 4 model-driven recovery

- Added explicit partial-run metadata to the model-driven report path so limited live runs are marked `partial_run: true` and `not_authoritative: true` instead of looking like full evaluations.
- Fixed the agent runner so importing `src/evaluation/run-agent.ts` no longer executes the CLI entrypoint as a side effect.
- Added a focused unit test for the run-scope metadata helper.
- Regenerated the mock agent report after the import-guard fix.
- Completed a one-case Luna live recheck for LB-001 with `LIVE_EVAL_CONFIRM=YES` and `NODE_OPTIONS=--use-system-ca`, producing `evaluation/results/agent-luna.json` and `evaluation/results/agent-luna.md`.
- The one-case live result stayed partial and non-authoritative, with a 0.00% primary score on the single case and a total API cost of $0.0007.

### Phase 4 v2 contract isolation and local recovery

- Resumed the agent recovery from a context-compaction interruption and kept the strict prompt/schema contract isolated at the agent boundary instead of propagating it through the frozen baseline and tool-assisted workflows.
- Repaired the interrupted structured-output test by making the mock trajectory emit the exact evidence refs that the repaired output cites, including a valid policy lookup argument.
- Preserved the frozen baseline at 20.00% and the verified-tool pass at 60.00% while regenerating their reports with fresh timestamps.
- Ran the full local verification sequence successfully: `typecheck`, `test`, `evaluate:baseline`, `evaluate:tools`, `evaluate:agent:mock`, and `check`.
- Recorded the mock agent v2 report in `evaluation/results/agent-mock.json` with `prompt_version: sales-agent-v2` and traces under `traces/runtime-agent/model-driven/mock/mock-v2/`.
- Kept the historical v1 live artifacts intact and did not make a v2 live API call.

### Phase 4 LB-001 contract repair

- Diagnosed the LB-001 recovery failure as a contract and orchestration issue rather than a scorer problem: the repeated identical `getNegotiationPolicy` call triggered a fallback path that leaked a generic intent label and inferred order fields for a plain price inquiry.
- Narrowed order-field extraction so only provisional-order or order-capture actions populate extracted fields.
- Removed the generic fallback intent label from the safe fallback path so verified-price cases do not inherit `buying_opportunity`.
- Changed repeated identical tool-call handling to finalize with the evidence already gathered instead of escalating a recoverable verified-price inquiry.
- Added a paraphrase-based regression test for a generic verified-price inquiry that uses different wording from the evaluation case.
- Reran the one-case Luna recheck after the repair; LB-001 now passes with a 100.00% one-case score, while the report remains explicitly partial and non-authoritative.

### Phase 4 five-case Luna audit

- Continued the recovery analysis after the repaired one-case pass and validated the limit-5 live artifact naming and metadata.
- Preserved the one-case report in `evaluation/results/agent-luna-limit-1.json` and wrote the five-case partial report to `evaluation/results/agent-luna-limit-5.json`.
- Recorded the current mock report under `evaluation/results/agent-mock.json`, which is the corrected stem for the mock run output.
- Verified that the five-case Luna audit completed exactly five cases on `gpt-5.6-luna`, scored 0.00% on LB-001 through LB-005, and spent $0.00478054 in API cost.
- Classified the failures as ordinary model misses rather than structural defects: LB-001 and LB-003 were intent-label drift, LB-002 and LB-005 overexpanded into grounded-factual/order/policy failures, and LB-004 mis-handled product association and escalation.
- Confirmed no generalizable repair was needed after the five-case audit, so the twenty-case Luna gate remains not ready.
- Kept the report files partial and non-authoritative so they cannot be mistaken for a completed 20-case run.

### Phase 4 five-case v2 Luna live evaluation

- Executed exactly one five-case live evaluation with `gpt-5.6-luna` and `sales-agent-v2`.
- Wrote `evaluation/results/agent-luna-v2-limit-5.json` and `evaluation/results/agent-luna-v2-limit-5.md`, with traces under `traces/runtime-agent/model-driven/live/luna-v2/`.
- Recorded a 0.00% primary score on LB-001 through LB-005, with all five cases still requiring human approval and remaining partial/non-authoritative.
- Kept safety and policy violations at zero and left order fields null for the non-order inquiries.
- Preserved the v1 live artifacts and avoided overwriting the earlier limit-1 and limit-5 Luna reports.
- The v2 live run was structurally valid but materially worse than the 60.00% tool-assisted workflow, so the twenty-case Luna gate is still not approved and a bounded Terra comparison is the better next comparison.

### Phase 4 hybrid deterministic-policy boundary

- Added `src/agent/policy.ts` as a deterministic boundary that receives a model proposal, evidence bundle, claim ledger, and policy overrides before producing the final prediction.
- Updated the agent runner so model proposals and policy decisions are both preserved in traces and reports.
- Added the hybrid prompt `prompts/sales-agent-hybrid-v1.md` and a dedicated hybrid policy test file.
- Added the hybrid mock evaluation script `npm run evaluate:agent:hybrid:mock`.
- Regenerated the mock v2 report at `evaluation/results/agent-mock.json`, which now scores 40.00% after policy enforcement.
- Diagnosed the identical 40.00% mock and hybrid outputs as an authority-boundary bug: both commands were still model-led at the execution boundary, so the verified-tools workflow was not anchored before the policy merge.
- Repaired the hybrid run so the verified-tools prediction is carried into policy as the default authority for protected operational fields, and rejected or unsupported proposal changes cannot degrade that backbone.
- Regenerated the hybrid mock report at `evaluation/results/agent-hybrid-mock.json`, which now scores 60.00%.
- Wrote hybrid mock trajectories under `traces/runtime-agent/model-driven/mock/hybrid-v1/` with the execution mode and verified-tools backbone recorded in the report path.
- Kept the frozen baseline at 20.00% and the verified-tool pass at 60.00%, and stopped Phase 4 after the hybrid repair matched the verified-tools floor.
- Verified locally with `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run evaluate:baseline`, `npm.cmd run evaluate:tools`, `npm.cmd run evaluate:agent:mock`, `npm.cmd run evaluate:agent:hybrid:mock`, and `npm.cmd run check`.
- No live API call was made during this local hybrid boundary work.

## Future entries

Future iterations should add:

- implementation notes
- measured outcomes
- regressions
- fixes
- lessons learned

Do not fabricate experiments, scores, or conclusions.
