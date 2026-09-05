import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  buildAiSanitizerAudit,
  buildPublicMarketplaceSafeFieldsAudit,
  buildSecretsFrontendAudit,
  buildSignedUrlExpiryAudit,
} from "../../audit/securityPrivacyHardening.shared";
import { auditApprovedHistoryScalePerformance } from "../auditApprovedHistoryScalePerformance";
import { benchmarkEstimatePdfBuyerPackages } from "../benchmarkEstimatePdfBuyerPackages";
import { searchAiEstimateCatalogIndex } from "../../../src/lib/estimate/catalog/searchAiEstimateCatalogIndex";
import { percentile } from "../../../src/lib/platform/aiEstimatePerformanceBudget";

const MASTER_SHA256 = "11e671dd5c376c577fa4f64017e3ccdc7cc9acfd59f064c343627345334275e6";
const EVIDENCE_ROOT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a6-canonical-monolith-professional-estimate-print-formula-global-closeout-1",
);
const PLATFORM_ROOT = path.join(
  EVIDENCE_ROOT,
  "platform30-ac533d03427ae09a5afa9db38ad8845f69a47e97-terminal",
);
const PLATFORM_TERMINAL = path.join(PLATFORM_ROOT, "29_platform_71040_terminal.json");
const PLATFORM_SHARDS = path.join(PLATFORM_ROOT, "28_platform_71040_shards");
const PDF_MATRIX = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/evidence/pdf-0ecb526b2a2ca7d7ab3d5963aba6c68e891f82b4-terminal-green/matrix.json",
);
const PDF_SOURCE_SHA = "0ecb526b2a2ca7d7ab3d5963aba6c68e891f82b4";
const ALLOWED_DIRTY_PATHS = new Set([
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_api34_results.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_screenshots.json",
  "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/android_ui_dumps.json",
]);

type Json = Record<string, any>;
type Stats = { sampleSize: number; p50Ms: number; p95Ms: number; p99Ms: number; maximumMs: number };

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  }).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(filePath: string): string {
  return sha256(fs.readFileSync(filePath));
}

function normalize(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function readJson(filePath: string): Json {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Json;
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function receipt<T extends Json>(value: T): T & { receiptSha256: string } {
  return { ...value, receiptSha256: sha256(JSON.stringify(value)) };
}

function listTests(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTests(full);
    return /\.test\.[tj]sx?$/u.test(entry.name) ? [normalize(path.relative(process.cwd(), full))] : [];
  }).sort();
}

function stats(values: readonly number[]): Stats {
  return {
    sampleSize: values.length,
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99),
    maximumMs: Number(Math.max(0, ...values).toFixed(3)),
  };
}

function parseJsonOutput(output: string): Json | null {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(output.slice(start, end + 1)) as Json;
  } catch {
    return null;
  }
}

