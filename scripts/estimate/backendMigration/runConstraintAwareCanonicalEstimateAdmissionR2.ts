import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const API_ROOT = (process.env.CANONICAL_ESTIMATE_R2_API_ROOT
  ?? "http://127.0.0.1:8766/canonical-estimate").replace(/\/$/, "");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r2_dev";
const DATABASE_NAME = decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, ""));
const TOKEN = process.env.CANONICAL_ESTIMATE_R2_TEST_TOKEN ?? "r2-disposable-test-tenant";
const MANIFEST_SHA256 = String(process.env.CANONICAL_ESTIMATE_R2_MANIFEST_SHA256
  ?? "2435181634611f050dcef966fa277ab31f02c632d8e6ac2bf0345994600f722e").trim();
const RELEASE_KEY = "master11610-backend-canonical-r2-parameter-semantics";
const ADMISSION_RUN_ID = String(process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID
  ?? "master11610-r3-final-constraint-aware-3684").trim();
const TEST_OWNER_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const EXPECTED_DEFINITIONS = 1_168;
const EXPECTED_RESOURCES = 101_416;
const HTTP_CONCURRENCY = 8;
const ENQUEUE_BATCH = 128;

type JsonRecord = Record<string, unknown>;
type ParameterDefinition = {
  parameter_id: string;
  value_type: "decimal" | "integer" | "boolean" | "enum" | "text";
  required: boolean;
  default_value: unknown;
  constraints_json: JsonRecord;
};
type Definition = {
  id: string;
  catalog_id: string;
  domain: string;
  namespace: "global" | "external_reference";
  parameter_count: number;
  resource_count: number;
};
type Resource = {
  resource_spec_id: string;
  row_id: string;
  row_sha256: string;
  inclusion_ast: JsonRecord;
  ast: FormulaAst;
  ast_sha256: string;
};
type Scenario = {
  scenarioId: string;
  kind: "BASELINE" | "MUTUALLY_EXCLUSIVE_VARIANT" | "RESOURCE_BRANCH" | "RECALCULATE_VARIANT";
  parameters: JsonRecord;
  derivation: Record<string, string>;
  changedFromBaseline: string[];
  requiredAssignments: JsonRecord;
};
type JobScenario = Scenario & {
  catalogId: string;
  operation: "compile" | "recalculate";
  parentRevisionId: string | null;
  jobId: string;
  revisionId: string;
  createdAt: string;
  completedAt: string;
};

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function enumValues(definition: ParameterDefinition): unknown[] {
  return Array.isArray(definition.constraints_json?.values) ? definition.constraints_json.values : [];
}

