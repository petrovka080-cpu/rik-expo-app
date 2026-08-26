import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type OwnerDefinition = {
  id: string;
  implementationPaths: string[];
  requiredMarkers: Array<{ path: string; marker: string }>;
};

const ROOT = resolve(".");
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const OUTPUT = resolve(".release-runtime/r555/evidence/19_R555_ONE_CANONICAL_GRAPH_ALL_CONSUMERS.json");
const REACHABILITY_PATH = resolve(
  ".release-runtime/r555/evidence/18_R555_PRODUCTION_ROUTE_COMPILER_REACHABILITY.json",
);

const SERVER = "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts";
const CLIENT = "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts";
const REQUEST_ROUTE = "app/(tabs)/request/index.tsx";

const OWNERS: OwnerDefinition[] = [
  {
    id: "CanonicalCatalogOwner",
    implementationPaths: [SERVER, "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts"],
    requiredMarkers: [
      { path: SERVER, marker: "estimate_work_identity" },
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts", marker: "CanonicalEstimateDefinitionRegistry" },
    ],
  },
  {
    id: "CanonicalSearchOwner",
    implementationPaths: [SERVER, CLIENT],
    requiredMarkers: [
      { path: SERVER, marker: "estimate_search_document" },
      { path: CLIENT, marker: "searchCanonicalEstimateCatalog" },
    ],
  },
  {
    id: "CanonicalPrincipalResolver",
    implementationPaths: [SERVER, "src/lib/auth/protectedIdentity.ts"],
    requiredMarkers: [
      { path: SERVER, marker: "requireLocalPrincipal" },
      { path: "src/lib/auth/protectedIdentity.ts", marker: "classifyProtectedIdentity" },
    ],
  },
  {
    id: "CanonicalCapabilityAdmission",
    implementationPaths: ["src/lib/estimate/backendPlatform/estimateAdmissionR3.ts", SERVER],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts", marker: "evaluateEstimateAdmission" },
      { path: SERVER, marker: "evaluateEstimateAdmission" },
    ],
  },
  {
    id: "CanonicalEstimateCommandService",
    implementationPaths: [CLIENT, SERVER],
    requiredMarkers: [
      { path: CLIENT, marker: '"jobs/compile"' },
      { path: SERVER, marker: 'path.join("/") === "jobs/compile"' },
    ],
  },
  {
    id: "CanonicalCompiler",
    implementationPaths: ["src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", SERVER],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", marker: "compileCanonicalEstimateCore" },
      { path: SERVER, marker: "await compileCanonicalEstimateCore" },
    ],
  },
  {
    id: "CanonicalRevisionStore",
    implementationPaths: ["src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", SERVER],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts", marker: "buildCanonicalRevisionIdentity" },
      { path: SERVER, marker: "buildCanonicalRevisionCommitPayload" },
    ],
  },
  {
    id: "CanonicalResourceAndFormulaOwner",
    implementationPaths: [
      "src/lib/estimate/backendPlatform/estimateContentPassportR3.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    ],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/estimateContentPassportR3.ts", marker: "EstimateContentFormulaR3" },
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts", marker: "CanonicalEstimateResourceDefinition" },
    ],
  },
  {
    id: "CanonicalProjectionOwner",
    implementationPaths: ["src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts"],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts", marker: "adaptCanonicalRevisionToStructuredEstimate" },
    ],
  },
  {
    id: "CanonicalArtifactOwner",
    implementationPaths: ["src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts", CLIENT, SERVER],
    requiredMarkers: [
      { path: "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts", marker: "buildCanonicalProcurementProjection" },
      { path: CLIENT, marker: "buildCanonicalEstimateArtifact" },
      { path: SERVER, marker: "buildCanonicalArtifactMetadata" },
    ],
  },
  {
    id: "CanonicalWebAdapter",
    implementationPaths: [REQUEST_ROUTE, "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx"],
    requiredMarkers: [
      { path: REQUEST_ROUTE, marker: "ConsumerRepairRequestScreen" },
      { path: "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx", marker: "getCanonicalEstimateRevisionHistory" },
    ],
  },
  {
    id: "CanonicalAndroidAdapter",
    implementationPaths: ["index.js", REQUEST_ROUTE],
    requiredMarkers: [
      { path: "index.js", marker: 'import "expo-router/entry"' },
      { path: REQUEST_ROUTE, marker: "ConsumerRepairRequestScreen" },
    ],
  },
  {
    id: "CanonicalEvidenceOwner",
    implementationPaths: ["scripts/dev/r555Controller.mjs", "scripts/architecture/auditR555OneCanonicalGraphAllConsumers.ts"],
    requiredMarkers: [
      { path: "scripts/dev/r555Controller.mjs", marker: "ONE_CANONICAL_GRAPH_ALL_CONSUMERS" },
      { path: "scripts/architecture/auditR555OneCanonicalGraphAllConsumers.ts", marker: "MASTER_SHA256" },
    ],
  },
];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(path: string): string {
  return path.replace(/\\/gu, "/");
}

