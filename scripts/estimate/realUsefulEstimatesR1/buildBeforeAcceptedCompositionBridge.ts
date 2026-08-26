import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";

type Json = Record<string, any>;

const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SELECTION = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_SELECTION_MANIFEST.json",
);
const TRACE_VALUES = resolve(
  ".release-runtime/p0-one-monolith-r57/evidence/05-baseline/BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl",
);
const BACKEND_LEDGER = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/06-backend/BATCH001_008_BACKEND_ADMISSION_4272_72e7ebbc.jsonl",
);
const BINDINGS = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_REVISION_BINDING_MANIFEST.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/accepted-composition-bridge",
);
const SUCCESSOR_WITHOUT_R58_ACCEPTANCE = "r58-real:monolithic-reinforced-concrete";

const CORPORA: Record<string, { works: string; parameters: string; formulas: string; resources: string }> = {
  "BATCH-006": {
    works: "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/03-r6-a2-release-a/works.jsonl",
    parameters: "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/03-r6-a2-release-a/parameters.jsonl",
    formulas: "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/03-r6-a2-release-a/formulas.jsonl",
    resources: "C:/dev/rik-expo-app-batch006-water-backend-r3/.release-runtime/batch006-water-backend-r3/03-r6-a2-release-a/resources.jsonl",
  },
  "BATCH-007": {
    works: "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/05-content/corpus/HVAC_WORK_DEFINITIONS.jsonl",
    parameters: "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/05-content/corpus/HVAC_PARAMETER_DEFINITIONS.jsonl",
    formulas: "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/05-content/corpus/HVAC_FORMULA_GRAPHS.jsonl",
    resources: "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4/.release-runtime/batch007-hvac-r4/evidence/05-content/corpus/HVAC_RESOURCE_ROWS.jsonl",
  },
  "BATCH-008": {
    works: "C:/dev/rik-expo-app-batch008-concrete-r5/.release-runtime/batch008-concrete-r5/evidence/05-content/corpus/CONCRETE_WORK_DEFINITIONS.jsonl",
    parameters: "C:/dev/rik-expo-app-batch008-concrete-r5/.release-runtime/batch008-concrete-r5/evidence/05-content/corpus/CONCRETE_PARAMETER_DEFINITIONS.jsonl",
    formulas: "C:/dev/rik-expo-app-batch008-concrete-r5/.release-runtime/batch008-concrete-r5/evidence/05-content/corpus/CONCRETE_FORMULA_GRAPHS.jsonl",
    resources: "C:/dev/rik-expo-app-batch008-concrete-r5/.release-runtime/batch008-concrete-r5/evidence/05-content/corpus/CONCRETE_RESOURCE_ROWS.jsonl",
  },
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashObject(value: unknown): string {
  return sha256(JSON.stringify(stable(value)));
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function fileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/gu, "_").slice(0, 180);
}

function catalogId(row: Json): string {
  return String(row.catalogId ?? row.catalog_id ?? "");
}

function selectedJsonl(path: string, ids: readonly string[]): Json[] {
  invariant(statSync(path).size > 0, `BEFORE_BRIDGE_SOURCE_EMPTY:${path}`);
  const args = ids.flatMap((id) => ["-F", "-e", id]);
  const output = execFileSync("rg", [...args, path], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    timeout: 180_000,
  });
  const selected = new Set(ids);
  return output.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json)
    .filter((row) => selected.has(catalogId(row)));
}

function hvacProjectScale(id: string): number {
  if (/industrial|plant|factory|district|tunnel|airport|hospital|data_center|server_room/u.test(id)) return 200;
  if (/house|building|central|warehouse|school|office|hotel/u.test(id)) return 100;
  if (/room|apartment|local|single/u.test(id)) return 20;
  return 60;
}

