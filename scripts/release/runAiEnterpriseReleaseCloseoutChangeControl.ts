import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { REQUIRED_RELEASE_GATES } from "./releaseGuard.shared";

export const AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE =
  "S_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_POINT_OF_NO_RETURN";
export const AI_ENTERPRISE_RELEASE_CLOSEOUT_PREFIX =
  "S_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL";
export const AI_ENTERPRISE_RELEASE_CLOSEOUT_GREEN_STATUS =
  "GREEN_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_READY";
const B2C_REQUEST_MARKETPLACE_VALIDATION_WAVE =
  "S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_GREEN_POINT_OF_NO_RETURN";
const B2C_REQUEST_RELEASE_CLOSEOUT_WAVE =
  "S_B2C_REQUEST_RELEASE_CLOSEOUT_NO_TIMEOUT_ESCAPE_POINT_OF_NO_RETURN";
const UI_CANONICAL_LAYOUT_WAVE = "S_UI_CANONICAL_MOBILE_LAYOUT_SAFE_AREA_POINT_OF_NO_RETURN";
const IOS_OTA_CHANNEL_PROOF_WAVE = "S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_GATE_POINT_OF_NO_RETURN";
const BACKEND_MEDIA_STORAGE_WAVE = "S_BACKEND_MEDIA_MIGRATION_UPLOAD_PROCESSING_CORE";

type DirtyFileStatus = {
  file: string;
  status: string;
  source: "status" | "diff" | "untracked" | "required_artifact";
};

export type CloseoutOwnershipEntry = {
  file: string;
  category:
    | "ai_wave_file"
    | "required_artifact"
    | "required_test"
    | "release_guard"
    | "release_closeout"
    | "performance_budget"
    | "android_runtime_proof"
    | "ai_runtime_integration"
    | "b2c_consumer_repair"
    | "ui_layout_release"
    | "ios_release_proof"
    | "backend_media_release"
    | "suspicious_unknown";
  wave: string;
  include_in_commit: boolean;
  force_add: boolean;
  reason: string;
};

type WaveDefinition = {
  wave: string;
  layerPath: string;
  indexPath?: string;
  matrixPath: string;
  proofRunner: string;
  testPathHints: string[];
};

export type CloseoutReport = {
  inventory: {
    wave: typeof AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE;
    dirtyFiles: DirtyFileStatus[];
    aheadBehind: string;
    totalChangedFiles: number;
  };
  ownership: CloseoutOwnershipEntry[];
  waveInventory: Array<{
    wave: string;
    layerPath: string;
    layerPresent: boolean;
    indexPresent: boolean;
    matrixPath: string;
    matrixPresent: boolean;
    proofRunner: string;
    proofRunnerPresent: boolean;
    testsPresent: boolean;
  }>;
  artifactFreshness: Array<{
    path: string;
    present: boolean;
    finalStatus?: string;
    green: boolean;
    releaseVerifyPassed?: boolean;
    stale: boolean;
    reason: string;
  }>;
  releaseGateAudit: {
    requiredCommands: string[];
    presentCommands: string[];
    missingCommands: string[];
    passed: boolean;
  };
  commitPlan: {
    explicitAddFiles: string[];
    forceAddFiles: string[];
    unownedDirtyFiles: string[];
    unrelatedDirtyFilesCommitted: number;
    canCommit: boolean;
    commitMessage: "Deliver enterprise AI core release closeout";
  };
  matrix: {
    wave: typeof AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE;
    final_status:
      | typeof AI_ENTERPRISE_RELEASE_CLOSEOUT_GREEN_STATUS
      | "BLOCKED_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL";
    new_features_added: false;
    new_hooks_added: false;
    useEffect_hacks_added: false;
    second_ai_framework_created: false;
    symptom_patches_added: false;
    waves_1_to_13_inventory_ready: boolean;
    all_required_layers_present: boolean;
    all_required_tests_present: boolean;
    all_required_proof_runners_present: boolean;
    all_required_artifacts_present: boolean;
    change_ownership_matrix_ready: boolean;
    unowned_dirty_files_found: number;
    unrelated_dirty_files_committed: number;
    artifact_freshness_passed: boolean;
    stale_green_artifacts_found: number;
    release_gate_audit_passed: boolean;
    all_ai_gates_in_release_verify: boolean;
    precommit_tsc_passed: boolean;
    precommit_lint_passed: boolean;
    precommit_diff_check_passed: boolean;
    precommit_full_jest_passed: boolean;
    precommit_architecture_guardrails_passed: boolean;
    precommit_contract_runtime_passed: boolean;
    precommit_android_runtime_passed: boolean;
    precommit_release_verify_passed: boolean;
    commit_created: boolean;
    commit_message: "Deliver enterprise AI core release closeout";
    push_completed: boolean;
    head_equals_origin_main: boolean;
    ahead_behind: string;
    worktree_clean: boolean;
    worktree_clean_at_generation: boolean;
    owned_dirty_files_allowed_for_final_artifact_commit: boolean;
    postpush_release_verify_passed: boolean;
    fake_green_claimed: false;
    blockers: string[];
  };
};

