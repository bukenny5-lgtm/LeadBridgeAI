# Phase 3 Verified Tools Summary

## Objective

Recover and verify the existing partial Phase 3 implementation without a broad rewrite, keep the frozen Phase 2 baseline intact, and finish the verified-tool evaluation, trajectories, and documentation.

## Files created

- `src/data/fixtures.ts`
- `src/tools/verified-tools.ts`
- `src/workflow/tool-assisted.ts`
- `src/evaluation/run-tools.ts`
- `src/evaluation/tool-report.ts`
- `src/validation/validate-data.ts`
- `tests/phase3.test.ts`
- `data/business.json`
- `data/products.json`
- `data/inventory.json`
- `data/delivery-policies.json`
- `data/negotiation-policies.json`
- `data/post-product-mappings.json`
- `evaluation/results/tool-assisted.json`
- `evaluation/results/tool-assisted.md`
- `traces/runtime-agent/tool-assisted/01-price-inquiry.md`
- `traces/runtime-agent/tool-assisted/02-product-image-request.md`
- `traces/runtime-agent/tool-assisted/03-delivery-question.md`
- `traces/runtime-agent/tool-assisted/04-in-policy-negotiation.md`
- `traces/runtime-agent/tool-assisted/05-below-minimum-negotiation.md`
- `traces/runtime-agent/tool-assisted/06-confirmed-order-missing-fields.md`
- `traces/runtime-agent/tool-assisted/07-prompt-injection.md`
- `traces/runtime-agent/tool-assisted/08-failure-case.md`
- `traces/runtime-agent/tool-assisted/09-unavailable-variant.md`

## Zod installation timeouts

Two `npm install` attempts for `zod` timed out in this workspace. No partial `zod` dependency was left behind, and no source file imports `zod`.

## Self-contained validation fallback

The implementation uses the self-contained TypeScript validation layer in `src/validation/validate-data.ts` and `src/data/fixtures.ts` instead of adding a new runtime schema package.

## TypeScript errors and repairs

- `npm test` initially failed because `searchCatalogue("blue")` was not treated as ambiguous and the multi-message delivery negotiation case was being captured too early.
- Repaired `searchCatalogue` to treat single-token searches conservatively when multiple products match.
- Repaired order-capture precedence so purchase memory does not override negotiation or delivery requests.
- Repaired percentage parsing so normalized `10% off` wording still counts as negotiation.
- Broadened variant detection so `red` and other common color names route as variant requests.
- Restored pricing precedence ahead of variant-only handling so the first price inquiry still lands on `pricing_request`.

## Compaction 404 interruption

The prior session ended with an automatic context-compaction HTTP 404 while `npm test` was running. This recovery pass continued from the partial worktree instead of recreating Phase 3 from scratch.

## Resumed verification

- `npm run typecheck` passed.
- `npm test` passed after the generalization fixes.
- `npm run validate:data` initially failed because generated build artifacts and report files were read-only in this snapshot. ACLs on the generated outputs were corrected, then validation passed.
- `npm run evaluate:baseline` initially failed for the same write-permission reason, then passed after the baseline report files were made writable.
- `npm run evaluate:tools` initially failed on missing or unwritable tool-assisted output files, then passed after the output and trace files were created and granted write access.
- `npm run check` passed at the end of the recovery pass.

## Commands and exact outcomes

- `npm run typecheck` -> pass
- `npm test` -> initial fail, final pass
- `npm run validate:data` -> initial fail, final pass
- `npm run evaluate:baseline` -> initial fail, final pass
- `npm run evaluate:tools` -> initial fail, final pass
- `npm run check` -> pass

## Evaluation result

- Frozen baseline: 20.00% on 20 cases, 4 passing, 16 failing.
- Tool-assisted run: 60.00% on 20 cases, 12 passing, 8 failing.
- Comparison: +40.00 points, +200.00% relative change.

## Remaining risks

- The web app, runtime agent, live integrations, and production deployment are still not implemented.
- The tool-assisted workflow still fails on several evaluation cases, including pricing, location, purchase capture, and duplicate-inquiry scenarios.
- Generated output files may arrive read-only again in a fresh checkout and need their write access restored before rerunning the evaluators.
- Future model-driven orchestration still needs to be designed on top of the verified tool layer.
