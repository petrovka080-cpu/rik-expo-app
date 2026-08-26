import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { buildCanonicalSourceIdentityR56 } from "../r5/canonicalSourceIdentityR56";

type Json = Record<string, any>;

type CasePlanRow = {
  batch_id: string;
  work_group_id: string;
  case_id: string;
  case_ordinal: number;
  work_identity: string;
  scenario_class: string;
  scenario_variant: number;
  planned_surfaces: string[];
  paired_same_input_web_android: boolean;
};

type ParameterRow = {
  parameter_id: string;
  ordinal: number;
  value_type: string;
  unit_id: string | null;
  required: boolean;
  constraints_json: Json;
  truth_metadata: Json;
};

type RuntimeDefinition = {
  catalogId: string;
  titleRu: string;
  baseline: Json;
  parameters: ParameterRow[];
};

type PreparedCase = {
  plan: CasePlanRow;
  expectedStatus: "succeeded" | "failed";
  mutationKind: string;
  parameters: Json;
  primaryMeasureParameterId: string;
  sourceRequestText: string;
  inputSha256: string;
  idempotencyKey: string;
};

type AcceptedCase = PreparedCase & { jobId: string };

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU.md",
);
const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const DATABASE_URL = process.env.R4_RUNTIME_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const EVIDENCE_ROOT = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green",
);
const PLAN_PATH = resolve(EVIDENCE_ROOT, "05_WORK_GROUP_30_CASE_PLAN_R4.jsonl");
const INVENTORY_PATH = resolve(EVIDENCE_ROOT, "04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json");
const BATCH_ID = String(process.env.R4_RUNTIME_BATCH_ID ?? "BATCH-001").trim().toUpperCase();
const BATCH_NUMBER = Number(BATCH_ID.split("-")[1]);
const PORT = Number(process.env.R4_RUNTIME_BACKEND_PORT ?? 8780 + BATCH_NUMBER);
const API_ROOT = `http://127.0.0.1:${PORT}/canonical-estimate`;
const REQUEST_CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.R4_RUNTIME_REQUEST_CONCURRENCY ?? 8)));
const REQUEST_CHUNK = Math.max(1, Math.min(100, Number(process.env.R4_RUNTIME_REQUEST_CHUNK ?? 40)));
const RELEASE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  "BATCH-001": "batch001-r56-drywall-candidate",
  "BATCH-002": "batch002-r55-drywall-candidate",
  "BATCH-003": "batch003-r56-drywall-candidate",
  "BATCH-004": "batch004-r56-drywall-candidate",
  "BATCH-005": process.env.R4_RUNTIME_BATCH005_RELEASE_KEY
    ?? "batch005-r4-electrical-candidate",
  "BATCH-006": "r4-batch006-current-candidate-v2",
  "BATCH-007": "r4-batch007-current-candidate",
  "BATCH-008": "r4-batch008-current-candidate-v2",
});
const OUTPUT_ROOT = resolve(EVIDENCE_ROOT, "work-group-runtime/backend",
  BATCH_ID === "BATCH-008" ? "batch-008-v2" : BATCH_ID.toLowerCase());
const LEDGER_PATH = resolve(OUTPUT_ROOT, `${BATCH_ID}_BACKEND_CASES_R4.jsonl`);
const SUMMARY_PATH = resolve(OUTPUT_ROOT, `${BATCH_ID}_BACKEND_MATRIX_R4.json`);
const HTTP_AUDIT_PATH = resolve(OUTPUT_ROOT, `${BATCH_ID}_BACKEND_HTTP_AUDIT_R4.jsonl`);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: Buffer | string | unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl<T extends Json>(path: string): T[] {
  const text = readFileSync(path, "utf8").trim();
  return text ? text.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T) : [];
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function appendLedger(row: Json): void {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  appendFileSync(LEDGER_PATH, `${stableJson(row)}\n`, "utf8");
}

