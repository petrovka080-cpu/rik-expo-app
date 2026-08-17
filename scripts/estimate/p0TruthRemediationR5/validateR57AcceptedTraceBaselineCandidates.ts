import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

type Json = Record<string, any>;

const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = path.resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const COVERAGE_LEDGER = path.join(ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_COVERAGE_4272.jsonl");
const TRACE_VALUES = path.join(ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl");
const OUTPUT_LEDGER = path.join(ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_LEDGER.jsonl");
const OUTPUT_ASSETS = path.join(ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_CANDIDATE_ASSETS.jsonl");
const OUTPUT_SUMMARY = path.join(ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_SUMMARY.json");

const ACCEPTED_ENUM_ALIASES: Record<string, Record<string, string>> = {
  waterproofing_type: { ROLLED: "Рулонная гидроизоляция" },
  waterproofing_condition: { ACCEPTED: "Принято и готово" },
  wearing_mix_type: { DENSE_FINE_GRAINED: "Плотная мелкозернистая смесь" },
  binder_mix_type: { DENSE_COARSE_GRAINED: "Плотная крупнозернистая смесь" },
  repair_method: { SAW_CUT_AND_REPLACE: "Резка карты, удаление и восстановление" },
  material_destination: { RECYCLING: "Переработка" },
  work_scope: { PURE_DEMOLITION: "Только демонтаж" },
  traffic_class: { HEAVY: "Тяжёлая нагрузка" },
  underlying_layer_condition: { ACCEPTED: "Принято и готово" },
  floor_mechanical_impact_class: { LOW: "Низкая" },
  floor_liquid_exposure_class: { NONE: "Нет" },
  approved_floor_mix_type: { CAST_ASPHALT: "Литой асфальт" },
  exterior_surface_kind: { PARKING: "Парковка" },
};

function stable(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function uuidFromSha256(hash: string): string {
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function readJsonl(file: string): Json[] {
  return readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function collectInclusionParameterIds(value: unknown, output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectInclusionParameterIds(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Json;
  if (object.kind === "parameter" && typeof object.id === "string") output.add(object.id);
  if (typeof object.parameterId === "string") output.add(object.parameterId);
  for (const child of Object.values(object)) collectInclusionParameterIds(child, output);
  return output;
}

function declaredResourceParameterIds(resource: Json): Set<string> {
  const ids = collectInclusionParameterIds(resource.inclusion_ast);
  collectInclusionParameterIds(resource.resource_graph, ids);
  const declaredArrays = [
    resource.resource_graph?.parameterSources,
    resource.source_metadata?.formula?.inputParameterIds,
    resource.source_metadata?.ownerBoundary?.handoff_inputs,
  ];
  for (const values of declaredArrays) {
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (typeof value === "string" && value.trim()) ids.add(value);
    }
  }
  return ids;
}

function normativeSources(resources: readonly Json[]): string[] {
  const ids = new Set<string>();
  for (const resource of resources) {
    for (const trace of resource.source_metadata?.normativeTrace ?? []) {
      const id = String(trace.source_id ?? trace.sourceId ?? "").trim();
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function domainFor(definition: Json): string {
  const metadata = definition.source_metadata ?? {};
  if (metadata.backendOwner === "CONCRETE_BACKEND") return "concrete";
  if (metadata.backendOwner === "HVAC_HEAT_SUPPLY_BACKEND") return "hvac_heat_supply";
  if (metadata.backendOwner === true) return "water_supply_sewerage";
  if (Array.isArray(metadata.acceptedBatches)) return "drywall";
  if (metadata.batch005ProofSha256) return "electrical";
  if (metadata.acceptedMemberSet) return "asphalt";
  return "unknown";
}

async function loadBatch(client: Client, ids: readonly string[]): Promise<{
  definitions: Json[];
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
}> {
  const definitions = (await client.query(`
    select v.*,
      encode(extensions.digest(convert_to(coalesce(string_agg(
        jsonb_build_array(p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,
          p.default_value,p.constraints_json,p.truth_metadata)::text,E'\\n'
        order by p.ordinal,p.parameter_id
      ),''),'UTF8'),'sha256'),'hex') parameter_schema_sha256
    from estimate_definition_version v
    join estimate_parameter_definition p on p.definition_version_id=v.id
    where v.id=any($1::uuid[]) group by v.id
  `, [ids])).rows as Json[];
  const parameters = (await client.query(
    "select * from estimate_parameter_definition where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal",
    [ids],
  )).rows as Json[];
  const formulas = (await client.query(
    "select * from estimate_formula_graph where definition_version_id=any($1::uuid[]) order by definition_version_id,formula_id",
    [ids],
  )).rows as Json[];
  const resources = (await client.query(
    "select * from estimate_resource_spec where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal",
    [ids],
  )).rows as Json[];
  return { definitions, parameters, formulas, resources };
}

function groupByDefinition(rows: readonly Json[]): Map<string, Json[]> {
  const result = new Map<string, Json[]>();
  for (const row of rows) {
    const key = String(row.definition_version_id);
    const values = result.get(key) ?? [];
    values.push(row);
    result.set(key, values);
  }
  return result;
}

function normalizeAcceptedEnumAliases(parameters: readonly Json[], rawValues: Json): {
  values: Json;
  normalizations: Json[];
  blockers: string[];
} {
  const values = { ...rawValues };
  const normalizations: Json[] = [];
  const blockers: string[] = [];
  for (const parameter of parameters) {
    const parameterId = String(parameter.parameter_id);
    if (parameter.value_type !== "enum" || !(parameterId in values)) continue;
    const rawValue = String(values[parameterId]);
    const allowedValues = Array.isArray(parameter.constraints_json?.values)
      ? parameter.constraints_json.values.map(String)
      : [];
    if (allowedValues.includes(rawValue)) continue;
    const normalizedValue = ACCEPTED_ENUM_ALIASES[parameterId]?.[rawValue];
    if (!normalizedValue) continue;
    if (!allowedValues.includes(normalizedValue)) {
      blockers.push(`enum_alias_target_not_allowed:${parameterId}:${rawValue}:${normalizedValue}`);
      continue;
    }
    values[parameterId] = normalizedValue;
    normalizations.push({
      parameter_id: parameterId,
      accepted_trace_value: rawValue,
      canonical_value: normalizedValue,
      proof: "EXPLICIT_SEMANTIC_EQUIVALENCE_NOT_ENUM_POSITION",
    });
  }
  return { values, normalizations, blockers };
}

function validateOne(input: {
  definition: Json;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  trace: Json;
}): { ledger: Json; asset: Json | null } {
  const { definition, parameters, formulas, resources, trace } = input;
  const schemaIds = new Set(parameters.map((row) => String(row.parameter_id)));
  const rawTraceValues = Object.fromEntries(
    Object.entries(trace.input_values ?? {}).filter(([key]) => schemaIds.has(key) && !key.startsWith("unit_price_")
      && !["price_basis_reference", "price_basis_date"].includes(key)),
  );
  const normalizedTrace = normalizeAcceptedEnumAliases(parameters, rawTraceValues);
  const traceValues = normalizedTrace.values;
  const missingTraceDefaults = parameters.filter((parameter) => parameter.default_value != null
    && !(String(parameter.parameter_id) in traceValues)
    && !String(parameter.parameter_id).startsWith("unit_price_")
    && !["price_basis_reference", "price_basis_date"].includes(String(parameter.parameter_id)))
    .map((parameter) => String(parameter.parameter_id));
  const blockers: string[] = [...normalizedTrace.blockers];
  if (missingTraceDefaults.length > 0) blockers.push(`provenance_less_defaults:${missingTraceDefaults.length}`);

  let resolved: Json = {};
  try {
    resolved = validateCanonicalEstimateParameters(parameters, traceValues, {
      baselineContext: { catalogId: String(definition.catalog_id) },
    });
  } catch (error) {
    blockers.push(`parameter_validation:${error instanceof Error ? error.message : String(error)}`);
  }

  const numeric = Object.fromEntries(Object.entries(resolved)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
  const formulaById = new Map(formulas.map((formula) => [String(formula.formula_id), formula]));
  const included: Json[] = [];
  const compiledRows: Json[] = [];
  if (blockers.length === 0) {
    for (const resource of resources) {
      let selected = false;
      try {
        selected = evaluateInclusionGraph(resource.inclusion_ast as Json, resolved);
      } catch (error) {
        blockers.push(`inclusion:${resource.row_id}:${error instanceof Error ? error.message : String(error)}`);
        break;
      }
      if (!selected) continue;
      included.push(resource);
      const formula = formulaById.get(String(resource.formula_id));
      if (!formula) {
        blockers.push(`formula_missing:${resource.row_id}`);
        break;
      }
      try {
        const quantity = evaluateFormulaGraph(formula.ast as FormulaAst, numeric);
        if (!Number.isFinite(Number(quantity)) || Number(quantity) < 0) {
          blockers.push(`invalid_quantity:${resource.row_id}:${quantity}`);
          break;
        }
        compiledRows.push({
          row_id: resource.row_id,
          formula_id: resource.formula_id,
          quantity,
          unit_id: resource.unit_id,
          semantic_owner: resource.semantic_owner,
          cost_owner_id: resource.cost_owner_id,
        });
      } catch (error) {
        blockers.push(`formula:${resource.row_id}:${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }
  }
  if (included.length === 0 && !blockers.some((entry) => entry.startsWith("parameter_validation:"))) {
    blockers.push("compiled_boq_empty");
  }
  const blankOwners = included.filter((resource) => !String(resource.semantic_owner ?? "").trim());
  if (blankOwners.length > 0) blockers.push(`blank_semantic_owners:${blankOwners.length}`);
  const duplicateSemanticOwners = [...new Set(included
    .map((resource) => String(resource.semantic_owner ?? "").trim())
    .filter(Boolean)
    .filter((owner, index, all) => all.indexOf(owner) !== index))];
  if (duplicateSemanticOwners.length > 0) blockers.push(`duplicate_semantic_owners:${duplicateSemanticOwners.length}`);
  const localCostRows = included.filter((resource) => resource.source_metadata?.priceStatus !== "CHILD_OWNER"
    && resource.source_metadata?.priceRoute !== "CHILD_OWNER_ESTIMATE");
  const duplicateCostOwners = [...new Set(localCostRows.map((resource) => String(resource.cost_owner_id ?? "").trim()).filter(Boolean)
    .filter((owner, index, all) => all.indexOf(owner) !== index))];
  if (duplicateCostOwners.length > 0) blockers.push(`duplicate_cost_owners:${duplicateCostOwners.length}`);

  const formulaConsumers: Record<string, string[]> = {};
  const resourceConsumers: Record<string, string[]> = {};
  const uomByParameter: Record<string, string | null> = {};
  const inputClassification: Record<string, "ASSUMPTION" | "DERIVED"> = {};
  const normativeSourceIds: Record<string, string[]> = {};
  const guides: Record<string, string> = {};
  const parameterById = new Map(parameters.map((parameter) => [String(parameter.parameter_id), parameter]));
  const resourceByRowId = new Map(resources.map((resource) => [String(resource.row_id), resource]));
  const formulaIdsByParameter = new Map<string, Set<string>>();
  for (const formula of formulas) {
    for (const parameterId of formula.input_parameter_ids ?? []) {
      const formulaIds = formulaIdsByParameter.get(String(parameterId)) ?? new Set<string>();
      formulaIds.add(String(formula.formula_id));
      formulaIdsByParameter.set(String(parameterId), formulaIds);
    }
  }
  const consumerRowsByParameter = new Map<string, Json[]>();
  for (const resource of resources) {
    const declaredIds = declaredResourceParameterIds(resource);
    for (const parameterId of formulaById.get(String(resource.formula_id))?.input_parameter_ids ?? []) {
      declaredIds.add(String(parameterId));
    }
    for (const parameterId of declaredIds) {
      const consumerRows = consumerRowsByParameter.get(parameterId) ?? [];
      consumerRows.push(resource);
      consumerRowsByParameter.set(parameterId, consumerRows);
    }
  }
  for (const parameterId of Object.keys(traceValues).sort()) {
    const parameter = parameterById.get(parameterId)!;
    const consumerFormulaIds = [...(formulaIdsByParameter.get(parameterId) ?? [])].sort();
    const consumerRows = [...(consumerRowsByParameter.get(parameterId) ?? [])];
    for (const rowId of parameter.constraints_json?.consumers ?? []) {
      const resource = resourceByRowId.get(String(rowId));
      if (resource && !consumerRows.includes(resource)) consumerRows.push(resource);
    }
    if (parameterId === "estimate_scope_mode" && consumerRows.length === 0) consumerRows.push(...included);
    if (consumerRows.length === 0) {
      blockers.push(`parameter_without_resource_consumer:${parameterId}`);
      continue;
    }
    formulaConsumers[parameterId] = consumerFormulaIds;
    resourceConsumers[parameterId] = [...new Set(consumerRows.map((resource) => String(resource.row_id)))].sort();
    uomByParameter[parameterId] = parameter.unit_id == null ? null : String(parameter.unit_id);
    inputClassification[parameterId] = parameter.constraints_json?.inferredFromAcceptedFormulaGraph === true
      ? "DERIVED"
      : "ASSUMPTION";
    normativeSourceIds[parameterId] = normativeSources(consumerRows);
    guides[parameterId] = inputClassification[parameterId] === "DERIVED"
      ? `Вычислено подтверждённым runtime trace для работы «${definition.catalog_id}»; пересчитывается из зависимых параметров.`
      : `Принято в предварительном расчёте по подтверждённому runtime trace работы «${definition.catalog_id}»; замените фактическим значением проекта или обмера.`;
  }
  const uniqueBlockers = [...new Set(blockers)];
  const compileFingerprint = sha256(compiledRows);
  const evidenceProjection = {
    catalog_id: definition.catalog_id,
    definition_version_id: definition.id,
    definition_sha256: definition.definition_sha256,
    parameter_schema_sha256: definition.parameter_schema_sha256,
    proposal_source_sha256: trace.proposal_source_sha256,
    accepted_trace_input_values_sha256: sha256(rawTraceValues),
    input_values_sha256: sha256(traceValues),
    enum_alias_normalizations: normalizedTrace.normalizations,
    compile_fingerprint: compileFingerprint,
    compiled_row_count: compiledRows.length,
  };
  const acceptanceEvidenceSha256 = sha256(evidenceProjection);
  const baselineId = uuidFromSha256(sha256({
    contract: "APPROVED_TEMPLATE_BASELINE_R54_V1",
    ...evidenceProjection,
  }));
  const asset = uniqueBlockers.length === 0 ? {
    id: baselineId,
    baseline_key: `r57-accepted-trace:${definition.catalog_id}:${definition.definition_sha256}`,
    catalog_id: definition.catalog_id,
    definition_version_id: definition.id,
    source_definition_version_id: definition.id,
    parameter_schema_sha256: definition.parameter_schema_sha256,
    input_values: traceValues,
    input_classification: inputClassification,
    uom_by_parameter: uomByParameter,
    formula_consumer_ids: formulaConsumers,
    resource_consumer_row_ids: resourceConsumers,
    normative_source_ids: normativeSourceIds,
    guide_provenance_ru: guides,
    proposal_source_refs: [{
      kind: trace.provenance_kind,
      path: trace.proposal_source_ref,
      sha256: trace.proposal_source_sha256,
      inputValuesSha256: trace.input_values_sha256,
      enumAliasNormalizations: normalizedTrace.normalizations,
    }],
    validation_scenario_refs: [{
      kind: "R57_IN_MEMORY_CANONICAL_COMPILER_VALIDATION",
      compileFingerprint,
      rowCount: compiledRows.length,
      formulaGraphCount: formulas.length,
      resourceGraphCount: resources.length,
    }],
    acceptance_evidence_sha256: acceptanceEvidenceSha256,
    accepted_release_id: null,
    accepted_at: null,
    supersedes_baseline_id: null,
    contract_version: "APPROVED_TEMPLATE_BASELINE_R54_V1",
  } : null;
  return {
    ledger: {
      ...evidenceProjection,
      domain: domainFor(definition),
      provenance_kind: trace.provenance_kind,
      input_value_count: Object.keys(traceValues).length,
      included_resource_rows: included.length,
      excluded_resource_rows: resources.length - included.length,
      blank_semantic_owner_rows: blankOwners.length,
      duplicate_semantic_owner_ids: duplicateSemanticOwners,
      duplicate_cost_owner_ids: duplicateCostOwners,
      provenance_less_default_ids: missingTraceDefaults,
      blockers: uniqueBlockers,
      status: uniqueBlockers.length === 0 ? "GREEN_CANDIDATE_ASSET" : "RED_REPAIR_QUEUE",
    },
    asset,
  };
}

async function main(): Promise<void> {
  const coverage = readJsonl(COVERAGE_LEDGER);
  const traceByCatalog = new Map(readJsonl(TRACE_VALUES).map((row) => [String(row.catalog_id), row]));
  const candidates = coverage.filter((row) => row.ready_for_candidate_compile_validation === true);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r57-trace-baseline-validator-read-only" });
  await client.connect();
  const ledger: Json[] = [];
  const assets: Json[] = [];
  try {
    await client.query("begin read only isolation level repeatable read");
    const batchSize = 20;
    for (let index = 0; index < candidates.length; index += batchSize) {
      const slice = candidates.slice(index, index + batchSize);
      const loaded = await loadBatch(client, slice.map((row) => String(row.definition_version_id)));
      const parameters = groupByDefinition(loaded.parameters);
      const formulas = groupByDefinition(loaded.formulas);
      const resources = groupByDefinition(loaded.resources);
      for (const definition of loaded.definitions) {
        const trace = traceByCatalog.get(String(definition.catalog_id));
        if (!trace) throw new Error(`R57_TRACE_VALUE_MISSING:${definition.catalog_id}`);
        const result = validateOne({
          definition,
          parameters: parameters.get(String(definition.id)) ?? [],
          formulas: formulas.get(String(definition.id)) ?? [],
          resources: resources.get(String(definition.id)) ?? [],
          trace,
        });
        ledger.push(result.ledger);
        if (result.asset) assets.push(result.asset);
      }
      if ((index + batchSize) % 200 === 0) {
        process.stdout.write(`validated=${Math.min(index + batchSize, candidates.length)}/${candidates.length}\n`);
      }
    }
    await client.query("rollback");
  } finally {
    await client.end();
  }
  ledger.sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  assets.sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  const domains = [...new Set(ledger.map((row) => row.domain))].sort().map((domain) => {
    const rows = ledger.filter((row) => row.domain === domain);
    return {
      domain,
      attempted: rows.length,
      green_assets: rows.filter((row) => row.status === "GREEN_CANDIDATE_ASSET").length,
      red_repair_queue: rows.filter((row) => row.status !== "GREEN_CANDIDATE_ASSET").length,
      compiled_rows: rows.reduce((sum, row) => sum + Number(row.compiled_row_count ?? 0), 0),
    };
  });
  const summary = {
    schema_version: "p0-one-monolith-r57-accepted-trace-baseline-validation.v1",
    spec_sha256: SPEC_SHA256,
    source_release_id: RELEASE_ID,
    captured_at: new Date().toISOString(),
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim(),
    attempted: ledger.length,
    green_candidate_assets: assets.length,
    red_repair_queue: ledger.length - assets.length,
    domains,
    source_database_persistent_writes: 0,
    assets_sha256: sha256(assets),
    ledger_sha256: sha256(ledger),
    status: assets.length === ledger.length
      ? "GREEN_ACCEPTED_TRACE_BASELINE_CANDIDATE_ASSETS"
      : "RED_ACCEPTED_TRACE_BASELINE_REPAIR_QUEUE",
  };
  mkdirSync(ROOT, { recursive: true });
  writeFileSync(OUTPUT_LEDGER, `${ledger.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  writeFileSync(OUTPUT_ASSETS, `${assets.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  writeFileSync(OUTPUT_SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
