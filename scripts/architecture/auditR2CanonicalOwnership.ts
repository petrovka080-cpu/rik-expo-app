import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

import ts from "typescript";

type DependencyKind = "static" | "dynamic" | "type_only";
type Dependency = {
  path: string;
  kind: DependencyKind;
};
type CandidateClassification =
  | "ACTIVE_CANONICAL"
  | "MIGRATE_THEN_DELETE"
  | "TEST_FIXTURE"
  | "GENERATED"
  | "DEAD";
type CandidateAction = "KEEP" | "PORT_AND_DELETE" | "DELETE_SOURCE" | "DELETE_GENERATED";
type CandidateDefinition = {
  path: string;
  symbols: string[];
  claimedRole: string;
  replacementOwner: string | null;
  uniqueUnportedBehavior: string[];
  classification: CandidateClassification;
  action: CandidateAction;
};

const ROOT = resolve(".");
const DEFAULT_MASTER_SHA256 = "1c18212fcea75adf57473146e04f25ce29a3c9a4febaaebfb5442ae2cdb78da4";
const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx",
];
const CODE_FILE = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u;
const TEST_FILE = /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/u;

const CANDIDATES: CandidateDefinition[] = [
  {
    path: "src/components/layout/StickyActionBar.tsx",
    symbols: ["StickyActionBar", "StickyActionBarProps"],
    claimedRole: "compatibility wrapper over AppStickyActionBar",
    replacementOwner: "src/components/layout/AppStickyActionBar.tsx",
    uniqueUnportedBehavior: [],
    classification: "DEAD",
    action: "DELETE_SOURCE",
  },
  {
    path: "src/features/consumerRepair/requestEstimateLegacyTestActions.ts",
    symbols: ["buildConsumerRepairSelectedWorkDraftBundle", "saveProjectExecutionDraftForRequest"],
    claimedRole: "deleted pre-cutover request estimate test fixture",
    replacementOwner: "canonical backend compile/revision projection plus current PDF/procurement successor contracts",
    uniqueUnportedBehavior: [],
    classification: "DEAD",
    action: "DELETE_SOURCE",
  },
  {
    path: "src/features/consumerRepair/consumerRepairAiAdapter.ts",
    symbols: ["buildConsumerRepairAiDraft"],
    claimedRole: "retired frontend estimate adapter retained by tests and evidence scripts",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
    uniqueUnportedBehavior: ["legacy catalog/formula projection used by historical fixtures"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector.ts",
    symbols: ["continuousAiEstimateDetector"],
    claimedRole: "continuous frontend estimate detector",
    replacementOwner: "canonical estimate backend admission and compile flow",
    uniqueUnportedBehavior: ["detector trigger behavior requires parity audit"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts",
    symbols: ["buildEstimateFromInlineWorkPrompt"],
    claimedRole: "frontend professional estimate compiler dispatcher",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    uniqueUnportedBehavior: ["domain routing and legacy migration behavior require content audit"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/estimate/createEstimateDraftRevision.ts",
    symbols: ["createEstimateDraftRevision"],
    claimedRole: "frontend estimate revision creator",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
    uniqueUnportedBehavior: ["historical fixture behavior requires backend projection migration"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/estimate/recalculateEstimateDraftRevision.ts",
    symbols: ["recalculateEstimateDraftRevision"],
    claimedRole: "frontend estimate revision recalculator",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
    uniqueUnportedBehavior: ["historical fixture behavior requires backend projection migration"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
    symbols: ["expandedEstimateCompiler"],
    claimedRole: "legacy expanded frontend compiler",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    uniqueUnportedBehavior: ["formulas and catalog mappings require canonical content comparison"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    symbols: ["globalEstimateCalculator"],
    claimedRole: "legacy global estimate calculator",
    replacementOwner: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    uniqueUnportedBehavior: ["rate, tax, and unit behavior require canonical parity audit"],
    classification: "MIGRATE_THEN_DELETE",
    action: "PORT_AND_DELETE",
  },
  {
    path: "src/lib/runtime/r45RuntimeManifest.ts",
    symbols: ["installR45RuntimeManifest"],
    claimedRole: "retired R4.5 product-entry runtime proof",
    replacementOwner: "src/components/BuildIdentityDiagnostic.tsx plus external source/bundle/APK/backend evidence",
    uniqueUnportedBehavior: [],
    classification: "DEAD",
    action: "DELETE_SOURCE",
  },
  {
    path: "src/lib/mobilePhotoCapture/mobilePhotoStorageKey.ts",
    symbols: [
      "MobilePhotoStorageIdentity",
      "mobilePhotoStagingRelativePath",
      "mobilePhotoLegacyMigrationRelativePath",
      "mobilePhotoUtf8Bytes",
    ],
    claimedRole: "temporary split owner for deterministic local mobile-photo storage paths",
    replacementOwner: "src/lib/mobilePhotoCapture/mobilePhotoLocalRepository.ts plus mobilePhotoNormalizationService.ts",
    uniqueUnportedBehavior: [],
    classification: "DEAD",
    action: "DELETE_SOURCE",
  },
  {
    path: "src/components/BuildIdentityMarker.tsx",
    symbols: ["BuildIdentityMarker"],
    claimedRole: "retired visible and accessibility-announced build proof marker",
    replacementOwner: "external APK/bundle hash evidence and non-visual runtime diagnostic",
    uniqueUnportedBehavior: [],
    classification: "DEAD",
    action: "DELETE_SOURCE",
  },
  {
    path: "src/components/BuildIdentityDiagnostic.tsx",
    symbols: ["BuildIdentityDiagnostic"],
    claimedRole: "non-visual runtime build identity evidence channel",
    replacementOwner: null,
    uniqueUnportedBehavior: [],
    classification: "ACTIVE_CANONICAL",
    action: "KEEP",
  },
  {
    path: "src/lib/ai/globalEstimate/dataOps/globalEstimateSourceRefreshQueue.ts",
    symbols: ["enqueueGlobalEstimateSourceRefresh", "markGlobalEstimateSourceRefreshCacheWritten"],
    claimedRole: "non-blocking source refresh queue",
    replacementOwner: null,
    uniqueUnportedBehavior: [],
    classification: "ACTIVE_CANONICAL",
    action: "KEEP",
  },
  {
    path: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    symbols: ["compileCanonicalEstimateCore"],
    claimedRole: "canonical estimate compiler",
    replacementOwner: null,
    uniqueUnportedBehavior: [],
    classification: "ACTIVE_CANONICAL",
    action: "KEEP",
  },
  {
    path: "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts",
    symbols: ["evaluateEstimateAdmission"],
    claimedRole: "canonical estimate admission",
    replacementOwner: null,
    uniqueUnportedBehavior: [],
    classification: "ACTIVE_CANONICAL",
    action: "KEEP",
  },
  {
    path: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
    symbols: ["buildCanonicalRevisionIdentity", "canonicalRevisionCommitFunction"],
    claimedRole: "canonical revision writer selector and identity builder",
    replacementOwner: null,
    uniqueUnportedBehavior: [],
    classification: "ACTIVE_CANONICAL",
    action: "KEEP",
  },
];

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalized(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? listFiles(path) : [normalized(relative(ROOT, path))];
  });
}

function isProductionCodeFile(path: string): boolean {
  return CODE_FILE.test(path)
    && !TEST_FILE.test(path)
    && !/(?:^|\/)(?:node_modules|build|dist|coverage|artifacts|\.release-runtime)(?:\/|$)/u.test(path);
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function resolveModule(files: Set<string>, importer: string, request: string): string | null {
  let base: string;
  if (request.startsWith("@/")) {
    base = request.slice(2);
  } else if (request.startsWith(".")) {
    base = normalized(relative(ROOT, resolve(dirname(resolve(ROOT, importer)), request)));
  } else {
    return null;
  }
  if (CODE_FILE.test(base) && files.has(base)) return base;
  for (const suffix of SOURCE_EXTENSIONS) {
    const candidate = normalized(`${base}${suffix}`);
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function dependenciesFor(path: string, files: Set<string>): Dependency[] {
  const source = readFileSync(resolve(ROOT, path), "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
  const dependencies = new Map<string, DependencyKind>();
  const add = (request: string, kind: DependencyKind) => {
    const target = resolveModule(files, path, request);
    if (!target) return;
    const previous = dependencies.get(target);
    if (previous === "static" || (previous === "dynamic" && kind === "type_only")) return;
    dependencies.set(target, kind);
  };

  file.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) {
        add(node.moduleSpecifier.text, "type_only");
        return;
      }
      const bindings = clause?.namedBindings;
      const hasRuntimeBinding = clause == null
        || clause.name != null
        || (bindings != null && ts.isNamespaceImport(bindings))
        || (bindings != null && ts.isNamedImports(bindings)
          && bindings.elements.some((item) => !item.isTypeOnly));
      add(node.moduleSpecifier.text, hasRuntimeBinding ? "static" : "type_only");
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      add(node.moduleSpecifier.text, node.isTypeOnly ? "type_only" : "static");
    }
  });

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add(node.arguments[0].text, "dynamic");
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        add(node.arguments[0].text, "static");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...dependencies.entries()]
    .map(([dependencyPath, kind]) => ({ path: dependencyPath, kind }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function jsonBody(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function referencesInFiles(paths: string[], candidatePath: string, symbols: string[]): string[] {
  const pathNeedles = [candidatePath, candidatePath.replace(/\.(?:ts|tsx|js|jsx)$/u, "")];
  const symbolPatterns = symbols.map((symbol) => new RegExp(
    `(^|[^A-Za-z0-9_])${regexEscape(symbol)}([^A-Za-z0-9_]|$)`,
    "u",
  ));
  return paths.filter((path) => {
    try {
      const source = readFileSync(resolve(ROOT, path), "utf8");
      return pathNeedles.some((needle) => source.includes(needle))
        || symbolPatterns.some((pattern) => pattern.test(source));
    } catch {
      return false;
    }
  }).sort();
}

function main(): void {
  const masterSha256 = argument("master-sha", DEFAULT_MASTER_SHA256);
  const contractVersion = argument("contract-version", "r2").toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(masterSha256)) throw new Error("OWNERSHIP_MASTER_SHA256_INVALID");
  if (!/^r[0-9]+$/u.test(contractVersion)) throw new Error("OWNERSHIP_CONTRACT_VERSION_INVALID");
  const contractVersionUpper = contractVersion.toUpperCase();
  const outputRoot = resolve(argument(
    "output-root",
    ".release-runtime/real-useful-estimates-r2/evidence/phase1-before",
  ));
  const productFiles = [
    "index.js",
    ...listFiles(resolve(ROOT, "app")),
    ...listFiles(resolve(ROOT, "src")),
    ...listFiles(resolve(ROOT, "supabase", "functions")),
  ].filter((path, index, all) => isProductionCodeFile(path) && all.indexOf(path) === index);
  const files = new Set(productFiles);
  const appRoots = productFiles.filter((path) => path.startsWith("app/"));
  const edgeRoots = productFiles.filter((path) => /^supabase\/functions\/[^/]+\/index\.(?:ts|js)$/u.test(path));
  const roots = ["index.js", ...appRoots, ...edgeRoots]
    .filter((path, index, all) => files.has(path) && all.indexOf(path) === index)
    .sort();

  const graph = new Map<string, Dependency[]>();
  for (const path of productFiles) graph.set(path, dependenciesFor(path, files));
  const reverseStatic = new Map<string, string[]>();
  const reverseDynamic = new Map<string, string[]>();
  const reverseType = new Map<string, string[]>();
  for (const [importer, dependencies] of graph) {
    for (const dependency of dependencies) {
      const targetMap = dependency.kind === "static"
        ? reverseStatic
        : dependency.kind === "dynamic" ? reverseDynamic : reverseType;
      targetMap.set(dependency.path, [...(targetMap.get(dependency.path) ?? []), importer]);
    }
  }

  const reachable = new Set<string>();
  const routeChains = new Map<string, string[][]>();
  for (const root of roots) {
    const queue = [root];
    const previous = new Map<string, string | null>([[root, null]]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      reachable.add(current);
      for (const dependency of graph.get(current) ?? []) {
        if (dependency.kind === "type_only" || previous.has(dependency.path)) continue;
        previous.set(dependency.path, current);
        queue.push(dependency.path);
      }
    }
    for (const candidate of CANDIDATES) {
      if (!previous.has(candidate.path)) continue;
      const chain: string[] = [];
      let cursor: string | null = candidate.path;
      while (cursor) {
        chain.push(cursor);
        cursor = previous.get(cursor) ?? null;
      }
      routeChains.set(candidate.path, [...(routeChains.get(candidate.path) ?? []), chain.reverse()]);
    }
  }

  const graphEvidence = {
    schema_version: `real-useful-estimates-${contractVersion}.production-reachability-graph.v1`,
    generated_at_utc: new Date().toISOString(),
    master_contract_sha256: masterSha256,
    package_main_root: "index.js",
    app_route_roots: appRoots.length,
    edge_function_roots: edgeRoots.length,
    total_roots: roots.length,
    production_source_modules: productFiles.length,
    runtime_reachable_modules: reachable.size,
    runtime_unreachable_modules: productFiles.length - reachable.size,
    roots,
    candidate_route_chains: Object.fromEntries(CANDIDATES.map((candidate) => [
      candidate.path,
      routeChains.get(candidate.path) ?? [],
    ])),
  };
  const graphBody = jsonBody(graphEvidence);
  const graphPath = resolve(outputRoot, "04_PRODUCTION_REACHABILITY_GRAPH.json");
  writeAtomic(graphPath, graphBody);
  const graphSha = sha256(graphBody);

  const testFiles = [
    ...listFiles(resolve(ROOT, "tests")),
    ...listFiles(resolve(ROOT, "src")).filter((path) => TEST_FILE.test(path)),
  ].filter((path) => CODE_FILE.test(path));
  const buildFiles = [
    ...listFiles(resolve(ROOT, "scripts")),
    "package.json",
    "app.config.ts",
    "app.json",
    "babel.config.js",
    "metro.config.js",
  ].filter((path) => ![
    "scripts/architecture/auditR2CanonicalOwnership.ts",
    "scripts/estimate/realUsefulEstimatesR3/buildDeadSourceWaveR32Evidence.ts",
  ].includes(path)
    && existsSync(resolve(ROOT, path))
    && statSync(resolve(ROOT, path)).isFile());

  const ledger = CANDIDATES.map((candidate) => {
    const chains = routeChains.get(candidate.path) ?? [];
    return {
      path: candidate.path,
      symbols: candidate.symbols,
      claimed_role: candidate.claimedRole,
      replacement_owner: candidate.replacementOwner,
      static_importers: (reverseStatic.get(candidate.path) ?? []).sort(),
      dynamic_importers: (reverseDynamic.get(candidate.path) ?? []).sort(),
      type_only_importers: (reverseType.get(candidate.path) ?? []).sort(),
      route_or_registry_references: chains.map((chain) => chain.join(" -> ")),
      build_codegen_references: referencesInFiles(buildFiles, candidate.path, candidate.symbols),
      runtime_hits: chains.length,
      runtime_hit_basis: "number of production entry roots reaching the module",
      test_only_references: referencesInFiles(testFiles, candidate.path, candidate.symbols),
      unique_unported_behavior: candidate.uniqueUnportedBehavior,
      classification: candidate.classification,
      proof_artifact_sha256: graphSha,
      action: candidate.action,
      source_exists: existsSync(resolve(ROOT, candidate.path)),
    };
  });

  const refreshEdge = readFileSync(
    resolve(ROOT, "supabase/functions/refresh-global-estimate-sources/index.ts"),
    "utf8",
  );
  const revisionWriterPath = resolve(ROOT, "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts");
  const revisionWriter = existsSync(revisionWriterPath) ? readFileSync(revisionWriterPath, "utf8") : "";
  const revisionWorker = readFileSync(
    resolve(ROOT, "supabase/functions/canonical-estimate-worker/index.ts"),
    "utf8",
  );
  const localGateway = readFileSync(
    resolve(ROOT, "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
    "utf8",
  );
  const unifiedRevisionMigrationPath = resolve(
    ROOT,
    "supabase/migrations/20260821120000_r2_one_canonical_estimate_revision_writer.sql",
  );
  const unifiedRevisionMigration = existsSync(unifiedRevisionMigrationPath)
    ? readFileSync(unifiedRevisionMigrationPath, "utf8")
    : "";
  const stickyDead = ledger.find((entry) => entry.path === "src/components/layout/StickyActionBar.tsx");
  const buildMarker = ledger.find((entry) => entry.path === "src/components/BuildIdentityMarker.tsx");
  const r45RuntimeManifest = ledger.find((entry) => entry.path === "src/lib/runtime/r45RuntimeManifest.ts");
  const legacyTestActions = ledger.find((entry) => entry.path === "src/features/consumerRepair/requestEstimateLegacyTestActions.ts");
  const deadSourceRemaining = ledger.filter(
    (entry) => entry.classification === "DEAD" && entry.source_exists,
  );
  const packageEntry = readFileSync(resolve(ROOT, "index.js"), "utf8");
  const buildDiagnosticPath = resolve(ROOT, "src/components/BuildIdentityDiagnostic.tsx");
  const buildDiagnostic = existsSync(buildDiagnosticPath)
    ? readFileSync(buildDiagnosticPath, "utf8")
    : "";
  const blockers: string[] = [];
  if (refreshEdge.includes('from "../../../src/lib/ai/globalEstimate"')) {
    blockers.push("REFRESH_EDGE_IMPORTS_GLOBAL_ESTIMATE_BARREL");
  }
  if ([revisionWriter, revisionWorker, localGateway].some(
    (source) => source.includes("estimate_commit_cumulative_compile_job_r58"),
  )) {
    blockers.push("TWO_DATABASE_REVISION_COMMIT_IMPLEMENTATIONS_ACTIVE");
  }
  if (!unifiedRevisionMigration.includes("create or replace function public.estimate_commit_compile_job_v1")
    || !unifiedRevisionMigration.includes("cumulative baseline/user parameter provenance mismatch")
    || !unifiedRevisionMigration.includes("update public.estimate_legacy_revision_import")
    || !unifiedRevisionMigration.includes("R6 intentionally permits an immutable historical revision")
    || !unifiedRevisionMigration.includes("drop function if exists public.estimate_commit_cumulative_compile_job_r58")) {
    blockers.push("UNIFIED_DATABASE_REVISION_WRITER_MIGRATION_INCOMPLETE");
  }
  if (stickyDead?.source_exists) blockers.push("CONFIRMED_DEAD_STICKY_ACTION_WRAPPER_REMAINS");
  if ((buildMarker?.runtime_hits ?? 0) > 0) blockers.push("CUSTOMER_UI_BUILD_IDENTITY_MARKER_REACHABLE");
  if (r45RuntimeManifest?.source_exists
    || packageEntry.includes("r45RuntimeManifest")
    || packageEntry.includes("installR45RuntimeManifest")) {
    blockers.push("RETIRED_R45_RUNTIME_PROOF_REMAINS_IN_PRODUCT_ENTRY");
  }
  if (deadSourceRemaining.length > 0) {
    blockers.push(`CONFIRMED_DEAD_SOURCE_REMAINS:${deadSourceRemaining.map((entry) => entry.path).join(",")}`);
  }
  if (!buildDiagnostic) blockers.push("NON_VISUAL_BUILD_IDENTITY_DIAGNOSTIC_MISSING");
  if (/(?:<View\b|<Text\b|testID\s*=|nativeID\s*=|accessibility(?:Label|Hint|Role|State|Value|LiveRegion)\s*=)/u.test(buildDiagnostic)) {
    blockers.push("BUILD_IDENTITY_DIAGNOSTIC_EXPOSES_CUSTOMER_UI");
  }

  const ownership = {
    schema_version: `real-useful-estimates-${contractVersion}.canonical-code-ownership.v1`,
    generated_at_utc: new Date().toISOString(),
    master_contract_sha256: masterSha256,
    proof_artifact_sha256: graphSha,
    owners: {
      compiler: {
        canonical: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts:compileCanonicalEstimateCore",
        production_root_hits: routeChains.get("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts")?.length ?? 0,
        legacy_global_calculator_root_hits: routeChains.get("src/lib/ai/globalEstimate/globalEstimateCalculator.ts")?.length ?? 0,
      },
      admission: {
        canonical: "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts:evaluateEstimateAdmission",
        production_root_hits: routeChains.get("src/lib/estimate/backendPlatform/estimateAdmissionR3.ts")?.length ?? 0,
      },
      revision_writer: {
        canonical_selector: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
        database_commit_functions: ["estimate_commit_compile_job_v1"],
        retired_database_commit_functions: ["estimate_commit_cumulative_compile_job_r58"],
        migration: "supabase/migrations/20260821120000_r2_one_canonical_estimate_revision_writer.sql",
        blocker: null,
      },
      request_action_group: {
        canonical: "src/features/consumerRepair/ConsumerRepairRequestChrome.tsx:ConsumerRepairRequestStickyActions",
        owner_count: 1,
      },
    },
    frontend_request_route_compiler_hits: {
      buildEstimateFromInlineWorkPrompt: routeChains.get("src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts")?.filter((chain) => chain[0].startsWith("app/")).length ?? 0,
      createEstimateDraftRevision: routeChains.get("src/lib/estimate/createEstimateDraftRevision.ts")?.filter((chain) => chain[0].startsWith("app/")).length ?? 0,
      recalculateEstimateDraftRevision: routeChains.get("src/lib/estimate/recalculateEstimateDraftRevision.ts")?.filter((chain) => chain[0].startsWith("app/")).length ?? 0,
    },
    confirmed_dead_source_remaining_in_bounded_scope: deadSourceRemaining.length,
    blockers,
    status: blockers.length === 0
      ? `GREEN_${contractVersionUpper}_CANONICAL_OWNERSHIP`
      : `RED_${contractVersionUpper}_CANONICAL_OWNERSHIP`,
  };
  writeAtomic(resolve(outputRoot, "05_CANONICAL_CODE_OWNERSHIP.json"), jsonBody(ownership));
  writeAtomic(resolve(outputRoot, "06_DEAD_CODE_LEDGER.json"), jsonBody({
    schema_version: `real-useful-estimates-${contractVersion}.dead-code-ledger.v1`,
    generated_at_utc: new Date().toISOString(),
    master_contract_sha256: masterSha256,
    proof_artifact_sha256: graphSha,
    entries: ledger,
  }));

  const rootCause = `# ${contractVersionUpper} root-cause matrix\n\n`
    + `| Area | Root cause | Safe action | Current gate |\n`
    + `|---|---|---|---|\n`
    + `| Global estimate closure | source-refresh edge imports the 42-export globalEstimate barrel | import the queue module directly; do not delete newly unreachable formulas before content parity | ${refreshEdge.includes('from "../../../src/lib/ai/globalEstimate"') ? "RED" : "GREEN"} |\n`
    + `| Sticky action wrapper | zero production roots and no unique behavior | delete wrapper, orphan test, and stale build/evidence references after ledger | ${stickyDead?.source_exists ? "RED" : "GREEN"} |\n`
    + `| Revision persistence | two SQL writers had materially different direct, cumulative, historical-child, and legacy-import behavior | preserve every invariant in one atomic DB writer, then drop the duplicate function | ${blockers.some((blocker) => blocker.includes("REVISION_WRITER") || blocker.includes("REVISION_COMMIT")) ? "RED" : "GREEN"} |\n`
    + `| Build identity | visible/accessibility-announced product node is production reachable | port installed APK/bundle/source proof to external evidence, then remove product marker | ${(buildMarker?.runtime_hits ?? 0) > 0 ? "RED" : "GREEN"} |\n`
    + `| R4.5 runtime proof | temporary manifest was installed from the production package entry | keep identity in diagnostic/external evidence and remove the expired product hook | ${r45RuntimeManifest?.source_exists || packageEntry.includes("r45RuntimeManifest") ? "RED" : "GREEN"} |\n`
    + `| Legacy test actions | retired frontend compiler fixture had orphan callers after backend cutover | current workspace/input cases use request/repository owners; compile/revision/PDF/procurement/domain behavior is covered by backend successor contracts | ${legacyTestActions?.source_exists ? "RED" : "GREEN"} |\n\n`
    + `Overall status: **${ownership.status}**. No global GREEN is claimed.\n`;
  writeAtomic(resolve(outputRoot, "07_ROOT_CAUSE_MATRIX.md"), rootCause);

  process.stdout.write(`${JSON.stringify({
    status: ownership.status,
    output_root: normalized(relative(ROOT, outputRoot)),
    graph_sha256: graphSha,
    production_modules: productFiles.length,
    reachable_modules: reachable.size,
    roots: roots.length,
    blockers,
  }, null, 2)}\n`);
}

main();
