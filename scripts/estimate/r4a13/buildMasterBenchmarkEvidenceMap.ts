import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  assertMasterBenchmarkFixtureMapping,
  MASTER_BENCHMARK_FIXTURE_MAPPING,
} from "./masterBenchmarkEvidence.shared";
import {
  assertMasterScopeInventory,
  parseMasterCriteria,
  parseMasterTechnologyBenchmarks,
} from "./masterScopeInventory.shared";

type HistoricalSummaryFile = Readonly<{ path: string; sha256: string }>;
type HistoricalSummaryCase = Readonly<{
  fixtureId: string;
  templateId: string;
  revisionId: string;
  rowCount: number;
  materialCount: number;
}>;
type HistoricalSummary = Readonly<{
  schema: string;
  generatedAt: string;
  status: string;
  noReleaseDeployOta: boolean;
  goldenVersion: string;
  addendumSha256: string;
  denominator: number;
  completed: number;
  projectionsPerCase: string[];
  evidenceFileCount: number;
  files: HistoricalSummaryFile[];
  cases: HistoricalSummaryCase[];
  evidenceManifestSha256: string;
}>;
type HistoricalFixture = Readonly<{
  fixtureId: string;
  promptRu: string;
  expectedWorkIdentity: string;
  expectedScopeLevel: string;
  expectedMandatoryResourceIds: string[];
  expectedConditionalResourceIds: string[];
  forbiddenResourceIds: string[];
}>;
type BaseManifestRow = Readonly<{
  template_id: string;
  work_key: string;
}>;
type CurrentCatalogOutcome = Readonly<{
  catalogId: string;
  definitionVersionId: string;
  minimum: Readonly<{ status: string }>;
  refinement: Readonly<{ status: string }>;
  verdict: string;
}>;
type CurrentCatalogAudit = Readonly<{
  schemaVersion: string;
  candidate: Readonly<{
    definitionReleaseId: string;
    status: string;
    activatedAt: string | null;
  }>;
  denominator: number;
  counts: Readonly<{
    minimumCompiled: number;
    minimumFailed: number;
    refinedFixtureCompiledWithoutNeeds: number;
  }>;
  releaseActivated: boolean;
  deployPerformed: boolean;
  otaPerformed: boolean;
  receiptSha256: string;
  outcomes: CurrentCatalogOutcome[];
}>;
type CurrentBackendAcceptance = Readonly<{
  status: string;
  candidate: Readonly<{ definitionReleaseId: string; status: string; activatedAt: string | null }>;
  counts: Readonly<{ backendContentAccepted: number; webAccepted: number; androidAccepted: number }>;
  benchmarks: readonly Readonly<{
    ordinal: number;
    currentCatalogId: string;
    backendContentAcceptanceStatus: string;
    webAcceptanceStatus: string;
    androidAcceptanceStatus: string;
  }>[];
  activationPerformed: boolean;
  deployPerformed: boolean;
  otaPerformed: boolean;
}>;

const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const HISTORICAL_ROOT = resolve(process.env.R4A13_BENCHMARK_EVIDENCE_ROOT
  ?? ".release-runtime/r568/rc09-real-material-scope-truth/30-goldens");
const BASE_MANIFEST_PATH = resolve(process.env.R4A13_BASE_MANIFEST_PATH
  ?? "data/estimate-templates/estimate-10000-readiness-manifest.json");