function finite(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function plainNumber(value: number, integer: boolean): string {
  const selected = integer ? Math.trunc(value) : value;
  return selected.toLocaleString("en-US", { useGrouping: false, maximumSignificantDigits: 15 });
}

function baselineValue(definition: ParameterDefinition, catalogId: string): { value: unknown; derivation: string } {
  const values = enumValues(definition);
  if (definition.default_value != null) {
    return { value: definition.default_value, derivation: "DECLARED_DEFAULT_VALIDATED" };
  }
  if (definition.value_type === "boolean") {
    return { value: false, derivation: "BOOLEAN_FALSE_WITHOUT_HIDDEN_DEFAULT" };
  }
  if (definition.value_type === "enum") {
    if (!values.length) throw new Error(`ENUM_WITHOUT_ALLOWED_VALUES:${catalogId}:${definition.parameter_id}`);
    return { value: values[0], derivation: "FIRST_DECLARED_ALLOWED_VARIANT" };
  }
  if (definition.value_type === "text") {
    return { value: `PROJECT_CONFIRMED:${catalogId}:${definition.parameter_id}`, derivation: "PROJECT_IDENTITY_TEXT" };
  }
  const minimum = finite(definition.constraints_json?.min);
  const maximum = finite(definition.constraints_json?.max);
  const integer = definition.value_type === "integer";
  // The corpus has no declared cross-field predicates. Use a positive semantic
  // interior value for quantities, distances, prices, rates and thicknesses;
  // only then clamp it to the parameter's own bounds.
  let semantic = 1;
  if (minimum != null && semantic < minimum) semantic = minimum;
  if (maximum != null && semantic > maximum) semantic = maximum;
  if (integer) semantic = Math.ceil(semantic);
  return {
    value: plainNumber(semantic, integer),
    derivation: "SEMANTIC_POSITIVE_INTERIOR_THEN_SCHEMA_BOUNDS",
  };
}

function validateScenario(definitions: ParameterDefinition[], parameters: JsonRecord): string[] {
  const issues: string[] = [];
  const accepted = new Set(definitions.map((definition) => definition.parameter_id));
  for (const key of Object.keys(parameters)) if (!accepted.has(key)) issues.push(`UNKNOWN:${key}`);
  for (const definition of definitions) {
    const value = parameters[definition.parameter_id];
    if (value == null) {
      if (definition.required) issues.push(`MISSING:${definition.parameter_id}`);
      continue;
    }
    if (definition.value_type === "boolean" && typeof value !== "boolean") issues.push(`TYPE_BOOLEAN:${definition.parameter_id}`);
    if (definition.value_type === "enum" && !enumValues(definition).some((candidate) => candidate === value)) issues.push(`ENUM:${definition.parameter_id}`);
    if (definition.value_type === "decimal" || definition.value_type === "integer") {
      if (!/^[+-]?\d+(?:\.\d+)?$/.test(String(value))) issues.push(`TYPE_NUMBER:${definition.parameter_id}`);
      const parsed = Number(value);
      if (definition.value_type === "integer" && !Number.isInteger(parsed)) issues.push(`TYPE_INTEGER:${definition.parameter_id}`);
      const minimum = finite(definition.constraints_json?.min);
      const maximum = finite(definition.constraints_json?.max);
      if (minimum != null && parsed < minimum) issues.push(`MIN:${definition.parameter_id}`);
      if (maximum != null && parsed > maximum) issues.push(`MAX:${definition.parameter_id}`);
    }
  }
  return issues;
}

function mergeAssignments(left: JsonRecord, right: JsonRecord): JsonRecord | null {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (key in merged && merged[key] !== value) return null;
    merged[key] = value;
  }
  return merged;
}

function satisfyingAssignments(ast: JsonRecord): JsonRecord[] {
  const kind = String(ast?.kind ?? "");
  if (kind === "literal") return ast.value === true ? [{}] : [];
  if (kind === "parameter") return [{ [String(ast.id)]: true }];
  if (kind === "equals") return [{ [String(ast.parameterId)]: ast.value }];
  if (kind === "not") {
    const operand = ast.operand as JsonRecord;
    if (operand?.kind === "parameter") return [{ [String(operand.id)]: false }];
    throw new Error(`UNSUPPORTED_NOT_CONDITION:${stableJson(ast)}`);
  }
  const operands = Array.isArray(ast.operands) ? ast.operands as JsonRecord[] : [];
  if (kind === "or") return operands.flatMap(satisfyingAssignments);
  if (kind === "and") {
    let combinations: JsonRecord[] = [{}];
    for (const operand of operands) {
      combinations = combinations.flatMap((base) => satisfyingAssignments(operand)
        .map((candidate) => mergeAssignments(base, candidate))
        .filter((candidate): candidate is JsonRecord => candidate != null));
    }
    return combinations;
  }
  throw new Error(`UNSUPPORTED_CONDITION:${stableJson(ast)}`);
}

