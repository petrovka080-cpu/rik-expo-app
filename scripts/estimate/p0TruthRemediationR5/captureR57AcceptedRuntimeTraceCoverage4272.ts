import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { Client } from "pg";

type Json = Record<string, any>;
type Trace = {
  catalogId: string;
  inputValues: Record<string, string | number | boolean>;
  sourceRef: string;
  sourceSha256: string;
  sourceKind: "ACCEPTED_RUNTIME_TRACE";
  priority: number;
  internalConflicts: string[];
};

const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const EXPECTED_TOTAL = 4_272;
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = path.resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const OUTPUT_LEDGER = path.join(ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.jsonl");
const OUTPUT_SUMMARY = path.join(ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.json");
const OUTPUT_VALUES = path.join(ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl");

const COMPLETED_DOMAIN_ROOT = "C:/dev/rik-expo-app-post-r6-01-asphalt-v3-cf16-final/.release-runtime/completed-domains-depth-r1/baseline/source-domains";
const WATER_SCENARIOS = "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/evidence-a2/WATER_CONSTRAINT_AWARE_SCENARIOS.jsonl";
const HVAC_50_INPUTS = "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/A3/A3_15_HVAC_50_INPUT_MANIFEST.json";
const ELECTRICAL_PROOFS = "C:/dev/rik-expo-app-batch005-electrical-domain-r1/.release-runtime/master-11610-group-batches-r2/13-batch005-r4-professional-proof/WORK_PROFESSIONAL_PROOF_BUNDLE";

function stable(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function primitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value));
}

function mergeFormulaInputs(rows: readonly Json[]): { values: Record<string, string | number | boolean>; conflicts: string[] } {
  const values: Record<string, string | number | boolean> = {};
  const conflicts = new Set<string>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.formula_input_values ?? row.formula_inputs ?? {})) {
      if (!primitive(value)) continue;
      if (key in values && stable(values[key]) !== stable(value)) conflicts.add(key);
      else values[key] = value;
    }
  }
  return { values, conflicts: [...conflicts].sort() };
}

function fileSha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function selectTrace(target: Map<string, Trace>, candidate: Trace): void {
  const current = target.get(candidate.catalogId);
  if (!current || candidate.priority > current.priority) target.set(candidate.catalogId, candidate);
}

function loadCompiledTraceFile(input: {
  target: Map<string, Trace>;
  file: string;
  activeIds: ReadonlySet<string>;
  priority: number;
}): void {
  const raw = readFileSync(input.file, "utf8");
  const parsed = JSON.parse(raw) as Json;
  const sourceSha = fileSha256(raw);
  for (const item of parsed.data ?? []) {
    const catalogId = String(item.exact_identity?.catalog_id ?? "");
    if (!input.activeIds.has(catalogId) || item.status !== "COMPILED") continue;
    const merged = mergeFormulaInputs(item.compilation?.compiled_rows ?? []);
    selectTrace(input.target, {
      catalogId,
      inputValues: merged.values,
      sourceRef: input.file,
      sourceSha256: sourceSha,
      sourceKind: "ACCEPTED_RUNTIME_TRACE",
      priority: input.priority,
      internalConflicts: merged.conflicts,
    });
  }
}

function loadAsphaltFile(
  target: Map<string, Trace>,
  activeIds: ReadonlySet<string>,
  filename: string,
  priority: number,
): void {
  const file = path.join(COMPLETED_DOMAIN_ROOT, `asphalt/${filename}`);
  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as Json;
  const sourceSha = fileSha256(raw);
  for (const item of parsed.cases ?? []) {
    const catalogId = String(item.ledger?.catalog_id ?? "");
    if (!activeIds.has(catalogId)) continue;
    const inputValues: Record<string, string | number | boolean> = Object.fromEntries(
      Object.entries(item.requested_input ?? {}).filter((entry): entry is [string, string | number | boolean] => primitive(entry[1])),
    );
    const conflicts = new Set<string>();
    for (const row of item.row_evidence ?? []) {
      for (const [key, value] of Object.entries(row.source_parameters?.formulaInputValues ?? {})) {
        if (!primitive(value)) continue;
        if (key in inputValues && stable(inputValues[key]) !== stable(value)) conflicts.add(key);
        else inputValues[key] = value;
      }
    }
    selectTrace(target, {
      catalogId,
      inputValues,
      sourceRef: file,
      sourceSha256: sourceSha,
      sourceKind: "ACCEPTED_RUNTIME_TRACE",
      priority,
      internalConflicts: [...conflicts].sort(),
    });
  }
}

