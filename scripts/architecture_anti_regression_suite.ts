import fs from "node:fs";
import path from "node:path";

import {
  PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS,
  buildProductionBusinessReadonlyCanaryWhitelist,
  validateProductionBusinessReadonlyCanaryMetricLog,
  validateProductionBusinessReadonlyCanaryRegistry,
} from "./load/productionBusinessReadonlyCanary";
import {
  evaluateFlatListTuningRegressionGuardrail,
  scanFlatListTuningRegression,
  type FlatListTuningRegressionSummary,
} from "./perf/flatListTuningRegression";
import {
  evaluateErrorHandlingGapRatchet,
  scanErrorHandlingGapRatchet,
  type ErrorHandlingGapRatchetSummary,
} from "./error/errorHandlingGapRatchet";
import {
  collectSelectInventory,
  collectSelectInventoryFromSource,
  type SelectInventoryAction,
  type SelectInventoryEntry,
} from "./data/unboundedSelectInventory";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  buildCacheReadThroughOneRouteApplyEnv,
  isCacheReadThroughOneRouteApplyConfigReady,
  resolveCacheShadowRuntimeConfig,
} from "../src/shared/scale/cacheShadowRuntime";

export type GuardrailStatus = "pass" | "fail" | "report_only";

export type DirectSupabaseFindingClass =
  | "transport_controlled"
  | "service_bypass"
  | "test_only"
  | "generated_or_ignored"
  | "false_positive";

export type DirectSupabaseTransportOwner =
  | "root_client"
  | "transport_file"
  | "bff_client"
  | "server_file"
  | "test_file"
  | "generated_or_ignored"
  | "none";

export type DirectSupabaseOperation =
  | "auth"
  | "storage"
  | "read"
  | "write"
  | "rpc"
  | "realtime";

export type DirectSupabaseFinding = {
  file: string;
  line: number;
  operation: DirectSupabaseOperation;
  callTarget: string;
  matchedCall: string;
  classification: DirectSupabaseFindingClass;
  transportOwner: DirectSupabaseTransportOwner;
  expectedTransportOwner: string;
  risk: "low" | "medium" | "high";
  suggestedMigrationPath: string;
};

export type DirectSupabaseExceptionCategory =
  | "must_stay_direct_for_now"
  | "can_be_migrated_later"
  | "needs_new_bff_endpoint"
  | "unsafe_unknown";

export type DirectSupabaseExceptionRegistryEntry = {
  file: string;
  line: number;
  operation: DirectSupabaseOperation;
  callTarget: string;
  category: DirectSupabaseExceptionCategory;
  reasonDirectCallRemains: string;
  owner: string;
  futureMigrationPath: string;
  risk: DirectSupabaseFinding["risk"];
  allowed: boolean;
};

export type DirectSupabaseExceptionRegistry = {
  wave: "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT";
  generatedAtLocal: string;
  source: {
    scanner: "scripts/architecture_anti_regression_suite.ts";
    inventoryArtifacts: string[];
  };
  policy: {
    existingAllowedExceptionsPermitted: true;
    newUnclassifiedDirectCallsFailScanner: true;
    registryKey: "file|operation|callTarget";
  };
  summary: {
    totalExceptions: number;
    allowedExceptions: number;
    categoryCounts: Record<DirectSupabaseExceptionCategory, number>;
    operationCounts: Record<DirectSupabaseOperation, number>;
  };
  exceptions: DirectSupabaseExceptionRegistryEntry[];
};

export type ComponentDebtEntry = {
  file: string;
  lineCount: number;
  hookCount: number;
};

export type ProductionRawLoopPattern = "while_true" | "for_ever";

export type ProductionRawLoopAllowlistEntry = {
  file: string;
  line: number;
  pattern: ProductionRawLoopPattern;
  reason: string;
  owner: string;
  testCoverage: string;
};

export type ProductionRawLoopFinding = {
  file: string;
  line: number;
  pattern: ProductionRawLoopPattern;
  matchedLoop: string;
  allowlisted: boolean;
  reason: string | null;
  owner: string | null;
  testCoverage: string | null;
};

export type UnboundedSelectAllowlistEntry = {
  file: string;
  line: number;
  queryString: string;
  action: "export_allowlist";
  owner: string;
  reason: string;
  migrationPath: string;
};

export type UnboundedSelectRatchetFinding = SelectInventoryEntry & {
  allowlisted: boolean;
  owner: string | null;
  allowlistReason: string | null;
  migrationPath: string | null;
  expected: string;
};

export type UnboundedSelectRatchetSummary = {
  unboundedSelectBudget: 0;
  selectStarBudget: 0;
  totalSelectCalls: number;
  unresolvedUnboundedSelects: number;
  selectStarFindings: number;
  exportAllowlistFindings: number;
  documentedExportAllowlistFindings: number;
  allowlistEntries: number;
  topFiles: readonly { file: string; count: number }[];
};

export type UnsafeCastPattern =
  | "as_any"
  | "ts_ignore"
  | "silent_catch"
  | "unsafe_unknown_as";

export type UnsafeCastScope = "production_source" | "test_source";

export type UnsafeCastAllowlistEntry = {
  file: string;
  line: number;
  pattern: UnsafeCastPattern;
  reason: string;
  owner: string;
  expiresAtLocalDate?: string;
  migrationWave?: string;
};

export type UnsafeCastFinding = {
  file: string;
  line: number;
  pattern: UnsafeCastPattern;
  matchedText: string;
  scope: UnsafeCastScope;
  criticalFolder: string | null;
  allowlisted: boolean;
  reason: string | null;
  owner: string | null;
  expiresAtLocalDate: string | null;
  migrationWave: string | null;
  expected: string;
};

export type UnsafeCastPatternCounts = Record<UnsafeCastPattern, number>;

export type UnsafeCastRatchetBaseline = {
  total: number;
  productionSource: number;
  testSource: number;
  byPattern: UnsafeCastPatternCounts;
  productionByPattern: UnsafeCastPatternCounts;
  testByPattern: UnsafeCastPatternCounts;
  criticalFolderByPattern: readonly {
    folder: string;
    byPattern: UnsafeCastPatternCounts;
  }[];
};

export type UnsafeCastRatchetSummary = {
  baseline: UnsafeCastRatchetBaseline;
  current: {
    total: number;
    productionSource: number;
    testSource: number;
    byPattern: UnsafeCastPatternCounts;
    productionByPattern: UnsafeCastPatternCounts;
    testByPattern: UnsafeCastPatternCounts;
    criticalFolderByPattern: readonly {
      folder: string;
      byPattern: UnsafeCastPatternCounts;
    }[];
  };
  allowlistedFindings: number;
  allowlistEntries: number;
  criticalFolderViolations: number;
  topFiles: readonly { file: string; count: number }[];
};

export type AiModelBoundarySummary = {
  aiModelGatewayPresent: boolean;
  aiModelTypesPresent: boolean;
  aiDisabledProviderPresent: boolean;
  aiLegacyGeminiProviderPresent: boolean;
  assistantClientUsesGateway: boolean;
  directGeminiImportsOutsideLegacyProvider: number;
  providerImplementationImportsFromUi: number;
  openAiLiveCallFindings: number;
  apiKeyClientFindings: number;
  aiReportsRedactionContractPresent: boolean;
  findings: readonly string[];
};

export type AiRoleRiskApprovalControlPlaneSummary = {
  rolePolicyPresent: boolean;
  riskPolicyPresent: boolean;
  screenCapabilityRegistryPresent: boolean;
  approvalGatePresent: boolean;
  professionalResponsePolicyPresent: boolean;
  assistantActionsUsesApprovalGate: boolean;
  assistantActionsDirectSubmitBlocked: boolean;
  directorFullAccessPolicyPresent: boolean;
  nonDirectorScopePresent: boolean;
  forbiddenActionsBlocked: boolean;
  approvalRequiredCannotExecuteDirectly: boolean;
  promptPolicyBuilderApplied: boolean;
  screenContextRedactionPresent: boolean;
  auditEventsPresent: boolean;
  screenGatewayImports: number;
  findings: readonly string[];
};

export type AiAppKnowledgeRegistrySummary = {
  aiKnowledgeTypesPresent: boolean;
  domainRegistryPresent: boolean;
  entityRegistryPresent: boolean;
  screenKnowledgeRegistryPresent: boolean;
  documentSourceRegistryPresent: boolean;
  intentRegistryPresent: boolean;
  knowledgeResolverPresent: boolean;
  knowledgeRedactionPresent: boolean;
  controlPlaneBridgePresent: boolean;
  assistantContextUsesKnowledgeResolver: boolean;
  assistantPromptsIncludeKnowledgePolicy: boolean;
  requiredScreenIdsRegistered: boolean;
  requiredDomainsRegistered: boolean;
  requiredDocumentSourcesRegistered: boolean;
  directorControlFullDomainKnowledgePresent: boolean;
  unknownRoleDenyByDefault: boolean;
  contractorOwnRecordsOnlyPresent: boolean;
  financeContextScopedFromNonFinanceRoles: boolean;
  noDirectHighRiskIntent: boolean;
  registryProviderImports: number;
  resolverNetworkOrDbQueries: number;
  screenGatewayImports: number;
  findings: readonly string[];
};

export type AiToolRegistryArchitectureSummary = {
  registryPresent: boolean;
  typesPresent: boolean;
  schemasPresent: boolean;
  allRequiredToolsRegistered: boolean;
  forbiddenToolsExcluded: boolean;
  allToolsHaveSchema: boolean;
  allToolsHaveRiskPolicy: boolean;
  allToolsHaveAuditMetadata: boolean;
  noLiveExecutionBoundary: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  findings: readonly string[];
};

export type AiToolReadBindingsArchitectureSummary = {
  bindingsPresent: boolean;
  allSafeReadToolsBound: boolean;
  nonSafeReadToolsExcluded: boolean;
  allBindingsReadOnly: boolean;
  allBindingsDisabledByDefault: boolean;
  noLiveExecutionBoundary: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  noMutationTerms: boolean;
  findings: readonly string[];
};

export type AiToolPlanPolicyArchitectureSummary = {
  policyPresent: boolean;
  plansAllRegisteredTools: boolean;
  blocksUnknownTools: boolean;
  requiresSafeReadBindings: boolean;
  directExecutionDisabled: boolean;
  mutationDisabled: boolean;
  providerCallsDisabled: boolean;
  dbAccessDisabled: boolean;
  noLiveExecutionBoundary: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  findings: readonly string[];
};

export type AgentBffRouteShellArchitectureSummary = {
  shellPresent: boolean;
  allRoutesPresent: boolean;
  authRequired: boolean;
  roleFilteredTools: boolean;
  forbiddenToolsHidden: boolean;
  mutationCountZero: boolean;
  previewNeverMutates: boolean;
  noLiveExecutionBoundary: boolean;
  noProviderImports: boolean;
  noDirectDatabaseAccess: boolean;
  findings: readonly string[];
};

export type AiCommandCenterTaskStreamRuntimeArchitectureSummary = {
  runtimeAdapterExists: boolean;
  taskStreamRouteExposed: boolean;
  commandCenterUsesRuntime: boolean;
  roleScopeExists: boolean;
  screenPolicyExists: boolean;
  evidenceRequirementExists: boolean;
  mutationCountZero: boolean;
  directMutationBlocked: boolean;
  submitForApprovalNoFinalExecution: boolean;
  noFakeCards: boolean;
  noHardcodedAiResponse: boolean;
  noSupabaseUiImport: boolean;
  noModelProviderUiImport: boolean;
  noRawPayloadFields: boolean;
  unknownRoleDenied: boolean;
  findings: readonly string[];
};

export type AiAppActionGraphArchitectureSummary = {
  appGraphFilesPresent: boolean;
  domainGraphFilesPresent: boolean;
  internalFirstPolicyPresent: boolean;
  externalIntelPolicyPresent: boolean;
  bffRoutesPresent: boolean;
  majorScreensRegistered: boolean;
  aiRelevantButtonsMapped: boolean;
  buttonCoverageScannerPresent: boolean;
  businessActionsHaveRiskPolicy: boolean;
  approvalRequiredCannotExecuteDirectly: boolean;
  forbiddenActionsHaveNoTool: boolean;
  externalSourcesRequireCitation: boolean;
  externalLiveFetchDisabled: boolean;
  externalFinalActionForbidden: boolean;
  noMobileExternalLiveFetch: boolean;
  noUiSupabaseGraphImport: boolean;
  noUiModelProviderGraphImport: boolean;
  noRawPayloadFields: boolean;
  mutationCountZero: boolean;
  findings: readonly string[];
};

export type AiProcurementContextEngineArchitectureSummary = {
  procurementFilesPresent: boolean;
  bffRoutesPresent: boolean;
  requestContextResolverPresent: boolean;
  internalFirstPolicyPresent: boolean;
  marketplaceSecondPolicyPresent: boolean;
  externalLiveFetchDisabled: boolean;
  externalCitationPolicyPresent: boolean;
  externalCheckedAtPolicyPresent: boolean;
  supplierMatchUsesSafeToolsOnly: boolean;
  supplierMatchNoFinalSelection: boolean;
  draftRequestDraftOnly: boolean;
  submitForApprovalNoFinalExecution: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  noUiSupabaseImport: boolean;
  noUiExternalFetch: boolean;
  noUiModelProviderImport: boolean;
  noRawOutputFields: boolean;
  noApprovalPersistenceFake: boolean;
  e2eRunnerPresent: boolean;
  e2eBoundedRealRequestDiscoveryPresent: boolean;
  e2eRequestDiscoveryNoSeedOrAdmin: boolean;
  findings: readonly string[];
};

export type AiExternalIntelGatewayArchitectureSummary = {
  gatewayFilesPresent: boolean;
  sourceRegistryPresent: boolean;
  disabledProviderDefault: boolean;
  providerFlagsPresent: boolean;
  internalFirstGatePresent: boolean;
  bffRouteContractPresent: boolean;
  procurementExternalCandidatesPresent: boolean;
  citationPolicyPresent: boolean;
  checkedAtPolicyPresent: boolean;
  externalLiveFetchDisabledByDefault: boolean;
  noMobileExternalFetch: boolean;
  noUiProviderImport: boolean;
  noRawHtmlToMobile: boolean;
  noSecretsInSourceOrArtifacts: boolean;
  noAuthAdminOrServiceRole: boolean;
  noMutationSurface: boolean;
  externalFinalActionForbidden: boolean;
  findings: readonly string[];
};

export type AiProcurementCopilotRuntimeChainArchitectureSummary = {
  copilotFilesPresent: boolean;
  bffRoutesPresent: boolean;
  planEnginePresent: boolean;
  internalFirstOrderPresent: boolean;
  marketplaceSecondPresent: boolean;
  externalStatusBridgePresent: boolean;
  externalLiveFetchDisabled: boolean;
  draftPreviewOnly: boolean;
  submitForApprovalPreviewOnly: boolean;
  supplierCardsRequireEvidence: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  noUiSupabaseImport: boolean;
  noUiExternalFetch: boolean;
  noUiModelProviderImport: boolean;
  noRawOutputFields: boolean;
  noHardcodedSupplierCards: boolean;
  noMutationSurface: boolean;
  e2eRunnerPresent: boolean;
  findings: readonly string[];
};

export type AiCrossScreenRuntimeMatrixArchitectureSummary = {
  runtimeFilesPresent: boolean;
  majorScreensRegistered: boolean;
  producerRegistryPresent: boolean;
  producersHaveRolePolicy: boolean;
  producersRequireEvidence: boolean;
  bffRoutesPresent: boolean;
  resolverValidatesScreenId: boolean;
  unknownRoleDenied: boolean;
  notMountedSupported: boolean;
  noProviderImports: boolean;
  noSupabaseImports: boolean;
  noUiSupabaseImport: boolean;
  noUiExternalFetch: boolean;
  noUiProviderImport: boolean;
  noRawPayloadFields: boolean;
  noFakeCards: boolean;
  noMutationSurface: boolean;
  contractorOwnRecordsOnly: boolean;
  e2eRunnerPresent: boolean;
  findings: readonly string[];
};

export type AiPersistentActionLedgerArchitectureSummary = {
  ledgerFilesPresent: boolean;
  migrationProposalPresent: boolean;
  auditStorageProposalPresent: boolean;
  rlsPolicyProposalPresent: boolean;
  rpcContractProposalPresent: boolean;
  lifecycleDbGuardProposalPresent: boolean;
  noServiceRoleGrantInLedgerBackend: boolean;
  bffRoutesPresent: boolean;
  submitForApprovalPersistsPending: boolean;
  getActionStatusReadsPersistedStatus: boolean;
  idempotencyRequired: boolean;
  auditRequired: boolean;
  evidenceRequired: boolean;
  lifecycleTransitionsEnforced: boolean;
  executeApprovedGatePresent: boolean;
  domainExecutorBlockedWhenMissing: boolean;
  noFakeLocalApproval: boolean;
  noDirectExecutionPath: boolean;
  noUiSupabaseImport: boolean;
  noUiModelProviderImport: boolean;
  noRawLedgerPayloadFields: boolean;
  e2eRunnerPresent: boolean;
  findings: readonly string[];
};

export type AiRoleScreenEmulatorGateSummary = {
  ensureAndroidEmulatorReadyPresent: boolean;
  maestroRunnerPresent: boolean;
  explicitRoleResolverPresent: boolean;
  e2eSecretRedactorPresent: boolean;
  e2eSuitePresent: boolean;
  emulatorArtifactPresent: boolean;
  fakePassClaimedFalse: boolean;
  allRequiredRoleFlowsRepresented: boolean;
  greenAllFlowsPassed: boolean;
  mutationsCreatedZero: boolean;
  approvalRequiredObserved: boolean;
  roleLeakageNotObserved: boolean;
  roleAuthSourceExplicit: boolean;
  noAuthDiscoveryGreenPath: boolean;
  noSupabaseResolver: boolean;
  credentialsNotInCliArgs: boolean;
  credentialsNotPrinted: boolean;
  stdoutStderrRedacted: boolean;
  blockedStatusHasExactReason: boolean;
  findings: readonly string[];
};

export type AiKnowledgePreviewE2eContractSummary = {
  deterministicPreviewPresent: boolean;
  roleMetadataIdsPresent: boolean;
  previewBounded: boolean;
  rawPromptBlockNotRenderedInUi: boolean;
  maestroFlowsUsePreviewIds: boolean;
  maestroFlowsDoNotAssertPromptBlock: boolean;
  llmSmokeResponseElementOnly: boolean;
  noFakeAiAnswer: boolean;
  noAuthDiscoveryInRunner: boolean;
  credentialsAbsentFromYaml: boolean;
  findings: readonly string[];
};

export type AiResponseSmokeNonBlockingContractSummary = {
  loadingTestIdPresent: boolean;
  loadingBubbleReal: boolean;
  releaseFlowsDelegatePromptProof: boolean;
  releaseFlowsDoNotRequireResponse: boolean;
  runnerSeparatesReleaseAndResponseSmoke: boolean;
  runnerObservesLoadingOrResponse: boolean;
  responseTimeoutCanaryNonBlocking: boolean;
  noExactLlmTextAssertion: boolean;
  noFakeAiAnswer: boolean;
  noAuthDiscoveryInRunner: boolean;
  credentialsAbsentFromYaml: boolean;
  findings: readonly string[];
};

export type AndroidEmulatorIosBuildSubmitGateSummary = {
  androidApkProfilePresent: boolean;
  iosAppStoreSubmitProfilePresent: boolean;
  releaseRunnerPresent: boolean;
  releaseRedactorPresent: boolean;
  androidRuntimeSmokeFlowPresent: boolean;
  releaseArtifactsPresent: boolean;
  androidUsesApkForEmulator: boolean;
  androidPlaySubmitAbsent: boolean;
  iosSimulatorSubmitBlocked: boolean;
  iosSubmitProfileUsed: boolean;
  productionOtaAbsent: boolean;
  credentialsNotInCliArgs: boolean;
  secretsNotInArtifacts: boolean;
  aiRoleE2eExplicitSecretsOnly: boolean;
  fakePassClaimsAbsent: boolean;
  findings: readonly string[];
};

export type PostInstallReleaseSignoffGateSummary = {
  androidVerifierPresent: boolean;
  iosVerifierPresent: boolean;
  signoffArtifactsPresent: boolean;
  androidRuntimeSmokeProven: boolean;
  iosSubmitStatusProven: boolean;
  aiRoleE2eExplicitSecretsOnly: boolean;
  credentialsNotInCliArgs: boolean;
  secretsNotInArtifacts: boolean;
  productionOtaAbsent: boolean;
  androidPlaySubmitAbsent: boolean;
  fakePassClaimsAbsent: boolean;
  findings: readonly string[];
};

export type ArchitectureGuardrailCheck = {
  name: string;
  status: GuardrailStatus;
  errors: string[];
};

export type ArchitectureAntiRegressionReport = {
  final_status: "GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED" | "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED";
  directSupabase: {
    serviceBypassBudget: number;
    totalFindings: number;
    serviceBypassFindings: number;
    serviceBypassFiles: number;
    transportControlledFindings: number;
    testOnlyFindings: number;
    generatedOrIgnoredFindings: number;
    topServiceBypassFiles: readonly { file: string; count: number }[];
  };
  directSupabaseExceptionContainment: {
    registryPath: string;
    registryLoaded: boolean;
    registryEntries: number;
    currentServiceBypassFindings: number;
    allowedCurrentFindings: number;
    unclassifiedCurrentFindings: number;
    disallowedCurrentFindings: number;
    categoryCounts: Record<DirectSupabaseExceptionCategory, number>;
    operationCounts: Record<DirectSupabaseOperation, number>;
  };
  productionReadonlyCanary: {
    whitelistRouteCount: number;
    forbiddenMutationOperationCount: number;
    redactionForbiddenKeysEnforced: boolean;
  };
  cacheRateScope: {
    cacheCanaryRouteScoped: boolean;
    cacheAllowedRoute: string;
    rateLimitCanaryRoute: string;
    rateLimitCanaryPercent: number;
    persistentReadinessContractLocked: boolean;
    persistentReadinessKeyCanonical: boolean;
    readThroughLiteralKeyUsageLocked: boolean;
  };
  cacheColdMissProof: {
    proofTestPresent: boolean;
    matrixArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    deterministicProofReady: boolean;
    knownEmptyKeyProof: boolean;
    firstMissSecondHitProof: boolean;
    utf8SafeProof: boolean;
    metricsRedactedProof: boolean;
    routeScopeUnchanged: boolean;
    rollbackSafeProof: boolean;
    productionCacheStillDisabled: boolean;
  };
  rateLimitMarketplaceCanaryProof: {
    matrixArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    routeScoped: boolean;
    selectedSubjectProof: boolean;
    nonSelectedSubjectProof: boolean;
    privateSmokeProof: boolean;
    healthReadyStable: boolean;
    redactedProof: boolean;
    canaryRetained: boolean;
  };
  rateLimitMarketplace5PctCanaryProof: {
    matrixArtifactPresent: boolean;
    monitorArtifactPresent: boolean;
    metricsArtifactPresent: boolean;
    proofArtifactPresent: boolean;
    matrixStatus: string;
    monitorStatus: string;
    routeScoped: boolean;
    selectedSubjectProof: boolean;
    nonSelectedSubjectProof: boolean;
    privateSmokeProof: boolean;
    wouldAllowProof: boolean;
    wouldThrottleProof: boolean;
    falsePositiveCountZero: boolean;
    healthStable: boolean;
    redactedProof: boolean;
    monitorStable: boolean;
  };
  productionRawLoops: {
    rawLoopBudget: 0;
    totalFindings: number;
    unapprovedFindings: number;
    allowlistedFindings: number;
    allowlistEntries: number;
    topFiles: readonly { file: string; count: number }[];
  };
  unboundedSelectRatchet: UnboundedSelectRatchetSummary;
  unsafeCastRatchet: UnsafeCastRatchetSummary;
  flatListTuningRegression: FlatListTuningRegressionSummary;
  errorHandlingGapRatchet: ErrorHandlingGapRatchetSummary;
  aiModelBoundary: AiModelBoundarySummary;
  aiRoleRiskApprovalControlPlane: AiRoleRiskApprovalControlPlaneSummary;
  aiAppKnowledgeRegistry: AiAppKnowledgeRegistrySummary;
  aiToolRegistryArchitecture: AiToolRegistryArchitectureSummary;
  aiToolReadBindingsArchitecture: AiToolReadBindingsArchitectureSummary;
  aiToolPlanPolicyArchitecture: AiToolPlanPolicyArchitectureSummary;
  agentBffRouteShellArchitecture: AgentBffRouteShellArchitectureSummary;
  aiCommandCenterTaskStreamRuntime: AiCommandCenterTaskStreamRuntimeArchitectureSummary;
  aiAppActionGraphArchitecture: AiAppActionGraphArchitectureSummary;
  aiProcurementContextEngine: AiProcurementContextEngineArchitectureSummary;
  aiExternalIntelGateway: AiExternalIntelGatewayArchitectureSummary;
  aiProcurementCopilotRuntimeChain: AiProcurementCopilotRuntimeChainArchitectureSummary;
  aiCrossScreenRuntimeMatrix: AiCrossScreenRuntimeMatrixArchitectureSummary;
  aiPersistentActionLedger: AiPersistentActionLedgerArchitectureSummary;
  aiKnowledgePreviewE2eContract: AiKnowledgePreviewE2eContractSummary;
  aiResponseSmokeNonBlockingContract: AiResponseSmokeNonBlockingContractSummary;
  aiRoleScreenEmulatorGate: AiRoleScreenEmulatorGateSummary;
  aiExplicitRoleSecretsE2eGate: AiRoleScreenEmulatorGateSummary;
  androidEmulatorIosBuildSubmitGate: AndroidEmulatorIosBuildSubmitGateSummary;
  postInstallReleaseSignoffGate: PostInstallReleaseSignoffGateSummary;
  componentDebt: {
    reportOnly: true;
    godComponentLineThreshold: number;
    hookPressureThreshold: number;
    godComponentCount: number;
    hookPressureComponentCount: number;
    topByLines: readonly ComponentDebtEntry[];
    topByHooks: readonly ComponentDebtEntry[];
  };
  checks: readonly ArchitectureGuardrailCheck[];
  safety: {
    productionCalls: false;
    dbWrites: false;
    migrations: false;
    supabaseProjectChanges: false;
    envChanges: false;
    secretsPrinted: false;
  };
};

type ReadFile = (relativePath: string) => string;

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([
  ".expo",
  ".git",
  "artifacts",
  "coverage",
  "diagnostics",
  "migrated",
  "node_modules",
]);

const DIRECT_SUPABASE_SERVICE_BYPASS_BUDGET = 0;
const DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH =
  "artifacts/S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT_registry.json";
const GOD_COMPONENT_LINE_THRESHOLD = 500;
const HOOK_PRESSURE_THRESHOLD = 25;
const CACHE_RATE_ALLOWED_ROUTE = "marketplace.catalog.search";
const RATE_LIMIT_ALLOWED_PERCENT = 1;
const RATE_LIMIT_5PCT_ALLOWED_PERCENT = 5;
const CACHE_COLD_MISS_PROOF_TEST_PATH = "tests/scale/cacheColdMissDeterministicProof.test.ts";
const CACHE_COLD_MISS_MATRIX_PATH = "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json";
const CACHE_COLD_MISS_PROOF_PATH = "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_proof.md";
const CACHE_COLD_MISS_READY_STATUS = "GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY";
const RATE_LIMIT_MARKETPLACE_CANARY_MATRIX_PATH =
  "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_matrix.json";
const RATE_LIMIT_MARKETPLACE_CANARY_PROOF_PATH =
  "artifacts/S_RATE_01_MARKETPLACE_SEARCH_1_PERCENT_CANARY_proof.md";
const RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS = "GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS";
const RATE_LIMIT_MARKETPLACE_5PCT_MATRIX_PATH =
  "artifacts/S_NIGHT_RATE_27B_5PCT_MARKETPLACE_RAMP_RETRY_matrix.json";
const RATE_LIMIT_MARKETPLACE_5PCT_PROOF_PATH =
  "artifacts/S_NIGHT_RATE_27B_5PCT_MARKETPLACE_RAMP_RETRY_proof.md";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_MATRIX_PATH =
  "artifacts/S_NIGHT_RATE_28_5PCT_MONITOR_WINDOW_matrix.json";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_METRICS_PATH =
  "artifacts/S_NIGHT_RATE_28_5PCT_MONITOR_WINDOW_metrics.json";
const RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS = "GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE";
const RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_PASS_STATUS = "GREEN_RATE_LIMIT_5PCT_MONITOR_WINDOW_STABLE";
const ROOT_SUPABASE_CLIENT_PATH = "src/lib/supabaseClient.ts";
const AI_MODEL_GATEWAY_PATH = "src/features/ai/model/AiModelGateway.ts";
const AI_MODEL_TYPES_PATH = "src/features/ai/model/AiModelTypes.ts";
const AI_DISABLED_PROVIDER_PATH = "src/features/ai/model/DisabledModelProvider.ts";
const AI_LEGACY_GEMINI_PROVIDER_PATH = "src/features/ai/model/LegacyGeminiModelProvider.ts";
const AI_ASSISTANT_CLIENT_PATH = "src/features/ai/assistantClient.ts";
const AI_ASSISTANT_SCREEN_PATH = "src/features/ai/AIAssistantScreen.tsx";
const AI_ASSISTANT_SCREEN_STYLES_PATH = "src/features/ai/AIAssistantScreen.styles.ts";
const AI_COMMAND_CENTER_FILES = [
  "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  "src/features/ai/commandCenter/AiCommandCenterTypes.ts",
  "src/features/ai/commandCenter/AiCommandCenterCards.tsx",
  "src/features/ai/commandCenter/AiCommandCenterActions.tsx",
  "src/features/ai/commandCenter/useAiCommandCenterData.ts",
  "src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts",
] as const;
const AI_TASK_STREAM_RUNTIME_FILES = [
  "src/features/ai/taskStream/aiTaskStreamRuntime.ts",
  "src/features/ai/taskStream/aiTaskStreamRuntimeTypes.ts",
  "src/features/ai/taskStream/aiTaskStreamEvidence.ts",
  "src/features/ai/taskStream/aiTaskStreamCardProducers.ts",
] as const;
const AI_APP_ACTION_GRAPH_FILES = [
  "src/features/ai/appGraph/aiAppActionTypes.ts",
  "src/features/ai/appGraph/aiScreenActionRegistry.ts",
  "src/features/ai/appGraph/aiButtonActionRegistry.ts",
  "src/features/ai/appGraph/aiActionGraphResolver.ts",
  "src/features/ai/appGraph/aiActionGraphEvidence.ts",
  "src/features/ai/appGraph/aiActionGraphRedaction.ts",
] as const;
const AI_DOMAIN_GRAPH_FILES = [
  "src/features/ai/domainGraph/aiDomainEntityTypes.ts",
  "src/features/ai/domainGraph/aiDomainEntityRegistry.ts",
  "src/features/ai/domainGraph/aiDomainRelationshipRegistry.ts",
  "src/features/ai/domainGraph/aiDomainGraphResolver.ts",
] as const;
const AI_INTERNAL_FIRST_POLICY_PATH = "src/features/ai/intelligence/internalFirstPolicy.ts";
const AI_EXTERNAL_INTEL_FILES = [
  "src/features/ai/externalIntel/externalIntelTypes.ts",
  "src/features/ai/externalIntel/externalSourceRegistry.ts",
  "src/features/ai/externalIntel/externalIntelPolicy.ts",
  "src/features/ai/externalIntel/externalIntelResolver.ts",
  "src/features/ai/externalIntel/externalIntelRedaction.ts",
  "src/features/ai/externalIntel/externalIntelProviderFlags.ts",
  "src/features/ai/externalIntel/externalIntelProvider.ts",
  "src/features/ai/externalIntel/DisabledExternalIntelProvider.ts",
  "src/features/ai/externalIntel/ExternalIntelGateway.ts",
  "src/features/ai/externalIntel/internalFirstExternalGate.ts",
] as const;
const AI_PROCUREMENT_CONTEXT_ENGINE_FILES = [
  "src/features/ai/procurement/procurementContextTypes.ts",
  "src/features/ai/procurement/procurementRequestContextResolver.ts",
  "src/features/ai/procurement/procurementInternalFirstEngine.ts",
  "src/features/ai/procurement/procurementSupplierMatchEngine.ts",
  "src/features/ai/procurement/procurementDraftPlanBuilder.ts",
  "src/features/ai/procurement/procurementEvidenceBuilder.ts",
  "src/features/ai/procurement/procurementRedaction.ts",
] as const;
const AI_PROCUREMENT_COPILOT_RUNTIME_CHAIN_FILES = [
  "src/features/ai/procurementCopilot/procurementCopilotTypes.ts",
  "src/features/ai/procurementCopilot/procurementCopilotPlanEngine.ts",
  "src/features/ai/procurementCopilot/procurementCopilotEvidence.ts",
  "src/features/ai/procurementCopilot/procurementCopilotDraftBridge.ts",
  "src/features/ai/procurementCopilot/procurementCopilotExternalBridge.ts",
  "src/features/ai/procurementCopilot/procurementCopilotRedaction.ts",
  "src/features/ai/procurementCopilot/procurementCopilotActionPolicy.ts",
] as const;
const AI_SCREEN_RUNTIME_FILES = [
  "src/features/ai/screenRuntime/aiScreenRuntimeTypes.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeRegistry.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeResolver.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeEvidence.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeRedaction.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeActionPolicy.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeBff.ts",
  "src/features/ai/screenRuntime/aiScreenRuntimeProducers.ts",
] as const;
const AI_ACTION_LEDGER_FILES = [
  "src/features/ai/actionLedger/aiActionLedgerTypes.ts",
  "src/features/ai/actionLedger/aiActionLedgerPolicy.ts",
  "src/features/ai/actionLedger/aiActionLedgerRedaction.ts",
  "src/features/ai/actionLedger/aiActionLedgerEvidence.ts",
  "src/features/ai/actionLedger/aiActionLedgerAudit.ts",
  "src/features/ai/actionLedger/aiActionLedgerRepository.ts",
  "src/features/ai/actionLedger/aiActionLedgerBff.ts",
  "src/features/ai/actionLedger/executeApprovedAiAction.ts",
] as const;
const AI_ACTION_LEDGER_MIGRATION_PATH =
  "supabase/migrations/20260512120000_ai_action_ledger.sql";
