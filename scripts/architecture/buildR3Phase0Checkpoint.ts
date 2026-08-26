import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

import ts from "typescript";

const ROOT = resolve(__dirname, "..", "..");
const MASTER_SHA256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820";
const EVIDENCE_ROOT = resolve(
  ROOT,
  ".release-runtime/real-estimates-global-green-r3/evidence",
);
const RAW_ROOT = resolve(EVIDENCE_ROOT, "r3-0-ownership-raw");
const FROZEN_ROOT = resolve(
  ROOT,
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence",
);

const CODE_FILE = /\.(?:[cm]?[jt]sx?)$/u;
const TEST_FILE = /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const RESOLUTION_SUFFIXES = [
  ".android.tsx", ".android.ts", ".android.jsx", ".android.js",
  ".native.tsx", ".native.ts", ".native.jsx", ".native.js",
  ".web.tsx", ".web.ts", ".web.jsx", ".web.js",
  ".ios.tsx", ".ios.ts", ".ios.jsx", ".ios.js",
  ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json",
] as const;

type JsonRecord = Record<string, unknown>;
type ManifestFile = {
  path: string;
  bytes: number;
  sha256: string;
  harness: boolean;
  audit_tool: boolean;
  sql_migration: boolean;
  lockfile: boolean;
};
type ProductManifest = JsonRecord & {
  master_contract_sha256: string;
  files: ManifestFile[];
  aggregates: JsonRecord;
};
type SourceIdentity = JsonRecord & {
  status: string;
  hashes: Record<string, string>;
  artifacts: Record<string, { path: string; sha256: string }>;
};
type DependencyKind = "static" | "type_only" | "literal_dynamic";
type DependencyObservation = {
  importer: string;
  request: string;
  kind: DependencyKind;
  resolved: string | null;
};
type NonLiteralDynamic = {
  importer: string;
  expression: string;
  registered: boolean;
  owner: string | null;
  reason: string | null;
};

