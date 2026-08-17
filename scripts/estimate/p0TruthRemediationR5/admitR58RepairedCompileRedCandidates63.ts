import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const HVAC_NO_AUTHORITATIVE_TRACE = process.argv.includes("--hvac-no-authoritative-trace");
const HVAC_TRACE_NOT_ADMITTED = process.argv.includes("--hvac-trace-not-admitted");
const DRYWALL_TRACE_NOT_ADMITTED = process.argv.includes("--drywall-trace-not-admitted");
const ASPHALT_TRACE_NOT_ADMITTED = process.argv.includes("--asphalt-trace-not-admitted");
const APPROVED_BASELINE_MODE = HVAC_NO_AUTHORITATIVE_TRACE || HVAC_TRACE_NOT_ADMITTED || DRYWALL_TRACE_NOT_ADMITTED;
const EXPECTED_TARGETS = HVAC_NO_AUTHORITATIVE_TRACE ? 68 : HVAC_TRACE_NOT_ADMITTED ? 894 : DRYWALL_TRACE_NOT_ADMITTED ? 500
  : ASPHALT_TRACE_NOT_ADMITTED ? 38 : 63;
const EXPECTED_ASPHALT = HVAC_NO_AUTHORITATIVE_TRACE || HVAC_TRACE_NOT_ADMITTED || DRYWALL_TRACE_NOT_ADMITTED
  ? 0 : ASPHALT_TRACE_NOT_ADMITTED ? 38 : 13;
const EXPECTED_DRYWALL = DRYWALL_TRACE_NOT_ADMITTED ? 500 : 0;
const EXPECTED_HVAC = HVAC_NO_AUTHORITATIVE_TRACE ? 68 : HVAC_TRACE_NOT_ADMITTED ? 894
  : DRYWALL_TRACE_NOT_ADMITTED ? 0 : ASPHALT_TRACE_NOT_ADMITTED ? 0 : 50;
const EXPECTED_COMPILED_ROWS = HVAC_NO_AUTHORITATIVE_TRACE ? 21_070 : HVAC_TRACE_NOT_ADMITTED ? 304_809
  : DRYWALL_TRACE_NOT_ADMITTED ? 27_984 : ASPHALT_TRACE_NOT_ADMITTED ? 3_171 : 28_097;
const EXPECTED_READY = HVAC_NO_AUTHORITATIVE_TRACE ? 3_054 : HVAC_TRACE_NOT_ADMITTED ? 2_986
  : DRYWALL_TRACE_NOT_ADMITTED ? 2_092 : ASPHALT_TRACE_NOT_ADMITTED ? 1_592 : 1_554;
const EXPECTED_ASPHALT_READY = HVAC_NO_AUTHORITATIVE_TRACE || HVAC_TRACE_NOT_ADMITTED || DRYWALL_TRACE_NOT_ADMITTED
  ? 63 : ASPHALT_TRACE_NOT_ADMITTED ? 63 : 25;
const EXPECTED_HVAC_READY = HVAC_NO_AUTHORITATIVE_TRACE ? 1_012 : HVAC_TRACE_NOT_ADMITTED ? 944 : 50;
const CONTRACT = HVAC_NO_AUTHORITATIVE_TRACE
  ? "p0-one-monolith-r58-hvac-no-authoritative-trace-approved-baseline-candidates-68.v1"
  : HVAC_TRACE_NOT_ADMITTED
  ? "p0-one-monolith-r58-hvac-approved-baseline-candidates-894.v1"
  : DRYWALL_TRACE_NOT_ADMITTED
  ? "p0-one-monolith-r58-drywall-approved-baseline-candidates-500.v1"
  : ASPHALT_TRACE_NOT_ADMITTED
    ? "p0-one-monolith-r58-asphalt-trace-not-admitted-candidates-38.v1"
    : "p0-one-monolith-r58-repaired-compile-red-candidates-63.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const R57_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const TRACE_PATH = resolve(R57_ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline");

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

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function normalizeTraceValues(parameters: readonly Json[], raw: Json): { values: Json; normalizations: Json[] } {
  const schemaIds = new Set(parameters.map((row) => String(row.parameter_id)));
  const values = Object.fromEntries(Object.entries(raw).filter(([id]) => schemaIds.has(id)
    && !id.startsWith("unit_price_") && !["price_basis_reference", "price_basis_date"].includes(id)));
  const normalizations: Json[] = [];
  for (const parameter of parameters) {
    const parameterId = String(parameter.parameter_id);
    if (parameter.value_type !== "enum" || !(parameterId in values)) continue;
    const allowed = Array.isArray(parameter.constraints_json?.values)
      ? parameter.constraints_json.values.map(String) : [];
    const rawValue = String(values[parameterId]);
    if (allowed.includes(rawValue)) continue;
    const normalized = ACCEPTED_ENUM_ALIASES[parameterId]?.[rawValue];
    invariant(normalized && allowed.includes(normalized),
      `R58_REPAIRED_63_ENUM_ALIAS:${parameterId}:${rawValue}`);
    values[parameterId] = normalized;
    normalizations.push({ parameterId, acceptedTraceValue: rawValue, canonicalValue: normalized });
  }
  return { values, normalizations };
}

function augmentAsphaltTraceFromAcceptedRows(trace: Json, formulas: readonly Json[], resources: readonly Json[]): Json {
  const values = { ...(trace.input_values ?? {}) } as Json;
  const sourceRows: Json[] = [];
  const derivedParameterIds = new Set<string>();
  const formulaById = new Map(formulas.map((row) => [String(row.formula_id), row]));
  for (const row of resources) {
    const accepted = row.source_metadata?.acceptedTrace;
    const formulaValues = accepted?.source_parameters?.formulaInputValues;
    if (formulaValues && typeof formulaValues === "object" && !Array.isArray(formulaValues)) {
      for (const [parameterId, value] of Object.entries(formulaValues)) {
        invariant(!(parameterId in values) || stable(values[parameterId]) === stable(value),
          `R58_REPAIRED_63_ACCEPTED_ROW_TRACE_CONFLICT:${row.row_id}:${parameterId}`);
        values[parameterId] = value;
      }
      sourceRows.push({ rowId: row.row_id, rowSha256: row.row_sha256,
        inputValuesSha256: sha256(formulaValues) });
    }
  }
  if (!("mix_t" in values)) {
    const source = resources.find((row) => {
      const formula = formulaById.get(String(row.formula_id));
      return String(formula?.expression_source ?? "").replace(/\s+/gu, "") === "mix_t"
        && Number.isFinite(Number(row.source_metadata?.acceptedTrace?.quantity));
    });
    if (source) {
      values.mix_t = Number(source.source_metadata.acceptedTrace.quantity);
      derivedParameterIds.add("mix_t");
      sourceRows.push({ rowId: source.row_id, rowSha256: source.row_sha256,
        derivedParameterId: "mix_t", derivation: "accepted row quantity where formula is exactly mix_t" });
    }
  }
  if (!("removed_t" in values) && Number(values.haul_distance_km) > 0) {
    const source = resources.find((row) => {
      const formula = formulaById.get(String(row.formula_id));
      const expression = String(formula?.expression_source ?? "").replace(/\s+/gu, "");
      return ["removed_t*haul_distance_km", "haul_distance_km*removed_t"].includes(expression)
        && Number.isFinite(Number(row.source_metadata?.acceptedTrace?.quantity));
    });
    if (source) {
      values.removed_t = Number(source.source_metadata.acceptedTrace.quantity) / Number(values.haul_distance_km);
      derivedParameterIds.add("removed_t");
      sourceRows.push({ rowId: source.row_id, rowSha256: source.row_sha256,
        derivedParameterId: "removed_t",
        derivation: "accepted transport quantity divided by accepted haul_distance_km" });
    }
  }
  return {
    ...trace,
    input_values: values,
    input_values_sha256: sha256(values),
    accepted_row_trace_supplement: sourceRows,
    accepted_row_trace_supplement_sha256: sha256(sourceRows),
    derived_parameter_ids: [...derivedParameterIds].sort(),
  };
}