const CURRENT_CATALOG_AUDIT_PATH = resolve(process.env.R4A13_CURRENT_CATALOG_AUDIT_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/catalog-minimum-input-audit-v55/catalog-first-estimate-audit.json");
const CURRENT_BACKEND_ACCEPTANCE_PATH = resolve(process.env.R4A13_CURRENT_BACKEND_ACCEPTANCE_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-backend-benchmarks-v30/master-backend-benchmarks.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-benchmark-evidence-map-v1");
const CONTRACT = "rik-expo-app.r4-a13-6.s20-master-benchmark-evidence-map.v1";
const EXPECTED_PROJECTIONS = ["runtime", "web", "android_api_34", "pdf", "procurement"];
const EXPECTED_FILES_PER_CASE = [
  "fixture.json",
  "runtime.json",
  "web.json",
  "android.json",
  "pdf.json",
  "procurement.json",
];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeAtomic(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, value, "utf8");
  renameSync(pending, path);
}

function fail(reason: string): never {
  throw new Error(`MASTER_BENCHMARK_EVIDENCE:${reason}`);
}

const masterBytes = readFileSync(MASTER_PATH, "utf8");
const criteria = parseMasterCriteria(masterBytes);
const benchmarks = parseMasterTechnologyBenchmarks(masterBytes);
assertMasterScopeInventory({ criteria, benchmarks });
assertMasterBenchmarkFixtureMapping({ benchmarks });

const summaryPath = resolve(HISTORICAL_ROOT, "SUMMARY.json");
const summaryBytes = readFileSync(summaryPath);
const summary = JSON.parse(summaryBytes.toString("utf8")) as HistoricalSummary;
if (summary.schema !== "RC09_REAL_ESTIMATE_30_GOLDEN_EVIDENCE_V1") fail("SUMMARY_SCHEMA");
if (summary.status !== "GREEN_30_REAL_ESTIMATE_GOLDENS") fail("SUMMARY_STATUS");
if (!summary.noReleaseDeployOta) fail("SUMMARY_NO_RELEASE_BOUNDARY");
if (summary.denominator !== 30 || summary.completed !== 30 || summary.cases.length !== 30) {
  fail("SUMMARY_DENOMINATOR");
}
if (JSON.stringify(summary.projectionsPerCase) !== JSON.stringify(EXPECTED_PROJECTIONS)) {
  fail("SUMMARY_PROJECTIONS");
}
if (summary.evidenceFileCount !== 180 || summary.files.length !== 180) {
  fail("SUMMARY_FILE_COUNT");
}
if (new Set(summary.files.map((file) => file.path)).size !== summary.files.length) {
  fail("SUMMARY_DUPLICATE_FILE");
}

const baseManifest = JSON.parse(readFileSync(BASE_MANIFEST_PATH, "utf8")) as {
  templates: BaseManifestRow[];
};
const baseManifestByTemplateId = new Map(baseManifest.templates.map((row) => [row.template_id, row]));
const currentAuditBytes = readFileSync(CURRENT_CATALOG_AUDIT_PATH);
const currentAudit = JSON.parse(currentAuditBytes.toString("utf8")) as CurrentCatalogAudit;
if (currentAudit.denominator !== 10_331
  || currentAudit.outcomes.length !== currentAudit.denominator
  || currentAudit.counts.minimumCompiled !== currentAudit.denominator
  || currentAudit.counts.minimumFailed !== 0
  || currentAudit.counts.refinedFixtureCompiledWithoutNeeds !== currentAudit.denominator) {
  fail("CURRENT_AUDIT_COUNTS");
}
if (currentAudit.candidate.status !== "prepared"
  || currentAudit.candidate.activatedAt !== null
  || currentAudit.releaseActivated
  || currentAudit.deployPerformed
  || currentAudit.otaPerformed) {
  fail("CURRENT_AUDIT_READ_ONLY_BOUNDARY");
}
const currentOutcomeByCatalogId = new Map(
  currentAudit.outcomes.map((outcome) => [outcome.catalogId, outcome]),
);
const currentBackendAcceptanceBytes = readFileSync(CURRENT_BACKEND_ACCEPTANCE_PATH);
const currentBackendAcceptance = JSON.parse(
  currentBackendAcceptanceBytes.toString("utf8"),
) as CurrentBackendAcceptance;
if (currentBackendAcceptance.status !== "BACKEND_CONTENT_ACCEPTED_30_OF_30_WEB_ANDROID_OPEN"
  || currentBackendAcceptance.candidate.definitionReleaseId
    !== currentAudit.candidate.definitionReleaseId
  || currentBackendAcceptance.candidate.status !== "prepared"
  || currentBackendAcceptance.candidate.activatedAt !== null
  || currentBackendAcceptance.counts.backendContentAccepted !== 30
  || currentBackendAcceptance.counts.webAccepted !== 0
  || currentBackendAcceptance.counts.androidAccepted !== 0
  || currentBackendAcceptance.activationPerformed
  || currentBackendAcceptance.deployPerformed
  || currentBackendAcceptance.otaPerformed) {
  fail("CURRENT_BACKEND_ACCEPTANCE_BOUNDARY");
}
const currentBackendAcceptanceByOrdinal = new Map(
  currentBackendAcceptance.benchmarks.map((benchmark) => [benchmark.ordinal, benchmark]),
);
if (currentBackendAcceptanceByOrdinal.size !== 30
  || !currentBackendAcceptanceByOrdinal.has(1)
  || !currentBackendAcceptanceByOrdinal.has(2)
  || !currentBackendAcceptanceByOrdinal.has(3)
  || !currentBackendAcceptanceByOrdinal.has(4)
  || !currentBackendAcceptanceByOrdinal.has(5)
  || !currentBackendAcceptanceByOrdinal.has(6)
  || !currentBackendAcceptanceByOrdinal.has(7)
  || !currentBackendAcceptanceByOrdinal.has(8)
  || !currentBackendAcceptanceByOrdinal.has(9)
  || !currentBackendAcceptanceByOrdinal.has(10)
  || !currentBackendAcceptanceByOrdinal.has(11)
  || !currentBackendAcceptanceByOrdinal.has(12)
  || !currentBackendAcceptanceByOrdinal.has(13)
  || !currentBackendAcceptanceByOrdinal.has(14)
  || !currentBackendAcceptanceByOrdinal.has(15)
  || !currentBackendAcceptanceByOrdinal.has(16)
  || !currentBackendAcceptanceByOrdinal.has(17)
  || !currentBackendAcceptanceByOrdinal.has(18)
  || !currentBackendAcceptanceByOrdinal.has(19)
  || !currentBackendAcceptanceByOrdinal.has(20)
  || !currentBackendAcceptanceByOrdinal.has(21)
  || !currentBackendAcceptanceByOrdinal.has(22)
  || !currentBackendAcceptanceByOrdinal.has(23)
  || !currentBackendAcceptanceByOrdinal.has(24)
  || !currentBackendAcceptanceByOrdinal.has(25)
  || !currentBackendAcceptanceByOrdinal.has(26)
  || !currentBackendAcceptanceByOrdinal.has(27)
  || !currentBackendAcceptanceByOrdinal.has(28)
  || !currentBackendAcceptanceByOrdinal.has(29)
  || !currentBackendAcceptanceByOrdinal.has(30)) {
  fail("CURRENT_BACKEND_ACCEPTANCE_ORDINALS");
}

const verifiedFiles = summary.files.map((file) => {
  const bytes = readFileSync(resolve(HISTORICAL_ROOT, file.path));
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== file.sha256) fail(`FILE_SHA256:${file.path}`);
  return { path: file.path, sha256: actualSha256, bytes: bytes.length };
});

