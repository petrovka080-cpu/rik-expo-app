import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import ts from "typescript";

type Json = Record<string, unknown>;
type Snapshot = {
  label: string;
  exists(path: string): boolean;
  read(path: string): string;
  appEntries(): string[];
};

const ROOT = resolve(".");
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"];
const TARGETS = {
  compileProductionExpandedEstimate10000:
    "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts",
  buildEstimateFromInlineWorkPrompt: "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts",
  createEstimateDraftRevision: "src/lib/estimate/createEstimateDraftRevision.ts",
  migrateExistingEstimatesToCanonicalBackend:
    "src/lib/estimate/backendPlatform/migrateExistingCanonicalEstimates.ts",
} as const;
const ADDITIONAL_ENTRY = "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx";

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalized(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function listWorktreeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listWorktreeFiles(path) : [normalized(relative(ROOT, path))];
  });
}

function worktreeSnapshot(): Snapshot {
  return {
    label: "WORKTREE",
    exists: (path) => existsSync(resolve(ROOT, path)) && statSync(resolve(ROOT, path)).isFile(),
    read: (path) => readFileSync(resolve(ROOT, path), "utf8"),
    appEntries: () => listWorktreeFiles(resolve(ROOT, "app"))
      .filter((path) => /\.(?:ts|tsx|js|jsx)$/u.test(path) && !/\.(?:test|spec)\./u.test(path)),
  };
}

function gitSnapshot(ref: string): Snapshot {
  const paths = new Set(execFileSync("git", ["ls-tree", "-r", "--name-only", ref], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  }).split(/\r?\n/u).map(normalized).filter(Boolean));
  return {
    label: ref,
    exists: (path) => paths.has(normalized(path)),
    read: (path) => execFileSync("git", ["show", `${ref}:${normalized(path)}`], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
    }),
    appEntries: () => [...paths]
      .filter((path) => path.startsWith("app/") && /\.(?:ts|tsx|js|jsx)$/u.test(path)
        && !/\.(?:test|spec)\./u.test(path)),
  };
}

function resolveModule(snapshot: Snapshot, importer: string, request: string): string | null {
  let base: string;
  if (request.startsWith("@/")) base = request.slice(2);
  else if (request.startsWith(".")) base = normalized(resolve(dirname(resolve(ROOT, importer)), request).slice(ROOT.length + 1));
  else return null;
  if (/\.(?:ts|tsx|js|jsx)$/u.test(base) && snapshot.exists(base)) return normalized(base);
  for (const suffix of SOURCE_EXTENSIONS) {
    const candidate = normalized(`${base}${suffix}`);
    if (snapshot.exists(candidate)) return candidate;
  }
  return null;
}

function runtimeDependencies(snapshot: Snapshot, path: string): string[] {
  const source = snapshot.read(path);
  const scriptKind = path.endsWith(".tsx") ? ts.ScriptKind.TSX
    : path.endsWith(".jsx") ? ts.ScriptKind.JSX
      : path.endsWith(".js") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
  const requests = new Set<string>();
  const add = (request: string) => {
    const resolved = resolveModule(snapshot, path, request);
    if (resolved) requests.add(resolved);
  };
  file.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly) return;
      let runtime = clause == null || clause?.name != null;
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) runtime = true;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some((item) => !item.isTypeOnly)) runtime = true;
      if (runtime) add(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
      && !node.isTypeOnly) {
      add(node.moduleSpecifier.text);
    }
  });
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        add(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...requests].sort();
}

