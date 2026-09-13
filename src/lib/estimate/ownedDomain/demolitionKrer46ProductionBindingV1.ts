import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { KRER46_DEMOLITION_NORM_ID, KRER46_DEMOLITION_PRODUCT_PROFILE_ID, KRER46_DEMOLITION_REQUIRED_IDS,
  KRER46_DEMOLITION_SOURCE_ID, KRER46_DEMOLITION_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  measured_project_quantity: "Укажите измеренный проектный объём демонтажа.",
  demolished_element_type_and_material: "Укажите демонтируемый элемент и материал.",
  reconstruction_expansion_or_technical_re_equipment_scope: "Укажите RECONSTRUCTION, EXPANSION или TECHNICAL_RE_EQUIPMENT.",
  selected_norm_collection: "Подтвердите выбранный сборник KG_KRER_46.",
  selected_collection_edition_and_amendments: "Укажите действующую редакцию и поправки в формате CURRENT_CONFIRMED:…",
  selected_krer46_table_code: "Укажите точный код таблицы КРЕР №46.",
  selected_table_work_composition: "Укажите состав работ выбранной таблицы в формате TABLE_SCOPE:…",
  project_quantity_unit: "Укажите единицу измеренного проектного объёма.",
  selected_table_measurement_unit: "Укажите единицу измерения выбранной таблицы.",
  quantity_normalization_calculation: "Покажите проверку нормализации SAME_UNIT:единица->единица,FACTOR=1.",
  retained_and_disposed_material_scope: "Укажите судьбу сохраняемых и удаляемых материалов в формате PROJECT_SCOPE:…",
  work_access_and_constraint_conditions: "Укажите условия доступа и ограничения в формате PROJECT_CONDITIONS:…",
  applicable_methodical_instruction_coefficients: "Укажите применимые коэффициенты в формате PROJECT_COEFFICIENTS:…",
  selected_table_resource_rows: "Укажите выбранные строки ресурсов в формате TABLE_RESOURCES:…",
  current_price_level_and_regional_indices: "Укажите текущий уровень цен и индексы в формате PRICE_LEVEL:…",
  estimator_approval_reference: "Укажите ссылку на проверку и согласование сметчиком.",
});
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractKrer46DemolitionCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*(?:demolition|демонтаж|разборк))(?=.*(?:krer|крер)\s*(?:№|no\.?|#)?\s*46)(?=.*(?:table|таблиц))/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: KRER46_DEMOLITION_PRODUCT_PROFILE_ID };
  const quantity = ref(text, /measured\s+project\s+quantity/iu);
  if (quantity) { const parsed = decimal(quantity.replace(/\s*[a-z0-9_²]+$/iu, "")); if (parsed !== null) result.measured_project_quantity = parsed; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["demolished_element_type_and_material", /demolished\s+element\s+type\s+and\s+material/iu],
    ["reconstruction_expansion_or_technical_re_equipment_scope", /krer46\s+project\s+scope/iu],
    ["selected_norm_collection", /selected\s+norm\s+collection/iu],
    ["selected_collection_edition_and_amendments", /selected\s+collection\s+edition\s+and\s+amendments/iu],
    ["selected_krer46_table_code", /selected\s+krer46\s+table\s+code/iu],
    ["selected_table_work_composition", /selected\s+table\s+work\s+composition/iu],
    ["project_quantity_unit", /project\s+quantity\s+unit/iu],
    ["selected_table_measurement_unit", /selected\s+table\s+measurement\s+unit/iu],
    ["quantity_normalization_calculation", /quantity\s+normalization\s+calculation/iu],
    ["retained_and_disposed_material_scope", /retained\s+and\s+disposed\s+material\s+scope/iu],
    ["work_access_and_constraint_conditions", /work\s+access\s+and\s+constraint\s+conditions/iu],
    ["applicable_methodical_instruction_coefficients", /applicable\s+methodical\s+instruction\s+coefficients/iu],
    ["selected_table_resource_rows", /selected\s+table\s+resource\s+rows/iu],
    ["current_price_level_and_regional_indices", /current\s+price\s+level\s+and\s+regional\s+indices/iu],
    ["estimator_approval_reference", /estimator\s+approval\s+reference/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function krer46DemolitionMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined) {
  if (parameters?.product_profile_id !== KRER46_DEMOLITION_PRODUCT_PROFILE_ID) return [];
  return KRER46_DEMOLITION_REQUIRED_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const unit = typeof parameters.project_quantity_unit === "string" ? parameters.project_quantity_unit : null;
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id === "measured_project_quantity" ? unit : null, source_type: "USER_EXPLICIT" as const,
    source_id: `consumer-krer46-prompt:${id}`, captured_at: "consumer-krer46-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated for the exact selected KRER 46 demolition table." }]));
}
export function applyKrer46DemolitionPhysicalNormToBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== KRER46_DEMOLITION_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "krer46_selected_demolition_table") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "KG_KRER46_DEMOLITION_TABLE_MEASUREMENT",
    operation_class: "MEASURE", material_system: "KG_KRER46_SELECTED_DEMOLITION_TABLE", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "labor_1") return row;
    const source = { ...row, name: "Демонтаж по точной выбранной таблице КРЕР №46", templateId: "demolition:kg-krer46:selected-table:v1",
      templateVersion: KRER46_DEMOLITION_SOURCE_METADATA.source_document_version, normId: KRER46_DEMOLITION_NORM_ID,
      normFamilyId: "norm_family:demolition:kg_krer46_selected_table", normSourceId: KRER46_DEMOLITION_SOURCE_ID,
      normSourceTitle: KRER46_DEMOLITION_SOURCE_METADATA.source_title,
      normVersion: KRER46_DEMOLITION_SOURCE_METADATA.source_document_version,
      normReviewStatus: "kg_official_primary_source_reviewed", normSourceProfile: "KG_PRIMARY" as const,
      normSourceJurisdiction: "KG", normSourcePublisher: "Министерство строительства Кыргызской Республики",
      normSourceEffectiveDate: "2022-01-01", normSourceCheckedAt: "2026-09-12",
      normSourceReference: KRER46_DEMOLITION_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: KRER46_DEMOLITION_SOURCE_METADATA.definition_hash, normSourceLicenseStatus: "public_government",
      normSourceLifecycleStatus: "ACTIVE" as const, rateKey: "krer46_selected_table_resource_cost", laborKey: "krer46_selected_demolition_work" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Объём заблокирован до точной таблицы КРЕР №46, единицы, состава работ, редакции, коэффициентов и ресурсов.",
      formulaId: "krer46_selected_demolition_table_blocked_v1", quantityFormula: "blocked until every exact KRER 46 table input is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    const unit = resolution.calculated_demolition_selected_table_unit === "piece" ? "pcs" :
      resolution.calculated_demolition_selected_table_unit!;
    return { ...source, quantity: resolution.calculated_demolition_selected_table_quantity!, unit, unitPrice: 0,
      sourcePolicy: "manual_review" as const,
      comment: "Количество тождественно нормализованному объёму выбранной таблицы; ресурсная стоимость требует фактических ставок и индексов.",
      formulaId: "krer46_selected_demolition_table_quantity_v1",
      quantityFormula: "measured_project_quantity * 1 after explicit same-unit normalization",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_demolition_selected_table_quantity}`, `resultUnit=${unit}`,
        "automaticGenericRate=false", "automaticRepairScope=false", "resourceCostBlocked=true"].join("; "),
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false,
      parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:krer46_selected_table_resource_rates"] };
  });
}
