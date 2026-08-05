# T8-FINAL-R5 initial Full Jest failure ledger

- Status: `NOT_GREEN_INITIAL_TERMINAL_RED_CAPTURED`
- Source SHA: `a117116b42ff6aca597e7b2e332c88180deb0157`
- Candidate hash: `e8fad7fd80ef75a10ae7e222f61e86d64b7ce024a7c5306b38a81177d4b10f1d`
- Started: 2026-08-03T04:33:48.689Z
- Ended: 2026-08-03T14:15:57.927Z
- Duration: 34932846 ms
- Exit code: 1
- Suites: 5122 passed, 43 failed, 0 skipped, 5165 total
- Tests: 11051 passed, 57 failed, 0 skipped, 0 todo, 11108 total
- OOM/crash/interrupted: false/false/false
- Force-exit warning: true
- Content SHA-256: `39d26d6cf2eda565d9e693e7dc713b9b5afdd6ccbf4a89a437d030110932a074`

## Root-cause clusters

| Cluster | Category | Suites | Assertions | Status | Canonical owner |
| --- | --- | ---: | ---: | --- | --- |
| ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP | INFRASTRUCTURE_EVIDENCE | 21 | 35 | OPEN | `scripts/release/runFrozenFullJest.ts` |
| STALE_REPLAY_AND_FINAL_READINESS_LINEAGE | EVIDENCE_LINEAGE | 17 | 17 | OPEN | `scripts/audit/runAiEstimateEnterpriseFinalReadinessGoNoGo.ts` |
| PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN | EVIDENCE_PREREQUISITE | 3 | 3 | OPEN | `scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout.ts` |
| FLATLIST_EXACT_INVENTORY_DRIFT | PRODUCTION_INVENTORY | 1 | 1 | OPEN | `src/components/estimate/ProfessionalEstimateComposer.tsx` |
| REAL10000_P0_REMEDIATION_INCOMPLETE | PRODUCT_EVIDENCE | 1 | 1 | OPEN | `scripts/audit/real10000AuditP0RemediationCore.ts` |

### ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP

The frozen full-Jest runner did not run a required-artifact preflight. Ignored prerequisite evidence was absent, while the older 153-suite remediation path only performed unversioned cross-worktree copying. Several RPC/realtime artifacts have consumers but no canonical source producer.

Proof: Direct ENOENT failures plus runFrozenFullJest.ts having no prerequisite stage; currentCoreRemediationEvidencePrerequisites.ts is imported only by runCurrentCoreRemediation153.ts.

### STALE_REPLAY_AND_FINAL_READINESS_LINEAGE

Final-readiness and scorecard consumers evaluated missing or stale historical matrices, including a blocked enterprise release-candidate matrix, instead of an exact-SHA immutable evidence set.

Proof: The terminal assertions report NO_GO/BLOCKED statuses and unsuperseded matrix paths; the ignored workspace matrices have mixed GREEN/BLOCKED lineage and no exact candidate SHA.

### PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN

The structured-pipeline closeout cannot validate its exact-material/live-visible-label prerequisite in a clean candidate.

Proof: All three consumers return the identical PREVIOUS_LIVE_VISIBLE_LABEL_PROOF_NOT_GREEN failure code.

### FLATLIST_EXACT_INVENTORY_DRIFT

A tuned production FlatList was added to ProfessionalEstimateComposer after the exact 61-instance lock, producing 62 instances (8 FlatList + 54 FlashList) with zero tuning violations.

Proof: Scanner output identifies src/components/estimate/ProfessionalEstimateComposer.tsx:358, added by 878fe431, as the new tuned instance; exact assertion received 62 instead of 61.

### REAL10000_P0_REMEDIATION_INCOMPLETE

The canonical Real10000 remediation audit still reports five P0 holes.

Proof: The terminal assertion expected after_p0_holes=0 and received 5.

## Failed suites and assertions

### tests/api/sRpc6HighRiskRpcValidation.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- S-RPC-6 high-risk RPC validation keeps S-RPC-6 artifacts valid