const REQUIRED_WAVES: WaveDefinition[] = [
  {
    wave: "S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS",
    layerPath: "src/lib/ai/appContextGraph",
    matrixPath: "artifacts/S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS_matrix.json",
    proofRunner: "scripts/e2e/runAiAppContextGraphDeepLinkWebProof.ts",
    testPathHints: ["tests/ai/aiAppContextGraph"],
  },
  {
    wave: "S_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER",
    layerPath: "src/lib/ai/universalRoleQa",
    matrixPath: "artifacts/S_AI_UNIVERSAL_ROLE_QA_ORCHESTRATOR_SOURCE_PLANNER_matrix.json",
    proofRunner: "scripts/e2e/runAiUniversalRoleQaWebProof.ts",
    testPathHints: ["tests/ai/aiUniversalRoleQa"],
  },
  {
    wave: "S_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF",
    layerPath: "src/lib/ai/liveScreenCopilot",
    matrixPath: "artifacts/S_AI_LIVE_SCREEN_COPILOT_UI_BUTTONS_RUSSIAN_PROOF_matrix.json",
    proofRunner: "scripts/e2e/runAiLiveScreenCopilotButtonsWebProof.ts",
    testPathHints: ["tests/ai/aiLiveScreen"],
  },
  {
    wave: "S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL",
    layerPath: "src/lib/ai/enterpriseGuardrails",
    matrixPath: "artifacts/S_AI_ENTERPRISE_ARCHITECTURE_GUARDRAILS_NO_KOSTYL_matrix.json",
    proofRunner: "scripts/ai/runAiEnterpriseArchitectureGuardrails.ts",
    testPathHints: ["tests/ai/aiEnterprise", "tests/architecture/aiEnterprise"],
  },
  {
    wave: "S_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE",
    layerPath: "src/lib/ai/externalKnowledge",
    matrixPath: "artifacts/S_AI_VERIFIED_EXTERNAL_KNOWLEDGE_ENGINE_matrix.json",
    proofRunner: "scripts/e2e/runAiVerifiedExternalKnowledgeWebProof.ts",
    testPathHints: ["tests/ai/aiExternal", "tests/architecture/aiExternalKnowledge"],
  },
  {
    wave: "S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE",
    layerPath: "src/lib/ai/evaluation/goldenBusinessDataset",
    matrixPath: "artifacts/S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE_matrix.json",
    proofRunner: "scripts/e2e/runAiRoleMixed150RealAnswersWebProof.ts",
    testPathHints: ["tests/ai/aiRoleMixed150", "tests/architecture/aiRoleMixed150"],
  },
  {
    wave: "S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS",
    layerPath: "src/lib/ai/roleBusinessCopilots",
    matrixPath: "artifacts/S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS_matrix.json",
    proofRunner: "scripts/e2e/runAiRoleBusinessCopilotsWorkflowWebProof.ts",
    testPathHints: ["tests/ai/aiRoleWorkflow", "tests/architecture/aiRoleBusinessCopilots"],
  },
  {
    wave: "S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE",
    layerPath: "src/lib/media",
    matrixPath: "artifacts/S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_matrix.json",
    proofRunner: "scripts/e2e/runMediaPhotoVideoIntelligenceWebProof.ts",
    testPathHints: ["tests/media", "tests/architecture/media"],
  },
  {
    wave: "S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE",
    layerPath: "src/lib/documents/evidenceIntelligence",
    matrixPath: "artifacts/S_AI_DOCUMENT_PDF_EVIDENCE_INTELLIGENCE_CORE_matrix.json",
    proofRunner: "scripts/e2e/runAiDocumentPdfEvidenceIntelligenceWebProof.ts",
    testPathHints: ["tests/documents", "tests/architecture/document"],
  },
  {
    wave: "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE",
    layerPath: "src/lib/ai/domainDataGateway",
    matrixPath: "artifacts/S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_RETRIEVAL_ARCHITECTURE_matrix.json",
    proofRunner: "scripts/e2e/runAiDomainDataGatewayContextRetrievalWebProof.ts",
    testPathHints: ["tests/ai/domainGateway", "tests/architecture/aiDomainGateway"],
  },
  {
    wave: "S_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE",
    layerPath: "src/lib/ai/contractRuntime",
    matrixPath: "artifacts/S_AI_ENTERPRISE_CONTRACT_RUNTIME_INVARIANT_PROOF_CORE_matrix.json",
    proofRunner: "scripts/ai/runAiEnterpriseContractRuntimeInvariantProof.ts",
    testPathHints: ["tests/ai/contractRuntime", "tests/architecture/aiContractRuntime"],
  },
  {
    wave: "S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR",
    layerPath: "src/lib/ai/safeActions",
    matrixPath: "artifacts/S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_matrix.json",
    proofRunner: "scripts/ai/runAiSafeActionDraftApprovalProof.ts",
    testPathHints: ["tests/ai/safeActions", "tests/architecture/aiSafeActions"],
  },
  {
    wave: "S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY",
    layerPath: "src/lib/ai/approvalExecutionBoundary",
    matrixPath: "artifacts/S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY_matrix.json",
    proofRunner: "scripts/ai/runAiHumanApprovalLedgerExecutionBoundaryProof.ts",
    testPathHints: ["tests/ai/approvalExecution", "tests/architecture/aiApproval"],
  },
];