async function loadWater(target: Map<string, Trace>, activeIds: ReadonlySet<string>): Promise<void> {
  const sourceSha = createHash("sha256");
  const input = createReadStream(WATER_SCENARIOS, { encoding: "utf8" });
  input.on("data", (chunk) => sourceSha.update(chunk));
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  const candidates: Json[] = [];
  for await (const line of reader) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Json;
    if (row.scenario_kind !== "BASELINE_REQUIRED_SCOPE") continue;
    if (!activeIds.has(String(row.catalog_id))) continue;
    candidates.push(row);
  }
  const digest = sourceSha.digest("hex");
  for (const row of candidates) {
    const values = Object.fromEntries(
      Object.entries(row.parameter_set ?? {}).filter((entry): entry is [string, string | number | boolean] => primitive(entry[1])),
    );
    selectTrace(target, {
      catalogId: String(row.catalog_id),
      inputValues: values,
      sourceRef: WATER_SCENARIOS,
      sourceSha256: digest,
      sourceKind: "ACCEPTED_RUNTIME_TRACE",
      priority: 50,
      internalConflicts: [],
    });
  }
}

function loadHvac50(target: Map<string, Trace>, activeIds: ReadonlySet<string>): void {
  const raw = readFileSync(HVAC_50_INPUTS, "utf8");
  const parsed = JSON.parse(raw) as Json;
  const sourceSha = fileSha256(raw);
  for (const item of parsed.cases ?? []) {
    const catalogId = String(item.catalogId ?? "");
    if (!activeIds.has(catalogId)) continue;
    const values = Object.fromEntries(
      Object.entries(item.v1 ?? {}).filter((entry): entry is [string, string | number | boolean] => primitive(entry[1])),
    );
    selectTrace(target, {
      catalogId,
      inputValues: values,
      sourceRef: HVAC_50_INPUTS,
      sourceSha256: sourceSha,
      sourceKind: "ACCEPTED_RUNTIME_TRACE",
      priority: 50,
      internalConflicts: [],
    });
  }
}

function loadElectrical(target: Map<string, Trace>, activeIds: ReadonlySet<string>): void {
  for (const filename of readdirSync(ELECTRICAL_PROOFS).filter((name) => name.endsWith(".json") && /^\d+-/.test(name)).sort()) {
    const file = path.join(ELECTRICAL_PROOFS, filename);
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Json;
    const catalogId = String(parsed.identity?.catalog_id ?? "");
    if (!activeIds.has(catalogId) || !String(parsed.verdict ?? "").startsWith("GREEN")) continue;
    const merged = mergeFormulaInputs(parsed.production?.rows ?? []);
    // The accepted professional proof executes the full applicable row set.
    // These two control values are explicit in that proof's applicability
    // decisions even though they are not numeric formula inputs.
    merged.values.work_included = true;
    merged.values.estimate_scope_mode = "FULL_APPLICABLE_SCOPE";
    selectTrace(target, {
      catalogId,
      inputValues: merged.values,
      sourceRef: file,
      sourceSha256: fileSha256(raw),
      sourceKind: "ACCEPTED_RUNTIME_TRACE",
      priority: 40,
      internalConflicts: merged.conflicts,
    });
  }
}

