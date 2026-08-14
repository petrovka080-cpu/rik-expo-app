import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

// This auditor intentionally imports no compiler, scenario builder, worker, API
// handler, formula helper or migration helper from production.
const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r3_final";
const R1_DATABASE_URL = process.env.ESTIMATE_R1_BASELINE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_schema_replay";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";
const EXPECTED = { definitions: 1_168, parameters: 138_425, formulas: 101_416, resources: 101_416, scenarios: 3_684 };
const SCALE = 1_000_000_000n;

type Json = Record<string, unknown>;
type Formula =
  | { kind: "literal"; value: string }
  | { kind: "parameter"; id: string }
  | { kind: "unary"; operator: "+" | "-"; operand: Formula }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/"; left: Formula; right: Formula }
  | { kind: "call"; function: "ceil" | "max" | "min"; arguments: Formula[] };

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

class Decimal {
  private constructor(readonly scaled: bigint) {}

  static parse(value: unknown): Decimal {
    const raw = String(value).trim();
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
    if (!match) throw new Error(`INDEPENDENT_DECIMAL_INVALID:${raw}`);
    const fraction = (match[3] ?? "").padEnd(10, "0");
    let scaled = BigInt(match[2]) * SCALE + BigInt(fraction.slice(0, 9));
    if (Number(fraction[9] ?? "0") >= 5) scaled += 1n;
    if (match[1] === "-") scaled = -scaled;
    return new Decimal(scaled);
  }

  static from(scaled: bigint): Decimal { return new Decimal(scaled); }
  private static divideRounded(numerator: bigint, denominator: bigint): bigint {
    if (denominator === 0n) throw new Error("INDEPENDENT_DIVISION_BY_ZERO");
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    if (remainder === 0n) return quotient;
    const absRemainder = remainder < 0n ? -remainder : remainder;
    const absDenominator = denominator < 0n ? -denominator : denominator;
    const sameSign = (numerator < 0n) === (denominator < 0n);
    return absRemainder * 2n >= absDenominator ? quotient + (sameSign ? 1n : -1n) : quotient;
  }
  add(other: Decimal): Decimal { return Decimal.from(this.scaled + other.scaled); }
  subtract(other: Decimal): Decimal { return Decimal.from(this.scaled - other.scaled); }
  multiply(other: Decimal): Decimal { return Decimal.from(Decimal.divideRounded(this.scaled * other.scaled, SCALE)); }
  divide(other: Decimal): Decimal { return Decimal.from(Decimal.divideRounded(this.scaled * SCALE, other.scaled)); }
  negate(): Decimal { return Decimal.from(-this.scaled); }
  ceil(): Decimal {
    const whole = this.scaled / SCALE;
    const remainder = this.scaled % SCALE;
    return Decimal.from((remainder > 0n ? whole + 1n : whole) * SCALE);
  }
  toString(): string {
    const negative = this.scaled < 0n;
    const absolute = negative ? -this.scaled : this.scaled;
    const fraction = String(absolute % SCALE).padStart(9, "0").replace(/0+$/, "");
    return `${negative ? "-" : ""}${absolute / SCALE}${fraction ? `.${fraction}` : ""}`;
  }
}

function evaluate(ast: Formula, parameters: Json): Decimal {
  if (ast.kind === "literal") return Decimal.parse(ast.value);
  if (ast.kind === "parameter") {
    if (!(ast.id in parameters)) throw new Error(`INDEPENDENT_PARAMETER_MISSING:${ast.id}`);
    return Decimal.parse(parameters[ast.id]);
  }
  if (ast.kind === "unary") {
    const value = evaluate(ast.operand, parameters);
    return ast.operator === "-" ? value.negate() : value;
  }
  if (ast.kind === "binary") {
    const left = evaluate(ast.left, parameters);
    const right = evaluate(ast.right, parameters);
    if (ast.operator === "+") return left.add(right);
    if (ast.operator === "-") return left.subtract(right);
    if (ast.operator === "*") return left.multiply(right);
    return left.divide(right);
  }
  const values = ast.arguments.map((argument) => evaluate(argument, parameters));
  if (ast.function === "ceil") return values[0].ceil();
  return values.reduce((selected, candidate) =>
    ast.function === "max"
      ? (candidate.scaled > selected.scaled ? candidate : selected)
      : (candidate.scaled < selected.scaled ? candidate : selected));
}

