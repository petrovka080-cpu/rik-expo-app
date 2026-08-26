import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SPEC_PATH = "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md";
const SPEC_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const OUTPUT_ROOT = path.resolve(
  ".release-runtime",
  "real-professional-estimates-r4",
  "evidence",
  "08-monolith",
  "final",
);
const GRAPH_PATH = path.join(OUTPUT_ROOT, "CANONICAL_MONOLITH_R56_ACTUAL_IMPORT_GRAPH.json");
const REPORT_PATH = path.join(OUTPUT_ROOT, "CANONICAL_MONOLITH_R56_CLOSEOUT.json");

const SOURCE_FILES = [
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts",
  "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "scripts/_shared/canonicalEstimateAcceptanceHarness.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "supabase/functions/canonical-estimate/index.ts",
  "supabase/functions/canonical-estimate-worker/index.ts",
  "src/lib/ai/estimateRouting/estimateIntentClassifier.ts",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  "src/features/estimates/calculator/families/capitalRenovationPresentation.ts",
  "scripts/estimate/r5/auditCanonicalMonolithR56.ts",
] as const;

const ESLINT_FILES = [
  ...SOURCE_FILES,
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.test.ts",
  "scripts/_shared/canonicalEstimateAcceptanceHarness.test.ts",
  "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
  "tests/requestEstimate/canonicalParameterAndProfessionalPdfP0.contract.test.ts",
  "tests/requestEstimate/consumerEstimateActionsR581.contract.test.ts",
  "tests/estimateBackend/inclusionGraph.contract.test.ts",
  "tests/estimateIntent/anyEstimateIntentRoutesToGlobalEstimate.contract.test.ts",
] as const;

const JEST_SUITES = [
  "scripts/_shared/canonicalEstimateAcceptanceHarness.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.test.ts",
  "src/lib/estimate/backendPlatform/estimateAdmissionR3.test.ts",
  "tests/estimateBackend/canonicalBackendR3.contract.test.ts",
  "tests/requestEstimate/canonicalParameterAndProfessionalPdfP0.contract.test.ts",
  "tests/requestEstimate/consumerEstimateActionsR581.contract.test.ts",
  "tests/estimateBackend/inclusionGraph.contract.test.ts",
  "tests/estimateIntent/anyEstimateIntentRoutesToGlobalEstimate.contract.test.ts",
  "tests/aiPlatform/categoryChipDoesNotOverrideTypedWork.contract.test.ts",
  "tests/requestEstimate/capitalRenovation98GroupedUi.contract.test.ts",
] as const;

const EXPECTED_METRICS = {
  production_compiler_implementations: 1,
  production_definition_registries: 1,
  production_admission_evaluators: 1,
  production_revision_writers: 1,
  production_artifact_contracts: 1,
  production_pdf_quantity_sources: 1,
  production_procurement_quantity_sources: 1,
  production_search_admission_paths: 1,
  frontend_compiler_reachability: 0,
  frontend_formula_evaluator_reachability: 0,
  duplicate_local_edge_business_logic: 0,
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(file: string): string {
  return sha256(readFileSync(file));
}

function run(name: string, modulePath: string, args: string[], timeoutMs: number) {
  const startedAt = new Date();
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=8192" },
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const logPath = path.join(OUTPUT_ROOT, `${name}.log`);
  writeFileSync(logPath, `${stdout}${stderr}`, "utf8");
  return {
    name,
    command: [process.execPath, modulePath, ...args],
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    timeoutMs,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    status: result.status === 0 ? "GREEN" as const : "RED" as const,
    logPath: path.relative(process.cwd(), logPath).replace(/\\/g, "/"),
    logSha256: sha256File(logPath),
  };
}

mkdirSync(OUTPUT_ROOT, { recursive: true });
if (!existsSync(SPEC_PATH) || sha256File(SPEC_PATH) !== SPEC_SHA256) throw new Error("R56_MASTER_SPEC_DRIFT");
if (!existsSync(GRAPH_PATH)) throw new Error("R56_MONOLITH_GRAPH_MISSING");
const graph = JSON.parse(readFileSync(GRAPH_PATH, "utf8")) as {
  status?: unknown;
  metrics?: Record<string, unknown>;
  blockers?: unknown[];
  source?: { actualGraphSha256?: unknown };
};
const graphExact = graph.status === "GREEN"
  && JSON.stringify(graph.metrics) === JSON.stringify(EXPECTED_METRICS)
  && Array.isArray(graph.blockers)
  && graph.blockers.length === 0;

const gates = [
  run("eslint", path.resolve("node_modules/eslint/bin/eslint.js"), [...ESLINT_FILES], 120_000),
  run("targeted-jest", path.resolve("node_modules/jest/bin/jest.js"), [...JEST_SUITES, "--runInBand"], 180_000),
  run("typescript", path.resolve("node_modules/typescript/bin/tsc"), ["--noEmit"], 180_000),
];
const sourceFiles = SOURCE_FILES.map((file) => ({ file, sha256: sha256File(file), bytes: readFileSync(file).byteLength }));
const sourceIdentitySha256 = sha256(sourceFiles.map((entry) => `${entry.file}\0${entry.sha256}\n`).join(""));
const blockers = [
  ...(graphExact ? [] : ["ACTUAL_IMPORT_GRAPH_NOT_EXACT_GREEN"]),
  ...gates.filter((gate) => gate.status !== "GREEN").map((gate) => `GATE_RED:${gate.name}`),
];
const report = {
  schemaVersion: "canonical-monolith-r56-closeout-v1",
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "PHASE_4_MONOLITH_GREEN" : "RED",
  authority: { specPath: SPEC_PATH, specSha256: SPEC_SHA256 },
  graph: {
    path: path.relative(process.cwd(), GRAPH_PATH).replace(/\\/g, "/"),
    sha256: sha256File(GRAPH_PATH),
    actualGraphSha256: graph.source?.actualGraphSha256 ?? null,
    exactMetrics: graph.metrics,
    exactGreen: graphExact,
  },
  sourceIdentitySha256,
  sourceFiles,
  gates,
  testScope: { fullJestExecuted: false, fullJestStatus: "DEFERRED_BY_OPERATOR_NOT_RUN", targetedSuites: JEST_SUITES.length },
  runtimeMutation: { databaseWrites: 0, backendReplay: false, release: false, deploy: false, ota: false },
  blockers,
};
writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.info(JSON.stringify({
  report: path.relative(process.cwd(), REPORT_PATH).replace(/\\/g, "/"),
  reportSha256: sha256File(REPORT_PATH),
  status: report.status,
  sourceIdentitySha256,
  gates: gates.map(({ name, status, logSha256 }) => ({ name, status, logSha256 })),
  blockers,
}, null, 2));
if (blockers.length > 0) process.exitCode = 1;