function audit(snapshot: Snapshot): Json {
  const graph = new Map<string, string[]>();
  const dependencies = (path: string): string[] => {
    const existing = graph.get(path);
    if (existing) return existing;
    const value = runtimeDependencies(snapshot, path);
    graph.set(path, value);
    return value;
  };
  const routes = snapshot.appEntries().sort();
  invariant(routes.length > 0, `R58_IMPORT_GRAPH_APP_ROUTES_MISSING:${snapshot.label}`);
  invariant(snapshot.exists(ADDITIONAL_ENTRY), `R58_IMPORT_GRAPH_REQUEST_SCREEN_MISSING:${snapshot.label}`);
  const targetEntries = Object.entries(TARGETS);
  const routeHits: Record<string, Json[]> = Object.fromEntries(targetEntries.map(([name]) => [name, []]));
  let requestScreen: Json = {};

  const traverse = (entry: string): Record<string, string[]> => {
    const queue = [entry];
    const previous = new Map<string, string | null>([[entry, null]]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const dependency of dependencies(current)) {
        if (previous.has(dependency)) continue;
        previous.set(dependency, current);
        queue.push(dependency);
      }
    }
    return Object.fromEntries(targetEntries.flatMap(([name, target]) => {
      if (!previous.has(target)) return [];
      const chain: string[] = [];
      let cursor: string | null = target;
      while (cursor) {
        chain.push(cursor);
        cursor = previous.get(cursor) ?? null;
      }
      return [[name, chain.reverse()]];
    }));
  };

  for (const route of routes) {
    const hits = traverse(route);
    for (const [name, chain] of Object.entries(hits)) routeHits[name].push({ route, chain });
  }
  requestScreen = traverse(ADDITIONAL_ENTRY);
  const counts = Object.fromEntries(targetEntries.map(([name]) => [name, routeHits[name].length]));
  return {
    snapshot: snapshot.label,
    appRouteEntries: routes.length,
    graphModulesVisited: graph.size,
    productionAppRoutesReaching: counts,
    routeChains: routeHits,
    consumerRepairRequestScreenChains: requestScreen,
  };
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function main(): void {
  const compareRef = argument("compare-ref", "9cb592e21240a5fccf1ae92daccd900120fe03b2");
  const output = resolve(argument("output",
    ".release-runtime/p0-one-monolith-r58/evidence/03-source-graph/R58_PRODUCTION_ROUTE_COMPILER_REACHABILITY.json"));
  const before = audit(gitSnapshot(compareRef));
  const after = audit(worktreeSnapshot());
  const afterCounts = after.productionAppRoutesReaching as Record<string, number>;
  const requestChains = after.consumerRepairRequestScreenChains as Record<string, string[]>;
  const sourceFiles = listWorktreeFiles(resolve(ROOT, "src"))
    .filter((path) => /\.(?:ts|tsx|js|jsx)$/u.test(path) && !/\.(?:test|spec)\./u.test(path));
  const canonicalBackendOwnerFiles = sourceFiles.filter((path) =>
    /invoke<[^>]+>\("jobs\/compile"/u.test(readFileSync(resolve(ROOT, path), "utf8")));
  const requestService = readFileSync(
    resolve(ROOT, "src/lib/consumerRequests/consumerRequestService.ts"),
    "utf8",
  );
  const requestActions = readFileSync(
    resolve(ROOT, "src/features/consumerRepair/requestEstimateScreenActions.ts"),
    "utf8",
  );
  const frontendProfessionalRevisionWriters = Object.values(afterCounts)
    .reduce((total, count) => total + count, 0);
  const legacyRequestFallbackReachable = Object.keys(requestChains).length > 0
    || requestService.includes("createAiEstimateRuntime")
    || requestActions.includes("consumerRepairAiAdapter")
    || requestActions.includes("buildConsumerRepairDraftFromAiEstimateRuntime");
  const blockers = Object.entries(afterCounts).filter(([, count]) => count !== 0)
    .map(([name, count]) => `PRODUCTION_ROUTES_REACH_${name}:${count}`);
  blockers.push(...Object.keys(requestChains).map((name) => `REQUEST_SCREEN_REACHES_${name}`));
  if (frontendProfessionalRevisionWriters !== 0) {
    blockers.push(`FRONTEND_PROFESSIONAL_REVISION_WRITERS:${frontendProfessionalRevisionWriters}`);
  }
  if (canonicalBackendOwnerFiles.length !== 1) {
    blockers.push(`CANONICAL_BACKEND_PROFESSIONAL_REVISION_OWNERS:${canonicalBackendOwnerFiles.length}`);
  }
  if (legacyRequestFallbackReachable) blockers.push("LEGACY_REQUEST_ESTIMATE_FALLBACK_REACHABLE");
  const evidence = {
    schemaVersion: "p0-one-monolith-r58-production-route-compiler-reachability.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    compareRef,
    targets: TARGETS,
    before,
    after,
    acceptance: {
      production_app_routes_reaching_compileProductionExpandedEstimate10000:
        afterCounts.compileProductionExpandedEstimate10000,
      production_app_routes_reaching_buildEstimateFromInlineWorkPrompt:
        afterCounts.buildEstimateFromInlineWorkPrompt,
      production_app_routes_reaching_createEstimateDraftRevision:
        afterCounts.createEstimateDraftRevision,
      production_app_routes_reaching_migrateExistingEstimatesToCanonicalBackend:
        afterCounts.migrateExistingEstimatesToCanonicalBackend,
      frontend_professional_revision_writers: frontendProfessionalRevisionWriters,
      canonical_backend_professional_revision_owner: canonicalBackendOwnerFiles.length,
      canonical_backend_professional_revision_owner_files: canonicalBackendOwnerFiles,
      legacy_request_estimate_fallback_reachable: legacyRequestFallbackReachable,
    },
    blockers,
    status: blockers.length === 0 ? "GREEN_R58_PRODUCTION_ROUTE_CLIENT_COMPILER_REACHABILITY_ZERO" : "RED_R58_CLIENT_COMPILER_REACHABLE",
  };
  const body = `${JSON.stringify(evidence, null, 2)}\n`;
  writeAtomic(output, body);
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    output,
    sha256: createHash("sha256").update(body).digest("hex"),
    before: (before.productionAppRoutesReaching as Json),
    after: afterCounts,
    blockers,
  }, null, 2)}\n`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
