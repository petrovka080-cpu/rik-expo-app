import path from "node:path";

import type {
  ReleaseChangeClass,
  ReleaseCheckAutomatically,
  ReleaseRuntimeVersionStrategy,
} from "../../src/shared/release/releaseInfo.types";
import type { AiMandatoryEmulatorRuntimeGatePolicy } from "./aiMandatoryEmulatorGateEvaluation";

export {
  AI_EMULATOR_GATE_HARDENING_MATRIX_ARTIFACT,
  AI_MANDATORY_EMULATOR_RUNTIME_GATE_MATRIX_ARTIFACT,
  AI_QA03_DUAL_PLATFORM_RUNTIME_TARGETABILITY_MATRIX_ARTIFACT,
  AI_QA04_FRESH_IOS_BUILD_SIGNOFF_MATRIX_ARTIFACT,
  evaluateAiMandatoryEmulatorRuntimeGate,
  isAiMandatoryEmulatorRuntimeGateRequiredPath,
} from "./aiMandatoryEmulatorGateEvaluation";
export type { AiMandatoryEmulatorRuntimeGatePolicy } from "./aiMandatoryEmulatorGateEvaluation";

export type ReleaseGuardMode = "preflight" | "verify" | "ota";

export type ReleaseGateName =
  | "tsc"
  | "expo-lint"
  | "architecture-anti-regression"
  | "ai-app-context-graph-deep-link-proof"
  | "ai-universal-role-qa-source-planner-proof"
  | "ai-live-screen-copilot-buttons-proof"
  | "enterprise-ai-architecture-guardrails"
  | "ai-verified-external-knowledge-proof"
  | "ai-role-mixed-150-real-answers-proof"
  | "ai-role-business-copilots-workflow-proof"
  | "media-photo-video-intelligence-proof"
  | "document-pdf-evidence-intelligence-proof"
  | "ai-domain-data-gateway-context-retrieval-proof"
  | "enterprise-ai-contract-runtime-invariant-proof"
  | "ai-safe-action-draft-approval-proof"
  | "ai-human-approval-ledger-execution-boundary-proof"
  | "global-estimate-professional-boq-proof"
  | "global-estimate-production-safe-proof"
  | "global-estimate-b2c-request-proof"
  | "global-estimate-pdf-marketplace-proof"
  | "global-estimate-localization-runtime-proof"
  | "global-estimate-data-ops-admin-governance-proof"
  | "global-estimate-data-ops-proof"
  | "global-estimate-data-ops-import-proof"
  | "global-estimate-data-ops-coverage-proof"
  | "ai-estimate-to-pdf-proof"
  | "live-ai-estimate-pdf-reality-proof"
  | "ai-estimate-core-completion-proof"
  | "global-estimate-template-ratebook-reconciliation-proof"
  | "ai-route-parity-proof"
  | "estimate-pdf-real-binary-proof"
  | "consumer-estimate-tab-pdf-proof"
  | "bottom-nav-estimate-marketplace-plus-proof"
  | "ai-estimate-pdf-open-runtime-proof"
  | "ai-estimate-pdf-safe-integration-proof"
  | "request-ai-estimate-boq-catalog-proof"
  | "request-ai-estimate-professional-boq-formula-proof"
  | "catalog-items-global-estimate-binding-proof"
  | "all-screens-enterprise-web-proof"
  | "all-screens-enterprise-android-emulator-proof"
  | "all-screens-pdf-open-proof"
  | "all-screens-bottom-nav-proof"
  | "all-screens-backend-boundary-proof"
  | "all-screens-role-ai-proof"
  | "all-screens-no-overlap-proof"
  | "enterprise-release-candidate-proof"
  | "enterprise-release-candidate-web-proof"
  | "enterprise-release-candidate-android-proof"
  | "enterprise-release-candidate-backend-proof"
  | "enterprise-release-candidate-ota-runtime-proof"
  | "enterprise-release-candidate-rollback-proof"
  | "enterprise-release-candidate-observability-proof"
  | "universal-qa-smoke-release-gate"
  | "universal-qa-smoke-maestro"
  | "ios-eas-update-native-impact-classifier"
  | "jest-run-in-band"
  | "50k-fixture-retention-cleanup-policy-proof"
  | "green-claim-artifact-reconciliation-proof"
  | "built-in-ai-live-acceptance-baseline-proof"
  | "built-in-ai-150-work-types-proof"
  | "built-in-ai-1000-work-types-proof"
  | "built-in-ai-10000-work-types-proof"
  | "built-in-ai-50000-phase1-governed-expansion-proof"
  | "built-in-ai-50000-phase2-all-shards-runtime-proof"
  | "built-in-ai-50000-phase3-live-app-domain-sample-proof"
  | "ai-estimate-50000-phase4-canary-safety-observability-rollback-proof"
  | "final-50k-92-external-live-proof-closeout"
  | "jest"
  | "git-diff-check";

export type ReleaseGateDefinition = {
  name: ReleaseGateName;
  command: string;
};

export type ReleaseGateResult = ReleaseGateDefinition & {
  status: "passed" | "failed";
  exitCode: number;
};

export type ReleaseRepoSyncStatus = "synced" | "local_ahead" | "origin_ahead" | "diverged" | "unknown_mismatch";

export type ReleaseRepoSyncAction =
  | "none"
  | "push_with_explicit_approval"
  | "pull_or_rebase_before_release"
  | "reconcile_diverged_branch"
  | "inspect_refs_before_release";

export type ReleaseRepoState = {
  gitBranch: string;
  headCommit: string;
  originMainCommit: string;
  worktreeClean: boolean;
  envFilePolicyValid: boolean;
  trackedEnvFiles: string[];
  unsafeTrackedEnvFiles: string[];
  headMatchesOriginMain: boolean;
  localCommitsAheadOriginMain: number;
  originMainCommitsAheadHead: number;
  syncStatus: ReleaseRepoSyncStatus;
  syncAction: ReleaseRepoSyncAction;
  requiredSyncApprovalKeys: string[];
};

export type PackageJsonMutationKind = "none" | "scripts-only" | "non-runtime" | "build-required";

export type ReleaseAutomationClassificationKind = "non-runtime" | "runtime-ota" | "build-required";

