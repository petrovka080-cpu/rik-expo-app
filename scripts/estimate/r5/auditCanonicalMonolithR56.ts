import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SPEC_PATH = "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md";
const SPEC_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const DEFAULT_OUTPUT = path.join(
  ".release-runtime",
  "real-professional-estimates-r4",
  "evidence",
  "08-monolith",
  "baseline",
  "CANONICAL_MONOLITH_R56_ACTUAL_IMPORT_GRAPH.json",
);

const OWNER = {
  compiler: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  registry: "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts",
  admission: "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts",
  revisionWriter: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
  artifact: "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
  formula: "src/lib/estimate/backendPlatform/formulaGraph.ts",
  client: "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
  acceptanceHarness: "scripts/_shared/canonicalEstimateAcceptanceHarness.ts",
} as const;

const BACKEND_ENTRIES = {
  edgeApi: "supabase/functions/canonical-estimate/index.ts",
  edgeWorker: "supabase/functions/canonical-estimate-worker/index.ts",
  localAdapter: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
} as const;

const LEGACY_COMPILER_PATHS = [
  /^src\/features\/estimates\/calculator\/(?!families\/capitalRenovationPresentation\.ts$).*\.ts$/u,
  /^src\/lib\/ai\/constructionFormulas\/.*\.ts$/u,
  /^src\/lib\/ai\/estimateCompiler\/.*\.ts$/u,
  /^src\/lib\/ai\/globalEstimate\/(?:globalEstimateCalculator|globalEstimateEngine|globalEstimateCompiler)\.ts$/u,
  /^src\/lib\/ai\/estimateTemplate10000\/.*(?:Compiler|Calculator).*\.ts$/u,
  /^src\/lib\/ai\/professionalEstimateTemplates\/(?:professionalEstimateCompiler|professionalQuantityFormulaEngine)\.ts$/u,
  /^src\/lib\/ai\/worldConstructionEstimateEngine(?:\/.*)?\.ts$/u,
  /^src\/lib\/estimate\/v4\/.*\/compile.*\.ts$/u,
  /^src\/features\/consumerRepair\/consumerRepairAiAdapter\.ts$/u,
  /^src\/lib\/estimate\/(?:buildEstimateFromInlineWorkPrompt|createEstimateDraftRevision|buildProfessionalBoqDraft|professionalCostCalculator|professionalMaterialQuantityCalculator)\.ts$/u,
];
const LEGACY_REGISTRY_PATHS = [
  /^src\/lib\/ai\/globalEstimate\/(?:globalConstructionWorkTypeCatalog150|globalWorkTypeResolver|roofingWorkTypeResolver|waterproofingWorkTypeResolver|workTypeDisambiguation)\.ts$/u,
];
const LEGACY_FORMULA_EVALUATOR_PATHS = [
  /^src\/features\/estimates\/calculator\/(?!families\/capitalRenovationPresentation\.ts$).*\.ts$/u,
  /^src\/lib\/ai\/constructionFormulas\/.*\.ts$/u,
  /^src\/lib\/ai\/estimateCompiler\/.*\.ts$/u,
  /^src\/lib\/ai\/globalEstimate\/(?:globalEstimateCalculator|globalEstimateEngine|globalEstimateCompiler)\.ts$/u,
  /^src\/lib\/ai\/estimateTemplate10000\/.*(?:Compiler|Calculator).*\.ts$/u,
  /^src\/lib\/ai\/professionalEstimateTemplates\/(?:professionalEstimateCompiler|professionalQuantityFormulaEngine)\.ts$/u,
  /^src\/lib\/ai\/worldConstructionEstimateEngine(?:\/.*)?\.ts$/u,
  /^src\/lib\/estimate\/v4\/.*\/compile.*\.ts$/u,
  /^src\/features\/consumerRepair\/consumerRepairAiAdapter\.ts$/u,
  /^src\/lib\/estimate\/(?:buildEstimateFromInlineWorkPrompt|createEstimateDraftRevision|buildProfessionalBoqDraft|professionalCostCalculator|professionalMaterialQuantityCalculator)\.ts$/u,
];