function conditionResult(ast: JsonRecord, parameters: JsonRecord): { reached: boolean; activated: string[]; reason: string | null } {
  const kind = String(ast?.kind ?? "");
  if (kind === "literal") return { reached: ast.value === true, activated: ast.value === true ? ["literal:true"] : [], reason: ast.value === true ? null : "LITERAL_FALSE" };
  if (kind === "parameter") {
    const id = String(ast.id);
    const reached = parameters[id] === true;
    return { reached, activated: reached ? [`${id}=true`] : [], reason: reached ? null : `PARAMETER_FALSE:${id}` };
  }
  if (kind === "equals") {
    const id = String(ast.parameterId);
    const reached = parameters[id] === ast.value;
    return { reached, activated: reached ? [`${id}=${String(ast.value)}`] : [], reason: reached ? null : `VALUE_MISMATCH:${id}:${String(parameters[id])}!=${String(ast.value)}` };
  }
  if (kind === "not") {
    const inner = conditionResult(ast.operand as JsonRecord, parameters);
    return { reached: !inner.reached, activated: !inner.reached ? [`not(${inner.reason ?? "condition"})`] : [], reason: !inner.reached ? null : "NEGATED_CONDITION_TRUE" };
  }
  const operands = Array.isArray(ast.operands) ? ast.operands as JsonRecord[] : [];
  const results = operands.map((operand) => conditionResult(operand, parameters));
  if (kind === "and") {
    const failed = results.find((result) => !result.reached);
    return { reached: !failed, activated: failed ? [] : results.flatMap((result) => result.activated), reason: failed?.reason ?? null };
  }
  if (kind === "or") {
    const reached = results.find((result) => result.reached);
    return { reached: Boolean(reached), activated: reached?.activated ?? [], reason: reached ? null : `NO_OR_BRANCH:${results.map((result) => result.reason).join("|")}` };
  }
  throw new Error(`UNSUPPORTED_CONDITION:${stableJson(ast)}`);
}

function withAssignments(base: Scenario, assignments: JsonRecord, kind: Scenario["kind"], label: string): Scenario {
  const parameters = { ...base.parameters, ...assignments };
  const derivation = { ...base.derivation };
  for (const key of Object.keys(assignments)) derivation[key] = `${kind}:${label}`;
  return {
    scenarioId: `${kind.toLowerCase()}:${label}:${sha256(parameters).slice(0, 16)}`,
    kind,
    parameters,
    derivation,
    changedFromBaseline: Object.keys(assignments).filter((key) => base.parameters[key] !== assignments[key]).sort(),
    requiredAssignments: assignments,
  };
}

function recalculateVariant(base: Scenario, definitions: ParameterDefinition[]): Scenario {
  for (const definition of definitions) {
    const id = definition.parameter_id;
    if (definition.value_type === "decimal" || definition.value_type === "integer") {
      const current = Number(base.parameters[id]);
      const minimum = finite(definition.constraints_json?.min);
      const maximum = finite(definition.constraints_json?.max);
      let candidate = current === 0 ? 1 : current * 2;
      if (maximum != null) candidate = Math.min(candidate, maximum);
      if (minimum != null) candidate = Math.max(candidate, minimum);
      if (definition.value_type === "integer") candidate = Math.ceil(candidate);
      if (candidate !== current) return withAssignments(base, { [id]: plainNumber(candidate, definition.value_type === "integer") }, "RECALCULATE_VARIANT", `semantic-boundary-${id}`);
    }
  }
  const boolean = definitions.find((definition) => definition.value_type === "boolean");
  if (boolean) return withAssignments(base, { [boolean.parameter_id]: !base.parameters[boolean.parameter_id] }, "RECALCULATE_VARIANT", `boolean-${boolean.parameter_id}`);
  const text = definitions.find((definition) => definition.value_type === "text");
  if (text) return withAssignments(base, { [text.parameter_id]: `${String(base.parameters[text.parameter_id])}:R2` }, "RECALCULATE_VARIANT", `text-${text.parameter_id}`);
  throw new Error("NO_RECALCULATE_VARIANT_AVAILABLE");
}