function condition(ast: Json, parameters: Json): boolean {
  const kind = String(ast.kind ?? "");
  if (kind === "literal") return ast.value === true;
  if (kind === "parameter") return parameters[String(ast.id)] === true;
  if (kind === "equals") return parameters[String(ast.parameterId)] === ast.value;
  if (kind === "not") return !condition(ast.operand as Json, parameters);
  const operands = Array.isArray(ast.operands) ? ast.operands as Json[] : [];
  if (kind === "and") return operands.every((operand) => condition(operand, parameters));
  if (kind === "or") return operands.some((operand) => condition(operand, parameters));
  throw new Error(`INDEPENDENT_CONDITION_UNSUPPORTED:${stableJson(ast)}`);
}

function validateParameters(definitions: Json[], parameters: Json): string[] {
  const issues: string[] = [];
  const accepted = new Set(definitions.map((definition) => String(definition.parameter_id)));
  for (const key of Object.keys(parameters)) if (!accepted.has(key)) issues.push(`UNKNOWN:${key}`);
  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const value = parameters[id];
    const constraints = (definition.constraints_json ?? {}) as Json;
    if (value == null) {
      if (definition.required === true) issues.push(`MISSING:${id}`);
      continue;
    }
    const type = String(definition.value_type);
    if (type === "boolean" && typeof value !== "boolean") issues.push(`TYPE_BOOLEAN:${id}`);
    if (type === "enum") {
      const allowed = Array.isArray(constraints.values) ? constraints.values : [];
      if (!allowed.some((candidate) => candidate === value)) issues.push(`ENUM:${id}`);
    }
    if (type === "decimal" || type === "integer") {
      if (!/^[+-]?\d+(?:\.\d+)?$/.test(String(value))) issues.push(`TYPE_NUMBER:${id}`);
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) issues.push(`FINITE:${id}`);
      if (type === "integer" && !Number.isInteger(numeric)) issues.push(`INTEGER:${id}`);
      if (constraints.min != null && numeric < Number(constraints.min)) issues.push(`MIN:${id}`);
      if (constraints.max != null && numeric > Number(constraints.max)) issues.push(`MAX:${id}`);
    }
  }
  return issues;
}

async function fingerprintR1(client: Client): Promise<Json> {
  const components: Record<string, Json> = {};
  const specs: Array<[string, string, unknown[]]> = [
    ["release", `select id::text k,jsonb_build_array(
      r.id,r.release_key,r.schema_version,r.source_commit,r.source_tree,r.source_manifest_sha256,
      r.definition_count,r.resource_row_count,r.metadata,r.created_at,r.activated_at,r.sealed_at
    )::text payload from public.estimate_definition_release r where id=$1`, [R1_RELEASE_ID]],
    ["definitions", "select v.id::text k,to_jsonb(v)::text payload from public.estimate_definition_version v where release_id=$1", [R1_RELEASE_ID]],
    ["parameters", "select p.definition_version_id::text||':'||p.parameter_id k,to_jsonb(p)::text payload from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1", [R1_RELEASE_ID]],
    ["formulas", "select f.definition_version_id::text||':'||f.formula_id k,to_jsonb(f)::text payload from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1", [R1_RELEASE_ID]],
    ["resources", "select s.id::text k,to_jsonb(s)::text payload from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1", [R1_RELEASE_ID]],
    ["revisions", `select r.id::text k,jsonb_build_array(
      r.id,r.parent_revision_id,r.release_id,r.catalog_id,r.revision_number,r.status,
      r.input_parameters,r.price_snapshot_ids,r.currency_code,r.totals,r.row_count,
      r.checksum_sha256,r.compiler_version,r.migration_source,r.created_at
    )::text payload from public.estimate_revision r where release_id=$1`, [R1_RELEASE_ID]],
    ["revision_rows", `select rr.revision_id::text||':'||rr.row_id k,jsonb_build_array(
      rr.revision_id,rr.row_id,rr.ordinal,rr.resource_spec_id,rr.section,rr.category,
      rr.title_ru,rr.unit_id,rr.quantity,rr.unit_price,rr.amount,rr.currency_code,
      rr.procurement_eligible,rr.calculation_trace,rr.normative_trace,
      rr.legacy_row_payload,rr.row_sha256
    )::text payload from public.estimate_revision_row rr
      join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1`, [R1_RELEASE_ID]],
    ["revision_prices", "select rp.revision_id::text||':'||rp.row_id k,to_jsonb(rp)::text payload from public.estimate_revision_row_price rp join public.estimate_revision r on r.id=rp.revision_id where r.release_id=$1", [R1_RELEASE_ID]],
  ];
  for (const [label, source, params] of specs) {
    const result = await client.query(`select count(*)::integer count,encode(sha256(convert_to(coalesce(string_agg(payload,E'\\n' order by k),''),'UTF8')),'hex') sha256 from (${source}) q`, params);
    components[label] = { count: Number(result.rows[0].count), sha256: String(result.rows[0].sha256) };
  }
  return { releaseId: R1_RELEASE_ID, components, aggregateSha256: sha256(components) };
}