export type ReleaseAutomationClassification = {
  kind: ReleaseAutomationClassificationKind;
  changeClass: ReleaseChangeClass | null;
  files: string[];
  nonRuntimeFiles: string[];
  runtimeFiles: string[];
  buildRequiredFiles: string[];
  reasons: string[];
  packageJsonMutationKind: PackageJsonMutationKind;
};

export type ReleaseGuardReadiness = {
  status: "pass" | "fail";
  otaDisposition: "skip" | "allow" | "block";
  blockers: string[];
};

export type SupabaseMigrationRiskLevel = "none" | "schema" | "dml_or_rebuild";

export type SupabaseMigrationRisk = {
  filePath: string;
  riskLevel: SupabaseMigrationRiskLevel;
  schemaChangesDetected: boolean;
  securityDefinerDetected: boolean;
  pgrstNotifyDetected: boolean;
  dmlStatementsDetected: string[];
  readModelRebuildDetected: boolean;
  productionDbApprovalRequired: boolean;
  reasons: string[];
};

export type ReleaseGuardMigrationPolicy = {
  migrationFiles: string[];
  highRiskFiles: string[];
  productionDbApprovalRequired: boolean;
  requiredApprovalKeys: string[];
  missingApprovalKeys: string[];
  approvalSatisfied: boolean;
  nextSafeWave: string | null;
  risks: SupabaseMigrationRisk[];
  blockers: string[];
};

export type ReleaseMetadataFieldStatus =
  | "present"
  | "missing"
  | "verified"
  | "blocked"
  | "not_applicable"
  | "owner_action_required";

export type ReleaseMetadataOtaDisposition =
  | "skip"
  | "candidate"
  | "published"
  | "blocked";

export type ReleaseGuardRuntimePolicyTruth = {
  resolvedRuntimeVersion: string;
  runtimePolicy: string;
  runtimeVersionStrategy: ReleaseRuntimeVersionStrategy;
  runtimePolicyValid: boolean;
  runtimePolicyReason: string;
  runtimeProofConsistent: boolean;
  runtimeProofReason: string;
  buildRequired: boolean;
};

export type ReleaseGuardStartupPolicyTruth = {
  updatesEnabled: boolean;
  checkAutomatically: ReleaseCheckAutomatically;
  fallbackToCacheTimeout: number | null;
  startupPolicyValid: boolean;
  startupPolicyReason: string;
};

export type ReleaseOtaPublishMetadata = {
  branch: string;
  runtimeVersion: string;
  platform: string;
  updateGroupId: string;
  androidUpdateId: string;
  iosUpdateId: string;
  message: string;
  commit: string;
  dashboardUrl: string;
};

export type ReleaseMetadataEnforcement = {
  gitSha: ReleaseMetadataFieldStatus;
  appVersion: ReleaseMetadataFieldStatus;
  buildLineage: ReleaseMetadataFieldStatus;
  runtimeVersion: ReleaseMetadataFieldStatus;
  channel: ReleaseMetadataFieldStatus;
  branch: ReleaseMetadataFieldStatus;
  platform: ReleaseMetadataFieldStatus;
  otaDisposition: ReleaseMetadataOtaDisposition;
  rollbackReady: boolean;
  sentrySourceMaps: ReleaseMetadataFieldStatus;
  binarySourceMapsProven: ReleaseMetadataFieldStatus;
  easBuildTriggered: false;
  easSubmitTriggered: false;
  otaPublished: boolean;
  easUpdateTriggered: boolean;
  missing: string[];
  warnings: string[];
};

export type ReleaseGuardReport = {
  mode: ReleaseGuardMode;
  timestamp: string;
  repo: ReleaseRepoState;
  gates: ReleaseGateResult[];
  classification: ReleaseAutomationClassification;
  migrationPolicy: ReleaseGuardMigrationPolicy;
  aiMandatoryEmulatorRuntimeGate: AiMandatoryEmulatorRuntimeGatePolicy;
  runtimePolicy: ReleaseGuardRuntimePolicyTruth;
  startupPolicy: ReleaseGuardStartupPolicyTruth;
  readiness: ReleaseGuardReadiness;
  requiredArtifacts: string[];
  missingArtifacts: string[];
  targetChannel: string | null;
  expectedBranch: string | null;
  releaseMessage: string | null;
  rolloutPercentage: number | null;
  commitRange: string;
  otaPublish: ReleaseOtaPublishMetadata | null;
  releaseMetadata: ReleaseMetadataEnforcement;
};

type PackageJsonShape = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