### tests/api/sRpc7MutationResultEnvelopes.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- S-RPC-7 mutation result envelopes keeps previous RPC waves closed and forbidden surfaces untouched
- S-RPC-7 mutation result envelopes keeps S-RPC-7 artifacts valid

### tests/architecture/aiEstimateFinalReadinessNoProductionRollout.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- AI estimate final readiness rollout boundary keeps final readiness as an audit gate without enabling production rollout

### tests/architecture/aiTraceObservabilityArchitecture.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- AI trace observability architecture keeps AI trace recording redacted, bounded, and provider-free

### tests/architecture/finalReadinessRequiresRollbackAndKillSwitch.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires rollback and kill switch readiness together

### tests/architecture/maxArchitectureScaleRiskAuditCurrentEvidence.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- max architecture scale risk audit current evidence uses fresh hardening-wave matrices and leaves only live-proof external P1 blockers

### tests/architecture/noGreenClaimWithoutReplayEvidence.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- no green claim without replay evidence requires replay runtime, full Jest, release verify, and fake-green=false for reconciliation green

### tests/architecture/noSilentHistoricalMatrixMutation.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- no silent historical matrix mutation keeps historical matrices as history and writes only superseding matrices

### tests/audit/final50kReadiness.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- final 50k readiness allows 9.2 readiness only when live RLS and 50k database proofs are present

### tests/audit/finalScorecardEvidence.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- final 50k 9.2 scorecard evidence uses hardening-wave evidence and requires live proof evidence for live gates

### tests/audit/greenClaimArtifactConsistency.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- green claim artifact consistency classifies stale historical matrices through replay supersession instead of hiding them

### tests/audit/releaseGuardUsesReplayLedger.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- release guard replay ledger policy keeps artifact reconciliation in release verify and blocks unsuperseded inconsistency

### tests/audit/replayVerifiedMatrices.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- replay verified matrices carry replay proof gates and do not fake green

### tests/canaryEvaluation/canaryEvaluationProofArtifacts.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- canary evaluation proof artifacts are present without rerunning prerequisite-sensitive proof

### tests/canaryEvaluation/evidenceLedgerRequiresAllArtifacts.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- canary evaluation evidence ledger requires every internal canary artifact

### tests/canaryEvaluation/manualEstimatorReviewThreshold.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- manual estimator review sample meets the 300 estimate threshold

### tests/constructionWorkOntology/catalogItemsUntouched.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- does not mutate catalog_items and uses it only as an FK target for optional links

### tests/constructionWorkOntology/catalogLinksNoFakeReferences.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- allows only real catalog_items references for optional work catalog links

### tests/constructionWorkOntology/noPromptLookup.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- does not add prompt lookup or hardcoded prompt answer tables

### tests/constructionWorkOntology/noSecondCatalog.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- does not create a second marketplace/product catalog

### tests/constructionWorkOntology/productNoRegression.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- keeps product UI, request, foreman, history, and PDF source-of-truth outside this migration

### tests/constructionWorkOntology/repositoryReadContracts.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- exposes read-only repository primitives without semantic search, OpenSearch, or LLM resolver behavior

### tests/constructionWorkOntology/rlsPolicies.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- enables RLS and keeps anonymous writes closed for every new table

### tests/constructionWorkOntology/standardsLicenseGuard.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- uses internal/custom classification codes and blocks unlicensed official CSI claims

### tests/constructionWorkOntology/workAliasesNormalization.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- normalizes construction work aliases without AI calls

### tests/constructionWorkOntology/workDefinitionsUniqueKeys.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- seeds 50 unique internal work keys across 10 domains with at least 5 works per domain

### tests/estimateStructuredPipeline/finalMatrix.contract.test.ts

Cluster: `PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN`

- structured estimate pipeline final matrix writes green closeout proof

### tests/estimateStructuredPipeline/previousBoqExactMaterialsGreenRequired.contract.test.ts

Cluster: `PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN`