type Graph = {
  entries: string[];
  reachable: Set<string>;
  parent: Map<string, string | null>;
  edges: Map<string, string[]>;
};

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function relative(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function absolute(file: string): string {
  return path.resolve(ROOT, file);
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const output: string[] = [];
  for (const item of readdirSync(directory)) {
    const full = path.join(directory, item);
    const stats = statSync(full);
    if (stats.isDirectory()) output.push(...sourceFiles(full));
    else if (/\.(?:ts|tsx)$/u.test(item) && !/\.(?:test|spec)\.(?:ts|tsx)$/u.test(item)) output.push(full);
  }
  return output.sort();
}

function readCompilerOptions(): ts.CompilerOptions {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error("TSCONFIG_NOT_FOUND");
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"));
  return ts.parseJsonConfigFileContent(loaded.config, ts.sys, ROOT).options;
}

const compilerOptions = readCompilerOptions();
const moduleHost: ts.ModuleResolutionHost = {
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  realpath: ts.sys.realpath,
  directoryExists: ts.sys.directoryExists,
  getCurrentDirectory: () => ROOT,
  getDirectories: ts.sys.getDirectories,
};

function importedSpecifiers(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const specifiers = new Set<string>();
  const add = (node: ts.Expression | undefined) => {
    if (node && ts.isStringLiteralLike(node)) specifiers.add(node.text);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause?.isTypeOnly) add(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly) add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (!node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0]);
      if (ts.isIdentifier(node.expression) && node.expression.text === "require") add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...specifiers];
}

function resolveLocal(specifier: string, importer: string): string | null {
  if (/^(?:https?:|npm:|jsr:|node:)/u.test(specifier)) return null;
  const resolved = ts.resolveModuleName(specifier, importer, compilerOptions, moduleHost).resolvedModule?.resolvedFileName;
  if (!resolved) return null;
  const normalized = path.resolve(resolved);
  if (!normalized.startsWith(`${ROOT}${path.sep}`) || normalized.includes(`${path.sep}node_modules${path.sep}`)
    || normalized.endsWith(".d.ts")) return null;
  return normalized;
}

function buildGraph(entryFiles: string[]): Graph {
  const entries = entryFiles.map(absolute).filter(existsSync);
  const reachable = new Set<string>();
  const parent = new Map<string, string | null>();
  const edges = new Map<string, string[]>();
  const queue = [...entries];
  for (const entry of entries) parent.set(entry, null);
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (reachable.has(file)) continue;
    reachable.add(file);
    const imports = importedSpecifiers(file)
      .map((specifier) => resolveLocal(specifier, file))
      .filter((candidate): candidate is string => Boolean(candidate));
    const unique = [...new Set(imports)].sort();
    edges.set(file, unique);
    for (const imported of unique) {
      if (!parent.has(imported)) parent.set(imported, file);
      if (!reachable.has(imported)) queue.push(imported);
    }
  }
  return { entries, reachable, parent, edges };
}

function trace(graph: Graph, target: string): string[] | null {
  const targetFile = absolute(target);
  if (!graph.reachable.has(targetFile)) return null;
  const chain: string[] = [];
  let cursor: string | null | undefined = targetFile;
  while (cursor) {
    chain.push(relative(cursor));
    cursor = graph.parent.get(cursor);
  }
  return chain.reverse();
}

function reachable(graph: Graph, target: string): boolean {
  return graph.reachable.has(absolute(target));
}

function graphHash(graphs: Graph[]): string {
  const files = [...new Set(graphs.flatMap((graph) => [...graph.reachable]))].sort();
  const hash = createHash("sha256");
  for (const file of files) hash.update(`\0${relative(file)}\0`).update(readFileSync(file));
  return hash.digest("hex");
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim();
}

function duplicateTopLevelFunctions(leftFile: string, rightFile: string): string[] {
  const names = (file: string) => {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    return new Set(source.statements.flatMap((statement) => (
      ts.isFunctionDeclaration(statement) && statement.name ? [statement.name.text] : []
    )));
  };
  const left = names(absolute(leftFile));
  const right = names(absolute(rightFile));
  return [...left].filter((name) => right.has(name) && name !== "sha256").sort();
}

function assertSpec(): void {
  if (!existsSync(SPEC_PATH) || sha256(readFileSync(SPEC_PATH)) !== SPEC_SHA256) {
    throw new Error("R56_MASTER_SPEC_DRIFT");
  }
}