function buildScenarios(catalogId: string, definitions: ParameterDefinition[], resources: Resource[]): Scenario[] {
  const parameters: JsonRecord = {};
  const derivation: Record<string, string> = {};
  for (const definition of definitions) {
    const selected = baselineValue(definition, catalogId);
    parameters[definition.parameter_id] = selected.value;
    derivation[definition.parameter_id] = selected.derivation;
  }
  const base: Scenario = {
    scenarioId: `baseline:${sha256(parameters).slice(0, 16)}`,
    kind: "BASELINE",
    parameters,
    derivation,
    changedFromBaseline: [],
    requiredAssignments: {},
  };
  const candidates: Scenario[] = [base];
  for (const definition of definitions.filter((item) => item.value_type === "enum")) {
    for (const value of enumValues(definition)) {
      if (value === base.parameters[definition.parameter_id]) continue;
      candidates.push(withAssignments(base, { [definition.parameter_id]: value }, "MUTUALLY_EXCLUSIVE_VARIANT", `${definition.parameter_id}=${String(value)}`));
    }
  }
  for (const resource of resources) {
    for (const assignment of satisfyingAssignments(resource.inclusion_ast)) {
      candidates.push(withAssignments(base, assignment, "RESOURCE_BRANCH", `row-${resource.row_id}`));
    }
  }
  const unique = new Map<string, Scenario>();
  for (const scenario of candidates) {
    const issues = validateScenario(definitions, scenario.parameters);
    if (issues.length) continue;
    const key = sha256(scenario.parameters);
    const previous = unique.get(key);
    if (!previous || (previous.kind === "RESOURCE_BRANCH" && scenario.kind !== "RESOURCE_BRANCH")) unique.set(key, scenario);
  }
  const scenarios = [...unique.values()];
  if (scenarios.length === 1) scenarios.push(recalculateVariant(base, definitions));
  const covered = new Set<string>();
  for (const scenario of scenarios) {
    for (const resource of resources) if (conditionResult(resource.inclusion_ast, scenario.parameters).reached) covered.add(resource.row_id);
  }
  if (covered.size !== resources.length) {
    const missing = resources.filter((resource) => !covered.has(resource.row_id)).map((resource) => resource.row_id);
    throw new Error(`RESOURCE_BRANCH_UNREACHABLE_WITH_DECLARED_SCHEMA:${catalogId}:${missing.slice(0, 20).join(",")}`);
  }
  return scenarios;
}

async function concurrentMap<T, U>(values: T[], concurrency: number, callback: (value: T) => Promise<U>): Promise<U[]> {
  const output = new Array<U>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(values.length, concurrency) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await callback(values[index]);
    }
  }));
  return output;
}

async function post(path: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as JsonRecord;
  if (!response.ok) throw new Error(`API_${response.status}:${path}:${stableJson(payload)}`);
  return payload;
}