const AI_ACTION_LEDGER_AUDIT_RLS_MIGRATION_PATH =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";
const AI_PROCUREMENT_E2E_RUNNER_PATH = "scripts/e2e/runAiProcurementContextMaestro.ts";
const AI_PROCUREMENT_E2E_REQUEST_RESOLVER_PATH =
  "scripts/e2e/resolveAiProcurementRuntimeRequest.ts";
const AI_EXTERNAL_INTEL_E2E_RUNNER_PATH =
  "scripts/e2e/runAiProcurementExternalIntelMaestro.ts";
const AI_PROCUREMENT_COPILOT_E2E_RUNNER_PATH =
  "scripts/e2e/runAiProcurementCopilotMaestro.ts";
const AI_CROSS_SCREEN_RUNTIME_E2E_RUNNER_PATH =
  "scripts/e2e/runAiCrossScreenRuntimeMaestro.ts";
const AI_APPROVAL_ACTION_LEDGER_E2E_RUNNER_PATH =
  "scripts/e2e/runAiApprovalActionLedgerMaestro.ts";
const AI_APP_ACTION_GRAPH_COVERAGE_SCANNER_PATH = "scripts/ai/scanAppActionGraphCoverage.ts";
const AI_REPORTS_SERVICE_PATH = "src/lib/ai_reports.ts";
const AI_ROLE_POLICY_PATH = "src/features/ai/policy/aiRolePolicy.ts";
const AI_RISK_POLICY_PATH = "src/features/ai/policy/aiRiskPolicy.ts";
const AI_SCREEN_REGISTRY_PATH = "src/features/ai/policy/aiScreenCapabilityRegistry.ts";
const AI_APPROVAL_GATE_PATH = "src/features/ai/approval/aiApprovalGate.ts";
const AI_PROFESSIONAL_RESPONSE_POLICY_PATH = "src/features/ai/policy/aiProfessionalResponsePolicy.ts";
const AI_ASSISTANT_ACTIONS_PATH = "src/features/ai/assistantActions.ts";
const AI_ASSISTANT_PROMPTS_PATH = "src/features/ai/assistantPrompts.ts";
const AI_ASSISTANT_SCOPE_CONTEXT_PATH = "src/features/ai/assistantScopeContext.ts";
const AI_CONTEXT_REDACTION_PATH = "src/features/ai/context/aiContextRedaction.ts";
const AI_AUDIT_EVENT_TYPES_PATH = "src/features/ai/audit/aiActionAuditTypes.ts";
const AI_KNOWLEDGE_TYPES_PATH = "src/features/ai/knowledge/aiKnowledgeTypes.ts";
const AI_DOMAIN_KNOWLEDGE_REGISTRY_PATH = "src/features/ai/knowledge/aiDomainKnowledgeRegistry.ts";
const AI_ENTITY_REGISTRY_PATH = "src/features/ai/knowledge/aiEntityRegistry.ts";
const AI_SCREEN_KNOWLEDGE_REGISTRY_PATH = "src/features/ai/knowledge/aiScreenKnowledgeRegistry.ts";
const AI_DOCUMENT_SOURCE_REGISTRY_PATH = "src/features/ai/knowledge/aiDocumentSourceRegistry.ts";
const AI_INTENT_REGISTRY_PATH = "src/features/ai/knowledge/aiIntentRegistry.ts";
const AI_KNOWLEDGE_RESOLVER_PATH = "src/features/ai/knowledge/aiKnowledgeResolver.ts";
const AI_KNOWLEDGE_REDACTION_PATH = "src/features/ai/knowledge/aiKnowledgeRedaction.ts";
const AI_CONTROL_PLANE_KNOWLEDGE_BRIDGE_PATH = "src/features/ai/controlPlane/aiControlPlaneKnowledgeBridge.ts";
const AI_TOOL_REGISTRY_PATH = "src/features/ai/tools/aiToolRegistry.ts";
const AI_TOOL_TYPES_PATH = "src/features/ai/tools/aiToolTypes.ts";
const AI_TOOL_SCHEMAS_PATH = "src/features/ai/schemas/aiToolSchemas.ts";
const AI_TOOL_READ_BINDINGS_PATH = "src/features/ai/tools/aiToolReadBindings.ts";
const AI_TOOL_PLAN_POLICY_PATH = "src/features/ai/tools/aiToolPlanPolicy.ts";
const AGENT_BFF_ROUTE_SHELL_PATH = "src/features/ai/agent/agentBffRouteShell.ts";
const REQUIRED_AI_TOOL_NAMES = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
] as const;
const FORBIDDEN_AI_TOOL_NAMES = [
  "create_order",
  "confirm_supplier",
  "change_warehouse_status",
  "change_payment_status",
  "direct_supabase_query",
  "raw_db_export",
  "delete_data",
  "bypass_approval",
  "expose_secrets",
] as const;
const REQUIRED_AI_TOOL_METADATA_KEYS = [
  "name",
  "description",
  "domain",
  "riskLevel",
  "inputSchema",
  "outputSchema",
  "requiredRoles",
  "approvalRequired",
  "idempotencyRequired",
  "auditEvent",
  "rateLimitScope",
  "cacheAllowed",
  "evidenceRequired",
] as const;
const REQUIRED_AI_SAFE_READ_TOOL_NAMES = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "get_action_status",
] as const;
const NON_SAFE_READ_TOOL_NAMES = [
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
] as const;
const REQUIRED_AI_APP_KNOWLEDGE_DOMAINS = [
  "control",
  "projects",
  "procurement",
  "marketplace",
  "warehouse",
  "finance",
  "reports",
  "documents",
  "subcontracts",
  "contractors",
  "map",
  "chat",
  "office",
] as const;
const REQUIRED_AI_APP_KNOWLEDGE_SCREENS = [
  "director.dashboard",
  "director.reports_modal",
  "buyer.main",
  "buyer.subcontracts",
  "market.home",
  "accountant.main",
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
  "contractor.main",
  "office.hub",
  "map.main",
  "chat.main",
  "reports.modal",
  "warehouse.main",
] as const;
const REQUIRED_AI_APP_KNOWLEDGE_DOCUMENT_SOURCES = [
  "director_reports",
  "foreman_daily_reports",
  "ai_reports",
  "acts",
  "subcontract_documents",
  "request_documents",
  "warehouse_documents",
  "finance_documents",
  "chat_attachments",
  "pdf_exports",
] as const;
const REQUIRED_AI_APP_KNOWLEDGE_INTENTS = [
  "find",
  "summarize",
  "compare",
  "explain",
  "draft",
  "prepare_report",
  "prepare_act",
  "prepare_request",
  "check_status",
  "find_risk",
  "submit_for_approval",
  "approve",
  "execute_approved",
] as const;
const AI_EMULATOR_BOOTSTRAP_RUNNER_PATH = "scripts/e2e/ensureAndroidEmulatorReady.ts";
const AI_ROLE_SCREEN_MAESTRO_RUNNER_PATH = "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts";
const AI_EXPLICIT_ROLE_AUTH_RESOLVER_PATH = "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts";
const AI_E2E_SECRET_REDACTOR_PATH = "scripts/e2e/redactE2eSecrets.ts";
const AI_ROLE_SCREEN_EMULATOR_ARTIFACT_PATH =
  "artifacts/S_AI_CORE_03B_EXPLICIT_ROLE_SECRETS_E2E_emulator.json";
const REQUIRED_AI_ROLE_SCREEN_FLOW_FILES = [
  "tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/foreman-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/buyer-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/accountant-knowledge.yaml",
  "tests/e2e/ai-role-screen-knowledge/contractor-knowledge.yaml",
] as const;
const REQUIRED_AI_ROLE_SCREEN_FLOW_KEYS = [
  "director",
  "foreman",
  "buyer",
  "accountant",
  "contractor",
] as const;
const ALLOWED_AI_ROLE_SCREEN_EMULATOR_BLOCKED_STATUSES = [
  "BLOCKED_NO_E2E_ROLE_SECRETS",
  "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS",
  "BLOCKED_AI_KNOWLEDGE_PREVIEW_NOT_ACCESSIBLE_IN_ANDROID_HIERARCHY",
  "BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE",
  "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT",
  "BLOCKED_AI_ROLE_SCREEN_ASSERTION_FAILED",
  "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
] as const;
const RELEASE_ANDROID_IOS_RUNNER_PATH = "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts";
const RELEASE_OUTPUT_REDACTOR_PATH = "scripts/release/redactReleaseOutput.ts";
const RELEASE_ANDROID_RUNTIME_SMOKE_PATH = "maestro/flows/foundation/launch-and-login-screen.yaml";
const RELEASE_CORE_01_MATRIX_PATH =
  "artifacts/S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_matrix.json";
const RELEASE_CORE_01_ANDROID_PATH =
  "artifacts/S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_android.json";
const RELEASE_CORE_01_IOS_PATH =
  "artifacts/S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_ios.json";
const RELEASE_CORE_01_INVENTORY_PATH =
  "artifacts/S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT_inventory.json";
const POST_INSTALL_ANDROID_VERIFIER_PATH = "scripts/release/verifyAndroidInstalledBuildRuntime.ts";
const POST_INSTALL_IOS_VERIFIER_PATH = "scripts/release/verifyIosBuildSubmitStatus.ts";
const POST_INSTALL_MATRIX_PATH = "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json";
const POST_INSTALL_ANDROID_PATH = "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_android.json";
const POST_INSTALL_IOS_PATH = "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_ios.json";
const POST_INSTALL_AI_E2E_PATH = "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_ai_e2e.json";
const POST_INSTALL_INVENTORY_PATH = "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_inventory.json";
const DIRECT_SUPABASE_EXPECTED_TRANSPORT_OWNER =
  "src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)";
const DIRECT_SUPABASE_CALL_REGEX =
  /\b(?:supabase(?:Client|Admin)?|params\.supabase|deps\.supabase|args\.supabase)\s*\.\s*(auth|storage|from|rpc|channel|removeChannel|getChannels|realtime)\b/g;
const PRODUCTION_RAW_LOOP_BUDGET = 0;
const PRODUCTION_RAW_LOOP_EXPECTED_OWNER =
  "cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage";
const PRODUCTION_RAW_LOOP_ALLOWLIST: readonly ProductionRawLoopAllowlistEntry[] = [];
const UNBOUNDED_SELECT_BUDGET = 0;
const SELECT_STAR_BUDGET = 0;
const UNBOUNDED_SELECT_EXPECTED =
  "lookup uses single/maybeSingle; existence uses select(\"id\").limit(1); list/reference uses range/limit/page-through; export allowlist has owner, reason, and migration path";
const UNBOUNDED_SELECT_EXPORT_ALLOWLIST: readonly UnboundedSelectAllowlistEntry[] = [
  {
    file: "src/lib/api/director_reports.naming.ts",
    line: 493,
    queryString: "selectCols",
    action: "export_allowlist",
    owner: "director reports export owner",
    reason: "Dynamic report naming export selects the complete chosen report column set for output completeness.",
    migrationPath: "Move report naming exports behind a typed RPC/view contract with an explicit projection manifest.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 186,
    queryString: "id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF line export needs the full selected item projection to preserve rendered document contents.",
    migrationPath: "Move proposal PDF item reads behind a typed PDF-source RPC or view with a versioned output contract.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 198,
    queryString: "id, request_id, name_human, uom, qty, app_code, rik_code",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF request-item fallback needs the selected item projection to preserve rendered document contents.",
    migrationPath: "Move proposal PDF request-item reads behind a typed PDF-source RPC or view with a versioned output contract.",
  },
  {
    file: "src/lib/api/pdf_proposal.ts",
    line: 292,
    queryString: "app_code,name_human",
    action: "export_allowlist",
    owner: "proposal PDF export owner",
    reason: "Proposal PDF app-name lookup preserves legacy document labeling for exported proposal rows.",
    migrationPath: "Fold app-name lookup into the typed proposal PDF-source RPC/view contract.",
  },
  {
    file: "src/lib/pdf/pdf.builder.ts",
    line: 304,
    queryString: "id, display_no",
    action: "export_allowlist",
    owner: "PDF builder export owner",
    reason: "PDF builder needs request display identity for generated document metadata.",
    migrationPath: "Move request display identity into the typed PDF builder source contract.",
  },
  {
    file: "src/screens/contractor/contractor.pdfService.ts",
    line: 205,
    queryString: "mat_code, uom_mat, qty_fact",
    action: "export_allowlist",
    owner: "contractor PDF export owner",
    reason: "Contractor PDF material rows preserve rendered work-progress document contents.",
    migrationPath: "Move contractor PDF material rows behind a typed PDF-source RPC/view contract.",
  },
  {
    file: "src/screens/contractor/contractor.pdfService.ts",
    line: 216,
    queryString: "rik_code, name_human_ru, name_human, uom_code",
    action: "export_allowlist",
    owner: "contractor PDF export owner",
    reason: "Contractor PDF catalog lookup preserves legacy material labels for exported progress rows.",
    migrationPath: "Fold contractor PDF catalog labels into the typed PDF-source RPC/view contract.",
  },
];
const UNSAFE_CAST_SCAN_ROOTS = ["src", "app", "tests"] as const;
const UNSAFE_CAST_EXPECTED =
  "typed DTO, runtime guard, typed adapter, or documented allowlist with file, line, reason, owner, and expiration/migration wave";
const UNSAFE_CAST_ALLOWLIST: readonly UnsafeCastAllowlistEntry[] = [];
const UNSAFE_CAST_CRITICAL_FOLDERS = [
  "src/lib/api",
  "src/lib/auth",
  "src/lib/transport",
  "src/lib/workers",
] as const;
const emptyUnsafeCastPatternCounts = (): UnsafeCastPatternCounts => ({
  as_any: 0,
  ts_ignore: 0,
  silent_catch: 0,
  unsafe_unknown_as: 0,
});
const UNSAFE_CAST_RATCHET_BASELINE: UnsafeCastRatchetBaseline = {
  total: 189,
  productionSource: 46,
  testSource: 143,
  byPattern: {
    as_any: 25,
    ts_ignore: 6,
    silent_catch: 15,
    unsafe_unknown_as: 143,
  },
  productionByPattern: {
    as_any: 0,
    ts_ignore: 0,
    silent_catch: 0,
    unsafe_unknown_as: 46,
  },
  testByPattern: {
    as_any: 25,
    ts_ignore: 6,
    silent_catch: 15,
    unsafe_unknown_as: 97,
  },
  criticalFolderByPattern: [
    {
      folder: "src/lib/api",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 24,
      },
    },
    {
      folder: "src/lib/auth",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
    {
      folder: "src/lib/transport",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
    {
      folder: "src/lib/workers",
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
    },
  ],
};

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const relativeProjectPath = (projectRoot: string, filePath: string): string =>
  normalizePath(path.relative(projectRoot, filePath));

function listSourceFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

const isTestPath = (normalizedPath: string): boolean =>
  /\.test\.[tj]sx?$/.test(normalizedPath) ||
  /\.spec\.[tj]sx?$/.test(normalizedPath) ||
  normalizedPath.includes("/__tests__/");

export const classifyDirectSupabaseTransportOwner = (
  normalizedPath: string,
): DirectSupabaseTransportOwner => {
  const filePath = normalizePath(normalizedPath);
  if (isTestPath(filePath)) return "test_file";
  if (filePath.endsWith(".d.ts") || filePath.includes("/types/contracts/")) {
    return "generated_or_ignored";
  }
  if (filePath === ROOT_SUPABASE_CLIENT_PATH || filePath.endsWith(`/${ROOT_SUPABASE_CLIENT_PATH}`)) {
    return "root_client";
  }
  if (filePath.includes(".transport.")) return "transport_file";
  if (filePath.includes(".bff.")) return "bff_client";
  if (filePath.includes("/server/")) return "server_file";
  return "none";
};

export const describeDirectSupabaseExpectedTransportOwner = (
  normalizedPath: string,
): string => {
  const owner = classifyDirectSupabaseTransportOwner(normalizedPath);
  if (owner === "root_client") return "root client initializer src/lib/supabaseClient.ts";
  if (owner === "transport_file") return "transport-owned file (*.transport.*)";
  if (owner === "bff_client") return "transport-owned BFF client file (*.bff.*)";
  if (owner === "server_file") return "transport-owned server file (/server/)";
  if (owner === "test_file") return "test-only file";
  if (owner === "generated_or_ignored") return "generated or ignored contract file";
  return DIRECT_SUPABASE_EXPECTED_TRANSPORT_OWNER;
};

const classifyDirectSupabasePath = (normalizedPath: string): DirectSupabaseFindingClass => {
  const transportOwner = classifyDirectSupabaseTransportOwner(normalizedPath);
  if (transportOwner === "test_file") return "test_only";
  if (transportOwner === "generated_or_ignored") return "generated_or_ignored";
  if (transportOwner !== "none") {
    return "transport_controlled";
  }
  return "service_bypass";
};

const classifyDirectSupabaseOperation = (
  operationToken: string,
  lineText: string,
): DirectSupabaseOperation => {
  if (operationToken === "auth") return "auth";
  if (operationToken === "storage") return "storage";
  if (operationToken === "rpc") return "rpc";
  if (
    operationToken === "channel" ||
    operationToken === "removeChannel" ||
    operationToken === "getChannels" ||
    operationToken === "realtime"
  ) {
    return "realtime";
  }
  if (/\.(insert|update|upsert|delete)\s*\(/.test(lineText)) return "write";
  return "read";
};

const riskForOperation = (operation: DirectSupabaseOperation): DirectSupabaseFinding["risk"] => {
  if (operation === "read") return "medium";
  return "high";
};

const suggestedMigrationPathForOperation = (operation: DirectSupabaseOperation): string => {
  if (operation === "auth") return "auth/session boundary or existing authenticated BFF client";
  if (operation === "storage") return "typed storage service boundary with redacted diagnostics";
  if (operation === "realtime") return "owned realtime lifecycle boundary";
  if (operation === "read" || operation === "rpc") return "existing readonly BFF/transport boundary";
  return "typed mutation boundary with idempotency and rollback proof";
};

const firstStringArg = (methodName: string, lineText: string): string | null => {
  const escapedMethod = methodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\.${escapedMethod}\\s*\\(\\s*["']([^"']+)["']`).exec(lineText);
  return match?.[1] ?? null;
};

const extractDirectSupabaseCallTarget = (
  operationToken: string,
  lineText: string,
): string => {
  if (operationToken === "rpc") return `rpc:${firstStringArg("rpc", lineText) ?? "dynamic"}`;
  if (operationToken === "from") return `table:${firstStringArg("from", lineText) ?? "dynamic"}`;
  if (operationToken === "auth") {
    const match = /\.auth\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `auth:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "storage") {
    const match = /\.storage\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `storage:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "realtime") {
    const match = /\.realtime\s*\.\s*([A-Za-z0-9_]+)\s*\(/.exec(lineText);
    return `realtime:${match?.[1] ?? "unknown"}`;
  }
  if (operationToken === "channel") return "realtime:channel";
  if (operationToken === "removeChannel") return "realtime:removeChannel";
  if (operationToken === "getChannels") return "realtime:getChannels";
  return "unknown:direct_supabase";
};

const formatMatchedDirectSupabaseCall = (
  matchedMethod: string,
  callTarget: string,
): string => `${matchedMethod.replace(/\s+/g, "")} (${callTarget})`;

export function scanDirectSupabaseSource(params: {
  filePath: string;
  source: string;
}): DirectSupabaseFinding[] {
  const normalizedPath = normalizePath(params.filePath);
  const classification = classifyDirectSupabasePath(normalizedPath);
  const transportOwner = classifyDirectSupabaseTransportOwner(normalizedPath);
  const expectedTransportOwner = describeDirectSupabaseExpectedTransportOwner(normalizedPath);
  const findings: DirectSupabaseFinding[] = [];
  const lines = params.source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index] ?? "";
    const matches = lineText.matchAll(DIRECT_SUPABASE_CALL_REGEX);
    for (const match of matches) {
      const operation = classifyDirectSupabaseOperation(match[1] ?? "", lineText);
      const callTarget = extractDirectSupabaseCallTarget(match[1] ?? "", lineText);
      findings.push({
        file: normalizedPath,
        line: index + 1,
        operation,
        callTarget,
        matchedCall: formatMatchedDirectSupabaseCall(match[0] ?? "", callTarget),
        classification,
        transportOwner,
        expectedTransportOwner,
        risk: riskForOperation(operation),
        suggestedMigrationPath: suggestedMigrationPathForOperation(operation),
      });
    }
  }

  return findings;
}

export function scanDirectSupabaseBypasses(projectRoot: string): DirectSupabaseFinding[] {
  const roots = SOURCE_ROOTS.map((rootName) => path.join(projectRoot, rootName));
  return roots.flatMap((root) =>
    listSourceFiles(root).flatMap((filePath) =>
      scanDirectSupabaseSource({
        filePath: relativeProjectPath(projectRoot, filePath),
        source: fs.readFileSync(filePath, "utf8"),
      }),
    ),
  );
}

const countByFile = (
  findings: readonly DirectSupabaseFinding[],
): readonly { file: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));
};

export function formatDirectSupabaseServiceBypassFailure(
  finding: DirectSupabaseFinding,
): string {
  return [
    "direct_supabase_service_bypass",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `matched_call=${finding.matchedCall}`,
    `expected_transport_owner=${finding.expectedTransportOwner}`,
  ].join(":");
}

export function evaluateDirectSupabaseGuardrail(
  findings: readonly DirectSupabaseFinding[],
  serviceBypassBudget = DIRECT_SUPABASE_SERVICE_BYPASS_BUDGET,
): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["directSupabase"];
} {
  const serviceBypassFindings = findings.filter((finding) => finding.classification === "service_bypass");
  const serviceBypassFiles = new Set(serviceBypassFindings.map((finding) => finding.file));
  const errors = [
    ...serviceBypassFindings.map(formatDirectSupabaseServiceBypassFailure),
    ...(serviceBypassFindings.length > serviceBypassBudget
      ? [`service_bypass_budget_exceeded:${serviceBypassFindings.length}>${serviceBypassBudget}`]
      : []),
  ];

  return {
    check: {
      name: "direct_supabase_service_bypass_budget",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      serviceBypassBudget,
      totalFindings: findings.length,
      serviceBypassFindings: serviceBypassFindings.length,
      serviceBypassFiles: serviceBypassFiles.size,
      transportControlledFindings: findings.filter((finding) => finding.classification === "transport_controlled").length,
      testOnlyFindings: findings.filter((finding) => finding.classification === "test_only").length,
      generatedOrIgnoredFindings: findings.filter((finding) => finding.classification === "generated_or_ignored").length,
      topServiceBypassFiles: countByFile(serviceBypassFindings).slice(0, 10),
    },
  };
}

const emptyExceptionCategoryCounts = (): Record<DirectSupabaseExceptionCategory, number> => ({
  must_stay_direct_for_now: 0,
  can_be_migrated_later: 0,
  needs_new_bff_endpoint: 0,
  unsafe_unknown: 0,
});

const emptyOperationCounts = (): Record<DirectSupabaseOperation, number> => ({
  auth: 0,
  storage: 0,
  read: 0,
  write: 0,
  rpc: 0,
  realtime: 0,
});

const classifyExceptionCategory = (
  finding: DirectSupabaseFinding,
): DirectSupabaseExceptionCategory => {
  if (finding.operation === "auth" || finding.operation === "storage" || finding.operation === "realtime") {
    return "must_stay_direct_for_now";
  }
  if (finding.operation === "write") return "needs_new_bff_endpoint";
  if (finding.file.toLowerCase().includes("pdf") || finding.file.toLowerCase().includes("report")) {
    return "needs_new_bff_endpoint";
  }
  if (finding.operation === "read" || finding.operation === "rpc") return "can_be_migrated_later";
  return "unsafe_unknown";
};

const reasonForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (category === "must_stay_direct_for_now" && finding.operation === "auth") {
    return "Supabase Auth session/user lifecycle is client-owned today; migrate only through an explicit auth/session boundary.";
  }
  if (category === "must_stay_direct_for_now" && finding.operation === "storage") {
    return "Storage calls need a typed storage boundary with upload/remove semantics and redacted diagnostics before migration.";
  }
  if (category === "must_stay_direct_for_now" && finding.operation === "realtime") {
    return "Realtime channel lifecycle is provider-specific and must remain direct until an owned realtime boundary exists.";
  }
  if (category === "needs_new_bff_endpoint") {
    return "No safe equivalent existing BFF endpoint was proven for this call; migration requires a new typed endpoint or mutation boundary.";
  }
  if (category === "can_be_migrated_later") {
    return "Readonly or RPC call remains as a known service bypass until a matching existing BFF/transport path is selected and tested.";
  }
  return "The scanner could not classify this direct Supabase call safely.";
};

const ownerForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (finding.operation === "auth") return "auth/session boundary owner";
  if (finding.operation === "storage") return "storage boundary owner";
  if (finding.operation === "realtime") return "realtime lifecycle owner";
  if (category === "needs_new_bff_endpoint") return "BFF endpoint owner";
  return "domain service owner";
};

const futurePathForException = (
  finding: DirectSupabaseFinding,
  category: DirectSupabaseExceptionCategory,
): string => {
  if (category === "needs_new_bff_endpoint") return "design typed BFF endpoint or mutation boundary with tests";
  if (category === "must_stay_direct_for_now") return finding.suggestedMigrationPath;
  if (category === "can_be_migrated_later") return "migrate to an existing readonly BFF/transport path when an equivalent contract is identified";
  return "manual audit required before allowing or migrating";
};

const registryKey = (finding: Pick<DirectSupabaseFinding, "file" | "operation" | "callTarget">): string =>
  `${finding.file}|${finding.operation}|${finding.callTarget}`;

const registryEntryKey = (
  entry: Pick<DirectSupabaseExceptionRegistryEntry, "file" | "operation" | "callTarget">,
): string => `${entry.file}|${entry.operation}|${entry.callTarget}`;

export function buildDirectSupabaseExceptionEntry(
  finding: DirectSupabaseFinding,
): DirectSupabaseExceptionRegistryEntry {
  const category = classifyExceptionCategory(finding);
  return {
    file: finding.file,
    line: finding.line,
    operation: finding.operation,
    callTarget: finding.callTarget,
    category,
    reasonDirectCallRemains: reasonForException(finding, category),
    owner: ownerForException(finding, category),
    futureMigrationPath: futurePathForException(finding, category),
    risk: finding.risk,
    allowed: category !== "unsafe_unknown",
  };
}

export function buildDirectSupabaseExceptionRegistry(params: {
  findings: readonly DirectSupabaseFinding[];
  generatedAtLocal: string;
}): DirectSupabaseExceptionRegistry {
  const exceptions = params.findings
    .filter((finding) => finding.classification === "service_bypass")
    .map(buildDirectSupabaseExceptionEntry)
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
  const categoryCounts = emptyExceptionCategoryCounts();
  const operationCounts = emptyOperationCounts();
  for (const entry of exceptions) {
    categoryCounts[entry.category] += 1;
    operationCounts[entry.operation] += 1;
  }

  return {
    wave: "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT",
    generatedAtLocal: params.generatedAtLocal,
    source: {
      scanner: "scripts/architecture_anti_regression_suite.ts",
      inventoryArtifacts: [
        "artifacts/S_AUDIT_BATTLE_07_DIRECT_SUPABASE_BYPASS_BATCH_1_inventory.json",
        "artifacts/S_AUDIT_BATTLE_08_DIRECT_SUPABASE_BYPASS_BATCH_2_matrix.json",
        "artifacts/S_AUDIT_BATTLE_16_DIRECT_SUPABASE_BYPASS_BATCH_3_inventory_delta.json",
      ],
    },
    policy: {
      existingAllowedExceptionsPermitted: true,
      newUnclassifiedDirectCallsFailScanner: true,
      registryKey: "file|operation|callTarget",
    },
    summary: {
      totalExceptions: exceptions.length,
      allowedExceptions: exceptions.filter((entry) => entry.allowed).length,
      categoryCounts,
      operationCounts,
    },
    exceptions,
  };
}

const isDirectSupabaseExceptionRegistry = (
  value: unknown,
): value is DirectSupabaseExceptionRegistry => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const registry = value as Partial<DirectSupabaseExceptionRegistry>;
  return registry.wave === "S_AUDIT_BATTLE_17_DIRECT_SUPABASE_EXCEPTION_CONTAINMENT" &&
    !!registry.summary &&
    Array.isArray(registry.exceptions);
};

export function loadDirectSupabaseExceptionRegistry(params: {
  projectRoot: string;
  relativePath?: string;
}): DirectSupabaseExceptionRegistry | null {
  const relativePath = params.relativePath ?? DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH;
  const fullPath = path.join(params.projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown;
  if (!isDirectSupabaseExceptionRegistry(parsed)) {
    throw new Error(`Invalid direct Supabase exception registry: ${relativePath}`);
  }
  return parsed;
}

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
};

export function evaluateDirectSupabaseExceptionGuardrail(params: {
  findings: readonly DirectSupabaseFinding[];
  registry: DirectSupabaseExceptionRegistry | null;
  registryPath?: string;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["directSupabaseExceptionContainment"];
} {
  const registryPath = params.registryPath ?? DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH;
  const currentServiceBypassFindings = params.findings.filter(
    (finding) => finding.classification === "service_bypass",
  );
  const categoryCounts = emptyExceptionCategoryCounts();
  const operationCounts = emptyOperationCounts();

  if (!params.registry) {
    return {
      check: {
        name: "direct_supabase_exception_registry",
        status: "fail",
        errors: [`exception_registry_missing:${registryPath}`],
      },
      summary: {
        registryPath,
        registryLoaded: false,
        registryEntries: 0,
        currentServiceBypassFindings: currentServiceBypassFindings.length,
        allowedCurrentFindings: 0,
        unclassifiedCurrentFindings: currentServiceBypassFindings.length,
        disallowedCurrentFindings: 0,
        categoryCounts,
        operationCounts,
      },
    };
  }

  const allowedCounts = new Map<string, number>();
  const currentCounts = new Map<string, number>();
  for (const entry of params.registry.exceptions) {
    categoryCounts[entry.category] += 1;
    operationCounts[entry.operation] += 1;
    if (entry.allowed) increment(allowedCounts, registryEntryKey(entry));
  }
  for (const finding of currentServiceBypassFindings) {
    increment(currentCounts, registryKey(finding));
  }

  const unclassified: string[] = [];
  let unclassifiedCurrentFindingCount = 0;
  for (const [key, count] of currentCounts.entries()) {
    const allowed = allowedCounts.get(key) ?? 0;
    if (count > allowed) {
      unclassified.push(`${key}:${count}>${allowed}`);
      unclassifiedCurrentFindingCount += count - allowed;
    }
  }
  const disallowedCurrentFindings = params.registry.exceptions.filter((entry) => !entry.allowed).length;
  const allowedCurrentFindings = Math.max(0, currentServiceBypassFindings.length - unclassifiedCurrentFindingCount);
  const errors = [
    ...unclassified.map((key) => `unclassified_direct_supabase_call:${key}`),
    ...(disallowedCurrentFindings > 0
      ? [`disallowed_exception_entries:${disallowedCurrentFindings}`]
      : []),
  ];

  return {
    check: {
      name: "direct_supabase_exception_registry",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      registryPath,
      registryLoaded: true,
      registryEntries: params.registry.exceptions.length,
      currentServiceBypassFindings: currentServiceBypassFindings.length,
      allowedCurrentFindings,
      unclassifiedCurrentFindings: unclassifiedCurrentFindingCount,
      disallowedCurrentFindings,
      categoryCounts,
      operationCounts,
    },
  };
}

export function evaluateProductionReadonlyCanaryGuardrail(): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["productionReadonlyCanary"];
} {
  const { classifications, whitelist } = buildProductionBusinessReadonlyCanaryWhitelist({
    postReadRpcApproved: true,
  });
  const registry = validateProductionBusinessReadonlyCanaryRegistry({ classifications });
  const forbiddenMetricValidation = validateProductionBusinessReadonlyCanaryMetricLog({
    routeClass: "catalog_readonly_search_preview",
    statusClass: "2xx",
    latencyP50: 1,
    rawUrl: "https://example.invalid/path?token=redacted",
  });
  const unsafeWhitelist = classifications.filter(
    (classification) =>
      classification.safeForCanary &&
      (!classification.readonlyContractProven ||
        classification.mutationKey ||
        classification.dbWritePossible ||
        classification.rawPayloadLogging ||
        classification.rawRowsLogging),
  );
  const forbiddenMutationOperationCount: number =
    PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS.length;
  const errors = [
    ...registry.errors,
    ...(whitelist.length === 0 ? ["readonly_whitelist_empty"] : []),
    ...(forbiddenMutationOperationCount === 0 ? ["mutation_blacklist_empty"] : []),
    ...(forbiddenMetricValidation.passed ? ["redaction_forbidden_keys_not_enforced"] : []),
    ...unsafeWhitelist.map((classification) => `unsafe_whitelist_route:${classification.id}`),
  ];

  return {
    check: {
      name: "production_readonly_canary_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      whitelistRouteCount: whitelist.length,
      forbiddenMutationOperationCount,
      redactionForbiddenKeysEnforced: !forbiddenMetricValidation.passed,
    },
  };
}

const readProjectFile = (projectRoot: string, relativePath: string): string =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const safeReadProjectFile = (params: {
  readFile: ReadFile;
  relativePath: string;
}): string | null => {
  try {
    return params.readFile(params.relativePath);
  } catch (_error: unknown) {
    return null;
  }
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonRecord = (source: string | null): Record<string, unknown> | null => {
  if (!source) return null;
  try {
    const parsed: unknown = JSON.parse(source);
    return isPlainRecord(parsed) ? parsed : null;
  } catch (_error: unknown) {
    return null;
  }
};

const recordValue = (record: Record<string, unknown> | null, key: string): unknown =>
  record ? record[key] : undefined;

const recordChild = (record: Record<string, unknown> | null, key: string): Record<string, unknown> | null => {
  const value = recordValue(record, key);
  return isPlainRecord(value) ? value : null;
};

const recordString = (record: Record<string, unknown> | null, key: string): string =>
  typeof recordValue(record, key) === "string" ? String(recordValue(record, key)) : "";

const recordNumber = (record: Record<string, unknown> | null, key: string): number | null => {
  const value = recordValue(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const recordBoolean = (record: Record<string, unknown> | null, key: string): boolean | null => {
  const value = recordValue(record, key);
  return typeof value === "boolean" ? value : null;
};

const recordStringArray = (record: Record<string, unknown> | null, key: string): readonly string[] => {
  const value = recordValue(record, key);
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
};

const extractConstString = (source: string, constName: string): string | null => {
  const escapedName = constName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`const\\s+${escapedName}\\s*=\\s*\"([^\"]+)\"`).exec(source);
  return match?.[1] ?? null;
};

const directGeminiImportPattern =
  /(?:from\s+["'][^"']*geminiGateway["']|require\(\s*["'][^"']*geminiGateway["']\s*\))/;
const providerImplementationImportPattern =
  /(?:import\s+\{[^}]*\b(?:DisabledModelProvider|LegacyGeminiModelProvider)\b[^}]*\}\s+from\s+["'][^"']*model|from\s+["'][^"']*(?:DisabledModelProvider|LegacyGeminiModelProvider)["'])/;
const openAiLiveCallPattern =
  /(?:api\.openai\.com|new\s+OpenAI\s*\(|\bOpenAI\s*\(\s*\{|chat\.completions\.create|responses\.create)/i;
const aiClientSecretPattern =
  /\b(?:OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|MODEL_API_KEY|AI_PROVIDER_API_KEY)\b|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{20,}/;

const defaultAiModelBoundarySourceFiles = (projectRoot: string): string[] =>
  SOURCE_ROOTS.flatMap((rootName) =>
    listSourceFiles(path.join(projectRoot, rootName)).map((filePath) =>
      relativeProjectPath(projectRoot, filePath),
    ),
  );

const isAiUiProviderImportForbiddenPath = (file: string): boolean =>
  file.startsWith("src/screens/") ||
  file.startsWith("app/") ||
  file.includes("/components/") ||
  file === "src/features/ai/assistantActions.ts" ||
  file === "src/features/ai/useAssistantVoiceInput.ts";

export function evaluateAiModelBoundaryGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
  sourceFiles?: readonly string[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiModelBoundarySummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const sourceFiles = (params.sourceFiles ?? defaultAiModelBoundarySourceFiles(params.projectRoot))
    .map(normalizePath);
  const sourceEntries = sourceFiles.map((file) => ({
    file,
    source: safeReadProjectFile({ readFile, relativePath: file }) ?? "",
  }));
  const modelGatewaySource = safeReadProjectFile({ readFile, relativePath: AI_MODEL_GATEWAY_PATH });
  const modelTypesSource = safeReadProjectFile({ readFile, relativePath: AI_MODEL_TYPES_PATH });
  const disabledProviderSource = safeReadProjectFile({ readFile, relativePath: AI_DISABLED_PROVIDER_PATH });
  const legacyGeminiProviderSource = safeReadProjectFile({ readFile, relativePath: AI_LEGACY_GEMINI_PROVIDER_PATH });
  const assistantClientSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_CLIENT_PATH });
  const aiReportsSource = safeReadProjectFile({ readFile, relativePath: AI_REPORTS_SERVICE_PATH });

  const directGeminiImportFindings = sourceEntries
    .filter((entry) => directGeminiImportPattern.test(entry.source))
    .filter((entry) => entry.file !== AI_LEGACY_GEMINI_PROVIDER_PATH);
  const uiProviderImportFindings = sourceEntries
    .filter((entry) => isAiUiProviderImportForbiddenPath(entry.file))
    .filter((entry) => providerImplementationImportPattern.test(entry.source));
  const openAiLiveCallFindings = sourceEntries.filter((entry) => openAiLiveCallPattern.test(entry.source));
  const apiKeyClientFindings = sourceEntries
    .filter((entry) => entry.file.startsWith("src/features/ai/") || entry.file.startsWith("src/screens/") || entry.file.startsWith("app/"))
    .filter((entry) => aiClientSecretPattern.test(entry.source));

  const assistantClientUsesGateway =
    Boolean(assistantClientSource?.includes("AiModelGateway")) &&
    !Boolean(assistantClientSource?.includes("geminiGateway")) &&
    !Boolean(assistantClientSource?.includes("requestAiGeneratedText"));
  const aiReportsRedactionContractPresent =
    Boolean(aiReportsSource?.includes("redactAiReportForStorage")) &&
    Boolean(aiReportsSource?.includes("redactAiReportStorageText(input.content)")) &&
    Boolean(aiReportsSource?.includes("rawprompt"));

  const findings = [
    ...directGeminiImportFindings.map((entry) => `direct_gemini_import:file=${entry.file}`),
    ...uiProviderImportFindings.map((entry) => `ui_provider_implementation_import:file=${entry.file}`),
    ...openAiLiveCallFindings.map((entry) => `openai_live_call:file=${entry.file}`),
    ...apiKeyClientFindings.map((entry) => `ai_api_key_client_reference:file=${entry.file}`),
  ];
  const errors = [
    ...(modelGatewaySource ? [] : [`missing_file:${AI_MODEL_GATEWAY_PATH}`]),
    ...(modelTypesSource ? [] : [`missing_file:${AI_MODEL_TYPES_PATH}`]),
    ...(disabledProviderSource ? [] : [`missing_file:${AI_DISABLED_PROVIDER_PATH}`]),
    ...(legacyGeminiProviderSource ? [] : [`missing_file:${AI_LEGACY_GEMINI_PROVIDER_PATH}`]),
    ...(assistantClientUsesGateway ? [] : ["assistant_client_not_using_ai_model_gateway"]),
    ...(aiReportsRedactionContractPresent ? [] : ["ai_reports_redaction_contract_missing"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_model_provider_boundary",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      aiModelGatewayPresent: Boolean(modelGatewaySource),
      aiModelTypesPresent: Boolean(modelTypesSource),
      aiDisabledProviderPresent: Boolean(disabledProviderSource),
      aiLegacyGeminiProviderPresent: Boolean(legacyGeminiProviderSource),
      assistantClientUsesGateway,
      directGeminiImportsOutsideLegacyProvider: directGeminiImportFindings.length,
      providerImplementationImportsFromUi: uiProviderImportFindings.length,
      openAiLiveCallFindings: openAiLiveCallFindings.length,
      apiKeyClientFindings: apiKeyClientFindings.length,
      aiReportsRedactionContractPresent,
      findings,
    },
  };
}

const aiScreenGatewayImportPattern =
  /(?:from\s+["'][^"']*AiModelGateway["']|import\s+\{[^}]*\bAiModelGateway\b[^}]*\}|from\s+["'][^"']*features\/ai\/model["'])/;

const isAiScreenOrUiPath = (file: string): boolean =>
  file.startsWith("src/screens/") ||
  file.startsWith("app/") ||
  file.includes("/components/");

export function evaluateAiRoleRiskApprovalControlPlaneGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
  sourceFiles?: readonly string[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiRoleRiskApprovalControlPlaneSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const sourceFiles = (params.sourceFiles ?? defaultAiModelBoundarySourceFiles(params.projectRoot))
    .map(normalizePath);
  const sourceEntries = sourceFiles.map((file) => ({
    file,
    source: safeReadProjectFile({ readFile, relativePath: file }) ?? "",
  }));

  const rolePolicySource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_POLICY_PATH });
  const riskPolicySource = safeReadProjectFile({ readFile, relativePath: AI_RISK_POLICY_PATH });
  const screenRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_SCREEN_REGISTRY_PATH });
  const approvalGateSource = safeReadProjectFile({ readFile, relativePath: AI_APPROVAL_GATE_PATH });
  const responsePolicySource = safeReadProjectFile({ readFile, relativePath: AI_PROFESSIONAL_RESPONSE_POLICY_PATH });
  const assistantActionsSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_ACTIONS_PATH });
  const assistantPromptsSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_PROMPTS_PATH });
  const assistantScopeContextSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCOPE_CONTEXT_PATH });
  const contextRedactionSource = safeReadProjectFile({ readFile, relativePath: AI_CONTEXT_REDACTION_PATH });
  const auditEventTypesSource = safeReadProjectFile({ readFile, relativePath: AI_AUDIT_EVENT_TYPES_PATH });

  const screenGatewayImportFindings = sourceEntries
    .filter((entry) => isAiScreenOrUiPath(entry.file))
    .filter((entry) => aiScreenGatewayImportPattern.test(entry.source) || providerImplementationImportPattern.test(entry.source));

  const assistantActionsUsesApprovalGate =
    Boolean(assistantActionsSource?.includes("assertNoDirectAiMutation")) &&
    Boolean(assistantActionsSource?.includes("submitAiActionForApproval"));
  const assistantActionsDirectSubmitBlocked =
    assistantActionsUsesApprovalGate &&
    !Boolean(assistantActionsSource?.includes("submitRequestToDirector"));
  const directorFullAccessPolicyPresent =
    Boolean(rolePolicySource?.includes("director: AI_DOMAINS")) &&
    Boolean(rolePolicySource?.includes("control: AI_DOMAINS")) &&
    Boolean(rolePolicySource?.includes("execute_approved_action"));
  const nonDirectorScopePresent =
    Boolean(rolePolicySource?.includes("foreman: [")) &&
    Boolean(rolePolicySource?.includes("buyer: [")) &&
    Boolean(rolePolicySource?.includes("accountant: [")) &&
    Boolean(rolePolicySource?.includes("contractor: [")) &&
    Boolean(rolePolicySource?.includes("unknown: []"));
  const forbiddenActionsBlocked =
    Boolean(riskPolicySource?.includes("direct_supabase_query")) &&
    Boolean(riskPolicySource?.includes("raw_db_export")) &&
    Boolean(riskPolicySource?.includes("delete_data")) &&
    Boolean(riskPolicySource?.includes("bypass_approval")) &&
    Boolean(riskPolicySource?.includes("AI action is forbidden"));
  const approvalRequiredCannotExecuteDirectly =
    Boolean(approvalGateSource?.includes('action.status !== "approved"')) &&
    Boolean(approvalGateSource?.includes("missing idempotency key")) &&
    Boolean(approvalGateSource?.includes("missing audit event")) &&
    Boolean(approvalGateSource?.includes("Direct AI mutation blocked"));
  const promptPolicyBuilderApplied =
    Boolean(responsePolicySource?.includes("buildAiProfessionalResponsePolicyPrompt")) &&
    Boolean(assistantPromptsSource?.includes("buildAiProfessionalResponsePolicyPrompt"));
  const screenContextRedactionPresent =
    Boolean(contextRedactionSource?.includes("redactAiContextForModel")) &&
    Boolean(assistantScopeContextSource?.includes("redactAiContextSummaryText"));
  const auditEventsPresent =
    Boolean(auditEventTypesSource?.includes("ai.policy.checked")) &&
    Boolean(auditEventTypesSource?.includes("ai.action.approval_required")) &&
    Boolean(auditEventTypesSource?.includes("ai.prompt.policy_applied"));

  const promptBypassFindings = [
    ...(assistantPromptsSource && /ignore approval/i.test(assistantPromptsSource)
      ? ["ai_prompt_forbidden_ignore_approval"]
      : []),
    ...(assistantPromptsSource && /bypass approval/i.test(assistantPromptsSource)
      ? ["ai_prompt_forbidden_bypass_approval"]
      : []),
  ];
  const findings = [
    ...screenGatewayImportFindings.map((entry) => `screen_ai_model_gateway_import:file=${entry.file}`),
    ...promptBypassFindings,
  ];
  const errors = [
    ...(rolePolicySource ? [] : [`missing_file:${AI_ROLE_POLICY_PATH}`]),
    ...(riskPolicySource ? [] : [`missing_file:${AI_RISK_POLICY_PATH}`]),
    ...(screenRegistrySource ? [] : [`missing_file:${AI_SCREEN_REGISTRY_PATH}`]),
    ...(approvalGateSource ? [] : [`missing_file:${AI_APPROVAL_GATE_PATH}`]),
    ...(responsePolicySource ? [] : [`missing_file:${AI_PROFESSIONAL_RESPONSE_POLICY_PATH}`]),
    ...(assistantActionsUsesApprovalGate ? [] : ["assistant_actions_not_using_ai_approval_gate"]),
    ...(assistantActionsDirectSubmitBlocked ? [] : ["assistant_actions_direct_submit_not_blocked"]),
    ...(directorFullAccessPolicyPresent ? [] : ["director_full_access_policy_missing"]),
    ...(nonDirectorScopePresent ? [] : ["non_director_scope_policy_missing"]),
    ...(forbiddenActionsBlocked ? [] : ["forbidden_ai_actions_not_blocked"]),
    ...(approvalRequiredCannotExecuteDirectly ? [] : ["approval_required_actions_can_execute_directly"]),
    ...(promptPolicyBuilderApplied ? [] : ["ai_professional_prompt_policy_not_applied"]),
    ...(screenContextRedactionPresent ? [] : ["ai_screen_context_redaction_missing"]),
    ...(auditEventsPresent ? [] : ["ai_audit_event_types_missing"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_role_risk_approval_control_plane",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      rolePolicyPresent: Boolean(rolePolicySource),
      riskPolicyPresent: Boolean(riskPolicySource),
      screenCapabilityRegistryPresent: Boolean(screenRegistrySource),
      approvalGatePresent: Boolean(approvalGateSource),
      professionalResponsePolicyPresent: Boolean(responsePolicySource),
      assistantActionsUsesApprovalGate,
      assistantActionsDirectSubmitBlocked,
      directorFullAccessPolicyPresent,
      nonDirectorScopePresent,
      forbiddenActionsBlocked,
      approvalRequiredCannotExecuteDirectly,
      promptPolicyBuilderApplied,
      screenContextRedactionPresent,
      auditEventsPresent,
      screenGatewayImports: screenGatewayImportFindings.length,
      findings,
    },
  };
}