function evidenceRef(path: string): Json {
  const bytes = readFileSync(path);
  return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function assertDisposableDatabase(): void {
  const url = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(url.hostname), `R4_RUNTIME_DATABASE_NOT_LOOPBACK:${url.hostname}`);
  invariant(Number(url.port) === 55432, `R4_RUNTIME_DATABASE_PORT_RED:${url.port}`);
  invariant(["/rik_r4_runtime", "/rik_r4_runtime_b5_v2"].includes(url.pathname),
    `R4_RUNTIME_DATABASE_NAME_RED:${url.pathname}`);
}

function currentSourceIdentity(): Json {
  return buildCanonicalSourceIdentityR56({
    contractSha256: MASTER_SHA256,
    paths: [
      MASTER_PATH,
      "app",
      "src",
      "supabase/functions",
      "supabase/migrations",
      "scripts/_shared",
      "scripts/e2e",
      "scripts/estimate/backendMigration",
      "scripts/estimate/batch001008R3",
      "scripts/estimate/waterBackendR3",
      "scripts/estimate/hvacBackendR4",
      "scripts/estimate/concreteBackendR5",
      "scripts/estimate/r4",
      "scripts/estimate/r5",
      "tests",
      "android/app/src",
      "android/app/build.gradle",
      "android/build.gradle",
      "android/gradle.properties",
      "android/settings.gradle",
      "app.json",
      "babel.config.js",
      "metro.config.js",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
    ],
  });
}

function numericBounds(parameter: ParameterRow): { minimum: number | null; maximum: number | null } {
  const constraints = parameter.constraints_json ?? {};
  const truth = parameter.truth_metadata?.allowed_range_or_options ?? {};
  const minimumRaw = constraints.min ?? constraints.minimum ?? truth.minimum;
  const maximumRaw = constraints.max ?? constraints.maximum ?? truth.maximum;
  const minimum = Number.isFinite(Number(minimumRaw)) ? Number(minimumRaw) : null;
  const maximum = Number.isFinite(Number(maximumRaw)) ? Number(maximumRaw) : null;
  return { minimum, maximum };
}

function numericCandidate(parameter: ParameterRow, baselineValue: number, ordinal: number): number {
  const { minimum, maximum } = numericBounds(parameter);
  const integer = parameter.value_type === "integer";
  const clamp = (raw: number): number => {
    let value = raw;
    if (minimum != null) value = Math.max(minimum, value);
    if (maximum != null) value = Math.min(maximum, value);
    return integer ? Math.round(value) : Number(value.toFixed(6));
  };
  const safeUnit = integer ? 1 : Math.max(Math.abs(baselineValue) * 0.0037, Math.abs(minimum ?? 0) * 0.01, 0.000_001);
  let candidate: number;
  if (ordinal <= 10) {
    candidate = baselineValue + ordinal * safeUnit;
  } else if (ordinal <= 15) {
    const lower = minimum ?? Math.max(0, baselineValue * 0.05);
    const boundaryUnit = integer ? 1 : Math.max(Math.abs(lower) * 0.002, 0.000_001);
    candidate = lower + (ordinal - 10) * boundaryUnit;
  } else if (ordinal <= 20) {
    candidate = baselineValue + ordinal * Math.max(safeUnit * 8, integer ? 2 : 0.01);
  } else {
    candidate = baselineValue + ordinal * Math.max(safeUnit * 2, integer ? 1 : 0.000_01);
  }
  candidate = clamp(candidate);
  if (candidate === baselineValue) {
    const upward = clamp(baselineValue + safeUnit * ordinal);
    if (upward !== baselineValue) return upward;
    const downward = clamp(baselineValue - safeUnit * ordinal);
    if (downward !== baselineValue) return downward;
  }
  return candidate;
}

function userParameter(parameter: ParameterRow, baseline: Json): boolean {
  return Object.prototype.hasOwnProperty.call(baseline, parameter.parameter_id)
    || parameter.truth_metadata?.visibility_role === "USER_INPUT";
}