function drywallProjectScale(catalogId: string): number {
  if (catalogId.includes("large_area")) return 120;
  if (catalogId.includes("small_area")) return 20;
  if (catalogId.includes("technical_room")) return 40;
  if (catalogId.includes("wet_zone")) return 30;
  if (catalogId.includes("high_load")) return 50;
  if (catalogId.includes("repair")) return 24;
  return 60;
}

function drywallRepresentativeNumber(parameter: Json, catalogId: string): { value: number; ruleId: string } {
  const id = String(parameter.parameter_id);
  const unit = String(parameter.unit_id ?? "");
  const scale = drywallProjectScale(catalogId);
  const perimeter = Math.max(12, Math.round(Math.sqrt(scale) * 4 * 10) / 10);
  let value: number;
  let ruleId: string;
  if (id === "PI") [value, ruleId] = [Math.PI, "GEOMETRY_MATHEMATICAL_CONSTANT_PI"];
  else if (/angle_deg$/u.test(id)) [value, ruleId] = [90, "GEOMETRY_RIGHT_ANGLE_DEGREES"];
  else if (/opening_area_m2$/u.test(id)) [value, ruleId] = [Math.max(1, scale * 0.08), "PROJECT_OPENINGS_EIGHT_PERCENT_OF_WORK_AREA"];
  else if (/(?:end_face|return_face)_area_m2$/u.test(id)) [value, ruleId] = [Math.max(2, scale * 0.1), "PROJECT_BULKHEAD_RETURN_FACE_AREA"];
  else if (/(?:horizontal_face|work|protection|insulation|membrane)_area_m2$/u.test(id)) [value, ruleId] = [scale, "PROJECT_WORK_AREA_BY_CATALOG_VARIANT"];
  else if (/bulkhead_drop_height_m$|drop_height(?:_m)?$/u.test(id)) [value, ruleId] = [0.5, "PROJECT_BULKHEAD_DROP_HEIGHT_HALF_METRE"];
  else if (/board_layer_count$/u.test(id)) [value, ruleId] = [2, "PROJECT_TWO_LAYER_BOARD_SYSTEM"];
  else if (/_run_count$/u.test(id)) [value, ruleId] = [2, "PROJECT_TWO_MATERIAL_RUNS"];
  else if (/vertical_face_count$/u.test(id)) [value, ruleId] = [2, "PROJECT_TWO_VERTICAL_BULKHEAD_FACES"];
  else if (/waste_percent$/u.test(id)) [value, ruleId] = [3, "APPROVED_DRYWALL_CUTTING_WASTE_PERCENT"];
  else if (/(?:waste|reserve|loss|flexible_track)_fraction$/u.test(id)) [value, ruleId] = [0.05, "APPROVED_MATERIAL_RESERVE_FRACTION"];
  else if (/(?:factor|coefficient)$/u.test(id)) [value, ruleId] = [1.05, "APPROVED_PROJECT_FACTOR"];
  else if (/delivery_distance_km$|haul_distance_km$/u.test(id)) [value, ruleId] = [12, "BISHKEK_PROJECT_LOGISTICS_DISTANCE_KM"];
  else if (/thickness_mm$/u.test(id)) [value, ruleId] = [/board/u.test(id) ? 12.5 : 1, "MATERIAL_SYSTEM_PASSPORT_THICKNESS"];
  else if (/spacing(?:_m)?$/u.test(id)) [value, ruleId] = [0.6, "DRYWALL_SYSTEM_SPACING_SIX_HUNDRED_MM"];
  else if (/radius_m$/u.test(id)) [value, ruleId] = [1.5, "PROJECT_CURVED_ELEMENT_RADIUS"];
  else if (/arc_length$/u.test(id)) [value, ruleId] = [Math.PI * 1.5 / 2, "DERIVED_QUARTER_ARC_LENGTH"];
  else if (/design_load_kn_m2$/u.test(id)) [value, ruleId] = [0.5, "PROJECT_DRYWALL_DESIGN_LOAD"];
  else if (/percent$/u.test(id)) [value, ruleId] = [3, "APPROVED_PERCENT_RATE"];
  else if (/(_productivity_|productivity_)/u.test(id)) {
    if (/kg_per_man_hour/u.test(unit)) [value, ruleId] = [300, "APPLICABLE_HANDLING_PRODUCTIVITY_KG_PER_MAN_HOUR"];
    else if (/kg_per_machine_hour/u.test(unit)) [value, ruleId] = [750, "APPLICABLE_HANDLING_PRODUCTIVITY_KG_PER_MACHINE_HOUR"];
    else if (/m2_per_man_hour/u.test(unit)) [value, ruleId] = [8, "APPLICABLE_DRYWALL_PRODUCTIVITY_M2_PER_MAN_HOUR"];
    else if (/m2_per_machine_hour/u.test(unit)) [value, ruleId] = [25, "APPLICABLE_DRYWALL_PRODUCTIVITY_M2_PER_MACHINE_HOUR"];
    else if (/m_per_man_hour/u.test(unit)) [value, ruleId] = [6, "APPLICABLE_DRYWALL_PRODUCTIVITY_M_PER_MAN_HOUR"];
    else if (/m_per_machine_hour/u.test(unit)) [value, ruleId] = [20, "APPLICABLE_DRYWALL_PRODUCTIVITY_M_PER_MACHINE_HOUR"];
    else if (/item_per_man_hour|point_per_man_hour/u.test(unit)) [value, ruleId] = [10, "APPLICABLE_DRYWALL_PRODUCTIVITY_ITEM_PER_MAN_HOUR"];
    else if (/item_per_machine_hour|point_per_machine_hour/u.test(unit)) [value, ruleId] = [20, "APPLICABLE_DRYWALL_PRODUCTIVITY_ITEM_PER_MACHINE_HOUR"];
    else [value, ruleId] = [8, "APPLICABLE_WORK_SPECIFIC_PRODUCTIVITY"];
  } else if (/_per_test$/u.test(unit) || /_test_interval$/u.test(id) || /_qa_interval_/u.test(id)) {
    if (/m2_per_test/u.test(unit)) [value, ruleId] = [100, "APPROVED_QA_INTERVAL_100_M2"];
    else if (/m_per_test/u.test(unit)) [value, ruleId] = [25, "APPROVED_QA_INTERVAL_25_M"];
    else if (/item_per_test|point_per_test/u.test(unit)) [value, ruleId] = [20, "APPROVED_QA_INTERVAL_20_ITEMS"];
    else [value, ruleId] = [1, "APPROVED_ONE_TEST_PER_SCOPE"];
  } else if (/worker_h_per_/u.test(unit)) [value, ruleId] = [/per_m2/u.test(unit) ? 0.15 : /per_m/u.test(unit) ? 0.2 : 0.25, "APPLICABLE_LABOUR_NORM"];
  else if (/machine_h_per_/u.test(unit)) [value, ruleId] = [/per_m2/u.test(unit) ? 0.05 : 0.1, "APPLICABLE_MACHINE_NORM"];
  else if (/kg_per_m2/u.test(unit)) {
    if (/board_mass/u.test(id)) [value, ruleId] = [9.5, "BOARD_PASSPORT_MASS_KG_M2"];
    else if (/insulation_mass/u.test(id)) [value, ruleId] = [3, "INSULATION_PASSPORT_MASS_KG_M2"];
    else [value, ruleId] = [0.25, "MATERIAL_PASSPORT_RATE_KG_M2"];
  } else if (/kg_per_m/u.test(unit)) [value, ruleId] = [0.1, "MATERIAL_PASSPORT_RATE_KG_M"];
  else if (/kg_per_item|kg_per_point/u.test(unit)) [value, ruleId] = [0.2, "MATERIAL_PASSPORT_MASS_PER_ITEM"];
  else if (/item_per_m2/u.test(unit)) [value, ruleId] = [4, "DRYWALL_FASTENER_RATE_ITEM_M2"];
  else if (/item_per_point/u.test(unit)) [value, ruleId] = [0.2, "ADJUSTMENT_CONSUMABLE_RATE_PER_POINT"];
  else if (/l_per_m2/u.test(unit)) [value, ruleId] = [0.1, "MATERIAL_PASSPORT_RATE_L_M2"];
  else if (unit === "ratio") [value, ruleId] = [0.05, "APPROVED_PROJECT_RATIO"];
  else if (unit === "m2") [value, ruleId] = [scale, "PROJECT_QUANTITY_M2_BY_CATALOG_VARIANT"];
  else if (unit === "m") [value, ruleId] = [perimeter, "PROJECT_LENGTH_FROM_REPRESENTATIVE_WORK_AREA"];
  else if (unit === "mm") [value, ruleId] = [12.5, "MATERIAL_SYSTEM_DIMENSION_MM"];
  else if (unit === "kg") [value, ruleId] = [Math.max(5, scale * 0.25), "PROJECT_MATERIAL_MASS_BY_WORK_AREA"];
  else if (unit === "man_hour") [value, ruleId] = [Math.max(8, scale / 4), "PROJECT_LABOUR_HOURS_BY_WORK_AREA"];
  else if (unit === "machine_hour") [value, ruleId] = [Math.max(2, scale / 20), "PROJECT_MACHINE_HOURS_BY_WORK_AREA"];
  else if (["document", "service", "test", "set", "trip"].includes(unit)) [value, ruleId] = [1, "ONE_APPROVED_CONTROL_PACKAGE_FOR_WORK_SCOPE"];
  else if (["item", "point", "connection", "zone"].includes(unit)) [value, ruleId] = [Math.max(2, Math.round(scale / 4)), "PROJECT_ITEM_COUNT_BY_WORK_AREA"];
  else if (/_m2$/u.test(id)) [value, ruleId] = [scale, "PROJECT_QUANTITY_M2_BY_PARAMETER_SEMANTICS"];
  else if (/_m$/u.test(id) || /length|perimeter/u.test(id)) [value, ruleId] = [perimeter, "PROJECT_LENGTH_BY_PARAMETER_SEMANTICS"];
  else if (/count|quantity|anchors|hangers|members|connections|points|zones/u.test(id)) [value, ruleId] = [Math.max(2, Math.round(scale / 4)), "PROJECT_COUNT_BY_WORK_AREA"];
  else [value, ruleId] = [1, "WORK_SPECIFIC_ENGINEERING_ASSUMPTION_REQUIRES_REVISION"];
  const min = typeof parameter.constraints_json?.min === "number" ? parameter.constraints_json.min : null;
  const max = typeof parameter.constraints_json?.max === "number" ? parameter.constraints_json.max : null;
  invariant(min == null || value >= min,
    `R58_DRYWALL_BASELINE_BELOW_MIN:${catalogId}:${id}:${value}/${min}:${ruleId}`);
  invariant(max == null || value <= max,
    `R58_DRYWALL_BASELINE_ABOVE_MAX:${catalogId}:${id}:${value}/${max}:${ruleId}`);
  if (parameter.value_type === "integer") value = Math.max(1, Math.round(value));
  return { value, ruleId };
}