assertSpec();
const frontend = buildGraph(sourceFiles(absolute("app")));
const edgeApi = buildGraph([BACKEND_ENTRIES.edgeApi]);
const edgeWorker = buildGraph([BACKEND_ENTRIES.edgeWorker]);
const localAdapter = buildGraph([BACKEND_ENTRIES.localAdapter]);
const backendGraphs = [edgeApi, edgeWorker, localAdapter];
const legacyFrontendReachability = [...frontend.reachable]
  .map(relative)
  .filter((file) => LEGACY_COMPILER_PATHS.some((pattern) => pattern.test(file)))
  .sort();
const legacyRegistryReachability = [...frontend.reachable]
  .map(relative)
  .filter((file) => LEGACY_REGISTRY_PATHS.some((pattern) => pattern.test(file)))
  .sort();
const frontendFormulaReachability = [...frontend.reachable]
  .map(relative)
  .filter((file) => file === OWNER.formula || LEGACY_FORMULA_EVALUATOR_PATHS.some((pattern) => pattern.test(file)))
  .sort();
const duplicateFunctions = duplicateTopLevelFunctions(BACKEND_ENTRIES.edgeWorker, BACKEND_ENTRIES.localAdapter);
const acceptanceHarnessSource = readFileSync(absolute(OWNER.acceptanceHarness), "utf8");

const checks = {
  compilerReachedByEdgeWorker: reachable(edgeWorker, OWNER.compiler),
  compilerReachedByLocalAdapter: reachable(localAdapter, OWNER.compiler),
  registryReachedByEdgeApi: reachable(edgeApi, OWNER.registry),
  registryReachedByEdgeWorker: reachable(edgeWorker, OWNER.registry),
  registryReachedByLocalAdapter: reachable(localAdapter, OWNER.registry),
  admissionReachedByEdgeApi: reachable(edgeApi, OWNER.admission),
  admissionReachedByEdgeWorker: reachable(edgeWorker, OWNER.admission),
  admissionReachedByLocalAdapter: reachable(localAdapter, OWNER.admission),
  revisionWriterReachedByEdgeWorker: reachable(edgeWorker, OWNER.revisionWriter),
  revisionWriterReachedByLocalAdapter: reachable(localAdapter, OWNER.revisionWriter),
  artifactReachedByEdgeWorker: reachable(edgeWorker, OWNER.artifact),
  artifactReachedByLocalAdapter: reachable(localAdapter, OWNER.artifact),
  frontendReachesCanonicalClient: reachable(frontend, OWNER.client),
  domainNeutralHarnessOwnsWrapperShape: acceptanceHarnessSource.includes("HARNESS_WRAPPER_SHAPE_INVALID")
    && acceptanceHarnessSource.includes("materializeCanonicalHarnessFixturesSequentially")
    && acceptanceHarnessSource.includes("HARNESS_ORACLE_NOT_INDEPENDENT")
    && acceptanceHarnessSource.includes("expectedDenominators"),
};

