import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { BIA_TN10_MASONRY_NORM_ID, BIA_TN10_MASONRY_PRODUCT_PROFILE_ID, BIA_TN10_MASONRY_REQUIRED_IDS,
  BIA_TN10_MASONRY_SOURCE_ID, BIA_TN10_MASONRY_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";

type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  measured_net_brick_wall_area_m2: "Укажите чистую площадь кирпичной стены после вычета проёмов, м².",
  gross_wall_area_and_opening_deductions: "Укажите проверку GROSS_M2, OPENINGS_M2 и NET_M2.",
  fired_clay_brick_confirmed: "Подтвердите, что выбран именно обожжённый глиняный кирпич.",
  brick_manufacturer_and_designation: "Укажите производителя и точное обозначение кирпича.",
  specified_and_nominal_dimensions: "Укажите заданные и номинальные размеры кирпича.",
  joint_width_mm: "Укажите принятую толщину шва, мм.",
  wall_thickness_and_wythe_configuration: "Укажите толщину и число слоёв в формате WYTHE:…",
  bond_pattern: "Укажите тип перевязки кирпичной кладки.",
  selected_bia_tn10_table_4_row: "Укажите точную строку в формате BIA_TN10_TABLE4:…",
  selected_brick_quantity_per_m2: "Укажите пересчитанное из выбранной строки количество кирпича, шт/м².",
  selected_mortar_quantity_per_m2: "Укажите пересчитанное из выбранной строки количество раствора, м³/м².",
  applicable_bond_correction_factors: "Укажите поправки BRICK_FACTOR и MORTAR_FACTOR.",
  selected_project_breakage_and_waste_allowances: "Укажите проектные BRICK_PERCENT и MORTAR_PERCENT.",
  supplier_package_quantities: "Укажите упаковки поставщика BRICK_PIECES и MORTAR_M3.",
  project_architect_engineer_or_estimator_approval_reference: "Укажите ссылку на согласование выбранной строки и расчёта.",
});
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
function num(text: string, label: RegExp, unit = "") {
  const value = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu"))?.[1];
  return value ? decimal(value) : null;
}
function structuredNumericFields(value: unknown): Readonly<Record<string, number>> {
  if (typeof value !== "string") return {};
  return Object.fromEntries([...value.matchAll(/([A-Z0-9_]+)\s*=\s*(\d+(?:[.,]\d+)?)/gu)]
    .map((match) => [match[1]!, Number(match[2]!.replace(",", "."))]));
}
export function extractBiaTn10MasonryCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*(?:brick|кирпич))(?=.*bia)(?=.*tn\s*10)(?=.*table\s*4)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID };
  const numeric: readonly (readonly [string, RegExp, string])[] = [
    ["measured_net_brick_wall_area_m2", /net\s+brick\s+wall\s+area/iu, "m(?:2|²)"],
    ["joint_width_mm", /joint\s+width/iu, "mm"],
    ["selected_brick_quantity_per_m2", /selected\s+brick\s+quantity\s+per\s+m2/iu, ""],
    ["selected_mortar_quantity_per_m2", /selected\s+mortar\s+quantity\s+per\s+m2/iu, ""],
  ];
  for (const [id, label, unit] of numeric) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["gross_wall_area_and_opening_deductions", /gross\s+wall\s+area\s+and\s+opening\s+deductions/iu],
    ["brick_manufacturer_and_designation", /brick\s+manufacturer\s+and\s+designation/iu],
    ["specified_and_nominal_dimensions", /specified\s+and\s+nominal\s+dimensions/iu],
    ["wall_thickness_and_wythe_configuration", /wall\s+thickness\s+and\s+wythe\s+configuration/iu],
    ["bond_pattern", /bond\s+pattern/iu], ["selected_bia_tn10_table_4_row", /selected\s+bia\s+tn10\s+table\s+4\s+row/iu],
    ["applicable_bond_correction_factors", /applicable\s+bond\s+correction\s+factors/iu],
    ["selected_project_breakage_and_waste_allowances", /selected\s+project\s+breakage\s+and\s+waste\s+allowances/iu],
    ["supplier_package_quantities", /supplier\s+package\s+quantities/iu],
    ["project_architect_engineer_or_estimator_approval_reference", /project\s+approval\s+reference/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  const clay = ref(text, /fired\s+clay\s+brick\s+confirmed/iu);
  if (clay) result.fired_clay_brick_confirmed = /^true$/iu.test(clay);
  const corrections = structuredNumericFields(result.applicable_bond_correction_factors);
  const waste = structuredNumericFields(result.selected_project_breakage_and_waste_allowances);
  const packages = structuredNumericFields(result.supplier_package_quantities);
  if (corrections.BRICK_FACTOR !== undefined) result.brick_bond_correction_factor = corrections.BRICK_FACTOR;
  if (corrections.MORTAR_FACTOR !== undefined) result.mortar_bond_correction_factor = corrections.MORTAR_FACTOR;
  if (waste.BRICK_PERCENT !== undefined) result.brick_breakage_percent = waste.BRICK_PERCENT;
  if (waste.MORTAR_PERCENT !== undefined) result.mortar_waste_percent = waste.MORTAR_PERCENT;
  if (packages.BRICK_PIECES !== undefined) result.brick_supplier_package_pieces = packages.BRICK_PIECES;
  if (packages.MORTAR_M3 !== undefined) result.mortar_supplier_package_m3 = packages.MORTAR_M3;
  return Object.freeze(result);
}
export function biaTn10MasonryMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== BIA_TN10_MASONRY_PRODUCT_PROFILE_ID) return [];
  return BIA_TN10_MASONRY_REQUIRED_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.endsWith("_m2") ? "m2" : id.endsWith("_mm") ? "mm" : id.includes("brick_quantity_per_m2") ? "piece_per_m2" :
      id.includes("mortar_quantity_per_m2") ? "m3_per_m2" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-bia-tn10-prompt:${id}`,
    captured_at: "consumer-bia-tn10-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated for the exact selected BIA TN 10 Table 4 masonry row." }]));
}

export function applyBiaTn10MasonryPhysicalNormToBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== BIA_TN10_MASONRY_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "bia_tn10_fired_clay_brick_wall") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT",
    operation_class: "MEASURE", material_system: "BIA_TN10_FIRED_CLAY_BRICK", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    const brick = row.code === "material_1", mortar = row.code === "material_2";
    if (!brick && !mortar) return row;
    const source = { ...row, professionalPhysicalNormApplicabilityV1: resolution, name: brick ? "Обожжённый глиняный кирпич по выбранной строке BIA TN 10 Table 4" :
      "Кладочный раствор по выбранной строке BIA TN 10 Table 4", templateId: "masonry:bia-tn10:selected-table-4:v1",
      templateVersion: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version, normId: BIA_TN10_MASONRY_NORM_ID,
      normFamilyId: "norm_family:masonry:bia_tn10_selected_table", normSourceId: BIA_TN10_MASONRY_SOURCE_ID,
      normSourceTitle: BIA_TN10_MASONRY_SOURCE_METADATA.source_title,
      normVersion: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
      normReviewStatus: "public_primary_method_reviewed", normSourceProfile: "INTL_REFERENCE" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT", normSourcePublisher: "Brick Industry Association",
      normSourceEffectiveDate: "2017-01-01", normSourceCheckedAt: "2026-09-12",
      normSourceReference: BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash, normSourceLicenseStatus: "public",
      normSourceLifecycleStatus: "ACTIVE" as const, rateKey: brick ? "bia_tn10_selected_brick_quantity_piece" : "bia_tn10_selected_mortar_quantity_m3",
      materialKey: brick ? "bia_tn10_selected_fired_clay_brick" : "bia_tn10_selected_masonry_mortar" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Количество заблокировано до полной геометрии, точной строки BIA, поправок, проектного запаса и упаковки поставщика.",
      formulaId: "bia_tn10_selected_table_blocked_v1", quantityFormula: "blocked until every exact BIA TN 10 table parameter is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    const quantity = brick ? resolution.calculated_masonry_selected_brick_quantity_piece! :
      resolution.calculated_masonry_selected_mortar_quantity_m3!;
    return { ...source, quantity, unit: brick ? "pcs" : "m3", unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Количество рассчитано из чистой площади и явно выбранной строки BIA с проектными поправками и упаковкой; цена поставщика требуется отдельно.",
      formulaId: brick ? "bia_tn10_selected_brick_procurement_v1" : "bia_tn10_selected_mortar_procurement_v1",
      quantityFormula: "net_area * selected_table_rate * bond_factor * project_waste, then supplier_package_rounding",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${quantity}`, `resultUnit=${brick ? "piece" : "m3"}`, "automaticGenericRate=false", "priceSourceRequired=true"].join("; "),
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false,
      parameterBlockerIds: [`PRICE_SOURCE_REQUIRED:${brick ? "brick_supplier_quote" : "mortar_supplier_quote"}`] };
  });
}