export const REQUIRED_RELEASE_GATES: ReleaseGateDefinition[] = [
  { name: "tsc", command: "npx tsc --noEmit --pretty false" },
  { name: "expo-lint", command: "npx expo lint" },
  { name: "architecture-anti-regression", command: "npx tsx scripts/architecture_anti_regression_suite.ts --json" },
  { name: "ai-app-context-graph-deep-link-proof", command: "npx tsx scripts/e2e/runAiAppContextGraphDeepLinkWebProof.ts" },
  { name: "ai-universal-role-qa-source-planner-proof", command: "npx tsx scripts/e2e/runAiUniversalRoleQaWebProof.ts" },
  { name: "ai-live-screen-copilot-buttons-proof", command: "npx tsx scripts/e2e/runAiLiveScreenCopilotButtonsWebProof.ts" },
  { name: "enterprise-ai-architecture-guardrails", command: "npx tsx scripts/ai/runAiEnterpriseArchitectureGuardrails.ts" },
  { name: "ai-verified-external-knowledge-proof", command: "npx tsx scripts/e2e/runAiVerifiedExternalKnowledgeWebProof.ts" },
  { name: "ai-role-mixed-150-real-answers-proof", command: "npx tsx scripts/e2e/runAiRoleMixed150RealAnswersWebProof.ts" },
  { name: "ai-role-business-copilots-workflow-proof", command: "npx tsx scripts/e2e/runAiRoleBusinessCopilotsWorkflowWebProof.ts" },
  { name: "media-photo-video-intelligence-proof", command: "npx tsx scripts/e2e/runMediaPhotoVideoIntelligenceWebProof.ts" },
  { name: "document-pdf-evidence-intelligence-proof", command: "npx tsx scripts/e2e/runAiDocumentPdfEvidenceIntelligenceWebProof.ts" },
  { name: "ai-domain-data-gateway-context-retrieval-proof", command: "npx tsx scripts/e2e/runAiDomainDataGatewayContextRetrievalWebProof.ts" },
  { name: "enterprise-ai-contract-runtime-invariant-proof", command: "npx tsx scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts" },
  { name: "ai-safe-action-draft-approval-proof", command: "npx tsx scripts/ai/runAiSafeActionDraftApprovalProof.ts" },
  { name: "ai-human-approval-ledger-execution-boundary-proof", command: "npx tsx scripts/ai/runAiHumanApprovalLedgerExecutionBoundaryProof.ts" },
  { name: "global-estimate-professional-boq-proof", command: "npx tsx scripts/e2e/runGlobalEstimateLocalizationProfessionalBoqProof.ts" },
  { name: "global-estimate-production-safe-proof", command: "npx tsx scripts/e2e/runGlobalEstimateProductionSafeProof.ts" },
  { name: "global-estimate-b2c-request-proof", command: "npx tsx scripts/e2e/runGlobalEstimateB2CRequestProof.ts" },
  { name: "global-estimate-pdf-marketplace-proof", command: "npx tsx scripts/e2e/runGlobalEstimatePdfMarketplaceProof.ts" },
  { name: "global-estimate-localization-runtime-proof", command: "npx tsx scripts/e2e/runGlobalEstimateLocalizationRuntimeProof.ts" },
  { name: "global-estimate-data-ops-admin-governance-proof", command: "npx tsx scripts/e2e/runGlobalEstimateDataOpsAdminGovernanceProof.ts" },
  { name: "global-estimate-data-ops-proof", command: "npx tsx scripts/e2e/runGlobalEstimateDataOpsProof.ts" },
  { name: "global-estimate-data-ops-import-proof", command: "npx tsx scripts/e2e/runGlobalEstimateDataOpsImportProof.ts" },
  { name: "global-estimate-data-ops-coverage-proof", command: "npx tsx scripts/e2e/runGlobalEstimateDataOpsCoverageProof.ts" },
  { name: "ai-estimate-to-pdf-proof", command: "npx tsx scripts/e2e/runAiEstimateToPdfProof.ts" },
  { name: "live-ai-estimate-pdf-reality-proof", command: "npx tsx scripts/e2e/runLiveAiEstimatePdfRealityProof.ts" },
  { name: "ai-estimate-core-completion-proof", command: "npx tsx scripts/e2e/runAiEstimateCoreCompletionProof.ts --require-live" },
  { name: "global-estimate-template-ratebook-reconciliation-proof", command: "npx tsx scripts/e2e/runGlobalEstimateTemplateRatebookReconciliationProof.ts" },
  { name: "ai-route-parity-proof", command: "npx tsx scripts/e2e/runAiRouteParityProof.ts --require-live" },
  { name: "estimate-pdf-real-binary-proof", command: "npx tsx scripts/e2e/runEstimatePdfRealBinaryProof.ts --final" },
  { name: "consumer-estimate-tab-pdf-proof", command: "npx tsx scripts/e2e/runConsumerEstimateTabPdfProof.ts" },
  { name: "bottom-nav-estimate-marketplace-plus-proof", command: "npx tsx scripts/e2e/runBottomNavEstimateAndMarketplacePlusProof.ts" },
  { name: "ai-estimate-pdf-open-runtime-proof", command: "npx tsx scripts/e2e/runAiEstimatePdfOpenRuntimeProof.ts" },
  { name: "ai-estimate-pdf-safe-integration-proof", command: "npx tsx scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts" },
  { name: "request-ai-estimate-boq-catalog-proof", command: "npx tsx scripts/e2e/runRequestAiEstimateBoqCatalogProof.ts" },
  { name: "request-ai-estimate-professional-boq-formula-proof", command: "npx tsx scripts/e2e/runRequestAiEstimateProfessionalBoqFormulaProof.ts" },
  { name: "catalog-items-global-estimate-binding-proof", command: "npx tsx scripts/e2e/runCatalogItemsGlobalEstimateBindingProof.ts" },
  { name: "all-screens-enterprise-web-proof", command: "npx tsx scripts/e2e/runAllScreensEnterpriseWebProof.ts" },
  { name: "all-screens-enterprise-android-emulator-proof", command: "npx tsx scripts/e2e/runAllScreensEnterpriseAndroidEmulatorProof.ts" },
  { name: "all-screens-pdf-open-proof", command: "npx tsx scripts/e2e/runAllScreensPdfOpenProof.ts" },
  { name: "all-screens-bottom-nav-proof", command: "npx tsx scripts/e2e/runAllScreensBottomNavProof.ts" },
  { name: "all-screens-backend-boundary-proof", command: "npx tsx scripts/e2e/runAllScreensBackendBoundaryProof.ts" },
  { name: "all-screens-role-ai-proof", command: "npx tsx scripts/e2e/runAllScreensRoleAiProof.ts" },
  { name: "all-screens-no-overlap-proof", command: "npx tsx scripts/e2e/runAllScreensNoOverlapProof.ts" },
  { name: "enterprise-release-candidate-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateProof.ts" },
  { name: "enterprise-release-candidate-web-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateWebProof.ts" },
  { name: "enterprise-release-candidate-android-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateAndroidProof.ts" },
  { name: "enterprise-release-candidate-backend-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateBackendProof.ts" },
  { name: "enterprise-release-candidate-ota-runtime-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateOtaRuntimeProof.ts" },
  { name: "enterprise-release-candidate-rollback-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateRollbackProof.ts" },
  { name: "enterprise-release-candidate-observability-proof", command: "npx tsx scripts/e2e/runEnterpriseReleaseCandidateObservabilityProof.ts" },
  { name: "universal-qa-smoke-release-gate", command: "npx tsx scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts" },
  { name: "universal-qa-smoke-maestro", command: "npx tsx scripts/e2e/runAiUniversalLargeQuestionSmokeMaestroProof.ts" },
  { name: "ios-eas-update-native-impact-classifier", command: "npx tsx scripts/release/classifyNativeRuntimeImpact.ts --json" },
  { name: "jest-run-in-band", command: "npm test -- --runInBand" },
  { name: "git-diff-check", command: "git diff --check" },
  { name: "50k-fixture-retention-cleanup-policy-proof", command: "npx tsx scripts/audit/run50kFixtureRetentionCleanupPolicyProof.ts" },
  { name: "green-claim-artifact-reconciliation-proof", command: "npx tsx scripts/audit/runGreenClaimArtifactReconciliation.ts" },
  { name: "built-in-ai-live-acceptance-baseline-proof", command: "npx tsx scripts/e2e/runBuiltInAiLiveAcceptanceBaselineProof.ts" },
  { name: "built-in-ai-150-work-types-proof", command: "npx tsx scripts/e2e/runBuiltInAi150ConstructionWorkTypesProof.ts" },
  { name: "built-in-ai-1000-work-types-proof", command: "npx tsx scripts/e2e/runBuiltInAi1000ConstructionWorkTypesProof.ts" },
  { name: "built-in-ai-10000-work-types-proof", command: "npx tsx scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof.ts" },
  { name: "built-in-ai-50000-phase1-governed-expansion-proof", command: "npx tsx scripts/e2e/runBuiltInAi50000Phase1ShardMerge.ts --totalShards=5 --require-live-artifacts" },
  { name: "built-in-ai-50000-phase2-all-shards-runtime-proof", command: "npx tsx scripts/e2e/runBuiltInAi50000Phase2ShardMerge.ts --totalShards=50 --require-live-artifacts" },
  { name: "built-in-ai-50000-phase3-live-app-domain-sample-proof", command: "npx tsx scripts/e2e/runBuiltInAi50000Phase3LiveSampleMatrix.ts" },
  { name: "ai-estimate-50000-phase4-canary-safety-observability-rollback-proof", command: "npx tsx scripts/e2e/runBuiltInAi50000Phase4CanarySafetyProof.ts" },
  { name: "final-50k-92-external-live-proof-closeout", command: "npx tsx scripts/audit/runExternalLiveProofCloseout.ts --after-gates" },
];