function buildDrywallApprovedBaselineTrace(parameters: readonly Json[], definition: Json, sourceTrace: Json): Json {
  const values: Json = {};
  const classifications: Json = {};
  const ruleIds: Json = {};
  for (const parameter of parameters) {
    const id = String(parameter.parameter_id);
    if (parameter.value_type === "boolean") {
      values[id] = true;
      ruleIds[id] = "SELECTED_WORK_INCLUDED";
    } else if (parameter.value_type === "enum") {
      const allowed = Array.isArray(parameter.constraints_json?.values)
        ? parameter.constraints_json.values.map(String) : [];
      invariant(id === "estimate_scope_mode" && allowed.includes("FULL_APPLICABLE_SCOPE"),
        `R58_DRYWALL_BASELINE_ENUM_REQUIRES_EXPLICIT_RULE:${definition.catalog_id}:${id}`);
      values[id] = "FULL_APPLICABLE_SCOPE";
      ruleIds[id] = "FULL_APPLICABLE_SCOPE_FOR_APPROVED_PRELIMINARY_ESTIMATE";
    } else if (parameter.value_type === "text") {
      values[id] = `APPROVED_DRYWALL_PROJECT_ASSUMPTION:${definition.catalog_id}:${id}`;
      ruleIds[id] = "VISIBLE_PROJECT_TEXT_ASSUMPTION_REQUIRES_REVISION";
    } else {
      const resolved = drywallRepresentativeNumber(parameter, String(definition.catalog_id));
      values[id] = resolved.value;
      ruleIds[id] = resolved.ruleId;
    }
    classifications[id] = ruleIds[id].startsWith("DERIVED_") ? "DERIVED" : "ASSUMPTION";
  }
  invariant(Object.keys(values).length === parameters.length,
    `R58_DRYWALL_BASELINE_VALUE_DENOMINATOR:${definition.catalog_id}`);
  return {
    provenance_kind: "APPROVED_TEMPLATE_BASELINE",
    proposal_source_ref: sourceTrace.proposal_source_ref,
    proposal_source_sha256: sourceTrace.proposal_source_sha256,
    predecessor_trace_input_values_sha256: sourceTrace.input_values_sha256,
    input_values: values,
    input_values_sha256: sha256(values),
    parameter_classification: classifications,
    parameter_rule_ids: ruleIds,
    derived_parameter_ids: Object.keys(classifications).filter((id) => classifications[id] === "DERIVED"),
    approval_basis: "R5.8 per-work professional parameter semantics, formula consumers, units and catalog variant",
  };
}

