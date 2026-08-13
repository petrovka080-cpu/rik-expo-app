import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyParameterRoleV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
  ProfessionalNormativeRowTraceV3,
} from "../../professionalProjectAssemblyV4";
import type {
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
  ProfessionalNormativeProfileV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import type { InteriorFinishesDomainInventoryRow } from "./inventory";
import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import {
  DRYWALL_AGGREGATE_SKELETON_ROW_KEYS_V4,
  drywallFlatCeilingMaximumScopeLinesV6,
  drywallMaximumScopeLinesV5,
  type DrywallMaximumScopeLineV5,
} from "./drywallArchitecturalElementsMaximumScopeV5";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  drywallFlatCeilingExpectedCandidatesV6,
  type DrywallFlatCeilingOperationV6,
  type DrywallFlatCeilingVariantV6,
} from "./drywallFlatCeilingExpectedScopeV6";

export type DrywallArchitecturalElementOperationV4 =
  | "FRAME"
  | "ALIGN"
  | "CLAD"
  | "FINISH_JOINT"
  | "INSULATE"
  | "PREPARE"
  | "REPAIR";

export type DrywallArchitecturalElementVariantV4 =
  | "standard"
  | "large_area"
  | "small_area"
  | "technical_room"
  | "wet_zone"
  | "high_load";

const VARIANTS: readonly DrywallArchitecturalElementVariantV4[] = Object.freeze([
  "large_area", "small_area", "standard", "technical_room", "wet_zone",
]);

const SELECTED_GROUP_ROOTS = Object.freeze([
  "drywall_ceiling_interior_bulkhead_finish_joint",
  "drywall_ceiling_interior_bulkhead_insulate",
  "drywall_ceiling_interior_bulkhead_prepare",
  "drywall_ceiling_interior_bulkhead_repair",
  "drywall_ceiling_interior_curve_align",
  "drywall_ceiling_interior_curve_clad",
  "drywall_ceiling_interior_curve_finish_joint",
  "drywall_ceiling_interior_curve_frame",
  "drywall_ceiling_interior_curve_insulate",
  "drywall_ceiling_interior_curve_prepare",
  "drywall_ceiling_interior_curve_repair",
] as const);

export const DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4: readonly string[] = Object.freeze(
  SELECTED_GROUP_ROOTS.flatMap((root) => VARIANTS.map((variant) => `${root}_${variant}`)),
);

const ARCHITECTURAL_AUTHORIZED = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
const FLAT_CEILING_AUTHORIZED = new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6);
const AUTHORIZED = new Set([...ARCHITECTURAL_AUTHORIZED, ...FLAT_CEILING_AUTHORIZED]);
const BOTH_SCOPES = ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const;
const FULL_SCOPE = ["FULL_APPLICABLE_SCOPE"] as const;
const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;

const KG_SP = "KG_SP_KR_65_101_2025";
const KG_KRER = "KG_KRER_10_05_011";
const KG_KRERR = "kg_krerr_2015_application_guidance";
const KG_SAFETY = "KG_SN_KR_12_01_2018";
const KG_MATERIAL = "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE";

type ParameterSpec = {
  parameter_id: string;
  label_ru: string;
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"];
  priority: ProfessionalDomainParameterDefinitionV1["priority"];
  unit_id: string | null;
  role: ProfessionalAssemblyParameterRoleV4;
  required_for: readonly ProfessionalEstimateScopeModeV4[];
  minimum?: number;
  maximum?: number;
  choices?: readonly { value: string; label_ru: string }[];
};

type RowSpec = {
  key: string;
  section: string;
  category: ProfessionalAssemblyRowDefinitionV4["category"];
  title: string;
  expression: string;
  inputs: readonly string[];
  output_unit: string;
  calculate: ProfessionalAssemblyFormulaV4["calculate"];
  scopes: "BOTH" | "FULL";
  ownership?: "priced_resource" | "informational_output";
  procurement?: boolean;
  resource_class: string;
};

export type DrywallArchitecturalElementWorkContractV4 = {
  schema_version: "DrywallArchitecturalElementWorkContractV4" | "DrywallFlatCeilingWorkContractV6";
  catalog_id: string;
  work_key: string;
  title_ru: string;
  system: "BULKHEAD" | "CURVE" | "CEILING";
  group: DrywallArchitecturalElementOperationV4;
  operation: DrywallArchitecturalElementOperationV4;
  variant: DrywallArchitecturalElementVariantV4;
  group_key: string;
  normative_source_ids: readonly string[];
  required_stages: readonly string[];
  optional_stages: readonly string[];
  owned_cost_scope: readonly string[];
  forbidden_cost_scope: readonly string[];
  non_cost_dependencies: readonly string[];
  normative_proof_bundle_id: string;
  professional_proof_bundle_id: string;
};

export type DrywallArchitecturalElementProfessionalPackagePartsV4 = {
  contract: DrywallArchitecturalElementWorkContractV4;
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

export type IndividualProfessionalEstimatePassportV6 = {
  schemaVersion: "IndividualProfessionalEstimatePassportV6";
  catalogId: string;
  titleRu: string;
  operation: DrywallFlatCeilingOperationV6;
  variant: DrywallFlatCeilingVariantV6;
  productionOwnerId: string;
  calculationStrategyId: string;
  parameterSchemaId: string;
  formulaGraphId: string;
  resourceGraphId: string;
  includedScope: readonly string[];
  excludedScope: readonly string[];
  dependencyOrder: readonly string[];
  typedChildBoundaries: readonly string[];
  normativeSourceIds: readonly string[];
  parameterCount: number;
  boqRowCount: number;
  expectedCandidateCount: number;
  candidateCoveragePercent: 100;
  shownButUnusedParameterCount: 0;
  hiddenQuantitativeAssumptionCount: 0;
  identityHash: string;
  parameterSchemaHash: string;
  formulaGraphHash: string;
  resourceGraphHash: string;
};

export function drywallArchitecturalElementProfessionalOwnerIdV4(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_OWNER_OUTSIDE_SCOPE:${catalogId}`);
  if (FLAT_CEILING_AUTHORIZED.has(catalogId)) return `domain-passport:drywall-flat-ceiling-professional-v6:${catalogId}`;
  return `domain-passport:drywall-architectural-element-professional-v4:${catalogId}`;
}

export function drywallArchitecturalElementCalculationStrategyIdV4(catalogId: string): string {
  if (!AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_STRATEGY_OUTSIDE_SCOPE:${catalogId}`);
  if (FLAT_CEILING_AUTHORIZED.has(catalogId)) return `drywall-flat-ceiling-professional-v6:${catalogId}:calculation-strategy`;
  return `drywall-architectural-element-professional-v4:${catalogId}:calculation-strategy`;
}

function operationOf(catalogId: string): DrywallArchitecturalElementOperationV4 {
  for (const [marker, operation] of [
    ["_finish_joint_", "FINISH_JOINT"], ["_insulate_", "INSULATE"],
    ["_prepare_", "PREPARE"], ["_repair_", "REPAIR"], ["_align_", "ALIGN"],
    ["_clad_", "CLAD"], ["_frame_", "FRAME"],
  ] as const) if (catalogId.includes(marker)) return operation;
  throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_OPERATION_NOT_FOUND:${catalogId}`);
}

function variantOf(catalogId: string): DrywallArchitecturalElementVariantV4 {
  for (const variant of ["technical_room", "large_area", "small_area", "wet_zone", "high_load", "standard"] as const) {
    if (catalogId.endsWith(`_${variant}`)) return variant;
  }
  throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_VARIANT_NOT_FOUND:${catalogId}`);
}

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ParameterSpec["input_type"],
  role: ParameterSpec["role"],
  required_for: ParameterSpec["required_for"] = BOTH_SCOPES,
  unit_id: string | null = null,
  bounds: Pick<ParameterSpec, "minimum" | "maximum" | "choices"> = {},
): ParameterSpec {
  return {
    parameter_id, label_ru, input_type, role, required_for, unit_id,
    priority: required_for === FULL_SCOPE ? "P1" : "P0",
    ...bounds,
  };
}

function numberParameter(
  id: string,
  label: string,
  unit: string,
  role: ParameterSpec["role"],
  modes: ParameterSpec["required_for"] = BOTH_SCOPES,
  minimum = 0.000001,
  maximum = 100_000_000,
): ParameterSpec {
  return parameter(id, label, "number", role, modes, unit, { minimum, maximum });
}

function pricedRow(
  key: string,
  section: string,
  category: RowSpec["category"],
  title: string,
  expression: string,
  inputs: readonly string[],
  output_unit: string,
  calculate: RowSpec["calculate"],
  options: Partial<Pick<RowSpec, "scopes" | "procurement" | "resource_class">> = {},
): RowSpec {
  return {
    key, section, category, title, expression, inputs, output_unit, calculate,
    scopes: options.scopes ?? "BOTH",
    procurement: options.procurement ?? (category === "material" || category === "transport"),
    resource_class: options.resource_class ?? category,
  };
}

function infoRow(key: string, section: string, title: string, expression: string, inputs: readonly string[], output_unit: string, calculate: RowSpec["calculate"], scopes: "BOTH" | "FULL", category: RowSpec["category"] = "work"): RowSpec {
  return { key, section, category, title, expression, inputs, output_unit, calculate, scopes, ownership: "informational_output", procurement: false, resource_class: "calculated control output" };
}

const FRAME_GEOMETRY_DERIVED_KEYS = new Set([
  "frame_flexible_track",
  "frame_vertical_profiles",
  "frame_cross_profiles",
  "frame_adjustable_hangers",
  "frame_hanger_rods",
  "frame_track_anchors",
  "frame_hanger_anchors",
  "frame_metal_screws",
  "frame_acoustic_tape",
  "frame_hatch_reinforcement",
  "frame_mep_reinforcement",
  "frame_reinforcement_connectors",
  "frame_anchor_point_layout",
  "frame_anchor_drilling",
  "frame_anchor_installation",
  "frame_track_installation",
  "frame_hanger_installation",
  "frame_vertical_profile_installation",
  "frame_cross_member_installation",
  "frame_hatch_reinforcement_installation",
  "frame_mep_reinforcement_installation",
  "frame_connection_torque_control",
]);