- previous BOQ exact materials closeout prerequisite requires previous BOQ exact materials green and visible label proof artifact

### tests/finalReadiness/aiEstimateGoNoGoMatrix.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- AI estimate final readiness GO/NO-GO matrix aggregates all prerequisite green matrices into one internal-canary GO decision

### tests/finalReadiness/canaryDisabledByDefault.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- keeps internal canary disabled by default while proving readiness

### tests/finalReadiness/killSwitchRequired.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires AI estimate kill switches before final readiness GO

### tests/finalReadiness/liveWebJourneyRequired.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires live web journey proof before GO

### tests/finalReadiness/matrixLedgerRequiresAllPrerequisitesGreen.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires every prerequisite matrix to be green in the final readiness ledger

### tests/finalReadiness/observabilityRequired.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires observability before final readiness GO

### tests/finalReadiness/pdfFinalProofRequired.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires final PDF proof with readable structured output

### tests/finalReadiness/rollbackRequired.contract.test.ts

Cluster: `STALE_REPLAY_AND_FINAL_READINESS_LINEAGE`

- requires rollback readiness before final readiness GO

### tests/perf/flatListTuningRegressionScanner.contract.test.ts

Cluster: `FLATLIST_EXACT_INVENTORY_DRIFT`

- S_NIGHT_FLATLIST_22_TUNING_REGRESSION_SCANNER keeps the current runtime FlatList and FlashList inventory locked

### tests/real10000Audit/remediationRerunAuditP0Zero.contract.test.ts

Cluster: `REAL10000_P0_REMEDIATION_INCOMPLETE`

- Real10000 remediation reruns audit with zero P0 holes

### tests/realtime/realtimeFanoutBudgetProof.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- S-RT-6 realtime fanout budget proof recomputes the persistent mounted channel budget without regressing S-RT-5

### tests/release/closeoutReadOnly.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- closeout read-only contract does not dirty the worktree when the selected-work closeout verifier runs

### tests/releasePipeline/preflightCanonicalEvidenceImmutability.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- preflight canonical evidence immutability keeps canonical matrices byte-identical and writes completed run-scoped diagnostics

### tests/requestEstimate/estimateStructuredPipelineUiPdfBindingCloseout.contract.test.ts

Cluster: `PREVIOUS_BOQ_VISIBLE_LABEL_PROOF_NOT_GREEN`

- estimate structured pipeline UI/PDF binding closeout keeps request, marketplace, history, foreman AI, and PDF rows on the structured source of truth

### tests/selectedWorkEnterprise1000/selectedWorkEnterprise1000.contract.test.ts

Cluster: `ARTIFACT_PREFLIGHT_AND_PRODUCER_GAP`

- selected work enterprise visible 1000 acceptance contracts keeps the dataset out of product-search and pdf-action accounting
- selected work enterprise visible 1000 acceptance contracts covers at least 50 selected-work domains
- selected work enterprise visible 1000 acceptance contracts preserves required scenario quotas
- selected work enterprise visible 1000 acceptance contracts requires previous smart-search selected-work green
- selected work enterprise visible 1000 acceptance contracts keeps selected work as the source of truth for all cases
- selected work enterprise visible 1000 acceptance contracts parses quantity edge cases with explicit selected-work units
- selected work enterprise visible 1000 acceptance contracts builds exact BOQ materials for every selected work case
- selected work enterprise visible 1000 acceptance contracts does not expose generic visible labels or mojibake
- selected work enterprise visible 1000 acceptance contracts keeps control rows out of paid line items
- selected work enterprise visible 1000 acceptance contracts does not use English fallback labels
- selected work enterprise visible 1000 acceptance contracts keeps catalog labels visible and free of internal keys
- selected work enterprise visible 1000 acceptance contracts matches UI rows to PDF-ready rows
- selected work enterprise visible 1000 acceptance contracts matches request, history, and foreman payloads
- selected work enterprise visible 1000 acceptance contracts proves PDF-ready 1000 payloads and 250 actual PDFs