function hvacNumber(parameter: Json, id: string): number {
  const parameterId = String(parameter.parameterId);
  const unit = String(parameter.unitId ?? "");
  const scale = hvacProjectScale(id);
  let value: number;
  if (parameterId === "system_count") value = scale >= 100 ? 2 : 1;
  else if (parameterId === "delivery_distance_km") value = 12;
  else if (/_waste_factor$/u.test(parameterId)) value = 0.03;
  else if (/_labor_norm$/u.test(parameterId)) value = /per_m$/u.test(unit) ? 0.3 : /per_m2$/u.test(unit) ? 0.25
    : /per_kg$/u.test(unit) ? 0.05 : /per_system$/u.test(unit) ? 8
      : /per_document|per_service|per_test/u.test(unit) ? 2 : 0.5;
  else if (/_machine_norm$/u.test(parameterId)) value = /per_m$/u.test(unit) ? 0.08 : /per_m2$/u.test(unit) ? 0.05
    : /per_system$/u.test(unit) ? 2 : 0.15;
  else if (/_mass_kg_per_unit$/u.test(parameterId)) value = /boiler|chiller|cooling_tower|air_handling|pump|fan|heat_exchanger|equipment/u.test(parameterId)
    ? 500 : /pipe|duct|insulation|cable/u.test(parameterId) ? 5
      : /document|service|test|boundary/u.test(parameterId) ? 0.1 : 10;
  else if (/_test_interval$/u.test(parameterId)) value = /m_per_test/u.test(unit) ? 100 : /item_per_test/u.test(unit) ? 10 : 1;
  else if (/_quantity$/u.test(parameterId)) value = unit === "m" ? scale : unit === "m2" ? scale * 0.8
    : unit === "kg" ? scale * 2 : unit === "system" ? scale >= 100 ? 2 : 1
      : ["document", "service", "test"].includes(unit) ? 1 : Math.max(2, Math.round(scale / 10));
  else if (/design_supply_temperature_c$/u.test(parameterId)) value = 80;
  else if (/design_return_temperature_c$/u.test(parameterId)) value = 60;
  else if (/temperature_c$/u.test(parameterId)) value = 20;
  else if (/airflow.*m3_h|flow.*m3_h/u.test(parameterId)) value = scale * 50;
  else if (/load_kw|capacity_kw|power_kw/u.test(parameterId)) value = scale;
  else if (/pressure.*bar/u.test(parameterId)) value = 6;
  else if (/diameter.*mm/u.test(parameterId)) value = 50;
  else if (/length.*m$/u.test(parameterId)) value = scale;
  else if (/area.*m2$/u.test(parameterId)) value = scale * 0.8;
  else if (/count|quantity|number/u.test(parameterId)) value = Math.max(2, Math.round(scale / 10));
  else if (/percent/u.test(parameterId)) value = 5;
  else if (/factor|coefficient|efficiency/u.test(parameterId)) value = 0.9;
  else value = 1;
  const constraints = parameter.constraints ?? {};
  invariant(typeof constraints.min !== "number" || value >= constraints.min, `BEFORE_BRIDGE_HVAC_MIN:${id}:${parameterId}`);
  invariant(typeof constraints.max !== "number" || value <= constraints.max, `BEFORE_BRIDGE_HVAC_MAX:${id}:${parameterId}`);
  return parameter.valueType === "integer" ? Math.max(1, Math.round(value)) : value;
}

function hvacInputs(parameters: readonly Json[], definition: Json, accepted: Json): Json {
  return Object.fromEntries(parameters.map((parameter) => {
    const id = String(parameter.parameterId);
    if (Object.prototype.hasOwnProperty.call(accepted, id)
      && ["string", "number", "boolean"].includes(typeof accepted[id])) return [id, accepted[id]];
    if (parameter.valueType === "boolean") {
      invariant(id === "work_included", `BEFORE_BRIDGE_HVAC_BOOLEAN:${definition.catalogId}:${id}`);
      return [id, true];
    }
    if (parameter.valueType === "enum") {
      invariant((parameter.constraints?.values ?? []).includes("PROJECT_SPECIFIED"),
        `BEFORE_BRIDGE_HVAC_ENUM:${definition.catalogId}:${id}`);
      return [id, "PROJECT_SPECIFIED"];
    }
    if (parameter.valueType === "text") return [id, `APPROVED_HVAC_PROJECT_REFERENCE:${definition.catalogId}:${id}`];
    return [id, hvacNumber(parameter, String(definition.catalogId))];
  }));
}

function concreteProjectScale(definition: Json): number {
  const complexity = String(definition.passport?.complexityClass ?? definition.passport?.complexity ?? "L3");
  return ({ L1: 20, L2: 40, L3: 60, L4: 100, L5: 150 } as Record<string, number>)[complexity] ?? 60;
}