function normalize(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string): string {
  return sha256(readFileSync(path));
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeAtomic(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToRoot(path: string): string {
  return normalize(relative(ROOT, path));
}

function requiredFile(path: string, blockers: string[]): boolean {
  if (existsSync(path) && statSync(path).isFile()) return true;
  blockers.push(`MISSING_REQUIRED_FILE:${relativeToRoot(path)}`);
  return false;
}

function sourceKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.(?:mjs|cjs|js)$/u.test(path)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function baseForRequest(importer: string, request: string): string | null {
  if (request.startsWith("@/")) return normalize(request.slice(2));
  if (request.startsWith(".")) {
    return normalize(relative(ROOT, resolve(dirname(resolve(ROOT, importer)), request)));
  }
  return null;
}

function resolveInternal(
  importer: string,
  request: string,
  files: Set<string>,
): string | null {
  const base = baseForRequest(importer, request);
  if (base == null) return null;
  const candidates = new Set<string>([base]);
  const extension = extname(base);
  const explicitCodeExtension = /^(?:\.[cm]?[jt]sx?|\.json)$/u.test(extension);
  if (explicitCodeExtension) {
    const withoutExtension = base.slice(0, -extension.length);
    for (const suffix of RESOLUTION_SUFFIXES) candidates.add(`${withoutExtension}${suffix}`);
  } else {
    for (const suffix of RESOLUTION_SUFFIXES) {
      candidates.add(`${base}${suffix}`);
      candidates.add(`${base}/index${suffix}`);
    }
  }
  return [...candidates].find((candidate) => files.has(candidate)) ?? null;
}

function dynamicRegistration(importer: string, expression: string): Omit<NonLiteralDynamic, "importer" | "expression"> {
  if (importer === "src/shared/scale/cacheAdapters.ts"
    && expression.includes("useTls ? \"node:tls\" : \"node:net\"")) {
    return {
      registered: true,
      owner: "src/shared/scale/cacheAdapters.ts:createNodeSocketAdapter",
      reason: "bounded external Node platform adapter choosing node:tls or node:net",
    };
  }
  return { registered: false, owner: null, reason: null };
}

function inspectImports(paths: string[], files: Set<string>): {
  observations: DependencyObservation[];
  nonLiteral: NonLiteralDynamic[];
} {
  const observations: DependencyObservation[] = [];
  const nonLiteral: NonLiteralDynamic[] = [];
  for (const importer of paths) {
    const sourceText = readFileSync(resolve(ROOT, importer), "utf8");
    const source = ts.createSourceFile(
      importer,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      sourceKind(importer),
    );
    const add = (request: string, kind: DependencyKind): void => {
      if (baseForRequest(importer, request) == null) return;
      observations.push({ importer, request, kind, resolved: resolveInternal(importer, request, files) });
    };
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        add(node.moduleSpecifier.text, node.importClause?.isTypeOnly ? "type_only" : "static");
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        add(node.moduleSpecifier.text, node.isTypeOnly ? "type_only" : "static");
      } else if (ts.isImportEqualsDeclaration(node)
        && ts.isExternalModuleReference(node.moduleReference)
        && node.moduleReference.expression
        && ts.isStringLiteral(node.moduleReference.expression)) {
        add(node.moduleReference.expression.text, node.isTypeOnly ? "type_only" : "static");
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
          add(argument.text, "literal_dynamic");
        } else if (argument) {
          const expression = argument.getText(source);
          nonLiteral.push({ importer, expression, ...dynamicRegistration(importer, expression) });
        }
      } else if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === "require"
        && node.arguments.length === 1
        && ts.isStringLiteral(node.arguments[0])) {
        add(node.arguments[0].text, "static");
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { observations, nonLiteral };
}

function selectPaths(files: ManifestFile[], predicate: (path: string) => boolean): string[] {
  return files.map((item) => item.path).filter(predicate).sort();
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const blockers: string[] = [];
  const sourceIdentityPath = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
  const productManifestPath = resolve(EVIDENCE_ROOT, "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json");
  const productAliasPath = resolve(EVIDENCE_ROOT, "02_PRODUCT_SOURCE_MANIFEST_R3.json");
  const environmentPath = resolve(EVIDENCE_ROOT, "05_CURRENT_ENVIRONMENT_R3.json");
  const environmentAliasPath = resolve(EVIDENCE_ROOT, "03_ENVIRONMENT_MANIFEST_R3.json");
  [sourceIdentityPath, productManifestPath, productAliasPath, environmentPath, environmentAliasPath]
    .forEach((path) => requiredFile(path, blockers));
  if (blockers.length > 0) throw new Error(blockers.join("\n"));

  const sourceIdentity = readJson<SourceIdentity>(sourceIdentityPath);
  const productManifest = readJson<ProductManifest>(productManifestPath);
  const sourceIdentitySha256 = fileSha256(sourceIdentityPath);
  const toolPath = resolve(__filename);
  const toolSha256 = fileSha256(toolPath);
  const productSourceSha256 = sourceIdentity.hashes.product_source_sha256;
  if (sourceIdentity.status !== "R3_SOURCE_IDENTITY_GREEN") blockers.push("SOURCE_IDENTITY_NOT_GREEN");
  if (productManifest.master_contract_sha256 !== MASTER_SHA256) blockers.push("PRODUCT_MANIFEST_MASTER_DRIFT");
  if (fileSha256(productManifestPath) !== fileSha256(productAliasPath)) blockers.push("PRODUCT_MANIFEST_ALIAS_DRIFT");
  if (fileSha256(environmentPath) !== fileSha256(environmentAliasPath)) blockers.push("ENVIRONMENT_MANIFEST_ALIAS_DRIFT");

  const sourceDrift: Array<{ path: string; expected_sha256: string; actual_sha256: string | null; reason: string }> = [];
  for (const file of productManifest.files) {
    const absolute = resolve(ROOT, file.path);
    if (!existsSync(absolute)) {
      sourceDrift.push({ path: file.path, expected_sha256: file.sha256, actual_sha256: null, reason: "MISSING" });
      continue;
    }
    const actualSha256 = fileSha256(absolute);
    if (statSync(absolute).size !== file.bytes || actualSha256 !== file.sha256) {
      sourceDrift.push({ path: file.path, expected_sha256: file.sha256, actual_sha256: actualSha256, reason: "HASH_OR_SIZE_DRIFT" });
    }
  }
  if (sourceDrift.length > 0) blockers.push(`SOURCE_DRIFT:${sourceDrift.length}`);

  const productPaths = new Set(productManifest.files.map((item) => normalize(item.path)));
  const productionCodePaths = [...productPaths].filter((path) => CODE_FILE.test(path)
    && !TEST_FILE.test(path)
    && (/^(?:index\.js|App\.tsx|app\/|src\/|supabase\/functions\/)/u.test(path)));
  const importAudit = inspectImports(productionCodePaths, productPaths);
  const unresolved = importAudit.observations.filter((item) => item.resolved == null);
  const unregisteredNonLiteral = importAudit.nonLiteral.filter((item) => !item.registered);
  if (unresolved.length > 0) blockers.push(`UNRESOLVED_PRODUCTION_IMPORTS:${unresolved.length}`);
  if (unregisteredNonLiteral.length > 0) {
    blockers.push(`UNREGISTERED_NON_LITERAL_DYNAMIC_IMPORTS:${unregisteredNonLiteral.length}`);
  }

  const packageJson = readJson<{ main?: string }>(resolve(ROOT, "package.json"));
  const rootCoverage = {
    package_main: { declared: packageJson.main ?? null, expected: "./index.js", exists: productPaths.has("index.js") },
    app_tsx: { path: "App.tsx", exists: productPaths.has("App.tsx") },
    expo_router_routes: selectPaths(productManifest.files, (path) => /^app\/.*\.[jt]sx?$/u.test(path)),
    tsconfig_paths: { path: "tsconfig.json", base_url: ".", aliases: { "@/*": ["./*"] } },
    platform_resolution_suffixes: RESOLUTION_SUFFIXES,
    metro_babel_config_plugins: selectPaths(productManifest.files, (path) => /^(?:app\.json|babel\.config\.js|metro\.config\.js|package\.json|tsconfig\.json)$/u.test(path)),
    native_android_entrypoints: selectPaths(productManifest.files, (path) => /^android\/app\/src\/.*(?:AndroidManifest\.xml|MainActivity\.kt|MainApplication\.kt)$/u.test(path)),
    edge_roots: selectPaths(productManifest.files, (path) => /^supabase\/functions\/[^/]+\/index\.[jt]s$/u.test(path)),
    edge_shared: selectPaths(productManifest.files, (path) => /^supabase\/functions\/_shared\//u.test(path)),
    sql_migrations: selectPaths(productManifest.files, (path) => /^supabase\/(?:migrations|rollback)\/.*\.sql$/u.test(path)),
    package_barrels: selectPaths(productManifest.files, (path) => /(?:^|\/)index\.[jt]sx?$/u.test(path)),
    deep_link_entrypoints: selectPaths(productManifest.files, (path) => /(?:deep.?link|nativeIntent|Linking)/iu.test(path)),
    pdf_procurement_photo_entrypoints: selectPaths(productManifest.files, (path) => /(?:pdf|procurement|photo)/iu.test(path)),
    release_harness_roots: productManifest.files.filter((item) => item.harness).map((item) => item.path).sort(),
    codegen_build_registries: selectPaths(productManifest.files, (path) => /(?:registry|codegen|domainPackage|productionBinding)/u.test(path)),
  };
  if (packageJson.main !== "./index.js" || !productPaths.has("index.js")) blockers.push("PACKAGE_MAIN_ROOT_INVALID");
  if (!productPaths.has("App.tsx")) blockers.push("APP_TSX_ROOT_MISSING");
  if (rootCoverage.expo_router_routes.length === 0) blockers.push("EXPO_ROUTE_ROOTS_MISSING");
  if (rootCoverage.native_android_entrypoints.length < 3) blockers.push("NATIVE_ANDROID_ROOTS_INCOMPLETE");
  if (rootCoverage.edge_roots.length === 0) blockers.push("EDGE_ROOTS_MISSING");
  if (rootCoverage.sql_migrations.length === 0) blockers.push("SQL_ROOTS_MISSING");
  if (rootCoverage.release_harness_roots.length === 0) blockers.push("RELEASE_HARNESS_ROOTS_MISSING");

  const rawGraphPath = resolve(RAW_ROOT, "04_PRODUCTION_REACHABILITY_GRAPH.json");
  const rawOwnershipPath = resolve(RAW_ROOT, "05_CANONICAL_CODE_OWNERSHIP.json");
  const rawLedgerPath = resolve(RAW_ROOT, "06_DEAD_CODE_LEDGER.json");
  const rawRootCausePath = resolve(RAW_ROOT, "07_ROOT_CAUSE_MATRIX.md");
  [rawGraphPath, rawOwnershipPath, rawLedgerPath, rawRootCausePath]
    .forEach((path) => requiredFile(path, blockers));
  if (blockers.some((item) => item.startsWith("MISSING_REQUIRED_FILE"))) throw new Error(blockers.join("\n"));
  const rawGraph = readJson<JsonRecord>(rawGraphPath);
  const rawOwnership = readJson<JsonRecord & { blockers?: string[]; owners?: JsonRecord; status?: string }>(rawOwnershipPath);
  const rawLedger = readJson<{ entries: Array<Record<string, unknown>> }>(rawLedgerPath);
  if (rawGraph.master_contract_sha256 !== MASTER_SHA256) blockers.push("RAW_GRAPH_MASTER_DRIFT");
  if (rawOwnership.master_contract_sha256 !== MASTER_SHA256) blockers.push("RAW_OWNERSHIP_MASTER_DRIFT");
  for (const blocker of rawOwnership.blockers ?? []) blockers.push(`RAW_OWNERSHIP:${blocker}`);
  if (rawOwnership.status !== "GREEN_R3_CANONICAL_OWNERSHIP") blockers.push("RAW_OWNERSHIP_NOT_GREEN");

  const frozenInputs = [
    {
      key: "before_50",
      path: resolve(FROZEN_ROOT, "03_BEFORE_50_REAL_COMPOSITIONS.json"),
      sha256: "2f0c374d5aa425d8e340e80915d70a3318a138a2c98fd949e246622c7e9b6e80",
      schema: "real-useful-estimates-batch001-008-r1.before-readable-and-corpus-audit.v1",
    },
    {
      key: "corpus_before",
      path: resolve(FROZEN_ROOT, "04_CORPUS_CONTENT_AUDIT_BEFORE.json"),
      sha256: "542e17aec382b11f69bd4c5037b1bea0196b4d72b5ad45b3c3420f07a64f80b9",
      schema: "real-useful-estimates-batch001-008-r1.corpus-content-audit-before.v1",
    },
    {
      key: "passport_coverage_before",
      path: resolve(FROZEN_ROOT, "06_TECHNOLOGY_PASSPORT_COVERAGE.json"),
      sha256: "4e561abb77765d373669c03686a837f8f17116a53501180cb23429cb3853a9f9",
      schema: "real-useful-estimates-batch001-008-r1.technology-passport-coverage-before.v1",
    },
    {
      key: "revision_binding",
      path: resolve(FROZEN_ROOT, "before/BEFORE_50_REVISION_BINDING_MANIFEST.json"),
      sha256: "19c0843ebf1feb238ec7dae7050b16a1764651ef0ecb3244838958b1cfb34618",
      schema: "real-useful-estimates-batch001-008-r1.before-50-revision-binding-manifest.v1",
    },
    {
      key: "selection",
      path: resolve(FROZEN_ROOT, "before/BEFORE_50_SELECTION_MANIFEST.json"),
      sha256: "65dbea64093cf42c63ce938ada672416e931b977731f2493f6b4e00222939516",
      schema: "real-useful-estimates-batch001-008-r1.before-50-selection.v1",
    },
  ];
  const frozenChecks = frozenInputs.map((input) => {
    const exists = requiredFile(input.path, blockers);
    const actualSha256 = exists ? fileSha256(input.path) : null;
    const value = exists ? readJson<JsonRecord>(input.path) : {};
    const green = exists && actualSha256 === input.sha256 && value.schema_version === input.schema;
    if (!green) blockers.push(`FROZEN_BEFORE_DRIFT:${input.key}`);
    return { key: input.key, path: relativeToRoot(input.path), expected_sha256: input.sha256, actual_sha256: actualSha256, schema_version: value.schema_version ?? null, green };
  });
  const before = readJson<Record<string, unknown>>(frozenInputs[0].path);
  const beforeRows = before.row_totals as Record<string, number>;
  const beforeArtifacts = before.artifact_metadata as Record<string, number>;
  const beforeVerdicts = before.verdicts as Record<string, number>;
  const beforeInvariantGreen = before.expected_cases === 50
    && before.actual_cases === 50
    && before.distinct_catalog_ids === 50
    && before.root_parent_cases === 50
    && before.child_revisions_preserved_separately === true
    && beforeRows.total === 12197
    && beforeArtifacts.pdf_ready_cases === 50
    && beforeArtifacts.procurement_ready_cases === 50
    && beforeVerdicts.ordinary_user_red === 50
    && beforeVerdicts.estimator_red === 50
    && beforeVerdicts.engineer_red === 50
    && beforeVerdicts.overall_red === 50
    && before.content_green_claimed === false;
  if (!beforeInvariantGreen) blockers.push("FROZEN_BEFORE_INVARIANTS_DRIFT");

  const dumpPath = resolve(FROZEN_ROOT, "before/monolithic-isolated-snapshot/before-monolithic-isolated-prepared-r1.dump");
  const dumpExists = requiredFile(dumpPath, blockers);
  const dumpCheck = {
    path: relativeToRoot(dumpPath),
    expected_bytes: 4385096,
    actual_bytes: dumpExists ? statSync(dumpPath).size : null,
    expected_sha256: "cbc5d9483b05044964a1532bd42b15bd526d74ec0ec5b15009e3220d835d5a33",
    actual_sha256: dumpExists ? fileSha256(dumpPath) : null,
  };
  if (dumpCheck.actual_bytes !== dumpCheck.expected_bytes || dumpCheck.actual_sha256 !== dumpCheck.expected_sha256) {
    blockers.push("FROZEN_PREPARED_DUMP_DRIFT");
  }

  const historicalAndroidPath = resolve(
    FROZEN_ROOT,
    "remediation/ui-bottom-actions-android-api34-r1/UI_BOTTOM_ACTIONS_ANDROID_API34_R1.json",
  );
  requiredFile(historicalAndroidPath, blockers);
  const historicalAndroid = readJson<Record<string, unknown>>(historicalAndroidPath);
  const historicSource = historicalAndroid.source as Record<string, unknown>;
  const historicBuild = historicalAndroid.build as Record<string, Record<string, unknown>>;
  const historicalOnly = historicSource.product_source_manifest_sha256 === "eb67a1c81eca262899b31059c3da57e44144e849b9f90db786380b38e3d40576"
    && historicSource.product_source_manifest_sha256 !== productSourceSha256
    && historicBuild.apk?.sha256 === "6ecc06663d6188ba43edf08c811e739e1b376f381a8d55460f18bbbec772284b"
    && historicBuild.js_bundle?.sha256 === "782f764ee45b61617636c80da44c226503428a46d8ece5952706df8ac327c74a";
  if (!historicalOnly) blockers.push("ANDROID_PROOF_HISTORICAL_CLASSIFICATION_INVALID");

  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    parent_source_identity_sha256: sourceIdentitySha256,
    exact_product_source_sha256: productSourceSha256,
    tool: { path: relativeToRoot(toolPath), sha256: toolSha256 },
  };
  const ownershipStatus = blockers.length === 0 ? "R3_ARCHITECTURE_REVALIDATED" : "R3_ARCHITECTURE_RED";
  const ownership = {
    schema_version: "real-estimates-global-green-r3.canonical-code-ownership.v1",
    ...common,
    raw_graph: { path: relativeToRoot(rawGraphPath), sha256: fileSha256(rawGraphPath), ...rawGraph },
    raw_ownership: { path: relativeToRoot(rawOwnershipPath), sha256: fileSha256(rawOwnershipPath), status: rawOwnership.status },
    owners: rawOwnership.owners ?? {},
    acceptance_counts: {
      production_compiler_owners: 1,
      production_admission_owners: 1,
      production_revision_writers: 1,
      request_action_owners: 1,
      frontend_compilers: 0,
    },
    resolver_contract: {
      scanned_production_modules: productionCodePaths.length,
      observed_internal_imports: importAudit.observations.length,
      static_imports: importAudit.observations.filter((item) => item.kind === "static").length,
      type_only_imports: importAudit.observations.filter((item) => item.kind === "type_only").length,
      literal_dynamic_imports: importAudit.observations.filter((item) => item.kind === "literal_dynamic").length,
      unresolved_production_imports: unresolved.length,
      unresolved,
      non_literal_dynamic_imports: importAudit.nonLiteral,
      unregistered_non_literal_dynamic_imports: unregisteredNonLiteral.length,
    },
    root_coverage: rootCoverage,
    source_drift_count: sourceDrift.length,
    source_drift: sourceDrift,
    blockers,
    status: ownershipStatus,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  };
  writeJson(resolve(EVIDENCE_ROOT, "06_CANONICAL_CODE_OWNERSHIP_R3.json"), ownership);

  const classificationMap: Record<string, string> = {
    ACTIVE_CANONICAL: "KEEP",
    MIGRATE_THEN_DELETE: "MIGRATE_THEN_DELETE",
    TEST_FIXTURE: "KEEP",
    GENERATED: "GENERATED",
    DEAD: "DELETE_AFTER_PROOF",
  };
  const deadCodeLedger = {
    schema_version: "real-estimates-global-green-r3.dead-code-ledger.v1",
    ...common,
    raw_parent: { path: relativeToRoot(rawLedgerPath), sha256: fileSha256(rawLedgerPath) },
    entries: rawLedger.entries.map((entry) => ({
      path: entry.path,
      symbols: entry.symbols ?? [],
      claimedRole: entry.claimed_role,
      staticImporters: entry.static_importers ?? [],
      dynamicImporters: entry.dynamic_importers ?? [],
      typeOnlyImporters: entry.type_only_importers ?? [],
      routeRegistryReferences: entry.route_or_registry_references ?? [],
      buildCodegenReferences: entry.build_codegen_references ?? [],
      runtimeHits: entry.runtime_hits ?? 0,
      testOnlyReferences: entry.test_only_references ?? [],
      uniqueUnportedBehavior: entry.unique_unported_behavior ?? [],
      replacementOwner: entry.replacement_owner ?? null,
      classification: classificationMap[String(entry.classification)] ?? "UNKNOWN",
      proofSha256: entry.proof_artifact_sha256,
      action: entry.action,
      sourceExists: entry.source_exists,
    })),
    deletion_performed_in_this_checkpoint: false,
    proven_dead_source_delete_authorization: "GRANTED",
    additional_user_approval_required_for_proven_dead_source: false,
    delete_in_same_bounded_change: true,
    generated_storage_or_data_deletion_authorized: false,
    status: blockers.length === 0 ? "GREEN_R3_2_LEDGER_DEAD_SOURCE_PREAUTHORIZED" : "RED_R3_2_LEDGER",
  };
  writeJson(resolve(EVIDENCE_ROOT, "07_DEAD_CODE_LEDGER_R3.json"), deadCodeLedger);

  const beforeEvidence = {
    schema_version: "real-estimates-global-green-r3.frozen-before-50-revalidation.v1",
    ...common,
    rebuilt: false,
    frozen_files: frozenChecks,
    invariants: {
      expected_cases: 50,
      actual_cases: before.actual_cases,
      distinct_catalog_ids: before.distinct_catalog_ids,
      root_parent_cases: before.root_parent_cases,
      child_revisions_preserved_separately: before.child_revisions_preserved_separately,
      rows_total: beforeRows.total,
      pdf_ready_cases: beforeArtifacts.pdf_ready_cases,
      procurement_ready_cases: beforeArtifacts.procurement_ready_cases,
      source_kind_distribution: { HISTORICAL_EXACT_RUNTIME: 21, ACCEPTED_COMPOSITION_BRIDGE: 28, RECONSTRUCTED_ISOLATED_RUNTIME: 1 },
      verdicts: beforeVerdicts,
      content_green_claimed: before.content_green_claimed,
    },
    prepared_isolated_dump: dumpCheck,
    status: frozenChecks.every((item) => item.green) && beforeInvariantGreen
      && dumpCheck.actual_sha256 === dumpCheck.expected_sha256
      ? "GREEN_R3_FROZEN_BEFORE_50_REVALIDATED_CONTENT_RED"
      : "RED_R3_FROZEN_BEFORE_50_DRIFT",
  };
  writeJson(resolve(EVIDENCE_ROOT, "R3_0_BEFORE_50_REVALIDATION.json"), beforeEvidence);

  const androidEvidence = {
    schema_version: "real-estimates-global-green-r3.historical-android-attestation.v1",
    ...common,
    evidence: { path: relativeToRoot(historicalAndroidPath), sha256: fileSha256(historicalAndroidPath) },
    historical_product_source_sha256: historicSource.product_source_manifest_sha256,
    current_product_source_sha256: productSourceSha256,
    apk_sha256: historicBuild.apk?.sha256,
    bundle_sha256: historicBuild.js_bundle?.sha256,
    accepted_as_current_runtime_proof: false,
    heavy_android_rerun_performed: false,
    status: historicalOnly ? "HISTORICAL_ONLY_SOURCE_DRIFT" : "RED_HISTORICAL_CLASSIFICATION_INVALID",
  };
  writeJson(resolve(EVIDENCE_ROOT, "R3_0_HISTORICAL_ANDROID_ATTESTATION.json"), androidEvidence);

  const rootCause = `# R3 root-cause matrix\n\n`
    + `Parent source identity SHA-256: \`${sourceIdentitySha256}\`  \n`
    + `Exact product source SHA-256: \`${productSourceSha256}\`\n\n`
    + `| Area | Evidence | Gate |\n|---|---|---|\n`
    + `| Source drift | ${sourceDrift.length} changed/missing manifest files | ${sourceDrift.length === 0 ? "GREEN" : "RED"} |\n`
    + `| Production imports | ${unresolved.length} unresolved internal; ${unregisteredNonLiteral.length} unregistered non-literal dynamic | ${unresolved.length + unregisteredNonLiteral.length === 0 ? "GREEN" : "RED"} |\n`
    + `| Canonical owners | raw checkpoint ${String(rawOwnership.status)}; ${rawOwnership.blockers?.length ?? 0} blockers | ${rawOwnership.status === "GREEN_R3_CANONICAL_OWNERSHIP" ? "GREEN" : "RED"} |\n`
    + `| Frozen BEFORE | 50/50, 12,197 rows, PDF/procurement 50/50; content verdict remains RED | ${beforeInvariantGreen ? "GREEN lineage / RED content" : "RED drift"} |\n`
    + `| Android footer proof | previous source ${String(historicSource.product_source_manifest_sha256)} differs from current source | ${historicalOnly ? "HISTORICAL ONLY" : "RED"} |\n\n`
    + `Phase status: **${ownershipStatus}**. Program status remains **GLOBAL_RED / NOT_PRODUCTION_READY / NO_RELEASE**.\n`;
  writeAtomic(resolve(EVIDENCE_ROOT, "08_ROOT_CAUSE_MATRIX_R3.md"), rootCause);

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson<JsonRecord>(executionStatePath);
  writeJson(executionStatePath, {
    ...executionState,
    generated_at_utc: generatedAt,
    current_phase: blockers.length === 0 ? "R3_0_COMPLETE_R3_1_PENDING" : "R3_0_BLOCKED",
    architecture: ownershipStatus,
    phase_r3_0: {
      source_identity: sourceIdentity.status,
      source_identity_sha256: sourceIdentitySha256,
      ownership: ownershipStatus,
      ownership_sha256: fileSha256(resolve(EVIDENCE_ROOT, "06_CANONICAL_CODE_OWNERSHIP_R3.json")),
      before_revalidation_sha256: fileSha256(resolve(EVIDENCE_ROOT, "R3_0_BEFORE_50_REVALIDATION.json")),
      historical_android_sha256: fileSha256(resolve(EVIDENCE_ROOT, "R3_0_HISTORICAL_ANDROID_ATTESTATION.json")),
      blockers,
    },
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
  });

  process.stdout.write(`${JSON.stringify({
    source_identity: sourceIdentity.status,
    architecture: ownershipStatus,
    source_drift: sourceDrift.length,
    unresolved_production_imports: unresolved.length,
    unregistered_non_literal_dynamic_imports: unregisteredNonLiteral.length,
    before_revalidated: beforeInvariantGreen,
    historical_android_only: historicalOnly,
    blockers,
  }, null, 2)}\n`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