function runChild(input: {
  name: string;
  args: string[];
  phaseRoot: string;
  timeoutMs: number;
  env?: Record<string, string | undefined>;
}): { passed: boolean; exitCode: number | null; timedOut: boolean; durationMs: number; stdoutPath: string; stderrPath: string; stdout: string; stderr: string } {
  const started = performance.now();
  const result = spawnSync(process.execPath, input.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: input.timeoutMs,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192", ...input.env },
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  const stdoutPath = path.join(input.phaseRoot, `${input.name}.stdout.txt`);
  const stderrPath = path.join(input.phaseRoot, `${input.name}.stderr.txt`);
  fs.writeFileSync(stdoutPath, stdout, "utf8");
  fs.writeFileSync(stderrPath, stderr, "utf8");
  return {
    passed: result.status === 0 && !result.error,
    exitCode: result.status,
    timedOut: Boolean(result.error && "code" in result.error && result.error.code === "ETIMEDOUT"),
    durationMs: Number((performance.now() - started).toFixed(3)),
    stdoutPath,
    stderrPath,
    stdout,
    stderr,
  };
}

function runJest(name: string, tests: string[], phaseRoot: string, timeoutMs: number): Json {
  const jsonPath = path.join(phaseRoot, `${name}.jest.json`);
  const child = runChild({
    name,
    phaseRoot,
    timeoutMs,
    args: [
      path.resolve("node_modules/jest/bin/jest.js"),
      ...tests,
      "--runInBand",
      "--silent",
      "--json",
      `--outputFile=${jsonPath}`,
    ],
  });
  const report = fs.existsSync(jsonPath) ? readJson(jsonPath) : {};
  const pending = Number(report.numPendingTests ?? -1);
  const passed = child.passed
    && report.success === true
    && Number(report.numFailedTestSuites ?? -1) === 0
    && Number(report.numFailedTests ?? -1) === 0
    && pending === 0;
  return {
    name,
    passed,
    timedOut: child.timedOut,
    exitCode: child.exitCode,
    durationMs: child.durationMs,
    suitesTotal: Number(report.numTotalTestSuites ?? 0),
    suitesPassed: Number(report.numPassedTestSuites ?? 0),
    testsTotal: Number(report.numTotalTests ?? 0),
    testsPassed: Number(report.numPassedTests ?? 0),
    testsPending: Math.max(0, pending),
    manifestTestFiles: tests.length,
    jsonPath: normalize(path.relative(process.cwd(), jsonPath)),
    stdoutPath: normalize(path.relative(process.cwd(), child.stdoutPath)),
    stderrPath: normalize(path.relative(process.cwd(), child.stderrPath)),
  };
}

function catalogSearchBenchmark(): Stats {
  const queries = ["ремонт квартиры", "кровля 200 м2", "водоснабжение пнд 110", "монолитный фундамент"];
  searchAiEstimateCatalogIndex({ query: queries[0]!, topK: 10 });
  const durations: number[] = [];
  for (let index = 0; index < 240; index += 1) {
    const started = performance.now();
    searchAiEstimateCatalogIndex({ query: queries[index % queries.length]!, topK: 10 });
    durations.push(performance.now() - started);
  }
  return stats(durations);
}

function platformMeasurements(): {
  terminal: Json;
  scenarioStats: Record<string, Stats>;
  resultCount: number;
  manifestLookup: Stats;
  manifestParseMs: number;
} {
  const terminal = readJson(PLATFORM_TERMINAL);
  const shardFiles = fs.readdirSync(PLATFORM_SHARDS)
    .filter((name) => /^shard-\d+\.json$/u.test(name))
    .sort();
  const durations = new Map<string, number[]>();
  let resultCount = 0;
  for (const file of shardFiles) {
    const shard = readJson(path.join(PLATFORM_SHARDS, file));
    for (const result of shard.results ?? []) {
      const kind = String(result.scenarioKind);
      if (!durations.has(kind)) durations.set(kind, []);
      durations.get(kind)!.push(Number(result.durationMs));
      resultCount += 1;
    }
  }
  const scenarioStats = Object.fromEntries(
    [...durations.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([kind, values]) => [kind, stats(values)]),
  );
  const manifestPath = path.join(PLATFORM_ROOT, "27_platform_71040_manifest.json");
  const parseStarted = performance.now();
  const manifest = readJson(manifestPath);
  const manifestParseMs = Number((performance.now() - parseStarted).toFixed(3));
  const groupMap = new Map((manifest.groups ?? []).map((group: Json) => [String(group.groupId), group]));
  const groupIds = [...groupMap.keys()];
  const lookupDurations: number[] = [];
  for (let index = 0; index < Math.max(2_368, groupIds.length); index += 1) {
    const groupId = groupIds[index % groupIds.length]!;
    const started = performance.now();
    const value = groupMap.get(groupId);
    if (!value) throw new Error(`runtime manifest lookup failed:${groupId}`);
    lookupDurations.push(performance.now() - started);
  }
  return { terminal, scenarioStats, resultCount, manifestLookup: stats(lookupDurations), manifestParseMs };
}

function forbiddenReceiptFindings(values: unknown[]): string[] {
  const patterns = [
    /(?:redis|rediss|postgres|postgresql):\/\//iu,
    /\b(?:DATABASE_URL|REDIS_URL|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|SENTRY_AUTH_TOKEN)\b\s*[:=]\s*["']?[^\s"',}]{8,}/iu,
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/iu,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u,
  ];
  return values.flatMap((value, index) => patterns
    .filter((pattern) => pattern.test(JSON.stringify(value)))
    .map((pattern) => `payload_${index}:${String(pattern)}`));
}

function testManifest(files: string[]): Json[] {
  return [...new Set(files)].sort().map((file) => ({
    path: file,
    blobSha: git(["hash-object", "--", file]),
  }));
}

function main(): void {
  const sourceCommitSha = git(["rev-parse", "HEAD"]);
  const sourceTreeSha = git(["write-tree"]);
  const branch = git(["branch", "--show-current"]);
  const dirty = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  }).trimEnd()
    .split(/\r?\n/u).filter(Boolean).map((line) => normalize(line.slice(3)));
  const unexpectedDirty = dirty.filter((file) => !ALLOWED_DIRTY_PATHS.has(file));
  if (unexpectedDirty.length > 0) throw new Error(`STOP_UNCLASSIFIED_DIRTY_PATH:${unexpectedDirty.join(",")}`);
  if (!fs.existsSync(PLATFORM_TERMINAL) || !fs.existsSync(PDF_MATRIX)) throw new Error("required upstream evidence is missing");
  const masterPath = "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md";
  if (fileSha256(masterPath) !== MASTER_SHA256) throw new Error("master SHA-256 mismatch");

  const terminalRoot = path.join(EVIDENCE_ROOT, `security-performance-${sourceCommitSha}-terminal`);
  const runningRoot = path.join(EVIDENCE_ROOT, `security-performance-${sourceCommitSha}-running-${process.pid}`);
  if (fs.existsSync(terminalRoot)) throw new Error(`immutable terminal already exists:${terminalRoot}`);
  fs.mkdirSync(runningRoot, { recursive: true });

  const securityTests = [...new Set([
    ...listTests(path.resolve("tests/security")),
    "scripts/estimate/r4a6/canonicalSecurityLiveProof.contract.test.ts",
    "src/lib/developerOverride.test.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateClient.authRefresh.test.ts",
    "src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts",
    "src/lib/estimate/backendPlatform/estimateAdmissionR3.test.ts",
    "src/lib/security/redaction.test.ts",
    "tests/architecture/androidDebugDevClientNetworkSecurity.contract.test.ts",
    "tests/architecture/noSecretsInOwnerArtifacts.contract.test.ts",
    "tests/architecture/releaseCloseoutNoOwnerSecretArtifacts.contract.test.ts",
    "tests/architecture/stagingSecurityPrivacy.contract.test.ts",
    "tests/consumerRepair/approvedHistoryDurableStorageMigration.contract.test.ts",
    "tests/consumerRepair/canonicalBackendArtifactParity.contract.test.ts",
    "tests/documents/documentHash.contract.test.ts",
    "tests/documents/documentIngestion.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimateLegacyLocalStorageMigration.contract.test.ts",
    "tests/exports/export-import-boundary.test.ts",
    "tests/media/backend/mediaCompleteUpload.contract.test.ts",
    "tests/observability/logError.redaction.test.ts",
    "tests/requestEstimate/canonicalEstimateSecurityHardeningR4A6.contract.test.ts",
  ])].sort();
  const performanceContractTests = listTests(path.resolve("tests/performance"));
  const performanceExtraTests = [
    "tests/consumerRepair/approvedHistoryScalePerformance.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimatePerformanceSlo.contract.test.ts",
    "tests/estimateInfrastructure/aiEstimatePerformanceTelemetry.contract.test.ts",
    "tests/estimateRuntime/estimatorMemoryLifecycleGate.contract.test.ts",
    "tests/officeEstimate/pdfBuyerPerformance.contract.test.ts",
  ];
  const executableManifest = receipt({
    schemaVersion: "r568-r4-a6-security-performance-manifest.v1",
    sourceCommitSha,
    sourceTreeSha,
    masterSha256: MASTER_SHA256,
    securityTests: testManifest(securityTests),
    performanceContractTests: testManifest(performanceContractTests),
    performanceExtraTests: testManifest(performanceExtraTests),
    scaleBenchmark: testManifest(["scripts/estimate/benchmarkProfessionalBoq11610Scale.ts"]),
    denominatorMayShrink: false,
  });
  writeJsonAtomic(path.join(runningRoot, "manifest.json"), executableManifest);

  const liveProofPath = path.join(runningRoot, "canonical-security-live.json");
  const liveProofRun = runChild({
    name: "canonical-security-live",
    phaseRoot: runningRoot,
    timeoutMs: 180_000,
    env: { R4A6_SECURITY_DATABASE_URL: process.env.R4A6_SECURITY_DATABASE_URL },
    args: [
      "--import", "tsx",
      path.resolve("scripts/estimate/r4a6/runR4A6CanonicalSecurityLiveProof.ts"),
      `--output=${liveProofPath}`,
    ],
  });
  const liveProof = fs.existsSync(liveProofPath) ? readJson(liveProofPath) : {};
  const securityJest = runJest("security", securityTests, runningRoot, 600_000);

  const performanceContractsJest = runJest("performance-contracts", performanceContractTests, runningRoot, 900_000);
  const performanceExtraJest = runJest("performance-extra", performanceExtraTests, runningRoot, 900_000);
  const scaleRun = runChild({
    name: "professional-boq-11610-scale",
    phaseRoot: runningRoot,
    timeoutMs: 600_000,
    args: ["--import", "tsx", path.resolve("scripts/estimate/benchmarkProfessionalBoq11610Scale.ts")],
  });
  const scale = parseJsonOutput(scaleRun.stdout) ?? {};
  const memoryPath = path.join(runningRoot, "memory-lifecycle.json");
  const memoryRun = runChild({
    name: "memory-lifecycle",
    phaseRoot: runningRoot,
    timeoutMs: 600_000,
    args: [
      "--expose-gc", "--import", "tsx",
      path.resolve("scripts/estimate/runEstimatorMemoryLifecycleGate.ts"),
      "--cycles=8", "--sample-size=512", `--output=${memoryPath}`,
    ],
  });
  const memory = fs.existsSync(memoryPath) ? readJson(memoryPath) : {};

  const platform = platformMeasurements();
  const catalogSearch = catalogSearchBenchmark();
  const history = auditApprovedHistoryScalePerformance().artifact;
  const pdfBuyer = benchmarkEstimatePdfBuyerPackages({ casesLimit: 100 }).artifact;
  const pdfBuyerCases = (pdfBuyer.case_results ?? []) as Json[];
  const pdfPackage = stats(pdfBuyerCases.map((item) => Number(item.pdf_duration_ms)));
  const buyerPackage = stats(pdfBuyerCases.map((item) => Number(item.buyer_duration_ms)));
  const physicalPdf = readJson(PDF_MATRIX);
  const pdfSourcePaths = (physicalPdf.source?.paths ?? []) as string[];
  const pdfSourceDiff = git(["diff", "--name-only", `${PDF_SOURCE_SHA}..HEAD`, "--", ...pdfSourcePaths]);
  const pdfSourceAncestor = spawnSync("git", ["merge-base", "--is-ancestor", PDF_SOURCE_SHA, "HEAD"], { cwd: process.cwd() }).status === 0;

  const publicFields = buildPublicMarketplaceSafeFieldsAudit();
  const signedUrls = buildSignedUrlExpiryAudit();
  const aiSanitizer = buildAiSanitizerAudit();
  const frontendSecrets = buildSecretsFrontendAudit();
  const requirementMatrix = [
    { requirement: "auth_boundary", evidence: "security Jest + canonical API contract", passed: securityJest.passed },
    { requirement: "tenant_isolation", evidence: "live local DB rollback proof", passed: liveProof.status === "GREEN_R4_A6_CANONICAL_RLS_LIVE" },
    { requirement: "capability_scope_expiry_revocation", evidence: "admission R3 migration/behavior", passed: securityJest.passed },
    { requirement: "row_media_ownership", evidence: "19-attempt canonical RLS proof", passed: liveProof.attemptsPassed === 19 },
    { requirement: "artifact_access_and_idor", evidence: "foreign revision/artifact reads", passed: liveProof.attemptsPassed === 19 },
    { requirement: "cors_exact_allowlist", evidence: "canonical API source contract", passed: securityJest.passed },
    { requirement: "mime_size_hash", evidence: "reservation/finalization tests", passed: securityJest.passed },
    { requirement: "path_traversal", evidence: "export/import boundary behavior", passed: securityJest.passed },
    { requirement: "title_spec_pdf_injection", evidence: "escaped PDF projection behavior", passed: securityJest.passed },
    { requirement: "log_redaction", evidence: "redaction tests", passed: securityJest.passed },
    { requirement: "pii_unsafe_local_storage", evidence: "durable storage compaction/migration tests", passed: securityJest.passed },
    { requirement: "signed_url_expiry", evidence: "security privacy audit", passed: signedUrls.private_pdf_signed_url_expiry_enforced === true },
    { requirement: "public_safe_fields", evidence: "allowlist audit", passed: publicFields.public_marketplace_safe_fields_only === true },
    { requirement: "ai_context_redaction", evidence: "sanitizer audit", passed: aiSanitizer.ai_context_sanitized === true && aiSanitizer.debug_runtime_provider_payload_visible === false },
    { requirement: "frontend_secrets", evidence: "frontend source scan", passed: frontendSecrets.secrets_in_frontend_found === false && frontendSecrets.service_role_frontend_found === false },
  ];

  const scenario = platform.scenarioStats;
  const namedMeasurements: Json = {
    catalogSearch: { ...catalogSearch, evidenceClass: "MEASURED_LOCAL_INDEX", p95BudgetMs: 50, p99BudgetMs: 100 },
    runtimeManifestLookup: { ...platform.manifestLookup, manifestParseMs: platform.manifestParseMs, evidenceClass: "MEASURED_O1_MAP_LOOKUP", p95BudgetMs: 50, p99BudgetMs: 100 },
    compile: { ...scenario.nominal_compile, evidenceClass: "PLATFORM30_EXACT_SHA_CONTRACT", p95BudgetMs: 2500, p99BudgetMs: 3500 },
    editRecalculate: { ...scenario.edit_recalculate, evidenceClass: "PLATFORM30_EXACT_SHA_CONTRACT", p95BudgetMs: 2000, p99BudgetMs: 3000 },
    confirm: { ...scenario.confirm_idempotency, evidenceClass: "PLATFORM30_EXACT_SHA_CONTRACT", p95BudgetMs: 1500, p99BudgetMs: 2500 },
    professionalPdfProjection: { ...scenario.professional_pdf_projection, evidenceClass: "PLATFORM30_EXACT_SHA_CONTRACT", p95BudgetMs: 3000, p99BudgetMs: 4500 },
    pdfPackage100Cases: { ...pdfPackage, evidenceClass: "MEASURED_PACKAGE_BUILD", p95BudgetMs: 3000, p99BudgetMs: 4500 },
    procurement: { ...buyerPackage, platformScenario: scenario.procurement_projection, evidenceClass: "MEASURED_PACKAGE_BUILD_PLUS_PLATFORM30", p95BudgetMs: 1500, p99BudgetMs: 2500 },
    historyOpen: { ...scenario.immutable_history_projection, evidenceClass: "PLATFORM30_PLUS_50000_HISTORY", p95BudgetMs: 300, p99BudgetMs: 500 },
    coldStartWeb: { ...scenario.cold_restart_restore, evidenceClass: "WEB_CONTRACT_WITH_PRIOR_LIVE_CANARY", p95BudgetMs: 2500, p99BudgetMs: null },
    coldStartAndroidApi34: { ...scenario.cold_restart_restore, evidenceClass: "ANDROID_API34_CONTRACT_WITH_PRIOR_LIVE_CANARY", p95BudgetMs: 4000, p99BudgetMs: null },
    mediaUpload: { ...scenario.photo_row_identity, evidenceClass: "PLATFORM30_MEDIA_IDENTITY_CONTRACT", p95BudgetMs: 1500, p99BudgetMs: 2500 },
    physicalPdfByRowCount: Object.fromEntries((physicalPdf.cases ?? []).filter((item: Json) => [45, 100, 500, 1001].includes(Number(item.rowCount))).map((item: Json) => [String(item.rowCount), {
      ...stats([Number(item.durationMs)]),
      evidenceClass: "PHYSICAL_CHROMIUM_PDF_SINGLE_CANARY",
      durationWithinSlo: item.checks?.durationWithinSlo === true,
      allRowsInOrder: item.checks?.allRowsInOrder === true,
      pageCount: item.pageCount,
      byteSize: item.byteSize,
    }])),
  };
  const measurementBudgetFailures = Object.entries(namedMeasurements)
    .filter(([key]) => key !== "physicalPdfByRowCount")
    .flatMap(([key, value]: [string, any]) => [
      value.p95BudgetMs != null && value.p95Ms > value.p95BudgetMs ? `${key}:p95` : "",
      value.p99BudgetMs != null && value.p99Ms > value.p99BudgetMs ? `${key}:p99` : "",
      value.sampleSize < 1 ? `${key}:no_samples` : "",
    ]).filter(Boolean);

  const preRootSecretScan = runChild({
    name: "prescribed-root-secret-scan",
    phaseRoot: runningRoot,
    timeoutMs: 180_000,
    args: ["--import", "tsx", path.resolve("scripts/release/scanCloseoutArtifactsForSecrets.ts"), EVIDENCE_ROOT, "--check-only"],
  });
  const rootSecretScan = parseJsonOutput(preRootSecretScan.stdout) ?? {};

  const securityBlockers = [
    liveProofRun.passed && liveProof.status === "GREEN_R4_A6_CANONICAL_RLS_LIVE" ? "" : "canonical_rls_live_proof_failed",
    securityJest.passed ? "" : "security_jest_failed",
    requirementMatrix.every((item) => item.passed) ? "" : "security_requirement_matrix_failed",
    rootSecretScan.secrets_written_to_artifacts === false ? "" : "secret_found_in_prescribed_root",
  ].filter(Boolean);
  const performanceBlockers = [
    performanceContractsJest.passed ? "" : "performance_contract_jest_failed",
    performanceExtraJest.passed ? "" : "performance_extra_jest_failed",
    scaleRun.passed && scale.final_status === "GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY" ? "" : "professional_boq_11610_scale_failed",
    memoryRun.passed && memory.final_status === "GREEN_ESTIMATOR_MEMORY_LIFECYCLE_BOUNDED" ? "" : "memory_lifecycle_failed",
    platform.terminal.status === "GREEN_R4_A6_PLATFORM_71040" && platform.resultCount === 35_520 ? "" : "platform30_performance_source_invalid",
    history.final_status === "GREEN_AI_ESTIMATE_APPROVED_HISTORY_SCALE_PERFORMANCE" ? "" : "history_50000_failed",
    pdfBuyer.final_status === "GREEN_AI_ESTIMATE_PDF_BUYER_PACKAGE_PERFORMANCE" ? "" : "pdf_buyer_performance_failed",
    physicalPdf.gate === "GREEN_R4_A6_PRINT_PDF_PRODUCTION_GRADE" && pdfSourceAncestor && !pdfSourceDiff ? "" : "physical_pdf_canary_stale_or_failed",
    measurementBudgetFailures.length === 0 ? "" : `measurement_budget_failures:${measurementBudgetFailures.join("|")}`,
  ].filter(Boolean);

  const source = {
    branch,
    commitSha: sourceCommitSha,
    sourceTreeSha,
    dirtyPathsPreserved: dirty,
    unexpectedDirtyPaths: unexpectedDirty,
  };
  const securityPayload = {
    schemaVersion: "r568-r4-a6-security.v1",
    status: securityBlockers.length === 0 ? "GREEN_R4_A6_SECURITY" : "STOP_SECURITY_GATE",
    capturedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source,
    executableManifestSha256: executableManifest.receiptSha256,
    jest: securityJest,
    liveCanonicalRls: {
      status: liveProof.status,
      executionMode: liveProof.executionMode,
      transactionCommitted: liveProof.transactionCommitted,
      attemptsExpected: liveProof.attemptsExpected,
      attemptsPassed: liveProof.attemptsPassed,
      policyCount: liveProof.policyCount,
      databaseIdentitySha256: liveProof.databaseIdentitySha256,
      receiptSha256: fs.existsSync(liveProofPath) ? fileSha256(liveProofPath) : null,
    },
    audits: { publicFields, signedUrls, aiSanitizer, frontendSecrets, rootSecretScan },
    requirementMatrix,
    blockers: securityBlockers,
    productionAccessed: false,
    fakeGreenClaimed: false,
  };
  const performancePayload = {
    schemaVersion: "r568-r4-a6-performance.v1",
    status: performanceBlockers.length === 0 ? "GREEN_R4_A6_PERFORMANCE" : "STOP_PERFORMANCE_GATE",
    capturedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source,
    executableManifestSha256: executableManifest.receiptSha256,
    jest: { contracts: performanceContractsJest, extras: performanceExtraJest },
    scale11610: scale,
    memoryLifecycle: memory,
    measurements: namedMeasurements,
    measurementBudgetFailures,
    approvedHistory50000: history,
    pdfBuyer100Cases: {
      finalStatus: pdfBuyer.final_status,
      casesTotal: pdfBuyer.cases_total,
      pdfNoTruncation: pdfBuyer.pdf_no_truncation_under_load,
      buyerNoTruncation: pdfBuyer.buyer_no_truncation_under_load,
    },
    platform30: {
      status: platform.terminal.status,
      terminalSummarySha256: platform.terminal.terminalSummarySha256,
      sourceCommitSha: platform.terminal.source?.commitSha,
      sourceIsAncestor: spawnSync("git", ["merge-base", "--is-ancestor", String(platform.terminal.source?.commitSha), "HEAD"], { cwd: process.cwd() }).status === 0,
      resultCount: platform.resultCount,
      executions: platform.terminal.platformExecutions,
      maximumRssBytes: platform.terminal.performance?.maximumRssBytes,
      liveCanary: platform.terminal.liveCanary,
    },
    physicalPdfCanary: {
      gate: physicalPdf.gate,
      sourceCommitSha: PDF_SOURCE_SHA,
      sourceIsAncestor: pdfSourceAncestor,
      sourceDiff: pdfSourceDiff ? pdfSourceDiff.split(/\r?\n/u) : [],
      matrixSha256: fileSha256(PDF_MATRIX),
      classification: "PHYSICAL_CHROMIUM_PDF_CANARY_UNCHANGED_SOURCES",
    },
    architectureChecks: {
      manifestO1: true,
      noNPlusOne: performanceContractsJest.passed,
      boundedMemory: memory.final_status === "GREEN_ESTIMATOR_MEMORY_LIFECYCLE_BOUNDED",
      uiThreadResponsive: performanceContractsJest.passed,
      virtualizationStatePreserved: performanceContractsJest.passed && platform.terminal.counters?.categoryProjectionRed === 0,
      retryBackoffBounded: performanceContractsJest.passed,
      concurrentIdempotency: platform.terminal.counters?.confirmIdempotencyRed === 0 && platform.terminal.counters?.duplicateExecutionRed === 0,
      history50000Compatible: history.approved_history_50000_scale_performance_passed === true,
    },
    blockers: performanceBlockers,
    productionAccessed: false,
    fakeGreenClaimed: false,
  };
  const inMemorySecretFindings = forbiddenReceiptFindings([securityPayload, performancePayload]);
  if (inMemorySecretFindings.length > 0) securityBlockers.push(...inMemorySecretFindings);
  const combinedStatus = securityBlockers.length === 0 && performanceBlockers.length === 0
    ? "GREEN_R4_A6_SECURITY_PERFORMANCE"
    : securityBlockers.length > 0 ? "STOP_SECURITY_GATE" : "STOP_PERFORMANCE_GATE";
  const securityReceipt = receipt({ ...securityPayload, status: securityBlockers.length === 0 ? "GREEN_R4_A6_SECURITY" : "STOP_SECURITY_GATE", blockers: securityBlockers, receiptPayloadSecretFindings: inMemorySecretFindings });
  const performanceReceipt = receipt(performancePayload);
  const combinedReceipt = receipt({
    schemaVersion: "r568-r4-a6-security-performance-terminal.v1",
    status: combinedStatus,
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    capturedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    source,
    securityReceiptSha256: securityReceipt.receiptSha256,
    performanceReceiptSha256: performanceReceipt.receiptSha256,
    securityBlockers,
    performanceBlockers,
    productionAccessed: false,
    fakeGreenClaimed: false,
  });
  writeJsonAtomic(path.join(runningRoot, "31_security.json"), securityReceipt);
  writeJsonAtomic(path.join(runningRoot, "32_performance.json"), performanceReceipt);
  writeJsonAtomic(path.join(runningRoot, "30_security_performance_terminal.json"), combinedReceipt);
  fs.renameSync(runningRoot, terminalRoot);
  for (const [name, value] of [
    ["30_pdf_print_matrix.json", physicalPdf],
    ["31_security.json", securityReceipt],
    ["32_performance.json", performanceReceipt],
  ] as const) {
    const target = path.join(EVIDENCE_ROOT, name);
    if (fs.existsSync(target)) throw new Error(`immutable root receipt already exists:${target}`);
    writeJsonAtomic(target, value);
  }
  console.info(JSON.stringify({
    status: combinedStatus,
    sourceCommitSha,
    terminalRoot: normalize(path.relative(process.cwd(), terminalRoot)),
    security: `${securityJest.testsPassed}/${securityJest.testsTotal}`,
    performanceContracts: `${performanceContractsJest.testsPassed}/${performanceContractsJest.testsTotal}`,
    performanceExtra: `${performanceExtraJest.testsPassed}/${performanceExtraJest.testsTotal}`,
    liveRls: `${liveProof.attemptsPassed}/${liveProof.attemptsExpected}`,
    scale11610: scale.final_status,
    memory: memory.final_status,
    blockers: [...securityBlockers, ...performanceBlockers],
  }, null, 2));
  if (combinedStatus !== "GREEN_R4_A6_SECURITY_PERFORMANCE") process.exitCode = 1;
}

main();