function maximumScopeParameters(
  operation: DrywallArchitecturalElementOperationV4,
  variant: DrywallArchitecturalElementVariantV4,
  system: DrywallArchitecturalElementWorkContractV4["system"],
): ParameterSpec[] {
  const candidates = system === "CEILING"
    ? drywallFlatCeilingMaximumScopeLinesV6(operation as DrywallFlatCeilingOperationV6, variant as DrywallFlatCeilingVariantV6)
    : drywallMaximumScopeLinesV5(operation, variant);
  return candidates
    .filter((candidate) => !FRAME_GEOMETRY_DERIVED_KEYS.has(candidate.key))
    .map((candidate) => numberParameter(
      candidate.quantity_parameter_id,
      candidate.quantity_label_ru,
      candidate.unit_id,
      candidate.parameter_role,
      BOTH_SCOPES,
      system === "CEILING" && drywallFlatCeilingExpectedCandidatesV6(operation as DrywallFlatCeilingOperationV6, variant as DrywallFlatCeilingVariantV6)
        .find((item) => item.candidateId === candidate.key)?.applicability === "CONDITIONAL" ? 0 : 0.000001,
    ));
}

function flatCeilingGeometryParameters(operation: DrywallArchitecturalElementOperationV4): ParameterSpec[] {
  if (operation !== "FRAME") return [];
  return [
    numberParameter("ceiling_primary_profile_spacing_m", "Шаг несущих профилей по проектной раскладке", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numberParameter("ceiling_secondary_profile_spacing_m", "Шаг поперечных профилей", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numberParameter("ceiling_hanger_spacing_m", "Шаг подвесов", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 5),
    numberParameter("ceiling_perimeter_anchor_spacing_m", "Шаг анкеров периметрального профиля", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05, 2),
    numberParameter("ceiling_suspension_drop_m", "Высота подвеса потолка", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01, 20),
    numberParameter("ceiling_opening_count", "Количество люков и инженерных отверстий", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0, 100_000),
  ];
}

function flatCeilingGeometryRows(operation: DrywallArchitecturalElementOperationV4): RowSpec[] {
  const rows = [
    infoRow("ceiling_area_geometry_control", "Геометрия", "Контрольная площадь плоского потолка", "length_m × width_m", ["length_m", "width_m"], "m2", (values) => values.length_m * values.width_m, "BOTH"),
    infoRow("ceiling_perimeter_geometry_control", "Геометрия", "Контрольный периметр плоского потолка", "2 × (length_m + width_m)", ["length_m", "width_m"], "m", (values) => 2 * (values.length_m + values.width_m), "BOTH"),
  ];
  if (operation !== "FRAME") return rows;
  return [
    ...rows,
    infoRow("ceiling_primary_profile_run_control", "Геометрия каркаса", "Расчетная длина несущих профилей", "area_m2 ÷ primary_profile_spacing_m", ["area_m2", "ceiling_primary_profile_spacing_m"], "m", (values) => values.area_m2 / values.ceiling_primary_profile_spacing_m, "BOTH"),
    infoRow("ceiling_secondary_profile_run_control", "Геометрия каркаса", "Расчетная длина поперечных профилей", "area_m2 ÷ secondary_profile_spacing_m", ["area_m2", "ceiling_secondary_profile_spacing_m"], "m", (values) => values.area_m2 / values.ceiling_secondary_profile_spacing_m, "BOTH"),
    infoRow("ceiling_hanger_count_control", "Геометрия каркаса", "Расчетное количество подвесов", "ceil(area_m2 ÷ (primary_spacing × hanger_spacing))", ["area_m2", "ceiling_primary_profile_spacing_m", "ceiling_hanger_spacing_m"], "item", (values) => Math.ceil(values.area_m2 / (values.ceiling_primary_profile_spacing_m * values.ceiling_hanger_spacing_m)), "BOTH"),
    infoRow("ceiling_perimeter_anchor_count_control", "Геометрия каркаса", "Расчетное количество анкеров периметра", "ceil(perimeter_m ÷ perimeter_anchor_spacing_m)", ["perimeter_m", "ceiling_perimeter_anchor_spacing_m"], "item", (values) => Math.ceil(values.perimeter_m / values.ceiling_perimeter_anchor_spacing_m), "BOTH"),
  ];
}

function curveGeometryParameters(operation: DrywallArchitecturalElementOperationV4): ParameterSpec[] {
  const common = [
    numberParameter("curve_element_count", "Количество криволинейных элементов", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1),
    numberParameter("curve_radius_m", "Проектный радиус элемента", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05),
    numberParameter("curve_angle_deg", "Центральный угол одного элемента", "degree", "PROJECT_QUANTITY", BOTH_SCOPES, 0.1, 360),
    numberParameter("curve_element_width_m", "Ширина криволинейного элемента", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
    numberParameter("curve_drop_height_m", "Высота опуска криволинейного элемента", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
  ];
  if (operation !== "FRAME") return common;
  return [
    ...common,
    numberParameter("curve_track_line_count", "Количество линий направляющего профиля", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 1),
    numberParameter("curve_stud_spacing_m", "Проектный шаг вертикальных профилей", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05),
    numberParameter("curve_cross_member_spacing_m", "Проектный шаг перемычек", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05),
    numberParameter("curve_hanger_spacing_m", "Проектный шаг подвесов", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05),
    numberParameter("curve_track_anchor_spacing_m", "Проектный шаг анкеров направляющих", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.05),
    numberParameter("curve_hanger_rod_length_m", "Длина тяги одного подвеса", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
    numberParameter("curve_access_hatch_count", "Количество ревизионных люков", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
    numberParameter("curve_mep_intersection_count", "Количество пересечений с инженерными сетями", "item", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
    numberParameter("curve_hatch_reinforcement_per_hatch_m", "Длина усиления одного ревизионного люка", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
    numberParameter("curve_mep_reinforcement_per_intersection_m", "Длина усиления одного MEP-пересечения", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
    numberParameter("curve_reinforcement_connectors_per_opening", "Соединители усиления на один люк или MEP-пересечение", "item", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 0),
    numberParameter("curve_screws_per_connection", "Винты металл-металл на одно соединение", "item", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 1),
    numberParameter("curve_flexible_track_waste_fraction", "Доля запаса гибкого или сегментированного направляющего профиля", "ratio", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 0, 1),
    numberParameter("curve_profile_waste_fraction", "Доля технологического запаса профиля", "ratio", "MATERIAL_PASSPORT_VALUE", BOTH_SCOPES, 0, 1),
  ];
}

const curveArcLength = (v: Readonly<Record<string, number>>): number =>
  v.curve_element_count * v.curve_radius_m * v.curve_angle_deg * Math.PI / 180;
const curveSingleArcLength = (v: Readonly<Record<string, number>>): number =>
  v.curve_radius_m * v.curve_angle_deg * Math.PI / 180;
const curveStudCount = (v: Readonly<Record<string, number>>): number =>
  v.curve_element_count * (Math.ceil(curveSingleArcLength(v) / v.curve_stud_spacing_m) + 1);
const curveCrossMemberCount = (v: Readonly<Record<string, number>>): number =>
  Math.ceil(curveArcLength(v) / v.curve_cross_member_spacing_m) + v.curve_element_count;
const curveHangerCount = (v: Readonly<Record<string, number>>): number =>
  v.curve_element_count * (Math.ceil(curveSingleArcLength(v) / v.curve_hanger_spacing_m) + 1);
const curveTrackAnchorCount = (v: Readonly<Record<string, number>>): number =>
  Math.ceil(curveArcLength(v) * v.curve_track_line_count / v.curve_track_anchor_spacing_m) + v.curve_element_count;
const curveConnectionCount = (v: Readonly<Record<string, number>>): number =>
  curveStudCount(v) + curveCrossMemberCount(v) * 2 + curveHangerCount(v) * 2 + curveTrackAnchorCount(v);

function curveGeometryRows(operation: DrywallArchitecturalElementOperationV4): RowSpec[] {
  const rows: RowSpec[] = [
    infoRow("curve_arc_length_control", "Геометрия", "Общая длина по оси криволинейных элементов", "element_count × radius_m × angle_deg × PI / 180", ["curve_element_count", "curve_radius_m", "curve_angle_deg"], "m", curveArcLength, "BOTH"),
    infoRow("curve_developed_area_control", "Геометрия", "Развернутая площадь плана и вертикальной грани опуска", "arc_length × (element_width_m + drop_height_m)", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_element_width_m", "curve_drop_height_m"], "m2", (v) => curveArcLength(v) * (v.curve_element_width_m + v.curve_drop_height_m), "BOTH"),
  ];
  if (operation !== "FRAME") return rows;
  return [
    ...rows,
    infoRow("curve_frame_stud_count_control", "Геометрия каркаса", "Расчетное количество вертикальных профилей", "element_count × (ceil(single_arc / stud_spacing) + 1)", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_stud_spacing_m"], "item", curveStudCount, "BOTH"),
    infoRow("curve_frame_cross_member_count_control", "Геометрия каркаса", "Расчетное количество перемычек", "ceil(total_arc / cross_member_spacing) + element_count", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_cross_member_spacing_m"], "item", curveCrossMemberCount, "BOTH"),
    infoRow("curve_frame_hanger_count_control", "Геометрия каркаса", "Расчетное количество подвесов", "element_count × (ceil(single_arc / hanger_spacing) + 1)", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_hanger_spacing_m"], "item", curveHangerCount, "BOTH"),
    infoRow("curve_frame_anchor_count_control", "Геометрия каркаса", "Расчетное количество анкеров направляющих", "ceil(total_arc × track_lines / anchor_spacing) + element_count", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_track_line_count", "curve_track_anchor_spacing_m"], "item", curveTrackAnchorCount, "BOTH"),
    infoRow("curve_frame_connection_count_control", "Геометрия каркаса", "Расчетное количество контролируемых соединений", "studs + 2 × cross_members + 2 × hangers + anchors", ["curve_element_count", "curve_radius_m", "curve_angle_deg", "curve_stud_spacing_m", "curve_cross_member_spacing_m", "curve_hanger_spacing_m", "curve_track_line_count", "curve_track_anchor_spacing_m"], "item", curveConnectionCount, "BOTH"),
  ];
}

function frameGeometryDerivedRow(candidate: DrywallMaximumScopeLineV5): RowSpec | null {
  const arcInputs = ["curve_element_count", "curve_radius_m", "curve_angle_deg"] as const;
  const studInputs = [...arcInputs, "curve_stud_spacing_m"] as const;
  const crossInputs = [...arcInputs, "curve_cross_member_spacing_m"] as const;
  const hangerInputs = [...arcInputs, "curve_hanger_spacing_m"] as const;
  const anchorInputs = [...arcInputs, "curve_track_line_count", "curve_track_anchor_spacing_m"] as const;
  const make = (expression: string, inputs: readonly string[], calculate: RowSpec["calculate"]): RowSpec => pricedRow(candidate.key, candidate.section, candidate.category, candidate.title_ru, expression, inputs, candidate.unit_id, calculate, { procurement: candidate.procurement_eligible, resource_class: candidate.resource_class });
  switch (candidate.key) {
    case "frame_flexible_track": return make("arc_length × track_lines × (1 + flexible_track_waste_fraction)", [...arcInputs, "curve_track_line_count", "curve_flexible_track_waste_fraction"], (v) => curveArcLength(v) * v.curve_track_line_count * (1 + v.curve_flexible_track_waste_fraction));
    case "frame_vertical_profiles": return make("stud_count × drop_height × (1 + profile_waste_fraction)", [...studInputs, "curve_drop_height_m", "curve_profile_waste_fraction"], (v) => curveStudCount(v) * v.curve_drop_height_m * (1 + v.curve_profile_waste_fraction));
    case "frame_cross_profiles": return make("cross_member_count × element_width × (1 + profile_waste_fraction)", [...crossInputs, "curve_element_width_m", "curve_profile_waste_fraction"], (v) => curveCrossMemberCount(v) * v.curve_element_width_m * (1 + v.curve_profile_waste_fraction));
    case "frame_adjustable_hangers": return make("hanger_count", hangerInputs, curveHangerCount);
    case "frame_hanger_rods": return make("hanger_count × rod_length", [...hangerInputs, "curve_hanger_rod_length_m"], (v) => curveHangerCount(v) * v.curve_hanger_rod_length_m);
    case "frame_track_anchors": return make("track_anchor_count", anchorInputs, curveTrackAnchorCount);
    case "frame_hanger_anchors": return make("hanger_count + batch_control_anchor", hangerInputs, (v) => curveHangerCount(v) + 1);
    case "frame_metal_screws": return make("connection_count × screws_per_connection", [...studInputs, "curve_cross_member_spacing_m", "curve_hanger_spacing_m", "curve_track_line_count", "curve_track_anchor_spacing_m", "curve_screws_per_connection"], (v) => curveConnectionCount(v) * v.curve_screws_per_connection);
    case "frame_acoustic_tape": return make("arc_length × track_lines × (1 + profile_waste_fraction)", [...arcInputs, "curve_track_line_count", "curve_profile_waste_fraction"], (v) => curveArcLength(v) * v.curve_track_line_count * (1 + v.curve_profile_waste_fraction));
    case "frame_hatch_reinforcement": return make("hatch_count × reinforcement_per_hatch", ["curve_access_hatch_count", "curve_hatch_reinforcement_per_hatch_m"], (v) => v.curve_access_hatch_count * v.curve_hatch_reinforcement_per_hatch_m);
    case "frame_mep_reinforcement": return make("mep_count × reinforcement_per_intersection", ["curve_mep_intersection_count", "curve_mep_reinforcement_per_intersection_m"], (v) => v.curve_mep_intersection_count * v.curve_mep_reinforcement_per_intersection_m);
    case "frame_reinforcement_connectors": return make("(hatch_count + mep_count) × connectors_per_opening", ["curve_access_hatch_count", "curve_mep_intersection_count", "curve_reinforcement_connectors_per_opening"], (v) => (v.curve_access_hatch_count + v.curve_mep_intersection_count) * v.curve_reinforcement_connectors_per_opening);
    case "frame_anchor_point_layout":
    case "frame_anchor_drilling":
    case "frame_anchor_installation": return make("track_anchor_count + hanger_count", [...anchorInputs, "curve_hanger_spacing_m"], (v) => curveTrackAnchorCount(v) + curveHangerCount(v));
    case "frame_track_installation": return make("arc_length × track_lines", [...arcInputs, "curve_track_line_count"], (v) => curveArcLength(v) * v.curve_track_line_count);
    case "frame_hanger_installation": return make("hanger_count", hangerInputs, curveHangerCount);
    case "frame_vertical_profile_installation": return make("stud_count", studInputs, curveStudCount);
    case "frame_cross_member_installation": return make("cross_member_count", crossInputs, curveCrossMemberCount);
    case "frame_hatch_reinforcement_installation": return make("hatch_count × reinforcement_per_hatch", ["curve_access_hatch_count", "curve_hatch_reinforcement_per_hatch_m"], (v) => v.curve_access_hatch_count * v.curve_hatch_reinforcement_per_hatch_m);
    case "frame_mep_reinforcement_installation": return make("mep_count × reinforcement_per_intersection", ["curve_mep_intersection_count", "curve_mep_reinforcement_per_intersection_m"], (v) => v.curve_mep_intersection_count * v.curve_mep_reinforcement_per_intersection_m);
    case "frame_connection_torque_control": return make("connection_count", [...studInputs, "curve_cross_member_spacing_m", "curve_hanger_spacing_m", "curve_track_line_count", "curve_track_anchor_spacing_m"], curveConnectionCount);
    default: return null;
  }
}

function maximumScopeRows(
  operation: DrywallArchitecturalElementOperationV4,
  variant: DrywallArchitecturalElementVariantV4,
  system: DrywallArchitecturalElementWorkContractV4["system"],
): RowSpec[] {
  const candidates = system === "CEILING"
    ? drywallFlatCeilingMaximumScopeLinesV6(operation as DrywallFlatCeilingOperationV6, variant as DrywallFlatCeilingVariantV6)
    : drywallMaximumScopeLinesV5(operation, variant);
  return candidates.map((candidate) => {
    const derived = operation === "FRAME" && system === "CURVE" ? frameGeometryDerivedRow(candidate) : null;
    return derived ?? pricedRow(
      candidate.key,
      candidate.section,
      candidate.category,
      candidate.title_ru,
      candidate.quantity_parameter_id,
      [candidate.quantity_parameter_id],
      candidate.unit_id,
      (values) => values[candidate.quantity_parameter_id],
      { procurement: candidate.procurement_eligible, resource_class: candidate.resource_class },
    );
  });
}

function commonParameters(): ParameterSpec[] {
  return [
    parameter("work_included", "Работа включена в проектную смету", "boolean", "SCOPE_TRIGGER", BOTH_SCOPES, null, { choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }] }),
    parameter("estimate_scope_mode", "Состав профессиональной сметы", "choice", "DEPENDENCY_REFERENCE", BOTH_SCOPES, null, { choices: [{ value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явный состав" }, { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый состав" }] }),
    parameter("funding_source", "Источник финансирования", "choice", "DEPENDENCY_REFERENCE", BOTH_SCOPES, null, { choices: [{ value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" }, { value: "STATE_BUDGET", label_ru: "Государственный бюджет" }, { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" }] }),
    parameter("project_type", "Тип объекта по проекту", "text", "DEPENDENCY_REFERENCE"),
    parameter("product_profile_id", "Идентификатор выбранной комплектной системы", "text", "MATERIAL_PASSPORT_VALUE"),
    parameter("material_certificate_reference", "Номер и срок действия сертификата конкретной партии", "text", "MATERIAL_PASSPORT_VALUE"),
    parameter("system_passport_reference", "Паспорт и техническая карта совместимой системы", "text", "MATERIAL_PASSPORT_VALUE"),
    parameter("normative_rate_code", "Точная применимая расценка КРЕР/КРЕРр", "text", "DEPENDENCY_REFERENCE"),
    parameter("price_basis_reference", "Прайс-лист, котировка или pricebook", "text", "PRICE_SOURCE_REFERENCE"),
    parameter("price_basis_date", "Дата ценового источника YYYY-MM-DD", "text", "PRICE_SOURCE_REFERENCE"),
    numberParameter("area_m2", "Проектная площадь самостоятельной операции", "m2", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
    numberParameter("length_m", "Проектная длина участка", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
    numberParameter("width_m", "Проектная ширина участка", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.01),
    numberParameter("perimeter_m", "Периметр, торцы и примыкания", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
    numberParameter("working_height_m", "Высота производства работ", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0.1, 100),
    numberParameter("delivery_mass_kg", "Масса поставляемых ресурсов по закупочной ведомости", "kg", "PROJECT_QUANTITY", FULL_SCOPE),
    numberParameter("delivery_distance_km", "Плечо поставки", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numberParameter("waste_rate_kg_m2", "Расчетный выход отходов операции", "kg_per_m2", "NORM_RATE", FULL_SCOPE),
    numberParameter("waste_container_capacity_kg_item", "Вместимость отдельной тары для отходов", "kg_per_item", "MATERIAL_PASSPORT_VALUE", FULL_SCOPE),
    numberParameter("waste_haul_distance_km", "Плечо вывоза до подтвержденного получателя", "km", "LOGISTICS_VALUE", FULL_SCOPE, 0.1, 5_000),
    numberParameter("condition_survey_productivity_m2_per_man_hour", "Производительность входного обследования", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("protection_area_m2", "Площадь защиты смежных конструкций", "m2", "PROJECT_QUANTITY", FULL_SCOPE),
    numberParameter("protection_productivity_m2_per_man_hour", "Производительность устройства и снятия защиты", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("dust_consumable_kg_m2", "Расход материалов локального пылеулавливания", "kg_per_m2", "MATERIAL_PASSPORT_VALUE", FULL_SCOPE),
    numberParameter("access_productivity_m2_per_machine_hour", "Производительность средств подмащивания", "m2_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("access_setup_productivity_service_per_man_hour", "Производительность установки средств подмащивания", "service_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("work_zone_service_count", "Количество организаций безопасной рабочей зоны", "service", "PROJECT_QUANTITY", FULL_SCOPE, 1),
    numberParameter("temporary_lighting_machine_hours", "Машино-часы временного освещения", "machine_hour", "PROJECT_QUANTITY", FULL_SCOPE),
    numberParameter("mass_handling_productivity_kg_per_man_hour", "Производительность погрузки, разгрузки и перемещения", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("vertical_lift_productivity_kg_per_machine_hour", "Производительность механизированного подъема", "kg_per_machine_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("waste_handling_productivity_kg_per_man_hour", "Производительность сбора, сортировки и погрузки отходов", "kg_per_man_hour", "NORM_RATE", FULL_SCOPE),
    numberParameter("cleaning_productivity_m2_per_man_hour", "Производительность финишной очистки", "m2_per_man_hour", "NORM_RATE", FULL_SCOPE),
    ...["system_review_service_count", "shop_drawing_service_count", "coordination_service_count"].map((id) => numberParameter(id, `Количество услуг: ${id}`, "service", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1)),
    numberParameter("incoming_batch_count", "Количество партий входного контроля", "test", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1),
    ...["certificate_document_count", "hidden_work_document_count", "quality_document_count", "executive_scheme_document_count", "handover_document_count", "procurement_document_count"].map((id) => numberParameter(id, `Количество документов: ${id}`, "document", "CONTROL_PLAN_VALUE", FULL_SCOPE, 1)),
  ];
}

function operationParameters(operation: DrywallArchitecturalElementOperationV4): ParameterSpec[] {
  const p = (id: string, label: string, unit: string, role: ParameterSpec["role"] = "MATERIAL_PASSPORT_VALUE", min = 0.000001) => numberParameter(id, label, unit, role, BOTH_SCOPES, min);
  switch (operation) {
    case "FRAME": return [p("profile_rate_kg_m2", "Масса профилей по проектной раскладке", "kg_per_m2"), p("fastener_rate_item_m2", "Расход анкеров и соединителей", "item_per_m2"), p("frame_productivity_m2_per_man_hour", "Производительность сборки криволинейного каркаса", "m2_per_man_hour", "NORM_RATE"), p("frame_tool_productivity_m2_per_machine_hour", "Производительность инструмента каркаса", "m2_per_machine_hour", "NORM_RATE"), p("geometry_test_count", "Количество контрольных съемок геометрии", "test", "CONTROL_PLAN_VALUE", 1)];
    case "ALIGN": return [p("adjustment_fastener_rate_item_m2", "Расход регулировочных креплений", "item_per_m2"), p("packer_rate_kg_m2", "Расход системных прокладок", "kg_per_m2"), p("alignment_productivity_m2_per_man_hour", "Производительность выверки", "m2_per_man_hour", "NORM_RATE"), p("alignment_tool_productivity_m2_per_machine_hour", "Производительность измерительного инструмента", "m2_per_machine_hour", "NORM_RATE"), p("geometry_test_count", "Количество контрольных съемок плоскости", "test", "CONTROL_PLAN_VALUE", 1)];
    case "CLAD": return [p("board_layer_count", "Число проектных слоев листов", "item", "PROJECT_QUANTITY", 1), p("board_waste_fraction", "Коэффициент технологического раскроя", "fraction", "MATERIAL_PASSPORT_VALUE", 0), p("screw_rate_item_m2_layer", "Расход винтов на слой", "item_per_m2_layer"), p("cladding_productivity_m2_per_man_hour", "Производительность раскроя и крепления", "m2_per_man_hour", "NORM_RATE"), p("cladding_tool_productivity_m2_per_machine_hour", "Производительность инструмента облицовки", "m2_per_machine_hour", "NORM_RATE"), p("fixing_test_count", "Количество контрольных участков крепления", "test", "CONTROL_PLAN_VALUE", 1)];
    case "FINISH_JOINT": return [p("joint_length_m", "Длина швов листовой системы", "m", "PROJECT_QUANTITY"), p("joint_filler_rate_kg_m", "Расход шпаклевки на шов", "kg_per_m"), p("reinforcement_tape_rate_m_m", "Расход армирующей ленты", "m_per_m"), p("corner_bead_rate_m_m", "Расход профиля углов", "m_per_m"), p("joint_productivity_m_per_man_hour", "Производительность заделки швов", "m_per_man_hour", "NORM_RATE"), p("mixer_productivity_kg_per_machine_hour", "Производительность миксера", "kg_per_machine_hour", "NORM_RATE"), p("joint_test_count", "Количество контрольных участков швов", "test", "CONTROL_PLAN_VALUE", 1)];
    case "INSULATE": return [p("insulation_layer_count", "Число слоев изоляции", "item", "PROJECT_QUANTITY", 1), p("insulation_waste_fraction", "Коэффициент раскроя изоляции", "fraction", "MATERIAL_PASSPORT_VALUE", 0), p("retainer_rate_item_m2", "Расход фиксаторов изоляции", "item_per_m2"), p("insulation_productivity_m2_per_man_hour", "Производительность установки изоляции", "m2_per_man_hour", "NORM_RATE"), p("insulation_tool_productivity_m2_per_machine_hour", "Производительность режущего/пылеудаляющего инструмента", "m2_per_machine_hour", "NORM_RATE"), p("coverage_test_count", "Количество проверок сплошности изоляции", "test", "CONTROL_PLAN_VALUE", 1)];
    case "PREPARE": return [p("primer_rate_kg_m2", "Расход совместимой грунтовки", "kg_per_m2"), p("skim_filler_rate_kg_m2", "Расход доводочного состава", "kg_per_m2"), p("abrasive_rate_item_m2", "Расход абразивов", "item_per_m2"), p("preparation_productivity_m2_per_man_hour", "Производительность подготовки поверхности", "m2_per_man_hour", "NORM_RATE"), p("preparation_tool_productivity_m2_per_machine_hour", "Производительность шлифовального/пылеудаляющего инструмента", "m2_per_machine_hour", "NORM_RATE"), p("surface_test_count", "Количество измерений готовности поверхности", "test", "CONTROL_PLAN_VALUE", 1)];
    case "REPAIR": return [p("defect_area_m2", "Подтвержденная дефектной ведомостью площадь", "m2", "PROJECT_QUANTITY"), p("replacement_board_rate_m2_m2", "Расход листа на ремонтную площадь", "m2_per_m2"), p("patch_profile_rate_kg_m2", "Расход профиля усиления ремонтных карт", "kg_per_m2"), p("repair_fastener_rate_item_m2", "Расход крепежа ремонтных карт", "item_per_m2"), p("repair_filler_rate_kg_m2", "Расход ремонтного состава", "kg_per_m2"), p("repair_productivity_m2_per_man_hour", "Производительность демонтажа и восстановления", "m2_per_man_hour", "NORM_RATE"), p("repair_tool_productivity_m2_per_machine_hour", "Производительность ремонтного инструмента", "m2_per_machine_hour", "NORM_RATE"), p("repair_test_count", "Количество приемочных ремонтных карт", "test", "CONTROL_PLAN_VALUE", 1)];
  }
}

function variantParameters(variant: DrywallArchitecturalElementVariantV4): ParameterSpec[] {
  switch (variant) {
    case "large_area": return [numberParameter("control_zone_count", "Количество технологических захваток большой площади", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1)];
    case "small_area": return [numberParameter("small_area_setup_service_count", "Количество отдельных мобилизаций на малой площади", "service", "PROJECT_QUANTITY", BOTH_SCOPES, 1)];
    case "technical_room": return [numberParameter("technical_interface_service_count", "Количество согласований проходок и инженерных интерфейсов", "service", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1)];
    case "wet_zone": return [
      numberParameter("moisture_interface_length_m", "Длина влагозащищаемых примыканий", "m", "PROJECT_QUANTITY", BOTH_SCOPES, 0),
      numberParameter("moisture_sealant_rate_kg_m", "Расход совместимого герметика примыканий", "kg_per_m", "MATERIAL_PASSPORT_VALUE"),
      numberParameter("moisture_interface_test_count", "Количество проверок влагозащищенных примыканий", "test", "CONTROL_PLAN_VALUE", BOTH_SCOPES, 1),
    ];
    case "high_load": return [];
    case "standard": return [];
  }
}

function operationRows(operation: DrywallArchitecturalElementOperationV4): RowSpec[] {
  const area = (key: string, section: string, category: RowSpec["category"], title: string, rate: string, unit: string, resourceClass: string = category) => pricedRow(key, section, category, title, `area_m2 × ${rate}`, ["area_m2", rate], unit, (v) => v.area_m2 * v[rate], { resource_class: resourceClass });
  switch (operation) {
    case "FRAME": return [
      area("profiles", "Каркас", "material", "Профили проектной кривизны по раскладке", "profile_rate_kg_m2", "kg", "system profiles"),
      area("frame_fasteners", "Каркас", "material", "Анкеры, соединители и крепеж каркаса", "fastener_rate_item_m2", "item", "frame fasteners"),
      pricedRow("frame_labor", "Каркас", "labor", "Разметка, раскрой и сборка каркаса", "area_m2 ÷ frame_productivity_m2_per_man_hour", ["area_m2", "frame_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.frame_productivity_m2_per_man_hour),
      pricedRow("frame_tools", "Каркас", "equipment", "Инструмент монтажа и измерения каркаса", "area_m2 ÷ frame_tool_productivity_m2_per_machine_hour", ["area_m2", "frame_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.frame_tool_productivity_m2_per_machine_hour),
      pricedRow("frame_geometry_control", "Контроль качества", "testing", "Контроль геометрии и жесткости каркаса", "geometry_test_count", ["geometry_test_count"], "test", (v) => v.geometry_test_count),
    ];
    case "ALIGN": return [
      area("adjustment_fasteners", "Выверка", "material", "Регулировочные крепления принятого каркаса", "adjustment_fastener_rate_item_m2", "item"),
      area("system_packers", "Выверка", "material", "Системные прокладки выверки", "packer_rate_kg_m2", "kg"),
      pricedRow("alignment_labor", "Выверка", "labor", "Независимо обоснованная выверка принятого каркаса", "area_m2 ÷ alignment_productivity_m2_per_man_hour", ["area_m2", "alignment_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.alignment_productivity_m2_per_man_hour),
      pricedRow("alignment_tools", "Выверка", "equipment", "Лазерный и ручной измерительный инструмент", "area_m2 ÷ alignment_tool_productivity_m2_per_machine_hour", ["area_m2", "alignment_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.alignment_tool_productivity_m2_per_machine_hour),
      pricedRow("alignment_control", "Контроль качества", "testing", "Приемочная съемка плоскости/кривизны", "geometry_test_count", ["geometry_test_count"], "test", (v) => v.geometry_test_count),
    ];
    case "CLAD": return [
      pricedRow("boards", "Обшивка", "material", "Листы выбранной системы с учетом слоев и раскроя", "area_m2 × board_layer_count × (1 + board_waste_fraction)", ["area_m2", "board_layer_count", "board_waste_fraction"], "m2", (v) => v.area_m2 * v.board_layer_count * (1 + v.board_waste_fraction), { resource_class: "certified gypsum board" }),
      pricedRow("board_screws", "Обшивка", "material", "Системные винты крепления листов", "area_m2 × board_layer_count × screw_rate_item_m2_layer", ["area_m2", "board_layer_count", "screw_rate_item_m2_layer"], "item", (v) => v.area_m2 * v.board_layer_count * v.screw_rate_item_m2_layer),
      pricedRow("cladding_labor", "Обшивка", "labor", "Раскрой, обработка кромок и крепление листов", "area_m2 × board_layer_count ÷ cladding_productivity_m2_per_man_hour", ["area_m2", "board_layer_count", "cladding_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 * v.board_layer_count / v.cladding_productivity_m2_per_man_hour),
      pricedRow("cladding_tools", "Обшивка", "equipment", "Инструмент раскроя и крепления листов", "area_m2 × board_layer_count ÷ cladding_tool_productivity_m2_per_machine_hour", ["area_m2", "board_layer_count", "cladding_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 * v.board_layer_count / v.cladding_tool_productivity_m2_per_machine_hour),
      pricedRow("fixing_control", "Контроль качества", "testing", "Контроль шага крепежа, стыков и кромок", "fixing_test_count", ["fixing_test_count"], "test", (v) => v.fixing_test_count),
    ];
    case "FINISH_JOINT": return [
      pricedRow("joint_filler", "Заделка швов", "material", "Системная шпаклевка швов", "joint_length_m × joint_filler_rate_kg_m", ["joint_length_m", "joint_filler_rate_kg_m"], "kg", (v) => v.joint_length_m * v.joint_filler_rate_kg_m),
      pricedRow("joint_tape", "Заделка швов", "material", "Армирующая лента швов", "joint_length_m × reinforcement_tape_rate_m_m", ["joint_length_m", "reinforcement_tape_rate_m_m"], "m", (v) => v.joint_length_m * v.reinforcement_tape_rate_m_m),
      pricedRow("corner_bead", "Заделка швов", "material", "Системный профиль углов и переходов", "perimeter_m × corner_bead_rate_m_m", ["perimeter_m", "corner_bead_rate_m_m"], "m", (v) => v.perimeter_m * v.corner_bead_rate_m_m),
      pricedRow("joint_labor", "Заделка швов", "labor", "Подготовка и послойная заделка швов и углов", "joint_length_m ÷ joint_productivity_m_per_man_hour", ["joint_length_m", "joint_productivity_m_per_man_hour"], "man_hour", (v) => v.joint_length_m / v.joint_productivity_m_per_man_hour),
      pricedRow("joint_mixer", "Заделка швов", "equipment", "Миксер для совместимого шпаклевочного состава", "joint_length_m × joint_filler_rate_kg_m ÷ mixer_productivity_kg_per_machine_hour", ["joint_length_m", "joint_filler_rate_kg_m", "mixer_productivity_kg_per_machine_hour"], "machine_hour", (v) => v.joint_length_m * v.joint_filler_rate_kg_m / v.mixer_productivity_kg_per_machine_hour),
      pricedRow("joint_control", "Контроль качества", "testing", "Контроль швов, углов и готовности слоя", "joint_test_count", ["joint_test_count"], "test", (v) => v.joint_test_count),
    ];
    case "INSULATE": return [
      pricedRow("insulation", "Изоляция", "material", "Изоляционные плиты выбранной системы", "area_m2 × insulation_layer_count × (1 + insulation_waste_fraction)", ["area_m2", "insulation_layer_count", "insulation_waste_fraction"], "m2", (v) => v.area_m2 * v.insulation_layer_count * (1 + v.insulation_waste_fraction)),
      area("insulation_retainers", "Изоляция", "material", "Фиксаторы от сползания и провисания изоляции", "retainer_rate_item_m2", "item"),
      pricedRow("insulation_labor", "Изоляция", "labor", "Раскрой и установка изоляции без пустот", "area_m2 × insulation_layer_count ÷ insulation_productivity_m2_per_man_hour", ["area_m2", "insulation_layer_count", "insulation_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 * v.insulation_layer_count / v.insulation_productivity_m2_per_man_hour),
      pricedRow("insulation_tools", "Изоляция", "equipment", "Режущий инструмент и локальное пылеудаление", "area_m2 × insulation_layer_count ÷ insulation_tool_productivity_m2_per_machine_hour", ["area_m2", "insulation_layer_count", "insulation_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 * v.insulation_layer_count / v.insulation_tool_productivity_m2_per_machine_hour),
      pricedRow("insulation_control", "Контроль качества", "testing", "Контроль сплошности до закрытия обшивкой", "coverage_test_count", ["coverage_test_count"], "test", (v) => v.coverage_test_count),
    ];
    case "PREPARE": return [
      area("primer", "Подготовка поверхности", "material", "Совместимая грунтовка", "primer_rate_kg_m2", "kg"),
      area("skim_filler", "Подготовка поверхности", "material", "Доводочный состав до проектного качества", "skim_filler_rate_kg_m2", "kg"),
      area("abrasives", "Подготовка поверхности", "material", "Абразивы с локальным пылеудалением", "abrasive_rate_item_m2", "item"),
      pricedRow("preparation_labor", "Подготовка поверхности", "labor", "Грунтование, доводка и шлифование поверхности", "area_m2 ÷ preparation_productivity_m2_per_man_hour", ["area_m2", "preparation_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.preparation_productivity_m2_per_man_hour),
      pricedRow("preparation_tools", "Подготовка поверхности", "equipment", "Миксер, шлифовальный инструмент и пылеудаление", "area_m2 ÷ preparation_tool_productivity_m2_per_machine_hour", ["area_m2", "preparation_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.preparation_tool_productivity_m2_per_machine_hour),
      pricedRow("surface_control", "Контроль качества", "testing", "Контроль плоскости и готовности под проектное покрытие", "surface_test_count", ["surface_test_count"], "test", (v) => v.surface_test_count),
    ];
    case "REPAIR": return [
      pricedRow("replacement_board", "Ремонт", "material", "Листы для подтвержденных ремонтных карт", "defect_area_m2 × replacement_board_rate_m2_m2", ["defect_area_m2", "replacement_board_rate_m2_m2"], "m2", (v) => v.defect_area_m2 * v.replacement_board_rate_m2_m2),
      pricedRow("patch_profiles", "Ремонт", "material", "Профиль усиления кромок ремонтных карт", "defect_area_m2 × patch_profile_rate_kg_m2", ["defect_area_m2", "patch_profile_rate_kg_m2"], "kg", (v) => v.defect_area_m2 * v.patch_profile_rate_kg_m2),
      pricedRow("repair_fasteners", "Ремонт", "material", "Системный крепеж ремонтных карт", "defect_area_m2 × repair_fastener_rate_item_m2", ["defect_area_m2", "repair_fastener_rate_item_m2"], "item", (v) => v.defect_area_m2 * v.repair_fastener_rate_item_m2),
      pricedRow("repair_filler", "Ремонт", "material", "Совместимый ремонтный и шовный состав", "defect_area_m2 × repair_filler_rate_kg_m2", ["defect_area_m2", "repair_filler_rate_kg_m2"], "kg", (v) => v.defect_area_m2 * v.repair_filler_rate_kg_m2),
      pricedRow("repair_labor", "Ремонт", "labor", "Локальный демонтаж, подготовка и восстановление карт", "defect_area_m2 ÷ repair_productivity_m2_per_man_hour", ["defect_area_m2", "repair_productivity_m2_per_man_hour"], "man_hour", (v) => v.defect_area_m2 / v.repair_productivity_m2_per_man_hour),
      pricedRow("repair_tools", "Ремонт", "equipment", "Инструмент локального демонтажа и восстановления", "defect_area_m2 ÷ repair_tool_productivity_m2_per_machine_hour", ["defect_area_m2", "repair_tool_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.defect_area_m2 / v.repair_tool_productivity_m2_per_machine_hour),
      pricedRow("repair_control", "Контроль качества", "testing", "Приемка каждой ремонтной карты", "repair_test_count", ["repair_test_count"], "test", (v) => v.repair_test_count),
    ];
  }
}

function completionRows(operation: DrywallArchitecturalElementOperationV4): RowSpec[] {
  const prefix = operation.toLowerCase();
  const waste = (v: Readonly<Record<string, number>>) => v.area_m2 * v.waste_rate_kg_m2;
  return [
    infoRow(`${prefix}_area_control`, "Геометрия", "Контрольный объем самостоятельной операции", "area_m2", ["area_m2"], "m2", (v) => v.area_m2, "FULL"),
    pricedRow(`${prefix}_survey`, "Подготовка", "labor", "Входное обследование и приемка фронта", "area_m2 ÷ condition_survey_productivity_m2_per_man_hour", ["area_m2", "condition_survey_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.condition_survey_productivity_m2_per_man_hour, { scopes: "FULL" }),
    pricedRow(`${prefix}_protection`, "Защита", "material", "Защитное покрытие смежных конструкций", "protection_area_m2", ["protection_area_m2"], "m2", (v) => v.protection_area_m2, { scopes: "FULL" }),
    pricedRow(`${prefix}_protection_install`, "Защита", "labor", "Устройство защитного покрытия", "protection_area_m2 ÷ protection_productivity_m2_per_man_hour", ["protection_area_m2", "protection_productivity_m2_per_man_hour"], "man_hour", (v) => v.protection_area_m2 / v.protection_productivity_m2_per_man_hour, { scopes: "FULL" }),
    pricedRow(`${prefix}_protection_remove`, "Защита", "labor", "Снятие защитного покрытия", "protection_area_m2 ÷ protection_productivity_m2_per_man_hour", ["protection_area_m2", "protection_productivity_m2_per_man_hour"], "man_hour", (v) => v.protection_area_m2 / v.protection_productivity_m2_per_man_hour, { scopes: "FULL" }),
    pricedRow(`${prefix}_dust`, "Безопасность", "material", "Расходные материалы локального пылеулавливания", "area_m2 × dust_consumable_kg_m2", ["area_m2", "dust_consumable_kg_m2"], "kg", (v) => v.area_m2 * v.dust_consumable_kg_m2, { scopes: "FULL" }),
    pricedRow(`${prefix}_access`, "Средства подмащивания", "equipment", "Передвижные средства подмащивания", "area_m2 ÷ access_productivity_m2_per_machine_hour", ["area_m2", "access_productivity_m2_per_machine_hour"], "machine_hour", (v) => v.area_m2 / v.access_productivity_m2_per_machine_hour, { scopes: "FULL" }),
    pricedRow(`${prefix}_access_setup`, "Средства подмащивания", "labor", "Установка и снятие средств подмащивания", "work_zone_service_count ÷ access_setup_productivity_service_per_man_hour", ["work_zone_service_count", "access_setup_productivity_service_per_man_hour"], "man_hour", (v) => v.work_zone_service_count / v.access_setup_productivity_service_per_man_hour, { scopes: "FULL" }),
    pricedRow(`${prefix}_safe_zone`, "Безопасность", "temporary_work", "Организация и снятие безопасной рабочей зоны", "work_zone_service_count", ["work_zone_service_count"], "service", (v) => v.work_zone_service_count, { scopes: "FULL", procurement: false }),
    pricedRow(`${prefix}_lighting`, "Безопасность", "equipment", "Временное освещение рабочей зоны", "temporary_lighting_machine_hours", ["temporary_lighting_machine_hours"], "machine_hour", (v) => v.temporary_lighting_machine_hours, { scopes: "FULL", procurement: false }),
    pricedRow(`${prefix}_delivery`, "Логистика", "transport", "Транспортная работа поставки", "delivery_mass_kg ÷ 1000 × delivery_distance_km", ["delivery_mass_kg", "delivery_distance_km"], "t_km", (v) => v.delivery_mass_kg / 1000 * v.delivery_distance_km, { scopes: "FULL" }),
    ...["supplier_loading", "site_unloading", "intrasite_handling"].map((key) => pricedRow(`${prefix}_${key}`, "Логистика", "labor", `Трудозатраты: ${key}`, "delivery_mass_kg ÷ mass_handling_productivity_kg_per_man_hour", ["delivery_mass_kg", "mass_handling_productivity_kg_per_man_hour"], "man_hour", (v) => v.delivery_mass_kg / v.mass_handling_productivity_kg_per_man_hour, { scopes: "FULL" })),
    pricedRow(`${prefix}_vertical_lift`, "Логистика", "equipment", "Механизированный подъем ресурсов", "delivery_mass_kg ÷ vertical_lift_productivity_kg_per_machine_hour", ["delivery_mass_kg", "vertical_lift_productivity_kg_per_machine_hour"], "machine_hour", (v) => v.delivery_mass_kg / v.vertical_lift_productivity_kg_per_machine_hour, { scopes: "FULL" }),
    infoRow(`${prefix}_waste_output`, "Отходы", "Материальный баланс отходов", "area_m2 × waste_rate_kg_m2", ["area_m2", "waste_rate_kg_m2"], "kg", waste, "FULL", "waste"),
    pricedRow(`${prefix}_waste_containers`, "Отходы", "material", "Отдельная тара для отходов", "ceil(area_m2 × waste_rate_kg_m2 ÷ waste_container_capacity_kg_item)", ["area_m2", "waste_rate_kg_m2", "waste_container_capacity_kg_item"], "item", (v) => Math.ceil(waste(v) / v.waste_container_capacity_kg_item), { scopes: "FULL" }),
    ...["collection", "sorting", "loading"].map((key) => pricedRow(`${prefix}_waste_${key}`, "Отходы", "labor", `Операция с отходами: ${key}`, "area_m2 × waste_rate_kg_m2 ÷ waste_handling_productivity_kg_per_man_hour", ["area_m2", "waste_rate_kg_m2", "waste_handling_productivity_kg_per_man_hour"], "man_hour", (v) => waste(v) / v.waste_handling_productivity_kg_per_man_hour, { scopes: "FULL" })),
    pricedRow(`${prefix}_waste_haul`, "Отходы", "transport", "Транспортная работа вывоза отходов", "area_m2 × waste_rate_kg_m2 ÷ 1000 × waste_haul_distance_km", ["area_m2", "waste_rate_kg_m2", "waste_haul_distance_km"], "t_km", (v) => waste(v) / 1000 * v.waste_haul_distance_km, { scopes: "FULL", procurement: false }),
    pricedRow(`${prefix}_waste_receiver`, "Отходы", "subcontract_service", "Прием отходов подтвержденным получателем", "area_m2 × waste_rate_kg_m2 ÷ 1000", ["area_m2", "waste_rate_kg_m2"], "t", (v) => waste(v) / 1000, { scopes: "FULL", procurement: false }),
    pricedRow(`${prefix}_cleaning`, "Завершение", "labor", "Финишная очистка рабочей зоны", "area_m2 ÷ cleaning_productivity_m2_per_man_hour", ["area_m2", "cleaning_productivity_m2_per_man_hour"], "man_hour", (v) => v.area_m2 / v.cleaning_productivity_m2_per_man_hour, { scopes: "FULL" }),
    ...[["system_review", "system_review_service_count"], ["shop_drawing", "shop_drawing_service_count"], ["coordination", "coordination_service_count"]].map(([key, input]) => pricedRow(`${prefix}_${key}`, "Инженерные услуги", "subcontract_service", `Инженерная услуга: ${key}`, input, [input], "service", (v) => v[input], { scopes: "FULL", procurement: false })),
    pricedRow(`${prefix}_incoming_control`, "Входной контроль", "testing", "Входной контроль партий материалов", "incoming_batch_count", ["incoming_batch_count"], "test", (v) => v.incoming_batch_count, { scopes: "FULL", procurement: false }),
    ...[["certificate_register", "certificate_document_count"], ["hidden_work_act", "hidden_work_document_count"], ["quality_protocol", "quality_document_count"], ["executive_scheme", "executive_scheme_document_count"], ["handover", "handover_document_count"], ["procurement_package", "procurement_document_count"]].map(([key, input]) => pricedRow(`${prefix}_${key}`, "Исполнительная документация", "documentation", `Документ: ${key}`, input, [input], "document", (v) => v[input], { scopes: "FULL", procurement: false })),
  ];
}

function operationContract(inventory: InteriorFinishesDomainInventoryRow): DrywallArchitecturalElementWorkContractV4 {
  const operation = operationOf(inventory.catalog_id);
  const variant = variantOf(inventory.catalog_id);
  const system = inventory.catalog_id.includes("_bulkhead_")
    ? "BULKHEAD" as const
    : inventory.catalog_id.includes("_drywall_ceiling_")
      ? "CEILING" as const
      : "CURVE" as const;
  const rateSource = operation === "REPAIR" ? KG_KRERR : KG_KRER;
  const dependencies: Readonly<Record<DrywallArchitecturalElementOperationV4, readonly string[]>> = {
    FRAME: [], ALIGN: ["accepted_frame_revision_id"], CLAD: ["accepted_frame_revision_id", "accepted_alignment_revision_id"],
    FINISH_JOINT: ["accepted_cladding_revision_id"], INSULATE: ["accepted_frame_revision_id"],
    PREPARE: ["accepted_joint_finish_revision_id"], REPAIR: ["condition_survey_record_id", "accepted_repair_detail_id"],
  };
  const ceilingDependencies: Readonly<Record<DrywallArchitecturalElementOperationV4, readonly string[]>> = {
    PREPARE: [], FRAME: ["accepted_prepare_revision_id"], ALIGN: ["accepted_frame_revision_id"],
    INSULATE: ["accepted_alignment_revision_id"], CLAD: ["accepted_alignment_revision_id", "accepted_insulation_revision_id"],
    FINISH_JOINT: ["accepted_cladding_revision_id"], REPAIR: ["condition_survey_record_id", "accepted_repair_detail_id"],
  };
  return {
    schema_version: system === "CEILING" ? "DrywallFlatCeilingWorkContractV6" : "DrywallArchitecturalElementWorkContractV4",
    catalog_id: inventory.catalog_id, work_key: inventory.work_key, title_ru: inventory.localized_name_ru,
    system, group: operation, operation, variant, group_key: `${system}:${operation}`,
    normative_source_ids: [KG_SP, rateSource, KG_SAFETY, KG_MATERIAL],
    required_stages: ["PROJECT_SYSTEM_REVIEW", `${operation}_SCOPE_CONFIRMATION`, `${operation}_EXECUTION`, `${operation}_QUALITY_CONTROL`, "LOGISTICS", "WASTE_CLOSEOUT", "DOCUMENTATION"],
    optional_stages: ["HIGH_WORKING_LEVEL_ACCESS", "MEP_INTERFACE_COORDINATION", "FIRE_OR_ACOUSTIC_SYSTEM_CHECK"],
    owned_cost_scope: [`${operation} materials`, `${operation} labor and equipment`, `${operation} quality and closeout`],
    forbidden_cost_scope: ["umbrella INSTALL bundle", "other typed-child costs", "MEP equipment", "final decoration outside PREPARE"],
    non_cost_dependencies: system === "CEILING" ? ceilingDependencies[operation] : dependencies[operation],
    normative_proof_bundle_id: `${system === "CEILING" ? "WorkNormativeProofBundleV6" : "WorkNormativeProofBundleV4"}:${inventory.catalog_id}`,
    professional_proof_bundle_id: `${system === "CEILING" ? "WorkProfessionalProofBundleV6" : "WorkProfessionalProofBundleV4"}:${inventory.catalog_id}`,
  };
}

function trace(contract: DrywallArchitecturalElementWorkContractV4, row: RowSpec): readonly ProfessionalNormativeRowTraceV3[] {
  if (contract.system === "CEILING") {
    const partialRateApplicable = contract.operation === "FRAME" || contract.operation === "CLAD";
    const rateDocument = contract.operation === "REPAIR"
      ? { source_id: KG_KRERR, document_code: "КРЕРр-2015", exact_locator: "Методические указания, п. 3.3: демонтаж по сборнику 46; восстановление — по применимым строительным КРЕР и проектному ресурсному расчету." }
      : partialRateApplicable
        ? { source_id: KG_KRER, document_code: "КРЕР 10-05-011", exact_locator: "Раздел 5, таблица 10-05-011, PDF 97–99, измеритель 100 м²; применяется только к подтвержденной части каркасно-обшивочной системы, не как oracle остальных операций." }
        : { source_id: "KG_PROJECT_RESOURCE_CALCULATION_V6", document_code: "Проектный ресурсный расчет V6", exact_locator: `Индивидуальный FormulaGraphV6 и ResourceGraphV6 операции ${contract.operation}; нормы расхода и цены являются явными editable project inputs.` };
    return [
      { ...rateDocument, edition: contract.operation === "REPAIR" ? "официальные указания 2015" : partialRateApplicable ? "приказ №52-нпа от 28.04.2022" : "BATCH-003 canonical revision", source_role: partialRateApplicable || contract.operation === "REPAIR" ? "QUANTITY_NORM" : "PROJECT_INPUT", applicability: "Источник применяется только в доказанной роли; скрытые нормы расхода и автоматическое распространение расценки на другие owner-операции запрещены.", foreign_mandatory_for_kg: false },
      { source_id: KG_SP, document_code: "СП КР 65-101:2025", edition: "официальное издание 2025", exact_locator: "пп. 4.4–4.9; пп. 7.7.1–7.7.5; таблица 7.8", source_role: row.category === "testing" || row.category === "documentation" ? "QUALITY_ACCEPTANCE" : "WORK_EXECUTION", applicability: "Производство, контроль скрытых работ, журналирование, дефекты и приемка подвесной гипсокартонной системы в КР.", foreign_mandatory_for_kg: false },
      { source_id: KG_SAFETY, document_code: "СН КР 12-01:2018", edition: "официальное издание 2018", exact_locator: "ППР/технологическая карта: рабочая зона, подмащивание, СИЗ, временное питание и пылеудаление", source_role: "WORK_EXECUTION", applicability: "Безопасность фактической рабочей зоны учитывается только явными ресурсными строками и параметрами.", foreign_mandatory_for_kg: false },
      { source_id: KG_MATERIAL, document_code: "Реестр сертификатов строительных материалов КР", edition: "live registry + проектный паспорт", exact_locator: "material_certificate_reference и system_passport_reference конкретной партии", source_role: "PROJECT_INPUT", applicability: "Подтверждает выбранную партию и совместимость комплектной системы; не является универсальной нормой расхода.", foreign_mandatory_for_kg: false },
    ];
  }
  const rateSource = contract.operation === "REPAIR" ? KG_KRERR : KG_KRER;
  return [
    { source_id: rateSource, document_code: contract.operation === "REPAIR" ? "КРЕРр-2015 / п. 3.3" : "КРЕР 10-05-011", edition: contract.operation === "REPAIR" ? "официальные указания 2015" : "приказ №52-нпа от 28.04.2022", exact_locator: contract.operation === "REPAIR" ? "Указания, п. 3.3: демонтаж по сб. 46, новая конструкция по строительным КРЕР; точный код задается проектом" : "Раздел 5, таблица 10-05-011, страницы PDF 97–99; измеритель 100 м²", source_role: row.category === "documentation" || row.category === "testing" ? "QUALITY_ACCEPTANCE" : "QUANTITY_NORM", applicability: "Источник маршрута и состава ресурсов; геометрия, нормы расхода и цены не подставляются скрыто.", foreign_mandatory_for_kg: false },
    { source_id: KG_SP, document_code: "СП КР 65-101:2025", edition: "официальное издание 2025", exact_locator: "пп. 4.4–4.9; пп. 7.7.1–7.7.5; таблица 7.8", source_role: row.category === "testing" || row.category === "documentation" ? "QUALITY_ACCEPTANCE" : "WORK_EXECUTION", applicability: "Производство, скрытые работы, журналы, дефекты и приемка гипсокартонной системы в КР.", foreign_mandatory_for_kg: false },
    { source_id: KG_SAFETY, document_code: "СН КР 12-01:2018", edition: "официальное издание 2018", exact_locator: "ППР/технологическая карта, рабочая зона, подмащивание, СИЗ и пылеудаление", source_role: "WORK_EXECUTION", applicability: "Безопасность труда применяется к организации фактической рабочей зоны; стоимость возникает только из явных строк и входов.", foreign_mandatory_for_kg: false },
    { source_id: KG_MATERIAL, document_code: "Реестр сертификатов строительных материалов КР", edition: "live registry + проектный паспорт", exact_locator: "действующий сертификат конкретной партии, material_certificate_reference; паспорт системы, system_passport_reference", source_role: "PROJECT_INPUT", applicability: "Не универсальная норма расхода: подтверждает выбранную партию и совместимость системы.", foreign_mandatory_for_kg: false },
  ];
}

function buildParts(inventory: InteriorFinishesDomainInventoryRow): DrywallArchitecturalElementProfessionalPackagePartsV4 {
  const contract = operationContract(inventory);
  const flatCeiling = contract.system === "CEILING";
  const baseParameters = [
    ...commonParameters(),
    ...operationParameters(contract.operation),
    ...variantParameters(contract.variant),
    ...maximumScopeParameters(contract.operation, contract.variant, contract.system),
    ...(contract.system === "CURVE" ? curveGeometryParameters(contract.operation) : []),
    ...(flatCeiling ? flatCeilingGeometryParameters(contract.operation) : []),
  ];
  for (const dependency of contract.non_cost_dependencies) baseParameters.push(parameter(dependency, `Подтвержденная non-cost dependency: ${dependency}`, "text", "DEPENDENCY_REFERENCE"));
  const skeletonKeys = new Set(DRYWALL_AGGREGATE_SKELETON_ROW_KEYS_V4[contract.operation]);
  const maximumCandidates = flatCeiling
    ? drywallFlatCeilingMaximumScopeLinesV6(contract.operation, contract.variant)
    : drywallMaximumScopeLinesV5(contract.operation, contract.variant);
  const maximumKeys = new Set(maximumCandidates.map((candidate) => candidate.key));
  const rows = flatCeiling
    ? [...flatCeilingGeometryRows(contract.operation), ...maximumScopeRows(contract.operation, contract.variant, contract.system)]
    : [
      ...(contract.system === "CURVE" ? curveGeometryRows(contract.operation) : []),
      ...operationRows(contract.operation).filter((row) => !skeletonKeys.has(row.key) && !maximumKeys.has(row.key)),
      // V5 owns variant-specific mobilization, interfaces and wet-zone resources as
      // separate candidates; retaining the V4 variant bundle would double-count them.
      ...completionRows(contract.operation).filter((row) => !maximumKeys.has(row.key)),
      ...maximumScopeRows(contract.operation, contract.variant, contract.system),
    ];
  const formulaInputIds = new Set(rows.flatMap((row) => row.inputs));
  const retainedControlIds = new Set([
    "work_included", "estimate_scope_mode", "funding_source", "project_type", "product_profile_id",
    "material_certificate_reference", "system_passport_reference", "normative_rate_code", "area_m2",
    "price_basis_reference", "price_basis_date", "working_height_m", "length_m", "width_m",
    ...contract.non_cost_dependencies,
  ]);
  const usedBaseParameters = baseParameters.filter((item) => formulaInputIds.has(item.parameter_id) || retainedControlIds.has(item.parameter_id));
  const priceParameters = rows.filter((row) => row.ownership !== "informational_output").map((row) => numberParameter(`unit_price_${row.key}_kgs`, `Цена «${row.title}» в KGS за ${row.output_unit}`, `KGS_per_${row.output_unit}`, "PRICE_INPUT", row.scopes === "FULL" ? FULL_SCOPE : BOTH_SCOPES, 0.01, 1_000_000_000_000));
  const parameters = [...usedBaseParameters, ...priceParameters];
  const byId = new Map(parameters.map((item) => [item.parameter_id, item]));
  if (byId.size !== parameters.length) {
    const seen = new Set<string>();
    const duplicates = parameters.map((item) => item.parameter_id).filter((id) => seen.has(id) || (seen.add(id), false));
    throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_PARAMETER_DUPLICATE:${inventory.catalog_id}:${duplicates.join(",")}`);
  }
  const contextIds = ["estimate_scope_mode", "funding_source", "project_type", "product_profile_id", "material_certificate_reference", "system_passport_reference", "normative_rate_code", "working_height_m", ...contract.non_cost_dependencies];
  const consumers = new Map<string, Set<string>>();
  for (const row of rows) for (const id of row.inputs) (consumers.get(id) ?? (consumers.set(id, new Set()), consumers.get(id)!)).add(row.key);
  for (const row of rows.filter((item) => item.ownership !== "informational_output")) {
    consumers.set(`unit_price_${row.key}_kgs`, new Set([row.key]));
    for (const id of ["price_basis_reference", "price_basis_date"]) (consumers.get(id) ?? (consumers.set(id, new Set()), consumers.get(id)!)).add(`price-route:${row.key}`);
  }
  for (const id of contextIds) (consumers.get(id) ?? (consumers.set(id, new Set()), consumers.get(id)!)).add(contract.professional_proof_bundle_id);
  consumers.set("work_included", new Set([`scope-trigger:${inventory.catalog_id}`]));
  const domainParameter = (spec: ParameterSpec): ProfessionalDomainParameterDefinitionV1 => {
    const full = spec.required_for.length === 1;
    return { parameter_id: spec.parameter_id, label_ru: spec.label_ru, input_type: spec.input_type, priority: spec.priority, unit_id: spec.unit_id, ...(spec.minimum == null ? {} : { minimum: spec.minimum }), ...(spec.maximum == null ? {} : { maximum: spec.maximum }), ...(spec.choices ? { choices: spec.choices } : {}), visible_when: full ? FULL_ONLY : ALWAYS, required_when: full ? FULL_ONLY : ALWAYS, formula_consumers: [...(consumers.get(spec.parameter_id) ?? [contract.professional_proof_bundle_id])], source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM", "VERIFIED_RATEBOOK"] };
  };
  const namespace = flatCeiling ? `${inventory.catalog_id}:drywall-flat-ceiling-v6` : `${inventory.canonical_technology_id}:drywall-architectural-element-v4`;
  const semanticVersion = flatCeiling ? "6.0.0" : "4.0.0";
  const schema: ProfessionalDomainParameterSchemaV1 = { schema_id: `${flatCeiling ? inventory.catalog_id : inventory.canonical_technology_id}:${flatCeiling ? "drywall-flat-ceiling-parameter-schema:v6" : "drywall-architectural-element-parameter-schema:v4"}`, schema_version: semanticVersion, technology_id: inventory.canonical_technology_id, parameters: parameters.map(domainParameter), quantity_alternatives: [["area_m2"], ["length_m", "width_m"]], derived_parameter_rules: [{ target_parameter_id: "area_m2", output_unit_id: "m2", alternatives: [{ input_parameter_ids: ["length_m", "width_m"], expression: "length_m × width_m", calculate: (v) => v.length_m * v.width_m }] }] };
  const formula = (row: RowSpec): ProfessionalAssemblyFormulaV4 => ({ formula_id: `${namespace}:${row.key}:${flatCeiling ? "FormulaGraphV6" : "FormulaGraphV4"}`, expression: row.expression, input_parameter_ids: row.inputs, output_unit_id: row.output_unit, calculate: row.calculate });
  const dependencies = contract.non_cost_dependencies.map((id) => `typed-child:${id}`);
  const assemblyRow = (row: RowSpec): ProfessionalAssemblyRowDefinitionV4 => ({
    row_id: `${namespace}:row:${row.key}`, section: row.section, category: row.category, title_ru: row.title, formula: formula(row),
    cost_ownership: row.ownership ?? "priced_resource", cost_owner_id: `${flatCeiling ? "DRYWALL_FLAT_CEILING_V6" : "DRYWALL_ARCHITECTURAL_ELEMENT_V4"}:${contract.operation}:${inventory.catalog_id}:${row.key}`, semantic_owner: drywallArchitecturalElementProfessionalOwnerIdV4(inventory.catalog_id), normative_source_ids: contract.normative_source_ids,
    inclusion_condition: row.scopes === "FULL" ? "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE" : "work_included=true", procurement_eligible: row.procurement ?? false, normative_trace_v3: trace(contract, row),
    price_route_v3: row.ownership === "informational_output" ? { kind: "NOT_APPLICABLE_INFORMATIONAL_OUTPUT", reason: "Контрольный выход не образует повторной стоимости." } : { kind: "RUNTIME_VALIDATED_INPUT", unit_price_parameter_id: `unit_price_${row.key}_kgs`, price_basis_reference_parameter_id: "price_basis_reference", price_basis_date_parameter_id: "price_basis_date", currency_from_request: true, minimum_exclusive: 0 },
    resource_graph_node_v3: { graph_version: "ProfessionalResourceGraphV3", typed_child_boundary: contract.operation, resource_class: row.resource_class, dependency_ids: dependencies, non_cost_dependencies_only: contract.non_cost_dependencies.length > 0, context_parameter_ids: contextIds, forbidden_cost_scopes: contract.forbidden_cost_scope }, normative_proof_bundle_id_v3: contract.normative_proof_bundle_id, professional_proof_bundle_id_v3: contract.professional_proof_bundle_id,
  });
  const child = (suffix: "core" | "full", modes: readonly ProfessionalEstimateScopeModeV4[], childRows: readonly RowSpec[]): ProfessionalChildAssemblyV4 => {
    const needed = new Set(["work_included", "price_basis_reference", "price_basis_date", ...contextIds]);
    for (const row of childRows) { for (const id of row.inputs) needed.add(id); if (row.ownership !== "informational_output") needed.add(`unit_price_${row.key}_kgs`); }
    const assemblyParameter = (id: string): ProfessionalAssemblyParameterDefinitionV4 => { const spec = byId.get(id); if (!spec) throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_PARAMETER_MISSING:${inventory.catalog_id}:${id}`); return { parameter_id: id, title_ru: spec.label_ru, role: spec.role, unit_id: spec.unit_id, required_for: modes }; };
    return { child_passport_id: `${namespace}:${suffix}-passport`, child_passport_version: semanticVersion, domain_owner: "interior_finishes_complete_v1", assembly_id: `${namespace}:${suffix}-assembly`, title_ru: `${suffix === "core" ? "Основной" : "Полный"} состав: ${inventory.localized_name_ru}`, scope_trigger_parameter: "work_included", scope_trigger_values: [true], supported_scope_modes: modes, parameters: [...needed].map(assemblyParameter), rows: childRows.map(assemblyRow) };
  };
  const rateSource = contract.operation === "REPAIR" ? KG_KRERR : KG_KRER;
  return { contract, schema, child_assemblies: [child("core", BOTH_SCOPES, rows.filter((row) => row.scopes === "BOTH")), child("full", FULL_SCOPE, rows.filter((row) => row.scopes === "FULL"))], normative_profile: { profile_id: `${namespace}:kg-profile`, profile_version: semanticVersion, technology_id: inventory.canonical_technology_id, jurisdiction: "KG", requested_source_ids: [KG_SP, rateSource, KG_SAFETY, KG_MATERIAL], requested_source_types: ["WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM", "MATERIAL_STANDARD"], rejected_foreign_source_ids: ["RU_SP_163", "RU_GESN_10", "ISO_6308_WITHDRAWN", "ASTM_C1396", "EN_520"] }, required_stages: contract.required_stages, optional_stages: contract.optional_stages, resource_policy: { policy_id: `${namespace}:resource-policy`, technology_id: inventory.canonical_technology_id, required_categories: ["material", "labor", "equipment", "transport", "waste", "testing", "documentation"], optional_categories: ["subcontract_service", "temporary_work"], forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ", "Основные материалы", "Прочие материалы", "Комплект оборудования"], one_bundle_resource_replacement_forbidden: true } };
}

export function isDrywallArchitecturalElementProfessionalCatalogIdV4(catalogId: string): boolean {
  return ARCHITECTURAL_AUTHORIZED.has(catalogId);
}

export function buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory: InteriorFinishesDomainInventoryRow): DrywallArchitecturalElementProfessionalPackagePartsV4 | null {
  return ARCHITECTURAL_AUTHORIZED.has(inventory.catalog_id) ? buildParts(inventory) : null;
}

export function isDrywallFlatCeilingProfessionalCatalogIdV6(catalogId: string): boolean {
  return FLAT_CEILING_AUTHORIZED.has(catalogId);
}

export function drywallFlatCeilingProfessionalOwnerIdV6(catalogId: string): string {
  if (!FLAT_CEILING_AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_FLAT_CEILING_OWNER_OUTSIDE_SCOPE:${catalogId}`);
  return drywallArchitecturalElementProfessionalOwnerIdV4(catalogId);
}

export function drywallFlatCeilingCalculationStrategyIdV6(catalogId: string): string {
  if (!FLAT_CEILING_AUTHORIZED.has(catalogId)) throw new Error(`DRYWALL_FLAT_CEILING_STRATEGY_OUTSIDE_SCOPE:${catalogId}`);
  return drywallArchitecturalElementCalculationStrategyIdV4(catalogId);
}

export function buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory: InteriorFinishesDomainInventoryRow): DrywallArchitecturalElementProfessionalPackagePartsV4 | null {
  return FLAT_CEILING_AUTHORIZED.has(inventory.catalog_id) ? buildParts(inventory) : null;
}

export function buildIndividualDrywallFlatCeilingEstimatePassportV6(
  inventory: InteriorFinishesDomainInventoryRow,
  parts: DrywallArchitecturalElementProfessionalPackagePartsV4 = buildParts(inventory),
): IndividualProfessionalEstimatePassportV6 {
  if (!FLAT_CEILING_AUTHORIZED.has(inventory.catalog_id)) throw new Error(`DRYWALL_FLAT_CEILING_PASSPORT_OUTSIDE_SCOPE:${inventory.catalog_id}`);
  const operation = parts.contract.operation as DrywallFlatCeilingOperationV6;
  const variant = parts.contract.variant as DrywallFlatCeilingVariantV6;
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const formulaSummary = rows.map((row) => ({ id: row.formula.formula_id, expression: row.formula.expression, inputs: row.formula.input_parameter_ids, unit: row.formula.output_unit_id }));
  const resourceSummary = rows.map((row) => ({ id: row.row_id, owner: row.cost_owner_id, category: row.category, graph: row.resource_graph_node_v3 }));
  const expectedCandidates = drywallFlatCeilingExpectedCandidatesV6(operation, variant);
  return {
    schemaVersion: "IndividualProfessionalEstimatePassportV6",
    catalogId: inventory.catalog_id,
    titleRu: inventory.localized_name_ru,
    operation,
    variant,
    productionOwnerId: drywallFlatCeilingProfessionalOwnerIdV6(inventory.catalog_id),
    calculationStrategyId: drywallFlatCeilingCalculationStrategyIdV6(inventory.catalog_id),
    parameterSchemaId: parts.schema.schema_id,
    formulaGraphId: `FormulaGraphV6:${inventory.catalog_id}`,
    resourceGraphId: `ResourceGraphV6:${inventory.catalog_id}`,
    includedScope: parts.contract.owned_cost_scope,
    excludedScope: parts.contract.forbidden_cost_scope,
    dependencyOrder: parts.contract.non_cost_dependencies,
    typedChildBoundaries: parts.contract.forbidden_cost_scope,
    normativeSourceIds: parts.contract.normative_source_ids,
    parameterCount: parts.schema.parameters.length,
    boqRowCount: rows.length,
    expectedCandidateCount: expectedCandidates.length,
    candidateCoveragePercent: 100,
    shownButUnusedParameterCount: 0,
    hiddenQuantitativeAssumptionCount: 0,
    identityHash: estimateDeterministicHash({ catalogId: inventory.catalog_id, titleRu: inventory.localized_name_ru, operation, variant }),
    parameterSchemaHash: estimateDeterministicHash(parts.schema),
    formulaGraphHash: estimateDeterministicHash(formulaSummary),
    resourceGraphHash: estimateDeterministicHash(resourceSummary),
  };
}
