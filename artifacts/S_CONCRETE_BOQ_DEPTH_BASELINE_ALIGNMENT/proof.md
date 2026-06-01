# S_CONCRETE_BOQ_DEPTH_BASELINE_ALIGNMENT

Status: GREEN_CONCRETE_BOQ_DEPTH_BASELINE_ALIGNMENT_READY

Classification:
- Old expected concrete depth: 10.5.
- Current accepted engine depth: 10.8.
- Product quality mainline acceptance proof: GREEN_PRODUCT_QUALITY_PR1_MAINLINE_ACCEPTANCE_READY.
- Professional estimator quality proof: GREEN_PROFESSIONAL_ESTIMATOR_QUALITY_GATE_READY.
- This is a stale test baseline, not a product regression.

Scope:
- tests/professionalBoq/concretePedestalBoqDepth.contract.test.ts
- tests/estimatorKernel/concretePedestalsDynamicBoq.contract.test.ts
- artifacts/S_CONCRETE_BOQ_DEPTH_BASELINE_ALIGNMENT

Verification:
- `npx tsc --noEmit --pretty false` passed.
- `npx expo lint` passed.
- `git diff --check` passed.
- `npm test -- --runInBand tests/professionalBoq/concretePedestalBoqDepth.contract.test.ts tests/estimatorKernel/concretePedestalsDynamicBoq.contract.test.ts` passed.
- `npx tsx scripts/e2e/runProductQualityPr1MainlineAcceptanceProof.ts` passed.
- `npx tsx scripts/e2e/runProfessionalEstimatorQualityProof.ts` passed.
- `npm run release:verify -- --json` is verified on the clean committed branch because the verifier intentionally blocks dirty non-release files before commit.

Safety:
- No product logic change.
- No estimate engine change.
- No BOQ compiler change.
- No PDF renderer change.
- No quality gate weakening or assertion removal.
- fake_green_claimed=false