export const FINAL_50K_92_GREEN_STATUS = "GREEN_FINAL_50K_92_SCORE_REAUDIT_READY";
export type Final50k92EvidenceMode = "live_fixture" | "archived_evidence_only" | "missing";

export type Final50k92GreenClaimEvidence = {
  finalStatus: string;
  fixtureSufficient: boolean;
  proofRunId: string | null;
  wholeApp50kLiveProofPassed: boolean;
  evidenceMode?: Final50k92EvidenceMode;
  rlsGreen: boolean;
  fullJestPassed: boolean;
  releaseVerifyPassed: boolean;
};

export type Final50k92GreenReleaseGuardResult = {
  passed: boolean;
  checked: boolean;
  blockers: string[];
  requiresFixtureSufficient: true;
  requiresProofRunId: true;
  requiresWholeApp50kLiveProof: true;
  requiresLiveFixtureEvidence: true;
  requiresRlsGreen: true;
  requiresFullJestPassed: true;
  requiresReleaseVerifyPassed: true;
  evidenceMode: Final50k92EvidenceMode;
  archivedEvidenceAcceptedForFreshGreen: false;
};

export function evaluateFinal50k92GreenReleaseGuard(
  evidence: Final50k92GreenClaimEvidence,
): Final50k92GreenReleaseGuardResult {
  const blockers: string[] = [];
  const checked = evidence.finalStatus === FINAL_50K_92_GREEN_STATUS;
  const evidenceMode = evidence.evidenceMode
    ?? (evidence.fixtureSufficient && evidence.proofRunId && evidence.wholeApp50kLiveProofPassed ? "live_fixture" : "missing");

  if (checked) {
    if (!evidence.fixtureSufficient) blockers.push("BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED");
    if (!evidence.proofRunId) blockers.push("BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_PROOF_RUN_ID_REQUIRED");
    if (!evidence.wholeApp50kLiveProofPassed) blockers.push("BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_LIVE_PROOF_REQUIRED");
    if (evidenceMode === "archived_evidence_only") {
      blockers.push("BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED_ARCHIVED_EVIDENCE_ONLY");
    } else if (evidenceMode !== "live_fixture") {
      blockers.push("BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_LIVE_FIXTURE_REQUIRED");
    }
    if (!evidence.rlsGreen) blockers.push("BLOCKED_EXTERNAL_ONLY_RLS_DYNAMIC_CROSS_TENANT_REQUIRED");
    if (!evidence.fullJestPassed) blockers.push("BLOCKED_INTERNAL_FULL_JEST_REQUIRED");
    if (!evidence.releaseVerifyPassed) blockers.push("BLOCKED_INTERNAL_RELEASE_VERIFY_REQUIRED");
  }

  return {
    passed: blockers.length === 0,
    checked,
    blockers,
    requiresFixtureSufficient: true,
    requiresProofRunId: true,
    requiresWholeApp50kLiveProof: true,
    requiresLiveFixtureEvidence: true,
    requiresRlsGreen: true,
    requiresFullJestPassed: true,
    requiresReleaseVerifyPassed: true,
    evidenceMode,
    archivedEvidenceAcceptedForFreshGreen: false,
  };
}

export const RELEASE_GUARD_MAIN_PUSH_APPROVAL_KEYS = ["S_PRODUCTION_MAIN_PUSH_APPROVED"] as const;

function isTrackedEnvFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? "";
  return fileName === ".env" || fileName.startsWith(".env.");
}

export function resolveTrackedEnvFilePolicy(trackedFiles: string[]): {
  envFilePolicyValid: boolean;
  trackedEnvFiles: string[];
  unsafeTrackedEnvFiles: string[];
} {
  const trackedEnvFiles = trackedFiles.filter(isTrackedEnvFile);
  const unsafeTrackedEnvFiles = trackedEnvFiles.filter((filePath) => filePath.replace(/\\/g, "/") !== ".env.example");

  return {
    envFilePolicyValid: unsafeTrackedEnvFiles.length === 0,
    trackedEnvFiles,
    unsafeTrackedEnvFiles,
  };
}

