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

## Future entries

Future iterations should add:

- implementation notes
- measured outcomes
- regressions
- fixes
- lessons learned

Do not fabricate experiments, scores, or conclusions.