function concreteNumber(parameter: Json, definition: Json): number {
  const id = String(parameter.parameterId);
  const unit = String(parameter.unitId ?? "");
  const constraints = parameter.constraints ?? {};
  const scale = concreteProjectScale(definition);
  let value: number;
  if (id === "delivery_distance_km") value = 12;
  else if (/_waste_factor$/u.test(id)) value = 0.03;
  else if (/_labor_norm$/u.test(id)) value = /per_m3$/u.test(unit) ? 0.8 : /per_m2$/u.test(unit) ? 0.3
    : /per_m$/u.test(unit) ? 0.25 : /per_kg$/u.test(unit) ? 0.03
      : /per_document|per_service|per_test/u.test(unit) ? 2 : 0.5;
  else if (/_machine_norm$/u.test(id)) value = /per_m3$/u.test(unit) ? 0.2 : /per_m2$/u.test(unit) ? 0.08
    : /per_m$/u.test(unit) ? 0.05 : 0.15;
  else if (/_mass_kg_per_unit$/u.test(id)) value = /per_m3$/u.test(unit) ? 2_400 : /per_m2$/u.test(unit) ? 12
    : /per_m$/u.test(unit) ? 5 : 25;
  else if (/_test_interval$/u.test(id)) value = /m3_per_test/u.test(unit) ? 50 : /m2_per_test|m_per_test/u.test(unit) ? 100
    : /item_per_test/u.test(unit) ? 20 : 1;
  else if (/_quantity$/u.test(id)) value = unit === "m3" ? scale : unit === "m2" ? scale * 2
    : unit === "m" ? scale * 1.5 : unit === "kg" ? scale * 20 : unit === "t" ? scale * 2.4
      : ["document", "service", "test", "set"].includes(unit) ? 1 : Math.max(2, Math.round(scale / 5));
  else if (/strength.*mpa|compressive.*mpa/u.test(id)) value = 30;
  else if (/slump.*mm/u.test(id)) value = 150;
  else if (/thickness.*mm/u.test(id)) value = 200;
  else if (/diameter.*mm/u.test(id)) value = 16;
  else if (/area.*m2$/u.test(id)) value = scale * 2;
  else if (/volume.*m3$/u.test(id)) value = scale;
  else if (/length.*m$/u.test(id)) value = scale * 1.5;
  else if (/count|number/u.test(id)) value = Math.max(2, Math.round(scale / 5));
  else if (/percent/u.test(id)) value = 3;
  else if (/factor|coefficient/u.test(id)) value = 1.05;
  else if (unit === "m3") value = scale;
  else if (unit === "m2") value = scale * 2;
  else if (unit === "m") value = scale * 1.5;
  else if (unit === "kg") value = scale * 20;
  else if (unit === "ratio") value = 0.03;
  else value = 1;
  invariant(typeof constraints.minExclusive !== "number" || value > constraints.minExclusive,
    `BEFORE_BRIDGE_CONCRETE_MIN_EXCLUSIVE:${definition.catalogId}:${id}`);
  invariant(typeof constraints.min !== "number" || value >= constraints.min,
    `BEFORE_BRIDGE_CONCRETE_MIN:${definition.catalogId}:${id}`);
  invariant(typeof constraints.max !== "number" || value <= constraints.max,
    `BEFORE_BRIDGE_CONCRETE_MAX:${definition.catalogId}:${id}`);
  return parameter.valueType === "integer" ? Math.max(1, Math.round(value)) : value;
}

function concreteInputs(parameters: readonly Json[], definition: Json): Json {
  return Object.fromEntries(parameters.map((parameter) => {
    const id = String(parameter.parameterId);
    if (parameter.valueType === "boolean") {
      invariant(id === "work_included", `BEFORE_BRIDGE_CONCRETE_BOOLEAN:${definition.catalogId}:${id}`);
      return [id, true];
    }
    if (parameter.valueType === "enum") {
      invariant((parameter.constraints?.values ?? []).includes("PROJECT_SPECIFIED"),
        `BEFORE_BRIDGE_CONCRETE_ENUM:${definition.catalogId}:${id}`);
      return [id, "PROJECT_SPECIFIED"];
    }
    if (parameter.valueType === "text") return [id, `APPROVED_CONCRETE_PROJECT_REFERENCE:${definition.catalogId}:${id}`];
    return [id, concreteNumber(parameter, definition)];
  }));
}