export function resolveReleaseRepoSync(params: {
  headMatchesOriginMain: boolean;
  localCommitsAheadOriginMain: number;
  originMainCommitsAheadHead: number;
}): {
  syncStatus: ReleaseRepoSyncStatus;
  syncAction: ReleaseRepoSyncAction;
  requiredSyncApprovalKeys: string[];
} {
  if (params.headMatchesOriginMain) {
    return { syncStatus: "synced", syncAction: "none", requiredSyncApprovalKeys: [] };
  }

  if (params.localCommitsAheadOriginMain > 0 && params.originMainCommitsAheadHead > 0) {
    return { syncStatus: "diverged", syncAction: "reconcile_diverged_branch", requiredSyncApprovalKeys: [] };
  }

  if (params.localCommitsAheadOriginMain > 0) {
    return {
      syncStatus: "local_ahead",
      syncAction: "push_with_explicit_approval",
      requiredSyncApprovalKeys: [...RELEASE_GUARD_MAIN_PUSH_APPROVAL_KEYS],
    };
  }

  if (params.originMainCommitsAheadHead > 0) {
    return { syncStatus: "origin_ahead", syncAction: "pull_or_rebase_before_release", requiredSyncApprovalKeys: [] };
  }

  return { syncStatus: "unknown_mismatch", syncAction: "inspect_refs_before_release", requiredSyncApprovalKeys: [] };
}

export function resolveReleaseGuardCommitRange(params: {
  explicitRange: string | null;
  repo: Pick<ReleaseRepoState, "localCommitsAheadOriginMain">;
  headParentExists: boolean;
}): string {
  const explicitRange = params.explicitRange?.trim();
  if (explicitRange) {
    return explicitRange;
  }

  if (params.repo.localCommitsAheadOriginMain > 0) {
    return "origin/main..HEAD";
  }

  return params.headParentExists ? "HEAD^..HEAD" : "HEAD";
}

export const RELEASE_GUARD_OTA_PUBLISH_MAX_BUFFER_BYTES = 64 * 1024 * 1024;
export const RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS = [
  "S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED",
  "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
] as const;
export const RELEASE_GUARD_MIGRATION_NEXT_SAFE_WAVE =
  "S-PRODUCTION-MIGRATION-GAP-APPLY-OR-REPAIR-1-WITH-EXPLICIT-DB-WRITE-APPROVAL";