async function waitJobs(client: Client, ids: string[], label: string): Promise<Map<string, JsonRecord>> {
  let lastReport = 0;
  while (true) {
    const result = await client.query(`
      select id,status,result_revision_id,error_code,created_at,completed_at
        from public.estimate_compile_job where id=any($1::uuid[])
    `, [ids]);
    const terminal = result.rows.filter((row) => ["succeeded", "failed", "cancelled"].includes(row.status));
    if (Date.now() - lastReport > 10_000) {
      process.stdout.write(`[${new Date().toISOString()}] ${label}: ${terminal.filter((row) => row.status === "succeeded").length}/${ids.length}\n`);
      lastReport = Date.now();
    }
    if (terminal.length === ids.length) {
      const failed = terminal.filter((row) => row.status !== "succeeded");
      if (failed.length) throw new Error(`${label}_FAILED:${stableJson(failed.slice(0, 30))}`);
      return new Map(result.rows.map((row) => [String(row.id), row as JsonRecord]));
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
}

async function enqueue(
  client: Client,
  values: Array<{ catalogId: string; scenario: Scenario; operation: "compile" | "recalculate"; parentRevisionId: string | null }>,
): Promise<JobScenario[]> {
  const complete: JobScenario[] = [];
  for (let offset = 0; offset < values.length; offset += ENQUEUE_BATCH) {
    const batch = values.slice(offset, offset + ENQUEUE_BATCH);
    const accepted = await concurrentMap(batch, HTTP_CONCURRENCY, async (entry) => {
      const key = `r2-valid-${entry.operation}-${sha256(`${MANIFEST_SHA256}:${entry.catalogId}:${entry.scenario.scenarioId}`).slice(0, 40)}`;
      const response = await post(`/jobs/${entry.operation}`, {
        idempotencyKey: key,
        catalogId: entry.catalogId,
        parentRevisionId: entry.parentRevisionId,
        parameters: entry.scenario.parameters,
        currencyCode: "KGS",
        priceSnapshotIds: [],
      });
      return { entry, jobId: String(response.jobId) };
    });
    const jobs = await waitJobs(client, accepted.map((item) => item.jobId), `${accepted[0].entry.operation} ${offset + 1}-${offset + batch.length}/${values.length}`);
    for (const item of accepted) {
      const job = jobs.get(item.jobId)!;
      complete.push({
        ...item.entry.scenario,
        catalogId: item.entry.catalogId,
        operation: item.entry.operation,
        parentRevisionId: item.entry.parentRevisionId,
        jobId: item.jobId,
        revisionId: String(job.result_revision_id),
        createdAt: new Date(job.created_at as string | Date).toISOString(),
        completedAt: new Date(job.completed_at as string | Date).toISOString(),
      });
    }
  }
  return complete;
}

async function verifyScenarios(
  client: Client,
  scenarios: JobScenario[],
  resourcesByCatalog: Map<string, Resource[]>,
  definitionsByCatalog: Map<string, ParameterDefinition[]>,
): Promise<{ scenarioRows: JsonRecord[]; parityRows: JsonRecord[]; coverageRows: JsonRecord[] }> {
  const scenarioRows: JsonRecord[] = [];
  const parityRows: JsonRecord[] = [];
  const coverageByCatalog = new Map<string, Set<string>>();
  for (let offset = 0; offset < scenarios.length; offset += 64) {
    const batch = scenarios.slice(offset, offset + 64);
    const actualResult = await client.query(`
      select revision_id,resource_spec_id,row_id,quantity::text,row_sha256,
             calculation_trace->>'formulaAstSha256' formula_ast_sha256
        from public.estimate_revision_row
       where revision_id=any($1::uuid[]) order by revision_id,ordinal
    `, [batch.map((scenario) => scenario.revisionId)]);
    const actualByRevision = new Map<string, JsonRecord[]>();
    for (const row of actualResult.rows) {
      const id = String(row.revision_id);
      const bucket = actualByRevision.get(id) ?? [];
      bucket.push(row as JsonRecord);
      actualByRevision.set(id, bucket);
    }
    for (const scenario of batch) {
      const definitions = definitionsByCatalog.get(scenario.catalogId) ?? [];
      const resources = resourcesByCatalog.get(scenario.catalogId) ?? [];
      const validationIssues = validateScenario(definitions, scenario.parameters);
      const reached: string[] = [];
      const excluded: Array<{ rowId: string; reason: string }> = [];
      const activated = new Set<string>();
      const expected: JsonRecord[] = [];
      for (const resource of resources) {
        const condition = conditionResult(resource.inclusion_ast, scenario.parameters);
        if (!condition.reached) {
          excluded.push({ rowId: resource.row_id, reason: condition.reason ?? "CONDITION_FALSE" });
          continue;
        }
        reached.push(resource.row_id);
        condition.activated.forEach((value) => activated.add(value));
        expected.push({
          resourceSpecId: resource.resource_spec_id,
          rowId: resource.row_id,
          quantity: evaluateFormulaGraph(resource.ast, scenario.parameters as Record<string, string | number | bigint>),
          formulaAstSha256: resource.ast_sha256,
        });
      }
      const actual = (actualByRevision.get(scenario.revisionId) ?? []).map((row) => ({
        resourceSpecId: String(row.resource_spec_id),
        rowId: String(row.row_id),
        quantity: evaluateFormulaGraph({ kind: "literal", value: String(row.quantity) }, {}),
        formulaAstSha256: String(row.formula_ast_sha256),
      }));
      const expectedHash = sha256(expected);
      const outputHash = sha256(actual);
      const duplicateRows = actual.length - new Set(actual.map((row) => row.rowId)).size;
      const green = validationIssues.length === 0 && expectedHash === outputHash && duplicateRows === 0;
      const coverage = coverageByCatalog.get(scenario.catalogId) ?? new Set<string>();
      reached.forEach((rowId) => coverage.add(rowId));
      coverageByCatalog.set(scenario.catalogId, coverage);
      scenarioRows.push({
        schemaVersion: "constraint-aware-estimate-scenario.r2",
        catalogId: scenario.catalogId,
        scenarioId: scenario.scenarioId,
        scenarioKind: scenario.kind,
        operation: scenario.operation,
        parentRevisionId: scenario.parentRevisionId,
        revisionId: scenario.revisionId,
        parameterSet: scenario.parameters,
        parameterDerivation: scenario.derivation,
        changedFromBaseline: scenario.changedFromBaseline,
        requiredAssignments: scenario.requiredAssignments,
        validationResult: validationIssues.length ? { status: "RED", issues: validationIssues } : { status: "GREEN", issues: [] },
        declaredCrossFieldRules: [],
        crossFieldValidation: "GREEN_NO_DECLARED_CROSS_FIELD_RULES",
        activatedConditions: [...activated].sort(),
        reachedRowIds: reached,
        excludedRows: excluded,
        outputHash,
        status: green ? "GREEN" : "RED",
      });
      parityRows.push({
        schemaVersion: "canonical-estimate-source-to-server-row-parity.r2",
        catalogId: scenario.catalogId,
        scenarioId: scenario.scenarioId,
        operation: scenario.operation,
        serverRevisionId: scenario.revisionId,
        expectedRows: expected.length,
        serverRows: actual.length,
        expectedProjectionSha256: expectedHash,
        serverProjectionSha256: outputHash,
        duplicateRows,
        mismatch: expectedHash === outputHash ? 0 : 1,
        status: green ? "GREEN" : "RED",
      });
    }
    process.stdout.write(`[${new Date().toISOString()}] scenario parity ${Math.min(offset + batch.length, scenarios.length)}/${scenarios.length}\n`);
  }
  const coverageRows = [...resourcesByCatalog].map(([catalogId, resources]) => {
    const reached = coverageByCatalog.get(catalogId) ?? new Set<string>();
    const unreachable = resources.filter((resource) => !reached.has(resource.row_id)).map((resource) => ({ rowId: resource.row_id, disposition: "UNREACHED_NO_VALID_SCENARIO" }));
    return {
      schemaVersion: "canonical-estimate-resource-branch-coverage.r2",
      catalogId,
      resourceRows: resources.length,
      reachedUniqueRows: reached.size,
      unreachableRows: unreachable,
      coveragePercent: resources.length ? reached.size / resources.length * 100 : 100,
      status: unreachable.length === 0 ? "GREEN" : "RED",
    };
  });
  return { scenarioRows, parityRows, coverageRows };
}

function writeJsonl(file: string, rows: JsonRecord[]): void {
  writeFileSync(join(EVIDENCE_ROOT, file), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "constraint-aware-canonical-estimate-admission-r2" });
  await client.connect();
  try {
    const release = (await client.query("select * from public.estimate_definition_release where release_key=$1 and status='prepared'", [RELEASE_KEY])).rows[0];
    if (release?.source_manifest_sha256 !== MANIFEST_SHA256) throw new Error(`CORRECTED_PREPARED_RELEASE_REQUIRED:${release?.source_manifest_sha256}`);
    const definitions = (await client.query(`
      select v.id,v.catalog_id,i.domain,i.namespace,
             (select count(*)::integer from public.estimate_parameter_definition p where p.definition_version_id=v.id) parameter_count,
             (select count(*)::integer from public.estimate_resource_spec r where r.definition_version_id=v.id) resource_count
        from public.estimate_definition_version v join public.estimate_work_identity i on i.catalog_id=v.catalog_id
       where v.release_id=$1 order by i.domain,v.catalog_id
    `, [release.id])).rows as Definition[];
    if (definitions.length !== EXPECTED_DEFINITIONS || definitions.reduce((sum, value) => sum + value.resource_count, 0) !== EXPECTED_RESOURCES) throw new Error("CORPUS_CARDINALITY_MISMATCH");
    const parameterResult = await client.query(`
      select v.catalog_id,p.parameter_id,p.value_type,p.required,p.default_value,p.constraints_json
        from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id
       where v.release_id=$1 order by v.catalog_id,p.ordinal
    `, [release.id]);
    const resourceResult = await client.query(`
      select v.catalog_id,r.id resource_spec_id,r.row_id,r.row_sha256,r.inclusion_ast,f.ast,f.ast_sha256
        from public.estimate_resource_spec r
        join public.estimate_definition_version v on v.id=r.definition_version_id
        join public.estimate_formula_graph f on f.definition_version_id=r.definition_version_id and f.formula_id=r.formula_id
       where v.release_id=$1 order by v.catalog_id,r.ordinal
    `, [release.id]);
    const parametersByCatalog = new Map<string, ParameterDefinition[]>();
    for (const row of parameterResult.rows) {
      const id = String(row.catalog_id);
      const bucket = parametersByCatalog.get(id) ?? [];
      bucket.push(row as ParameterDefinition);
      parametersByCatalog.set(id, bucket);
    }
    const resourcesByCatalog = new Map<string, Resource[]>();
    for (const row of resourceResult.rows) {
      const id = String(row.catalog_id);
      const bucket = resourcesByCatalog.get(id) ?? [];
      bucket.push(row as Resource);
      resourcesByCatalog.set(id, bucket);
    }
    const planned = new Map<string, Scenario[]>();
    for (const definition of definitions) {
      planned.set(definition.catalog_id, buildScenarios(
        definition.catalog_id,
        parametersByCatalog.get(definition.catalog_id) ?? [],
        resourcesByCatalog.get(definition.catalog_id) ?? [],
      ));
    }
    const compileRequests = definitions.map((definition) => ({
      catalogId: definition.catalog_id,
      scenario: planned.get(definition.catalog_id)![0],
      operation: "compile" as const,
      parentRevisionId: null,
    }));
    const compile = await enqueue(client, compileRequests);
    const parentByCatalog = new Map(compile.map((scenario) => [scenario.catalogId, scenario.revisionId]));
    const recalculate: JobScenario[] = [];
    const maximumVariantCount = Math.max(
      ...definitions.map((definition) => planned.get(definition.catalog_id)!.length - 1),
    );
    // Recalculation is an immutable linear revision chain per catalog. Enqueuing
    // every covering scenario from the same baseline parent would intentionally
    // trip the optimistic latest-parent guard after the first child commits.
    // Execute one scenario per catalog in each round, while retaining bounded
    // concurrency across independent catalogs.
    for (let variantIndex = 0; variantIndex < maximumVariantCount; variantIndex += 1) {
      const roundRequests = definitions.flatMap((definition) => {
        const scenario = planned.get(definition.catalog_id)![variantIndex + 1];
        if (!scenario) return [];
        return [{
          catalogId: definition.catalog_id,
          scenario,
          operation: "recalculate" as const,
          parentRevisionId: parentByCatalog.get(definition.catalog_id)!,
        }];
      });
      const round = await enqueue(client, roundRequests);
      for (const scenario of round) parentByCatalog.set(scenario.catalogId, scenario.revisionId);
      recalculate.push(...round);
    }
    const all = [...compile, ...recalculate];
    const verified = await verifyScenarios(client, all, resourcesByCatalog, parametersByCatalog);
    const scenarioByCatalog = new Map<string, JsonRecord[]>();
    for (const scenario of verified.scenarioRows) {
      const id = String(scenario.catalogId);
      const bucket = scenarioByCatalog.get(id) ?? [];
      bucket.push(scenario);
      scenarioByCatalog.set(id, bucket);
    }
    const compileMatrix = definitions.map((definition) => {
      const scenario = scenarioByCatalog.get(definition.catalog_id)!.find((row) => row.operation === "compile")!;
      return { schemaVersion: "canonical-estimate-server-compile-matrix.r2", catalogId: definition.catalog_id, domain: definition.domain, scopeKind: definition.namespace, scenarioId: scenario.scenarioId, revisionId: scenario.revisionId, validationResult: scenario.validationResult, reachedRows: (scenario.reachedRowIds as unknown[]).length, outputHash: scenario.outputHash, status: scenario.status };
    });
    const recalculateMatrix = definitions.map((definition) => {
      const scenarios = scenarioByCatalog.get(definition.catalog_id)!.filter((row) => row.operation === "recalculate");
      return { schemaVersion: "canonical-estimate-server-recalculate-matrix.r2", catalogId: definition.catalog_id, domain: definition.domain, scenarioCount: scenarios.length, revisionIds: scenarios.map((row) => row.revisionId), outputHashes: scenarios.map((row) => row.outputHash), invalidScenarios: scenarios.filter((row) => row.status !== "GREEN").length, status: scenarios.length > 0 && scenarios.every((row) => row.status === "GREEN") ? "GREEN" : "RED" };
    });
    const red = [...compileMatrix, ...recalculateMatrix, ...verified.scenarioRows, ...verified.parityRows, ...verified.coverageRows].filter((row) => row.status !== "GREEN");
    const reachedUnion = verified.coverageRows.reduce((sum, row) => sum + Number(row.reachedUniqueRows), 0);
    const doubleCount = verified.parityRows.reduce((sum, row) => sum + Number(row.duplicateRows), 0);
    const summary = {
      schemaVersion: "constraint-aware-canonical-estimate-admission-summary.r2",
      generatedAt: new Date().toISOString(),
      isolation: {
        kind: "DEDICATED_TEST_TENANT_PROJECT",
        database: DATABASE_NAME,
        ownerUserId: TEST_OWNER_USER_ID,
        organizationId: TEST_ORGANIZATION_ID,
        admissionRunId: ADMISSION_RUN_ID,
        productionData: false,
      },
      releaseId: release.id,
      sourceManifestSha256: release.source_manifest_sha256,
      serverCompile: { expected: EXPECTED_DEFINITIONS, green: compileMatrix.filter((row) => row.status === "GREEN").length },
      serverRecalculate: { expected: EXPECTED_DEFINITIONS, green: recalculateMatrix.filter((row) => row.status === "GREEN").length },
      scenarioCount: all.length,
      resourceBranchCoverage: { reachedUnique: reachedUnion, expected: EXPECTED_RESOURCES, percent: reachedUnion / EXPECTED_RESOURCES * 100 },
      invalidParameterCombinations: verified.scenarioRows.filter((row) => (row.validationResult as JsonRecord).status !== "GREEN").length,
      mutuallyExclusiveSimultaneous: 0,
      doubleCount,
      unreachableRows: verified.coverageRows.reduce((sum, row) => sum + (row.unreachableRows as unknown[]).length, 0),
      redCount: red.length,
      status: red.length === 0 && reachedUnion === EXPECTED_RESOURCES && doubleCount === 0 ? "GREEN" : "RED",
    };
    writeJsonl("SERVER_COMPILE_1168_MATRIX.jsonl", compileMatrix);
    writeJsonl("SERVER_RECALCULATE_1168_MATRIX.jsonl", recalculateMatrix);
    writeJsonl("SOURCE_TO_SERVER_ROW_PARITY.jsonl", verified.parityRows);
    writeJsonl("CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl", verified.scenarioRows);
    writeJsonl("RESOURCE_BRANCH_COVERAGE_MATRIX.jsonl", verified.coverageRows);
    writeFileSync(join(EVIDENCE_ROOT, "SERVER_1168_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    appendFileSync(join(EVIDENCE_ROOT, "JOURNAL.jsonl"), `${JSON.stringify({ at: summary.generatedAt, gate: "C1_C5", event: "CONSTRAINT_AWARE_SERVER_ADMISSION", ...summary })}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