const knowledgeRegistryImportPattern =
  /\bfrom\s+["'][^"']*(supabase|gemini|openai|features\/ai\/model|AiModelGateway)[^"']*["']|\bimport\s+\{[^}]*\bAiModelGateway\b[^}]*\}/i;
const resolverNetworkOrDbPattern =
  /\bfetch\s*\(|\bXMLHttpRequest\b|\bsupabase\b|\.(?:from|rpc)\s*\(/i;

export function evaluateAiAppKnowledgeRegistryGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
  sourceFiles?: readonly string[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiAppKnowledgeRegistrySummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const sourceFiles = (params.sourceFiles ?? defaultAiModelBoundarySourceFiles(params.projectRoot))
    .map(normalizePath);
  const sourceEntries = sourceFiles.map((file) => ({
    file,
    source: safeReadProjectFile({ readFile, relativePath: file }) ?? "",
  }));

  const knowledgeTypesSource = safeReadProjectFile({ readFile, relativePath: AI_KNOWLEDGE_TYPES_PATH });
  const domainRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_DOMAIN_KNOWLEDGE_REGISTRY_PATH });
  const entityRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_ENTITY_REGISTRY_PATH });
  const screenKnowledgeSource = safeReadProjectFile({ readFile, relativePath: AI_SCREEN_KNOWLEDGE_REGISTRY_PATH });
  const documentSourceRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_DOCUMENT_SOURCE_REGISTRY_PATH });
  const intentRegistrySource = safeReadProjectFile({ readFile, relativePath: AI_INTENT_REGISTRY_PATH });
  const knowledgeResolverSource = safeReadProjectFile({ readFile, relativePath: AI_KNOWLEDGE_RESOLVER_PATH });
  const knowledgeRedactionSource = safeReadProjectFile({ readFile, relativePath: AI_KNOWLEDGE_REDACTION_PATH });
  const controlPlaneBridgeSource = safeReadProjectFile({ readFile, relativePath: AI_CONTROL_PLANE_KNOWLEDGE_BRIDGE_PATH });
  const assistantScopeContextSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCOPE_CONTEXT_PATH });
  const assistantPromptsSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_PROMPTS_PATH });

  const knowledgeRegistryEntries = [
    { file: AI_KNOWLEDGE_TYPES_PATH, source: knowledgeTypesSource ?? "" },
    { file: AI_DOMAIN_KNOWLEDGE_REGISTRY_PATH, source: domainRegistrySource ?? "" },
    { file: AI_ENTITY_REGISTRY_PATH, source: entityRegistrySource ?? "" },
    { file: AI_SCREEN_KNOWLEDGE_REGISTRY_PATH, source: screenKnowledgeSource ?? "" },
    { file: AI_DOCUMENT_SOURCE_REGISTRY_PATH, source: documentSourceRegistrySource ?? "" },
    { file: AI_INTENT_REGISTRY_PATH, source: intentRegistrySource ?? "" },
    { file: AI_KNOWLEDGE_REDACTION_PATH, source: knowledgeRedactionSource ?? "" },
  ];

  const requiredDomainsRegistered = REQUIRED_AI_APP_KNOWLEDGE_DOMAINS.every((domain) =>
    Boolean(domainRegistrySource?.includes(`"${domain}"`)),
  );
  const requiredScreenIdsRegistered = REQUIRED_AI_APP_KNOWLEDGE_SCREENS.every((screenId) =>
    Boolean(screenKnowledgeSource?.includes(`"${screenId}"`)),
  );
  const requiredDocumentSourcesRegistered = REQUIRED_AI_APP_KNOWLEDGE_DOCUMENT_SOURCES.every((sourceId) =>
    Boolean(documentSourceRegistrySource?.includes(`"${sourceId}"`)),
  );
  const requiredIntentsRegistered = REQUIRED_AI_APP_KNOWLEDGE_INTENTS.every((intent) =>
    Boolean(intentRegistrySource?.includes(`"${intent}"`)),
  );
  const assistantContextUsesKnowledgeResolver =
    Boolean(assistantScopeContextSource?.includes("buildAiKnowledgePromptBlock")) &&
    Boolean(assistantScopeContextSource?.includes("ai_knowledge_registry"));
  const assistantPromptsIncludeKnowledgePolicy =
    Boolean(assistantPromptsSource?.includes("buildAiKnowledgePromptBlock")) &&
    Boolean(knowledgeResolverSource?.includes("AI APP KNOWLEDGE BLOCK"));
  const directorControlFullDomainKnowledgePresent =
    Boolean(knowledgeResolverSource?.includes("hasDirectorFullAiAccess")) &&
    Boolean(knowledgeResolverSource?.includes("AI_ENTITY_KNOWLEDGE_REGISTRY"));
  const unknownRoleDenyByDefault =
    Boolean(knowledgeResolverSource?.includes("Unknown AI role is denied by default")) &&
    Boolean(knowledgeResolverSource?.includes('params.role === "unknown"'));
  const contractorOwnRecordsOnlyPresent =
    Boolean(screenKnowledgeSource?.includes("own_records_only")) &&
    Boolean(entityRegistrySource?.includes("own_records_only"));
  const financeContextScopedFromNonFinanceRoles =
    Boolean(entityRegistrySource?.includes("accounting_posting")) &&
    Boolean(entityRegistrySource?.includes("FINANCE_ROLES")) &&
    Boolean(knowledgeRedactionSource?.includes("raw_finance_context_for_non_finance_role"));
  const noDirectHighRiskIntent =
    Boolean(intentRegistrySource?.includes('intent: "execute_approved"')) &&
    Boolean(intentRegistrySource?.includes('executionBoundary: "aiApprovalGate"')) &&
    !Boolean(intentRegistrySource?.includes('executionBoundary: "direct"'));
  const registryProviderImportFindings = knowledgeRegistryEntries
    .filter((entry) => knowledgeRegistryImportPattern.test(entry.source))
    .map((entry) => `knowledge_registry_provider_import:file=${entry.file}`);
  const resolverNetworkOrDbFindings =
    knowledgeResolverSource && resolverNetworkOrDbPattern.test(knowledgeResolverSource)
      ? [`knowledge_resolver_network_or_db_query:file=${AI_KNOWLEDGE_RESOLVER_PATH}`]
      : [];
  const screenGatewayImportFindings = sourceEntries
    .filter((entry) => isAiScreenOrUiPath(entry.file))
    .filter((entry) => aiScreenGatewayImportPattern.test(entry.source) || providerImplementationImportPattern.test(entry.source))
    .map((entry) => `screen_ai_model_gateway_import:file=${entry.file}`);

  const findings = [
    ...registryProviderImportFindings,
    ...resolverNetworkOrDbFindings,
    ...screenGatewayImportFindings,
  ];
  const errors = [
    ...(knowledgeTypesSource ? [] : [`missing_file:${AI_KNOWLEDGE_TYPES_PATH}`]),
    ...(domainRegistrySource ? [] : [`missing_file:${AI_DOMAIN_KNOWLEDGE_REGISTRY_PATH}`]),
    ...(entityRegistrySource ? [] : [`missing_file:${AI_ENTITY_REGISTRY_PATH}`]),
    ...(screenKnowledgeSource ? [] : [`missing_file:${AI_SCREEN_KNOWLEDGE_REGISTRY_PATH}`]),
    ...(documentSourceRegistrySource ? [] : [`missing_file:${AI_DOCUMENT_SOURCE_REGISTRY_PATH}`]),
    ...(intentRegistrySource ? [] : [`missing_file:${AI_INTENT_REGISTRY_PATH}`]),
    ...(knowledgeResolverSource ? [] : [`missing_file:${AI_KNOWLEDGE_RESOLVER_PATH}`]),
    ...(knowledgeRedactionSource ? [] : [`missing_file:${AI_KNOWLEDGE_REDACTION_PATH}`]),
    ...(controlPlaneBridgeSource ? [] : [`missing_file:${AI_CONTROL_PLANE_KNOWLEDGE_BRIDGE_PATH}`]),
    ...(assistantContextUsesKnowledgeResolver ? [] : ["assistant_scope_context_not_using_knowledge_resolver"]),
    ...(assistantPromptsIncludeKnowledgePolicy ? [] : ["assistant_prompts_missing_app_knowledge_policy"]),
    ...(requiredScreenIdsRegistered ? [] : ["required_ai_screen_knowledge_ids_missing"]),
    ...(requiredDomainsRegistered ? [] : ["required_ai_domains_missing"]),
    ...(requiredDocumentSourcesRegistered ? [] : ["required_ai_document_sources_missing"]),
    ...(requiredIntentsRegistered ? [] : ["required_ai_intents_missing"]),
    ...(directorControlFullDomainKnowledgePresent ? [] : ["director_control_full_domain_knowledge_missing"]),
    ...(unknownRoleDenyByDefault ? [] : ["unknown_role_not_deny_by_default"]),
    ...(contractorOwnRecordsOnlyPresent ? [] : ["contractor_own_records_only_policy_missing"]),
    ...(financeContextScopedFromNonFinanceRoles ? [] : ["finance_context_not_scoped_from_non_finance_roles"]),
    ...(noDirectHighRiskIntent ? [] : ["direct_high_risk_intent_detected"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_app_knowledge_registry",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      aiKnowledgeTypesPresent: Boolean(knowledgeTypesSource),
      domainRegistryPresent: Boolean(domainRegistrySource),
      entityRegistryPresent: Boolean(entityRegistrySource),
      screenKnowledgeRegistryPresent: Boolean(screenKnowledgeSource),
      documentSourceRegistryPresent: Boolean(documentSourceRegistrySource),
      intentRegistryPresent: Boolean(intentRegistrySource),
      knowledgeResolverPresent: Boolean(knowledgeResolverSource),
      knowledgeRedactionPresent: Boolean(knowledgeRedactionSource),
      controlPlaneBridgePresent: Boolean(controlPlaneBridgeSource),
      assistantContextUsesKnowledgeResolver,
      assistantPromptsIncludeKnowledgePolicy,
      requiredScreenIdsRegistered,
      requiredDomainsRegistered,
      requiredDocumentSourcesRegistered,
      directorControlFullDomainKnowledgePresent,
      unknownRoleDenyByDefault,
      contractorOwnRecordsOnlyPresent,
      financeContextScopedFromNonFinanceRoles,
      noDirectHighRiskIntent,
      registryProviderImports: registryProviderImportFindings.length,
      resolverNetworkOrDbQueries: resolverNetworkOrDbFindings.length,
      screenGatewayImports: screenGatewayImportFindings.length,
      findings,
    },
  };
}