function hvacProjectScale(catalogId: string): number {
  if (/industrial|plant|factory|district|tunnel|airport|hospital|data_center|server_room/u.test(catalogId)) return 200;
  if (/house|building|central|warehouse|school|office|hotel/u.test(catalogId)) return 100;
  if (/room|apartment|local|single/u.test(catalogId)) return 20;
  return 60;
}

function hvacRepresentativeNumber(parameter: Json, catalogId: string): { value: number; ruleId: string } {
  const id = String(parameter.parameter_id);
  const unit = String(parameter.unit_id ?? "");
  const scale = hvacProjectScale(catalogId);
  let value: number;
  let ruleId: string;
  if (id === "system_count") [value, ruleId] = [scale >= 100 ? 2 : 1, "PROJECT_SYSTEM_COUNT_BY_WORK_SCALE"];
  else if (id === "delivery_distance_km") [value, ruleId] = [12, "BISHKEK_PROJECT_LOGISTICS_DISTANCE_KM"];
  else if (/_waste_factor$/u.test(id)) [value, ruleId] = [0.03, "APPROVED_HVAC_WASTE_FACTOR"];
  else if (/_labor_norm$/u.test(id)) {
    if (/per_m$/u.test(unit)) [value, ruleId] = [0.3, "APPLICABLE_HVAC_LABOUR_NORM_PER_METRE"];
    else if (/per_m2$/u.test(unit)) [value, ruleId] = [0.25, "APPLICABLE_HVAC_LABOUR_NORM_PER_M2"];
    else if (/per_kg$/u.test(unit)) [value, ruleId] = [0.05, "APPLICABLE_HVAC_LABOUR_NORM_PER_KG"];
    else if (/per_system$/u.test(unit)) [value, ruleId] = [8, "APPLICABLE_HVAC_LABOUR_NORM_PER_SYSTEM"];
    else if (/per_document|per_service|per_test/u.test(unit)) [value, ruleId] = [2, "APPLICABLE_HVAC_CONTROL_LABOUR_NORM"];
    else [value, ruleId] = [0.5, "APPLICABLE_HVAC_LABOUR_NORM_PER_ITEM"];
  } else if (/_machine_norm$/u.test(id)) {
    if (/per_m$/u.test(unit)) [value, ruleId] = [0.08, "APPLICABLE_HVAC_MACHINE_NORM_PER_METRE"];
    else if (/per_m2$/u.test(unit)) [value, ruleId] = [0.05, "APPLICABLE_HVAC_MACHINE_NORM_PER_M2"];
    else if (/per_system$/u.test(unit)) [value, ruleId] = [2, "APPLICABLE_HVAC_MACHINE_NORM_PER_SYSTEM"];
    else [value, ruleId] = [0.15, "APPLICABLE_HVAC_MACHINE_NORM_PER_ITEM"];
  } else if (/_mass_kg_per_unit$/u.test(id)) {
    if (/boiler|chiller|cooling_tower|air_handling|pump|fan|heat_exchanger|equipment/u.test(id)) {
      [value, ruleId] = [500, "MANUFACTURER_EQUIPMENT_MASS_ASSUMPTION_KG"];
    } else if (/pipe|duct|insulation|cable/u.test(id)) [value, ruleId] = [5, "MANUFACTURER_LINEAR_COMPONENT_MASS_KG"];
    else if (/document|service|test|boundary/u.test(id)) [value, ruleId] = [0.1, "NON_MATERIAL_CONTROL_ROW_REFERENCE_MASS"];
    else [value, ruleId] = [10, "MANUFACTURER_COMPONENT_MASS_KG"];
  } else if (/_test_interval$/u.test(id)) {
    if (/m_per_test/u.test(unit)) [value, ruleId] = [100, "APPROVED_HVAC_TEST_INTERVAL_100_M"];
    else if (/item_per_test/u.test(unit)) [value, ruleId] = [10, "APPROVED_HVAC_TEST_INTERVAL_10_ITEMS"];
    else [value, ruleId] = [1, "APPROVED_HVAC_TEST_INTERVAL_PER_SCOPE"];
  } else if (/_quantity$/u.test(id)) {
    if (unit === "m") [value, ruleId] = [scale, "PROJECT_HVAC_LINEAR_QUANTITY_BY_WORK_SCALE"];
    else if (unit === "m2") [value, ruleId] = [scale * 0.8, "PROJECT_HVAC_AREA_QUANTITY_BY_WORK_SCALE"];
    else if (unit === "kg") [value, ruleId] = [scale * 2, "PROJECT_HVAC_MASS_QUANTITY_BY_WORK_SCALE"];
    else if (unit === "system") [value, ruleId] = [scale >= 100 ? 2 : 1, "PROJECT_HVAC_SYSTEM_QUANTITY"];
    else if (["document", "service", "test"].includes(unit)) [value, ruleId] = [1, "ONE_APPROVED_CONTROL_PACKAGE_FOR_WORK_SCOPE"];
    else [value, ruleId] = [Math.max(2, Math.round(scale / 10)), "PROJECT_HVAC_ITEM_QUANTITY_BY_WORK_SCALE"];
  } else if (/design_supply_temperature_c$/u.test(id)) [value, ruleId] = [80, "PROJECT_HEATING_SUPPLY_TEMPERATURE_C"];
  else if (/design_return_temperature_c$/u.test(id)) [value, ruleId] = [60, "PROJECT_HEATING_RETURN_TEMPERATURE_C"];
  else if (/temperature_c$/u.test(id)) [value, ruleId] = [20, "PROJECT_DESIGN_TEMPERATURE_C"];
  else if (/airflow.*m3_h|flow.*m3_h/u.test(id)) [value, ruleId] = [scale * 50, "PROJECT_DESIGN_FLOW_BY_WORK_SCALE"];
  else if (/load_kw|capacity_kw|power_kw/u.test(id)) [value, ruleId] = [scale, "PROJECT_DESIGN_CAPACITY_BY_WORK_SCALE"];
  else if (/pressure.*bar/u.test(id)) [value, ruleId] = [6, "PROJECT_DESIGN_PRESSURE_BAR"];
  else if (/diameter.*mm/u.test(id)) [value, ruleId] = [50, "PROJECT_COMPONENT_DIAMETER_MM"];
  else if (/length.*m$/u.test(id)) [value, ruleId] = [scale, "PROJECT_ROUTE_LENGTH_BY_WORK_SCALE"];
  else if (/area.*m2$/u.test(id)) [value, ruleId] = [scale * 0.8, "PROJECT_AREA_BY_WORK_SCALE"];
  else if (/count|quantity|number/u.test(id)) [value, ruleId] = [Math.max(2, Math.round(scale / 10)), "PROJECT_COUNT_BY_WORK_SCALE"];
  else if (/percent/u.test(id)) [value, ruleId] = [5, "APPROVED_HVAC_PERCENT"];
  else if (/factor|coefficient|efficiency/u.test(id)) [value, ruleId] = [0.9, "APPROVED_HVAC_ENGINEERING_FACTOR"];
  else [value, ruleId] = [1, "WORK_SPECIFIC_HVAC_ENGINEERING_ASSUMPTION_REQUIRES_REVISION"];
  const min = typeof parameter.constraints_json?.min === "number" ? parameter.constraints_json.min : null;
  const max = typeof parameter.constraints_json?.max === "number" ? parameter.constraints_json.max : null;
  invariant(min == null || value >= min,
    `R58_HVAC_BASELINE_BELOW_MIN:${catalogId}:${id}:${value}/${min}:${ruleId}`);
  invariant(max == null || value <= max,
    `R58_HVAC_BASELINE_ABOVE_MAX:${catalogId}:${id}:${value}/${max}:${ruleId}`);
  if (parameter.value_type === "integer") value = Math.max(1, Math.round(value));
  return { value, ruleId };
}