function normalizedCategory(row: Json): string {
  const value = String(row.category ?? row.rowType ?? row.row_type ?? "").toLocaleLowerCase("ru-RU");
  const text = `${value} ${String(row.titleRu ?? row.title_ru ?? row.work_name_ru ?? "")}`.toLocaleLowerCase("ru-RU");
  if (/material|материал/u.test(text)) return "MATERIAL";
  if (/machine|equipment|tool|механизм|оборудован/u.test(text)) return "EQUIPMENT";
  if (/deliver|logistic|haul|достав|логист|перевоз/u.test(text)) return "DELIVERY";
  if (/labor|work|работ/u.test(text)) return "WORK";
  return "SERVICE";
}

function contentAudit(rows: readonly Json[]): Json {
  const categories = rows.map(normalizedCategory);
  const generic = rows.filter((row) => /(?:совместим|по проекту|комплект материалов|прочие материалы|оборудование доступа|работа механизма)/iu
    .test(String(row.titleRu ?? row.title_ru ?? row.work_name_ru ?? "")));
  return {
    rows: rows.length,
    materials: categories.filter((value) => value === "MATERIAL").length,
    works: categories.filter((value) => value === "WORK").length,
    equipment: categories.filter((value) => value === "EQUIPMENT").length,
    delivery: categories.filter((value) => value === "DELIVERY").length,
    services: categories.filter((value) => value === "SERVICE").length,
    generic_title_rows: generic.length,
    verdict: "RED_PENDING_INDEPENDENT_TECHNOLOGY_PASSPORT_AND_ROOT_CAUSE_MATRIX",
  };
}

function corpusCase(input: {
  selected: Json;
  definition: Json;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  trace: Json | undefined;
  backend: Json;
  sources: Json;
}): Json {
  const values = input.selected.batch_id === "BATCH-008"
    ? concreteInputs(input.parameters, input.definition)
    : input.selected.batch_id === "BATCH-007"
      ? hvacInputs(input.parameters, input.definition, input.trace?.input_values ?? {})
      : Object.assign(
      Object.fromEntries(input.parameters
        .filter((parameter) => parameter.defaultValue !== undefined && parameter.defaultValue !== null)
        .map((parameter) => [String(parameter.parameterId), parameter.defaultValue])),
      input.trace?.input_values ?? {},
    );
  invariant(values && input.parameters.filter((parameter) => parameter.required)
    .every((parameter) => Object.prototype.hasOwnProperty.call(values, String(parameter.parameterId))),
  `BEFORE_BRIDGE_REQUIRED_INPUT_MISSING:${input.selected.catalog_id}`);
  const resolved = values as Json;
  const numeric = Object.fromEntries(Object.entries(resolved)
    .filter(([, value]) => ["number", "string"].includes(typeof value))) as Record<string, number | string>;
  const formulaById = new Map(input.formulas.map((row) => [String(row.formulaId), row]));
  const included = input.resources.filter((row) => evaluateInclusionGraph(row.inclusionAst ?? { kind: "literal", value: true }, resolved));
  const runtimeRows = included.map((row) => {
    const formula = formulaById.get(String(row.formulaId));
    invariant(formula, `BEFORE_BRIDGE_FORMULA_JOIN:${input.selected.catalog_id}:${row.rowId}`);
    const quantity = Number(evaluateFormulaGraph(formula.ast, numeric));
    invariant(Number.isFinite(quantity) && quantity >= 0,
      `BEFORE_BRIDGE_QUANTITY:${input.selected.catalog_id}:${row.rowId}:${quantity}`);
    return {
      ordinal: row.ordinal,
      row_id: row.rowId,
      section: row.section,
      category: row.category,
      row_type: row.rowType,
      title_ru: row.titleRu,
      unit_id: row.unitId,
      quantity,
      formula_id: row.formulaId,
      semantic_owner: row.semanticOwner,
      cost_owner_id: row.costOwnerId,
      procurement_eligible: row.procurementEligible,
      inclusion_ast: row.inclusionAst,
      resource_graph: row.resourceGraph,
      source_metadata: row.sourceMetadata,
    };
  });
  invariant(runtimeRows.length === Number(input.backend.baselineRowCount),
    `BEFORE_BRIDGE_ACCEPTED_ROW_COUNT:${input.selected.catalog_id}:${runtimeRows.length}/${input.backend.baselineRowCount}`);
  return {
    definition: input.definition,
    input_values: resolved,
    input_values_sha256: input.trace?.input_values_sha256 ?? hashObject(resolved),
    parameters: input.parameters,
    formulas: input.formulas,
    resource_specs: input.resources,
    runtime_rows: runtimeRows,
    source_files: input.sources,
  };
}