function readRepo(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? listFiles(absolute) : [normalize(relative(ROOT, absolute))];
  });
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function main(): void {
  const blockers: string[] = [];
  const masterBytes = readFileSync(MASTER_PATH);
  const actualMasterSha256 = sha256(masterBytes);
  if (actualMasterSha256 !== MASTER_SHA256) blockers.push(`MASTER_SHA_MISMATCH:${actualMasterSha256}`);

  const reachabilityBody = readFileSync(REACHABILITY_PATH, "utf8");
  const reachability = JSON.parse(reachabilityBody) as {
    status?: string;
    after?: { appRouteEntries?: number };
    acceptance?: Record<string, unknown>;
    blockers?: string[];
  };
  if (reachability.status !== "GREEN_R58_PRODUCTION_ROUTE_CLIENT_COMPILER_REACHABILITY_ZERO") {
    blockers.push(`ROUTE_REACHABILITY_NOT_GREEN:${String(reachability.status)}`);
  }
  if ((reachability.blockers ?? []).length !== 0) blockers.push("ROUTE_REACHABILITY_HAS_BLOCKERS");

  const ownerResults = OWNERS.map((owner) => {
    const missingPaths = owner.implementationPaths.filter((path) => !existsSync(resolve(ROOT, path)));
    const missingMarkers = owner.requiredMarkers.filter(({ path, marker }) =>
      !existsSync(resolve(ROOT, path)) || !readRepo(path).includes(marker));
    if (missingPaths.length > 0) blockers.push(`${owner.id}:MISSING_PATHS:${missingPaths.join(",")}`);
    if (missingMarkers.length > 0) blockers.push(`${owner.id}:MISSING_MARKERS:${missingMarkers.map((item) => item.marker).join(",")}`);
    return {
      ...owner,
      implementationPathSha256: Object.fromEntries(owner.implementationPaths
        .filter((path) => existsSync(resolve(ROOT, path)) && statSync(resolve(ROOT, path)).isFile())
        .map((path) => [path, sha256(readFileSync(resolve(ROOT, path)))])),
      status: missingPaths.length === 0 && missingMarkers.length === 0 ? "BOUND" : "RED",
    };
  });
  if (OWNERS.length !== 13) blockers.push(`CANONICAL_OWNER_COUNT:${OWNERS.length}`);
  if (new Set(OWNERS.map((owner) => owner.id)).size !== 13) blockers.push("CANONICAL_OWNER_IDS_NOT_UNIQUE");

  const productionFiles = ["index.js", ...listFiles(resolve(ROOT, "app")), ...listFiles(resolve(ROOT, "src"))]
    .filter((path) => /\.(?:ts|tsx|js|jsx)$/u.test(path) && !/\.(?:test|spec)\./u.test(path));
  const compileIngressFiles = productionFiles.filter((path) => readRepo(path).includes('"jobs/compile"'));
  if (compileIngressFiles.length !== 1 || compileIngressFiles[0] !== CLIENT) {
    blockers.push(`CANONICAL_COMPILE_INGRESS_FILES:${compileIngressFiles.join(",")}`);
  }
  const canonicalClientConsumers = productionFiles.filter((path) =>
    path !== CLIENT && readRepo(path).includes("canonicalEstimateClient"));
  if (!canonicalClientConsumers.includes("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")) {
    blockers.push("CONSUMER_REQUEST_SCREEN_NOT_BOUND_TO_CANONICAL_CLIENT");
  }

  const requestScreen = readRepo("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const artifactFromBackendRevision = requestScreen.includes("buildCanonicalEstimateArtifact")
    && requestScreen.includes("canonical.revisionId");
  if (!artifactFromBackendRevision) blockers.push("REQUEST_ARTIFACT_NOT_BOUND_TO_BACKEND_REVISION");

  const flow = [
    "source identity",
    "canonical catalog identity",
    "search document",
    "selected work",
    "authenticated principal",
    "capability/admission",
    "idempotent compile job",
    "immutable revision",
    "canonical BOQ rows",
    "history",
    "PDF/procurement",
    "Web/Android projections",
  ];
  const evidence = {
    schema_version: "rik-expo-app-r555.one-canonical-graph-all-consumers.v1",
    generated_utc: new Date().toISOString(),
    evidence_class: "CURRENT_DIAGNOSTIC",
    master: {
      path: normalize(MASTER_PATH),
      bytes: masterBytes.length,
      sha256: actualMasterSha256,
      expected_sha256: MASTER_SHA256,
    },
    owner_count: OWNERS.length,
    owners: ownerResults,
    canonical_flow: flow,
    production_graph: {
      app_route_entries: reachability.after?.appRouteEntries ?? null,
      legacy_compiler_reachability_status: reachability.status,
      legacy_compiler_reachability_receipt: normalize(relative(ROOT, REACHABILITY_PATH)),
      legacy_compiler_reachability_receipt_sha256: sha256(reachabilityBody),
      acceptance: reachability.acceptance ?? {},
      frontend_compile_ingress_count: compileIngressFiles.length,
      frontend_compile_ingress_files: compileIngressFiles,
      canonical_client_consumers: canonicalClientConsumers.sort(),
      request_artifact_from_backend_revision: artifactFromBackendRevision,
      web_android_shared_route: REQUEST_ROUTE,
    },
    deferred_not_claimed_by_this_phase: {
      cumulative_successor_apply: true,
      runtime_price_gate: true,
      full_typescript_static_gate: true,
      source_frozen: true,
      terminal_web_android_denominators: true,
      global_green: true,
    },
    blockers,
    status: blockers.length === 0
      ? "GREEN_R555_ONE_CANONICAL_GRAPH_ALL_CONSUMERS"
      : "RED_R555_ONE_CANONICAL_GRAPH_ALL_CONSUMERS",
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  const withoutPayloadHash = `${JSON.stringify(evidence, null, 2)}\n`;
  const body = `${JSON.stringify({ ...evidence, payload_sha256: sha256(withoutPayloadHash) }, null, 2)}\n`;
  writeAtomic(OUTPUT, body);
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    output: normalize(relative(ROOT, OUTPUT)),
    sha256: sha256(body),
    owner_count: OWNERS.length,
    frontend_compile_ingress_files: compileIngressFiles,
    canonical_client_consumer_count: canonicalClientConsumers.length,
    blockers,
  }, null, 2)}\n`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