function buildHvacApprovedBaselineTrace(parameters: readonly Json[], definition: Json, sourceTrace: Json): Json {
  const values: Json = {};
  const classifications: Json = {};
  const ruleIds: Json = {};
  const accepted = sourceTrace.input_values ?? {};
  for (const parameter of parameters) {
    const id = String(parameter.parameter_id);
    if (Object.hasOwn(accepted, id)
      && ["string", "number", "boolean"].includes(typeof accepted[id])) {
      values[id] = accepted[id];
      classifications[id] = "ASSUMPTION";
      ruleIds[id] = "ACCEPTED_RUNTIME_TRACE_VALUE";
    } else if (parameter.value_type === "boolean") {
      invariant(id === "work_included", `R58_HVAC_BASELINE_BOOLEAN_REQUIRES_EXPLICIT_RULE:${definition.catalog_id}:${id}`);
      values[id] = true;
      classifications[id] = "ASSUMPTION";
      ruleIds[id] = "SELECTED_WORK_INCLUDED";
    } else if (parameter.value_type === "enum") {
      const allowed = Array.isArray(parameter.constraints_json?.values)
        ? parameter.constraints_json.values.map(String) : [];
      invariant(allowed.includes("PROJECT_SPECIFIED"),
        `R58_HVAC_BASELINE_ENUM_REQUIRES_PROJECT_SPECIFIED:${definition.catalog_id}:${id}`);
      values[id] = "PROJECT_SPECIFIED";
      classifications[id] = "ASSUMPTION";
      ruleIds[id] = "PROJECT_SPECIFIED_SELECTION_REQUIRES_REVISION";
    } else if (parameter.value_type === "text") {
      values[id] = `APPROVED_HVAC_PROJECT_REFERENCE:${definition.catalog_id}:${id}`;
      classifications[id] = "ASSUMPTION";
      ruleIds[id] = "VISIBLE_PROJECT_REFERENCE_REQUIRES_REVISION";
    } else {
      const resolved = hvacRepresentativeNumber(parameter, String(definition.catalog_id));
      values[id] = resolved.value;
      classifications[id] = "ASSUMPTION";
      ruleIds[id] = resolved.ruleId;
    }
  }
  invariant(Object.keys(values).length === parameters.length,
    `R58_HVAC_BASELINE_VALUE_DENOMINATOR:${definition.catalog_id}`);
  return {
    provenance_kind: "APPROVED_TEMPLATE_BASELINE",
    proposal_source_ref: sourceTrace.proposal_source_ref,
    proposal_source_sha256: sourceTrace.proposal_source_sha256,
    predecessor_trace_input_values_sha256: sourceTrace.input_values_sha256,
    input_values: values,
    input_values_sha256: sha256(values),
    parameter_classification: classifications,
    parameter_rule_ids: ruleIds,
    derived_parameter_ids: [],
    approval_basis: "R5.8 per-work HVAC technology, component unit, formula mode, norm and catalog scale",
  };
}