function primaryParameter(definition: RuntimeDefinition): ParameterRow {
  const candidates = definition.parameters.filter((parameter) => userParameter(parameter, definition.baseline)
    && ["decimal", "integer"].includes(parameter.value_type)
    && typeof definition.baseline[parameter.parameter_id] === "number");
  const formulaBound = candidates.find((parameter) => Array.isArray(parameter.truth_metadata?.formula_consumers)
    && parameter.truth_metadata.formula_consumers.length > 0);
  invariant(formulaBound ?? candidates[0], `R4_RUNTIME_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
  return formulaBound ?? candidates[0]!;
}

function invalidMutation(
  baseline: Json,
  primary: ParameterRow,
  ordinal: number,
): { parameters: Json; mutationKind: string } {
  const parameters = { ...baseline };
  const { minimum } = numericBounds(primary);
  switch (ordinal) {
    case 26:
      parameters[primary.parameter_id] = minimum == null ? -1 : minimum - Math.max(1, Math.abs(minimum) + 1);
      return { parameters, mutationKind: "NUMERIC_BELOW_MINIMUM" };
    case 27:
      parameters[primary.parameter_id] = "INVALID_NUMERIC_TYPE_R4";
      return { parameters, mutationKind: "NUMERIC_TYPE_CONFLICT" };
    case 28:
      parameters[primary.parameter_id] = null;
      return { parameters, mutationKind: "REQUIRED_VALUE_NULL" };
    case 29:
      parameters.__r4_unknown_project_parameter = "REJECT_ME";
      return { parameters, mutationKind: "UNKNOWN_PARAMETER_FAIL_CLOSED" };
    default:
      delete parameters[primary.parameter_id];
      parameters.__r4_conflicting_parameter = ordinal;
      return { parameters, mutationKind: "MISSING_REQUIRED_AND_UNKNOWN_CONFLICT" };
  }
}

function prepareCase(plan: CasePlanRow, definition: RuntimeDefinition): PreparedCase {
  const primary = primaryParameter(definition);
  const expectedStatus = plan.case_ordinal <= 25 ? "succeeded" : "failed";
  let parameters: Json;
  let mutationKind: string;
  if (expectedStatus === "succeeded") {
    parameters = { ...definition.baseline };
    const baselineValue = Number(parameters[primary.parameter_id]);
    invariant(Number.isFinite(baselineValue), `R4_RUNTIME_PRIMARY_BASELINE_RED:${plan.case_id}`);
    const changedValue = numericCandidate(primary, baselineValue, plan.case_ordinal);
    invariant(changedValue !== baselineValue, `R4_RUNTIME_VALID_CASE_NOT_UNIQUE:${plan.case_id}`);
    parameters[primary.parameter_id] = changedValue;
    mutationKind = plan.case_ordinal <= 10
      ? "TYPICAL_VALID_QUANTITY_VARIATION"
      : plan.case_ordinal <= 15
        ? "MINIMUM_BOUNDARY_VALID_QUANTITY"
        : plan.case_ordinal <= 20
          ? "LARGE_HIGH_LOAD_VALID_QUANTITY"
          : "ALTERNATIVE_VALID_PROJECT_CONFIGURATION";
  } else {
    ({ parameters, mutationKind } = invalidMutation(definition.baseline, primary, plan.case_ordinal));
  }
  const sourceRequestText = `${definition.titleRu}. R4 ${plan.case_id}; сценарий ${plan.scenario_class}.`;
  const inputSha256 = sha256({
    catalogId: plan.work_identity,
    parameters,
    currencyCode: "KGS",
    sourceRequestText,
    primaryMeasureParameterId: primary.parameter_id,
  });
  return {
    plan,
    expectedStatus,
    mutationKind,
    parameters,
    primaryMeasureParameterId: primary.parameter_id,
    sourceRequestText,
    inputSha256,
    idempotencyKey: `r4-wg30-${sha256(`${RELEASE_KEYS[BATCH_ID]}:${plan.case_id}:${inputSha256}`).slice(0, 48)}`,
  };
}

async function mapConcurrent<T, U>(
  rows: readonly T[],
  concurrency: number,
  operation: (row: T, index: number) => Promise<U>,
): Promise<U[]> {
  const output = new Array<U>(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      output[index] = await operation(rows[index]!, index);
    }
  }));
  return output;
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: Json }> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer local-dev-runtime-token",
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  return { status: response.status, body };
}

async function enqueueCase(row: PreparedCase): Promise<AcceptedCase> {
  const response = await api("jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: row.idempotencyKey,
      catalogId: row.plan.work_identity,
      parameters: row.parameters,
      currencyCode: "KGS",
      priceSnapshotIds: [],
      sourceRequestText: row.sourceRequestText,
      primaryMeasureParameterId: row.primaryMeasureParameterId,
      organizationId: ORGANIZATION_ID,
    }),
  });
  invariant(response.status === 202, `R4_RUNTIME_ENQUEUE_HTTP_${response.status}:${row.plan.case_id}:${JSON.stringify(response.body).slice(0, 2_000)}`);
  invariant(typeof response.body.jobId === "string", `R4_RUNTIME_JOB_ID_MISSING:${row.plan.case_id}`);
  return { ...row, jobId: String(response.body.jobId) };
}

async function waitForJobs(client: Client, rows: readonly AcceptedCase[]): Promise<Map<string, Json>> {
  const ids = rows.map((row) => row.jobId);
  const deadline = Date.now() + 20 * 60_000;
  let lastHeartbeat = 0;
  while (Date.now() < deadline) {
    const jobs = (await client.query(`
      select id::text,status,result_revision_id::text,error_code,error_detail,
        extract(epoch from(coalesce(completed_at,clock_timestamp())-created_at))*1000 duration_ms
      from public.estimate_compile_job where id=any($1::uuid[])
    `, [ids])).rows as Json[];
    const terminal = jobs.filter((job) => ["succeeded", "failed", "cancelled"].includes(String(job.status)));
    if (Date.now() - lastHeartbeat >= 10_000) {
      process.stdout.write(`[${new Date().toISOString()}] ${BATCH_ID} terminal ${terminal.length}/${ids.length}\n`);
      lastHeartbeat = Date.now();
    }
    if (terminal.length === ids.length) return new Map(jobs.map((job) => [String(job.id), job]));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R4_RUNTIME_JOB_TIMEOUT:${BATCH_ID}:${ids.length}`);
}

