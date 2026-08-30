# Current Status

## Phase

Phase 4 hybrid deterministic-policy recovery, repaired and locally verified with a recovered five-case audit, v2 mock run, and a hybrid mock run that now restores the verified-tools backbone to the 60.00% floor.

## What exists now

- Project brief
- Architecture notes
- Decision log
- Evaluation plan
- Improvement changelog
- Reproduction guide skeleton
- Hot take hypothesis
- Trace guide
- Synthetic evaluation dataset
- Deterministic baseline scaffold
- Evaluation loader, scorer, and report generation scaffold
- Baseline reports in `evaluation/results/`
- Verified tool layer backed by synthetic fixtures
- Tool-assisted evaluation report in `evaluation/results/`
- Sanitized runtime-agent trajectory set in `traces/runtime-agent/tool-assisted/`
- Model-driven agent scaffolding and live-report generation for partial runs
- Deterministic policy module around the model-driven boundary
- Hybrid prompt, policy test coverage, and hybrid mock report generation
- One-case Luna recovery report in `evaluation/results/agent-luna-limit-1.json`
- Five-case Luna audit report in `evaluation/results/agent-luna-limit-5.json`
- One-case Luna LB-001 recheck now passes after the repeated-tool and order-field contract repair
- Mock agent v2 report now written to `evaluation/results/agent-mock.json`
- Mock agent v2 traces now written under `traces/runtime-agent/model-driven/mock/mock-v2/`
- Hybrid mock report now written to `evaluation/results/agent-hybrid-mock.json`
- Hybrid mock traces now written under `traces/runtime-agent/model-driven/mock/hybrid-v1/`
- Five-case Luna v2 live report now written to `evaluation/results/agent-luna-v2-limit-5.json`
- Five-case Luna v2 live traces now written under `traces/runtime-agent/model-driven/live/luna-v2/`

## What does not exist yet

- Application source code
- Runtime agent
- Live integrations
- Production traces

## Status summary

The Phase 2 deterministic baseline remains the authoritative baseline at 20.00% on the 20-case synthetic set. Phase 3 added the verified tool layer, sanitized trajectories, and a tool-assisted evaluation pass that scored 60.00% on the same 20 cases.

Phase 4 recovered the model-driven agent path, added explicit partial-run metadata to live reports, and completed a one-case Luna recheck for LB-001 plus a five-case Luna audit. The first recovery pass failed LB-001, and the repair pass now clears it by keeping verified-price inquiries on the scorer-compatible intent and order-field contract.

Phase 4 also added a deterministic policy boundary around the model-driven agent so the model proposes language and tool use while policy decides lead creation, approval routing, claim permission, and final rendering. The hybrid mock path is now locally verified at 60.00% after the verified-tools backbone repair.

The strict agent-v2 contract is now isolated at the agent boundary, with the frozen baseline and verified-tool workflows left unchanged in score.

The local verification sequence passed `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run evaluate:baseline`, `npm.cmd run evaluate:tools`, `npm.cmd run evaluate:agent:mock`, `npm.cmd run evaluate:agent:hybrid:mock`, and `npm.cmd run check`.

The v2 mock report is `evaluation/results/agent-mock.json`, uses `prompt_version: sales-agent-v2`, and writes traces under `traces/runtime-agent/model-driven/mock/mock-v2/`. It now scores 40.00% after policy enforcement.

The hybrid mock report is `evaluation/results/agent-hybrid-mock.json`, uses `prompt_version: sales-agent-hybrid-v1`, and writes traces under `traces/runtime-agent/model-driven/mock/hybrid-v1/`. It now scores 60.00% after the verified-tools backbone repair.

The current one-case Luna report is intentionally marked `partial_run: true` and `not_authoritative: true` in `evaluation/results/agent-luna-limit-1.json`, even though the single case now passes.

The five-case Luna audit is also intentionally marked `partial_run: true` and `not_authoritative: true` in `evaluation/results/agent-luna-limit-5.json`. It scored 0.00% on LB-001 through LB-005, with no structural repair needed because the failures were ordinary model judgment misses rather than tooling or reporting defects.

The five-case Luna v2 live report is `evaluation/results/agent-luna-v2-limit-5.json`, uses `prompt_version: sales-agent-v2`, and writes traces under `traces/runtime-agent/model-driven/live/luna-v2/`. It completed five cases on `gpt-5.6-luna`, stayed partial and non-authoritative, scored 0.00%, and spent $0.0084 in API cost. The run showed no structural, schema, or policy defects, but it is still materially below the 60.00% verified-tool workflow, so the twenty-case gate is not approved yet.

The authoritative frozen baseline result is still 20.00% on the 20-case synthetic set after the precedence-and-suppression revision, with reports written to `evaluation/results/baseline.json` and `evaluation/results/baseline.md`.

The verified-tool report remains 60.00% on the 20-case synthetic set, with reports written to `evaluation/results/tool-assisted.json` and `evaluation/results/tool-assisted.md`.

The historical v1 live artifacts remain preserved under `traces/runtime-agent/model-driven/live/luna/` and the partial live reports `evaluation/results/agent-luna-limit-1.*` and `evaluation/results/agent-luna-limit-5.*`, while the new v2 live artifacts live under `traces/runtime-agent/model-driven/live/luna-v2/` and `evaluation/results/agent-luna-v2-limit-5.*`.

The hybrid recovery now matches the verified-tool floor, so Phase 4 should stop here and the submitted core should be verified-tools rather than hybrid. The next product milestone is the demonstration web hub, not further agent tuning.