const aiToolRegistryLiveExecutionPattern =
  /\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(|\bXMLHttpRequest\b|\.(?:from|rpc)\s*\(/i;
const aiToolRegistryProviderPattern =
  /\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i;
const aiToolRegistrySupabasePattern =
  /@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i;

export function evaluateAiToolRegistryArchitectureGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiToolRegistryArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const registrySource = safeReadProjectFile({ readFile, relativePath: AI_TOOL_REGISTRY_PATH });
  const typesSource = safeReadProjectFile({ readFile, relativePath: AI_TOOL_TYPES_PATH });
  const schemasSource = safeReadProjectFile({ readFile, relativePath: AI_TOOL_SCHEMAS_PATH });
  const combined = [registrySource ?? "", typesSource ?? "", schemasSource ?? ""].join("\n");

  const allRequiredToolsRegistered = REQUIRED_AI_TOOL_NAMES.every((toolName) =>
    Boolean(registrySource?.includes(`"${toolName}"`)),
  );
  const forbiddenToolsExcluded = FORBIDDEN_AI_TOOL_NAMES.every((toolName) =>
    !Boolean(registrySource?.includes(`"${toolName}"`)),
  );
  const allToolsHaveSchema =
    Boolean(registrySource?.includes("AI_TOOL_REGISTRY")) &&
    REQUIRED_AI_TOOL_METADATA_KEYS.every((key) => Boolean(registrySource?.includes(key))) &&
    REQUIRED_AI_TOOL_NAMES.every((toolName) => Boolean(schemasSource?.includes(`${toCamelIdentifier(toolName)}InputSchema`)));
  const allToolsHaveRiskPolicy =
    Boolean(registrySource?.includes('riskLevel: "safe_read"')) &&
    Boolean(registrySource?.includes('riskLevel: "draft_only"')) &&
    Boolean(registrySource?.includes('riskLevel: "approval_required"')) &&
    Boolean(registrySource?.includes("approvalRequired")) &&
    Boolean(registrySource?.includes("idempotencyRequired"));
  const allToolsHaveAuditMetadata =
    Boolean(registrySource?.includes("auditEvent")) &&
    Boolean(registrySource?.includes("rateLimitScope")) &&
    Boolean(registrySource?.includes("evidenceRequired")) &&
    Boolean(typesSource?.includes("AiActionAuditEventType"));
  const noLiveExecutionBoundary = !aiToolRegistryLiveExecutionPattern.test(combined);
  const noProviderImports = !aiToolRegistryProviderPattern.test(combined);
  const noSupabaseImports = !aiToolRegistrySupabasePattern.test(combined);
  const findings = [
    ...(noLiveExecutionBoundary ? [] : ["ai_tool_registry_live_execution_boundary_detected"]),
    ...(noProviderImports ? [] : ["ai_tool_registry_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["ai_tool_registry_supabase_boundary_detected"]),
  ];
  const errors = [
    ...(registrySource ? [] : [`missing_file:${AI_TOOL_REGISTRY_PATH}`]),
    ...(typesSource ? [] : [`missing_file:${AI_TOOL_TYPES_PATH}`]),
    ...(schemasSource ? [] : [`missing_file:${AI_TOOL_SCHEMAS_PATH}`]),
    ...(allRequiredToolsRegistered ? [] : ["required_ai_tools_missing"]),
    ...(forbiddenToolsExcluded ? [] : ["forbidden_ai_tools_registered"]),
    ...(allToolsHaveSchema ? [] : ["ai_tools_missing_schema_metadata"]),
    ...(allToolsHaveRiskPolicy ? [] : ["ai_tools_missing_risk_policy_metadata"]),
    ...(allToolsHaveAuditMetadata ? [] : ["ai_tools_missing_audit_metadata"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_tool_registry_architecture",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      registryPresent: Boolean(registrySource),
      typesPresent: Boolean(typesSource),
      schemasPresent: Boolean(schemasSource),
      allRequiredToolsRegistered,
      forbiddenToolsExcluded,
      allToolsHaveSchema,
      allToolsHaveRiskPolicy,
      allToolsHaveAuditMetadata,
      noLiveExecutionBoundary,
      noProviderImports,
      noSupabaseImports,
      findings,
    },
  };
}

function toCamelIdentifier(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

const aiToolReadBindingsLiveExecutionPattern =
  /\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(|\bXMLHttpRequest\b|\.(?:from|rpc|insert|update|delete)\s*\(/i;
const aiToolReadBindingsProviderPattern =
  /\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i;
const aiToolReadBindingsSupabasePattern =
  /@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i;

export function evaluateAiToolReadBindingsArchitectureGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiToolReadBindingsArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const bindingsSource = safeReadProjectFile({ readFile, relativePath: AI_TOOL_READ_BINDINGS_PATH });
  const allSafeReadToolsBound = REQUIRED_AI_SAFE_READ_TOOL_NAMES.every((toolName) =>
    Boolean(bindingsSource?.includes(`toolName: "${toolName}"`)),
  );
  const nonSafeReadToolsExcluded = NON_SAFE_READ_TOOL_NAMES.every((toolName) =>
    !Boolean(bindingsSource?.includes(`toolName: "${toolName}"`)),
  );
  const allBindingsReadOnly =
    Boolean(bindingsSource?.includes("readOnly: true")) &&
    Boolean(bindingsSource?.includes("rawRowsAllowed: false")) &&
    Boolean(bindingsSource?.includes("rawPromptStorageAllowed: false"));
  const allBindingsDisabledByDefault =
    Boolean(bindingsSource?.includes("directExecutionEnabled: false")) &&
    Boolean(bindingsSource?.includes("trafficEnabledByDefault: false")) &&
    Boolean(bindingsSource?.includes("productionTrafficEnabled: false"));
  const noLiveExecutionBoundary = !aiToolReadBindingsLiveExecutionPattern.test(bindingsSource ?? "");
  const noProviderImports = !aiToolReadBindingsProviderPattern.test(bindingsSource ?? "");
  const noSupabaseImports = !aiToolReadBindingsSupabasePattern.test(bindingsSource ?? "");
  const noMutationTerms =
    !Boolean(bindingsSource?.includes("create_order")) &&
    !Boolean(bindingsSource?.includes("confirm_supplier")) &&
    !Boolean(bindingsSource?.includes("change_payment_status")) &&
    !Boolean(bindingsSource?.includes("change_warehouse_status"));
  const findings = [
    ...(noLiveExecutionBoundary ? [] : ["ai_tool_read_binding_live_execution_boundary_detected"]),
    ...(noProviderImports ? [] : ["ai_tool_read_binding_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["ai_tool_read_binding_supabase_boundary_detected"]),
    ...(noMutationTerms ? [] : ["ai_tool_read_binding_mutation_term_detected"]),
  ];
  const errors = [
    ...(bindingsSource ? [] : [`missing_file:${AI_TOOL_READ_BINDINGS_PATH}`]),
    ...(allSafeReadToolsBound ? [] : ["safe_read_ai_tool_binding_missing"]),
    ...(nonSafeReadToolsExcluded ? [] : ["non_safe_read_ai_tool_bound"]),
    ...(allBindingsReadOnly ? [] : ["ai_tool_read_bindings_not_read_only"]),
    ...(allBindingsDisabledByDefault ? [] : ["ai_tool_read_bindings_enabled_by_default"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_tool_read_bindings_architecture",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      bindingsPresent: Boolean(bindingsSource),
      allSafeReadToolsBound,
      nonSafeReadToolsExcluded,
      allBindingsReadOnly,
      allBindingsDisabledByDefault,
      noLiveExecutionBoundary,
      noProviderImports,
      noSupabaseImports,
      noMutationTerms,
      findings,
    },
  };
}

const aiToolPlanPolicyLiveExecutionPattern =
  /\bhandler\b|\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(|\bXMLHttpRequest\b|\.(?:from|rpc|insert|update|delete)\s*\(/i;
const aiToolPlanPolicyProviderPattern =
  /\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i;
const aiToolPlanPolicySupabasePattern =
  /@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i;

export function evaluateAiToolPlanPolicyArchitectureGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiToolPlanPolicyArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const policySource = safeReadProjectFile({ readFile, relativePath: AI_TOOL_PLAN_POLICY_PATH });
  const plansAllRegisteredTools =
    Boolean(policySource?.includes("AI_TOOL_NAMES")) &&
    Boolean(policySource?.includes("getAiToolDefinition"));
  const blocksUnknownTools =
    Boolean(policySource?.includes("isAiToolName")) &&
    Boolean(policySource?.includes("tool_not_registered"));
  const requiresSafeReadBindings =
    Boolean(policySource?.includes("getAiSafeReadToolBinding")) &&
    Boolean(policySource?.includes("safe_read_binding_missing"));
  const directExecutionDisabled = Boolean(policySource?.includes("directExecutionEnabled: false"));
  const mutationDisabled = Boolean(policySource?.includes("mutationAllowed: false"));
  const providerCallsDisabled = Boolean(policySource?.includes("providerCallAllowed: false"));
  const dbAccessDisabled = Boolean(policySource?.includes("dbAccessAllowed: false"));
  const noLiveExecutionBoundary = !aiToolPlanPolicyLiveExecutionPattern.test(policySource ?? "");
  const noProviderImports = !aiToolPlanPolicyProviderPattern.test(policySource ?? "");
  const noSupabaseImports = !aiToolPlanPolicySupabasePattern.test(policySource ?? "");
  const findings = [
    ...(noLiveExecutionBoundary ? [] : ["ai_tool_plan_policy_live_execution_boundary_detected"]),
    ...(noProviderImports ? [] : ["ai_tool_plan_policy_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["ai_tool_plan_policy_supabase_boundary_detected"]),
  ];
  const errors = [
    ...(policySource ? [] : [`missing_file:${AI_TOOL_PLAN_POLICY_PATH}`]),
    ...(plansAllRegisteredTools ? [] : ["ai_tool_plan_policy_registry_coverage_missing"]),
    ...(blocksUnknownTools ? [] : ["ai_tool_plan_policy_unknown_tool_block_missing"]),
    ...(requiresSafeReadBindings ? [] : ["ai_tool_plan_policy_safe_read_binding_gate_missing"]),
    ...(directExecutionDisabled ? [] : ["ai_tool_plan_policy_direct_execution_enabled"]),
    ...(mutationDisabled ? [] : ["ai_tool_plan_policy_mutation_enabled"]),
    ...(providerCallsDisabled ? [] : ["ai_tool_plan_policy_provider_calls_enabled"]),
    ...(dbAccessDisabled ? [] : ["ai_tool_plan_policy_db_access_enabled"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_tool_plan_policy_architecture",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      policyPresent: Boolean(policySource),
      plansAllRegisteredTools,
      blocksUnknownTools,
      requiresSafeReadBindings,
      directExecutionDisabled,
      mutationDisabled,
      providerCallsDisabled,
      dbAccessDisabled,
      noLiveExecutionBoundary,
      noProviderImports,
      noSupabaseImports,
      findings,
    },
  };
}

const agentBffRouteShellLiveExecutionPattern =
  /\bexecuteTool\b|\brunTool\b|\btoolExecutor\b|\binvokeTool\b|\bfetch\s*\(|\bXMLHttpRequest\b|\.(?:from|rpc|insert|update|delete|upsert)\s*\(/i;
const agentBffRouteShellProviderPattern =
  /\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i;
const agentBffRouteShellDatabasePattern =
  /@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i;

export function evaluateAgentBffRouteShellArchitectureGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AgentBffRouteShellArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH });
  const allRoutesPresent =
    Boolean(shellSource?.includes("GET /agent/app-graph/screen/:screenId")) &&
    Boolean(shellSource?.includes("GET /agent/app-graph/action/:buttonId")) &&
    Boolean(shellSource?.includes("POST /agent/app-graph/resolve")) &&
    Boolean(shellSource?.includes("POST /agent/intel/compare")) &&
    Boolean(shellSource?.includes("GET /agent/task-stream")) &&
    Boolean(shellSource?.includes("GET /agent/tools")) &&
    Boolean(shellSource?.includes("POST /agent/tools/:name/validate")) &&
    Boolean(shellSource?.includes("POST /agent/tools/:name/preview")) &&
    Boolean(shellSource?.includes("POST /agent/action/submit-for-approval")) &&
    Boolean(shellSource?.includes("GET /agent/action/:actionId/status")) &&
    Boolean(shellSource?.includes("POST /agent/action/:actionId/approve")) &&
    Boolean(shellSource?.includes("POST /agent/action/:actionId/reject")) &&
    Boolean(shellSource?.includes("POST /agent/action/:actionId/execute-approved"));
  const authRequired =
    Boolean(shellSource?.includes("AGENT_BFF_AUTH_REQUIRED")) &&
    Boolean(shellSource?.includes("authRequired: true"));
  const roleFilteredTools =
    Boolean(shellSource?.includes("roleFilteredTools: true")) &&
    Boolean(shellSource?.includes("planAiToolUse"));
  const forbiddenToolsHidden = Boolean(shellSource?.includes("forbiddenToolsHidden: true"));
  const mutationCountZero =
    Boolean(shellSource?.includes("mutationCount: 0")) &&
    !Boolean(shellSource?.includes("mutationCount: 1"));
  const previewNeverMutates =
    Boolean(shellSource?.includes("previewMutates: false")) &&
    Boolean(shellSource?.includes("persisted: false")) &&
    Boolean(shellSource?.includes("providerCalled: false")) &&
    Boolean(shellSource?.includes("dbAccessed: false"));
  const noLiveExecutionBoundary = !agentBffRouteShellLiveExecutionPattern.test(shellSource ?? "");
  const noProviderImports = !agentBffRouteShellProviderPattern.test(shellSource ?? "");
  const noDirectDatabaseAccess = !agentBffRouteShellDatabasePattern.test(shellSource ?? "");
  const noForbiddenMutationTerms =
    !Boolean(shellSource?.includes("create_order")) &&
    !Boolean(shellSource?.includes("confirm_supplier")) &&
    !Boolean(shellSource?.includes("change_payment_status")) &&
    !Boolean(shellSource?.includes("change_warehouse_status"));
  const findings = [
    ...(noLiveExecutionBoundary ? [] : ["agent_bff_route_shell_live_execution_boundary_detected"]),
    ...(noProviderImports ? [] : ["agent_bff_route_shell_provider_import_detected"]),
    ...(noDirectDatabaseAccess ? [] : ["agent_bff_route_shell_direct_database_boundary_detected"]),
    ...(noForbiddenMutationTerms ? [] : ["agent_bff_route_shell_forbidden_mutation_term_detected"]),
  ];
  const errors = [
    ...(shellSource ? [] : [`missing_file:${AGENT_BFF_ROUTE_SHELL_PATH}`]),
    ...(allRoutesPresent ? [] : ["agent_bff_route_shell_missing_endpoint"]),
    ...(authRequired ? [] : ["agent_bff_route_shell_auth_not_required"]),
    ...(roleFilteredTools ? [] : ["agent_bff_route_shell_role_filter_missing"]),
    ...(forbiddenToolsHidden ? [] : ["agent_bff_route_shell_forbidden_tools_not_hidden"]),
    ...(mutationCountZero ? [] : ["agent_bff_route_shell_mutation_count_not_zero"]),
    ...(previewNeverMutates ? [] : ["agent_bff_route_shell_preview_mutates"]),
    ...findings,
  ];

  return {
    check: {
      name: "agent_bff_route_shell_architecture",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      shellPresent: Boolean(shellSource),
      allRoutesPresent,
      authRequired,
      roleFilteredTools,
      forbiddenToolsHidden,
      mutationCountZero,
      previewNeverMutates,
      noLiveExecutionBoundary,
      noProviderImports,
      noDirectDatabaseAccess,
      findings,
    },
  };
}

export function evaluateAiCommandCenterTaskStreamRuntimeGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiCommandCenterTaskStreamRuntimeArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const commandCenterSources = AI_COMMAND_CENTER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const runtimeSources = AI_TASK_STREAM_RUNTIME_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const commandCenterSource = commandCenterSources.join("\n");
  const runtimeSource = runtimeSources.join("\n");
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";

  const runtimeAdapterExists = runtimeSources.every((source) => source.length > 0);
  const taskStreamRouteExposed =
    shellSource.includes("GET /agent/task-stream") &&
    shellSource.includes("loadAiTaskStreamRuntime") &&
    shellSource.includes("agent.task_stream.read");
  const commandCenterUsesRuntime =
    commandCenterSource.includes("GET /agent/task-stream") &&
    commandCenterSource.includes("runtimeStatus") &&
    commandCenterSource.includes("taskStreamLoaded") &&
    !commandCenterSource.includes("sourceCards: input.sourceCards ?? []");
  const roleScopeExists =
    runtimeSource.includes("canUseAiCapability") &&
    runtimeSource.includes("getAllowedAiDomainsForRole") &&
    runtimeSource.includes("roleScoped: true");
  const screenPolicyExists =
    runtimeSource.includes("screenId") &&
    runtimeSource.includes("ai.command.center") &&
    runtimeSource.includes("sourceScreenId");
  const evidenceRequirementExists =
    runtimeSource.includes("hasAiTaskStreamEvidence") &&
    runtimeSource.includes("evidenceRequired: true") &&
    runtimeSource.includes("evidenceBacked: true");
  const mutationCountZero =
    runtimeSource.includes("mutationCount: 0") &&
    runtimeSource.includes("mutation_count: 0") &&
    !runtimeSource.includes("mutationCount: 1");
  const directMutationBlocked =
    runtimeSource.includes("directMutationAllowed: false") &&
    !/\b(create_order|confirm_supplier|change_payment_status|change_warehouse_status)\s*\(/.test(runtimeSource);
  const submitForApprovalNoFinalExecution =
    commandCenterSource.includes("Final mutation was not executed") &&
    commandCenterSource.includes("submit_for_approval") &&
    commandCenterSource.includes("mutationCount: 0");
  const noFakeCards =
    runtimeSource.includes("fakeCards: false") &&
    !/fake task card|fake card|hardcoded task/i.test(runtimeSource);
  const noHardcodedAiResponse =
    runtimeSource.includes("hardcodedAiResponse: false") &&
    !/hardcoded AI response|fake AI answer/i.test(`${runtimeSource}\n${commandCenterSource}`);
  const noSupabaseUiImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(commandCenterSource);
  const noModelProviderUiImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(commandCenterSource);
  const noRawPayloadFields =
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows)\s*:/.test(runtimeSource);
  const unknownRoleDenied = runtimeSource.includes("Unknown AI role is denied by default");
  const findings = [
    ...(taskStreamRouteExposed ? [] : ["command_center_task_stream_route_not_exposed"]),
    ...(commandCenterUsesRuntime ? [] : ["command_center_not_using_runtime_task_stream"]),
    ...(roleScopeExists ? [] : ["task_stream_runtime_role_policy_missing"]),
    ...(screenPolicyExists ? [] : ["task_stream_runtime_screen_policy_missing"]),
    ...(evidenceRequirementExists ? [] : ["task_stream_runtime_evidence_requirement_missing"]),
    ...(mutationCountZero ? [] : ["task_stream_runtime_mutation_count_not_zero"]),
    ...(directMutationBlocked ? [] : ["task_stream_runtime_direct_mutation_allowed"]),
    ...(submitForApprovalNoFinalExecution ? [] : ["submit_for_approval_final_execution_possible"]),
    ...(noFakeCards ? [] : ["command_center_fake_cards_detected"]),
    ...(noHardcodedAiResponse ? [] : ["command_center_hardcoded_ai_response_detected"]),
    ...(noSupabaseUiImport ? [] : ["command_center_ui_supabase_import_detected"]),
    ...(noModelProviderUiImport ? [] : ["command_center_ui_model_provider_import_detected"]),
    ...(noRawPayloadFields ? [] : ["task_stream_runtime_raw_payload_field_detected"]),
    ...(unknownRoleDenied ? [] : ["task_stream_runtime_unknown_role_not_denied"]),
  ];
  const errors = [
    ...(runtimeAdapterExists ? [] : ["ai_task_stream_runtime_files_missing"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_command_center_task_stream_runtime",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      runtimeAdapterExists,
      taskStreamRouteExposed,
      commandCenterUsesRuntime,
      roleScopeExists,
      screenPolicyExists,
      evidenceRequirementExists,
      mutationCountZero,
      directMutationBlocked,
      submitForApprovalNoFinalExecution,
      noFakeCards,
      noHardcodedAiResponse,
      noSupabaseUiImport,
      noModelProviderUiImport,
      noRawPayloadFields,
      unknownRoleDenied,
      findings,
    },
  };
}

export function evaluateAiAppActionGraphArchitectureGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiAppActionGraphArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const appGraphSources = AI_APP_ACTION_GRAPH_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const domainGraphSources = AI_DOMAIN_GRAPH_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const externalIntelSources = AI_EXTERNAL_INTEL_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const appGraphSource = appGraphSources.join("\n");
  const domainGraphSource = domainGraphSources.join("\n");
  const externalIntelSource = externalIntelSources.join("\n");
  const internalFirstSource =
    safeReadProjectFile({ readFile, relativePath: AI_INTERNAL_FIRST_POLICY_PATH }) ?? "";
  const scannerSource =
    safeReadProjectFile({ readFile, relativePath: AI_APP_ACTION_GRAPH_COVERAGE_SCANNER_PATH }) ?? "";
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const commandCenterSource = (safeReadProjectFile({
    readFile,
    relativePath: "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  }) ?? "");

  const appGraphFilesPresent = appGraphSources.every((source) => source.length > 0);
  const domainGraphFilesPresent = domainGraphSources.every((source) => source.length > 0);
  const internalFirstPolicyPresent =
    internalFirstSource.includes("InternalFirstDecision") &&
    internalFirstSource.includes("external_source_used_before_internal_search") &&
    internalFirstSource.includes("final_decision_from_external_only");
  const externalIntelPolicyPresent =
    externalIntelSources.every((source) => source.length > 0) &&
    externalIntelSource.includes("ExternalSourcePolicy") &&
    externalIntelSource.includes("EXTERNAL_SOURCE_REGISTRY");
  const bffRoutesPresent =
    shellSource.includes("GET /agent/app-graph/screen/:screenId") &&
    shellSource.includes("GET /agent/app-graph/action/:buttonId") &&
    shellSource.includes("POST /agent/app-graph/resolve") &&
    shellSource.includes("POST /agent/intel/compare") &&
    shellSource.includes("resolveAiActionGraph") &&
    shellSource.includes("resolveInternalFirstDecision");
  const requiredScreens = [
    "director.dashboard",
    "ai.command.center",
    "buyer.main",
    "market.home",
    "accountant.main",
    "foreman.main",
    "foreman.subcontract",
    "warehouse.main",
    "contractor.main",
    "office.hub",
    "map.main",
    "chat.main",
  ] as const;
  const majorScreensRegistered = requiredScreens.every((screenId) =>
    appGraphSource.includes(`screenId: "${screenId}"`) || appGraphSource.includes(`"${screenId}"`),
  );
  const aiRelevantButtonsMapped =
    appGraphSource.includes("AI_BUTTON_ACTION_REGISTRY") &&
    appGraphSource.includes("buttonId") &&
    appGraphSource.includes("testId") &&
    appGraphSource.includes("sourceEntities");
  const buttonCoverageScannerPresent =
    scannerSource.includes("Pressable") &&
    scannerSource.includes("TouchableOpacity") &&
    scannerSource.includes("ai_relevant_button_missing_registry_entry") &&
    scannerSource.includes("approval_required_action_executes_directly");
  const businessActionsHaveRiskPolicy =
    appGraphSource.includes('riskLevel: "safe_read"') &&
    appGraphSource.includes('riskLevel: "draft_only"') &&
    appGraphSource.includes('riskLevel: "approval_required"') &&
    appGraphSource.includes('riskLevel: "forbidden"') &&
    appGraphSource.includes("approvalRequired") &&
    appGraphSource.includes("evidenceRequired");
  const approvalRequiredCannotExecuteDirectly =
    appGraphSource.includes("directExecutionAllowed: false") &&
    appGraphSource.includes("mutationCount: 0") &&
    shellSource.includes("mutates: false") &&
    shellSource.includes("executesTool: false");
  const forbiddenActionsHaveNoTool =
    appGraphSource.includes('riskLevel: "forbidden"') &&
    !/riskLevel:\s*"forbidden"[\s\S]{0,240}requiredTool:/.test(appGraphSource);
  const externalSourcesRequireCitation =
    externalIntelSource.includes("requiresCitation: true") &&
    externalIntelSource.includes("citationsRequired: true");
  const externalLiveFetchDisabled =
    externalIntelSource.includes("EXTERNAL_LIVE_FETCH_ENABLED = false") &&
    externalIntelSource.includes("externalLiveFetchEnabled: false");
  const externalFinalActionForbidden =
    externalIntelSource.includes("forbiddenForFinalAction: true") &&
    externalIntelSource.includes("finalActionForbidden: true");
  const noMobileExternalLiveFetch =
    !/\bfetch\s*\(|\bXMLHttpRequest\b|mobile_side_internet_fetch/i.test(externalIntelSource) &&
    !/externalIntelResolver/.test(commandCenterSource);
  const noUiSupabaseGraphImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      commandCenterSource,
    );
  const noUiModelProviderGraphImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      commandCenterSource,
    );
  const noRawPayloadFields =
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows)\s*:/.test(
      `${appGraphSource}\n${domainGraphSource}\n${internalFirstSource}\n${externalIntelSource}`,
    );
  const mutationCountZero =
    appGraphSource.includes("mutationCount: 0") &&
    shellSource.includes("mutationCount: 0") &&
    !`${appGraphSource}\n${shellSource}`.includes("mutationCount: 1");
  const findings = [
    ...(appGraphFilesPresent ? [] : ["app_action_graph_files_missing"]),
    ...(domainGraphFilesPresent ? [] : ["domain_entity_graph_files_missing"]),
    ...(internalFirstPolicyPresent ? [] : ["internal_first_policy_missing"]),
    ...(externalIntelPolicyPresent ? [] : ["external_intel_policy_missing"]),
    ...(bffRoutesPresent ? [] : ["app_action_graph_bff_routes_missing"]),
    ...(majorScreensRegistered ? [] : ["major_screen_missing_action_graph"]),
    ...(aiRelevantButtonsMapped ? [] : ["ai_relevant_button_missing_registry_entry"]),
    ...(buttonCoverageScannerPresent ? [] : ["button_action_coverage_scanner_missing"]),
    ...(businessActionsHaveRiskPolicy ? [] : ["business_action_missing_risk_policy"]),
    ...(approvalRequiredCannotExecuteDirectly ? [] : ["approval_required_action_can_execute_directly"]),
    ...(forbiddenActionsHaveNoTool ? [] : ["forbidden_action_has_tool"]),
    ...(externalSourcesRequireCitation ? [] : ["external_source_lacks_citation_policy"]),
    ...(externalLiveFetchDisabled ? [] : ["external_live_fetch_enabled"]),
    ...(externalFinalActionForbidden ? [] : ["external_source_final_action_allowed"]),
    ...(noMobileExternalLiveFetch ? [] : ["mobile_external_live_fetch_detected"]),
    ...(noUiSupabaseGraphImport ? [] : ["ui_supabase_import_for_ai_graph_detected"]),
    ...(noUiModelProviderGraphImport ? [] : ["ui_model_provider_import_for_ai_graph_detected"]),
    ...(noRawPayloadFields ? [] : ["ai_graph_raw_payload_field_detected"]),
    ...(mutationCountZero ? [] : ["ai_graph_mutation_count_not_zero"]),
  ];

  return {
    check: {
      name: "ai_app_action_graph_architecture",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      appGraphFilesPresent,
      domainGraphFilesPresent,
      internalFirstPolicyPresent,
      externalIntelPolicyPresent,
      bffRoutesPresent,
      majorScreensRegistered,
      aiRelevantButtonsMapped,
      buttonCoverageScannerPresent,
      businessActionsHaveRiskPolicy,
      approvalRequiredCannotExecuteDirectly,
      forbiddenActionsHaveNoTool,
      externalSourcesRequireCitation,
      externalLiveFetchDisabled,
      externalFinalActionForbidden,
      noMobileExternalLiveFetch,
      noUiSupabaseGraphImport,
      noUiModelProviderGraphImport,
      noRawPayloadFields,
      mutationCountZero,
      findings,
    },
  };
}

export function evaluateAiProcurementContextEngineGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiProcurementContextEngineArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const procurementSources = AI_PROCUREMENT_CONTEXT_ENGINE_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const procurementSource = procurementSources.join("\n");
  const supplierMatchSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/procurement/procurementSupplierMatchEngine.ts",
    }) ?? "";
  const draftSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/procurement/procurementDraftPlanBuilder.ts",
    }) ?? "";
  const internalFirstSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/procurement/procurementInternalFirstEngine.ts",
    }) ?? "";
  const externalIntelSource = AI_EXTERNAL_INTEL_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const commandCenterSource = (safeReadProjectFile({
    readFile,
    relativePath: "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  }) ?? "");
  const e2eRunnerSource =
    safeReadProjectFile({ readFile, relativePath: AI_PROCUREMENT_E2E_RUNNER_PATH }) ?? "";
  const e2eRequestResolverSource =
    safeReadProjectFile({ readFile, relativePath: AI_PROCUREMENT_E2E_REQUEST_RESOLVER_PATH }) ?? "";

  const procurementFilesPresent = procurementSources.every((source) => source.length > 0);
  const bffRoutesPresent =
    shellSource.includes("GET /agent/procurement/request-context/:requestId") &&
    shellSource.includes("POST /agent/procurement/supplier-match/preview") &&
    shellSource.includes("POST /agent/procurement/draft-request/preview") &&
    shellSource.includes("POST /agent/procurement/submit-for-approval") &&
    shellSource.includes("AGENT_PROCUREMENT_BFF_CONTRACT");
  const requestContextResolverPresent =
    procurementSource.includes("resolveProcurementRequestContext") &&
    procurementSource.includes("PROCUREMENT_CONTEXT_ALLOWED_ROLES") &&
    procurementSource.includes("requestIdHash") &&
    procurementSource.includes("allowedNextActions");
  const internalFirstPolicyPresent =
    internalFirstSource.includes("buildProcurementInternalFirstPlan") &&
    internalFirstSource.includes("resolveInternalFirstDecision") &&
    internalFirstSource.includes("internalDataChecked: true");
  const marketplaceSecondPolicyPresent =
    internalFirstSource.includes('sourceOrder: ["internal_app", "marketplace", "external_policy"]') &&
    supplierMatchSource.includes("runSearchCatalogToolSafeRead") &&
    supplierMatchSource.includes("runCompareSuppliersToolSafeRead");
  const externalLiveFetchDisabled =
    externalIntelSource.includes("EXTERNAL_LIVE_FETCH_ENABLED = false") &&
    procurementSource.includes("externalChecked: false");
  const externalCitationPolicyPresent =
    externalIntelSource.includes("requiresCitation: true") &&
    externalIntelSource.includes("citationsRequired: true") &&
    externalIntelSource.includes("forbiddenForFinalAction: true");
  const externalCheckedAtPolicyPresent =
    externalIntelSource.includes("requiresCheckedAt: true") &&
    externalIntelSource.includes("checkedAtRequired: true") &&
    externalIntelSource.includes("freshnessWindowDays");
  const supplierMatchUsesSafeToolsOnly =
    supplierMatchSource.includes("runSearchCatalogToolSafeRead") &&
    supplierMatchSource.includes("runCompareSuppliersToolSafeRead") &&
    !/run(?:Draft|Submit|GetFinance|GetWarehouse|ActionStatus)/.test(supplierMatchSource);
  const supplierMatchNoFinalSelection =
    supplierMatchSource.includes("supplierSelectionAllowed: false") &&
    supplierMatchSource.includes("orderCreationAllowed: false") &&
    supplierMatchSource.includes("warehouseMutationAllowed: false") &&
    !/supplierSelectionAllowed:\s*true|orderCreationAllowed:\s*true|warehouseMutationAllowed:\s*true/.test(
      supplierMatchSource,
    );
  const draftRequestDraftOnly =
    draftSource.includes("runDraftRequestToolDraftOnly") &&
    draftSource.includes("finalMutationAllowed: false") &&
    draftSource.includes("toolsCalled") &&
    !/finalMutationAllowed:\s*true|runSubmitForApprovalToolGate/.test(draftSource);
  const submitForApprovalNoFinalExecution =
    shellSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY") &&
    shellSource.includes("persistentBackendFound") &&
    shellSource.includes("finalExecution: 0") &&
    shellSource.includes("mutationCount: 0");
  const noProviderImports =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      procurementSource,
    );
  const noSupabaseImports =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      procurementSource,
    ) && !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/.test(procurementSource);
  const noUiSupabaseImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      commandCenterSource,
    );
  const noUiExternalFetch =
    !/\bfetch\s*\(|\bXMLHttpRequest\b|externalIntelResolver|external_live_fetch/i.test(
      commandCenterSource,
    );
  const noUiModelProviderImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      commandCenterSource,
    );
  const noRawOutputFields =
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows|rawRows)\s*:/.test(
      procurementSource,
    );
  const noApprovalPersistenceFake =
    shellSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY") &&
    !/local_gate_only:\s*true|persisted:\s*true/.test(shellSource);
  const e2eRunnerPresent =
    e2eRunnerSource.includes("runAiProcurementContextMaestro") &&
    e2eRunnerSource.includes("BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE") &&
    e2eRunnerSource.includes("mutations_created: 0");
  const e2eBoundedRealRequestDiscoveryPresent =
    e2eRunnerSource.includes("resolveAiProcurementRuntimeRequest") &&
    e2eRequestResolverSource.includes("buyer_summary_inbox_scope_v1") &&
    e2eRequestResolverSource.includes("p_limit: BUYER_SUMMARY_INBOX_LIMIT") &&
    e2eRequestResolverSource.includes("safeSnapshot") &&
    e2eRequestResolverSource.includes("bounded_buyer_summary_rpc");
  const e2eRequestDiscoveryNoSeedOrAdmin =
    Boolean(e2eRequestResolverSource) &&
    !/auth\.admin|\.listUsers\s*\(|\.(?:from|select|insert|update|delete|upsert)\s*\(|dbSeedUsed:\s*true|fakeRequestCreated:\s*true|service_role/i.test(
      e2eRequestResolverSource,
    );
  const findings = [
    ...(procurementFilesPresent ? [] : ["procurement_context_engine_files_missing"]),
    ...(bffRoutesPresent ? [] : ["procurement_bff_routes_missing"]),
    ...(requestContextResolverPresent ? [] : ["procurement_request_context_resolver_missing"]),
    ...(internalFirstPolicyPresent ? [] : ["procurement_internal_first_policy_missing"]),
    ...(marketplaceSecondPolicyPresent ? [] : ["procurement_marketplace_second_policy_missing"]),
    ...(externalLiveFetchDisabled ? [] : ["procurement_external_live_fetch_enabled"]),
    ...(externalCitationPolicyPresent ? [] : ["procurement_external_citation_policy_missing"]),
    ...(externalCheckedAtPolicyPresent ? [] : ["procurement_external_checked_at_policy_missing"]),
    ...(supplierMatchUsesSafeToolsOnly ? [] : ["procurement_supplier_match_unsafe_tool"]),
    ...(supplierMatchNoFinalSelection ? [] : ["procurement_supplier_match_final_selection_allowed"]),
    ...(draftRequestDraftOnly ? [] : ["procurement_draft_request_not_draft_only"]),
    ...(submitForApprovalNoFinalExecution ? [] : ["procurement_submit_for_approval_final_execution"]),
    ...(noProviderImports ? [] : ["procurement_model_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["procurement_supabase_import_detected"]),
    ...(noUiSupabaseImport ? [] : ["procurement_ui_supabase_import_detected"]),
    ...(noUiExternalFetch ? [] : ["procurement_ui_external_fetch_detected"]),
    ...(noUiModelProviderImport ? [] : ["procurement_ui_model_provider_import_detected"]),
    ...(noRawOutputFields ? [] : ["procurement_raw_output_field_detected"]),
    ...(noApprovalPersistenceFake ? [] : ["procurement_fake_approval_persistence_detected"]),
    ...(e2eRunnerPresent ? [] : ["procurement_e2e_runner_missing"]),
    ...(e2eBoundedRealRequestDiscoveryPresent ? [] : ["procurement_e2e_bounded_request_discovery_missing"]),
    ...(e2eRequestDiscoveryNoSeedOrAdmin ? [] : ["procurement_e2e_request_discovery_seed_or_admin_detected"]),
  ];

  return {
    check: {
      name: "ai_procurement_context_engine",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      procurementFilesPresent,
      bffRoutesPresent,
      requestContextResolverPresent,
      internalFirstPolicyPresent,
      marketplaceSecondPolicyPresent,
      externalLiveFetchDisabled,
      externalCitationPolicyPresent,
      externalCheckedAtPolicyPresent,
      supplierMatchUsesSafeToolsOnly,
      supplierMatchNoFinalSelection,
      draftRequestDraftOnly,
      submitForApprovalNoFinalExecution,
      noProviderImports,
      noSupabaseImports,
      noUiSupabaseImport,
      noUiExternalFetch,
      noUiModelProviderImport,
      noRawOutputFields,
      noApprovalPersistenceFake,
      e2eRunnerPresent,
      e2eBoundedRealRequestDiscoveryPresent,
      e2eRequestDiscoveryNoSeedOrAdmin,
      findings,
    },
  };
}

export function evaluateAiExternalIntelGatewayGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiExternalIntelGatewayArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const externalIntelSources = AI_EXTERNAL_INTEL_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const externalIntelSource = externalIntelSources.join("\n");
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const procurementSource = AI_PROCUREMENT_CONTEXT_ENGINE_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const commandCenterSource = AI_COMMAND_CENTER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const e2eRunnerSource =
    safeReadProjectFile({ readFile, relativePath: AI_EXTERNAL_INTEL_E2E_RUNNER_PATH }) ?? "";
  const artifactSource = [
    "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_inventory.json",
    "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_matrix.json",
    "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_emulator.json",
    "artifacts/S_AI_MAGIC_03_EXTERNAL_INTEL_GATEWAY_proof.md",
  ].map((relativePath) => safeReadProjectFile({ readFile, relativePath }) ?? "").join("\n");

  const gatewayFilesPresent =
    externalIntelSources.every((source) => source.length > 0) &&
    externalIntelSource.includes("ExternalIntelGateway") &&
    externalIntelSource.includes("DisabledExternalIntelProvider");
  const sourceRegistryPresent =
    externalIntelSource.includes("EXTERNAL_SOURCE_REGISTRY") &&
    externalIntelSource.includes("supplier_public_catalog") &&
    externalIntelSource.includes("currency_or_macro_reference");
  const disabledProviderDefault =
    externalIntelSource.includes('EXTERNAL_INTEL_PROVIDER_DEFAULT = "disabled"') &&
    externalIntelSource.includes("new DisabledExternalIntelProvider()") &&
    externalIntelSource.includes("external_policy_not_enabled");
  const providerFlagsPresent =
    externalIntelSource.includes("resolveExternalIntelProviderFlags") &&
    externalIntelSource.includes("AI_EXTERNAL_INTEL_LIVE_ENABLED") &&
    externalIntelSource.includes("AI_EXTERNAL_INTEL_PROVIDER") &&
    externalIntelSource.includes("approvedProviderConfigured");
  const internalFirstGatePresent =
    externalIntelSource.includes("resolveInternalFirstExternalGate") &&
    externalIntelSource.includes("internal_evidence_required") &&
    externalIntelSource.includes("marketplace_check_required_for_procurement");
  const bffRouteContractPresent =
    shellSource.includes("GET /agent/external-intel/sources") &&
    shellSource.includes("POST /agent/external-intel/search/preview") &&
    shellSource.includes("POST /agent/procurement/external-supplier-candidates/preview") &&
    shellSource.includes("AGENT_EXTERNAL_INTEL_BFF_CONTRACT");
  const procurementExternalCandidatesPresent =
    procurementSource.includes("previewProcurementExternalSupplierCandidates") &&
    procurementSource.includes("finalActionAllowed: false") &&
    procurementSource.includes("requiresApprovalForAction: true");
  const citationPolicyPresent =
    externalIntelSource.includes("requiresCitation: true") &&
    externalIntelSource.includes("citationsRequired: true") &&
    externalIntelSource.includes("citationsForResults") &&
    !/requiresCitation:\s*false|citationsRequired:\s*false/.test(externalIntelSource);
  const checkedAtPolicyPresent =
    externalIntelSource.includes("requiresCheckedAt: true") &&
    externalIntelSource.includes("checkedAtRequired: true") &&
    externalIntelSource.includes("checkedAt") &&
    !/requiresCheckedAt:\s*false|checkedAtRequired:\s*false/.test(externalIntelSource);
  const externalLiveFetchDisabledByDefault =
    externalIntelSource.includes("EXTERNAL_LIVE_FETCH_ENABLED = false") &&
    externalIntelSource.includes('EXTERNAL_INTEL_PROVIDER_DEFAULT = "disabled"') &&
    shellSource.includes("liveEnabled: false");
  const noMobileExternalFetch =
    !/\bfetch\s*\(|\bXMLHttpRequest\b|cheerio|puppeteer|uncontrolled_scraping/i.test(
      `${externalIntelSource}\n${commandCenterSource}`,
    );
  const noUiProviderImport =
    !/ExternalIntelGateway|DisabledExternalIntelProvider|externalIntelProvider|approved_search_api/i.test(
      commandCenterSource,
    );
  const noRawHtmlToMobile =
    !/\brawHtml\s*:|\bhtml\s*:|raw_html_payload|rawHtmlBody/i.test(
      `${externalIntelSource}\n${shellSource}\n${procurementSource}`,
    );
  const noSecretsInSourceOrArtifacts =
    !/(?:sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[0-9A-Za-z._-]{12,}|apiKey:\s*["'][^"']+["'])/.test(
      `${externalIntelSource}\n${artifactSource}`,
    );
  const noAuthAdminOrServiceRole =
    !/\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      `${externalIntelSource}\n${shellSource}\n${procurementSource}`,
    );
  const noMutationSurface =
    !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(|\bcreateOrder\b|\bconfirmSupplier\b|\bsendRfq\b|\bwarehouseMutation\b|\bsendDocument\b/i.test(
      `${externalIntelSource}\n${procurementSource}`,
    ) &&
    shellSource.includes("mutationCount: 0") &&
    e2eRunnerSource.includes("mutations_created: 0");
  const externalFinalActionForbidden =
    externalIntelSource.includes("forbiddenForFinalAction: true") &&
    procurementSource.includes("finalActionAllowed: false") &&
    shellSource.includes("finalActionAllowed: false") &&
    !/forbiddenForFinalAction:\s*false|finalActionAllowed:\s*true|supplierConfirmationAllowed:\s*true|orderCreationAllowed:\s*true/.test(
      `${externalIntelSource}\n${procurementSource}\n${shellSource}`,
    );
  const findings = [
    ...(gatewayFilesPresent ? [] : ["external_intel_gateway_files_missing"]),
    ...(sourceRegistryPresent ? [] : ["external_source_registry_missing"]),
    ...(disabledProviderDefault ? [] : ["external_disabled_provider_default_missing"]),
    ...(providerFlagsPresent ? [] : ["external_provider_flags_missing"]),
    ...(internalFirstGatePresent ? [] : ["external_internal_first_gate_missing"]),
    ...(bffRouteContractPresent ? [] : ["external_intel_bff_route_contract_missing"]),
    ...(procurementExternalCandidatesPresent ? [] : ["procurement_external_candidates_missing"]),
    ...(citationPolicyPresent ? [] : ["external_citation_policy_missing"]),
    ...(checkedAtPolicyPresent ? [] : ["external_checked_at_policy_missing"]),
    ...(externalLiveFetchDisabledByDefault ? [] : ["external_live_fetch_default_true"]),
    ...(noMobileExternalFetch ? [] : ["mobile_external_fetch_detected"]),
    ...(noUiProviderImport ? [] : ["ui_external_provider_import_detected"]),
    ...(noRawHtmlToMobile ? [] : ["raw_html_mobile_payload_detected"]),
    ...(noSecretsInSourceOrArtifacts ? [] : ["external_provider_secret_detected"]),
    ...(noAuthAdminOrServiceRole ? [] : ["external_auth_admin_or_service_role_detected"]),
    ...(noMutationSurface ? [] : ["external_mutation_surface_detected"]),
    ...(externalFinalActionForbidden ? [] : ["external_final_action_allowed"]),
  ];

  return {
    check: {
      name: "ai_external_intel_gateway",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      gatewayFilesPresent,
      sourceRegistryPresent,
      disabledProviderDefault,
      providerFlagsPresent,
      internalFirstGatePresent,
      bffRouteContractPresent,
      procurementExternalCandidatesPresent,
      citationPolicyPresent,
      checkedAtPolicyPresent,
      externalLiveFetchDisabledByDefault,
      noMobileExternalFetch,
      noUiProviderImport,
      noRawHtmlToMobile,
      noSecretsInSourceOrArtifacts,
      noAuthAdminOrServiceRole,
      noMutationSurface,
      externalFinalActionForbidden,
      findings,
    },
  };
}

export function evaluateAiProcurementCopilotRuntimeChainGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiProcurementCopilotRuntimeChainArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const copilotSources = AI_PROCUREMENT_COPILOT_RUNTIME_CHAIN_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const copilotSource = copilotSources.join("\n");
  const externalIntelSource = AI_EXTERNAL_INTEL_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const commandCenterSource = AI_COMMAND_CENTER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const e2eRunnerSource =
    safeReadProjectFile({ readFile, relativePath: AI_PROCUREMENT_COPILOT_E2E_RUNNER_PATH }) ?? "";

  const copilotFilesPresent =
    copilotSources.every((source) => source.length > 0) &&
    copilotSource.includes("ProcurementCopilotPlan") &&
    copilotSource.includes("buildProcurementCopilotPlan");
  const bffRoutesPresent =
    shellSource.includes("GET /agent/procurement/copilot/context") &&
    shellSource.includes("POST /agent/procurement/copilot/plan") &&
    shellSource.includes("POST /agent/procurement/copilot/draft-preview") &&
    shellSource.includes("POST /agent/procurement/copilot/submit-for-approval-preview");
  const planEnginePresent =
    copilotSource.includes("runProcurementCopilotRuntimeChain") &&
    copilotSource.includes("resolveProcurementRequestContext") &&
    copilotSource.includes("previewProcurementSupplierMatch");
  const internalFirstOrderPresent =
    copilotSource.includes("PROCUREMENT_COPILOT_SOURCE_ORDER") &&
    copilotSource.includes("internal_request_context") &&
    copilotSource.indexOf("internal_request_context") < copilotSource.indexOf("internal_marketplace") &&
    copilotSource.indexOf("internal_marketplace") < copilotSource.indexOf("external_intel_status");
  const marketplaceSecondPresent =
    copilotSource.includes("search_catalog") &&
    copilotSource.includes("compare_suppliers") &&
    copilotSource.includes("previewProcurementSupplierMatch") &&
    copilotSource.includes("recordStep?.(\"internal_marketplace\")") &&
    copilotSource.includes("recordStep?.(\"external_intel_status\")") &&
    copilotSource.includes("external_intel_status") &&
    internalFirstOrderPresent;
  const externalStatusBridgePresent =
    copilotSource.includes("previewProcurementCopilotExternalIntel") &&
    copilotSource.includes("ExternalIntelGateway") &&
    copilotSource.includes("externalResultCanFinalize: false");
  const externalLiveFetchDisabled =
    externalIntelSource.includes("EXTERNAL_LIVE_FETCH_ENABLED = false") &&
    externalIntelSource.includes('EXTERNAL_INTEL_PROVIDER_DEFAULT = "disabled"') &&
    !/externalLiveFetchEnabled:\s*true|external_live_fetch_enabled\s*=\s*true/i.test(copilotSource);
  const draftPreviewOnly =
    copilotSource.includes("buildProcurementDraftPreview") &&
    copilotSource.includes("draft_request") &&
    !/finalMutationAllowed:\s*true|runSubmitForApprovalToolGate|final submit/i.test(copilotSource);
  const submitForApprovalPreviewOnly =
    copilotSource.includes("previewProcurementCopilotSubmitForApproval") &&
    copilotSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY") &&
    copilotSource.includes("finalExecution: 0") &&
    copilotSource.includes("persisted: false");
  const supplierCardsRequireEvidence =
    copilotSource.includes("assertProcurementCopilotSupplierEvidence") &&
    copilotSource.includes("card.evidenceRefs.length > 0") &&
    copilotSource.includes("supplier_card_");
  const noProviderImports =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      copilotSource,
    );
  const noSupabaseImports =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      copilotSource,
    ) && !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/.test(copilotSource);
  const noUiSupabaseImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      commandCenterSource,
    );
  const noUiExternalFetch =
    !/\bfetch\s*\(|\bXMLHttpRequest\b|externalIntelResolver|external_live_fetch/i.test(
      commandCenterSource,
    );
  const noUiModelProviderImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      commandCenterSource,
    );
  const noRawOutputFields =
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows|rawRows|rawHtml|raw_html)\s*:/.test(
      copilotSource,
    );
  const noHardcodedSupplierCards =
    !/fake_supplier|fake marketplace|hardcoded_supplier|supplierCards:\s*\[\s*{|"Supplier\s+[A-Z][A-Za-z]*"/i.test(
      copilotSource,
    );
  const noMutationSurface =
    !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(|\bcreateOrder\b|\bconfirmSupplier\b|\bsendRfq\b|\bwarehouseMutation\b|\bsendDocument\b/i.test(
      copilotSource,
    ) &&
    copilotSource.includes("mutationCount: 0") &&
    copilotSource.includes("orderCreationAllowed: false") &&
    copilotSource.includes("supplierConfirmationAllowed: false");
  const e2eRunnerPresent =
    e2eRunnerSource.includes("runAiProcurementCopilotMaestro") &&
    e2eRunnerSource.includes("ai.procurement.copilot.screen") &&
    e2eRunnerSource.includes("BLOCKED_PROCUREMENT_TEST_REQUEST_NOT_AVAILABLE") &&
    e2eRunnerSource.includes("mutations_created: 0");
  const findings = [
    ...(copilotFilesPresent ? [] : ["procurement_copilot_files_missing"]),
    ...(bffRoutesPresent ? [] : ["procurement_copilot_bff_routes_missing"]),
    ...(planEnginePresent ? [] : ["procurement_copilot_plan_engine_missing"]),
    ...(internalFirstOrderPresent ? [] : ["procurement_copilot_internal_first_order_missing"]),
    ...(marketplaceSecondPresent ? [] : ["procurement_copilot_marketplace_second_missing"]),
    ...(externalStatusBridgePresent ? [] : ["procurement_copilot_external_bridge_missing"]),
    ...(externalLiveFetchDisabled ? [] : ["procurement_copilot_external_live_fetch_enabled"]),
    ...(draftPreviewOnly ? [] : ["procurement_copilot_draft_not_preview_only"]),
    ...(submitForApprovalPreviewOnly ? [] : ["procurement_copilot_submit_executes_final_action"]),
    ...(supplierCardsRequireEvidence ? [] : ["procurement_copilot_supplier_card_evidence_missing"]),
    ...(noProviderImports ? [] : ["procurement_copilot_model_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["procurement_copilot_supabase_import_detected"]),
    ...(noUiSupabaseImport ? [] : ["procurement_copilot_ui_supabase_import_detected"]),
    ...(noUiExternalFetch ? [] : ["procurement_copilot_ui_external_fetch_detected"]),
    ...(noUiModelProviderImport ? [] : ["procurement_copilot_ui_model_provider_import_detected"]),
    ...(noRawOutputFields ? [] : ["procurement_copilot_raw_output_field_detected"]),
    ...(noHardcodedSupplierCards ? [] : ["procurement_copilot_hardcoded_supplier_cards_detected"]),
    ...(noMutationSurface ? [] : ["procurement_copilot_mutation_surface_detected"]),
    ...(e2eRunnerPresent ? [] : ["procurement_copilot_e2e_runner_missing"]),
  ];

  return {
    check: {
      name: "ai_procurement_copilot_runtime_chain",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      copilotFilesPresent,
      bffRoutesPresent,
      planEnginePresent,
      internalFirstOrderPresent,
      marketplaceSecondPresent,
      externalStatusBridgePresent,
      externalLiveFetchDisabled,
      draftPreviewOnly,
      submitForApprovalPreviewOnly,
      supplierCardsRequireEvidence,
      noProviderImports,
      noSupabaseImports,
      noUiSupabaseImport,
      noUiExternalFetch,
      noUiModelProviderImport,
      noRawOutputFields,
      noHardcodedSupplierCards,
      noMutationSurface,
      e2eRunnerPresent,
      findings,
    },
  };
}

export function evaluateAiCrossScreenRuntimeMatrixGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiCrossScreenRuntimeMatrixArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const runtimeSources = AI_SCREEN_RUNTIME_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const runtimeSource = runtimeSources.join("\n");
  const registrySource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/screenRuntime/aiScreenRuntimeRegistry.ts",
    }) ?? "";
  const producersSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/screenRuntime/aiScreenRuntimeProducers.ts",
    }) ?? "";
  const resolverSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/screenRuntime/aiScreenRuntimeResolver.ts",
    }) ?? "";
  const bffSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/screenRuntime/aiScreenRuntimeBff.ts",
    }) ?? "";
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const commandCenterSource = AI_COMMAND_CENTER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");
  const e2eRunnerSource =
    safeReadProjectFile({ readFile, relativePath: AI_CROSS_SCREEN_RUNTIME_E2E_RUNNER_PATH }) ?? "";
  const requiredScreens = [
    "director.dashboard",
    "ai.command.center",
    "buyer.main",
    "market.home",
    "accountant.main",
    "foreman.main",
    "foreman.subcontract",
    "warehouse.main",
    "contractor.main",
    "office.hub",
    "map.main",
    "chat.main",
    "reports.modal",
    "documents.surface",
  ] as const;
  const producerNames = [
    "directorControlProducer",
    "accountantFinanceProducer",
    "buyerProcurementProducer",
    "foremanObjectProducer",
    "warehouseStatusProducer",
    "contractorOwnWorkProducer",
    "officeAccessProducer",
    "mapObjectProducer",
    "chatContextProducer",
    "reportsDocumentsProducer",
  ] as const;

  const runtimeFilesPresent =
    runtimeSources.every((source) => source.length > 0) &&
    runtimeSource.includes("AI_SCREEN_RUNTIME_CONTRACT") &&
    runtimeSource.includes("resolveAiScreenRuntime");
  const majorScreensRegistered = requiredScreens.every((screenId) =>
    registrySource.includes(`screenId: "${screenId}"`) || registrySource.includes(`"${screenId}"`),
  );
  const producerRegistryPresent =
    producersSource.includes("AI_SCREEN_RUNTIME_PRODUCERS") &&
    producerNames.every((name) => producersSource.includes(name));
  const producersHaveRolePolicy =
    producerRegistryPresent &&
    producersSource.includes("allowedRoles") &&
    producersSource.includes("roleAllowed") &&
    producerNames.every((name) => registrySource.includes(`producerName: "${name}"`));
  const producersRequireEvidence =
    producersSource.includes("hasAiScreenRuntimeEvidence") &&
    producersSource.includes("result.cards.length === 0") &&
    runtimeSource.includes("evidenceRequired: true");
  const bffRoutesPresent =
    bffSource.includes("GET /agent/screen-runtime/:screenId") &&
    bffSource.includes("POST /agent/screen-runtime/:screenId/intent-preview") &&
    bffSource.includes("POST /agent/screen-runtime/:screenId/action-plan") &&
    shellSource.includes("agent.screen_runtime.read") &&
    shellSource.includes("AgentScreenRuntimeEnvelope");
  const resolverValidatesScreenId =
    resolverSource.includes("getAiScreenRuntimeEntry") &&
    resolverSource.includes("screenId is not registered") &&
    resolverSource.includes("cursor must be a non-negative integer string");
  const unknownRoleDenied =
    resolverSource.includes('input.auth.role === "unknown"') &&
    bffSource.includes('auth.role !== "unknown"');
  const notMountedSupported =
    registrySource.includes("future_or_not_mounted") &&
    resolverSource.includes('status: "not_mounted"');
  const noProviderImports =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      runtimeSource,
    );
  const noSupabaseImports =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      runtimeSource,
    ) && !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/.test(runtimeSource);
  const noUiSupabaseImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      commandCenterSource,
    );
  const noUiExternalFetch =
    !/\bfetch\s*\(|\bXMLHttpRequest\b|externalIntelResolver|external_live_fetch/i.test(
      commandCenterSource,
    );
  const noUiProviderImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      commandCenterSource,
    );
  const noRawPayloadFields =
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows|rawRows|rawHtml|raw_html)\s*:/.test(
      runtimeSource,
    );
  const noFakeCards =
    runtimeSource.includes("fakeCards: false") &&
    runtimeSource.includes("hardcodedAiResponse: false") &&
    !/fake_card|fake cards|hardcoded AI response|hardcodedAiResponse:\s*true/i.test(runtimeSource);
  const noMutationSurface =
    runtimeSource.includes("mutationCount: 0") &&
    runtimeSource.includes("finalMutationAllowed: false") &&
    runtimeSource.includes("directMutationAllowed: false") &&
    runtimeSource.includes("executed: false") &&
    !/\.(?:from|rpc|insert|update|delete|upsert)\s*\(|\bcreateOrder\b|\bconfirmSupplier\b|\bchangePayment\b|\bchangeWarehouse\b|\bsendDocument\b/i.test(
      runtimeSource,
    );
  const contractorOwnRecordsOnly =
    registrySource.includes("contractorOwnWorkProducer") &&
    registrySource.includes("own_task") &&
    registrySource.includes("own_document") &&
    !/contractor.*finance|finance.*contractor/i.test(registrySource);
  const e2eRunnerPresent =
    e2eRunnerSource.includes("runAiCrossScreenRuntimeMaestro") &&
    e2eRunnerSource.includes("ai.screen.runtime.screen") &&
    e2eRunnerSource.includes("BLOCKED_ROLE_ISOLATION_REQUIRES_SEPARATE_E2E_USERS") &&
    e2eRunnerSource.includes("mutations_created: 0");
  const findings = [
    ...(runtimeFilesPresent ? [] : ["screen_runtime_files_missing"]),
    ...(majorScreensRegistered ? [] : ["screen_runtime_major_screen_missing"]),
    ...(producerRegistryPresent ? [] : ["screen_runtime_producer_registry_missing"]),
    ...(producersHaveRolePolicy ? [] : ["screen_runtime_producer_role_policy_missing"]),
    ...(producersRequireEvidence ? [] : ["screen_runtime_producer_evidence_missing"]),
    ...(bffRoutesPresent ? [] : ["screen_runtime_bff_routes_missing"]),
    ...(resolverValidatesScreenId ? [] : ["screen_runtime_screen_id_validation_missing"]),
    ...(unknownRoleDenied ? [] : ["screen_runtime_unknown_role_not_denied"]),
    ...(notMountedSupported ? [] : ["screen_runtime_not_mounted_boundary_missing"]),
    ...(noProviderImports ? [] : ["screen_runtime_model_provider_import_detected"]),
    ...(noSupabaseImports ? [] : ["screen_runtime_supabase_import_detected"]),
    ...(noUiSupabaseImport ? [] : ["screen_runtime_ui_supabase_import_detected"]),
    ...(noUiExternalFetch ? [] : ["screen_runtime_ui_external_fetch_detected"]),
    ...(noUiProviderImport ? [] : ["screen_runtime_ui_provider_import_detected"]),
    ...(noRawPayloadFields ? [] : ["screen_runtime_raw_payload_field_detected"]),
    ...(noFakeCards ? [] : ["screen_runtime_fake_cards_detected"]),
    ...(noMutationSurface ? [] : ["screen_runtime_mutation_surface_detected"]),
    ...(contractorOwnRecordsOnly ? [] : ["screen_runtime_contractor_scope_missing"]),
    ...(e2eRunnerPresent ? [] : ["screen_runtime_e2e_runner_missing"]),
  ];

  return {
    check: {
      name: "ai_cross_screen_runtime_matrix",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      runtimeFilesPresent,
      majorScreensRegistered,
      producerRegistryPresent,
      producersHaveRolePolicy,
      producersRequireEvidence,
      bffRoutesPresent,
      resolverValidatesScreenId,
      unknownRoleDenied,
      notMountedSupported,
      noProviderImports,
      noSupabaseImports,
      noUiSupabaseImport,
      noUiExternalFetch,
      noUiProviderImport,
      noRawPayloadFields,
      noFakeCards,
      noMutationSurface,
      contractorOwnRecordsOnly,
      e2eRunnerPresent,
      findings,
    },
  };
}

export function evaluateAiPersistentActionLedgerGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiPersistentActionLedgerArchitectureSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const ledgerSources = AI_ACTION_LEDGER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );
  const ledgerSource = ledgerSources.join("\n");
  const policySource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/aiActionLedgerPolicy.ts",
    }) ?? "";
  const repositorySource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/aiActionLedgerRepository.ts",
    }) ?? "";
  const auditSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/aiActionLedgerAudit.ts",
    }) ?? "";
  const redactionSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/aiActionLedgerRedaction.ts",
    }) ?? "";
  const executeSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/executeApprovedAiAction.ts",
    }) ?? "";
  const bffSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/actionLedger/aiActionLedgerBff.ts",
    }) ?? "";
  const shellSource = safeReadProjectFile({ readFile, relativePath: AGENT_BFF_ROUTE_SHELL_PATH }) ?? "";
  const submitToolSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/tools/submitForApprovalTool.ts",
    }) ?? "";
  const statusToolSource =
    safeReadProjectFile({
      readFile,
      relativePath: "src/features/ai/tools/getActionStatusTool.ts",
    }) ?? "";
  const migrationSource =
    safeReadProjectFile({ readFile, relativePath: AI_ACTION_LEDGER_MIGRATION_PATH }) ?? "";
  const auditRlsMigrationSource =
    safeReadProjectFile({ readFile, relativePath: AI_ACTION_LEDGER_AUDIT_RLS_MIGRATION_PATH }) ??
    "";
  const e2eRunnerSource =
    safeReadProjectFile({ readFile, relativePath: AI_APPROVAL_ACTION_LEDGER_E2E_RUNNER_PATH }) ?? "";
  const commandCenterSource = AI_COMMAND_CENTER_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  ).join("\n");

  const ledgerFilesPresent =
    ledgerSources.every((source) => source.length > 0) &&
    ledgerSource.includes("AiActionLedgerRecord") &&
    ledgerSource.includes("AiActionStatus") &&
    ledgerSource.includes("SubmitAiActionForApprovalInput");
  const migrationProposalPresent =
    migrationSource.includes("create table if not exists public.ai_action_ledger") &&
    migrationSource.includes("unique (organization_id, idempotency_key)") &&
    migrationSource.includes("create index if not exists ai_action_ledger_org_status_created_idx") &&
    !/\b(drop|truncate|delete)\b/i.test(migrationSource);
  const auditStorageProposalPresent =
    auditRlsMigrationSource.includes("create table if not exists public.ai_action_ledger_audit") &&
    auditRlsMigrationSource.includes("ai.action.submitted_for_approval") &&
    auditRlsMigrationSource.includes("ai.action.idempotency_reused") &&
    auditRlsMigrationSource.includes("ai_action_ledger_audit_payload_redacted_check") &&
    auditRlsMigrationSource.includes("create index if not exists ai_action_ledger_audit_action_created_idx");
  const rlsPolicyProposalPresent =
    auditRlsMigrationSource.includes("alter table public.ai_action_ledger enable row level security") &&
    auditRlsMigrationSource.includes("alter table public.ai_action_ledger_audit enable row level security") &&
    auditRlsMigrationSource.includes("force row level security") &&
    auditRlsMigrationSource.includes("ai_action_ledger_select_company_scope") &&
    auditRlsMigrationSource.includes("ai_action_ledger_insert_pending_company_scope") &&
    auditRlsMigrationSource.includes("ai_action_ledger_update_manage_scope") &&
    auditRlsMigrationSource.includes("ai_action_ledger_audit_insert_company_scope");
  const rpcContractProposalPresent =
    auditRlsMigrationSource.includes("ai_action_ledger_submit_for_approval_v1") &&
    auditRlsMigrationSource.includes("ai_action_ledger_get_status_v1") &&
    auditRlsMigrationSource.includes("ai_action_ledger_approve_v1") &&
    auditRlsMigrationSource.includes("ai_action_ledger_reject_v1") &&
    auditRlsMigrationSource.includes("ai_action_ledger_execute_approved_v1") &&
    auditRlsMigrationSource.includes("security invoker") &&
    auditRlsMigrationSource.includes("BLOCKED_DOMAIN_EXECUTOR_NOT_READY") &&
    auditRlsMigrationSource.includes("'finalExecution', false");
  const lifecycleDbGuardProposalPresent =
    auditRlsMigrationSource.includes("ai_action_ledger_lifecycle_guard_v1") &&
    auditRlsMigrationSource.includes("old.status = 'pending'") &&
    auditRlsMigrationSource.includes("old.status = 'approved'") &&
    auditRlsMigrationSource.includes("status transition is blocked") &&
    auditRlsMigrationSource.includes("trg_ai_action_ledger_lifecycle_guard_v1");
  const noServiceRoleGrantInLedgerBackend =
    auditRlsMigrationSource.length > 0 &&
    !/\bservice_role\b|SUPABASE_SERVICE_ROLE_KEY|\bauth\.admin\b|\blistUsers\b/i.test(
      auditRlsMigrationSource,
    ) &&
    !/\b(drop|truncate|delete)\b/i.test(auditRlsMigrationSource);
  const bffRoutesPresent =
    bffSource.includes("POST /agent/action/submit-for-approval") &&
    bffSource.includes("GET /agent/action/:actionId/status") &&
    bffSource.includes("POST /agent/action/:actionId/approve") &&
    bffSource.includes("POST /agent/action/:actionId/reject") &&
    bffSource.includes("POST /agent/action/:actionId/execute-approved") &&
    shellSource.includes("AgentActionLedgerEnvelope") &&
    shellSource.includes("agent.action.execute_approved");
  const submitForApprovalPersistsPending =
    repositorySource.includes("insertPending(record, auditEvent)") &&
    repositorySource.includes('status: "pending"') &&
    submitToolSource.includes("repository.submitForApproval") &&
    submitToolSource.includes("persisted: true") &&
    submitToolSource.includes("local_gate_only: false") &&
    submitToolSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND");
  const getActionStatusReadsPersistedStatus =
    statusToolSource.includes("repository.getStatus") &&
    statusToolSource.includes("lookup_performed: true") &&
    (statusToolSource.includes("persisted: true") ||
      statusToolSource.includes("persisted: status.persistedLookup"));
  const idempotencyRequired =
    repositorySource.includes("findByIdempotencyKey") &&
    policySource.includes("idempotencyRequired: true") &&
    policySource.includes("idempotencyKey.trim().length < 16") &&
    migrationSource.includes("idempotency_key text not null") &&
    migrationSource.includes("unique (organization_id, idempotency_key)");
  const auditRequired =
    policySource.includes("auditRequired: true") &&
    auditSource.includes("createAiActionLedgerAuditEvent") &&
    ledgerSource.includes("ai.action.submitted_for_approval") &&
    repositorySource.includes("createAiActionLedgerAuditEvent") &&
    executeSource.includes("hasAiActionLedgerAuditEvent");
  const evidenceRequired =
    policySource.includes("evidenceRequired: true") &&
    policySource.includes("AI action ledger requires evidence") &&
    repositorySource.includes("normalizeAiActionLedgerEvidenceRefs") &&
    bffSource.includes("evidenceBacked: true");
  const lifecycleTransitionsEnforced =
    policySource.includes("ALLOWED_TRANSITIONS") &&
    policySource.includes('draft: ["pending"]') &&
    policySource.includes('pending: ["approved", "rejected", "expired"]') &&
    policySource.includes('approved: ["executed", "expired"]') &&
    executeSource.includes("canTransitionAiActionStatus");
  const executeApprovedGatePresent =
    executeSource.includes("executeApprovedAiAction") &&
    executeSource.includes("assertAiActionLedgerExecutePolicy") &&
    policySource.includes("status !== \"approved\"") &&
    bffSource.includes("executeApprovedActionLedgerBff");
  const domainExecutorBlockedWhenMissing =
    executeSource.includes("BLOCKED_DOMAIN_EXECUTOR_NOT_READY") &&
    executeSource.includes("Domain executor is not mounted") &&
    bffSource.includes("domainExecutor: null");
  const noFakeLocalApproval =
    ledgerSource.includes("fakeLocalApproval: false") &&
    submitToolSource.includes("local_gate_only: false") &&
    !/fakeLocalApproval:\s*true|local_gate_only:\s*true|fake local approval/i.test(
      `${ledgerSource}\n${submitToolSource}`,
    );
  const directExecutionSurface = [
    repositorySource,
    bffSource,
    submitToolSource,
    statusToolSource,
  ].join("\n");
  const noDirectExecutionPath =
    !/\bdomainExecutor\.execute\b/.test(directExecutionSurface) &&
    !/\b(createOrder|confirmSupplier|changePaymentStatus|changeWarehouseStatus|sendDocument)\b/.test(
      directExecutionSurface,
    );
  const noUiSupabaseImport =
    !/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i.test(
      commandCenterSource,
    );
  const noUiModelProviderImport =
    !/\bfrom\s+["'][^"']*(gemini|openai|features\/ai\/model|AiModelGateway|assistantClient|LegacyGeminiModelProvider)[^"']*["']|openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider|assistantClient/i.test(
      commandCenterSource,
    );
  const noRawLedgerPayloadFields =
    redactionSource.includes("FORBIDDEN_KEY_PATTERN") &&
    redactionSource.includes("raw_prompt") &&
    redactionSource.includes("provider_payload") &&
    !/\b(rawPrompt|raw_prompt|providerPayload|provider_payload|rawDbRows|raw_db_rows|dbRows)\s*:/.test(
      ledgerSource,
    );
  const e2eRunnerPresent =
    e2eRunnerSource.includes("runAiApprovalActionLedgerMaestro") &&
    e2eRunnerSource.includes("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND") &&
    e2eRunnerSource.includes("mutations_created: 0") &&
    e2eRunnerSource.includes("fake_local_approval: false");
  const findings = [
    ...(ledgerFilesPresent ? [] : ["ai_action_ledger_files_missing"]),
    ...(migrationProposalPresent ? [] : ["ai_action_ledger_migration_proposal_missing_or_unsafe"]),
    ...(auditStorageProposalPresent ? [] : ["ai_action_ledger_audit_storage_proposal_missing"]),
    ...(rlsPolicyProposalPresent ? [] : ["ai_action_ledger_rls_policy_proposal_missing"]),
    ...(rpcContractProposalPresent ? [] : ["ai_action_ledger_rpc_contract_proposal_missing"]),
    ...(lifecycleDbGuardProposalPresent ? [] : ["ai_action_ledger_db_lifecycle_guard_missing"]),
    ...(noServiceRoleGrantInLedgerBackend ? [] : ["ai_action_ledger_service_role_or_destructive_sql_detected"]),
    ...(bffRoutesPresent ? [] : ["ai_action_ledger_bff_routes_missing"]),
    ...(submitForApprovalPersistsPending ? [] : ["submit_for_approval_not_persistent_pending"]),
    ...(getActionStatusReadsPersistedStatus ? [] : ["get_action_status_not_reading_persisted_status"]),
    ...(idempotencyRequired ? [] : ["ai_action_ledger_idempotency_not_required"]),
    ...(auditRequired ? [] : ["ai_action_ledger_audit_not_required"]),
    ...(evidenceRequired ? [] : ["ai_action_ledger_evidence_not_required"]),
    ...(lifecycleTransitionsEnforced ? [] : ["ai_action_ledger_lifecycle_not_enforced"]),
    ...(executeApprovedGatePresent ? [] : ["ai_action_ledger_execute_gate_missing"]),
    ...(domainExecutorBlockedWhenMissing ? [] : ["ai_action_ledger_domain_executor_not_blocked"]),
    ...(noFakeLocalApproval ? [] : ["ai_action_ledger_fake_local_approval_detected"]),
    ...(noDirectExecutionPath ? [] : ["ai_action_ledger_direct_execution_path_detected"]),
    ...(noUiSupabaseImport ? [] : ["ai_action_ledger_ui_supabase_import_detected"]),
    ...(noUiModelProviderImport ? [] : ["ai_action_ledger_ui_model_provider_import_detected"]),
    ...(noRawLedgerPayloadFields ? [] : ["ai_action_ledger_raw_payload_field_detected"]),
    ...(e2eRunnerPresent ? [] : ["ai_action_ledger_e2e_runner_missing"]),
  ];

  return {
    check: {
      name: "ai_persistent_action_ledger",
      status: findings.length === 0 ? "pass" : "fail",
      errors: findings,
    },
    summary: {
      ledgerFilesPresent,
      migrationProposalPresent,
      auditStorageProposalPresent,
      rlsPolicyProposalPresent,
      rpcContractProposalPresent,
      lifecycleDbGuardProposalPresent,
      noServiceRoleGrantInLedgerBackend,
      bffRoutesPresent,
      submitForApprovalPersistsPending,
      getActionStatusReadsPersistedStatus,
      idempotencyRequired,
      auditRequired,
      evidenceRequired,
      lifecycleTransitionsEnforced,
      executeApprovedGatePresent,
      domainExecutorBlockedWhenMissing,
      noFakeLocalApproval,
      noDirectExecutionPath,
      noUiSupabaseImport,
      noUiModelProviderImport,
      noRawLedgerPayloadFields,
      e2eRunnerPresent,
      findings,
    },
  };
}

export function evaluateAiKnowledgePreviewE2eContractGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiKnowledgePreviewE2eContractSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const assistantSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCREEN_PATH });
  const assistantStylesSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCREEN_STYLES_PATH });
  const scopeContextSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCOPE_CONTEXT_PATH });
  const maestroRunnerSource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_SCREEN_MAESTRO_RUNNER_PATH });
  const flowSources = REQUIRED_AI_ROLE_SCREEN_FLOW_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );

  const requiredKnowledgeIds = [
    '"ai.knowledge.preview"',
    'testID="ai.knowledge.role"',
    'testID="ai.knowledge.screen"',
    'testID="ai.knowledge.domain"',
    'testID="ai.knowledge.allowed-intents"',
    'testID="ai.knowledge.blocked-intents"',
    'testID="ai.knowledge.approval-boundary"',
  ] as const;
  const flowKnowledgeIds = [
    'id: "ai.knowledge.preview"',
    'id: "ai.knowledge.role"',
    'id: "ai.knowledge.screen"',
    'id: "ai.knowledge.domain"',
    'id: "ai.knowledge.allowed-intents"',
    'id: "ai.knowledge.blocked-intents"',
    'id: "ai.knowledge.approval-boundary"',
  ] as const;

  const deterministicPreviewPresent =
    Boolean(scopeContextSource?.includes("knowledgePreview")) &&
    Boolean(scopeContextSource?.includes("resolveAiScreenKnowledge")) &&
    requiredKnowledgeIds.every((needle) => Boolean(assistantSource?.includes(needle)));
  const roleMetadataIdsPresent = requiredKnowledgeIds.slice(1).every((needle) =>
    Boolean(assistantSource?.includes(needle)),
  );
  const previewBounded =
    Boolean(assistantSource?.includes("numberOfLines={1}")) &&
    Boolean(assistantSource?.includes("numberOfLines={2}")) &&
    Boolean(assistantStylesSource?.includes("maxHeight: 260")) &&
    Boolean(assistantStylesSource?.includes('overflow: "hidden"'));
  const rawPromptBlockNotRenderedInUi =
    !Boolean(assistantSource?.includes("AI APP KNOWLEDGE BLOCK")) &&
    !Boolean(assistantSource?.includes("{scopedFacts.summary}"));
  const maestroFlowsUsePreviewIds = flowSources.every((flowSource) =>
    flowKnowledgeIds.every((needle) => flowSource.includes(needle)),
  );
  const maestroFlowsDoNotAssertPromptBlock = flowSources.every(
    (flowSource) => !flowSource.includes('visible: "AI APP KNOWLEDGE BLOCK"'),
  );
  const llmSmokeResponseElementOnly = flowSources.every((flowSource) => {
    const responsePhaseIndex = flowSource.lastIndexOf('id: "ai.assistant.send"');
    if (responsePhaseIndex < 0) return false;
    const responsePhase = flowSource.slice(responsePhaseIndex);
    return (
      responsePhase.includes("waitForAnimationToEnd") &&
      !responsePhase.includes('id: "ai.assistant.response"') &&
      !responsePhase.includes("scrollUntilVisible:") &&
      !responsePhase.includes('visible: "') &&
      !responsePhase.includes("assertNotVisible:")
    );
  });
  const noFakeAiAnswer =
    !Boolean(assistantSource?.match(/fake AI answer|hardcoded AI response/i)) &&
    !Boolean(assistantSource?.includes("AI APP KNOWLEDGE BLOCK"));
  const noAuthDiscoveryInRunner =
    !Boolean(maestroRunnerSource?.includes("resolveAiRoleScreenKnowledgeAuthEnv")) &&
    !Boolean(maestroRunnerSource?.includes("listUsers")) &&
    !Boolean(maestroRunnerSource?.includes("auth.admin")) &&
    !Boolean(maestroRunnerSource?.includes("SUPABASE_SERVICE_ROLE_KEY")) &&
    !Boolean(maestroRunnerSource?.includes("signInWithPassword"));
  const credentialsAbsentFromYaml = flowSources.every(
    (flowSource) => !/@example\.com|password\s*[:=]|service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(flowSource),
  );
  const findings = [
    ...(deterministicPreviewPresent ? [] : ["ai_knowledge_preview_missing"]),
    ...(roleMetadataIdsPresent ? [] : ["ai_knowledge_role_metadata_ids_missing"]),
    ...(previewBounded ? [] : ["ai_knowledge_preview_not_bounded"]),
    ...(rawPromptBlockNotRenderedInUi ? [] : ["ai_knowledge_raw_prompt_block_rendered_in_ui"]),
    ...(maestroFlowsUsePreviewIds ? [] : ["maestro_flows_missing_knowledge_preview_ids"]),
    ...(maestroFlowsDoNotAssertPromptBlock ? [] : ["maestro_flows_assert_system_prompt_block"]),
    ...(llmSmokeResponseElementOnly ? [] : ["maestro_llm_smoke_asserts_exact_text"]),
    ...(noFakeAiAnswer ? [] : ["fake_or_hardcoded_ai_answer_source_detected"]),
    ...(noAuthDiscoveryInRunner ? [] : ["ai_role_runner_auth_discovery_detected"]),
    ...(credentialsAbsentFromYaml ? [] : ["credentials_detected_in_maestro_yaml"]),
  ];
  const errors = [...findings];

  return {
    check: {
      name: "ai_knowledge_preview_e2e_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      deterministicPreviewPresent,
      roleMetadataIdsPresent,
      previewBounded,
      rawPromptBlockNotRenderedInUi,
      maestroFlowsUsePreviewIds,
      maestroFlowsDoNotAssertPromptBlock,
      llmSmokeResponseElementOnly,
      noFakeAiAnswer,
      noAuthDiscoveryInRunner,
      credentialsAbsentFromYaml,
      findings,
    },
  };
}