function electricalCase(selected: Json, trace: Json, backend: Json): Json {
  invariant(hashFile(trace.proposal_source_ref) === trace.proposal_source_sha256,
    `BEFORE_BRIDGE_ELECTRICAL_SOURCE_DRIFT:${selected.catalog_id}`);
  const proof = readJson(trace.proposal_source_ref);
  invariant(proof.identity?.catalog_id === selected.catalog_id
    && proof.verdict === "GREEN_WORK_PROFESSIONAL_PROOF_MISSING_0",
    `BEFORE_BRIDGE_ELECTRICAL_PROOF:${selected.catalog_id}`);
  const rows = proof.production?.rows ?? [];
  invariant(rows.length === Number(backend.baselineRowCount),
    `BEFORE_BRIDGE_ELECTRICAL_ROW_COUNT:${selected.catalog_id}:${rows.length}/${backend.baselineRowCount}`);
  return {
    definition: { identity: proof.identity, candidate: proof.candidate, schema_version: proof.schema_version },
    input_values: trace.input_values,
    input_values_sha256: trace.input_values_sha256,
    parameters: Object.entries(trace.input_values).map(([parameter_id, value], ordinal) => ({ parameter_id, ordinal, value })),
    formulas: rows.map((row: Json) => ({ formula_id: row.formula_id, expression_source: row.formula_expression,
      input_values: row.formula_inputs, output_unit_id: row.formula_output_unit })),
    resource_specs: rows,
    runtime_rows: rows.map((row: Json, ordinal: number) => ({
      ordinal,
      row_id: row.row_id,
      section: row.category,
      category: row.category,
      title_ru: row.candidate_id,
      unit_id: row.formula_output_unit,
      quantity: row.formula_result_quantity,
      formula_id: row.formula_id,
      procurement_eligible: row.category === "material",
      normative_source: {
        official_document: row.official_document,
        clause_or_table: row.clause_or_table,
        official_document_sha256: row.official_document_sha256,
        official_document_url: row.official_document_url,
        applicability_to_kg: row.applicability_to_kg,
        rate_resolution: row.rate_resolution,
      },
      price_route: row.price_route,
    })),
    source_files: [{ path: trace.proposal_source_ref.replaceAll("\\", "/"), bytes: statSync(trace.proposal_source_ref).size,
      sha256: trace.proposal_source_sha256, role: "ACCEPTED_PROFESSIONAL_PROOF_BUNDLE" }],
  };
}