function readJsonLines(file: string): Json[] {
  return readFileSync(join(EVIDENCE_ROOT, file), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const candidate = new Client({ connectionString: DATABASE_URL, application_name: "r3-independent-release-auditor" });
  const baseline = new Client({ connectionString: R1_DATABASE_URL, application_name: "r3-independent-r1-baseline" });
  await Promise.all([candidate.connect(), baseline.connect()]);
  try {
    const [baselineR1, candidateR1] = await Promise.all([fingerprintR1(baseline), fingerprintR1(candidate)]);
    const r1BytePreserved = stableJson(baselineR1) === stableJson(candidateR1);
    const counts = (await candidate.query(`
      select
        (select count(*)::integer from public.estimate_definition_version where release_id=$1) definitions,
        (select count(*)::integer from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1) parameters,
        (select count(*)::integer from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1) formulas,
        (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1) resources,
        (select count(distinct b.resource_spec_id)::integer from public.estimate_work_normative_binding b join public.estimate_definition_version v on v.id=b.definition_version_id where v.release_id=$1) normative_rows,
        (select count(*)::integer from public.estimate_revision where release_id=$1) admission_revisions,
        (select count(*)::integer from public.estimate_compile_job where target_release_id=$1 and input_payload->>'releaseAdmission'='true' and status='succeeded') admission_jobs
    `, [R2_RELEASE_ID])).rows[0] as Json;
    const parameters = await candidate.query(`select v.catalog_id,p.parameter_id,p.value_type,p.required,p.constraints_json from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1 order by v.catalog_id,p.ordinal`, [R2_RELEASE_ID]);
    const resources = await candidate.query(`select v.catalog_id,s.id resource_spec_id,s.row_id,s.inclusion_ast,f.ast,f.ast_sha256 from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_formula_graph f on f.definition_version_id=s.definition_version_id and f.formula_id=s.formula_id where v.release_id=$1 order by v.catalog_id,s.ordinal`, [R2_RELEASE_ID]);
    const parametersByCatalog = new Map<string, Json[]>();
    const resourcesByCatalog = new Map<string, Json[]>();
    for (const row of parameters.rows as Json[]) {
      const key = String(row.catalog_id); const bucket = parametersByCatalog.get(key) ?? []; bucket.push(row); parametersByCatalog.set(key, bucket);
    }
    for (const row of resources.rows as Json[]) {
      const key = String(row.catalog_id); const bucket = resourcesByCatalog.get(key) ?? []; bucket.push(row); resourcesByCatalog.set(key, bucket);
    }
    const scenarios = readJsonLines("CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl");
    const coverage = new Map<string, Set<string>>();
    let invalid = 0;
    let mismatches = 0;
    let duplicateRows = 0;
    const auditedRevisionIds = new Set<string>();
    for (let offset = 0; offset < scenarios.length; offset += 64) {
      const batch = scenarios.slice(offset, offset + 64);
      const ids = batch.map((scenario) => String(scenario.revisionId));
      const actual = await candidate.query(`select rr.revision_id,rr.resource_spec_id,rr.row_id,rr.quantity::text,rr.calculation_trace->>'formulaAstSha256' formula_ast_sha256 from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where rr.revision_id=any($1::uuid[]) and r.release_id=$2 order by rr.revision_id,rr.ordinal`, [ids, R2_RELEASE_ID]);
      const actualByRevision = new Map<string, Json[]>();
      for (const row of actual.rows as Json[]) { const key = String(row.revision_id); const bucket = actualByRevision.get(key) ?? []; bucket.push(row); actualByRevision.set(key, bucket); }
      for (const scenario of batch) {
        const catalogId = String(scenario.catalogId);
        const revisionId = String(scenario.revisionId);
        auditedRevisionIds.add(revisionId);
        const parameterSet = scenario.parameterSet as Json;
        const issues = validateParameters(parametersByCatalog.get(catalogId) ?? [], parameterSet);
        if (issues.length || (scenario.validationResult as Json)?.status !== "GREEN") invalid += 1;
        const expectedProjection: Json[] = [];
        const reached: string[] = [];
        for (const resource of resourcesByCatalog.get(catalogId) ?? []) {
          if (!condition(resource.inclusion_ast as Json, parameterSet)) continue;
          const rowId = String(resource.row_id);
          reached.push(rowId);
          expectedProjection.push({
            resourceSpecId: String(resource.resource_spec_id),
            rowId,
            quantity: evaluate(resource.ast as Formula, parameterSet).toString(),
            formulaAstSha256: String(resource.ast_sha256),
          });
        }
        const actualProjection = (actualByRevision.get(revisionId) ?? []).map((row) => ({
          resourceSpecId: String(row.resource_spec_id),
          rowId: String(row.row_id),
          quantity: Decimal.parse(row.quantity).toString(),
          formulaAstSha256: String(row.formula_ast_sha256),
        }));
        duplicateRows += actualProjection.length - new Set(actualProjection.map((row) => row.rowId)).size;
        const independentHash = sha256(expectedProjection);
        const serverHash = sha256(actualProjection);
        if (independentHash !== serverHash || independentHash !== scenario.outputHash
          || stableJson(reached) !== stableJson(scenario.reachedRowIds)) mismatches += 1;
        const covered = coverage.get(catalogId) ?? new Set<string>(); reached.forEach((rowId) => covered.add(rowId)); coverage.set(catalogId, covered);
      }
    }
    const reachedUnique = [...coverage.values()].reduce((sum, value) => sum + value.size, 0);
    const unreachable = [...resourcesByCatalog].reduce((sum, [catalogId, rows]) => sum + rows.filter((row) => !coverage.get(catalogId)?.has(String(row.row_id))).length, 0);
    const summary = JSON.parse(readFileSync(join(EVIDENCE_ROOT, "SERVER_1168_SUMMARY.json"), "utf8")) as Json;
    const artifacts = ["SERVER_COMPILE_1168_MATRIX.jsonl", "SERVER_RECALCULATE_1168_MATRIX.jsonl", "SOURCE_TO_SERVER_ROW_PARITY.jsonl", "CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl", "RESOURCE_BRANCH_COVERAGE_MATRIX.jsonl", "SERVER_1168_SUMMARY.json"]
      .map((file) => { const bytes = readFileSync(join(EVIDENCE_ROOT, file)); return { file, bytes: bytes.length, sha256: sha256(bytes.toString("binary")) }; });
    const green = r1BytePreserved
      && Number(counts.definitions) === EXPECTED.definitions
      && Number(counts.parameters) === EXPECTED.parameters
      && Number(counts.formulas) === EXPECTED.formulas
      && Number(counts.resources) === EXPECTED.resources
      && Number(counts.normative_rows) === EXPECTED.resources
      && Number(counts.admission_revisions) === EXPECTED.scenarios
      && Number(counts.admission_jobs) === EXPECTED.scenarios
      && scenarios.length === EXPECTED.scenarios && auditedRevisionIds.size === EXPECTED.scenarios
      && invalid === 0 && mismatches === 0 && duplicateRows === 0
      && reachedUnique === EXPECTED.resources && unreachable === 0
      && summary.status === "GREEN";
    const proof = {
      schemaVersion: "master11610-r3-independent-release-audit.v1",
      generatedAt: new Date().toISOString(),
      auditor: { implementation: "auditR3IndependentReleaseAdmission.ts", importsProductionBuilder: false, importsProductionFormulaGraph: false, importsAdmissionBuilder: false },
      database: decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")),
      releaseId: R2_RELEASE_ID,
      r1BytePreservation: { status: r1BytePreserved ? "GREEN" : "RED", baseline: baselineR1, candidate: candidateR1 },
      cardinalities: counts,
      admission: { scenarios: scenarios.length, independentlyAuditedRevisions: auditedRevisionIds.size, invalidParameterCombinations: invalid, projectionMismatches: mismatches, duplicateRows, reachedUnique, unreachable },
      evidenceArtifacts: artifacts,
      blockers: green ? [] : ["INDEPENDENT_AUDIT_MISMATCH"],
      status: green ? "GREEN" : "RED",
    };
    writeFileSync(join(EVIDENCE_ROOT, "INDEPENDENT_R3_RELEASE_AUDIT.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: proof.status, r1BytePreserved, counts, admission: proof.admission })}\n`);
    if (!green) process.exitCode = 1;
  } finally {
    await Promise.all([candidate.end(), baseline.end()]);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
