import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
type FileEntry = { path: string; kind: "file" | "symlink"; bytes: number; sha256: string };
type ConnectionSnapshot = {
  captured_at: string;
  label: string;
  total_connections: number;
  task_owned_runtime_connections: number;
  active: number;
  idle: number;
  idle_in_transaction: number;
  rows: { application_name: string; state: string; connections: number }[];
};

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
);
const CONTRACT_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const EVIDENCE = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002",
);
const PREDECESSOR = resolve(
  EVIDENCE,
  "archive/r55-pre-r56/matrix-7597073f6e88658222cd9251d90fe6e9834c2d38a4546ecb9d8c400643687507.json",
);
const BACKEND = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R55.json",
);
const CONTENT_ACCEPTANCE = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_R55_CONTENT_ACCEPTANCE.json",
);
const OUTPUT = resolve(EVIDENCE, "BATCH002_R55_ANDROID_API34_MATRIX_50_MANIFEST.json");
const CONNECTION_AUDIT = resolve(EVIDENCE, "MATRIX_BOOTSTRAP_CONNECTION_AUDIT.json");
const FINAL_BINDING = resolve(EVIDENCE, "FINAL_RELEASE_REVISION_BINDING_MANIFEST.json");
const COMPONENT_LEDGER = resolve(EVIDENCE, "COMPONENT_SOURCE_IDENTITY_AND_IMPACT_LEDGER.json");
const API_ROOT = String(process.env.BATCH002_R55_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8767/canonical-estimate").replace(/\/+$/u, "");
const DATABASE_URL = String(process.env.BATCH002_R55_DATABASE_URL
  ?? "postgresql://postgres:postgres@127.0.0.1:55434/batch002_r55_identity_final");
const BOOTSTRAP_CONCURRENCY = Number(process.env.BATCH002_R56_MATRIX_CONCURRENCY ?? "1");
const ACCEPTED_BACKEND_REPORT_SHA256 = "aa89fe47f59fe610dcd48cdff3a21706c0031f2fb73a00a6845b77037697d444";
const ACCEPTED_CONTENT_REPORT_SHA256 = "d08140abe4119d7318bdd364bf9e8430b7722aefba2f2e1fcbe9e7a0499694d4";
const ACCEPTED_SCENARIO_CANDIDATE_SHA256 = "7597073f6e88658222cd9251d90fe6e9834c2d38a4546ecb9d8c400643687507";
const RUNTIME_APPLICATION_NAME = "canonical-estimate-local-runtime-r1";
const AUDIT_APPLICATION_NAME = "batch002-r56-matrix-connection-audit";
const APP_ENVIRONMENT_CONTRACT = [
  { name: "NODE_ENV", class: "PUBLIC_BUILD_MODE", value: "production" },
  { name: "EXPO_PUBLIC_SUPABASE_URL", class: "PUBLIC_LOOPBACK_AUTH_ORIGIN", value: "http://10.0.2.2:8173" },
  { name: "EXPO_PUBLIC_SUPABASE_ANON_KEY", class: "LOCAL_PROOF_PUBLIC_KEY", value: "[redacted]" },
  { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", class: "PUBLIC_LOOPBACK_BACKEND_ORIGIN", value: "http://10.0.2.2:8767/canonical-estimate" },
  { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK", class: "LOOPBACK_ONLY_POLICY", value: "true" },
] as const;
const HARNESS_FILES = [
  "scripts/e2e/runBatch002R52AndroidApi34Matrix50.ts",
  "scripts/_shared/androidHarness.ts",
  "scripts/e2e/serveBatch002R4LocalSupabaseStub.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "scripts/e2e/buildBatch002R55AndroidMatrix50Manifest.ts",
  "scripts/e2e/buildBatch002R55AndroidProofManifest.ts",
  "scripts/e2e/runBatch002R54AndroidAuthBootstrapProof.ts",
  "scripts/e2e/runBatch002R55PhotoBackendContractProof.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Json)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function gitBuffer(...args: string[]): Buffer {
  return execFileSync("git", args, { cwd: process.cwd(), maxBuffer: 256 * 1024 * 1024 });
}

function git(...args: string[]): string {
  return gitBuffer(...args).toString("utf8").trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function contentAddressed<T extends Json>(value: T): T & { content_sha256: string } {
  return { ...value, content_sha256: sha256(canonical(value)) };
}

function repositoryPaths(): string[] {
  const listed = (args: string[]) => gitBuffer(...args).toString("utf8").split("\0").filter(Boolean);
  return [...new Set([
    ...listed(["-c", "core.quotePath=false", "ls-files", "-z"]),
    ...listed(["-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard", "-z"]),
  ])].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function fileEntries(paths: readonly string[]): FileEntry[] {
  return paths.map((path) => {
    const absolute = resolve(path);
    const info = lstatSync(absolute);
    if (info.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      return {
        path: relative(process.cwd(), absolute).replace(/\\/gu, "/"),
        kind: "symlink",
        bytes: Buffer.byteLength(target),
        sha256: sha256(target),
      };
    }
    invariant(info.isFile(), `BATCH002_R56_COMPONENT_INPUT_NOT_FILE:${path}`);
    const bytes = readFileSync(absolute);
    return {
      path: relative(process.cwd(), absolute).replace(/\\/gu, "/"),
      kind: "file",
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
}

function isAppBuildInput(path: string): boolean {
  const normalized = path.replace(/\\/gu, "/");
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(normalized) || normalized.includes("/__tests__/")) return false;
  return normalized.startsWith("app/")
    || normalized.startsWith("src/")
    || normalized.startsWith("assets/")
    || normalized.startsWith("android/")
    || [
      "index.js", "app.json", "package.json", "package-lock.json", "babel.config.js", "metro.config.js",
      "tsconfig.json", "expo-env.d.ts",
    ].includes(normalized);
}

function componentIdentity(name: string, files: FileEntry[], extra: Json = {}): Json {
  const inputs = { component: name, files, ...extra };
  return {
    component: name,
    input_entries: files.length,
    input_manifest_sha256: sha256(canonical(files)),
    state_id: sha256(canonical(inputs)),
    files,
    ...extra,
  };
}

let apiRequests = 0;
let tooManyConnections = 0;

async function api(path: string): Promise<Json> {
  apiRequests += 1;
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: "Bearer local-dev-runtime-token" },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  const databaseErrorCode = String(body?.error?.databaseCode ?? body?.error?.code ?? "");
  if (!response.ok && (response.status === 533 || response.status === 503
      || databaseErrorCode === "53300" || JSON.stringify(body).includes("too_many_connections"))) {
    tooManyConnections += 1;
  }
  invariant(response.ok && body, `BATCH002_R56_MATRIX_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body;
}

async function connectionSnapshot(client: Client, label: string): Promise<ConnectionSnapshot> {
  const rows = (await client.query(`select coalesce(application_name,'') application_name,
    coalesce(state,'unknown') state, count(*)::integer connections
    from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()
    group by application_name,state order by application_name,state`)).rows.map((row) => ({
    application_name: String(row.application_name),
    state: String(row.state),
    connections: Number(row.connections),
  }));
  const runtimeRows = rows.filter((row) => row.application_name === RUNTIME_APPLICATION_NAME);
  const countState = (state: string) => runtimeRows
    .filter((row) => row.state === state).reduce((sum, row) => sum + row.connections, 0);
  return {
    captured_at: new Date().toISOString(),
    label,
    total_connections: rows.reduce((sum, row) => sum + row.connections, 0),
    task_owned_runtime_connections: runtimeRows.reduce((sum, row) => sum + row.connections, 0),
    active: countState("active"),
    idle: countState("idle"),
    idle_in_transaction: countState("idle in transaction"),
    rows,
  };
}

async function beginConnectionAudit(): Promise<{
  finish: (bootstrapError: unknown) => Promise<Json>;
}> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: AUDIT_APPLICATION_NAME });
  await client.connect();
  const before = await connectionSnapshot(client, "before");
  let sampling = true;
  let samples = 1;
  let peak = before;
  let samplerError: unknown = null;
  const sampler = (async () => {
    while (sampling) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
      if (!sampling) break;
      try {
        const current = await connectionSnapshot(client, `sample-${samples}`);
        samples += 1;
        if (current.task_owned_runtime_connections > peak.task_owned_runtime_connections
          || current.total_connections > peak.total_connections) peak = current;
      } catch (error) {
        samplerError = error;
        sampling = false;
      }
    }
  })();

  return {
    finish: async (bootstrapError: unknown): Promise<Json> => {
      sampling = false;
      await sampler;
      let after = await connectionSnapshot(client, "after-0");
      for (let attempt = 1; attempt <= 20 && after.task_owned_runtime_connections > 0; attempt += 1) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
        after = await connectionSnapshot(client, `after-${attempt}`);
      }
      await client.end();
      const base = {
        schema_version: "real-professional-estimates-r5.6.matrix-bootstrap-connection-audit.v1",
        generated_at: new Date().toISOString(),
        contract_sha256: CONTRACT_SHA256,
        database_name: "batch002_r55_identity_final",
        audit_application_name: AUDIT_APPLICATION_NAME,
        runtime_application_name: RUNTIME_APPLICATION_NAME,
        requested_case_concurrency: BOOTSTRAP_CONCURRENCY,
        actual_case_concurrency: 1,
        api_reads_per_case: 4,
        unbounded_promise_all: false,
        api_requests: apiRequests,
        samples,
        before,
        peak,
        after,
        too_many_connections_53300: tooManyConnections,
        leaked_task_owned_connections: after.task_owned_runtime_connections,
        sampler_error: samplerError instanceof Error ? samplerError.message : samplerError ? String(samplerError) : null,
        bootstrap_error: bootstrapError instanceof Error ? bootstrapError.message : bootstrapError ? String(bootstrapError) : null,
        status: !bootstrapError && !samplerError && tooManyConnections === 0
          && after.task_owned_runtime_connections === 0
          ? "GREEN_R56_MATRIX_BOOTSTRAP_CONNECTIONS_BOUNDED_NO_LEAKS"
          : "RED_R56_MATRIX_BOOTSTRAP_CONNECTION_AUDIT",
      };
      const result = contentAddressed(base);
      atomicJson(CONNECTION_AUDIT, result);
      return result;
    },
  };
}

function acceptedRowOracle(card: Json, rowId: string): Json | null {
  const rows = [
    ...(card.materials ?? []),
    ...(card.construction_operations ?? []),
    ...(card.conditional_equipment ?? []),
    ...(card.consolidated_logistics ?? []),
    ...(card.billable_services ?? []),
  ] as Json[];
  return rows.find((row) => row.row_id === rowId) ?? null;
}

async function refreshCase(caseDefinition: Json, proof: Json, releaseId: string, card: Json): Promise<Json> {
  invariant(proof?.finalRevisionId, `BATCH002_R56_MATRIX_BACKEND_PROOF_MISSING:${caseDefinition.catalogId}`);
  const revisionId = String(proof.finalRevisionId);
  const catalogResponse = await api(`catalog/${caseDefinition.catalogId}`);
  const revision = await api(`revisions/${revisionId}`);
  const rowResponse = await api(`revisions/${revisionId}/rows?limit=200`);
  const parameterSession = await api(`revisions/${revisionId}/parameter-session`);
  const catalog = catalogResponse.item as Json;
  const rows = rowResponse.rows as Json[];
  invariant(revision.revisionId === revisionId && revision.catalogId === caseDefinition.catalogId,
    `BATCH002_R56_MATRIX_REVISION_IDENTITY_RED:${caseDefinition.catalogId}`);
  invariant(revision.releaseId === releaseId && catalog.releaseId === releaseId,
    `BATCH002_R56_MATRIX_RELEASE_IDENTITY_RED:${caseDefinition.catalogId}`);
  invariant(catalog.titleRu === card.title_ru, `BATCH002_R56_MATRIX_TITLE_ORACLE_RED:${caseDefinition.catalogId}`);
  invariant(Array.isArray(rows) && rows.length === Number(proof.visibleRows),
    `BATCH002_R56_MATRIX_ROW_DENOMINATOR_RED:${caseDefinition.catalogId}`);

  const oldParameter = caseDefinition.parameter as Json;
  const parameterOracle = (card.public_parameters as Json[])
    .find((entry) => entry.parameter_id === oldParameter.parameterId);
  invariant(parameterOracle, `BATCH002_R56_MATRIX_PARAMETER_ORACLE_MISSING:${caseDefinition.catalogId}:${oldParameter.parameterId}`);
  const parameterSchema = catalog.parameterSchema as Json[];
  const parameter = parameterSchema.find((entry) => entry.parameterId === oldParameter.parameterId);
  invariant(parameter, `BATCH002_R56_MATRIX_PARAMETER_MISSING:${caseDefinition.catalogId}:${oldParameter.parameterId}`);
  invariant(parameter.titleRu === parameterOracle.title_ru,
    `BATCH002_R56_MATRIX_PARAMETER_ORACLE_RED:${caseDefinition.catalogId}:${oldParameter.parameterId}`);
  invariant(typeof parameterOracle.unit_id === "string" && parameterOracle.unit_id.length > 0,
    `BATCH002_R56_MATRIX_PARAMETER_UOM_ORACLE_MISSING:${caseDefinition.catalogId}:${oldParameter.parameterId}`);
  const actualBaselineValue = Number(revision.parameters?.[parameter.parameterId]);
  const frozenBaselineValue = Number(oldParameter.baselineValue);
  const changedValue = Number(oldParameter.changedValue);
  invariant(Number.isFinite(actualBaselineValue) && Number.isFinite(frozenBaselineValue)
    && Math.abs(actualBaselineValue - frozenBaselineValue) <= 1e-9
    && Number.isFinite(changedValue) && frozenBaselineValue !== changedValue,
    `BATCH002_R56_MATRIX_PARAMETER_VALUE_ORACLE_RED:${caseDefinition.catalogId}:${parameter.parameterId}`);

  const oldMaterial = caseDefinition.materialRow as Json;
  const rowOracle = acceptedRowOracle(card, String(oldMaterial.rowId));
  invariant(rowOracle, `BATCH002_R56_MATRIX_ROW_ORACLE_MISSING:${caseDefinition.catalogId}:${oldMaterial.rowId}`);
  const material = rows.find((row) => row.rowId === oldMaterial.rowId && String(row.rowId).includes(":material:"));
  invariant(material, `BATCH002_R56_MATRIX_MATERIAL_ROW_MISSING:${caseDefinition.catalogId}:${oldMaterial.rowId}`);
  invariant(material.titleRu === rowOracle.title_ru && (material.unitId ?? null) === (rowOracle.unit_id ?? null),
    `BATCH002_R56_MATRIX_MATERIAL_ORACLE_RED:${caseDefinition.catalogId}:${oldMaterial.rowId}`);
  const goldFixtureQuantity = Number(rowOracle.gold_quantity);
  const frozenRevisionQuantity = Number(oldMaterial.quantity);
  const frozenUnitPrice = Number(oldMaterial.unitPrice);
  invariant(Number.isFinite(goldFixtureQuantity) && goldFixtureQuantity > 0
    && Number.isFinite(frozenRevisionQuantity) && frozenRevisionQuantity > 0
    && Number.isFinite(frozenUnitPrice) && frozenUnitPrice >= 0
    && Math.abs(Number(material.quantity) - frozenRevisionQuantity) <= 1e-9
    && Math.abs(Number(material.unitPrice) - frozenUnitPrice) <= 1e-9,
  `BATCH002_R56_MATRIX_MATERIAL_VALUE_ORACLE_RED:${caseDefinition.catalogId}:${oldMaterial.rowId}:${canonical({
    actual_quantity: material.quantity,
    frozen_revision_quantity: frozenRevisionQuantity,
    gold_fixture_quantity: goldFixtureQuantity,
    actual_unit_price: material.unitPrice,
    frozen_unit_price: frozenUnitPrice,
  })}`);
  invariant(parameterSession.revision?.revisionId === revisionId
    && parameterSession.catalog?.catalogId === caseDefinition.catalogId,
  `BATCH002_R56_MATRIX_PARAMETER_SESSION_RED:${caseDefinition.catalogId}`);

  const businessOracle = {
    source: "R55_ACCEPTED_CONTENT_CARD_PLUS_PREDECESSOR_FROZEN_SCENARIO",
    catalog_id: caseDefinition.catalogId,
    coverage: caseDefinition.coverage,
    physical_result: card.physical_result,
    parameter_id: parameterOracle.parameter_id,
    parameter_unit_id: parameterOracle.unit_id,
    changed_value: changedValue,
    row_id: rowOracle.row_id,
    semantic_owner_id: rowOracle.semantic_owner_id,
    row_unit_id: rowOracle.unit_id,
    row_gold_fixture_quantity: goldFixtureQuantity,
    row_expected_revision_quantity: frozenRevisionQuantity,
    row_unit_price: frozenUnitPrice,
    estimator_verdict: card.estimator_verdict?.status,
    construction_engineer_verdict: card.construction_engineer_verdict?.status,
    ordinary_user_clarity_verdict: card.ordinary_user_clarity_verdict?.status,
  };

  return {
    ...caseDefinition,
    titleRu: card.title_ru,
    parentRevisionId: revisionId,
    releaseId,
    expectedRowCount: rows.length,
    businessOracle,
    parameter: {
      ...oldParameter,
      titleRu: parameterOracle.title_ru,
      unitId: parameterOracle.unit_id,
      runtimeUnitIdObserved: parameter.unitId ?? null,
      guideShortRu: parameterOracle.guide_ru,
      baselineValue: frozenBaselineValue,
      changedValue,
    },
    materialRow: {
      ...oldMaterial,
      titleRu: rowOracle.title_ru,
      unitId: rowOracle.unit_id,
      semanticOwnerId: rowOracle.semantic_owner_id,
      quantity: frozenRevisionQuantity,
      unitPrice: frozenUnitPrice,
    },
  };
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "BATCH002_R56_MATRIX_CONTRACT_SHA_MISMATCH");
  invariant(Number.isInteger(BOOTSTRAP_CONCURRENCY) && BOOTSTRAP_CONCURRENCY === 1,
    `BATCH002_R56_MATRIX_CONCURRENCY_MUST_BE_ONE:${BOOTSTRAP_CONCURRENCY}`);
  if (existsSync(OUTPUT)) {
    const existing = JSON.parse(readFileSync(OUTPUT, "utf8")) as Json;
    invariant(existing.contract_sha256 !== CONTRACT_SHA256, "BATCH002_R56_MATRIX_ALREADY_FROZEN");
  }
  const predecessor = JSON.parse(readFileSync(PREDECESSOR, "utf8")) as Json;
  const backend = JSON.parse(readFileSync(BACKEND, "utf8")) as Json;
  const acceptance = JSON.parse(readFileSync(CONTENT_ACCEPTANCE, "utf8")) as Json;
  const head = git("rev-parse", "HEAD");
  const headTree = git("rev-parse", "HEAD^{tree}");
  invariant(sha256(readFileSync(BACKEND)) === ACCEPTED_BACKEND_REPORT_SHA256,
    "BATCH002_R56_ACCEPTED_BACKEND_REPORT_SHA_DRIFT");
  invariant(sha256(readFileSync(CONTENT_ACCEPTANCE)) === ACCEPTED_CONTENT_REPORT_SHA256,
    "BATCH002_R56_ACCEPTED_CONTENT_REPORT_SHA_DRIFT");
  invariant(sha256(readFileSync(PREDECESSOR)) === ACCEPTED_SCENARIO_CANDIDATE_SHA256,
    "BATCH002_R56_FROZEN_SCENARIO_CANDIDATE_SHA_DRIFT");
  invariant(backend.status === "GREEN_R55_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE",
    "BATCH002_R56_MATRIX_BACKEND_PARITY_RED");
  invariant(Array.isArray(backend.proofs) && backend.proofs.length === 55,
    "BATCH002_R56_MATRIX_BACKEND_DENOMINATOR_RED");
  invariant(acceptance.status === "GREEN_R55_BATCH002_CONTENT_ACCEPTED"
    && acceptance.metrics?.content_green === true && acceptance.cards?.length === 55,
  "BATCH002_R56_MATRIX_CONTENT_ACCEPTANCE_RED");
  invariant(acceptance.source_state_id === backend.sourceStateId
    && acceptance.definition_set_sha256 === backend.definitionSetSha256,
  "BATCH002_R56_MATRIX_BACKEND_CONTENT_IDENTITY_RED");
  invariant(Array.isArray(predecessor.cases) && predecessor.cases.length === 50,
    "BATCH002_R56_MATRIX_CASE_DENOMINATOR_MISMATCH");
  invariant(predecessor.status === "FROZEN_R55_BATCH002_ANDROID_MATRIX_50_CASES_PENDING_BUILD_AUTH_NO_RELEASE",
    "BATCH002_R56_MATRIX_SCENARIO_CANDIDATE_STATUS_RED");

  const proofByCatalog = new Map((backend.proofs as Json[]).map((proof) => [String(proof.catalogId), proof]));
  const cardByCatalog = new Map((acceptance.cards as Json[]).map((card) => [String(card.catalog_id), card]));
  const connectionAudit = await beginConnectionAudit();
  const cases: Json[] = [];
  let bootstrapError: unknown = null;
  try {
    for (const entry of predecessor.cases as Json[]) {
      cases.push(await refreshCase(
        entry,
        proofByCatalog.get(String(entry.catalogId)) as Json,
        String(backend.releaseId),
        cardByCatalog.get(String(entry.catalogId)) as Json,
      ));
    }
  } catch (error) {
    bootstrapError = error;
  }
  const connectionResult = await connectionAudit.finish(bootstrapError);
  invariant(!bootstrapError, bootstrapError instanceof Error ? bootstrapError.message : String(bootstrapError));
  invariant(connectionResult.status === "GREEN_R56_MATRIX_BOOTSTRAP_CONNECTIONS_BOUNDED_NO_LEAKS",
    "BATCH002_R56_MATRIX_CONNECTION_AUDIT_RED");
  invariant(new Set(cases.map((entry) => Number(entry.case))).size === 50,
    "BATCH002_R56_MATRIX_DUPLICATE_CASE_NUMBER");
  invariant(new Set(cases.map((entry) => String(entry.catalogId))).size === 50,
    "BATCH002_R56_MATRIX_DUPLICATE_CATALOG_ID");
  invariant(new Set(cases.map((entry) => String(entry.parentRevisionId))).size === 50,
    "BATCH002_R56_MATRIX_DUPLICATE_PARENT_REVISION");
  const businessOracleSha256 = sha256(canonical(cases.map((entry) => entry.businessOracle)));
  const casesContentSha256 = sha256(canonical(cases));

  const harnessFiles = fileEntries(HARNESS_FILES);
  const harnessStateInputs = {
    contract_sha256: CONTRACT_SHA256,
    cases_content_sha256: casesContentSha256,
    business_oracle_sha256: businessOracleSha256,
    files: harnessFiles,
    device_id: process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554",
    android_api_level: 34,
    node_version: process.version,
  };
  const harnessStateId = sha256(canonical(harnessStateInputs));
  const allPaths = repositoryPaths();
  const definitionFiles = fileEntries(allPaths.filter((path) => path === "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3.ts"
    || path === "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallBatch002EngineeringSourcesR4.ts"
    || path === "scripts/estimate/batch001008R3/batch002DrywallGoldFixtureR3.ts"));
  const backendFiles = fileEntries(allPaths.filter((path) => path.startsWith("src/lib/estimate/backendPlatform/")
    || path.startsWith("scripts/estimate/backendMigration/")
    || path.startsWith("supabase/functions/canonical-estimate")
    || (path.startsWith("supabase/migrations/") && path.includes("estimate"))));
  const appFiles = fileEntries(allPaths.filter(isAppBuildInput));
  const evidenceFiles = fileEntries(allPaths.filter((path) => path.startsWith("scripts/e2e/buildBatch002R55")
    || path === "scripts/e2e/runBatch002R4WebRoleMatrix80.ts"
    || path === "scripts/e2e/runBatch002R54AndroidAuthBootstrapProof.ts"));
  const secretFreeEnvFingerprint = sha256(canonical(APP_ENVIRONMENT_CONTRACT));
  const components = {
    definition: componentIdentity("definition_content", definitionFiles),
    backend: componentIdentity("canonical_backend_runtime", backendFiles),
    app: componentIdentity("web_android_app", appFiles, { secret_free_env_fingerprint: secretFreeEnvFingerprint }),
    harness: componentIdentity("android_harness", harnessFiles, {
      contract_sha256: CONTRACT_SHA256,
      cases_content_sha256: casesContentSha256,
      business_oracle_sha256: businessOracleSha256,
    }),
    evidence: componentIdentity("evidence_tools", evidenceFiles, { contract_sha256: CONTRACT_SHA256 }),
  };

  const base = {
    schema_version: "real-professional-estimates-r5.6.batch002-android-api34-matrix50-manifest.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: head,
    source_head_tree: headTree,
    accepted_backend_source_state_id: backend.sourceStateId,
    definition_content_state_id: components.definition.state_id,
    backend_runtime_state_id: components.backend.state_id,
    app_source_component_state_id: components.app.state_id,
    harness_state_id: harnessStateId,
    evidence_tool_state_id: components.evidence.state_id,
    backend_evidence: {
      path: BACKEND,
      sha256: ACCEPTED_BACKEND_REPORT_SHA256,
      status: backend.status,
    },
    content_acceptance: {
      path: CONTENT_ACCEPTANCE,
      sha256: ACCEPTED_CONTENT_REPORT_SHA256,
      status: acceptance.status,
      content_sha256: acceptance.content_sha256,
    },
    connection_audit: {
      path: CONNECTION_AUDIT,
      sha256: sha256(readFileSync(CONNECTION_AUDIT)),
      status: connectionResult.status,
    },
    harness_file_manifest: {
      inputs: harnessStateInputs,
      files: harnessFiles,
      files_content_sha256: sha256(canonical(harnessFiles)),
    },
    predecessor_manifest: {
      path: PREDECESSOR,
      sha256: ACCEPTED_SCENARIO_CANDIDATE_SHA256,
      contract_sha256: predecessor.contract_sha256,
      use: "FROZEN_CASE_NUMBERS_COVERAGE_AND_INDEPENDENT_EXPECTED_VALUES_ONLY",
    },
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    definition_set_sha256: backend.definitionSetSha256,
    expected: 50,
    distinct_catalog_ids: 50,
    distinct_parent_revisions: 50,
    android_api_level: 34,
    sample_frozen_before_execution: true,
    cases_content_sha256: casesContentSha256,
    business_oracle_sha256: businessOracleSha256,
    business_oracle_source_is_independent_of_runtime_api: true,
    required_coverage: predecessor.required_coverage,
    cases,
    execution_order: {
      web_smoke_then_web_80_before_apk: true,
      bounded_photo_case_10_first: true,
      bounded_regression_case_4_second: true,
      full_matrix_after_bounded_gates: true,
    },
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE",
  };
  const result = contentAddressed(base);
  atomicJson(OUTPUT, result);

  const binding = contentAddressed({
    schema_version: "real-professional-estimates-r5.6.final-release-revision-binding.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: head,
    source_head_tree: headTree,
    backend_report_sha256: ACCEPTED_BACKEND_REPORT_SHA256,
    content_acceptance_sha256: ACCEPTED_CONTENT_REPORT_SHA256,
    accepted_backend_source_state_id: backend.sourceStateId,
    definition_set_sha256: backend.definitionSetSha256,
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    matrix_manifest_path: OUTPUT,
    matrix_manifest_sha256: sha256(readFileSync(OUTPUT)),
    cases_content_sha256: casesContentSha256,
    business_oracle_sha256: businessOracleSha256,
    cases: cases.map((entry) => ({
      case: entry.case,
      catalog_id: entry.catalogId,
      parent_revision_id: entry.parentRevisionId,
      coverage: entry.coverage,
      business_oracle_sha256: sha256(canonical(entry.businessOracle)),
    })),
    expected_cases: 50,
    distinct_cases: 50,
    distinct_catalog_ids: 50,
    distinct_parent_revisions: 50,
    connection_audit_sha256: sha256(readFileSync(CONNECTION_AUDIT)),
    status: "FROZEN_R56_FINAL_RELEASE_REVISION_BINDING_50_UNIQUE_NO_RELEASE",
  });
  atomicJson(FINAL_BINDING, binding);

  const ledger = contentAddressed({
    schema_version: "real-professional-estimates-r5.6.component-source-identity-impact-ledger.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: head,
    source_head_tree: headTree,
    global_source_state_id_at_accepted_backend_replay: backend.sourceStateId,
    definition_set_sha256: backend.definitionSetSha256,
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    matrix_manifest_sha256: sha256(readFileSync(OUTPUT)),
    components,
    impact_decisions: [
      {
        gate: "backend_content_final_identity",
        action: "REUSE_ACCEPTED_IMMUTABLE_EVIDENCE",
        reason: "R5.6 changes only harness/evidence contract; accepted definition/backend component inputs were not modified",
        backend_report_sha256: ACCEPTED_BACKEND_REPORT_SHA256,
        content_acceptance_sha256: ACCEPTED_CONTENT_REPORT_SHA256,
      },
      {
        gate: "web_android_ui",
        action: "REPLAY_REQUIRED",
        reason: "final release/revision binding and R5.6 harness identities changed",
      },
    ],
    generated_evidence_excluded_from_component_inputs: true,
    status: "FROZEN_R56_COMPONENT_IDENTITIES_AND_IMPACT_DECISIONS_NO_RELEASE",
  });
  atomicJson(COMPONENT_LEDGER, ledger);

  process.stdout.write(`${JSON.stringify({
    status: result.status,
    output: OUTPUT,
    report_sha256: sha256(readFileSync(OUTPUT)),
    content_sha256: result.content_sha256,
    harness_state_id: harnessStateId,
    cases_content_sha256: casesContentSha256,
    business_oracle_sha256: businessOracleSha256,
    release_id: backend.releaseId,
    expected: result.expected,
    distinct_catalog_ids: result.distinct_catalog_ids,
    distinct_parent_revisions: result.distinct_parent_revisions,
    connection_audit: connectionResult.status,
    final_binding_sha256: sha256(readFileSync(FINAL_BINDING)),
    component_ledger_sha256: sha256(readFileSync(COMPONENT_LEDGER)),
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