function domainFor(row: Json): string {
  const metadata = row.source_metadata ?? {};
  if (metadata.backendOwner === "CONCRETE_BACKEND") return "concrete";
  if (metadata.backendOwner === "HVAC_HEAT_SUPPLY_BACKEND") return "hvac_heat_supply";
  if (metadata.backendOwner === true) return "water_supply_sewerage";
  if (Array.isArray(metadata.acceptedBatches)) return "drywall";
  if (metadata.batch005ProofSha256) return "electrical";
  if (metadata.acceptedMemberSet) return "asphalt";
  return "unknown";
}

async function insertTraceValues(client: Client, traces: readonly Trace[]): Promise<void> {
  const batchSize = 20;
  for (let index = 0; index < traces.length; index += batchSize) {
    const payload = traces.slice(index, index + batchSize).map((trace) => ({
      catalog_id: trace.catalogId,
      source_ref: trace.sourceRef,
      input_values: trace.inputValues,
    }));
    await client.query(`
      insert into r57_trace_value(catalog_id,parameter_id,value_json,source_ref)
      select row.catalog_id,value.key,value.value,row.source_ref
      from jsonb_to_recordset($1::jsonb) as row(catalog_id text,source_ref text,input_values jsonb)
      cross join lateral jsonb_each(row.input_values) value
      on conflict(catalog_id,parameter_id) do update set
        value_json=excluded.value_json,source_ref=excluded.source_ref
    `, [JSON.stringify(payload)]);
  }
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r57-accepted-trace-coverage-read-only" });
  await client.connect();
  try {
    // PostgreSQL permits writes to an existing temporary table in a read-only
    // transaction, but CREATE TEMP itself must happen before that transaction.
    // The table is session-local and never mutates the source schema or data.
    await client.query(`create temp table r57_trace_value(
      catalog_id text not null,
      parameter_id text not null,
      value_json jsonb not null,
      source_ref text not null,
      primary key(catalog_id,parameter_id)
    )`);
    await client.query("begin read only isolation level repeatable read");
    const definitions = (await client.query(`
      select id,catalog_id,definition_sha256,passport,source_metadata
      from estimate_definition_version where release_id=$1 order by catalog_id
    `, [RELEASE_ID])).rows as Json[];
    if (definitions.length !== EXPECTED_TOTAL || new Set(definitions.map((row) => row.catalog_id)).size !== EXPECTED_TOTAL) {
      throw new Error(`R57_TRACE_ACTIVE_DENOMINATOR_RED:${definitions.length}/${EXPECTED_TOTAL}`);
    }
    const activeIds = new Set(definitions.map((row) => String(row.catalog_id)));
    const traces = new Map<string, Trace>();

    loadAsphaltFile(traces, activeIds, "ASPHALT_R63_MINIMAL_SCOPE_ESTIMATES.json", 30);
    loadAsphaltFile(traces, activeIds, "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json", 35);
    loadCompiledTraceFile({
      target: traces,
      file: path.join(COMPLETED_DOMAIN_ROOT, "interior/INTERIOR_FINISHES_MINIMAL_SCOPE_ESTIMATES.json"),
      activeIds,
      priority: 30,
    });
    loadCompiledTraceFile({
      target: traces,
      file: path.join(COMPLETED_DOMAIN_ROOT, "hvac/HVAC_MINIMAL_SCOPE_ESTIMATES.json"),
      activeIds,
      priority: 30,
    });
    loadCompiledTraceFile({
      target: traces,
      file: path.join(COMPLETED_DOMAIN_ROOT, "water/WATER_SEWER_MINIMAL_SCOPE_ESTIMATES.json"),
      activeIds,
      priority: 20,
    });
    await loadWater(traces, activeIds);
    loadHvac50(traces, activeIds);
    loadElectrical(traces, activeIds);

    await insertTraceValues(client, [...traces.values()]);
    const coverage = (await client.query(`
      with formula_inputs as (
        select v.id definition_version_id,count(distinct input_id)::integer total,
          count(distinct input_id) filter(where t.parameter_id is not null)::integer resolved
        from estimate_definition_version v
        join estimate_formula_graph f on f.definition_version_id=v.id
        cross join lateral unnest(f.input_parameter_ids) input_id
        left join r57_trace_value t on t.catalog_id=v.catalog_id and t.parameter_id=input_id
        where v.release_id=$1
        group by v.id
      ), parameter_coverage as (
        select v.id definition_version_id,
          count(*) filter(where p.required and p.parameter_id not like 'unit_price_%'
            and p.parameter_id not in ('price_basis_reference','price_basis_date'))::integer total,
          count(*) filter(where p.required and p.parameter_id not like 'unit_price_%'
            and p.parameter_id not in ('price_basis_reference','price_basis_date')
            and t.parameter_id is not null)::integer resolved,
          count(*) filter(where t.parameter_id is not null)::integer trace_values_in_schema
        from estimate_definition_version v
        join estimate_parameter_definition p on p.definition_version_id=v.id
        left join r57_trace_value t on t.catalog_id=v.catalog_id and t.parameter_id=p.parameter_id
        where v.release_id=$1 group by v.id
      ), extra as (
        select v.id definition_version_id,count(*)::integer extra_trace_values
        from estimate_definition_version v join r57_trace_value t on t.catalog_id=v.catalog_id
        left join estimate_parameter_definition p on p.definition_version_id=v.id and p.parameter_id=t.parameter_id
        where v.release_id=$1 and p.parameter_id is null group by v.id
      )
      select v.id definition_version_id,
        coalesce(fi.total,0) formula_input_count,coalesce(fi.resolved,0) formula_inputs_resolved,
        coalesce(pc.total,0) required_non_price_parameter_count,
        coalesce(pc.resolved,0) required_non_price_parameters_resolved,
        coalesce(pc.trace_values_in_schema,0) trace_values_in_schema,
        coalesce(e.extra_trace_values,0) extra_trace_values
      from estimate_definition_version v
      left join formula_inputs fi on fi.definition_version_id=v.id
      left join parameter_coverage pc on pc.definition_version_id=v.id
      left join extra e on e.definition_version_id=v.id
      where v.release_id=$1
    `, [RELEASE_ID])).rows as Json[];
    const byId = new Map(coverage.map((row) => [String(row.definition_version_id), row]));
    const ledger = definitions.map((definition) => {
      const trace = traces.get(String(definition.catalog_id));
      const counts = byId.get(String(definition.id)) ?? {};
      const domain = domainFor(definition);
      const formulaTotal = Number(counts.formula_input_count ?? 0);
      const formulaResolved = Number(counts.formula_inputs_resolved ?? 0);
      const requiredTotal = Number(counts.required_non_price_parameter_count ?? 0);
      const requiredResolved = Number(counts.required_non_price_parameters_resolved ?? 0);
      const blockers = [
        trace ? "" : "accepted_runtime_trace_missing",
        trace && trace.internalConflicts.length > 0 ? `trace_internal_conflicts:${trace.internalConflicts.length}` : "",
        requiredResolved === requiredTotal && requiredTotal > 0 ? "" : `required_non_price_parameters_unresolved:${requiredResolved}/${requiredTotal}`,
      ].filter(Boolean);
      return {
        catalog_id: definition.catalog_id,
        definition_version_id: definition.id,
        definition_sha256: definition.definition_sha256,
        domain,
        provenance_kind: trace?.sourceKind ?? null,
        proposal_source_ref: trace?.sourceRef ?? null,
        proposal_source_sha256: trace?.sourceSha256 ?? null,
        trace_value_count: trace ? Object.keys(trace.inputValues).length : 0,
        trace_values_in_schema: Number(counts.trace_values_in_schema ?? 0),
        extra_trace_values: Number(counts.extra_trace_values ?? 0),
        formula_input_count: formulaTotal,
        formula_inputs_resolved: formulaResolved,
        unresolved_formula_inputs_in_unselected_branches_pending_compile_validation: formulaTotal - formulaResolved,
        required_non_price_parameter_count: requiredTotal,
        required_non_price_parameters_resolved: requiredResolved,
        internal_conflict_parameters: trace?.internalConflicts ?? [],
        ready_for_candidate_compile_validation: blockers.length === 0,
        blockers,
      };
    });
    const domains = [...new Set(ledger.map((row) => row.domain))].sort().map((domain) => {
      const rows = ledger.filter((row) => row.domain === domain);
      return {
        domain,
        definitions: rows.length,
        definitions_with_trace: rows.filter((row) => row.provenance_kind === "ACCEPTED_RUNTIME_TRACE").length,
        definitions_with_all_formula_inputs_resolved: rows.filter((row) =>
          row.formula_input_count > 0 && row.formula_inputs_resolved === row.formula_input_count
        ).length,
        definitions_ready_for_candidate_compile_validation: rows.filter((row) => row.ready_for_candidate_compile_validation).length,
        formula_inputs: rows.reduce((sum, row) => sum + row.formula_input_count, 0),
        formula_inputs_resolved: rows.reduce((sum, row) => sum + row.formula_inputs_resolved, 0),
        required_non_price_parameters: rows.reduce((sum, row) => sum + row.required_non_price_parameter_count, 0),
        required_non_price_parameters_resolved: rows.reduce((sum, row) => sum + row.required_non_price_parameters_resolved, 0),
      };
    });
    const binding = {
      head: git("rev-parse", "HEAD"),
      tree: git("rev-parse", "HEAD^{tree}"),
      dirty_diff_sha256: sha256(git("diff", "--binary")),
    };
    const summary = {
      schema_version: "p0-one-monolith-r57-accepted-runtime-trace-coverage-4272.v1",
      spec_sha256: SPEC_SHA256,
      release_id: RELEASE_ID,
      captured_at: new Date().toISOString(),
      ...binding,
      definitions: ledger.length,
      definitions_with_trace: ledger.filter((row) => row.provenance_kind === "ACCEPTED_RUNTIME_TRACE").length,
      definitions_with_all_formula_inputs_resolved: ledger.filter((row) =>
        row.formula_input_count > 0 && row.formula_inputs_resolved === row.formula_input_count
      ).length,
      definitions_ready_for_candidate_compile_validation: ledger.filter((row) => row.ready_for_candidate_compile_validation).length,
      domains,
      source_database_persistent_writes: 0,
      temporary_session_join_only: true,
      used_forbidden_min_max_midpoint_or_first_enum: false,
      ledger_sha256: sha256(ledger),
      status: ledger.every((row) => row.ready_for_candidate_compile_validation)
        ? "GREEN_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272"
        : "RED_ACCEPTED_RUNTIME_TRACE_GAPS_REQUIRE_APPROVED_TEMPLATE_BASELINE",
    };
    mkdirSync(ROOT, { recursive: true });
    writeFileSync(OUTPUT_LEDGER, `${ledger.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    writeFileSync(OUTPUT_VALUES, `${[...traces.values()]
      .sort((left, right) => left.catalogId.localeCompare(right.catalogId))
      .map((trace) => JSON.stringify({
        catalog_id: trace.catalogId,
        provenance_kind: trace.sourceKind,
        proposal_source_ref: trace.sourceRef,
        proposal_source_sha256: trace.sourceSha256,
        input_values: trace.inputValues,
        input_values_sha256: sha256(trace.inputValues),
      })).join("\n")}\n`, "utf8");
    writeFileSync(OUTPUT_SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    await client.query("rollback");
    await client.query("drop table if exists r57_trace_value");
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