const summaryFilePaths = new Set(summary.files.map((file) => file.path));
const mappedBenchmarks = MASTER_BENCHMARK_FIXTURE_MAPPING.map((mapping, index) => {
  const summaryCase = summary.cases[index];
  if (summaryCase?.fixtureId !== mapping.fixtureId) fail(`CASE_ORDER:${mapping.ordinal}`);
  for (const fileName of EXPECTED_FILES_PER_CASE) {
    if (!summaryFilePaths.has(`${mapping.fixtureId}/${fileName}`)) {
      fail(`CASE_FILE:${mapping.fixtureId}/${fileName}`);
    }
  }
  const fixturePath = resolve(HISTORICAL_ROOT, mapping.fixtureId, "fixture.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as HistoricalFixture;
  if (fixture.fixtureId !== mapping.fixtureId) fail(`FIXTURE_ID:${mapping.ordinal}`);
  if (fixture.expectedWorkIdentity !== mapping.historicalExpectedIdentityRu) {
    fail(`FIXTURE_IDENTITY:${mapping.ordinal}`);
  }
  const baseManifestRow = baseManifestByTemplateId.get(summaryCase.templateId) ?? null;
  const historicalBaseCatalogId = baseManifestRow
    ? `canonical-work:base:${baseManifestRow.work_key}`
    : null;
  const currentCatalogId = mapping.currentSemanticSuccessorCatalogId ?? historicalBaseCatalogId;
  const currentOutcome = currentCatalogId
    ? currentOutcomeByCatalogId.get(currentCatalogId) ?? null
    : null;
  if (currentCatalogId && !currentOutcome) fail(`CURRENT_CATALOG_OUTCOME:${mapping.ordinal}`);
  const currentBackendEvidence = currentBackendAcceptanceByOrdinal.get(mapping.ordinal) ?? null;
  if (currentBackendEvidence
    && (currentBackendEvidence.currentCatalogId !== currentCatalogId
      || currentBackendEvidence.backendContentAcceptanceStatus
        !== "ACCEPTED_CURRENT_PREPARED_CANDIDATE"
      || currentBackendEvidence.webAcceptanceStatus !== "NOT_EVALUATED"
      || currentBackendEvidence.androidAcceptanceStatus !== "NOT_EVALUATED")) {
    fail(`CURRENT_BACKEND_ACCEPTANCE:${mapping.ordinal}`);
  }
  return {
    ordinal: mapping.ordinal,
    masterTitleRu: mapping.masterTitleRu,
    masterCompositionBoundaryRu: benchmarks[index].compositionBoundaryRu,
    fixtureId: mapping.fixtureId,
    historicalExpectedIdentityRu: fixture.expectedWorkIdentity,
    historicalPromptRu: fixture.promptRu,
    historicalTemplateId: summaryCase.templateId,
    historicalRevisionId: summaryCase.revisionId,
    historicalScopeLevel: fixture.expectedScopeLevel,
    historicalRowCount: summaryCase.rowCount,
    historicalMaterialCount: summaryCase.materialCount,
    historicalExpectedMandatoryResourceIds: fixture.expectedMandatoryResourceIds,
    historicalExpectedConditionalResourceIds: fixture.expectedConditionalResourceIds,
    historicalForbiddenResourceIds: fixture.forbiddenResourceIds,
    stableCaseMappingStatus: "MAPPED_TO_HASH_VERIFIED_HISTORICAL_RC09_FIXTURE",
    historicalArtifactIntegrityStatus: "VERIFIED",
    currentCatalogBindingStatus: mapping.currentSemanticSuccessorCatalogId
      ? "EXPLICIT_SEMANTIC_SUCCESSOR_PRESENT_IN_CURRENT_CANDIDATE_AUDIT"
      : currentOutcome
        ? "DIRECT_BASE_TEMPLATE_BINDING_PRESENT_IN_CURRENT_CANDIDATE_AUDIT"
      : "HISTORICAL_EXPANDED_TEMPLATE_WITHOUT_DIRECT_CURRENT_CANDIDATE_AUDIT_BINDING",
    historicalBaseCatalogId,
    currentCatalogId,
    currentDefinitionVersionId: currentOutcome?.definitionVersionId ?? null,
    currentMinimumCompileStatus: currentOutcome?.minimum.status ?? "NOT_EVALUATED",
    currentRefinementCompileStatus: currentOutcome?.refinement.status ?? "NOT_EVALUATED",
    currentCatalogAuditVerdict: currentOutcome?.verdict ?? "NOT_EVALUATED",
    currentCandidateBackendContentAcceptanceStatus:
      currentBackendEvidence?.backendContentAcceptanceStatus ?? "NOT_EVALUATED",
    currentCandidateContentAcceptanceStatus: "NOT_EVALUATED",
    currentCandidateWebAcceptanceStatus: "NOT_EVALUATED",
    currentCandidateAndroidAcceptanceStatus: "NOT_EVALUATED",
  };
});

const report = {
  schemaVersion: CONTRACT,
  generatedAt: new Date().toISOString(),
  status: "HISTORICAL_MAPPING_GREEN_CURRENT_ACCEPTANCE_OPEN",
  boundary: [
    "All thirty MASTER Appendix B entries are mapped to stable RC09 fixture IDs and all 180 listed historical evidence files passed SHA-256 verification.",
    "The historical 2026-09-02 GREEN does not prove the current candidate, current professional source completeness, or a fresh real Web/Android run.",
  ],
  master: {
    path: MASTER_PATH.replaceAll("\\", "/"),
    sha256: sha256(masterBytes),
  },
  historicalEvidence: {
    root: HISTORICAL_ROOT.replaceAll("\\", "/"),
    summaryPath: summaryPath.replaceAll("\\", "/"),
    summarySha256: sha256(summaryBytes),
    schema: summary.schema,
    generatedAt: summary.generatedAt,
    status: summary.status,
    goldenVersion: summary.goldenVersion,
    addendumSha256: summary.addendumSha256,
    evidenceManifestSha256Claim: summary.evidenceManifestSha256,
    verifiedFileCount: verifiedFiles.length,
    verifiedBytes: verifiedFiles.reduce((total, file) => total + file.bytes, 0),
    projectionsPerCase: summary.projectionsPerCase,
  },
  currentCandidateAudit: {
    path: CURRENT_CATALOG_AUDIT_PATH.replaceAll("\\", "/"),
    sha256: sha256(currentAuditBytes),
    schemaVersion: currentAudit.schemaVersion,
    definitionReleaseId: currentAudit.candidate.definitionReleaseId,
    status: currentAudit.candidate.status,
    activatedAt: currentAudit.candidate.activatedAt,
    denominator: currentAudit.denominator,
    receiptSha256: currentAudit.receiptSha256,
  },
  currentBackendContentEvidence: {
    path: CURRENT_BACKEND_ACCEPTANCE_PATH.replaceAll("\\", "/"),
    sha256: sha256(currentBackendAcceptanceBytes),
    status: currentBackendAcceptance.status,
    acceptedOrdinals: [...currentBackendAcceptanceByOrdinal.keys()].sort((left, right) => left - right),
  },
  counts: {
    mappedBenchmarks: mappedBenchmarks.length,
    uniqueFixtureIds: new Set(mappedBenchmarks.map((benchmark) => benchmark.fixtureId)).size,
    hashVerifiedHistoricalFiles: verifiedFiles.length,
    directCurrentCatalogBindings: mappedBenchmarks.filter((benchmark) => benchmark.currentCatalogId).length,
    historicalExpandedTemplatesWithoutDirectCurrentBinding: mappedBenchmarks.filter(
      (benchmark) => !benchmark.currentCatalogId,
    ).length,
    currentMechanismGreenContentReviewPending: mappedBenchmarks.filter(
      (benchmark) => benchmark.currentCatalogAuditVerdict === "MECHANISM_GREEN_CONTENT_REVIEW_PENDING",
    ).length,
    currentManagedSourceGap: mappedBenchmarks.filter(
      (benchmark) => benchmark.currentCatalogAuditVerdict === "GAP_INTERNAL_PROFESSIONAL_SOURCE_MISSING",
    ).length,
    currentBackendContentAccepted: mappedBenchmarks.filter(
      (benchmark) => benchmark.currentCandidateBackendContentAcceptanceStatus
        === "ACCEPTED_CURRENT_PREPARED_CANDIDATE",
    ).length,
    currentContentAccepted: 0,
    currentWebAccepted: 0,
    currentAndroidAccepted: 0,
  },
  mappedBenchmarks,
  verifiedFiles,
  activationPerformed: false,
  deployPerformed: false,
  otaPerformed: false,
};
const canonical = `${JSON.stringify(report, null, 2)}\n`;
const reportSha256 = sha256(canonical);
writeAtomic(resolve(OUTPUT_ROOT, "master-benchmark-evidence-map.json"), canonical);
writeAtomic(resolve(OUTPUT_ROOT, "master-benchmark-evidence-map.sha256"),
  `${reportSha256}  master-benchmark-evidence-map.json\n`);
writeAtomic(resolve(OUTPUT_ROOT, "master-benchmark-evidence-map.md"), [
  "# S20 MASTER benchmark evidence map",
  "",
  `MASTER SHA-256: \`${report.master.sha256}\``,
  "",
  `Historical summary SHA-256: \`${report.historicalEvidence.summarySha256}\``,
  "",
  `Report SHA-256: \`${reportSha256}\``,
  "",
  `- Stable fixture mappings: ${report.counts.mappedBenchmarks}/30; unique IDs: ${report.counts.uniqueFixtureIds}.`,
  `- Historical evidence files verified by SHA-256: ${report.counts.hashVerifiedHistoricalFiles}/180.`,
  `- Direct bindings in current 10,331-definition audit: ${report.counts.directCurrentCatalogBindings}/30; historical expanded-only mappings without a direct current audit binding: ${report.counts.historicalExpandedTemplatesWithoutDirectCurrentBinding}/30.`,
  `- Direct bindings classified as mechanism GREEN/content review pending: ${report.counts.currentMechanismGreenContentReviewPending}; managed source gap: ${report.counts.currentManagedSourceGap}.`,
  `- Current backend content accepted with candidate-bound evidence: ${report.counts.currentBackendContentAccepted}/30.`,
  "- Current content, real Web and real Android acceptance remain open; historical evidence is not promoted to current acceptance.",
  "- No activation, deployment or OTA was performed.",
  "",
].join("\n"));

process.stdout.write(`${JSON.stringify({
  status: report.status,
  outputRoot: OUTPUT_ROOT,
  masterSha256: report.master.sha256,
  historicalSummarySha256: report.historicalEvidence.summarySha256,
  reportSha256,
  counts: report.counts,
}, null, 2)}\n`);