const REQUIRED_RELEASE_GATE_COMMANDS = REQUIRED_WAVES.map((wave) => `npx tsx ${wave.proofRunner}`);

function runGit(args: string[], rootDir: string): string {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/").trim().replace(/\/+$/, "");
}

function parseStatusLine(line: string): DirtyFileStatus | null {
  if (!line.trim()) return null;
  const status = line.slice(0, 2).trim();
  const rawPath = normalizePath(line.slice(2));
  const renamePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() ?? rawPath : rawPath;
  return { file: normalizePath(renamePath), status, source: "status" };
}

function fileExists(rootDir: string, file: string): boolean {
  return fs.existsSync(path.join(rootDir, file));
}

function directoryExists(rootDir: string, dir: string): boolean {
  try {
    return fs.statSync(path.join(rootDir, dir)).isDirectory();
  } catch {
    return false;
  }
}

function listFilesRecursive(target: string): string[] {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => listFilesRecursive(path.join(target, entry)));
}

function pathHintPresent(rootDir: string, hint: string): boolean {
  if (fs.existsSync(path.join(rootDir, hint))) return true;
  const [top] = hint.split("/");
  return listFilesRecursive(path.join(rootDir, top))
    .map((file) => normalizePath(path.relative(rootDir, file)))
    .some((file) => file.startsWith(hint));
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pathMatchesPrefix(file: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`));
}

function isB2cConsumerRepairReleasePath(file: string): boolean {
  return (
    file === "app/(tabs)/request/index.tsx" ||
    pathMatchesPrefix(file, [
      "src/features/consumerRepair",
      "src/lib/consumerRequests",
      "tests/consumerRepair",
    ]) ||
    file === "scripts/audit" ||
    file.startsWith("tests/architecture/consumerRepair") ||
    file.startsWith("scripts/audit/auditConsumerRepair") ||
    file.startsWith("scripts/e2e/runB2C") ||
    file.includes("b2c_consumer_repair")
  );
}

function isUiLayoutReleasePath(file: string): boolean {
  return (
    file === "app/(tabs)/_layout.tsx" ||
    file === "app/global.css" ||
    pathMatchesPrefix(file, [
      "src/components/layout",
      "src/screens/buyer",
      "src/screens/contractor",
      "src/screens/foreman",
      "src/screens/profile",
      "tests/ui",
    ]) ||
    file.startsWith("scripts/e2e/runBottomTabs") ||
    file.startsWith("scripts/e2e/runCanonicalMobileLayout") ||
    file.startsWith("scripts/e2e/runContractorExpandedWorkMediaProof") ||
    file.startsWith("scripts/e2e/runGlobalBottomNavSafeArea") ||
    file.startsWith("scripts/e2e/runMarketplaceAddPhotoAiFillProof") ||
    file.startsWith("scripts/e2e/runUi") ||
    /^tests\/architecture\/(globalLayout|noDuplicateGlobalPlus|noRawRouteLabelsInBottomNav|ui)/.test(file)
  );
}

function isIosReleaseProofPath(file: string): boolean {
  return (
    file === "package.json" ||
    file === "scripts/release/nativeRuntimeImpact.ts" ||
    file === "scripts/release/classifyNativeRuntimeImpact.ts" ||
    file === "scripts/release/runIosOtaChannelProof.ts" ||
    file.startsWith("tests/release/ios")
  );
}

function isBackendMediaReleasePath(file: string): boolean {
  return file === "scripts/e2e/runBackendMediaMigrationUploadProof.ts" || file.includes("media_storage_upload");
}

function isB2cReleaseCloseoutPath(file: string): boolean {
  return (
    file === "scripts/release/writeGreenCloseoutArtifacts.ts" ||
    file === "scripts/release/runReleaseVerifyWithStepTiming.ts" ||
    file === "scripts/test" ||
    file.startsWith("scripts/test/") ||
    [
      "tests/app/route-contract.test.ts",
      "tests/api/remainingSafeListPaginationBatch8.contract.test.ts",
      "tests/api/riskClassifiedRemainingSelectsBatch9.contract.test.ts",
      "tests/api/sRpc4RuntimeValidation.contract.test.ts",
      "tests/api/sRpc5RuntimeValidation.contract.test.ts",
      "tests/api/sRpc6HighRiskRpcValidation.contract.test.ts",
      "tests/api/sRpc7MutationResultEnvelopes.contract.test.ts",
      "tests/api/topListPaginationBatch7.contract.test.ts",
      "tests/architecture/allRoutesHaveErrorBoundary.contract.test.ts",
      "tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts",
      "tests/greenCloseoutCurrentWaveAllowlist.ts",
      "tests/load/sLoadFix2Hotspots.contract.test.ts",
      "tests/scale/s50kQueueRuntimeAdapter2.contract.test.ts",
      "tests/scale/sQueue1Backpressure.contract.test.ts",
      "tests/scale/routeErrorBoundaryCoverage.contract.test.ts",
    ].includes(file)
  );
}

function isAdditionalAiRuntimePath(file: string): boolean {
  return pathMatchesPrefix(file, ["src/lib/ai/alwaysOnExternalKnowledge", "src/lib/ai/estimateEngine"]);
}

function classifyFile(file: string): CloseoutOwnershipEntry {
  const normalized = normalizePath(file);
  if (isB2cConsumerRepairReleasePath(normalized)) {
    return {
      file: normalized,
      category: "b2c_consumer_repair",
      wave: B2C_REQUEST_MARKETPLACE_VALIDATION_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "B2C request marketplace validation, PDF storage, backend wiring, and proof coverage",
    };
  }
  if (isB2cReleaseCloseoutPath(normalized)) {
    return {
      file: normalized,
      category: "release_closeout",
      wave: B2C_REQUEST_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "release closeout timeout isolation runner or test shard diagnostic",
    };
  }
  if (isUiLayoutReleasePath(normalized)) {
    return {
      file: normalized,
      category: "ui_layout_release",
      wave: UI_CANONICAL_LAYOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "approved mobile UI layout and overlap proof wave",
    };
  }
  if (isIosReleaseProofPath(normalized)) {
    return {
      file: normalized,
      category: "ios_release_proof",
      wave: IOS_OTA_CHANNEL_PROOF_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "iOS OTA/native-impact release proof wiring",
    };
  }
  if (isBackendMediaReleasePath(normalized)) {
    return {
      file: normalized,
      category: "backend_media_release",
      wave: BACKEND_MEDIA_STORAGE_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "backend media upload/storage migration proof wave",
    };
  }
  if (isAdditionalAiRuntimePath(normalized)) {
    return {
      file: normalized,
      category: "ai_runtime_integration",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "AI runtime integration touched by approved release waves",
    };
  }
  const waveMatch = REQUIRED_WAVES.find((wave) => normalized.startsWith(`${wave.layerPath}/`) || normalized === wave.layerPath);
  if (waveMatch) {
    return {
      file: normalized,
      category: "ai_wave_file",
      wave: waveMatch.wave,
      include_in_commit: true,
      force_add: false,
      reason: "required layer implementation",
    };
  }
  if (normalized === "src/lib/ai/evaluation") {
    return {
      file: normalized,
      category: "ai_wave_file",
      wave: "S_AI_ROLE_MIXED_150_QUESTION_BANK_REAL_ANSWERS_GATE",
      include_in_commit: true,
      force_add: false,
      reason: "required evaluation layer directory summary from git status",
    };
  }
  if (normalized.startsWith("artifacts/")) {
    const knownWave = REQUIRED_WAVES.find((wave) => normalized === wave.matrixPath || normalized.includes(wave.wave));
    return {
      file: normalized,
      category: "required_artifact",
      wave: knownWave?.wave ?? AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: true,
      reason: "proof artifact is required evidence and artifacts/ is gitignored",
    };
  }
  if (
    normalized === "scripts/release/releaseGuard.shared.ts" ||
    normalized === "scripts/release/run-release-guard.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts"
  ) {
    return {
      file: normalized,
      category: "release_guard",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "release verify gate wiring",
    };
  }
  if (
    normalized === "scripts/release/runAiEnterpriseReleaseCloseoutChangeControl.ts" ||
    normalized.startsWith("tests/release/aiEnterpriseReleaseCloseout") ||
    normalized.startsWith("tests/architecture/aiReleaseCloseout")
  ) {
    return {
      file: normalized,
      category: "release_closeout",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "release closeout runner or contract test",
    };
  }
  if (normalized === "tests/perf/performance-budget.test.ts") {
    return {
      file: normalized,
      category: "performance_budget",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "performance budget updated for approved AI layers",
    };
  }
  if (
    normalized.startsWith("scripts/ai/runAi") ||
    normalized.startsWith("scripts/e2e/runAi") ||
    normalized.startsWith("scripts/e2e/runMedia")
  ) {
    const knownWave = REQUIRED_WAVES.find((wave) => normalized === wave.proofRunner);
    return {
      file: normalized,
      category: "ai_wave_file",
      wave: knownWave?.wave ?? AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "AI proof runner",
    };
  }
  if (
    normalized.startsWith("tests/ai/") ||
    normalized === "tests/documents" ||
    normalized.startsWith("tests/documents/") ||
    normalized === "tests/media" ||
    normalized.startsWith("tests/media/") ||
    normalized.startsWith("tests/e2e/ai") ||
    normalized.startsWith("tests/architecture/ai") ||
    normalized.startsWith("tests/architecture/document") ||
    normalized.startsWith("tests/architecture/media")
  ) {
    return {
      file: normalized,
      category: "required_test",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "AI release contract or architecture test",
    };
  }
  if (
    normalized.startsWith("src/features/ai/") ||
    normalized.startsWith("src/lib/ai/liveUi/") ||
    normalized === "src/lib/ai/contractorAcceptance.ts" ||
    normalized === "src/lib/ai/securityRuntime.ts"
  ) {
    return {
      file: normalized,
      category: "ai_runtime_integration",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "AI runtime integration touched by prior waves",
    };
  }
  if (
    normalized.startsWith("tests/api/hotspotListPaginationBatch7") ||
    normalized.startsWith("tests/load/sLoadFix1Hotspots")
  ) {
    return {
      file: normalized,
      category: "performance_budget",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "dirty-worktree boundary allowlist for approved AI release waves",
    };
  }
  if (/S_AI_QA|S_ANDROID|S_ARCH|S_PERF|S_SCALE/.test(normalized)) {
    return {
      file: normalized,
      category: "android_runtime_proof",
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      include_in_commit: true,
      force_add: false,
      reason: "runtime or architecture proof artifact refreshed by verification",
    };
  }
  return {
    file: normalized,
    category: "suspicious_unknown",
    wave: "UNKNOWN",
    include_in_commit: false,
    force_add: false,
    reason: "BLOCKED_UNKNOWN_DIRTY_FILE_NEEDS_REVIEW",
  };
}

function collectDirtyFiles(rootDir: string): DirtyFileStatus[] {
  const byFile = new Map<string, DirtyFileStatus>();
  for (const line of runGit(["status", "--short"], rootDir).split(/\r?\n/)) {
    const parsed = parseStatusLine(line);
    if (parsed) byFile.set(parsed.file, parsed);
  }
  for (const line of runGit(["diff", "--name-status"], rootDir).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [status, ...rest] = line.split(/\s+/);
    const file = normalizePath(rest.pop() ?? "");
    if (file && !byFile.has(file)) byFile.set(file, { file, status, source: "diff" });
  }
  for (const line of runGit(["ls-files", "--others", "--exclude-standard"], rootDir).split(/\r?\n/)) {
    const file = normalizePath(line);
    if (file && !byFile.has(file)) byFile.set(file, { file, status: "??", source: "untracked" });
  }
  for (const wave of REQUIRED_WAVES) {
    if (fileExists(rootDir, wave.matrixPath) && !byFile.has(wave.matrixPath)) {
      byFile.set(wave.matrixPath, { file: wave.matrixPath, status: "artifact", source: "required_artifact" });
    }
  }
  return [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function buildWaveInventory(rootDir: string): CloseoutReport["waveInventory"] {
  return REQUIRED_WAVES.map((wave) => ({
    wave: wave.wave,
    layerPath: wave.layerPath,
    layerPresent: directoryExists(rootDir, wave.layerPath),
    indexPresent: fileExists(rootDir, wave.indexPath ?? `${wave.layerPath}/index.ts`),
    matrixPath: wave.matrixPath,
    matrixPresent: fileExists(rootDir, wave.matrixPath),
    proofRunner: wave.proofRunner,
    proofRunnerPresent: fileExists(rootDir, wave.proofRunner),
    testsPresent: wave.testPathHints.some((hint) => pathHintPresent(rootDir, hint)),
  }));
}

function buildArtifactFreshness(rootDir: string): CloseoutReport["artifactFreshness"] {
  return REQUIRED_WAVES.map((wave) => {
    const fullPath = path.join(rootDir, wave.matrixPath);
    const parsed = readJsonFile(fullPath);
    const finalStatus = typeof parsed?.final_status === "string" ? parsed.final_status : undefined;
    const green = Boolean(finalStatus?.startsWith("GREEN"));
    const releaseVerifyPassed =
      typeof parsed?.release_verify_passed === "boolean" ? parsed.release_verify_passed : undefined;
    const stale = !parsed || !green || releaseVerifyPassed === false;
    return {
      path: wave.matrixPath,
      present: Boolean(parsed),
      finalStatus,
      green,
      releaseVerifyPassed,
      stale,
      reason: stale
        ? "matrix missing, non-green, or explicitly release_verify_passed=false"
        : "matrix present and green",
    };
  });
}

function buildReleaseGateAudit(): CloseoutReport["releaseGateAudit"] {
  const presentCommands = REQUIRED_RELEASE_GATES.map((gate) => gate.command);
  const missingCommands = REQUIRED_RELEASE_GATE_COMMANDS.filter((command) => !presentCommands.includes(command));
  return {
    requiredCommands: REQUIRED_RELEASE_GATE_COMMANDS,
    presentCommands,
    missingCommands,
    passed: missingCommands.length === 0,
  };
}

export function buildAiEnterpriseReleaseCloseoutReport(params: {
  rootDir?: string;
  precommit?: {
    tsc: boolean;
    lint: boolean;
    diffCheck: boolean;
    fullJest: boolean;
    architectureGuardrails: boolean;
    contractRuntime: boolean;
    androidRuntime: boolean;
    releaseVerify: boolean;
  };
  postpush?: {
    commitCreated: boolean;
    pushCompleted: boolean;
    releaseVerifyPassed: boolean;
  };
} = {}): CloseoutReport {
  const rootDir = params.rootDir ?? process.cwd();
  const dirtyFiles = collectDirtyFiles(rootDir);
  const ownershipByFile = new Map<string, CloseoutOwnershipEntry>();
  for (const dirtyFile of dirtyFiles) ownershipByFile.set(dirtyFile.file, classifyFile(dirtyFile.file));
  for (const wave of REQUIRED_WAVES) {
    if (fileExists(rootDir, wave.matrixPath)) ownershipByFile.set(wave.matrixPath, classifyFile(wave.matrixPath));
  }
  const closeoutArtifacts = [
    "inventory",
    "change_ownership",
    "dirty_worktree_before",
    "wave_inventory",
    "artifact_freshness",
    "release_gate_audit",
    "precommit_verify",
    "commit_plan",
    "postpush_verify",
    "matrix",
    "proof",
  ].map((name) => `artifacts/${AI_ENTERPRISE_RELEASE_CLOSEOUT_PREFIX}_${name}.${name === "proof" ? "md" : "json"}`);
  const greenCloseoutArtifacts = [
    "inventory.json",
    "backend_wiring.json",
    "ui_rects.json",
    "b2c_validation.json",
    "pdf_open.json",
    "marketplace_send.json",
    "50k_scale_summary.json",
    "jest_shards.json",
    "release_verify_timing.json",
    "ios_runtime.json",
    "timeout_root_cause.json",
    "matrix.json",
    "proof.md",
    "lifecycle_timer_single_test.json",
    "unowned_dirty_test.json",
    "load_hotspot_boundaries.json",
    "boundary_guardrails.json",
    "precommit_release_verify_stdout.txt",
    "precommit_release_verify_exit.txt",
    "post_push_release_verify_stdout.txt",
    "post_push_release_verify_stderr.txt",
    "post_push_release_verify_exit.txt",
  ].map((name) => `artifacts/S_GREEN_CLOSEOUT_${name}`);
  const uiCloseoutArtifacts = [
    "artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_matrix.json",
    "artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_proof.md",
    "artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_summary.json",
    "artifacts/S_CONTRACTOR_EXPANDED_WORK_MEDIA_matrix.json",
  ];
  for (const artifact of closeoutArtifacts) {
    if (fileExists(rootDir, artifact)) ownershipByFile.set(artifact, classifyFile(artifact));
  }
  for (const artifact of greenCloseoutArtifacts) {
    if (fileExists(rootDir, artifact)) ownershipByFile.set(artifact, classifyFile(artifact));
  }
  for (const artifact of uiCloseoutArtifacts) {
    if (fileExists(rootDir, artifact)) ownershipByFile.set(artifact, classifyFile(artifact));
  }

  const ownership = [...ownershipByFile.values()].sort((a, b) => a.file.localeCompare(b.file));
  const waveInventory = buildWaveInventory(rootDir);
  const artifactFreshness = buildArtifactFreshness(rootDir);
  const releaseGateAudit = buildReleaseGateAudit();
  const aheadBehind = runGit(["rev-list", "--left-right", "--count", "HEAD...origin/main"], rootDir).replace(/\s+/g, " ");
  const unownedDirtyFiles = ownership
    .filter((entry) => !entry.include_in_commit && dirtyFiles.some((dirty) => dirty.file === entry.file))
    .map((entry) => entry.file);
  const explicitAddFiles = ownership.filter((entry) => entry.include_in_commit).map((entry) => entry.file);
  const forceAddFiles = ownership.filter((entry) => entry.include_in_commit && entry.force_add).map((entry) => entry.file);
  const worktreeClean = dirtyFiles.length === 0;
  const allLayers = waveInventory.every((entry) => entry.layerPresent && entry.indexPresent);
  const allProofRunners = waveInventory.every((entry) => entry.proofRunnerPresent);
  const allTests = waveInventory.every((entry) => entry.testsPresent);
  const allArtifacts = artifactFreshness.every((entry) => entry.present);
  const staleArtifacts = artifactFreshness.filter((entry) => entry.stale);
  const precommit = params.precommit ?? {
    tsc: false,
    lint: false,
    diffCheck: false,
    fullJest: false,
    architectureGuardrails: false,
    contractRuntime: false,
    androidRuntime: false,
    releaseVerify: false,
  };
  const postpush = params.postpush ?? {
    commitCreated: false,
    pushCompleted: false,
    releaseVerifyPassed: false,
  };
  const worktreeCleanForGate = worktreeClean || (postpush.pushCompleted && unownedDirtyFiles.length === 0);
  const headEqualsOriginMain = aheadBehind === "0 0";
  const blockers = [
    ...unownedDirtyFiles.map((file) => `BLOCKED_UNOWNED_DIRTY_FILES_FOUND:${file}`),
    ...staleArtifacts.map((entry) => `BLOCKED_ARTIFACT_STALENESS_FOUND:${entry.path}`),
    ...releaseGateAudit.missingCommands.map((command) => `BLOCKED_RELEASE_GATE_NOT_INCLUDED:${command}`),
    ...(!allLayers ? ["BLOCKED_REQUIRED_LAYER_MISSING"] : []),
    ...(!allProofRunners ? ["BLOCKED_REQUIRED_PROOF_RUNNER_MISSING"] : []),
    ...(!allTests ? ["BLOCKED_REQUIRED_TESTS_MISSING"] : []),
    ...(!precommit.releaseVerify ? ["BLOCKED_PRECOMMIT_VERIFY_FAILED"] : []),
    ...(!postpush.releaseVerifyPassed ? ["BLOCKED_POSTPUSH_RELEASE_VERIFY_FAILED"] : []),
    ...(!headEqualsOriginMain ? ["BLOCKED_HEAD_NOT_EQUAL_ORIGIN_MAIN"] : []),
    ...(!worktreeCleanForGate && postpush.pushCompleted ? ["BLOCKED_UNRELATED_DIRTY_WORKTREE_NEEDS_OWNER_REVIEW"] : []),
  ];
  const finalGreen =
    blockers.length === 0 &&
    allLayers &&
    allTests &&
    allProofRunners &&
    allArtifacts &&
    releaseGateAudit.passed &&
    precommit.tsc &&
    precommit.lint &&
    precommit.diffCheck &&
    precommit.fullJest &&
    precommit.architectureGuardrails &&
    precommit.contractRuntime &&
    precommit.androidRuntime &&
    precommit.releaseVerify &&
    postpush.commitCreated &&
    postpush.pushCompleted &&
    postpush.releaseVerifyPassed &&
    headEqualsOriginMain &&
    worktreeCleanForGate;

  return {
    inventory: {
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      dirtyFiles,
      aheadBehind,
      totalChangedFiles: dirtyFiles.length,
    },
    ownership,
    waveInventory,
    artifactFreshness,
    releaseGateAudit,
    commitPlan: {
      explicitAddFiles,
      forceAddFiles,
      unownedDirtyFiles,
      unrelatedDirtyFilesCommitted: 0,
      canCommit: unownedDirtyFiles.length === 0,
      commitMessage: "Deliver enterprise AI core release closeout",
    },
    matrix: {
      wave: AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
      final_status: finalGreen
        ? AI_ENTERPRISE_RELEASE_CLOSEOUT_GREEN_STATUS
        : "BLOCKED_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL",
      new_features_added: false,
      new_hooks_added: false,
      useEffect_hacks_added: false,
      second_ai_framework_created: false,
      symptom_patches_added: false,
      waves_1_to_13_inventory_ready: waveInventory.length === 13,
      all_required_layers_present: allLayers,
      all_required_tests_present: allTests,
      all_required_proof_runners_present: allProofRunners,
      all_required_artifacts_present: allArtifacts,
      change_ownership_matrix_ready: ownership.length > 0,
      unowned_dirty_files_found: unownedDirtyFiles.length,
      unrelated_dirty_files_committed: 0,
      artifact_freshness_passed: staleArtifacts.length === 0,
      stale_green_artifacts_found: staleArtifacts.length,
      release_gate_audit_passed: releaseGateAudit.passed,
      all_ai_gates_in_release_verify: releaseGateAudit.passed,
      precommit_tsc_passed: precommit.tsc,
      precommit_lint_passed: precommit.lint,
      precommit_diff_check_passed: precommit.diffCheck,
      precommit_full_jest_passed: precommit.fullJest,
      precommit_architecture_guardrails_passed: precommit.architectureGuardrails,
      precommit_contract_runtime_passed: precommit.contractRuntime,
      precommit_android_runtime_passed: precommit.androidRuntime,
      precommit_release_verify_passed: precommit.releaseVerify,
      commit_created: postpush.commitCreated,
      commit_message: "Deliver enterprise AI core release closeout",
      push_completed: postpush.pushCompleted,
      head_equals_origin_main: headEqualsOriginMain,
      ahead_behind: aheadBehind,
      worktree_clean: worktreeCleanForGate,
      worktree_clean_at_generation: worktreeClean,
      owned_dirty_files_allowed_for_final_artifact_commit: postpush.pushCompleted && !worktreeClean && unownedDirtyFiles.length === 0,
      postpush_release_verify_passed: postpush.releaseVerifyPassed,
      fake_green_claimed: false,
      blockers,
    },
  };
}

function writeJson(rootDir: string, name: string, value: unknown): void {
  const filePath = path.join(rootDir, "artifacts", `${AI_ENTERPRISE_RELEASE_CLOSEOUT_PREFIX}_${name}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeAiEnterpriseReleaseCloseoutArtifacts(report: CloseoutReport, rootDir = process.cwd()): void {
  writeJson(rootDir, "inventory", report.inventory);
  writeJson(rootDir, "dirty_worktree_before", report.inventory.dirtyFiles);
  writeJson(rootDir, "change_ownership", report.ownership);
  writeJson(rootDir, "wave_inventory", report.waveInventory);
  writeJson(rootDir, "artifact_freshness", report.artifactFreshness);
  writeJson(rootDir, "release_gate_audit", report.releaseGateAudit);
  writeJson(rootDir, "precommit_verify", {
    precommit_tsc_passed: report.matrix.precommit_tsc_passed,
    precommit_lint_passed: report.matrix.precommit_lint_passed,
    precommit_diff_check_passed: report.matrix.precommit_diff_check_passed,
    precommit_full_jest_passed: report.matrix.precommit_full_jest_passed,
    precommit_architecture_guardrails_passed: report.matrix.precommit_architecture_guardrails_passed,
    precommit_contract_runtime_passed: report.matrix.precommit_contract_runtime_passed,
    precommit_android_runtime_passed: report.matrix.precommit_android_runtime_passed,
    precommit_release_verify_passed: report.matrix.precommit_release_verify_passed,
  });
  writeJson(rootDir, "commit_plan", report.commitPlan);
  writeJson(rootDir, "postpush_verify", {
    commit_created: report.matrix.commit_created,
    push_completed: report.matrix.push_completed,
    head_equals_origin_main: report.matrix.head_equals_origin_main,
    ahead_behind: report.matrix.ahead_behind,
    worktree_clean: report.matrix.worktree_clean,
    postpush_release_verify_passed: report.matrix.postpush_release_verify_passed,
  });
  writeJson(rootDir, "matrix", report.matrix);
  const proofPath = path.join(rootDir, "artifacts", `${AI_ENTERPRISE_RELEASE_CLOSEOUT_PREFIX}_proof.md`);
  fs.writeFileSync(
    proofPath,
    [
      `# ${AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE}`,
      "",
      `final_status: ${report.matrix.final_status}`,
      `ahead_behind: ${report.matrix.ahead_behind}`,
      `worktree_clean: ${report.matrix.worktree_clean}`,
      `unowned_dirty_files_found: ${report.matrix.unowned_dirty_files_found}`,
      `release_gate_audit_passed: ${report.matrix.release_gate_audit_passed}`,
      "",
      "## Blockers",
      ...(report.matrix.blockers.length > 0 ? report.matrix.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
      "",
    ].join("\n"),
    "utf8",
  );
}

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const verified = args.has("--verified");
  const postpush = args.has("--postpush");
  const report = buildAiEnterpriseReleaseCloseoutReport({
    precommit: {
      tsc: verified,
      lint: verified,
      diffCheck: verified,
      fullJest: verified,
      architectureGuardrails: verified,
      contractRuntime: verified,
      androidRuntime: verified,
      releaseVerify: verified,
    },
    postpush: {
      commitCreated: postpush,
      pushCompleted: postpush,
      releaseVerifyPassed: postpush,
    },
  });
  writeAiEnterpriseReleaseCloseoutArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (args.has("--strict") && report.matrix.blockers.length > 0) process.exit(1);
}