export const RELEASE_GUARD_IOS_EAS_UPDATE_FAST_QA_POLICY = {
  wave: "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_GATE_POINT_OF_NO_RETURN",
  nativeImpactFalse:
    "iOS build is forbidden for JS/UI/layout/AI-text/backend-only changes; publish OTA to the installed build channel branch.",
  nativeImpactTrue: "iOS build is required only when native runtime impact is proven.",
  physicalIphoneProofRequired:
    "iPhone QA green requires installed channel/runtime, compatible OTA update, and physical device confirmation.",
} as const;
function isReleaseGuardApprovalEnabled(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function resolveReleaseGuardPath(projectRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

export function buildReleaseGuardOtaPublishEnv(
  baseEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    CI: baseEnv.CI ?? "1",
  };
}

function quoteReleaseGuardShellArg(value: string, platform: NodeJS.Platform): string {
  if (platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildReleaseGuardOtaPublishCommand(params: {
  platform: NodeJS.Platform;
  channel: string;
  message: string;
  rolloutPercentage?: number | null;
}): string {
  const parts = [
    "npx",
    "eas",
    "update",
    "--branch",
    params.channel,
    "--message",
    params.message,
  ];

  if (params.rolloutPercentage != null) {
    parts.push("--rollout-percentage", String(params.rolloutPercentage));
  }

  return parts
    .map((part, index) =>
      index === 0
        ? part
        : quoteReleaseGuardShellArg(part, params.platform),
    )
    .join(" ");
}

export function buildReleaseChangedFilesGitArgs(range: string): string[] {
  if (range === "HEAD") {
    return ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"];
  }

  return ["diff", "--name-only", "--diff-filter=ACMR", range];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSortedRecord(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function safeParsePackageJson(source: string | null): PackageJsonShape | null {
  if (!source) return null;

  try {
    return JSON.parse(source) as PackageJsonShape;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse package.json: ${message}`);
  }
}

function hasKeyChanged(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export function classifyPackageJsonMutation(params: {
  previousSource: string | null;
  currentSource: string | null;
}): PackageJsonMutationKind {
  const previous = safeParsePackageJson(params.previousSource);
  const current = safeParsePackageJson(params.currentSource);

  if (!previous || !current) {
    return "build-required";
  }

  const allowedNonRuntimeKeys = new Set(["scripts", "devDependencies"]);
  const changedKeys = dedupe(
    [...Object.keys(previous), ...Object.keys(current)].filter((key) =>
      hasKeyChanged(previous[key], current[key]),
    ),
  );

  if (changedKeys.length === 0) {
    return "none";
  }

  const dependenciesChanged = hasKeyChanged(
    toSortedRecord(previous.dependencies),
    toSortedRecord(current.dependencies),
  );

  if (dependenciesChanged) {
    return "build-required";
  }

  const onlyAllowedKeysChanged = changedKeys.every((key) => allowedNonRuntimeKeys.has(key));
  if (onlyAllowedKeysChanged) {
    return changedKeys.includes("scripts") ? "scripts-only" : "non-runtime";
  }

  return "build-required";
}

function isNonRuntimePath(filePath: string): boolean {
  return (
    /^([^/]+\/)?tsconfig(\.[^/]+)?\.json$/.test(filePath) ||
    filePath.startsWith("docs/") ||
    filePath.startsWith("artifacts/") ||
    filePath.startsWith("maestro/") ||
    filePath.startsWith("tests/") ||
    filePath.startsWith("scripts/") ||
    filePath.startsWith(".husky/") ||
    filePath.startsWith("db/") ||
    filePath.startsWith("supabase/") ||
    filePath.endsWith(".md") ||
    filePath.endsWith(".sql") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx")
  );
}

function isSupabaseMigrationPath(filePath: string): boolean {
  return /^supabase\/migrations\/\d{14}_[^/]+\.sql$/.test(normalizePath(filePath));
}

function stripSqlComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
}

function collectDmlStatements(sqlSource: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["insert", /\binsert\s+into\b/i],
    ["update", /\bupdate\s+(?:only\s+)?[a-z0-9_."[\]]+/i],
    ["delete", /\bdelete\s+from\b/i],
    ["truncate", /\btruncate(?:\s+table)?\b/i],
    ["merge", /\bmerge\s+into\b/i],
  ];

  return checks
    .filter(([, pattern]) => pattern.test(sqlSource))
    .map(([statement]) => statement);
}

export function analyzeSupabaseMigrationRisk(params: {
  filePath: string;
  source: string;
}): SupabaseMigrationRisk {
  const filePath = normalizePath(params.filePath);
  const sqlSource = stripSqlComments(params.source).toLowerCase();
  const schemaChangesDetected = /\b(create|alter|drop)\s+(table|index|function|policy|trigger|view|materialized\s+view|type)\b/i.test(sqlSource);
  const securityDefinerDetected = /\bsecurity\s+definer\b/i.test(sqlSource);
  const pgrstNotifyDetected = /\bnotify\s+pgrst\b/i.test(sqlSource);
  const dmlStatementsDetected = collectDmlStatements(sqlSource);
  const readModelRebuildDetected =
    /\b(select|perform)\s+public\.[a-z0-9_]*rebuild[a-z0-9_]*\s*\(/i.test(sqlSource) ||
    /\bcreate\s+or\s+replace\s+function\s+public\.[a-z0-9_]*rebuild[a-z0-9_]*\s*\(/i.test(sqlSource);
  const productionDbApprovalRequired = dmlStatementsDetected.length > 0 || readModelRebuildDetected;
  const riskLevel: SupabaseMigrationRiskLevel = productionDbApprovalRequired
    ? "dml_or_rebuild"
    : schemaChangesDetected || securityDefinerDetected || pgrstNotifyDetected
      ? "schema"
      : "none";
  const reasons: string[] = [];

  if (dmlStatementsDetected.length > 0) {
    reasons.push(`DML statements detected: ${dmlStatementsDetected.join(", ")}.`);
  }

  if (readModelRebuildDetected) {
    reasons.push("Read-model rebuild function or invocation detected.");
  }

  if (securityDefinerDetected) {
    reasons.push("SECURITY DEFINER function detected.");
  }

  if (pgrstNotifyDetected) {
    reasons.push("PostgREST schema reload notification detected.");
  }

  if (schemaChangesDetected) {
    reasons.push("Schema change detected.");
  }

  if (reasons.length === 0) {
    reasons.push("No schema or data mutation signal detected.");
  }

  return {
    filePath,
    riskLevel,
    schemaChangesDetected,
    securityDefinerDetected,
    pgrstNotifyDetected,
    dmlStatementsDetected,
    readModelRebuildDetected,
    productionDbApprovalRequired,
    reasons,
  };
}

export function buildReleaseGuardMigrationPolicy(params: {
  changedFiles: string[];
  readFile: (filePath: string) => string | null;
  approvalEnv?: Record<string, string | undefined>;
}): ReleaseGuardMigrationPolicy {
  const migrationFiles = dedupe(
    params.changedFiles.map(normalizePath).filter(isSupabaseMigrationPath),
  ).sort();
  const risks: SupabaseMigrationRisk[] = [];
  const blockers: string[] = [];

  for (const filePath of migrationFiles) {
    const source = params.readFile(filePath);

    if (source == null) {
      blockers.push(`Supabase migration ${filePath} could not be read for release safety classification.`);
      continue;
    }

    const risk = analyzeSupabaseMigrationRisk({ filePath, source });
    risks.push(risk);

    if (risk.productionDbApprovalRequired) {
      blockers.push(
        `Supabase migration ${filePath} contains DML or read-model rebuild behavior and requires ${RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS.join(", ")} before release automation can proceed.`,
      );
    }
  }

  const highRiskFiles = risks
    .filter((risk) => risk.productionDbApprovalRequired)
    .map((risk) => risk.filePath)
    .sort();
  const requiredApprovalKeys =
    highRiskFiles.length > 0 ? [...RELEASE_GUARD_MIGRATION_DB_APPROVAL_KEYS] : [];
  const approvalEnv = params.approvalEnv ?? process.env;
  const missingApprovalKeys = requiredApprovalKeys.filter(
    (key) => !isReleaseGuardApprovalEnabled(approvalEnv[key]),
  );
  const approvalSatisfied = highRiskFiles.length === 0 || missingApprovalKeys.length === 0;
  const effectiveBlockers = approvalSatisfied
    ? blockers.filter(
        (blocker) =>
          !blocker.includes("contains DML or read-model rebuild behavior and requires"),
      )
    : blockers;

  return {
    migrationFiles,
    highRiskFiles,
    productionDbApprovalRequired: highRiskFiles.length > 0,
    requiredApprovalKeys,
    missingApprovalKeys,
    approvalSatisfied,
    nextSafeWave: highRiskFiles.length > 0 ? RELEASE_GUARD_MIGRATION_NEXT_SAFE_WAVE : null,
    risks,
    blockers: effectiveBlockers,
  };
}

function isRuntimePath(filePath: string): boolean {
  if (filePath === "package.json" || filePath === "app.json" || filePath === "eas.json") {
    return false;
  }

  if (isNonRuntimePath(filePath)) {
    return false;
  }

  return filePath.startsWith("app/") || filePath.startsWith("src/");
}

function isBuildRequiredPath(filePath: string): boolean {
  return (
    filePath === "app.json" ||
    filePath === "eas.json" ||
    filePath.startsWith("android/") ||
    filePath.startsWith("ios/") ||
    filePath.startsWith("assets/")
  );
}

function inferRuntimeChangeClass(runtimeFiles: string[]): ReleaseChangeClass {
  if (runtimeFiles.length === 0) {
    return "release-metadata";
  }

  if (
    runtimeFiles.every(
      (filePath) =>
        filePath.startsWith("src/shared/release/") ||
        filePath.includes("otaDiagnostics") ||
        filePath.includes("OtaDiagnostics"),
    )
  ) {
    return runtimeFiles.some((filePath) => filePath.includes("otaDiagnostics") || filePath.includes("OtaDiagnostics"))
      ? "ota-diagnostics"
      : "release-metadata";
  }

  if (runtimeFiles.some((filePath) => filePath.startsWith("app/") || filePath.endsWith(".tsx"))) {
    return "js-ui";
  }

  return "js-logic";
}

export function classifyReleaseChanges(params: {
  changedFiles: string[];
  packageJsonMutationKind?: PackageJsonMutationKind;
}): ReleaseAutomationClassification {
  const files = dedupe(params.changedFiles.map(normalizePath).filter(Boolean)).sort();
  const nonRuntimeFiles: string[] = [];
  const runtimeFiles: string[] = [];
  const buildRequiredFiles: string[] = [];
  const reasons: string[] = [];
  const packageJsonMutationKind = params.packageJsonMutationKind ?? "none";

  for (const filePath of files) {
    if (filePath === "package.json") {
      if (packageJsonMutationKind === "scripts-only") {
        nonRuntimeFiles.push(filePath);
        reasons.push("package.json changed only in scripts, so OTA should be skipped.");
        continue;
      }

      if (packageJsonMutationKind === "non-runtime") {
        nonRuntimeFiles.push(filePath);
        reasons.push("package.json changed only in non-runtime tooling keys, so OTA should be skipped.");
        continue;
      }

      buildRequiredFiles.push(filePath);
      reasons.push("package.json changed outside release-safe tooling keys, so OTA is blocked.");
      continue;
    }

    if (isBuildRequiredPath(filePath)) {
      buildRequiredFiles.push(filePath);
      reasons.push(`${filePath} touches native or release-host config, so OTA is blocked.`);
      continue;
    }

    if (isRuntimePath(filePath)) {
      runtimeFiles.push(filePath);
      reasons.push(`${filePath} is runtime JS/TS code and requires full preflight before OTA.`);
      continue;
    }

    if (isNonRuntimePath(filePath)) {
      nonRuntimeFiles.push(filePath);
      reasons.push(`${filePath} is tooling/docs/test/backend-proof scope, so OTA should be skipped.`);
      continue;
    }

    buildRequiredFiles.push(filePath);
    reasons.push(`${filePath} is outside the safe release classification map, so OTA is blocked.`);
  }

  if (buildRequiredFiles.length > 0) {
    return {
      kind: "build-required",
      changeClass: null,
      files,
      nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
      runtimeFiles: dedupe(runtimeFiles).sort(),
      buildRequiredFiles: dedupe(buildRequiredFiles).sort(),
      reasons: dedupe(reasons),
      packageJsonMutationKind,
    };
  }

  if (runtimeFiles.length > 0) {
    return {
      kind: "runtime-ota",
      changeClass: inferRuntimeChangeClass(dedupe(runtimeFiles).sort()),
      files,
      nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
      runtimeFiles: dedupe(runtimeFiles).sort(),
      buildRequiredFiles: [],
      reasons: dedupe(reasons),
      packageJsonMutationKind,
    };
  }

  return {
    kind: "non-runtime",
    changeClass: null,
    files,
    nonRuntimeFiles: dedupe(nonRuntimeFiles).sort(),
    runtimeFiles: [],
    buildRequiredFiles: [],
    reasons: dedupe(
      reasons.length > 0
        ? reasons
        : ["No runtime JS/TS files changed in the release commit, so OTA should be skipped."],
    ),
    packageJsonMutationKind,
  };
}

export function evaluateReleaseGuardReadiness(params: {
  mode: ReleaseGuardMode;
  repo: ReleaseRepoState;
  gates: ReleaseGateResult[];
  classification: ReleaseAutomationClassification;
  migrationPolicy?: ReleaseGuardMigrationPolicy;
  aiMandatoryEmulatorRuntimeGate?: AiMandatoryEmulatorRuntimeGatePolicy;
  runtimePolicy: ReleaseGuardRuntimePolicyTruth;
  startupPolicy: ReleaseGuardStartupPolicyTruth;
  targetChannel: string | null;
  releaseMessage: string | null;
  missingArtifacts: string[];
  expectedBranch: string | null;
}): ReleaseGuardReadiness {
  const blockers: string[] = [];

  if (params.mode === "ota" && !params.repo.worktreeClean) {
    blockers.push("Worktree is dirty. Release automation requires a clean repository state.");
  }

  for (const filePath of params.repo.unsafeTrackedEnvFiles) {
    blockers.push(`Tracked environment file is not allowed in release automation: ${filePath}.`);
  }

  if (params.mode === "ota" && !params.repo.headMatchesOriginMain) {
    const syncDetail =
      params.repo.localCommitsAheadOriginMain > 0 || params.repo.originMainCommitsAheadHead > 0
        ? ` Local branch is ahead by ${params.repo.localCommitsAheadOriginMain} commit(s) and behind by ${params.repo.originMainCommitsAheadHead} commit(s).`
        : "";
    blockers.push(
      `HEAD does not match origin/main.${syncDetail} Next safe action: ${params.repo.syncAction}.${
        params.repo.requiredSyncApprovalKeys.length > 0
          ? ` Required approval keys: ${params.repo.requiredSyncApprovalKeys.join(", ")}.`
          : ""
      } Push and sync the exact release commit before publishing.`,
    );
  }

  for (const gate of params.gates) {
    if (gate.status === "failed") {
      blockers.push(`Required gate failed: ${gate.name}.`);
    }
  }

  for (const artifact of params.missingArtifacts) {
    blockers.push(`Required artifact is missing: ${artifact}`);
  }

  for (const blocker of params.migrationPolicy?.blockers ?? []) {
    blockers.push(blocker);
  }

  for (const blocker of params.aiMandatoryEmulatorRuntimeGate?.blockers ?? []) {
    blockers.push(blocker);
  }

  if (!params.runtimePolicy.runtimePolicyValid) {
    blockers.push(`Runtime policy invalid: ${params.runtimePolicy.runtimePolicyReason}`);
  }

  if (!params.runtimePolicy.runtimeProofConsistent) {
    blockers.push(`Runtime proof mismatch: ${params.runtimePolicy.runtimeProofReason}`);
  }

  if (!params.startupPolicy.startupPolicyValid) {
    blockers.push(`Startup policy invalid: ${params.startupPolicy.startupPolicyReason}`);
  }

  if (params.mode === "ota") {
    if (params.classification.kind === "build-required") {
      blockers.push("Release classification requires a new build. OTA publish is blocked.");
    }

    if (params.classification.kind === "runtime-ota") {
      if (!params.targetChannel) {
        blockers.push("Runtime OTA publish requires an explicit --channel.");
      }

      if (!params.releaseMessage) {
        blockers.push("Runtime OTA publish requires a non-empty --message.");
      }
    }
  }

  if (params.mode === "ota" && params.targetChannel && params.expectedBranch && params.expectedBranch !== params.targetChannel) {
    blockers.push(
      `Target channel "${params.targetChannel}" does not match the canonical expected branch "${params.expectedBranch}".`,
    );
  }

  if (blockers.length > 0) {
    return {
      status: "fail",
      otaDisposition: "block",
      blockers,
    };
  }

  if (params.classification.kind === "non-runtime") {
    return {
      status: "pass",
      otaDisposition: "skip",
      blockers: [],
    };
  }

  if (params.classification.kind === "build-required") {
    return {
      status: "pass",
      otaDisposition: "block",
      blockers: [],
    };
  }

  if (params.mode === "ota" && params.classification.kind === "runtime-ota") {
    return {
      status: "pass",
      otaDisposition: "allow",
      blockers: [],
    };
  }

  return {
    status: "pass",
    otaDisposition: "allow",
    blockers: [],
  };
}

function presentWhen(value: string | null | undefined): ReleaseMetadataFieldStatus {
  return value && value.trim().length > 0 ? "present" : "missing";
}

function normalizeReleaseMetadataOtaDisposition(params: {
  readiness: ReleaseGuardReadiness;
  otaPublish: ReleaseOtaPublishMetadata | null;
}): ReleaseMetadataOtaDisposition {
  if (params.otaPublish) return "published";
  if (params.readiness.otaDisposition === "skip") return "skip";
  if (params.readiness.otaDisposition === "block") return "blocked";
  return "candidate";
}

export function buildReleaseMetadataEnforcement(params: {
  repo: ReleaseRepoState;
  appVersion: string;
  configuredIosBuildNumber: string;
  configuredAndroidVersionCode: string;
  appVersionSource: string;
  runtimeVersion: string;
  runtimePolicyValid: boolean;
  runtimeProofConsistent: boolean;
  startupPolicyValid: boolean;
  readiness: ReleaseGuardReadiness;
  targetChannel: string | null;
  expectedBranch: string | null;
  otaPublish: ReleaseOtaPublishMetadata | null;
}): ReleaseMetadataEnforcement {
  const otaDisposition = normalizeReleaseMetadataOtaDisposition({
    readiness: params.readiness,
    otaPublish: params.otaPublish,
  });
  const channelValue = params.otaPublish?.branch || params.targetChannel;
  const branchValue = params.otaPublish?.branch || params.expectedBranch;
  const platformValue = params.otaPublish?.platform ?? null;
  const hasBuildLineage =
    params.appVersionSource.trim().length > 0 &&
    (params.configuredIosBuildNumber.trim().length > 0 ||
      params.configuredAndroidVersionCode.trim().length > 0);
  const sentryProofStatus: ReleaseMetadataFieldStatus =
    otaDisposition === "published" ? "missing" : "not_applicable";
  const binarySourceMapProofStatus: ReleaseMetadataFieldStatus =
    otaDisposition === "published" ? "missing" : "not_applicable";
  const missing: string[] = [];
  const warnings: string[] = [];
  const fieldStatuses = {
    gitSha: presentWhen(params.repo.headCommit),
    appVersion: presentWhen(params.appVersion),
    buildLineage: hasBuildLineage ? "present" : "missing",
    runtimeVersion: presentWhen(params.runtimeVersion),
    channel:
      channelValue && channelValue.trim().length > 0
        ? "present"
        : otaDisposition === "skip"
          ? "not_applicable"
          : "missing",
    branch:
      branchValue && branchValue.trim().length > 0
        ? "present"
        : otaDisposition === "skip"
          ? "not_applicable"
          : "missing",
    platform:
      platformValue && platformValue.trim().length > 0
        ? "present"
        : otaDisposition === "published"
          ? "missing"
          : "not_applicable",
  } satisfies Record<string, ReleaseMetadataFieldStatus>;

  for (const [field, status] of Object.entries(fieldStatuses)) {
    if (status === "missing") missing.push(field);
  }

  if (sentryProofStatus === "missing") {
    missing.push("sentrySourceMaps");
    warnings.push("Sentry source maps are not marked shipped because no source map proof is attached to this report.");
  }

  if (binarySourceMapProofStatus === "missing") {
    missing.push("binarySourceMapsProven");
    warnings.push("Binary/source map proof is not marked shipped without explicit proof artifacts.");
  }

  const rollbackReady =
    params.repo.worktreeClean &&
    params.repo.headMatchesOriginMain &&
    presentWhen(params.repo.headCommit) === "present" &&
    params.runtimePolicyValid &&
    params.runtimeProofConsistent &&
    params.startupPolicyValid;

  return {
    ...fieldStatuses,
    otaDisposition,
    rollbackReady,
    sentrySourceMaps: sentryProofStatus,
    binarySourceMapsProven: binarySourceMapProofStatus,
    easBuildTriggered: false,
    easSubmitTriggered: false,
    otaPublished: otaDisposition === "published",
    easUpdateTriggered: otaDisposition === "published",
    missing,
    warnings,
  };
}

export function parseEasUpdateOutput(output: string): ReleaseOtaPublishMetadata {
  function readField(label: string): string {
    const pattern = new RegExp(`^${label}\\s+(.+)$`, "m");
    const match = output.match(pattern);
    return match?.[1]?.trim() ?? "";
  }

  return {
    branch: readField("Branch"),
    runtimeVersion: readField("Runtime version"),
    platform: readField("Platform"),
    updateGroupId: readField("Update group ID"),
    androidUpdateId: readField("Android update ID"),
    iosUpdateId: readField("iOS update ID"),
    message: readField("Message"),
    commit: readField("Commit"),
    dashboardUrl: readField("EAS Dashboard"),
  };
}