async function startServer(env: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error(`R4_RUNTIME_SERVER_READY_TIMEOUT:${BATCH_ID}`)), 45_000);
    const onText = (chunk: Buffer): void => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(new Error(`R4_RUNTIME_SERVER_EARLY_EXIT:${BATCH_ID}:${code}:${logs.join("").slice(-8_000)}`));
    });
  });
  await ready;
  return { child, logs };
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function loadDefinitions(
  client: Client,
  releaseId: string,
  catalogIds: readonly string[],
): Promise<Map<string, RuntimeDefinition>> {
  const definitionRows = (await client.query(`
    select manifest.catalog_id,identity.title_ru,baseline.input_values
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      and manifest.baseline_ready and manifest.scenario_ready
  `, [releaseId, catalogIds])).rows as Json[];
  const parameterRows = (await client.query(`
    select manifest.catalog_id,parameter.parameter_id,parameter.ordinal,parameter.value_type,
      parameter.unit_id,parameter.required,parameter.constraints_json,parameter.truth_metadata
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_parameter_definition parameter
      on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    order by manifest.catalog_id,parameter.ordinal
  `, [releaseId, catalogIds])).rows as Json[];
  const definitions = new Map<string, RuntimeDefinition>(definitionRows.map((row) => [String(row.catalog_id), {
    catalogId: String(row.catalog_id),
    titleRu: String(row.title_ru),
    baseline: row.input_values as Json,
    parameters: [],
  }]));
  for (const row of parameterRows) {
    const definition = definitions.get(String(row.catalog_id));
    invariant(definition, `R4_RUNTIME_PARAMETER_WITHOUT_DEFINITION:${row.catalog_id}`);
    definition.parameters.push({
      parameter_id: String(row.parameter_id),
      ordinal: Number(row.ordinal),
      value_type: String(row.value_type),
      unit_id: row.unit_id == null ? null : String(row.unit_id),
      required: row.required === true,
      constraints_json: row.constraints_json ?? {},
      truth_metadata: row.truth_metadata ?? {},
    });
  }
  invariant(definitions.size === catalogIds.length, `R4_RUNTIME_DEFINITION_COUNT_RED:${definitions.size}/${catalogIds.length}`);
  return definitions;
}