export function evaluateAiResponseSmokeNonBlockingContractGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiResponseSmokeNonBlockingContractSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const assistantSource = safeReadProjectFile({ readFile, relativePath: AI_ASSISTANT_SCREEN_PATH });
  const maestroRunnerSource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_SCREEN_MAESTRO_RUNNER_PATH });
  const flowSources = REQUIRED_AI_ROLE_SCREEN_FLOW_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }) ?? "",
  );

  const loadingTestIdPresent =
    Boolean(assistantSource?.includes('testID="ai.assistant.loading"')) &&
    Boolean(assistantSource?.includes('accessibilityLabel="AI assistant loading"'));
  const loadingBubbleReal =
    Boolean(assistantSource?.includes("loading ? (")) &&
    Boolean(assistantSource?.includes("styles.loadingBubble")) &&
    Boolean(assistantSource?.includes("<ActivityIndicator")) &&
    !Boolean(assistantSource?.match(/testOnly|__TEST__|fake loading/i));
  const releaseFlowsDelegatePromptProof = flowSources.every((flowSource) => {
    const sendIndex = flowSource.lastIndexOf('id: "ai.assistant.send"');
    if (sendIndex < 0) return false;
    const postSendPhase = flowSource.slice(sendIndex);
    return postSendPhase.includes("waitForAnimationToEnd");
  });
  const releaseFlowsDoNotRequireResponse = flowSources.every((flowSource) =>
    !flowSource.includes('id: "ai.assistant.response"') &&
    !flowSource.includes("scrollUntilVisible:") &&
    !flowSource.includes('visible: "AI APP KNOWLEDGE BLOCK"'),
  );
  const runnerSeparatesReleaseAndResponseSmoke =
    Boolean(maestroRunnerSource?.includes("GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE")) &&
    Boolean(maestroRunnerSource?.includes("release_gate_status")) &&
    Boolean(maestroRunnerSource?.includes("prompt_pipeline_status")) &&
    Boolean(maestroRunnerSource?.includes("prompt_pipeline_observations")) &&
    Boolean(maestroRunnerSource?.includes("response_smoke_status")) &&
    Boolean(maestroRunnerSource?.includes("createResponseSmokeFlowFiles")) &&
    Boolean(maestroRunnerSource?.includes("responseSmokeReportFile"));
  const runnerObservesLoadingOrResponse =
    Boolean(maestroRunnerSource?.includes("observePromptPipeline")) &&
    Boolean(maestroRunnerSource?.includes('resource-id="ai.assistant.loading"')) &&
    Boolean(maestroRunnerSource?.includes('resource-id="ai.assistant.response"')) &&
    Boolean(maestroRunnerSource?.includes("AI prompt pipeline proof missing"));
  const responseTimeoutCanaryNonBlocking =
    Boolean(maestroRunnerSource?.includes("BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY")) &&
    Boolean(maestroRunnerSource?.includes("response_smoke_blocking_release: false")) &&
    Boolean(maestroRunnerSource?.includes('responseSmokeStatus = "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY"')) &&
    Boolean(maestroRunnerSource?.includes('artifact.final_status !== "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE"'));
  const noExactLlmTextAssertion = flowSources.every((flowSource) =>
    !flowSource.includes('visible: "AI APP KNOWLEDGE BLOCK"') &&
    !/assertVisible:\s*\r?\n\s*"[^"]+"/.test(flowSource) &&
    !/visible:\s*"(?!Wait")[^"]+"/.test(flowSource),
  );
  const noFakeAiAnswer =
    !Boolean(assistantSource?.match(/fake AI answer|hardcoded AI response/i)) &&
    !Boolean(maestroRunnerSource?.match(/fake AI answer|hardcoded AI response/i));
  const noAuthDiscoveryInRunner =
    !Boolean(maestroRunnerSource?.includes("resolveAiRoleScreenKnowledgeAuthEnv")) &&
    !Boolean(maestroRunnerSource?.includes("listUsers")) &&
    !Boolean(maestroRunnerSource?.includes("auth.admin")) &&
    !Boolean(maestroRunnerSource?.includes("SUPABASE_SERVICE_ROLE_KEY")) &&
    !Boolean(maestroRunnerSource?.includes("signInWithPassword"));
  const credentialsAbsentFromYaml = flowSources.every(
    (flowSource) => !/@example\.com|password\s*[:=]|service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(flowSource),
  );
  const findings = [
    ...(loadingTestIdPresent ? [] : ["ai_assistant_loading_testid_missing"]),
    ...(loadingBubbleReal ? [] : ["ai_assistant_loading_not_real_runtime_bubble"]),
    ...(releaseFlowsDelegatePromptProof ? [] : ["release_flows_missing_prompt_pipeline_handoff"]),
    ...(releaseFlowsDoNotRequireResponse ? [] : ["release_flows_require_ai_response_as_blocking_gate"]),
    ...(runnerSeparatesReleaseAndResponseSmoke ? [] : ["runner_does_not_separate_release_gate_and_response_smoke"]),
    ...(runnerObservesLoadingOrResponse ? [] : ["runner_does_not_observe_loading_or_response_pipeline_proof"]),
    ...(responseTimeoutCanaryNonBlocking ? [] : ["response_timeout_canary_not_non_blocking"]),
    ...(noExactLlmTextAssertion ? [] : ["exact_llm_text_assertion_detected"]),
    ...(noFakeAiAnswer ? [] : ["fake_or_hardcoded_ai_answer_source_detected"]),
    ...(noAuthDiscoveryInRunner ? [] : ["ai_role_runner_auth_discovery_detected"]),
    ...(credentialsAbsentFromYaml ? [] : ["credentials_detected_in_maestro_yaml"]),
  ];
  const errors = [...findings];

  return {
    check: {
      name: "ai_response_smoke_non_blocking_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      loadingTestIdPresent,
      loadingBubbleReal,
      releaseFlowsDelegatePromptProof,
      releaseFlowsDoNotRequireResponse,
      runnerSeparatesReleaseAndResponseSmoke,
      runnerObservesLoadingOrResponse,
      responseTimeoutCanaryNonBlocking,
      noExactLlmTextAssertion,
      noFakeAiAnswer,
      noAuthDiscoveryInRunner,
      credentialsAbsentFromYaml,
      findings,
    },
  };
}

export function evaluateAiRoleScreenEmulatorGateGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiRoleScreenEmulatorGateSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const ensureRunnerSource = safeReadProjectFile({ readFile, relativePath: AI_EMULATOR_BOOTSTRAP_RUNNER_PATH });
  const maestroRunnerSource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_SCREEN_MAESTRO_RUNNER_PATH });
  const explicitResolverSource = safeReadProjectFile({ readFile, relativePath: AI_EXPLICIT_ROLE_AUTH_RESOLVER_PATH });
  const redactorSource = safeReadProjectFile({ readFile, relativePath: AI_E2E_SECRET_REDACTOR_PATH });
  const flowSources = REQUIRED_AI_ROLE_SCREEN_FLOW_FILES.map((relativePath) =>
    safeReadProjectFile({ readFile, relativePath }),
  );
  const artifactSource = safeReadProjectFile({ readFile, relativePath: AI_ROLE_SCREEN_EMULATOR_ARTIFACT_PATH });
  const artifact = parseJsonRecord(artifactSource);
  const flows = recordChild(artifact, "flows");
  const finalStatus = recordString(artifact, "final_status");
  const roleAuthSource = recordString(artifact, "role_auth_source");
  const fakePassClaimed = recordValue(artifact, "fake_pass_claimed");
  const mutationsCreated = recordValue(artifact, "mutations_created");
  const approvalRequiredObservedValue = recordValue(artifact, "approval_required_observed");
  const roleLeakageObservedValue = recordValue(artifact, "role_leakage_observed");
  const releaseGateStatus = recordString(artifact, "release_gate_status");
  const promptPipelineStatus = recordString(artifact, "prompt_pipeline_status");
  const responseSmokeStatus = recordString(artifact, "response_smoke_status");
  const responseSmokeBlockingRelease = recordValue(artifact, "response_smoke_blocking_release");
  const responseSmokeExactLlmTextAssertion = recordValue(artifact, "response_smoke_exact_llm_text_assertion");
  const credentialsInCliArgsValue = recordValue(artifact, "credentials_in_cli_args");
  const credentialsPrintedValue = recordValue(artifact, "credentials_printed");
  const stdoutRedactedValue = recordValue(artifact, "stdout_redacted");
  const stderrRedactedValue = recordValue(artifact, "stderr_redacted");
  const serviceRoleDiscoveryUsedForGreen = recordValue(artifact, "service_role_discovery_used_for_green");
  const authAdminListUsersUsedForGreen = recordValue(artifact, "auth_admin_list_users_used_for_green");
  const dbSeedUsed = recordValue(artifact, "db_seed_used");
  const authUsersCreated = recordValue(artifact, "auth_users_created");
  const authUsersUpdated = recordValue(artifact, "auth_users_updated");
  const authUsersDeleted = recordValue(artifact, "auth_users_deleted");
  const authUsersInvited = recordValue(artifact, "auth_users_invited");
  const exactReason = recordString(artifact, "exactReason");

  const ensureAndroidEmulatorReadyPresent =
    Boolean(ensureRunnerSource?.includes("ensureAndroidEmulatorReady")) &&
    Boolean(ensureRunnerSource?.includes("emulator -list-avds") || ensureRunnerSource?.includes("-list-avds")) &&
    Boolean(ensureRunnerSource?.includes("sys.boot_completed")) &&
    Boolean(ensureRunnerSource?.includes("fakePassClaimed: false"));
  const maestroRunnerPresent =
    Boolean(maestroRunnerSource?.includes("runAiRoleScreenKnowledgeMaestro")) &&
    Boolean(maestroRunnerSource?.includes("ensureAndroidEmulatorReady")) &&
    Boolean(maestroRunnerSource?.includes("resolveExplicitAiRoleAuthEnv")) &&
    Boolean(maestroRunnerSource?.includes("redactE2eSecrets")) &&
    Boolean(maestroRunnerSource?.includes("mutations_created: 0")) &&
    Boolean(maestroRunnerSource?.includes("approval_required_observed"));
  const explicitRoleResolverPresent =
    Boolean(explicitResolverSource?.includes("resolveExplicitAiRoleAuthEnv")) &&
    Boolean(explicitResolverSource?.includes("BLOCKED_NO_E2E_ROLE_SECRETS")) &&
    !Boolean(explicitResolverSource?.includes("@supabase/supabase-js")) &&
    !Boolean(explicitResolverSource?.includes("createClient")) &&
    !Boolean(explicitResolverSource?.includes("auth.admin")) &&
    !Boolean(explicitResolverSource?.includes("listUsers")) &&
    !Boolean(explicitResolverSource?.includes("signInWithPassword"));
  const e2eSecretRedactorPresent =
    Boolean(redactorSource?.includes("redactE2eSecrets")) &&
    Boolean(redactorSource?.includes("Authorization")) &&
    Boolean(redactorSource?.includes("SUPABASE_SERVICE_ROLE_KEY")) &&
    Boolean(redactorSource?.includes("EXPO_PUBLIC_SUPABASE_ANON_KEY"));
  const e2eSuitePresent = flowSources.every(Boolean);
  const emulatorArtifactPresent = Boolean(artifact);
  const fakePassClaimedFalse = fakePassClaimed === false;
  const allRequiredRoleFlowsRepresented = REQUIRED_AI_ROLE_SCREEN_FLOW_KEYS.every((role) =>
    typeof recordValue(flows, role) === "string",
  );
  const greenFinalStatus =
    finalStatus === "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT" ||
    finalStatus === "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE";
  const responseSmokeStatusAccepted =
    responseSmokeStatus === "PASS" ||
    responseSmokeStatus === "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY";
  const deterministicReleaseGateAccepted =
    finalStatus !== "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE" ||
    (releaseGateStatus === "PASS" &&
      promptPipelineStatus === "PASS" &&
      responseSmokeStatusAccepted &&
      responseSmokeBlockingRelease === false &&
      responseSmokeExactLlmTextAssertion === false);
  const greenAllFlowsPassed =
    greenFinalStatus &&
    REQUIRED_AI_ROLE_SCREEN_FLOW_KEYS.every((role) => recordValue(flows, role) === "PASS");
  const mutationsCreatedZero = mutationsCreated === 0;
  const approvalRequiredObserved = approvalRequiredObservedValue === true;
  const roleLeakageNotObserved = roleLeakageObservedValue === false;
  const roleAuthSourceExplicit = roleAuthSource === "explicit_env";
  const noAuthDiscoveryGreenPath =
    serviceRoleDiscoveryUsedForGreen === false &&
    authAdminListUsersUsedForGreen === false &&
    dbSeedUsed === false &&
    authUsersCreated === 0 &&
    authUsersUpdated === 0 &&
    authUsersDeleted === 0 &&
    authUsersInvited === 0;
  const noAuthDiscoverySource =
    !Boolean(maestroRunnerSource?.includes("resolveAiRoleScreenKnowledgeAuthEnv")) &&
    !Boolean(maestroRunnerSource?.includes("existing_readonly_auth_discovery")) &&
    !Boolean(maestroRunnerSource?.includes("listUsers")) &&
    !Boolean(maestroRunnerSource?.includes("auth.admin")) &&
    !Boolean(maestroRunnerSource?.includes("signInWithPassword")) &&
    !Boolean(maestroRunnerSource?.includes("@supabase/supabase-js")) &&
    !Boolean(maestroRunnerSource?.includes("createClient"));
  const noSupabaseResolver = explicitRoleResolverPresent;
  const credentialsNotInCliArgs =
    credentialsInCliArgsValue === false &&
    !Boolean(maestroRunnerSource?.includes('"-e"')) &&
    !Boolean(maestroRunnerSource?.includes('"--env"')) &&
    !Boolean(maestroRunnerSource?.includes("buildMaestroEnvArgs"));
  const credentialsNotPrinted = credentialsPrintedValue === false;
  const stdoutStderrRedacted = stdoutRedactedValue === true && stderrRedactedValue === true;
  const blockedStatusAllowed = ALLOWED_AI_ROLE_SCREEN_EMULATOR_BLOCKED_STATUSES.some(
    (status) => status === finalStatus,
  );
  const blockedStatusHasExactReason =
    blockedStatusAllowed && exactReason.length > 0 && fakePassClaimedFalse && allRequiredRoleFlowsRepresented;
  const artifactStatusAccepted =
    greenFinalStatus
      ? greenAllFlowsPassed &&
        roleAuthSourceExplicit &&
        noAuthDiscoveryGreenPath &&
        mutationsCreatedZero &&
        approvalRequiredObserved &&
        roleLeakageNotObserved &&
        deterministicReleaseGateAccepted &&
        credentialsNotInCliArgs &&
        credentialsNotPrinted &&
        stdoutStderrRedacted
      : blockedStatusHasExactReason &&
        noAuthDiscoveryGreenPath &&
        credentialsNotInCliArgs &&
        credentialsNotPrinted &&
        stdoutStderrRedacted;

  const findings = [
    ...(greenFinalStatus && !greenAllFlowsPassed
      ? ["green_artifact_missing_role_flow_pass"]
      : []),
    ...(finalStatus === "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE" && !deterministicReleaseGateAccepted
      ? ["deterministic_release_gate_or_response_smoke_policy_not_proven"]
      : []),
    ...(fakePassClaimed === true ? ["fake_emulator_pass_claimed"] : []),
    ...(mutationsCreated !== undefined && mutationsCreated !== 0 ? ["emulator_mutation_count_nonzero"] : []),
    ...(roleLeakageObservedValue === true ? ["emulator_role_leakage_observed"] : []),
    ...(credentialsPrintedValue === true ? ["e2e_credentials_printing_claimed"] : []),
    ...(credentialsInCliArgsValue === true ? ["e2e_credentials_in_cli_args_claimed"] : []),
    ...(serviceRoleDiscoveryUsedForGreen === true ? ["service_role_discovery_used_for_green"] : []),
    ...(authAdminListUsersUsedForGreen === true ? ["auth_admin_list_users_used_for_green"] : []),
    ...(dbSeedUsed === true ? ["db_seed_used_for_e2e_green"] : []),
  ];
  const errors = [
    ...(ensureAndroidEmulatorReadyPresent ? [] : [`missing_or_incomplete_runner:${AI_EMULATOR_BOOTSTRAP_RUNNER_PATH}`]),
    ...(maestroRunnerPresent ? [] : [`missing_or_incomplete_runner:${AI_ROLE_SCREEN_MAESTRO_RUNNER_PATH}`]),
    ...(explicitRoleResolverPresent ? [] : [`missing_or_incomplete_runner:${AI_EXPLICIT_ROLE_AUTH_RESOLVER_PATH}`]),
    ...(e2eSecretRedactorPresent ? [] : [`missing_or_incomplete_runner:${AI_E2E_SECRET_REDACTOR_PATH}`]),
    ...(e2eSuitePresent ? [] : ["ai_role_screen_e2e_suite_missing"]),
    ...(emulatorArtifactPresent ? [] : [`missing_artifact:${AI_ROLE_SCREEN_EMULATOR_ARTIFACT_PATH}`]),
    ...(fakePassClaimedFalse ? [] : ["emulator_artifact_fake_pass_not_false"]),
    ...(allRequiredRoleFlowsRepresented ? [] : ["emulator_artifact_role_flow_missing"]),
    ...(noAuthDiscoverySource ? [] : ["e2e_runner_contains_auth_discovery_path"]),
    ...(noAuthDiscoveryGreenPath ? [] : ["e2e_artifact_auth_discovery_or_seed_used"]),
    ...(greenFinalStatus && !roleAuthSourceExplicit
      ? ["green_artifact_role_auth_source_not_explicit_env"]
      : []),
    ...(credentialsNotInCliArgs ? [] : ["e2e_credentials_cli_args_not_blocked"]),
    ...(credentialsNotPrinted ? [] : ["e2e_credentials_printing_not_false"]),
    ...(stdoutStderrRedacted ? [] : ["e2e_stdout_stderr_redaction_not_proven"]),
    ...(artifactStatusAccepted ? [] : ["emulator_artifact_status_not_accepted"]),
    ...findings,
  ];

  return {
    check: {
      name: "ai_role_screen_emulator_gate",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      ensureAndroidEmulatorReadyPresent,
      maestroRunnerPresent,
      explicitRoleResolverPresent,
      e2eSecretRedactorPresent,
      e2eSuitePresent,
      emulatorArtifactPresent,
      fakePassClaimedFalse,
      allRequiredRoleFlowsRepresented,
      greenAllFlowsPassed,
      mutationsCreatedZero,
      approvalRequiredObserved,
      roleLeakageNotObserved,
      roleAuthSourceExplicit,
      noAuthDiscoveryGreenPath,
      noSupabaseResolver,
      credentialsNotInCliArgs,
      credentialsNotPrinted,
      stdoutStderrRedacted,
      blockedStatusHasExactReason,
      findings,
    },
  };
}

export function evaluateAiExplicitRoleSecretsE2eGateGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AiRoleScreenEmulatorGateSummary;
} {
  const result = evaluateAiRoleScreenEmulatorGateGuardrail(params);
  return {
    check: {
      name: "ai_explicit_role_secrets_e2e_gate",
      status: result.check.status,
      errors: result.check.errors,
    },
    summary: result.summary,
  };
}

export function evaluateAndroidEmulatorIosBuildSubmitGateGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: AndroidEmulatorIosBuildSubmitGateSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const easSource = safeReadProjectFile({ readFile, relativePath: "eas.json" });
  const runnerSource = safeReadProjectFile({ readFile, relativePath: RELEASE_ANDROID_IOS_RUNNER_PATH });
  const redactorSource = safeReadProjectFile({ readFile, relativePath: RELEASE_OUTPUT_REDACTOR_PATH });
  const smokeSource = safeReadProjectFile({ readFile, relativePath: RELEASE_ANDROID_RUNTIME_SMOKE_PATH });
  const matrix = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: RELEASE_CORE_01_MATRIX_PATH }));
  const android = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: RELEASE_CORE_01_ANDROID_PATH }));
  const ios = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: RELEASE_CORE_01_IOS_PATH }));
  const inventory = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: RELEASE_CORE_01_INVENTORY_PATH }));
  const matrixAndroid = recordChild(matrix, "android");
  const matrixIos = recordChild(matrix, "ios");
  const matrixOta = recordChild(matrix, "ota");
  const secrets = recordChild(matrix, "secrets");
  const aiRole = recordChild(matrix, "ai_role_screen_e2e");

  const androidApkProfilePresent =
    Boolean(easSource?.includes('"preview"')) &&
    Boolean(easSource?.includes('"buildType": "apk"') || easSource?.includes('"buildType":"apk"')) &&
    Boolean(easSource?.includes('"channel": "preview"') || easSource?.includes('"channel":"preview"'));
  const iosAppStoreSubmitProfilePresent =
    Boolean(easSource?.includes('"production"')) &&
    Boolean(easSource?.includes('"distribution": "store"') || easSource?.includes('"distribution":"store"')) &&
    Boolean(easSource?.includes('"simulator": false') || easSource?.includes('"simulator":false'));
  const releaseRunnerPresent =
    Boolean(runnerSource?.includes("runAndroidEmulatorAndIosSubmitGate")) &&
    Boolean(runnerSource?.includes("ensureAndroidEmulatorReady")) &&
    Boolean(runnerSource?.includes("preview")) &&
    Boolean(runnerSource?.includes("production")) &&
    Boolean(runnerSource?.includes("E2E_ALLOW_IOS_BUILD")) &&
    Boolean(runnerSource?.includes("E2E_ALLOW_IOS_SUBMIT")) &&
    Boolean(runnerSource?.includes("E2E_ALLOW_ANDROID_APK_BUILD"));
  const releaseRedactorPresent =
    Boolean(redactorSource?.includes("redactReleaseOutput")) &&
    Boolean(redactorSource?.includes("EXPO_TOKEN")) &&
    Boolean(redactorSource?.includes("EXPO_APPLE_APP_SPECIFIC_PASSWORD")) &&
    Boolean(redactorSource?.includes("SUPABASE_SERVICE_ROLE_KEY"));
  const androidRuntimeSmokeFlowPresent =
    Boolean(smokeSource?.includes("appId: com.azisbek_dzhantaev.rikexpoapp")) &&
    Boolean(smokeSource?.includes("launchApp"));
  const releaseArtifactsPresent = Boolean(matrix && android && ios && inventory);
  const androidUsesApkForEmulator =
    recordBoolean(android, "aab_used_for_direct_install") === false &&
    recordString(android, "build_profile") === "preview";
  const androidPlaySubmitAbsent =
    recordBoolean(android, "google_play_submit") === false &&
    !Boolean(runnerSource?.includes("submit --platform android")) &&
    !Boolean(runnerSource?.includes('"submit", "--platform", "android"'));
  const iosSimulatorSubmitBlocked =
    recordBoolean(ios, "simulator_build_used_for_submit") === false &&
    !Boolean(runnerSource?.includes("simulator: true"));
  const iosSubmitProfileUsed =
    recordString(ios, "submit_profile") === "production" &&
    Boolean(runnerSource?.includes("buildIosSubmitArgs"));
  const productionOtaAbsent =
    recordBoolean(matrixOta, "used") === false &&
    recordBoolean(matrixOta, "production_ota_used") === false &&
    !Boolean(runnerSource?.includes("eas update")) &&
    !Boolean(runnerSource?.includes("production OTA"));
  const credentialsNotInCliArgs =
    recordBoolean(secrets, "credentials_in_cli_args") === false &&
    !Boolean(runnerSource?.includes('"--env"')) &&
    !Boolean(runnerSource?.includes('"-e"'));
  const secretsNotInArtifacts =
    recordBoolean(secrets, "credentials_printed") === false &&
    recordBoolean(secrets, "artifacts_redacted") === true;
  const aiRoleE2eExplicitSecretsOnly =
    recordBoolean(aiRole, "auth_admin_used") === false &&
    recordBoolean(aiRole, "service_role_used") === false &&
    recordBoolean(aiRole, "list_users_used") === false &&
    Boolean(runnerSource?.includes("resolveExplicitAiRoleAuthEnv"));
  const fakePassClaimsAbsent =
    recordBoolean(matrixAndroid, "aab_used_for_direct_install") === false &&
    recordBoolean(matrixIos, "simulator_build_used_for_submit") === false &&
    !Boolean(runnerSource?.includes("fake_submit_claimed: true")) &&
    !Boolean(runnerSource?.includes("fake_emulator_pass"));

  const findings = [
    ...(recordBoolean(android, "aab_used_for_direct_install") === true ? ["android_aab_direct_install_claimed"] : []),
    ...(recordBoolean(android, "google_play_submit") === true ? ["android_google_play_submit_claimed"] : []),
    ...(recordBoolean(ios, "simulator_build_used_for_submit") === true ? ["ios_simulator_build_submit_claimed"] : []),
    ...(recordBoolean(matrixOta, "production_ota_used") === true ? ["production_ota_used"] : []),
    ...(recordBoolean(secrets, "credentials_in_cli_args") === true ? ["release_credentials_in_cli_args"] : []),
    ...(recordBoolean(secrets, "credentials_printed") === true ? ["release_credentials_printed"] : []),
  ];
  const errors = [
    ...(androidApkProfilePresent ? [] : ["android_emulator_apk_profile_missing"]),
    ...(iosAppStoreSubmitProfilePresent ? [] : ["ios_appstore_submit_profile_missing"]),
    ...(releaseRunnerPresent ? [] : [`missing_or_incomplete_runner:${RELEASE_ANDROID_IOS_RUNNER_PATH}`]),
    ...(releaseRedactorPresent ? [] : [`missing_or_incomplete_runner:${RELEASE_OUTPUT_REDACTOR_PATH}`]),
    ...(androidRuntimeSmokeFlowPresent ? [] : ["android_runtime_smoke_flow_missing"]),
    ...(releaseArtifactsPresent ? [] : ["release_core_01_artifacts_missing"]),
    ...(androidUsesApkForEmulator ? [] : ["android_emulator_apk_contract_not_proven"]),
    ...(androidPlaySubmitAbsent ? [] : ["android_play_submit_not_blocked"]),
    ...(iosSimulatorSubmitBlocked ? [] : ["ios_simulator_submit_not_blocked"]),
    ...(iosSubmitProfileUsed ? [] : ["ios_submit_profile_not_proven"]),
    ...(productionOtaAbsent ? [] : ["production_ota_not_blocked"]),
    ...(credentialsNotInCliArgs ? [] : ["release_credentials_cli_args_not_blocked"]),
    ...(secretsNotInArtifacts ? [] : ["release_artifact_secret_redaction_not_proven"]),
    ...(aiRoleE2eExplicitSecretsOnly ? [] : ["ai_role_e2e_explicit_secrets_not_preserved"]),
    ...(fakePassClaimsAbsent ? [] : ["release_fake_pass_claim_possible"]),
    ...findings,
  ];

  return {
    check: {
      name: "android_emulator_ios_build_submit_gate",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      androidApkProfilePresent,
      iosAppStoreSubmitProfilePresent,
      releaseRunnerPresent,
      releaseRedactorPresent,
      androidRuntimeSmokeFlowPresent,
      releaseArtifactsPresent,
      androidUsesApkForEmulator,
      androidPlaySubmitAbsent,
      iosSimulatorSubmitBlocked,
      iosSubmitProfileUsed,
      productionOtaAbsent,
      credentialsNotInCliArgs,
      secretsNotInArtifacts,
      aiRoleE2eExplicitSecretsOnly,
      fakePassClaimsAbsent,
      findings,
    },
  };
}

export function evaluatePostInstallReleaseSignoffGateGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: PostInstallReleaseSignoffGateSummary;
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const androidVerifierSource = safeReadProjectFile({ readFile, relativePath: POST_INSTALL_ANDROID_VERIFIER_PATH });
  const iosVerifierSource = safeReadProjectFile({ readFile, relativePath: POST_INSTALL_IOS_VERIFIER_PATH });
  const matrix = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: POST_INSTALL_MATRIX_PATH }));
  const android = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: POST_INSTALL_ANDROID_PATH }));
  const ios = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: POST_INSTALL_IOS_PATH }));
  const aiE2e = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: POST_INSTALL_AI_E2E_PATH }));
  const inventory = parseJsonRecord(safeReadProjectFile({ readFile, relativePath: POST_INSTALL_INVENTORY_PATH }));
  const matrixAndroid = recordChild(matrix, "android");
  const matrixIos = recordChild(matrix, "ios");
  const matrixAi = recordChild(matrix, "ai_role_screen_e2e");
  const matrixSecrets = recordChild(matrix, "secrets");
  const matrixOta = recordChild(matrix, "ota");

  const androidVerifierPresent =
    Boolean(androidVerifierSource?.includes("verifyAndroidInstalledBuildRuntime")) &&
    Boolean(androidVerifierSource?.includes("ensureAndroidEmulatorReady")) &&
    Boolean(androidVerifierSource?.includes('"pm", "path"')) &&
    Boolean(androidVerifierSource?.includes('"monkey"')) &&
    Boolean(androidVerifierSource?.includes("fake_emulator_pass: false"));
  const iosVerifierPresent =
    Boolean(iosVerifierSource?.includes("verifyIosBuildSubmitStatus")) &&
    Boolean(iosVerifierSource?.includes('"eas", "build:view"')) &&
    Boolean(iosVerifierSource?.includes("simulator_build_used_for_submit")) &&
    Boolean(iosVerifierSource?.includes("post_build_commits_non_runtime_only")) &&
    Boolean(iosVerifierSource?.includes("fake_submit_pass: false"));
  const signoffArtifactsPresent = Boolean(matrix && android && ios && aiE2e && inventory);
  const androidRuntimeSmokeProven =
    recordBoolean(android, "apk_installed_on_emulator") === true &&
    recordString(android, "runtime_smoke") === "PASS" &&
    recordBoolean(android, "fake_emulator_pass") === false &&
    recordBoolean(matrixAndroid, "apk_installed_on_emulator") === true;
  const iosSubmitStatusProven =
    recordBoolean(ios, "submit_started") === true &&
    recordBoolean(ios, "submit_status_captured") === true &&
    recordBoolean(ios, "fake_submit_pass") === false &&
    recordBoolean(matrixIos, "submit_status_captured") === true;
  const aiRoleE2eExplicitSecretsOnly =
    recordBoolean(aiE2e, "auth_admin_used") === false &&
    recordBoolean(aiE2e, "service_role_used") === false &&
    recordBoolean(aiE2e, "list_users_used") === false &&
    recordBoolean(matrixAi, "auth_admin_used") === false &&
    recordBoolean(matrixAi, "service_role_used") === false &&
    recordBoolean(matrixAi, "list_users_used") === false;
  const credentialsNotInCliArgs =
    recordBoolean(matrixSecrets, "credentials_in_cli_args") === false &&
    !Boolean(androidVerifierSource?.includes('"--env"')) &&
    !Boolean(androidVerifierSource?.includes('"-e"')) &&
    !Boolean(iosVerifierSource?.includes('"--env"')) &&
    !Boolean(iosVerifierSource?.includes('"-e"'));
  const secretsNotInArtifacts =
    recordBoolean(matrixSecrets, "credentials_printed") === false &&
    recordBoolean(matrixSecrets, "artifacts_redacted") === true;
  const productionOtaAbsent =
    recordBoolean(matrixOta, "used") === false &&
    recordBoolean(matrixOta, "production_ota_used") === false &&
    !Boolean(androidVerifierSource?.includes("eas update")) &&
    !Boolean(iosVerifierSource?.includes("eas update"));
  const androidPlaySubmitAbsent =
    recordBoolean(matrixAndroid, "google_play_submit") === false &&
    !Boolean(androidVerifierSource?.includes("submit --platform android")) &&
    !Boolean(iosVerifierSource?.includes("submit --platform android"));
  const fakePassClaimsAbsent =
    recordBoolean(android, "fake_emulator_pass") === false &&
    recordBoolean(ios, "fake_submit_pass") === false &&
    !Boolean(androidVerifierSource?.includes("fake_emulator_pass: true")) &&
    !Boolean(iosVerifierSource?.includes("fake_submit_pass: true"));

  const findings = [
    ...(recordBoolean(android, "fake_emulator_pass") === true ? ["android_fake_emulator_pass_claimed"] : []),
    ...(recordBoolean(ios, "fake_submit_pass") === true ? ["ios_fake_submit_pass_claimed"] : []),
    ...(recordBoolean(matrixAndroid, "google_play_submit") === true ? ["android_play_submit_claimed"] : []),
    ...(recordBoolean(matrixOta, "production_ota_used") === true ? ["production_ota_used"] : []),
    ...(recordBoolean(matrixSecrets, "credentials_in_cli_args") === true ? ["credentials_in_cli_args"] : []),
  ];
  const errors = [
    ...(androidVerifierPresent ? [] : [`missing_or_incomplete_verifier:${POST_INSTALL_ANDROID_VERIFIER_PATH}`]),
    ...(iosVerifierPresent ? [] : [`missing_or_incomplete_verifier:${POST_INSTALL_IOS_VERIFIER_PATH}`]),
    ...(signoffArtifactsPresent ? [] : ["post_install_signoff_artifacts_missing"]),
    ...(androidRuntimeSmokeProven ? [] : ["android_post_install_runtime_smoke_not_proven"]),
    ...(iosSubmitStatusProven ? [] : ["ios_submit_status_not_proven"]),
    ...(aiRoleE2eExplicitSecretsOnly ? [] : ["ai_role_e2e_explicit_secret_boundary_not_preserved"]),
    ...(credentialsNotInCliArgs ? [] : ["credentials_cli_args_not_blocked"]),
    ...(secretsNotInArtifacts ? [] : ["artifact_secret_redaction_not_proven"]),
    ...(productionOtaAbsent ? [] : ["production_ota_not_blocked"]),
    ...(androidPlaySubmitAbsent ? [] : ["android_play_submit_not_blocked"]),
    ...(fakePassClaimsAbsent ? [] : ["fake_pass_claim_possible"]),
    ...findings,
  ];

  return {
    check: {
      name: "post_install_release_signoff_gate",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      androidVerifierPresent,
      iosVerifierPresent,
      signoffArtifactsPresent,
      androidRuntimeSmokeProven,
      iosSubmitStatusProven,
      aiRoleE2eExplicitSecretsOnly,
      credentialsNotInCliArgs,
      secretsNotInArtifacts,
      productionOtaAbsent,
      androidPlaySubmitAbsent,
      fakePassClaimsAbsent,
      findings,
    },
  };
}

export function evaluateCacheRateScopeGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["cacheRateScope"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const cacheSource = readFile("src/shared/scale/cacheShadowRuntime.ts");
  const cacheReadinessContractSource = cacheSource;
  const cacheCanarySource = readFile("scripts/cache_one_route_read_through_canary.ts");
  const stagingBffSource = readFile("scripts/server/stagingBffServerBoundary.ts");
  const providerSource = readFile("src/shared/scale/providerRuntimeConfig.ts");
  const rateCanarySource = readFile("scripts/rate_limit_real_user_canary.ts");
  const cacheConfig = resolveCacheShadowRuntimeConfig(buildCacheReadThroughOneRouteApplyEnv("canary"));
  const persistentApplyEnv = buildCacheReadThroughOneRouteApplyEnv("persistent");
  const persistentApplyConfig = resolveCacheShadowRuntimeConfig(persistentApplyEnv);
  const rateLimitRoute = extractConstString(rateCanarySource, "CANARY_ROUTE") ?? "";
  const rateLimitPercentText = extractConstString(rateCanarySource, "CANARY_PERCENT") ?? "";
  const rateLimitPercent = Number(rateLimitPercentText);
  const canonicalReadThroughKey =
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled === "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED" &&
    Object.prototype.hasOwnProperty.call(
      persistentApplyEnv,
      CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled,
    ) &&
    persistentApplyConfig.readThroughV1Enabled === true;
  const readThroughLiteralKeyUsageLocked =
    cacheSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !cacheCanarySource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !stagingBffSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"') &&
    !providerSource.includes('"SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED"');
  const persistentReadinessContractLocked =
    canonicalReadThroughKey &&
    isCacheReadThroughOneRouteApplyConfigReady(persistentApplyConfig) &&
    persistentApplyConfig.routeAllowlist.length === 1 &&
    persistentApplyConfig.routeAllowlist[0] === CACHE_READ_THROUGH_ONE_ROUTE &&
    persistentApplyConfig.mode === CACHE_READ_THROUGH_ONE_ROUTE_MODE &&
    cacheReadinessContractSource.includes('"persistent"') &&
    cacheReadinessContractSource.includes("buildCacheReadThroughOneRouteApplyEnv") &&
    cacheReadinessContractSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled") &&
    cacheCanarySource.includes('buildCacheReadThroughOneRouteApplyEnv("canary")') &&
    stagingBffSource.includes("buildCacheReadThroughReadinessDiagnostics") &&
    stagingBffSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled") &&
    providerSource.includes("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled");
  const cacheCanaryRouteScoped =
    cacheSource.includes("CACHE_SHADOW_RUNTIME_ENV_NAMES") &&
    cacheSource.includes("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED") &&
    cacheSource.includes("CACHE_READ_THROUGH_V1_ALLOWED_ROUTES") &&
    cacheSource.includes("isCacheReadThroughV1RouteAllowed") &&
    cacheSource.includes("parseRouteAllowlist") &&
    cacheSource.includes("routeAllowed") &&
    cacheConfig.readThroughV1Enabled === true &&
    cacheConfig.routeAllowlist.length === 1 &&
    cacheConfig.routeAllowlist[0] === CACHE_RATE_ALLOWED_ROUTE;
  const errors = [
    ...(cacheCanaryRouteScoped ? [] : ["cache_canary_not_route_scoped"]),
    ...(persistentReadinessContractLocked ? [] : ["cache_persistent_readiness_contract_drifted"]),
    ...(canonicalReadThroughKey ? [] : ["cache_persistent_readiness_key_not_canonical"]),
    ...(readThroughLiteralKeyUsageLocked ? [] : ["cache_read_through_v1_literal_key_duplicated_outside_contract"]),
    ...(rateLimitRoute === CACHE_RATE_ALLOWED_ROUTE
      ? []
      : [`rate_limit_canary_route_changed:${rateLimitRoute || "missing"}`]),
    ...(rateLimitPercent === RATE_LIMIT_ALLOWED_PERCENT
      ? []
      : [`rate_limit_canary_percent_changed:${rateLimitPercentText || "missing"}`]),
  ];

  return {
    check: {
      name: "cache_rate_route_scope",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      cacheCanaryRouteScoped,
      cacheAllowedRoute: cacheConfig.routeAllowlist[0] ?? "",
      rateLimitCanaryRoute: rateLimitRoute,
      rateLimitCanaryPercent: Number.isFinite(rateLimitPercent) ? rateLimitPercent : -1,
      persistentReadinessContractLocked,
      persistentReadinessKeyCanonical: canonicalReadThroughKey,
      readThroughLiteralKeyUsageLocked,
    },
  };
}

export function evaluateCacheColdMissProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["cacheColdMissProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const testSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_PROOF_TEST_PATH });
  const matrixSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: CACHE_COLD_MISS_PROOF_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const baseline = recordChild(matrix, "baseline");
  const proofStrategy = recordChild(matrix, "proofStrategy");
  const routeScope = recordChild(matrix, "routeScope");
  const rollback = recordChild(matrix, "rollbackAndInvalidation");
  const beforeAfter = recordChild(matrix, "beforeAfterMetrics");
  const after = recordChild(beforeAfter, "after");
  const safety = recordChild(matrix, "safety");
  const readThroughAllowedRoutes = recordStringArray(routeScope, "readThroughAllowedRoutes");
  const publicCatalogReadThroughRoutes = recordStringArray(routeScope, "publicCatalogReadThroughRoutes");

  const proofTestPresent =
    testSource !== null &&
    testSource.includes("S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF") &&
    testSource.includes("expect(await redis.adapter.get(proofKey)).toBeNull()") &&
    testSource.includes("serverTiming: expect.objectContaining({ cacheHit: false })") &&
    testSource.includes("serverTiming: expect.objectContaining({ cacheHit: true })") &&
    testSource.includes("invalidateByTag(\"marketplace\")") &&
    testSource.includes("resolveCacheShadowRuntimeConfig({}).enabled");
  const matrixArtifactPresent = matrix !== null;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(CACHE_COLD_MISS_READY_STATUS) &&
    proofSource.includes("No production cache enablement") &&
    proofSource.includes("Supabase Realtime status remains");
  const matrixStatus = recordString(matrix, "status");
  const deterministicProofReady =
    matrixStatus === CACHE_COLD_MISS_READY_STATUS &&
    recordBoolean(after, "deterministicColdMissProof") === true;
  const knownEmptyKeyProof =
    recordBoolean(after, "knownEmptyKeyProof") === true &&
    recordBoolean(proofStrategy, "knownEmptyBeforeFirstRequest") === true;
  const firstMissSecondHitProof =
    recordBoolean(after, "firstMissSecondHitProof") === true &&
    recordNumber(after, "missCount") === 1 &&
    recordNumber(after, "hitCount") === 1 &&
    recordNumber(after, "readThroughCount") === 1 &&
    recordNumber(after, "providerCalls") === 1;
  const utf8SafeProof =
    recordBoolean(after, "utf8SafeProof") === true &&
    recordBoolean(proofStrategy, "utf8Safe") === true;
  const metricsRedactedProof =
    recordBoolean(proofStrategy, "metricsRedacted") === true &&
    recordBoolean(proofStrategy, "routeMetricsRedactionSafe") === true &&
    recordBoolean(proofStrategy, "rawCacheKeyReturned") === false &&
    recordBoolean(proofStrategy, "rawPayloadLogged") === false &&
    recordBoolean(proofStrategy, "piiLogged") === false;
  const routeScopeUnchanged =
    readThroughAllowedRoutes.length === 1 &&
    readThroughAllowedRoutes[0] === CACHE_RATE_ALLOWED_ROUTE &&
    publicCatalogReadThroughRoutes.length === 1 &&
    publicCatalogReadThroughRoutes[0] === CACHE_RATE_ALLOWED_ROUTE &&
    recordBoolean(routeScope, "routeExpansion") === false &&
    recordBoolean(routeScope, "readRoutesCacheDefaultEnabled") === false;
  const rollbackSafeProof =
    recordBoolean(after, "rollbackSafeProof") === true &&
    recordBoolean(rollback, "cacheInvalidationExecutionEnabledByDefault") === false &&
    recordNumber(rollback, "rollbackDeletedEntries") === 1 &&
    recordBoolean(rollback, "postRollbackReadNull") === true &&
    recordBoolean(rollback, "dbWrites") === false;
  const productionCacheStillDisabled =
    recordBoolean(baseline, "productionCacheEnabled") === false &&
    recordBoolean(baseline, "readThroughV1DefaultEnabled") === false &&
    recordBoolean(baseline, "cachePoliciesDefaultEnabled") === false &&
    recordBoolean(safety, "productionCacheEnabled") === false &&
    recordBoolean(safety, "cacheLeftEnabled") === false &&
    recordBoolean(safety, "broadCacheConfigChange") === false;

  const errors = [
    ...(proofTestPresent ? [] : ["cache_cold_miss_proof_test_missing_or_weakened"]),
    ...(matrixArtifactPresent ? [] : ["cache_cold_miss_matrix_missing_or_invalid"]),
    ...(proofArtifactPresent ? [] : ["cache_cold_miss_proof_artifact_missing_or_weakened"]),
    ...(deterministicProofReady ? [] : [`cache_cold_miss_status_not_ready:${matrixStatus || "missing"}`]),
    ...(knownEmptyKeyProof ? [] : ["cache_cold_miss_known_empty_key_not_proven"]),
    ...(firstMissSecondHitProof ? [] : ["cache_cold_miss_first_miss_second_hit_not_proven"]),
    ...(utf8SafeProof ? [] : ["cache_cold_miss_utf8_not_proven"]),
    ...(metricsRedactedProof ? [] : ["cache_cold_miss_metrics_not_redaction_safe"]),
    ...(routeScopeUnchanged ? [] : ["cache_cold_miss_route_scope_changed"]),
    ...(rollbackSafeProof ? [] : ["cache_cold_miss_rollback_not_safe"]),
    ...(productionCacheStillDisabled ? [] : ["cache_cold_miss_production_cache_not_disabled"]),
  ];

  return {
    check: {
      name: "cache_cold_miss_deterministic_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      proofTestPresent,
      matrixArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      deterministicProofReady,
      knownEmptyKeyProof,
      firstMissSecondHitProof,
      utf8SafeProof,
      metricsRedactedProof,
      routeScopeUnchanged,
      rollbackSafeProof,
      productionCacheStillDisabled,
    },
  };
}

export function evaluateRateLimitMarketplaceCanaryProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["rateLimitMarketplaceCanaryProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const matrixSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_CANARY_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_CANARY_PROOF_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const envSnapshot = recordChild(matrix, "env_snapshot_redacted");
  const route = recordString(matrix, "route") || recordString(matrix, "canary_route_class");
  const matrixStatus = recordString(matrix, "final_status");
  const routeScoped =
    matrixStatus === RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS &&
    route === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(matrix, "route_allowlist_count") === 1 &&
    recordBoolean(matrix, "route_scoped_enforcement") === true &&
    recordBoolean(matrix, "global_real_user_enforcement") === false &&
    recordNumber(matrix, "canary_percent") === RATE_LIMIT_ALLOWED_PERCENT &&
    recordBoolean(matrix, "broad_mutation_route_enforcement") === false &&
    recordBoolean(matrix, "second_route_enabled") === false;
  const selectedSubjectProof =
    recordString(matrix, "selected_subject_proof") === "selected_redacted" &&
    recordString(matrix, "selected_canary_request_status_class") === "2xx" &&
    recordString(matrix, "selected_error_category") === "none";
  const nonSelectedSubjectProof =
    recordString(matrix, "non_selected_subject_proof") === "non_selected_redacted" &&
    recordString(matrix, "non_selected_allow_request_status_class") === "2xx" &&
    recordString(matrix, "non_selected_error_category") === "none";
  const privateSmokeProof =
    recordBoolean(matrix, "private_in_service_smoke_green") === true &&
    recordString(matrix, "synthetic_private_smoke_status_class") === "2xx" &&
    recordString(matrix, "synthetic_private_smoke_error_category") === "none" &&
    recordBoolean(matrix, "synthetic_throttle_still_works") === true;
  const healthReadyStable =
    recordBoolean(matrix, "health_ready_stable") === true &&
    recordNumber(matrix, "production_health_before") === 200 &&
    recordNumber(matrix, "production_ready_before") === 200 &&
    recordNumber(matrix, "production_health_after_deploy") === 200 &&
    recordNumber(matrix, "production_ready_after_deploy") === 200 &&
    recordNumber(matrix, "production_health_after_canary") === 200 &&
    recordNumber(matrix, "production_ready_after_canary") === 200;
  const envSnapshotRedacted =
    envSnapshot !== null &&
    [
      "SCALE_RATE_ENFORCEMENT_MODE",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
      "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
      "SCALE_RATE_LIMIT_STORE_URL",
      "SCALE_RATE_LIMIT_NAMESPACE",
      "BFF_RATE_LIMIT_METADATA_ENABLED",
    ].every((key) => recordString(recordChild(envSnapshot, key), "valueClass") === "present_redacted");
  const redactedProof =
    recordBoolean(matrix, "env_snapshot_captured") === true &&
    envSnapshotRedacted &&
    recordBoolean(matrix, "redaction_enabled") === true &&
    recordBoolean(matrix, "raw_keys_printed") === false &&
    recordBoolean(matrix, "jwt_printed") === false &&
    recordBoolean(matrix, "ip_user_company_printed") === false &&
    recordBoolean(matrix, "secrets_printed") === false &&
    recordBoolean(matrix, "urls_printed") === false &&
    recordBoolean(matrix, "raw_payloads_printed") === false &&
    recordBoolean(matrix, "raw_db_rows_printed") === false &&
    recordBoolean(matrix, "business_rows_printed") === false &&
    recordBoolean(matrix, "db_writes") === false &&
    recordBoolean(matrix, "migrations_applied") === false &&
    recordBoolean(matrix, "cache_changes") === false;
  const canaryRetained =
    recordBoolean(matrix, "canary_retained") === true &&
    recordBoolean(matrix, "rollback_triggered") === false &&
    recordBoolean(matrix, "rollback_succeeded") === false;
  const matrixArtifactPresent = matrix !== null;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(RATE_LIMIT_MARKETPLACE_CANARY_PASS_STATUS) &&
    proofSource.includes("- route: marketplace.catalog.search") &&
    proofSource.includes("- canary_percent: 1") &&
    proofSource.includes("- selected_subject_proof: selected_redacted") &&
    proofSource.includes("- non_selected_subject_proof: non_selected_redacted") &&
    proofSource.includes("- private_smoke_green: true");
  const errors = [
    ...(matrixArtifactPresent ? [] : ["rate_limit_marketplace_canary_matrix_missing"]),
    ...(proofArtifactPresent ? [] : ["rate_limit_marketplace_canary_proof_missing_or_stale"]),
    ...(routeScoped ? [] : ["rate_limit_marketplace_canary_scope_not_locked"]),
    ...(selectedSubjectProof ? [] : ["rate_limit_marketplace_selected_subject_not_proven"]),
    ...(nonSelectedSubjectProof ? [] : ["rate_limit_marketplace_non_selected_subject_not_proven"]),
    ...(privateSmokeProof ? [] : ["rate_limit_marketplace_private_smoke_not_green"]),
    ...(healthReadyStable ? [] : ["rate_limit_marketplace_health_ready_not_stable"]),
    ...(redactedProof ? [] : ["rate_limit_marketplace_redaction_or_safety_not_proven"]),
    ...(canaryRetained ? [] : ["rate_limit_marketplace_canary_retention_not_recorded"]),
  ];

  return {
    check: {
      name: "rate_limit_marketplace_1_percent_canary_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      matrixArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      routeScoped,
      selectedSubjectProof,
      nonSelectedSubjectProof,
      privateSmokeProof,
      healthReadyStable,
      redactedProof,
      canaryRetained,
    },
  };
}

export function evaluateRateLimitMarketplace5PctCanaryProofGuardrail(params: {
  projectRoot: string;
  readFile?: ReadFile;
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["rateLimitMarketplace5PctCanaryProof"];
} {
  const readFile = params.readFile ?? ((relativePath) => readProjectFile(params.projectRoot, relativePath));
  const matrixSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MATRIX_PATH });
  const proofSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_PROOF_PATH });
  const monitorSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_MATRIX_PATH });
  const metricsSource = safeReadProjectFile({ readFile, relativePath: RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_METRICS_PATH });
  const matrix = parseJsonRecord(matrixSource);
  const monitor = parseJsonRecord(monitorSource);
  const metrics = parseJsonRecord(metricsSource);
  const verification = recordChild(matrix, "verification");
  const healthReady = recordChild(matrix, "health_ready");
  const healthBefore = recordChild(healthReady, "before");
  const healthAfterDeploy = recordChild(healthReady, "after_deploy");
  const healthAfter = recordChild(healthReady, "after");
  const negative = recordChild(matrix, "negative_confirmations");
  const monitorNegative = recordChild(monitor, "negative_confirmations");
  const matrixStatus = recordString(matrix, "final_status");
  const monitorStatus = recordString(monitor, "final_status");
  const matrixArtifactPresent = matrix !== null;
  const monitorArtifactPresent = monitor !== null;
  const metricsArtifactPresent = metrics !== null;
  const routeScoped =
    matrixStatus === RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS &&
    recordString(matrix, "route") === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(matrix, "percent") === RATE_LIMIT_5PCT_ALLOWED_PERCENT &&
    recordNumber(matrix, "route_allowlist_count") === 1 &&
    recordBoolean(matrix, "retained") === true &&
    recordBoolean(negative, "all_routes") === false &&
    recordBoolean(negative, "ten_percent") === false &&
    recordBoolean(negative, "cache_changes") === false;
  const selectedSubjectProof =
    recordString(verification, "selected_subject_proof") === "selected_redacted" &&
    recordString(verification, "selected_status_class") === "2xx";
  const nonSelectedSubjectProof =
    recordString(verification, "non_selected_subject_proof") === "non_selected_redacted" &&
    recordString(verification, "non_selected_status_class") === "2xx";
  const privateSmokeProof =
    recordBoolean(verification, "private_smoke_2xx") === true &&
    recordString(metrics, "private_smoke_status_class") === "2xx";
  const wouldAllowProof = recordBoolean(verification, "wouldAllow") === true && recordBoolean(metrics, "wouldAllow") === true;
  const wouldThrottleProof =
    recordBoolean(verification, "wouldThrottle") === true && recordBoolean(metrics, "wouldThrottle") === true;
  const falsePositiveCountZero =
    recordNumber(verification, "false_positive_count") === 0 &&
    recordNumber(metrics, "false_positive_count") === 0 &&
    recordNumber(metrics, "non_selected_blocked_count") === 0;
  const healthStable =
    recordNumber(healthBefore, "health") === 200 &&
    recordNumber(healthBefore, "ready") === 200 &&
    recordNumber(healthAfterDeploy, "health") === 200 &&
    recordNumber(healthAfterDeploy, "ready") === 200 &&
    recordNumber(healthAfter, "health") === 200 &&
    recordNumber(healthAfter, "ready") === 200 &&
    recordNumber(verification, "health_after") === 200 &&
    recordNumber(verification, "ready_after") === 200 &&
    recordNumber(monitor, "health_after") === 200 &&
    recordNumber(monitor, "ready_after") === 200;
  const redactedProof =
    recordBoolean(verification, "metrics_redacted") === true &&
    recordBoolean(monitor, "metrics_redacted") === true &&
    recordBoolean(negative, "raw_subject_user_token_values_printed") === false &&
    recordBoolean(monitorNegative, "raw_subject_user_token_values_printed") === false &&
    recordBoolean(negative, "db_writes") === false &&
    recordBoolean(negative, "production_mutations") === false &&
    recordBoolean(monitorNegative, "db_writes") === false &&
    recordBoolean(monitorNegative, "production_mutations") === false;
  const monitorStable =
    monitorStatus === RATE_LIMIT_MARKETPLACE_5PCT_MONITOR_PASS_STATUS &&
    recordString(monitor, "route") === CACHE_RATE_ALLOWED_ROUTE &&
    recordNumber(monitor, "route_count") === 1 &&
    recordNumber(monitor, "percent") === RATE_LIMIT_5PCT_ALLOWED_PERCENT &&
    recordBoolean(monitor, "non_selected_blocked") === false &&
    recordBoolean(monitor, "private_smoke_2xx") === true &&
    recordBoolean(monitorNegative, "cache_changes") === false &&
    recordNumber(metrics, "sample_size") === 10 &&
    recordNumber(metrics, "allowed_count") === 10 &&
    recordNumber(metrics, "throttled_count") === 0;
  const proofArtifactPresent =
    proofSource !== null &&
    proofSource.includes(RATE_LIMIT_MARKETPLACE_5PCT_PASS_STATUS) &&
    proofSource.includes("- route: marketplace.catalog.search") &&
    proofSource.includes("- percent: 5") &&
    proofSource.includes("- false_positive_count: 0");
  const errors = [
    ...(matrixArtifactPresent ? [] : ["rate_limit_marketplace_5pct_matrix_missing"]),
    ...(monitorArtifactPresent ? [] : ["rate_limit_marketplace_5pct_monitor_missing"]),
    ...(metricsArtifactPresent ? [] : ["rate_limit_marketplace_5pct_metrics_missing"]),
    ...(proofArtifactPresent ? [] : ["rate_limit_marketplace_5pct_proof_missing_or_stale"]),
    ...(routeScoped ? [] : ["rate_limit_marketplace_5pct_scope_not_locked"]),
    ...(selectedSubjectProof ? [] : ["rate_limit_marketplace_5pct_selected_subject_not_proven"]),
    ...(nonSelectedSubjectProof ? [] : ["rate_limit_marketplace_5pct_non_selected_subject_not_proven"]),
    ...(privateSmokeProof ? [] : ["rate_limit_marketplace_5pct_private_smoke_not_green"]),
    ...(wouldAllowProof ? [] : ["rate_limit_marketplace_5pct_would_allow_not_proven"]),
    ...(wouldThrottleProof ? [] : ["rate_limit_marketplace_5pct_would_throttle_not_proven"]),
    ...(falsePositiveCountZero ? [] : ["rate_limit_marketplace_5pct_false_positive_nonzero"]),
    ...(healthStable ? [] : ["rate_limit_marketplace_5pct_health_not_stable"]),
    ...(redactedProof ? [] : ["rate_limit_marketplace_5pct_redaction_or_safety_not_proven"]),
    ...(monitorStable ? [] : ["rate_limit_marketplace_5pct_monitor_not_stable"]),
  ];

  return {
    check: {
      name: "rate_limit_marketplace_5pct_canary_proof",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      matrixArtifactPresent,
      monitorArtifactPresent,
      metricsArtifactPresent,
      proofArtifactPresent,
      matrixStatus,
      monitorStatus,
      routeScoped,
      selectedSubjectProof,
      nonSelectedSubjectProof,
      privateSmokeProof,
      wouldAllowProof,
      wouldThrottleProof,
      falsePositiveCountZero,
      healthStable,
      redactedProof,
      monitorStable,
    },
  };
}

const findProductionRawLoopAllowlistEntry = (
  allowlist: readonly ProductionRawLoopAllowlistEntry[],
  finding: Pick<ProductionRawLoopFinding, "file" | "line" | "pattern">,
): ProductionRawLoopAllowlistEntry | undefined =>
  allowlist.find(
    (entry) =>
      normalizePath(entry.file) === finding.file &&
      entry.line === finding.line &&
      entry.pattern === finding.pattern,
  );

const productionRawLoopPatterns: readonly {
  pattern: ProductionRawLoopPattern;
  regex: RegExp;
}[] = [
  { pattern: "while_true", regex: /\bwhile\s*\(\s*true\s*\)/g },
  { pattern: "for_ever", regex: /\bfor\s*\(\s*;\s*;\s*\)/g },
];

export function scanProductionRawLoopSource(params: {
  file: string;
  source: string;
  allowlist?: readonly ProductionRawLoopAllowlistEntry[];
}): ProductionRawLoopFinding[] {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? PRODUCTION_RAW_LOOP_ALLOWLIST;
  const findings: ProductionRawLoopFinding[] = [];

  params.source.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1;
    for (const candidate of productionRawLoopPatterns) {
      candidate.regex.lastIndex = 0;
      const match = candidate.regex.exec(lineText);
      if (!match) continue;
      const allowlistEntry = findProductionRawLoopAllowlistEntry(allowlist, {
        file,
        line,
        pattern: candidate.pattern,
      });
      findings.push({
        file,
        line,
        pattern: candidate.pattern,
        matchedLoop: match[0],
        allowlisted: Boolean(allowlistEntry),
        reason: allowlistEntry?.reason ?? null,
        owner: allowlistEntry?.owner ?? null,
        testCoverage: allowlistEntry?.testCoverage ?? null,
      });
    }
  });

  return findings;
}

export function scanProductionRawLoops(
  projectRoot: string,
  allowlist: readonly ProductionRawLoopAllowlistEntry[] = PRODUCTION_RAW_LOOP_ALLOWLIST,
): ProductionRawLoopFinding[] {
  const sourceRoot = path.join(projectRoot, "src");
  return listSourceFiles(sourceRoot)
    .map((filePath) => relativeProjectPath(projectRoot, filePath))
    .filter((relativePath) => !isTestPath(relativePath))
    .flatMap((relativePath) =>
      scanProductionRawLoopSource({
        file: relativePath,
        source: readProjectFile(projectRoot, relativePath),
        allowlist,
      }),
    );
}

export function evaluateProductionRawLoopGuardrail(params: {
  findings: readonly ProductionRawLoopFinding[];
  allowlist?: readonly ProductionRawLoopAllowlistEntry[];
}): {
  check: ArchitectureGuardrailCheck;
  summary: ArchitectureAntiRegressionReport["productionRawLoops"];
} {
  const allowlist = params.allowlist ?? PRODUCTION_RAW_LOOP_ALLOWLIST;
  const unapprovedFindings = params.findings.filter((finding) => !finding.allowlisted);
  const invalidAllowlistEntries = allowlist.filter(
    (entry) =>
      !entry.reason.trim() ||
      !entry.owner.trim() ||
      !entry.testCoverage.trim(),
  );
  const unusedAllowlistEntries = allowlist.filter(
    (entry) =>
      !params.findings.some(
        (finding) =>
          finding.allowlisted &&
          finding.file === normalizePath(entry.file) &&
          finding.line === entry.line &&
          finding.pattern === entry.pattern,
      ),
  );
  const countsByFile = new Map<string, number>();
  for (const finding of params.findings) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...unapprovedFindings.map(
      (finding) =>
        `production_raw_loop:file=${finding.file}:line=${finding.line}:matched_loop=${finding.matchedLoop}:expected=${PRODUCTION_RAW_LOOP_EXPECTED_OWNER}`,
    ),
    ...invalidAllowlistEntries.map(
      (entry) =>
        `production_raw_loop_allowlist_missing_metadata:file=${normalizePath(entry.file)}:line=${entry.line}:pattern=${entry.pattern}`,
    ),
    ...unusedAllowlistEntries.map(
      (entry) =>
        `production_raw_loop_allowlist_unused:file=${normalizePath(entry.file)}:line=${entry.line}:pattern=${entry.pattern}`,
    ),
    ...(unapprovedFindings.length > PRODUCTION_RAW_LOOP_BUDGET
      ? [`production_raw_loop_budget_exceeded:${unapprovedFindings.length}>${PRODUCTION_RAW_LOOP_BUDGET}`]
      : []),
  ];

  return {
    check: {
      name: "production_raw_loop_boundary",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      rawLoopBudget: PRODUCTION_RAW_LOOP_BUDGET,
      totalFindings: params.findings.length,
      unapprovedFindings: unapprovedFindings.length,
      allowlistedFindings: params.findings.length - unapprovedFindings.length,
      allowlistEntries: allowlist.length,
      topFiles,
    },
  };
}

const unboundedSelectRatchetActions: readonly SelectInventoryAction[] = [
  "fix_now",
  "needs_rpc_change",
];

const unboundedSelectAllowlistKey = (
  value: {
    file: string;
    line: number;
    queryString: string;
    action: SelectInventoryAction;
  },
): string =>
  `${normalizePath(value.file)}:${value.line}:${value.action}:${value.queryString}`;

const findUnboundedSelectAllowlistEntry = (
  allowlist: readonly UnboundedSelectAllowlistEntry[],
  entry: SelectInventoryEntry,
): UnboundedSelectAllowlistEntry | undefined =>
  allowlist.find(
    (candidate) =>
      unboundedSelectAllowlistKey(candidate) ===
      unboundedSelectAllowlistKey({
        file: entry.file,
        line: entry.line,
        queryString: entry.queryString,
        action: entry.action,
      }),
  );

const enrichUnboundedSelectFinding = (
  entry: SelectInventoryEntry,
  allowlist: readonly UnboundedSelectAllowlistEntry[],
): UnboundedSelectRatchetFinding => {
  const allowlistEntry = findUnboundedSelectAllowlistEntry(allowlist, entry);
  return {
    ...entry,
    allowlisted: Boolean(allowlistEntry),
    owner: allowlistEntry?.owner ?? null,
    allowlistReason: allowlistEntry?.reason ?? null,
    migrationPath: allowlistEntry?.migrationPath ?? null,
    expected: UNBOUNDED_SELECT_EXPECTED,
  };
};

export function scanUnboundedSelectRatchetSource(params: {
  file: string;
  source: string;
  allowlist?: readonly UnboundedSelectAllowlistEntry[];
}): UnboundedSelectRatchetFinding[] {
  const allowlist = params.allowlist ?? UNBOUNDED_SELECT_EXPORT_ALLOWLIST;
  return collectSelectInventoryFromSource({
    file: normalizePath(params.file),
    text: params.source,
  }).entries.map((entry) => enrichUnboundedSelectFinding(entry, allowlist));
}

export function scanUnboundedSelectRatchet(
  projectRoot: string,
  allowlist: readonly UnboundedSelectAllowlistEntry[] = UNBOUNDED_SELECT_EXPORT_ALLOWLIST,
): UnboundedSelectRatchetFinding[] {
  const { inventory } = collectSelectInventory(projectRoot);
  return inventory.map((entry) => enrichUnboundedSelectFinding(entry, allowlist));
}

const formatUnboundedSelectFailure = (
  finding: UnboundedSelectRatchetFinding,
): string =>
  [
    "unbounded_select",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `action=${finding.action}`,
    `query_type=${finding.queryType}`,
    `query=${finding.queryString}`,
    `expected=${finding.expected}`,
  ].join(":");

const formatSelectStarFailure = (
  finding: UnboundedSelectRatchetFinding,
): string =>
  [
    "select_star",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `action=${finding.action}`,
    `query_type=${finding.queryType}`,
    `expected=explicit columns or documented export migration path`,
  ].join(":");