function main(): void {
  const selectionManifest = readJson(SELECTION);
  invariant(selectionManifest.master_contract?.sha256 === MASTER_SHA256, "BEFORE_BRIDGE_MASTER_DRIFT");
  const selected = (selectionManifest.selections as Json[]).filter((row) => ["BATCH-005", "BATCH-006", "BATCH-007", "BATCH-008"]
    .includes(String(row.batch_id)) && row.catalog_id !== SUCCESSOR_WITHOUT_R58_ACCEPTANCE);
  invariant(selected.length === 28 && new Set(selected.map((row) => row.catalog_id)).size === 28,
    `BEFORE_BRIDGE_SELECTION_DENOMINATOR:${selected.length}`);
  const selectedIds = new Set(selected.map((row) => String(row.catalog_id)));
  const traces = new Map(readJsonl(TRACE_VALUES).filter((row) => selectedIds.has(String(row.catalog_id)))
    .map((row) => [String(row.catalog_id), row]));
  const backend = new Map(readJsonl(BACKEND_LEDGER).filter((row) => selectedIds.has(String(row.catalogId)))
    .map((row) => [String(row.catalogId), row]));
  invariant(backend.size === 28, `BEFORE_BRIDGE_BACKEND_DENOMINATOR:${backend.size}`);
  invariant(selected.filter((row) => row.batch_id !== "BATCH-008").every((row) => traces.has(String(row.catalog_id))),
    "BEFORE_BRIDGE_ACCEPTED_TRACE_MISSING");

  const corpus = new Map<string, { definition: Json; parameters: Json[]; formulas: Json[]; resources: Json[]; sources: Json }>();
  for (const [batch, paths] of Object.entries(CORPORA)) {
    const ids = selected.filter((row) => row.batch_id === batch).map((row) => String(row.catalog_id));
    const definitions = selectedJsonl(paths.works, ids);
    const parameters = selectedJsonl(paths.parameters, ids);
    const formulas = selectedJsonl(paths.formulas, ids);
    const resources = selectedJsonl(paths.resources, ids);
    invariant(definitions.length === ids.length, `BEFORE_BRIDGE_DEFINITION_DENOMINATOR:${batch}:${definitions.length}/${ids.length}`);
    const sources = Object.entries(paths).map(([role, path]) => ({
      role: `ACCEPTED_${batch}_${role.toUpperCase()}_CORPUS`, path: path.replaceAll("\\", "/"), bytes: statSync(path).size,
    }));
    for (const definition of definitions) {
      const id = catalogId(definition);
      corpus.set(id, { definition, parameters: parameters.filter((row) => catalogId(row) === id),
        formulas: formulas.filter((row) => catalogId(row) === id), resources: resources.filter((row) => catalogId(row) === id), sources });
    }
  }

  const outputs: Json[] = [];
  const bindings: Json[] = [];
  for (const selectedCase of selected) {
    const id = String(selectedCase.catalog_id);
    const accepted = backend.get(id)!;
    invariant(accepted.status === "GREEN" && accepted.definitionVersionId === selectedCase.definition_version_id,
      `BEFORE_BRIDGE_BACKEND_IDENTITY:${id}`);
    invariant(accepted.compile?.revisionId && accepted.recalculate?.parentRevisionId === accepted.compile.revisionId,
      `BEFORE_BRIDGE_PARENT_CHILD_IDENTITY:${id}`);
    const composition = selectedCase.batch_id === "BATCH-005"
      ? electricalCase(selectedCase, traces.get(id)!, accepted)
      : corpusCase({ selected: selectedCase, ...corpus.get(id)!, trace: traces.get(id), backend: accepted });
    const payload = {
      schema_version: "real-useful-estimates-batch001-008-r1.accepted-composition-bridge.v1",
      generated_at: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      selection: selectedCase,
      exact_identity: {
        source_release_id: selectedCase.source_release_id,
        accepted_candidate_release_id: accepted.artifacts?.pdf?.sourceReleaseId,
        definition_version_id: accepted.definitionVersionId,
        definition_sha256: selectedCase.definition_sha256,
        canonical_parent_revision_id: accepted.compile.revisionId,
        canonical_parent_revision_number: 1,
        canonical_parent_parent_revision_id: null,
        canonical_parent_checksum_sha256: accepted.compile.checksumSha256,
        child_revision: {
          revision_id: accepted.recalculate.revisionId,
          parent_revision_id: accepted.recalculate.parentRevisionId,
          checksum_sha256: accepted.recalculate.checksumSha256,
          mutation: accepted.recalculate.mutation,
          dependent_rows_changed: accepted.recalculate.dependentRowsChanged,
        },
      },
      composition,
      artifacts: accepted.artifacts,
      artifact_retention: {
        metadata_and_sha256_retained: true,
        payload_files_deleted_by_accepted_r58_cleanup: accepted.cleanup?.artifactFilesDeleted,
        regenerated_payload_claimed: false,
      },
      content_audit: contentAudit(composition.runtime_rows),
      evidence_join: {
        rule: "EXACT_DEFINITION_VERSION_PLUS_ACCEPTED_PARENT_REVISION_PLUS_ACCEPTED_INPUTS_PLUS_FULL_SOURCE_COMPOSITION",
        historical_database_revision_rows_re_read: false,
        reason: "R58 acceptance cleanup deleted revision rows after recording immutable revision/checksum/artifact identity",
        no_latest_revision_selection: true,
        source_rows_projected_through_accepted_formulas: true,
      },
      content_green_claimed: false,
      release_performed: false,
      deploy_performed: false,
      ota_performed: false,
      merge_performed: false,
      push_performed: false,
      batch009_performed: false,
      status: "CAPTURED_ACCEPTED_BEFORE_COMPOSITION_BRIDGE_CONTENT_RED_NO_RELEASE",
    };
    const output = { ...payload, payload_sha256: hashObject(payload) };
    const path = resolve(OUTPUT_ROOT, `${String(selectedCase.ordinal).padStart(2, "0")}-${fileToken(id)}.json`);
    atomicJson(path, output);
    outputs.push({ ordinal: selectedCase.ordinal, batch_id: selectedCase.batch_id, catalog_id: id,
      parent_revision_id: accepted.compile.revisionId, child_revision_id: accepted.recalculate.revisionId,
      rows: composition.runtime_rows.length, parameters: composition.parameters.length, formulas: composition.formulas.length,
      path: path.replaceAll("\\", "/"), sha256: hashFile(path), content_verdict: "RED" });
    bindings.push({
      ordinal: selectedCase.ordinal,
      batch_id: selectedCase.batch_id,
      catalog_id: id,
      release_id: accepted.artifacts?.pdf?.sourceReleaseId,
      source_release_id: selectedCase.source_release_id,
      prepared_release_status: "ACCEPTED_R58_CANDIDATE_SNAPSHOT_CLEANED_AFTER_PROOF",
      authoritative_audit_definition_version_id: selectedCase.definition_version_id,
      authoritative_audit_definition_sha256: selectedCase.definition_sha256,
      runtime_definition_version_id: accepted.definitionVersionId,
      canonical_parent_revision_id: accepted.compile.revisionId,
      canonical_parent_revision_number: 1,
      canonical_parent_parent_revision_id: null,
      selection_reason: "EXACT_ACCEPTED_R58_COMPILE_PARENT_NOT_LATEST_RECALCULATED_CHILD",
      child_revisions: [{ revision_id: accepted.recalculate.revisionId, parent_revision_id: accepted.recalculate.parentRevisionId,
        mutation: accepted.recalculate.mutation, role: "ACCEPTED_RECALCULATION_CHILD_EXCLUDED_FROM_PRIMARY_BEFORE" }],
      child_revision_count: 1,
      source_evidence: { backend_ledger: BACKEND_LEDGER.replaceAll("\\", "/"), backend_ledger_sha256: hashFile(BACKEND_LEDGER),
        trace_values: traces.has(id) ? TRACE_VALUES.replaceAll("\\", "/") : null,
        composition_path: path.replaceAll("\\", "/"), composition_sha256: hashFile(path) },
    });
  }

  outputs.sort((left, right) => Number(left.ordinal) - Number(right.ordinal));
  const indexPayload = {
    schema_version: "real-useful-estimates-batch001-008-r1.accepted-composition-bridge-index.v1",
    generated_at: new Date().toISOString(), master_sha256: MASTER_SHA256,
    expected_historical_cases: 28, captured_historical_cases: outputs.length,
    total_rows: outputs.reduce((sum, row) => sum + Number(row.rows), 0),
    successor_pending_separate_prepared_snapshot: SUCCESSOR_WITHOUT_R58_ACCEPTANCE,
    cases: outputs,
    content_green_claimed: false, release_performed: false, deploy_performed: false, ota_performed: false,
    merge_performed: false, push_performed: false, batch009_performed: false,
    status: "GREEN_EVIDENCE_JOIN_ONLY_CONTENT_RED_28_OF_28_HISTORICAL_CASES_NO_RELEASE",
  };
  const index = { ...indexPayload, payload_sha256: hashObject(indexPayload) };
  const indexPath = resolve(OUTPUT_ROOT, "BEFORE_ACCEPTED_COMPOSITION_BRIDGE_INDEX.json");
  atomicJson(indexPath, index);

  const current = readJson(BINDINGS);
  const merged = new Map<string, Json>([...(current.bindings ?? []), ...bindings]
    .map((binding: Json) => [String(binding.catalog_id), binding]));
  const bindingPayload: Json = {
    ...current,
    generated_at: new Date().toISOString(),
    bound_cases: merged.size,
    missing_catalog_ids: (selectionManifest.selections as Json[]).filter((row) => !merged.has(String(row.catalog_id)))
      .map((row) => String(row.catalog_id)),
    bindings: [...merged.values()].sort((left, right) => Number(left.ordinal) - Number(right.ordinal)),
    status: `PARTIAL_BEFORE_REVISION_BINDINGS_${merged.size}_OF_50_CONTENT_RED_NO_RELEASE`,
  };
  delete bindingPayload.payload_sha256;
  atomicJson(BINDINGS, { ...bindingPayload, payload_sha256: hashObject(bindingPayload) });
  process.stdout.write(`${JSON.stringify({ status: index.status, cases: outputs.length, rows: index.total_rows,
    index: indexPath.replaceAll("\\", "/"), index_sha256: hashFile(indexPath), bindings: merged.size,
    binding_manifest_sha256: hashFile(BINDINGS), pending: SUCCESSOR_WITHOUT_R58_ACCEPTANCE }, null, 2)}\n`);
}

main();