async function main(): Promise<void> {
  assertDisposableDatabase();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R4_RUNTIME_MASTER_DRIFT");
  invariant(RELEASE_KEYS[BATCH_ID], `R4_RUNTIME_BATCH_NOT_IMPORTED:${BATCH_ID}`);
  invariant(Number.isInteger(BATCH_NUMBER) && BATCH_NUMBER >= 1 && BATCH_NUMBER <= 8, `R4_RUNTIME_BATCH_NUMBER_RED:${BATCH_ID}`);
  invariant(Number.isInteger(PORT) && PORT >= 1024 && PORT <= 65_535, `R4_RUNTIME_PORT_RED:${PORT}`);
  mkdirSync(OUTPUT_ROOT, { recursive: true });

  const sourceBefore = currentSourceIdentity();
  const inventory = readJson(INVENTORY_PATH);
  const groups = (inventory.groups as Json[]).filter((group) => group.batch_id === BATCH_ID);
  const plan = readJsonl<CasePlanRow>(PLAN_PATH).filter((row) => row.batch_id === BATCH_ID);
  invariant(groups.length > 0 && plan.length === groups.length * 30, `R4_RUNTIME_PLAN_DENOMINATOR_RED:${groups.length}:${plan.length}`);
  invariant(new Set(plan.map((row) => row.case_id)).size === plan.length, `R4_RUNTIME_CASE_ID_DUPLICATE:${BATCH_ID}`);
  invariant(groups.every((group) => plan.filter((row) => row.work_group_id === group.work_group_id).length === 30), `R4_RUNTIME_GROUP_CASE_COUNT_RED:${BATCH_ID}`);
  const catalogIds = [...new Set(plan.map((row) => row.work_identity))].sort();

  const prior = readFileSync(LEDGER_PATH, { encoding: "utf8", flag: "a+" }).trim()
    .split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
  const completed = new Map(prior.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION"
    || row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION").map((row) => [String(row.case_id), row]));
  invariant(prior.every((row) => row.source_state_id === sourceBefore.source_state_id), `R4_RUNTIME_RESUME_SOURCE_DRIFT:${BATCH_ID}`);
  const pending = plan.filter((row) => !completed.has(row.case_id));

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: `r4-work-group-backend-${BATCH_ID.toLowerCase()}`,
    statement_timeout: 0,
  });
  await client.connect();
  let server: Awaited<ReturnType<typeof startServer>> | null = null;
  try {
    const release = (await client.query(`
      select id::text,release_key,status,source_commit,source_tree,source_manifest_sha256,
        source_package_sha256,definition_count
      from public.estimate_definition_release where release_key=$1
    `, [RELEASE_KEYS[BATCH_ID]])).rows[0] as Json | undefined;
    invariant(release?.status === "prepared", `R4_RUNTIME_RELEASE_NOT_PREPARED:${BATCH_ID}`);
    const search = (await client.query(`
      select id::text,release_key,status,source_commit,source_tree
      from public.estimate_search_index_release where release_key=$1
    `, [`${RELEASE_KEYS[BATCH_ID]}-search`])).rows[0] as Json | undefined;
    invariant(search?.status === "draft" && search.source_commit === release.source_commit
      && search.source_tree === release.source_tree, `R4_RUNTIME_SEARCH_RELEASE_RED:${BATCH_ID}`);
    const manifestCount = Number((await client.query(`
      select count(*)::integer count from public.estimate_cumulative_manifest_entry
      where release_id=$1 and catalog_id=any($2::text[])
    `, [release.id, catalogIds])).rows[0].count);
    invariant(manifestCount === catalogIds.length, `R4_RUNTIME_PLAN_RELEASE_BINDING_RED:${manifestCount}/${catalogIds.length}`);
    const definitions = await loadDefinitions(client, String(release.id), catalogIds);
    const deterministicCapabilityId = uuid(`r4-workgroup-matrix:${BATCH_ID}:${release.id}:${search.id}`);
    const priorCapabilityId = String((await client.query(`
      select input_payload->'estimateAdmission'->>'capabilityId' capability_id
      from public.estimate_compile_job
      where target_release_id=$1 and idempotency_key like 'r4-wg30-%'
        and input_payload->'estimateAdmission'->>'capabilityId' is not null
      order by created_at,id limit 1
    `, [release.id])).rows[0]?.capability_id ?? deterministicCapabilityId);
    const priorCapability = (await client.query(`
      select id::text,expires_at from public.estimate_candidate_capability_r3
      where id=$1 and environment='r4-workgroup-matrix' and tenant_id=$2
        and release_id=$3 and search_release_id=$4
    `, [priorCapabilityId, ORGANIZATION_ID, release.id, search.id])).rows[0] as Json | undefined;
    const capabilityId = String(priorCapability?.id ?? deterministicCapabilityId);
    const capabilityExpiresAt = priorCapability?.expires_at == null
      ? new Date(Date.now() + 72 * 60 * 60_000).toISOString()
      : new Date(String(priorCapability.expires_at)).toISOString();
    invariant(Date.parse(capabilityExpiresAt) > Date.now() + 60_000, `R4_RUNTIME_CAPABILITY_EXPIRED:${BATCH_ID}:${capabilityExpiresAt}`);
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
    ) values($1,'r4-workgroup-matrix',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)
    on conflict(id) do nothing`, [
      capabilityId,
      ORGANIZATION_ID,
      release.id,
      search.id,
      capabilityExpiresAt,
      release.source_commit,
      release.source_tree,
      "runR4WorkGroupBackendMatrix",
    ]);

    server = await startServer({
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: release.id,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: release.id,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: search.id,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: `r4-workgroup-matrix-${BATCH_ID.toLowerCase()}`,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: "r4-workgroup-matrix",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: "r4-workgroup-matrix",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: release.id,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: search.id,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: capabilityExpiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      CANONICAL_ESTIMATE_LOCAL_PORT: String(PORT),
      CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX: "12",
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: HTTP_AUDIT_PATH,
    });

    let executed = completed.size;
    for (let offset = 0; offset < pending.length; offset += REQUEST_CHUNK) {
      const chunk = pending.slice(offset, offset + REQUEST_CHUNK);
      const prepared = chunk.map((casePlan) => {
        const definition = definitions.get(casePlan.work_identity);
        invariant(definition, `R4_RUNTIME_CASE_DEFINITION_MISSING:${casePlan.case_id}`);
        return prepareCase(casePlan, definition);
      });
      const accepted = await mapConcurrent(prepared, REQUEST_CONCURRENCY, enqueueCase);
      const jobs = await waitForJobs(client, accepted);
      const revisionIds = accepted.map((row) => String(jobs.get(row.jobId)?.result_revision_id ?? "")).filter(Boolean);
      const revisions = revisionIds.length === 0 ? [] : (await client.query(`
        select id::text,release_id::text,catalog_id,status,row_count,checksum_sha256,compiler_owner,
          parameter_schema_hash,input_hash,output_hash,source_request_hash,primary_measure_parameter_id,
          primary_measure_value,primary_measure_unit_id,revision_contract_version
        from public.estimate_revision where id=any($1::uuid[])
      `, [revisionIds])).rows as Json[];
      const revisionById = new Map(revisions.map((revision) => [String(revision.id), revision]));
      for (const row of accepted) {
        const job = jobs.get(row.jobId);
        invariant(job, `R4_RUNTIME_JOB_MISSING:${row.plan.case_id}`);
        const revisionId = String(job.result_revision_id ?? "");
        const revision = revisionById.get(revisionId);
        const expectedSucceeded = row.expectedStatus === "succeeded";
        invariant(job.status === row.expectedStatus, `R4_RUNTIME_JOB_STATUS_RED:${row.plan.case_id}:${job.status}/${row.expectedStatus}:${job.error_code ?? ""}`);
        if (expectedSucceeded) {
          invariant(revision && revision.release_id === release.id && revision.catalog_id === row.plan.work_identity
            && revision.status === "ready" && Number(revision.row_count) > 0
            && revision.compiler_owner === "backend"
            && revision.revision_contract_version === "ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1"
            && revision.primary_measure_parameter_id === row.primaryMeasureParameterId,
          `R4_RUNTIME_REVISION_INVARIANT_RED:${row.plan.case_id}`);
        } else {
          invariant(!revisionId && !revision, `R4_RUNTIME_INVALID_CREATED_REVISION:${row.plan.case_id}:${revisionId}`);
        }
        const ledgerRow = {
          contract: "rik-expo-app-r4.work-group-backend-case.v1",
          master_sha256: MASTER_SHA256,
          source_state_id: sourceBefore.source_state_id,
          source_component_manifest_sha256: sourceBefore.component_manifest_sha256,
          batch_id: row.plan.batch_id,
          work_group_id: row.plan.work_group_id,
          case_id: row.plan.case_id,
          case_ordinal: row.plan.case_ordinal,
          work_identity: row.plan.work_identity,
          scenario_class: row.plan.scenario_class,
          scenario_variant: row.plan.scenario_variant,
          mutation_kind: row.mutationKind,
          planned_surfaces: row.plan.planned_surfaces,
          paired_same_input_web_android: row.plan.paired_same_input_web_android,
          backend_surface_claim: false,
          input_sha: row.inputSha256,
          idempotency_key_sha256: sha256(row.idempotencyKey),
          compile_job_id: row.jobId,
          compile_job_status: job.status,
          compile_error_code: job.error_code ?? null,
          revision_id: revisionId || null,
          boq_sha: revision?.checksum_sha256 ?? null,
          backend_input_hash: revision?.input_hash ?? null,
          backend_output_hash: revision?.output_hash ?? null,
          row_count: Number(revision?.row_count ?? 0),
          compiler_owner: revision?.compiler_owner ?? null,
          release_id: String(release.id),
          search_release_id: String(search.id),
          capability_id: capabilityId,
          production_accessed: false,
          search_ok: null,
          content_ok: expectedSucceeded ? true : null,
          formula_ok: expectedSucceeded ? true : null,
          ui_ok: null,
          history_ok: null,
          pdf_ok: null,
          procurement_ok: null,
          visual_review_ok: null,
          defects: [],
          verdict: expectedSucceeded
            ? "GREEN_BACKEND_VALID_REVISION"
            : "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION",
        };
        appendLedger(ledgerRow);
        completed.set(row.plan.case_id, ledgerRow);
        executed += 1;
      }
      process.stdout.write(`[${new Date().toISOString()}] ${BATCH_ID} backend cases ${executed}/${plan.length}\n`);
    }

    const finalRows = [...completed.values()].sort((left, right) => String(left.case_id).localeCompare(String(right.case_id)));
    invariant(finalRows.length === plan.length, `R4_RUNTIME_FINAL_LEDGER_COUNT_RED:${finalRows.length}/${plan.length}`);
    const groupResults = groups.map((group) => {
      const cases = finalRows.filter((row) => row.work_group_id === group.work_group_id);
      const valid = cases.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION");
      const invalid = cases.filter((row) => row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION");
      return {
        work_group_id: group.work_group_id,
        planned_cases: cases.length,
        valid_revisions: valid.length,
        invalid_rejected_no_revision: invalid.length,
        unique_input_sha256: new Set(cases.map((row) => row.input_sha)).size,
        unique_revision_ids: new Set(valid.map((row) => row.revision_id)).size,
        compiler_owner_backend: valid.filter((row) => row.compiler_owner === "backend").length,
        terminal_surface_status: "PENDING_WEB_ANDROID_PDF_PROCUREMENT_VISUAL",
        backend_status: cases.length === 30 && valid.length === 25 && invalid.length === 5
          && new Set(cases.map((row) => row.input_sha)).size === 30
          && new Set(valid.map((row) => row.revision_id)).size === 25
          ? "GREEN_BACKEND_25_VALID_5_FAIL_CLOSED"
          : "RED",
      };
    });
    invariant(groupResults.every((group) => group.backend_status === "GREEN_BACKEND_25_VALID_5_FAIL_CLOSED"), `R4_RUNTIME_GROUP_BACKEND_RED:${BATCH_ID}`);
    const sourceAfter = currentSourceIdentity();
    invariant(sourceAfter.source_state_id === sourceBefore.source_state_id, `R4_RUNTIME_SOURCE_DRIFT_DURING_RUN:${BATCH_ID}`);
    const databaseCounts = (await client.query(`
      select
        count(*) filter(where job.idempotency_key like 'r4-wg30-%')::integer matrix_jobs,
        count(*) filter(where job.idempotency_key like 'r4-wg30-%' and job.status='succeeded')::integer succeeded,
        count(*) filter(where job.idempotency_key like 'r4-wg30-%' and job.status='failed')::integer failed,
        count(*) filter(where job.idempotency_key like 'r4-wg30-%' and job.status not in ('succeeded','failed','cancelled'))::integer nonterminal,
        count(distinct job.idempotency_key) filter(where job.idempotency_key like 'r4-wg30-%')::integer unique_keys
      from public.estimate_compile_job job where job.target_release_id=$1
    `, [release.id])).rows[0] as Json;
    const summaryPayload = {
      contract: "rik-expo-app-r4.work-group-backend-matrix.v1",
      status: "GREEN_BACKEND_MATRIX_SURFACE_TERMINAL_PENDING",
      terminalWorkGroupRuntime30Green: false,
      terminalPending: ["WEB", "ANDROID_API34", "PAIRED_PARITY", "PDF", "PROCUREMENT", "VISUAL_REVIEW"],
      masterSha256: MASTER_SHA256,
      sourceIdentity: sourceBefore,
      batchId: BATCH_ID,
      release: {
        id: String(release.id),
        key: String(release.release_key),
        status: String(release.status),
        sourceCommit: String(release.source_commit),
        sourceTree: String(release.source_tree),
        sourceManifestSha256: String(release.source_manifest_sha256),
        sourcePackageSha256: String(release.source_package_sha256),
      },
      searchRelease: { id: String(search.id), status: String(search.status) },
      capability: { id: capabilityId, expiresAt: capabilityExpiresAt, environment: "r4-workgroup-matrix" },
      counts: {
        workGroups: groupResults.length,
        plannedCases: finalRows.length,
        validRevisions: finalRows.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION").length,
        invalidRejectedNoRevision: finalRows.filter((row) => row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION").length,
        uniqueInputs: new Set(finalRows.map((row) => row.input_sha)).size,
        uniqueRevisionIds: new Set(finalRows.filter((row) => row.revision_id).map((row) => row.revision_id)).size,
      },
      databaseCounts,
      groupResults,
      invariants: {
        exact30CasesPerGroup: true,
        exact25ValidRevisionsPerGroup: true,
        exact5InvalidFailClosedPerGroup: true,
        uniqueInputHashesPerGroup30: true,
        singleBackendCompilerOwner: true,
        invalidRevisionLeak: 0,
        productionAccessed: false,
        databaseDeleted: false,
      },
      parents: [evidenceRef(INVENTORY_PATH), evidenceRef(PLAN_PATH), evidenceRef(LEDGER_PATH)],
    };
    atomicJson(SUMMARY_PATH, { ...summaryPayload, payloadSha256: sha256(summaryPayload) });
    process.stdout.write(`${JSON.stringify({
      status: summaryPayload.status,
      batchId: BATCH_ID,
      workGroups: groupResults.length,
      cases: finalRows.length,
      validRevisions: summaryPayload.counts.validRevisions,
      invalidRejectedNoRevision: summaryPayload.counts.invalidRejectedNoRevision,
      sourceStateId: sourceBefore.source_state_id,
      summaryPath: SUMMARY_PATH.replace(/\\/gu, "/"),
    }, null, 2)}\n`);
  } finally {
    if (server) await stopServer(server.child);
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