const validateUnboundedSelectAllowlist = (
  allowlist: readonly UnboundedSelectAllowlistEntry[],
  findings: readonly UnboundedSelectRatchetFinding[],
): string[] => {
  const findingKeys = new Set(
    findings
      .filter((finding) => finding.action === "export_allowlist")
      .map((finding) =>
        unboundedSelectAllowlistKey({
          file: finding.file,
          line: finding.line,
          queryString: finding.queryString,
          action: "export_allowlist",
        }),
      ),
  );
  return allowlist.flatMap((entry) => {
    const file = normalizePath(entry.file);
    const key = unboundedSelectAllowlistKey({ ...entry, file });
    const missingMetadata =
      !file.trim() ||
      !Number.isInteger(entry.line) ||
      entry.line <= 0 ||
      !entry.queryString.trim() ||
      entry.action !== "export_allowlist" ||
      !entry.owner.trim() ||
      !entry.reason.trim() ||
      !entry.migrationPath.trim();
    return [
      ...(missingMetadata
        ? [`unbounded_select_allowlist_missing_metadata:file=${file}:line=${entry.line}:action=${entry.action}`]
        : []),
      ...(findingKeys.has(key)
        ? []
        : [`unbounded_select_allowlist_unused:file=${file}:line=${entry.line}:action=${entry.action}:query=${entry.queryString}`]),
    ];
  });
};

export function evaluateUnboundedSelectRatchetGuardrail(params: {
  findings: readonly UnboundedSelectRatchetFinding[];
  allowlist?: readonly UnboundedSelectAllowlistEntry[];
  unboundedSelectBudget?: 0;
  selectStarBudget?: 0;
}): {
  check: ArchitectureGuardrailCheck;
  summary: UnboundedSelectRatchetSummary;
} {
  const allowlist = params.allowlist ?? UNBOUNDED_SELECT_EXPORT_ALLOWLIST;
  const unboundedSelectBudget = params.unboundedSelectBudget ?? UNBOUNDED_SELECT_BUDGET;
  const selectStarBudget = params.selectStarBudget ?? SELECT_STAR_BUDGET;
  const unresolvedUnbounded = params.findings.filter((finding) =>
    unboundedSelectRatchetActions.includes(finding.action),
  );
  const selectStarFindings = params.findings.filter((finding) => finding.selectStar);
  const exportAllowlistFindings = params.findings.filter((finding) => finding.action === "export_allowlist");
  const undocumentedExportAllowlistFindings = exportAllowlistFindings.filter((finding) => !finding.allowlisted);
  const countsByFile = new Map<string, number>();
  for (const finding of [...unresolvedUnbounded, ...selectStarFindings, ...undocumentedExportAllowlistFindings]) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...unresolvedUnbounded.map(formatUnboundedSelectFailure),
    ...selectStarFindings.map(formatSelectStarFailure),
    ...undocumentedExportAllowlistFindings.map(
      (finding) =>
        `unbounded_select_export_allowlist_undocumented:file=${finding.file}:line=${finding.line}:query=${finding.queryString}`,
    ),
    ...(unresolvedUnbounded.length > unboundedSelectBudget
      ? [`unbounded_select_budget_exceeded:${unresolvedUnbounded.length}>${unboundedSelectBudget}`]
      : []),
    ...(selectStarFindings.length > selectStarBudget
      ? [`select_star_budget_exceeded:${selectStarFindings.length}>${selectStarBudget}`]
      : []),
    ...validateUnboundedSelectAllowlist(allowlist, params.findings),
  ];

  return {
    check: {
      name: "unbounded_select_ratchet",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      unboundedSelectBudget,
      selectStarBudget,
      totalSelectCalls: params.findings.length,
      unresolvedUnboundedSelects: unresolvedUnbounded.length,
      selectStarFindings: selectStarFindings.length,
      exportAllowlistFindings: exportAllowlistFindings.length,
      documentedExportAllowlistFindings: exportAllowlistFindings.length - undocumentedExportAllowlistFindings.length,
      allowlistEntries: allowlist.length,
      topFiles,
    },
  };
}

const unsafeCastPatterns: readonly {
  pattern: UnsafeCastPattern;
  regex: RegExp;
}[] = [
  { pattern: "as_any", regex: /\bas\s+any\b/g },
  { pattern: "ts_ignore", regex: new RegExp(`${"@ts"}-${"ignore"}\\b`, "g") },
  { pattern: "silent_catch", regex: /\bcatch\s*\{\s*\}/g },
];

const unsafeUnknownAsRegex = /\bunknown\s+as\b/g;
const unsafeUnknownAsGuardEvidence =
  /\b(createGuardedPagedQuery|assert[A-Z][A-Za-z0-9_]*|is[A-Z][A-Za-z0-9_]*|has[A-Z][A-Za-z0-9_]*|parse[A-Z][A-Za-z0-9_]*|validate[A-Z][A-Za-z0-9_]*|safeParse|schema|guard|narrow|normalize[A-Z][A-Za-z0-9_]*)\b/;

const unsafeCastScopeForPath = (normalizedPath: string): UnsafeCastScope =>
  normalizedPath.startsWith("tests/") || isTestPath(normalizedPath)
    ? "test_source"
    : "production_source";

const unsafeCastCriticalFolderForPath = (normalizedPath: string): string | null =>
  UNSAFE_CAST_CRITICAL_FOLDERS.find(
    (folder) => normalizedPath === folder || normalizedPath.startsWith(`${folder}/`),
  ) ?? null;

const findUnsafeCastAllowlistEntry = (
  allowlist: readonly UnsafeCastAllowlistEntry[],
  finding: Pick<UnsafeCastFinding, "file" | "line" | "pattern">,
): UnsafeCastAllowlistEntry | undefined =>
  allowlist.find(
    (entry) =>
      normalizePath(entry.file) === finding.file &&
      entry.line === finding.line &&
      entry.pattern === finding.pattern,
  );

const hasRuntimeGuardEvidenceForUnknownAs = (lines: readonly string[], index: number): boolean => {
  const start = Math.max(0, index - 4);
  const nearbySource = lines.slice(start, index + 1).join("\n");
  return unsafeUnknownAsGuardEvidence.test(nearbySource);
};

const buildUnsafeCastFinding = (
  params: {
    file: string;
    line: number;
    pattern: UnsafeCastPattern;
    matchedText: string;
    allowlist: readonly UnsafeCastAllowlistEntry[];
  },
): UnsafeCastFinding => {
  const scope = unsafeCastScopeForPath(params.file);
  const criticalFolder = unsafeCastCriticalFolderForPath(params.file);
  const allowlistEntry = findUnsafeCastAllowlistEntry(params.allowlist, {
    file: params.file,
    line: params.line,
    pattern: params.pattern,
  });

  return {
    file: params.file,
    line: params.line,
    pattern: params.pattern,
    matchedText: params.matchedText,
    scope,
    criticalFolder,
    allowlisted: Boolean(allowlistEntry),
    reason: allowlistEntry?.reason ?? null,
    owner: allowlistEntry?.owner ?? null,
    expiresAtLocalDate: allowlistEntry?.expiresAtLocalDate ?? null,
    migrationWave: allowlistEntry?.migrationWave ?? null,
    expected: UNSAFE_CAST_EXPECTED,
  };
};

export function scanUnsafeCastSource(params: {
  file: string;
  source: string;
  allowlist?: readonly UnsafeCastAllowlistEntry[];
}): UnsafeCastFinding[] {
  const file = normalizePath(params.file);
  const allowlist = params.allowlist ?? UNSAFE_CAST_ALLOWLIST;
  const lines = params.source.split(/\r?\n/);
  const findings: UnsafeCastFinding[] = [];

  lines.forEach((lineText, index) => {
    const line = index + 1;
    for (const candidate of unsafeCastPatterns) {
      candidate.regex.lastIndex = 0;
      const matches = lineText.matchAll(candidate.regex);
      for (const match of matches) {
        findings.push(
          buildUnsafeCastFinding({
            file,
            line,
            pattern: candidate.pattern,
            matchedText: match[0] ?? candidate.pattern,
            allowlist,
          }),
        );
      }
    }

    unsafeUnknownAsRegex.lastIndex = 0;
    if (hasRuntimeGuardEvidenceForUnknownAs(lines, index)) return;
    const unknownMatches = lineText.matchAll(unsafeUnknownAsRegex);
    for (const match of unknownMatches) {
      findings.push(
        buildUnsafeCastFinding({
          file,
          line,
          pattern: "unsafe_unknown_as",
          matchedText: match[0] ?? "unknown_as",
          allowlist,
        }),
      );
    }
  });

  return findings;
}

export function scanUnsafeCastRatchetFindings(
  projectRoot: string,
  allowlist: readonly UnsafeCastAllowlistEntry[] = UNSAFE_CAST_ALLOWLIST,
): UnsafeCastFinding[] {
  const roots = UNSAFE_CAST_SCAN_ROOTS.map((rootName) => path.join(projectRoot, rootName));
  return roots.flatMap((root) =>
    listSourceFiles(root).flatMap((filePath) => {
      const relativePath = relativeProjectPath(projectRoot, filePath);
      return scanUnsafeCastSource({
        file: relativePath,
        source: readProjectFile(projectRoot, relativePath),
        allowlist,
      });
    }),
  );
}

const incrementUnsafeCastCount = (
  counts: UnsafeCastPatternCounts,
  pattern: UnsafeCastPattern,
): void => {
  counts[pattern] += 1;
};

const unsafeCastPatternKeys: readonly UnsafeCastPattern[] = [
  "as_any",
  "ts_ignore",
  "silent_catch",
  "unsafe_unknown_as",
];

const unsafeCastCountForFolder = (
  findings: readonly UnsafeCastFinding[],
  folder: string,
): UnsafeCastPatternCounts => {
  const counts = emptyUnsafeCastPatternCounts();
  for (const finding of findings) {
    if (finding.file === folder || finding.file.startsWith(`${folder}/`)) {
      incrementUnsafeCastCount(counts, finding.pattern);
    }
  }
  return counts;
};

const summarizeUnsafeCastFindings = (
  findings: readonly UnsafeCastFinding[],
  baseline: UnsafeCastRatchetBaseline,
): UnsafeCastRatchetSummary["current"] => {
  const byPattern = emptyUnsafeCastPatternCounts();
  const productionByPattern = emptyUnsafeCastPatternCounts();
  const testByPattern = emptyUnsafeCastPatternCounts();
  let productionSource = 0;
  let testSource = 0;

  for (const finding of findings) {
    incrementUnsafeCastCount(byPattern, finding.pattern);
    if (finding.scope === "production_source") {
      productionSource += 1;
      incrementUnsafeCastCount(productionByPattern, finding.pattern);
    } else {
      testSource += 1;
      incrementUnsafeCastCount(testByPattern, finding.pattern);
    }
  }

  return {
    total: findings.length,
    productionSource,
    testSource,
    byPattern,
    productionByPattern,
    testByPattern,
    criticalFolderByPattern: baseline.criticalFolderByPattern.map((entry) => ({
      folder: entry.folder,
      byPattern: unsafeCastCountForFolder(findings, entry.folder),
    })),
  };
};

const validateUnsafeCastAllowlist = (
  allowlist: readonly UnsafeCastAllowlistEntry[],
  findings: readonly UnsafeCastFinding[],
): string[] => {
  const findingKeys = new Set(
    findings.map((finding) => `${finding.file}:${finding.line}:${finding.pattern}`),
  );
  return allowlist.flatMap((entry) => {
    const file = normalizePath(entry.file);
    const missingMetadata =
      !file.trim() ||
      !Number.isInteger(entry.line) ||
      entry.line <= 0 ||
      !entry.reason.trim() ||
      !entry.owner.trim() ||
      (!entry.expiresAtLocalDate?.trim() && !entry.migrationWave?.trim());
    const key = `${file}:${entry.line}:${entry.pattern}`;
    return [
      ...(missingMetadata
        ? [`unsafe_cast_allowlist_missing_metadata:file=${file}:line=${entry.line}:pattern=${entry.pattern}`]
        : []),
      ...(findingKeys.has(key)
        ? []
        : [`unsafe_cast_allowlist_unused:file=${file}:line=${entry.line}:pattern=${entry.pattern}`]),
    ];
  });
};

const findCriticalFolderBaseline = (
  baseline: UnsafeCastRatchetBaseline,
  folder: string,
): UnsafeCastPatternCounts =>
  baseline.criticalFolderByPattern.find((entry) => entry.folder === folder)?.byPattern ??
  emptyUnsafeCastPatternCounts();

const formatUnsafeCastCriticalFailure = (
  finding: UnsafeCastFinding,
): string =>
  [
    "unsafe_cast_critical_folder_violation",
    `file=${finding.file}`,
    `line=${finding.line}`,
    `pattern=${finding.pattern}`,
    `matched=${finding.matchedText}`,
    `expected=${finding.expected}`,
  ].join(":");

export function evaluateUnsafeCastRatchetGuardrail(params: {
  findings: readonly UnsafeCastFinding[];
  allowlist?: readonly UnsafeCastAllowlistEntry[];
  baseline?: UnsafeCastRatchetBaseline;
}): {
  check: ArchitectureGuardrailCheck;
  summary: UnsafeCastRatchetSummary;
} {
  const allowlist = params.allowlist ?? UNSAFE_CAST_ALLOWLIST;
  const baseline = params.baseline ?? UNSAFE_CAST_RATCHET_BASELINE;
  const current = summarizeUnsafeCastFindings(params.findings, baseline);
  const criticalViolations = params.findings.filter((finding) => {
    if (!finding.criticalFolder || finding.scope !== "production_source" || finding.allowlisted) {
      return false;
    }
    const folderBaseline = findCriticalFolderBaseline(baseline, finding.criticalFolder);
    return folderBaseline[finding.pattern] === 0;
  });
  const countsByFile = new Map<string, number>();
  for (const finding of params.findings) {
    countsByFile.set(finding.file, (countsByFile.get(finding.file) ?? 0) + 1);
  }
  const topFiles = Array.from(countsByFile.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  const errors = [
    ...(current.total > baseline.total
      ? [`unsafe_cast_total_ratchet_exceeded:${current.total}>${baseline.total}`]
      : []),
    ...(current.productionSource > baseline.productionSource
      ? [`unsafe_cast_production_ratchet_exceeded:${current.productionSource}>${baseline.productionSource}`]
      : []),
    ...(current.testSource > baseline.testSource
      ? [`unsafe_cast_test_ratchet_exceeded:${current.testSource}>${baseline.testSource}`]
      : []),
    ...unsafeCastPatternKeys.flatMap((pattern) => [
      ...(current.byPattern[pattern] > baseline.byPattern[pattern]
        ? [`unsafe_cast_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.byPattern[pattern]}:baseline=${baseline.byPattern[pattern]}`]
        : []),
      ...(current.productionByPattern[pattern] > baseline.productionByPattern[pattern]
        ? [`unsafe_cast_production_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.productionByPattern[pattern]}:baseline=${baseline.productionByPattern[pattern]}`]
        : []),
      ...(current.testByPattern[pattern] > baseline.testByPattern[pattern]
        ? [`unsafe_cast_test_pattern_ratchet_exceeded:pattern=${pattern}:current=${current.testByPattern[pattern]}:baseline=${baseline.testByPattern[pattern]}`]
        : []),
    ]),
    ...current.criticalFolderByPattern.flatMap((entry) => {
      const folderBaseline = findCriticalFolderBaseline(baseline, entry.folder);
      return unsafeCastPatternKeys.flatMap((pattern) =>
        entry.byPattern[pattern] > folderBaseline[pattern]
          ? [
              `unsafe_cast_critical_folder_ratchet_exceeded:folder=${entry.folder}:pattern=${pattern}:current=${entry.byPattern[pattern]}:baseline=${folderBaseline[pattern]}`,
            ]
          : [],
      );
    }),
    ...criticalViolations.map(formatUnsafeCastCriticalFailure),
    ...validateUnsafeCastAllowlist(allowlist, params.findings),
  ];

  return {
    check: {
      name: "unsafe_cast_ratchet_contract",
      status: errors.length === 0 ? "pass" : "fail",
      errors,
    },
    summary: {
      baseline,
      current,
      allowlistedFindings: params.findings.filter((finding) => finding.allowlisted).length,
      allowlistEntries: allowlist.length,
      criticalFolderViolations: criticalViolations.length,
      topFiles,
    },
  };
}

export function scanComponentDebtSource(params: {
  file: string;
  source: string;
}): ComponentDebtEntry {
  return {
    file: normalizePath(params.file),
    lineCount: params.source.split(/\r?\n/).length,
    hookCount: Array.from(params.source.matchAll(/\buse[A-Z][A-Za-z0-9_]*\s*\(/g)).length,
  };
}

export function scanComponentDebt(projectRoot: string): ArchitectureAntiRegressionReport["componentDebt"] {
  const sourceRoot = path.join(projectRoot, "src");
  const entries = listSourceFiles(sourceRoot)
    .filter((filePath) => path.extname(filePath) === ".tsx")
    .filter((filePath) => !isTestPath(normalizePath(filePath)))
    .map((filePath) =>
      scanComponentDebtSource({
        file: relativeProjectPath(projectRoot, filePath),
        source: fs.readFileSync(filePath, "utf8"),
      }),
    );
  const topByLines = [...entries].sort((left, right) => right.lineCount - left.lineCount).slice(0, 12);
  const topByHooks = [...entries].sort((left, right) => right.hookCount - left.hookCount).slice(0, 12);

  return {
    reportOnly: true,
    godComponentLineThreshold: GOD_COMPONENT_LINE_THRESHOLD,
    hookPressureThreshold: HOOK_PRESSURE_THRESHOLD,
    godComponentCount: entries.filter((entry) => entry.lineCount >= GOD_COMPONENT_LINE_THRESHOLD).length,
    hookPressureComponentCount: entries.filter((entry) => entry.hookCount >= HOOK_PRESSURE_THRESHOLD).length,
    topByLines,
    topByHooks,
  };
}

export function runArchitectureAntiRegressionSuite(
  projectRoot = process.cwd(),
): ArchitectureAntiRegressionReport {
  const findings = scanDirectSupabaseBypasses(projectRoot);
  const directSupabase = evaluateDirectSupabaseGuardrail(findings);
  const directSupabaseExceptionContainment = evaluateDirectSupabaseExceptionGuardrail({
    findings,
    registry: loadDirectSupabaseExceptionRegistry({ projectRoot }),
  });
  const productionReadonlyCanary = evaluateProductionReadonlyCanaryGuardrail();
  const cacheRateScope = evaluateCacheRateScopeGuardrail({ projectRoot });
  const cacheColdMissProof = evaluateCacheColdMissProofGuardrail({ projectRoot });
  const rateLimitMarketplaceCanaryProof = evaluateRateLimitMarketplaceCanaryProofGuardrail({ projectRoot });
  const rateLimitMarketplace5PctCanaryProof = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({ projectRoot });
  const unboundedSelectRatchet = evaluateUnboundedSelectRatchetGuardrail({
    findings: scanUnboundedSelectRatchet(projectRoot),
  });
  const productionRawLoops = evaluateProductionRawLoopGuardrail({
    findings: scanProductionRawLoops(projectRoot),
  });
  const unsafeCastRatchet = evaluateUnsafeCastRatchetGuardrail({
    findings: scanUnsafeCastRatchetFindings(projectRoot),
  });
  const flatListTuningRegression = evaluateFlatListTuningRegressionGuardrail(
    scanFlatListTuningRegression(projectRoot),
  );
  const errorHandlingGapRatchet = evaluateErrorHandlingGapRatchet(
    scanErrorHandlingGapRatchet(projectRoot),
  );
  const aiModelBoundary = evaluateAiModelBoundaryGuardrail({ projectRoot });
  const aiRoleRiskApprovalControlPlane = evaluateAiRoleRiskApprovalControlPlaneGuardrail({ projectRoot });
  const aiAppKnowledgeRegistry = evaluateAiAppKnowledgeRegistryGuardrail({ projectRoot });
  const aiToolRegistryArchitecture = evaluateAiToolRegistryArchitectureGuardrail({ projectRoot });
  const aiToolReadBindingsArchitecture = evaluateAiToolReadBindingsArchitectureGuardrail({ projectRoot });
  const aiToolPlanPolicyArchitecture = evaluateAiToolPlanPolicyArchitectureGuardrail({ projectRoot });
  const agentBffRouteShellArchitecture = evaluateAgentBffRouteShellArchitectureGuardrail({ projectRoot });
  const aiCommandCenterTaskStreamRuntime = evaluateAiCommandCenterTaskStreamRuntimeGuardrail({ projectRoot });
  const aiAppActionGraphArchitecture = evaluateAiAppActionGraphArchitectureGuardrail({ projectRoot });
  const aiProcurementContextEngine = evaluateAiProcurementContextEngineGuardrail({ projectRoot });
  const aiExternalIntelGateway = evaluateAiExternalIntelGatewayGuardrail({ projectRoot });
  const aiProcurementCopilotRuntimeChain = evaluateAiProcurementCopilotRuntimeChainGuardrail({ projectRoot });
  const aiCrossScreenRuntimeMatrix = evaluateAiCrossScreenRuntimeMatrixGuardrail({ projectRoot });
  const aiPersistentActionLedger = evaluateAiPersistentActionLedgerGuardrail({ projectRoot });
  const aiKnowledgePreviewE2eContract = evaluateAiKnowledgePreviewE2eContractGuardrail({ projectRoot });
  const aiResponseSmokeNonBlockingContract = evaluateAiResponseSmokeNonBlockingContractGuardrail({ projectRoot });
  const aiRoleScreenEmulatorGate = evaluateAiRoleScreenEmulatorGateGuardrail({ projectRoot });
  const aiExplicitRoleSecretsE2eGate = evaluateAiExplicitRoleSecretsE2eGateGuardrail({ projectRoot });
  const androidEmulatorIosBuildSubmitGate = evaluateAndroidEmulatorIosBuildSubmitGateGuardrail({ projectRoot });
  const postInstallReleaseSignoffGate = evaluatePostInstallReleaseSignoffGateGuardrail({ projectRoot });
  const componentDebt = scanComponentDebt(projectRoot);
  const componentDebtCheck: ArchitectureGuardrailCheck = {
    name: "component_debt_report",
    status: "report_only",
    errors: [],
  };
  const checks = [
    directSupabase.check,
    directSupabaseExceptionContainment.check,
    productionReadonlyCanary.check,
    cacheRateScope.check,
    cacheColdMissProof.check,
    rateLimitMarketplaceCanaryProof.check,
    rateLimitMarketplace5PctCanaryProof.check,
    unboundedSelectRatchet.check,
    productionRawLoops.check,
    unsafeCastRatchet.check,
    flatListTuningRegression.check,
    errorHandlingGapRatchet.check,
    aiModelBoundary.check,
    aiRoleRiskApprovalControlPlane.check,
    aiAppKnowledgeRegistry.check,
    aiToolRegistryArchitecture.check,
    aiToolReadBindingsArchitecture.check,
    aiToolPlanPolicyArchitecture.check,
    agentBffRouteShellArchitecture.check,
    aiCommandCenterTaskStreamRuntime.check,
    aiAppActionGraphArchitecture.check,
    aiProcurementContextEngine.check,
    aiExternalIntelGateway.check,
    aiProcurementCopilotRuntimeChain.check,
    aiCrossScreenRuntimeMatrix.check,
    aiPersistentActionLedger.check,
    aiKnowledgePreviewE2eContract.check,
    aiResponseSmokeNonBlockingContract.check,
    aiRoleScreenEmulatorGate.check,
    aiExplicitRoleSecretsE2eGate.check,
    androidEmulatorIosBuildSubmitGate.check,
    postInstallReleaseSignoffGate.check,
    componentDebtCheck,
  ] as const;
  const failed = checks.some((check) => check.status === "fail");

  return {
    final_status: failed
      ? "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED"
      : "GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED",
    directSupabase: directSupabase.summary,
    directSupabaseExceptionContainment: directSupabaseExceptionContainment.summary,
    productionReadonlyCanary: productionReadonlyCanary.summary,
    cacheRateScope: cacheRateScope.summary,
    cacheColdMissProof: cacheColdMissProof.summary,
    rateLimitMarketplaceCanaryProof: rateLimitMarketplaceCanaryProof.summary,
    rateLimitMarketplace5PctCanaryProof: rateLimitMarketplace5PctCanaryProof.summary,
    unboundedSelectRatchet: unboundedSelectRatchet.summary,
    productionRawLoops: productionRawLoops.summary,
    unsafeCastRatchet: unsafeCastRatchet.summary,
    flatListTuningRegression: flatListTuningRegression.summary,
    errorHandlingGapRatchet: errorHandlingGapRatchet.summary,
    aiModelBoundary: aiModelBoundary.summary,
    aiRoleRiskApprovalControlPlane: aiRoleRiskApprovalControlPlane.summary,
    aiAppKnowledgeRegistry: aiAppKnowledgeRegistry.summary,
    aiToolRegistryArchitecture: aiToolRegistryArchitecture.summary,
    aiToolReadBindingsArchitecture: aiToolReadBindingsArchitecture.summary,
    aiToolPlanPolicyArchitecture: aiToolPlanPolicyArchitecture.summary,
    agentBffRouteShellArchitecture: agentBffRouteShellArchitecture.summary,
    aiCommandCenterTaskStreamRuntime: aiCommandCenterTaskStreamRuntime.summary,
    aiAppActionGraphArchitecture: aiAppActionGraphArchitecture.summary,
    aiProcurementContextEngine: aiProcurementContextEngine.summary,
    aiExternalIntelGateway: aiExternalIntelGateway.summary,
    aiProcurementCopilotRuntimeChain: aiProcurementCopilotRuntimeChain.summary,
    aiCrossScreenRuntimeMatrix: aiCrossScreenRuntimeMatrix.summary,
    aiPersistentActionLedger: aiPersistentActionLedger.summary,
    aiKnowledgePreviewE2eContract: aiKnowledgePreviewE2eContract.summary,
    aiResponseSmokeNonBlockingContract: aiResponseSmokeNonBlockingContract.summary,
    aiRoleScreenEmulatorGate: aiRoleScreenEmulatorGate.summary,
    aiExplicitRoleSecretsE2eGate: aiExplicitRoleSecretsE2eGate.summary,
    androidEmulatorIosBuildSubmitGate: androidEmulatorIosBuildSubmitGate.summary,
    postInstallReleaseSignoffGate: postInstallReleaseSignoffGate.summary,
    componentDebt,
    checks,
    safety: {
      productionCalls: false,
      dbWrites: false,
      migrations: false,
      supabaseProjectChanges: false,
      envChanges: false,
      secretsPrinted: false,
    },
  };
}

function printHumanReport(report: ArchitectureAntiRegressionReport): void {
  console.info(`final_status: ${report.final_status}`);
  for (const check of report.checks) {
    console.info(`${check.name}: ${check.status}`);
    for (const error of check.errors) {
      console.info(`- ${error}`);
    }
  }
  console.info(`direct_supabase_service_bypasses: ${report.directSupabase.serviceBypassFindings}`);
  console.info(
    `direct_supabase_exception_unclassified: ${report.directSupabaseExceptionContainment.unclassifiedCurrentFindings}`,
  );
  console.info(`cache_cold_miss_deterministic_proof: ${report.cacheColdMissProof.deterministicProofReady}`);
  console.info(`rate_limit_marketplace_canary_proof: ${report.rateLimitMarketplaceCanaryProof.routeScoped}`);
  console.info(`rate_limit_marketplace_5pct_canary_proof: ${report.rateLimitMarketplace5PctCanaryProof.routeScoped}`);
  console.info(`unbounded_select_ratchet_unresolved: ${report.unboundedSelectRatchet.unresolvedUnboundedSelects}`);
  console.info(`unbounded_select_ratchet_select_star: ${report.unboundedSelectRatchet.selectStarFindings}`);
  console.info(`production_raw_loop_unapproved: ${report.productionRawLoops.unapprovedFindings}`);
  console.info(`unsafe_cast_ratchet_total: ${report.unsafeCastRatchet.current.total}`);
  console.info(`flatlist_tuning_regression_violations: ${report.flatListTuningRegression.violations}`);
  console.info(`error_handling_gap_ratchet_silent_swallow: ${report.errorHandlingGapRatchet.silentSwallow}`);
  console.info(`ai_model_direct_gemini_imports: ${report.aiModelBoundary.directGeminiImportsOutsideLegacyProvider}`);
  console.info(`ai_control_plane_direct_submit_blocked: ${report.aiRoleRiskApprovalControlPlane.assistantActionsDirectSubmitBlocked}`);
  console.info(`ai_control_plane_screen_gateway_imports: ${report.aiRoleRiskApprovalControlPlane.screenGatewayImports}`);
  console.info(`ai_app_knowledge_registry_screens: ${report.aiAppKnowledgeRegistry.requiredScreenIdsRegistered}`);
  console.info(`ai_app_knowledge_registry_direct_high_risk_intent: ${report.aiAppKnowledgeRegistry.noDirectHighRiskIntent}`);
  console.info(`ai_tool_registry_required_tools: ${report.aiToolRegistryArchitecture.allRequiredToolsRegistered}`);
  console.info(`ai_tool_registry_no_live_execution: ${report.aiToolRegistryArchitecture.noLiveExecutionBoundary}`);
  console.info(`ai_tool_read_bindings_safe_read_bound: ${report.aiToolReadBindingsArchitecture.allSafeReadToolsBound}`);
  console.info(`ai_tool_read_bindings_no_live_execution: ${report.aiToolReadBindingsArchitecture.noLiveExecutionBoundary}`);
  console.info(`ai_tool_plan_policy_blocks_unknown: ${report.aiToolPlanPolicyArchitecture.blocksUnknownTools}`);
  console.info(`ai_tool_plan_policy_no_live_execution: ${report.aiToolPlanPolicyArchitecture.noLiveExecutionBoundary}`);
  console.info(`agent_bff_route_shell_auth_required: ${report.agentBffRouteShellArchitecture.authRequired}`);
  console.info(`agent_bff_route_shell_no_mutation: ${report.agentBffRouteShellArchitecture.mutationCountZero}`);
  console.info(`ai_command_center_task_stream_runtime: ${report.aiCommandCenterTaskStreamRuntime.commandCenterUsesRuntime}`);
  console.info(`ai_command_center_task_stream_no_fake_cards: ${report.aiCommandCenterTaskStreamRuntime.noFakeCards}`);
  console.info(`ai_app_action_graph_architecture: ${report.aiAppActionGraphArchitecture.majorScreensRegistered}`);
  console.info(`ai_app_action_graph_external_live_fetch: ${report.aiAppActionGraphArchitecture.externalLiveFetchDisabled}`);
  console.info(`ai_procurement_context_engine: ${report.aiProcurementContextEngine.procurementFilesPresent}`);
  console.info(`ai_procurement_context_no_final_mutation: ${report.aiProcurementContextEngine.submitForApprovalNoFinalExecution}`);
  console.info(`ai_external_intel_gateway: ${report.aiExternalIntelGateway.gatewayFilesPresent}`);
  console.info(`ai_external_intel_gateway_disabled_default: ${report.aiExternalIntelGateway.disabledProviderDefault}`);
  console.info(`ai_procurement_copilot_runtime_chain: ${report.aiProcurementCopilotRuntimeChain.copilotFilesPresent}`);
  console.info(`ai_procurement_copilot_no_mutation: ${report.aiProcurementCopilotRuntimeChain.noMutationSurface}`);
  console.info(`ai_cross_screen_runtime_matrix: ${report.aiCrossScreenRuntimeMatrix.majorScreensRegistered}`);
  console.info(`ai_cross_screen_runtime_no_mutation: ${report.aiCrossScreenRuntimeMatrix.noMutationSurface}`);
  console.info(`ai_persistent_action_ledger: ${report.aiPersistentActionLedger.ledgerFilesPresent}`);
  console.info(`ai_persistent_action_ledger_pending: ${report.aiPersistentActionLedger.submitForApprovalPersistsPending}`);
  console.info(`ai_persistent_action_ledger_no_fake_local: ${report.aiPersistentActionLedger.noFakeLocalApproval}`);
  console.info(`ai_role_screen_emulator_gate_artifact: ${report.aiRoleScreenEmulatorGate.emulatorArtifactPresent}`);
  console.info(`ai_role_screen_emulator_gate_fake_pass: ${report.aiRoleScreenEmulatorGate.fakePassClaimedFalse}`);
  console.info(`ai_explicit_role_secrets_e2e_gate_auth_source: ${report.aiExplicitRoleSecretsE2eGate.roleAuthSourceExplicit}`);
  console.info(`ai_explicit_role_secrets_e2e_gate_no_discovery: ${report.aiExplicitRoleSecretsE2eGate.noAuthDiscoveryGreenPath}`);
  console.info(`android_emulator_ios_build_submit_gate_runner: ${report.androidEmulatorIosBuildSubmitGate.releaseRunnerPresent}`);
  console.info(`android_emulator_ios_build_submit_gate_ios_submit_profile: ${report.androidEmulatorIosBuildSubmitGate.iosSubmitProfileUsed}`);
  console.info(`post_install_release_signoff_gate_android: ${report.postInstallReleaseSignoffGate.androidRuntimeSmokeProven}`);
  console.info(`post_install_release_signoff_gate_ios: ${report.postInstallReleaseSignoffGate.iosSubmitStatusProven}`);
  console.info(`component_god_count_report_only: ${report.componentDebt.godComponentCount}`);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write-direct-supabase-exception-registry")) {
    const findings = scanDirectSupabaseBypasses(process.cwd());
    const registry = buildDirectSupabaseExceptionRegistry({
      findings,
      generatedAtLocal: new Date().toISOString(),
    });
    const registryPath = path.join(process.cwd(), DIRECT_SUPABASE_EXCEPTION_REGISTRY_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  }
  const report = runArchitectureAntiRegressionSuite(process.cwd());
  if (args.has("--json")) {
    console.info(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
  if (report.final_status === "BLOCKED_ARCHITECTURE_ANTI_REGRESSION_FAILED") {
    process.exit(1);
  }
}

const invokedAsCli = /(?:^|\/)architecture_anti_regression_suite\.[tj]s$/.test(
  normalizePath(process.argv[1] ?? ""),
);

if (invokedAsCli) {
  main();
}