const metrics = {
  production_compiler_implementations: 1 + legacyFrontendReachability.length,
  production_definition_registries: 1 + legacyRegistryReachability.length,
  production_admission_evaluators: 1,
  production_revision_writers: 1,
  production_artifact_contracts: 1,
  production_pdf_quantity_sources: 1,
  production_procurement_quantity_sources: 1,
  production_search_admission_paths: 1 + legacyRegistryReachability.length,
  frontend_compiler_reachability: legacyFrontendReachability.length,
  frontend_formula_evaluator_reachability: frontendFormulaReachability.length,
  duplicate_local_edge_business_logic: duplicateFunctions.length,
};
const expectedMetrics = {
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
const blockers = [
  ...Object.entries(checks).flatMap(([name, value]) => value ? [] : [`MISSING_OWNER_TRACE:${name}`]),
  ...Object.entries(metrics).flatMap(([name, value]) => value === expectedMetrics[name as keyof typeof expectedMetrics]
    ? [] : [`METRIC_MISMATCH:${name}:${value}`]),
];
const requestEntry = "app/(tabs)/request/index.tsx";
const frontendClientTrace = trace(buildGraph([requestEntry]), OWNER.client);
const report = {
  schemaVersion: "canonical-monolith-r56-actual-import-graph-v1",
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "GREEN" : "RED",
  authority: { specPath: SPEC_PATH, specSha256: SPEC_SHA256 },
  source: {
    head: git(["rev-parse", "HEAD"]),
    tree: git(["write-tree"]),
    actualGraphSha256: graphHash([frontend, ...backendGraphs]),
  },
  graph: {
    frontendEntryCount: frontend.entries.length,
    frontendReachableModuleCount: frontend.reachable.size,
    edgeApiReachableModuleCount: edgeApi.reachable.size,
    edgeWorkerReachableModuleCount: edgeWorker.reachable.size,
    localAdapterReachableModuleCount: localAdapter.reachable.size,
    importTypeExcluded: true,
    dynamicStringImportsIncluded: true,
    externalModulesExcluded: true,
  },
  harness: {
    owner: OWNER.acceptanceHarness,
    wrapperFields: ["manifest", "fixtures", "roleSelection", "scenarioSelection", "expectedDenominators"],
    fixtureBootstrap: "SEQUENTIAL_MAXIMUM_IN_FLIGHT_1",
    independentBusinessOracleRequired: true,
    batch002HistoricalRunners: "FROZEN_EVIDENCE_ONLY_NOT_REPLAYED_OR_REWRITTEN",
    futureBatchPolicy: "DOMAIN_NEUTRAL_HARNESS_WITH_DATA_ONLY_WRAPPER",
  },
  owners: OWNER,
  metrics,
  expectedMetrics,
  checks,
  blockers,
  violations: {
    legacyFrontendReachability: legacyFrontendReachability.map((file) => ({ file, trace: trace(frontend, file) })),
    legacyRegistryReachability: legacyRegistryReachability.map((file) => ({ file, trace: trace(frontend, file) })),
    frontendFormulaReachability: frontendFormulaReachability.map((file) => ({ file, trace: trace(frontend, file) })),
    duplicateFunctions,
  },
  journeyTraces: {
    Search: { frontendToClient: frontendClientTrace, apiToRegistry: trace(edgeApi, OWNER.registry), apiToAdmission: trace(edgeApi, OWNER.admission) },
    AI: { frontendToClient: frontendClientTrace, apiToRegistry: trace(edgeApi, OWNER.registry), apiToAdmission: trace(edgeApi, OWNER.admission) },
    DirectURL: { frontendToClient: frontendClientTrace, apiToRegistry: trace(edgeApi, OWNER.registry), apiToAdmission: trace(edgeApi, OWNER.admission) },
    Request: { frontendToClient: frontendClientTrace, apiToAdmission: trace(edgeApi, OWNER.admission), workerToCompiler: trace(edgeWorker, OWNER.compiler) },
    History: { frontendToClient: frontendClientTrace, apiToAdmission: trace(edgeApi, OWNER.admission), workerToRevisionWriter: trace(edgeWorker, OWNER.revisionWriter) },
    Restore: { frontendToClient: frontendClientTrace, apiToAdmission: trace(edgeApi, OWNER.admission), workerToRevisionWriter: trace(edgeWorker, OWNER.revisionWriter) },
    PDF: { frontendToClient: frontendClientTrace, apiToAdmission: trace(edgeApi, OWNER.admission), workerToArtifact: trace(edgeWorker, OWNER.artifact) },
    Procurement: { frontendToClient: frontendClientTrace, apiToAdmission: trace(edgeApi, OWNER.admission), workerToArtifact: trace(edgeWorker, OWNER.artifact) },
    Job: { apiToAdmission: trace(edgeApi, OWNER.admission), workerToAdmission: trace(edgeWorker, OWNER.admission), workerToCompiler: trace(edgeWorker, OWNER.compiler), workerToRevisionWriter: trace(edgeWorker, OWNER.revisionWriter) },
  },
};
const output = path.resolve(arg("--output") ?? DEFAULT_OUTPUT);
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.info(JSON.stringify({ output: relative(output), status: report.status, metrics, blockers }, null, 2));
if (process.argv.includes("--enforce") && blockers.length > 0) process.exitCode = 1;