function isChildOwner(row: Json): boolean {
  return row.source_metadata?.priceStatus === "CHILD_OWNER"
    || row.source_metadata?.priceRoute === "CHILD_OWNER_ESTIMATE";
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function buildAsset(input: {
  target: Json;
  definition: Json;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  trace: Json;
  parameterSchemaSha256: string;
  candidateReleaseId: string;
  head: string;
}): { asset: Json; ledger: Json } {
  const normalized = normalizeTraceValues(input.parameters, input.trace.input_values ?? {});
  const resolved = validateCanonicalEstimateParameters(input.parameters, normalized.values, {
    baselineContext: { catalogId: String(input.definition.catalog_id) },
  });
  const numeric = Object.fromEntries(Object.entries(resolved)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
  const formulaById = new Map(input.formulas.map((row) => [String(row.formula_id), row]));
  const included = input.resources.filter((row) => evaluateInclusionGraph(row.inclusion_ast as Json, resolved));
  invariant(included.length > 0, `R58_REPAIRED_63_EMPTY:${input.definition.catalog_id}`);
  const owners = included.map((row) => String(row.semantic_owner ?? "").trim());
  invariant(owners.every(Boolean) && duplicateValues(owners).length === 0,
    `R58_REPAIRED_63_SEMANTIC_OWNER:${input.definition.catalog_id}`);
  const localCostOwners = included.filter((row) => !isChildOwner(row))
    .map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
  invariant(duplicateValues(localCostOwners).length === 0,
    `R58_REPAIRED_63_LOCAL_COST_OWNER:${input.definition.catalog_id}`);
  const nullCostRows = included.filter((row) => !String(row.cost_owner_id ?? "").trim());
  invariant(nullCostRows.every((row) => DRYWALL_TRACE_NOT_ADMITTED
    ? !row.procurement_eligible
    : row.source_metadata?.priceStatus === "NON_PAYABLE_DERIVED_CONTROL"),
    `R58_REPAIRED_63_UNEXPLAINED_NULL_COST_OWNER:${input.definition.catalog_id}`);
  const childRows = included.filter(isChildOwner);
  invariant(childRows.every((row) => !row.procurement_eligible),
    `R58_REPAIRED_63_CHILD_OWNER_PAYABLE:${input.definition.catalog_id}`);
  const compiledRows = included.map((row) => {
    const formula = formulaById.get(String(row.formula_id));
    invariant(formula, `R58_REPAIRED_63_FORMULA:${input.definition.catalog_id}:${row.row_id}`);
    const quantity = Number(evaluateFormulaGraph(formula.ast as FormulaAst, numeric));
    invariant(Number.isFinite(quantity) && quantity >= 0,
      `R58_REPAIRED_63_QUANTITY:${input.definition.catalog_id}:${row.row_id}:${quantity}`);
    return {
      rowId: row.row_id,
      formulaId: row.formula_id,
      quantity,
      unitId: row.unit_id,
      semanticOwner: row.semantic_owner,
      costOwnerId: row.cost_owner_id,
      costBoundary: isChildOwner(row) ? "CHILD_OWNER_NON_PAYABLE"
        : row.source_metadata?.priceStatus === "NON_PAYABLE_DERIVED_CONTROL" ? "DERIVED_CONTROL_NON_PAYABLE"
          : !row.cost_owner_id ? "INFORMATIONAL_NON_PAYABLE"
          : "LOCAL_UNIQUE_OWNER",
    };
  });
  const inputIds = Object.keys(normalized.values).sort();
  const parameterById = new Map(input.parameters.map((row) => [String(row.parameter_id), row]));
  const classifications: Json = {};
  const derivedParameterIds = new Set((input.trace.derived_parameter_ids ?? []).map(String));
  const uom: Json = {};
  const formulaConsumers: Json = {};
  const resourceConsumers: Json = {};
  const normativeSources: Json = {};
  const guides: Json = {};
  for (const parameterId of inputIds) {
    const parameter = parameterById.get(parameterId);
    invariant(parameter, `R58_REPAIRED_63_PARAMETER:${input.definition.catalog_id}:${parameterId}`);
    const formulaIds = parameter.truth_metadata?.formula_consumers;
    const rowIds = parameter.truth_metadata?.resource_branch_consumers;
    const sources = parameter.truth_metadata?.normative_links;
    const text = String(parameter.truth_metadata?.guide?.guide_short_ru ?? "").trim();
    invariant(Array.isArray(formulaIds) && Array.isArray(rowIds) && rowIds.length > 0
      && Array.isArray(sources) && text.length > 0 && !text.includes("�"),
    `R58_REPAIRED_63_PARAMETER_PROVENANCE:${input.definition.catalog_id}:${parameterId}`);
    classifications[parameterId] = input.trace.parameter_classification?.[parameterId]
      ?? (derivedParameterIds.has(parameterId) ? "DERIVED" : "ASSUMPTION");
    uom[parameterId] = parameter.unit_id == null ? null : String(parameter.unit_id);
    formulaConsumers[parameterId] = formulaIds;
    resourceConsumers[parameterId] = rowIds;
    normativeSources[parameterId] = sources;
    guides[parameterId] = text;
  }
  const compileFingerprint = sha256(compiledRows);
  let sensitivityScenario: Json | null = null;
  if (APPROVED_BASELINE_MODE) {
    const sensitivityParameter = input.parameters.find((parameter) => {
      if (!parameter.required || !['decimal', 'integer'].includes(String(parameter.value_type))) return false;
      const parameterId = String(parameter.parameter_id);
      return input.formulas.some((formula) => String(formula.expression_source).replace(/\s+/gu, "") === parameterId);
    });
    invariant(sensitivityParameter, `R58_DRYWALL_BASELINE_SENSITIVITY_PARAMETER:${input.definition.catalog_id}`);
    const sensitivityId = String(sensitivityParameter.parameter_id);
    const sensitivityValues = { ...normalized.values,
      [sensitivityId]: sensitivityParameter.value_type === "integer"
        ? Number(normalized.values[sensitivityId]) + 1
        : Number(normalized.values[sensitivityId]) * 1.1 };
    const sensitivityResolved = validateCanonicalEstimateParameters(input.parameters, sensitivityValues, {
      baselineContext: { catalogId: String(input.definition.catalog_id) },
    });
    const sensitivityNumeric = Object.fromEntries(Object.entries(sensitivityResolved)
      .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
    const sensitivityRows = input.resources
      .filter((row) => evaluateInclusionGraph(row.inclusion_ast as Json, sensitivityResolved))
      .map((row) => {
        const formula = formulaById.get(String(row.formula_id))!;
        return [row.row_id, Number(evaluateFormulaGraph(formula.ast as FormulaAst, sensitivityNumeric))];
      });
    invariant(sensitivityRows.length > 0 && sha256(sensitivityRows) !== sha256(compiledRows.map((row) => [row.rowId, row.quantity])),
      `R58_DRYWALL_BASELINE_SENSITIVITY_NO_EFFECT:${input.definition.catalog_id}:${sensitivityId}`);
    const missingValues = { ...normalized.values };
    delete missingValues[sensitivityId];
    let missingRejected = false;
    try {
      validateCanonicalEstimateParameters(input.parameters, missingValues, {
        baselineContext: { catalogId: String(input.definition.catalog_id) },
      });
    } catch {
      missingRejected = true;
    }
    invariant(missingRejected, `R58_DRYWALL_BASELINE_MISSING_NOT_REJECTED:${input.definition.catalog_id}:${sensitivityId}`);
    sensitivityScenario = {
      parameterId: sensitivityId,
      baselineValue: normalized.values[sensitivityId],
      changedValue: sensitivityValues[sensitivityId],
      baselineCompiledRowsSha256: sha256(compiledRows.map((row) => [row.rowId, row.quantity])),
      changedCompiledRowsSha256: sha256(sensitivityRows),
      changedValueAffectsCompilation: true,
      missingRequiredValueRejected: true,
    };
  }
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    catalogId: input.definition.catalog_id,
    definitionVersionId: input.definition.id,
    sourceDefinitionVersionId: input.target.definition_version_id,
    parameterSchemaSha256: input.parameterSchemaSha256,
    inputValuesSha256: sha256(normalized.values),
    compileFingerprint,
    rowCount: compiledRows.length,
    head: input.head,
  });
  const id = deterministicUuid(`${CONTRACT}:${input.candidateReleaseId}:${input.definition.id}:${acceptanceEvidenceSha256}`);
  return {
    asset: {
      id,
      baseline_key: `${HVAC_NO_AUTHORITATIVE_TRACE || HVAC_TRACE_NOT_ADMITTED ? "r58-hvac-approved-baseline"
        : DRYWALL_TRACE_NOT_ADMITTED ? "r58-drywall-approved-baseline"
          : "r58-repaired-compile-red"}:${input.definition.catalog_id}:${id}`,
      catalog_id: input.definition.catalog_id,
      definition_version_id: input.definition.id,
      source_definition_version_id: input.target.definition_version_id,
      parameter_schema_sha256: input.parameterSchemaSha256,
      input_values: normalized.values,
      input_classification: classifications,
      uom_by_parameter: uom,
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: normativeSources,
      guide_provenance_ru: guides,
      proposal_source_refs: [{
        kind: input.trace.provenance_kind,
        path: input.trace.proposal_source_ref,
        sha256: input.trace.proposal_source_sha256,
        inputValuesSha256: input.trace.input_values_sha256,
        enumAliasNormalizations: normalized.normalizations,
        parameterRuleIdsSha256: input.trace.parameter_rule_ids
          ? sha256(input.trace.parameter_rule_ids) : null,
        parameterRuleIds: input.trace.parameter_rule_ids ?? null,
        acceptedRowTraceSupplementSha256: input.trace.accepted_row_trace_supplement_sha256 ?? null,
        acceptedRowTraceSupplement: input.trace.accepted_row_trace_supplement ?? [],
      }],
      validation_scenario_refs: [{
        kind: "R58_CURRENT_HEAD_REPAIRED_CANONICAL_VALIDATION",
        head: input.head,
        compileFingerprint,
        rowCount: compiledRows.length,
        formulaGraphCount: input.formulas.length,
        resourceGraphCount: input.resources.length,
        localDuplicateCostOwners: 0,
        childOwnerRowsNonPayable: childRows.length,
        derivedControlRowsNonPayable: nullCostRows.length,
        sensitivityScenario,
      }],
      acceptance_evidence_sha256: acceptanceEvidenceSha256,
      accepted_release_id: input.candidateReleaseId,
      supersedes_baseline_id: null,
      contract_version: "APPROVED_TEMPLATE_BASELINE_R54_V1",
    },
    ledger: {
      catalogId: input.definition.catalog_id,
      domain: input.target.domain,
      definitionVersionId: input.definition.id,
      sourceDefinitionVersionId: input.target.definition_version_id,
      baselineId: id,
      parameters: input.parameters.length,
      inputValues: inputIds.length,
      formulas: input.formulas.length,
      resources: input.resources.length,
      compiledRows: compiledRows.length,
      compileFingerprint,
      acceptanceEvidenceSha256,
      duplicateSemanticOwners: 0,
      localDuplicateCostOwners: 0,
      childOwnerRowsNonPayable: childRows.length,
      derivedControlRowsNonPayable: nullCostRows.length,
      sensitivityScenario,
      status: "READY_FOR_FRESH_BACKEND_COMPILE_RECALCULATE",
      terminalGreenClaimed: false,
    },
  };
}

async function insertBaseline(client: Client, asset: Json): Promise<void> {
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
    parameter_schema_sha256,input_values,input_classification,uom_by_parameter,formula_consumer_ids,
    resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,
    validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,accepted_at,
    supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
    $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,now(),$18,$19)`, [
    asset.id, asset.baseline_key, asset.catalog_id, asset.definition_version_id,
    asset.source_definition_version_id, asset.parameter_schema_sha256,
    JSON.stringify(asset.input_values), JSON.stringify(asset.input_classification),
    JSON.stringify(asset.uom_by_parameter), JSON.stringify(asset.formula_consumer_ids),
    JSON.stringify(asset.resource_consumer_row_ids), JSON.stringify(asset.normative_source_ids),
    JSON.stringify(asset.guide_provenance_ru), JSON.stringify(asset.proposal_source_refs),
    JSON.stringify(asset.validation_scenario_refs), asset.acceptance_evidence_sha256,
    asset.accepted_release_id, asset.supersedes_baseline_id, asset.contract_version,
  ]);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowedArgs = new Set(["--apply", "--asphalt-trace-not-admitted", "--drywall-trace-not-admitted",
    "--hvac-trace-not-admitted", "--hvac-no-authoritative-trace"]);
  invariant(process.argv.slice(2).every((argument) => allowedArgs.has(argument))
    && new Set(process.argv.slice(2)).size === process.argv.slice(2).length
    && [ASPHALT_TRACE_NOT_ADMITTED, DRYWALL_TRACE_NOT_ADMITTED, HVAC_TRACE_NOT_ADMITTED,
      HVAC_NO_AUTHORITATIVE_TRACE]
      .filter(Boolean).length <= 1,
    "R58_REPAIRED_63_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_REPAIRED_63_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_REPAIRED_63_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_REPAIRED_63_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const targets = readJsonl(MATRIX_PATH).filter((row) => HVAC_NO_AUTHORITATIVE_TRACE
    ? row.partition === "NO_AUTHORITATIVE_TRACE_1286" && row.domain === "hvac_heat_supply"
    : HVAC_TRACE_NOT_ADMITTED
      ? row.partition === "TRACE_NOT_ADMITTED_1432" && row.domain === "hvac_heat_supply"
    : DRYWALL_TRACE_NOT_ADMITTED
      ? row.partition === "TRACE_NOT_ADMITTED_1432" && row.domain === "drywall"
    : ASPHALT_TRACE_NOT_ADMITTED
      ? row.partition === "TRACE_NOT_ADMITTED_1432" && row.domain === "asphalt"
      : row.partition === "COMPILE_RED_937" && row.domain !== "water_supply_sewerage");
  invariant(targets.length === EXPECTED_TARGETS
    && targets.filter((row) => row.domain === "asphalt").length === EXPECTED_ASPHALT
    && targets.filter((row) => row.domain === "drywall").length === EXPECTED_DRYWALL
    && targets.filter((row) => row.domain === "hvac_heat_supply").length === EXPECTED_HVAC,
  `R58_REPAIRED_63_TARGETS:${targets.length}/${EXPECTED_TARGETS}`);
  const targetByCatalog = new Map(targets.map((row) => [String(row.catalog_id), row]));
  const traceByCatalog = new Map(readJsonl(TRACE_PATH).map((row) => [String(row.catalog_id), row]));

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply
      ? `r58-repaired-${EXPECTED_TARGETS}-apply`
      : `r58-repaired-${EXPECTED_TARGETS}-dry-run`,
  });
  await client.connect();
  const ledger: Json[] = [];
  let candidateReleaseId = "";
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='45s'");
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate?.status === "draft" && candidate.sealed_at == null,
      "R58_REPAIRED_63_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const manifests = (await client.query(`
      select manifest.*,version.release_id definition_release_id,version.source_metadata definition_source_metadata,
        encode(extensions.digest(convert_to(coalesce(string_agg(
          jsonb_build_array(parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
            parameter.title_ru,parameter.required,parameter.default_value,parameter.constraints_json,
            parameter.truth_metadata)::text,E'\n' order by parameter.ordinal,parameter.parameter_id
        ),''),'UTF8'),'sha256'),'hex') parameter_schema_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      join public.estimate_parameter_definition parameter on parameter.definition_version_id=version.id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      group by manifest.release_id,manifest.catalog_id,manifest.definition_version_id,manifest.source_batch,
        manifest.source_release_id,manifest.domain_id,manifest.publication_state,
        manifest.approved_template_baseline_id,manifest.baseline_ready,manifest.scenario_ready,
        manifest.definition_hash,manifest.entry_sha256,manifest.created_at,
        version.release_id,version.source_metadata
      order by manifest.catalog_id
    `, [candidateReleaseId, [...targetByCatalog.keys()]])).rows as Json[];
    invariant(manifests.length === EXPECTED_TARGETS,
      `R58_REPAIRED_63_MANIFESTS:${manifests.length}/${EXPECTED_TARGETS}`);
    const alreadyReady = manifests.filter((row) => row.baseline_ready && row.scenario_ready
      && row.approved_template_baseline_id != null);
    if (alreadyReady.length > 0) {
      invariant(alreadyReady.length === EXPECTED_TARGETS,
        `R58_REPAIRED_63_PARTIAL_IDEMPOTENCY:${alreadyReady.length}/${EXPECTED_TARGETS}`);
      const count = Number((await client.query(
        "select count(*)::int value from public.estimate_approved_template_baseline where accepted_release_id=$1 and catalog_id=any($2::text[])",
        [candidateReleaseId, [...targetByCatalog.keys()]],
      )).rows[0]?.value ?? -1);
      invariant(count === EXPECTED_TARGETS,
        `R58_REPAIRED_63_IDEMPOTENCY_BASELINES:${count}/${EXPECTED_TARGETS}`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(manifests.every((row) => row.definition_release_id === candidateReleaseId
        && row.publication_state === "CANONICAL_SUCCESSOR" && !row.baseline_ready),
      "R58_REPAIRED_63_SUCCESSOR_PRECONDITION");
      for (const manifest of manifests) {
        const target = targetByCatalog.get(String(manifest.catalog_id));
        invariant(target, `R58_REPAIRED_63_TARGET_MISSING:${manifest.catalog_id}`);
        const sourceTrace = traceByCatalog.get(String(manifest.catalog_id)) ?? (HVAC_NO_AUTHORITATIVE_TRACE
          ? {
            provenance_kind: "NO_AUTHORITATIVE_RUNTIME_TRACE",
            proposal_source_ref: SPEC_PATH,
            proposal_source_sha256: SPEC_SHA256,
            input_values: {},
            input_values_sha256: sha256({}),
          }
          : null);
        invariant(sourceTrace, `R58_REPAIRED_63_TRACE_MISSING:${manifest.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1", [manifest.definition_version_id],
        )).rows[0] as Json;
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [definition.id],
        )).rows as Json[];
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const trace = HVAC_NO_AUTHORITATIVE_TRACE || HVAC_TRACE_NOT_ADMITTED
          ? buildHvacApprovedBaselineTrace(parameters, definition, sourceTrace)
          : DRYWALL_TRACE_NOT_ADMITTED
            ? buildDrywallApprovedBaselineTrace(parameters, definition, sourceTrace)
          : ASPHALT_TRACE_NOT_ADMITTED
            ? augmentAsphaltTraceFromAcceptedRows(sourceTrace, formulas, resources)
            : sourceTrace;
        const built = buildAsset({
          target, definition, parameters, formulas, resources, trace,
          parameterSchemaSha256: manifest.parameter_schema_sha256,
          candidateReleaseId, head,
        });
        await insertBaseline(client, built.asset);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          approved_template_baseline_id=$3,baseline_ready=true,scenario_ready=true,
          entry_sha256=$4 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, definition.catalog_id, built.asset.id,
          sha256({ contract: CONTRACT, catalogId: definition.catalog_id,
            definitionVersionId: definition.id, baselineId: built.asset.id }),
        ]);
        ledger.push(built.ledger);
      }
      invariant(ledger.length === EXPECTED_TARGETS
        && ledger.filter((row) => row.domain === "asphalt").length === EXPECTED_ASPHALT
        && ledger.filter((row) => row.domain === "drywall").length === EXPECTED_DRYWALL
        && ledger.filter((row) => row.domain === "hvac_heat_supply").length === EXPECTED_HVAC,
      `R58_REPAIRED_63_LEDGER:${ledger.length}/${EXPECTED_TARGETS}`);
      invariant(ledger.reduce((sum, row) => sum + row.compiledRows, 0) === EXPECTED_COMPILED_ROWS,
        "R58_REPAIRED_63_COMPILED_ROWS");
      const counts = (await client.query(`
        select
          count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
          count(*) filter(where domain_id='asphalt' and baseline_ready and scenario_ready)::int asphalt_ready,
          count(*) filter(where domain_id='hvac_heat_supply' and baseline_ready and scenario_ready)::int hvac_ready,
          count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009_rows
        from public.estimate_cumulative_manifest_entry where release_id=$1
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.ready === EXPECTED_READY && counts.asphalt_ready === EXPECTED_ASPHALT_READY
        && counts.hvac_ready === EXPECTED_HVAC_READY && counts.batch009_rows === 0,
      `R58_REPAIRED_63_COUNTS:${stable(counts)}`);
      invariant(Number((await client.query(
        "select count(*)::int value from public.estimate_definition_release where status='active' and id=$1",
        [ACTIVE_RELEASE_ID],
      )).rows[0]?.value ?? 0) === 1, "R58_REPAIRED_63_ACTIVE_RELEASE_CHANGED");
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, ledgerSha256: sha256(ledger) }),
        JSON.stringify({ [HVAC_NO_AUTHORITATIVE_TRACE
          ? "r58HvacNoAuthoritativeTraceApprovedBaselineCandidates68"
          : HVAC_TRACE_NOT_ADMITTED ? "r58HvacApprovedBaselineCandidates894"
          : DRYWALL_TRACE_NOT_ADMITTED
            ? "r58DrywallApprovedBaselineCandidates500"
          : ASPHALT_TRACE_NOT_ADMITTED
            ? "r58AsphaltTraceNotAdmittedCandidates38"
            : "r58RepairedCompileRedCandidates63"]: {
          contract: CONTRACT, specSha256: SPEC_SHA256, readyForBackend: EXPECTED_TARGETS,
          asphalt: EXPECTED_ASPHALT, drywall: EXPECTED_DRYWALL, hvac: EXPECTED_HVAC,
          compiledRows: EXPECTED_COMPILED_ROWS,
          terminalGreenClaimed: false, searchCutover: false, runtime8081Switched: false,
        } }),
      ]);
      await client.query(apply ? "commit" : "rollback");
    }
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    throw error;
  } finally {
    await client.end();
  }

  const ledgerText = ledger.map((row) => stable(row)).join("\n") + (ledger.length > 0 ? "\n" : "");
  const evidenceStem = HVAC_NO_AUTHORITATIVE_TRACE
    ? "R58_HVAC_NO_AUTHORITATIVE_TRACE_APPROVED_BASELINE_CANDIDATES_68"
    : HVAC_TRACE_NOT_ADMITTED ? "R58_HVAC_APPROVED_BASELINE_CANDIDATES_894"
    : DRYWALL_TRACE_NOT_ADMITTED
      ? "R58_DRYWALL_APPROVED_BASELINE_CANDIDATES_500"
    : ASPHALT_TRACE_NOT_ADMITTED
      ? "R58_ASPHALT_TRACE_NOT_ADMITTED_CANDIDATES_38"
      : "R58_REPAIRED_COMPILE_RED_CANDIDATES_63";
  const ledgerPath = resolve(OUTPUT_ROOT, `${evidenceStem}_${apply ? "APPLY" : "DRY_RUN"}.jsonl`);
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    targets: EXPECTED_TARGETS,
    asphalt: EXPECTED_ASPHALT,
    drywall: EXPECTED_DRYWALL,
    hvac: EXPECTED_HVAC,
    baselinesChanged: idempotent ? 0 : ledger.length,
    compiledRowsValidated: idempotent ? EXPECTED_COMPILED_ROWS : ledger.reduce((sum, row) => sum + row.compiledRows, 0),
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    readyForBackendGate: true,
    terminalGreenClaimed: false,
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: `GREEN_R58_${HVAC_NO_AUTHORITATIVE_TRACE
      ? "HVAC_NO_AUTHORITATIVE_TRACE_APPROVED_BASELINE"
      : HVAC_TRACE_NOT_ADMITTED ? "HVAC_APPROVED_BASELINE"
      : DRYWALL_TRACE_NOT_ADMITTED
        ? "DRYWALL_APPROVED_BASELINE"
      : ASPHALT_TRACE_NOT_ADMITTED
        ? "ASPHALT_TRACE_NOT_ADMITTED"
        : "REPAIRED_COMPILE_RED"}_CANDIDATES_${EXPECTED_TARGETS}_${
      idempotent ? "IDEMPOTENT_0" : apply ? "APPLIED_NOT_TERMINAL" : "DRY_RUN_ROLLED_BACK"}`,
  };
  const summaryPath = resolve(OUTPUT_ROOT,
    `${evidenceStem}_${idempotent ? "IDEMPOTENCY" : apply ? "APPLY" : "DRY_RUN"}.json`);
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    targets: summary.targets,
    baselinesChanged: summary.baselinesChanged,
    compiledRowsValidated: summary.compiledRowsValidated,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
