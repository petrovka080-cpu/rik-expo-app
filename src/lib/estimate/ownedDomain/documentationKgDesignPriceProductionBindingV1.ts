import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { KG_DESIGN_PRICE_NORM_ID, KG_DESIGN_PRICE_PRODUCT_PROFILE_ID, KG_DESIGN_PRICE_REQUIRED_IDS,
  KG_DESIGN_PRICE_SOURCE_ID, KG_DESIGN_PRICE_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  project_object_type: "Укажите точный отраслевой объект в формате CHEMICAL_INDUSTRY:…",
  design_stage: "Укажите стадию WORKING_DOCUMENTATION, PROJECT или WORKING_PROJECT.",
  selected_price_collection_section: "Подтвердите точный отраслевой раздел сборника цен.",
  selected_collection_edition_and_amendments: "Укажите действующую редакцию и поправки в формате CURRENT_CONFIRMED:…",
  selected_price_table_and_row: "Укажите точные таблицу и строку раздела 9.",
  project_capacity_measure: "Укажите проектную мощность в единице выбранной таблицы.",
  project_capacity_unit: "Укажите единицу проектной мощности.",
  selected_table_capacity_range: "Укажите диапазон выбранной строки в формате MIN=…,MAX=…",
  selected_table_measurement_unit: "Укажите единицу измерения выбранной таблицы.",
  quantity_normalization_calculation: "Покажите SAME_UNIT:единица->единица,FACTOR=1.",
  selected_table_base_price_values: "Укажите опубликованные базовые значения выбранной строки в формате TABLE_BASE_VALUES:…",
  applicable_design_stage_coefficient: "Укажите применимый STAGE_COEFFICIENT.",
  deliverable_composition: "Укажите состав выдаваемой документации в формате DELIVERABLES:…",
  design_section_cost_allocation: "Укажите распределение стоимости разделов в формате SECTION_ALLOCATION:…",
  additional_and_excluded_work_scope: "Укажите дополнительные и исключённые работы в формате PROJECT_SCOPE:…",
  current_price_level_conversion_and_indices: "Укажите актуализацию цен и индексы в формате PRICE_CONVERSION:…",
  estimator_approval_reference: "Укажите ссылку на согласование расчёта сметчиком.",
});
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractKgDesignPriceCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*(?:design|проектн))(?=.*(?:kg|minstroy|минстрой))(?=.*(?:section|раздел)\s*9)(?=.*(?:table|таблиц))/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: KG_DESIGN_PRICE_PRODUCT_PROFILE_ID };
  const capacity = ref(text, /project\s+capacity\s+measure/iu);
  if (capacity) { const parsed = decimal(capacity.replace(/\s*[a-z0-9_²/]+$/iu, "")); if (parsed !== null) result.project_capacity_measure = parsed; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["project_object_type", /project\s+object\s+type/iu], ["design_stage", /design\s+stage/iu],
    ["selected_price_collection_section", /selected\s+price\s+collection\s+section/iu],
    ["selected_collection_edition_and_amendments", /selected\s+collection\s+edition\s+and\s+amendments/iu],
    ["selected_price_table_and_row", /selected\s+price\s+table\s+and\s+row/iu],
    ["project_capacity_unit", /project\s+capacity\s+unit/iu], ["selected_table_capacity_range", /selected\s+table\s+capacity\s+range/iu],
    ["selected_table_measurement_unit", /selected\s+table\s+measurement\s+unit/iu],
    ["quantity_normalization_calculation", /quantity\s+normalization\s+calculation/iu],
    ["selected_table_base_price_values", /selected\s+table\s+base\s+price\s+values/iu],
    ["applicable_design_stage_coefficient", /applicable\s+design\s+stage\s+coefficient/iu],
    ["deliverable_composition", /deliverable\s+composition/iu],
    ["design_section_cost_allocation", /design\s+section\s+cost\s+allocation/iu],
    ["additional_and_excluded_work_scope", /additional\s+and\s+excluded\s+work\s+scope/iu],
    ["current_price_level_conversion_and_indices", /current\s+price\s+level\s+conversion\s+and\s+indices/iu],
    ["estimator_approval_reference", /estimator\s+approval\s+reference/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function kgDesignPriceMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined) {
  if (parameters?.product_profile_id !== KG_DESIGN_PRICE_PRODUCT_PROFILE_ID) return [];
  return KG_DESIGN_PRICE_REQUIRED_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const unit = typeof parameters.project_capacity_unit === "string" ? parameters.project_capacity_unit : null;
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id === "project_capacity_measure" ? unit : null, source_type: "USER_EXPLICIT" as const,
    source_id: `consumer-kg-design-price-prompt:${id}`, captured_at: "consumer-kg-design-price-prompt-snapshot",
    confidence: "high" as const, applicability: "Value explicitly stated for the exact selected KG design-price table." }]));
}
export function applyKgDesignPricePhysicalNormToBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== KG_DESIGN_PRICE_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "kg_selected_design_price_table") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "KG_DESIGN_PRICE_TABLE_MEASUREMENT",
    operation_class: "MEASURE", material_system: "KG_DESIGN_PRICE_SELECTED_TABLE", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "labor_1") return row;
    const source = { ...row, professionalPhysicalNormApplicabilityV1: resolution, name: "Проектные работы по точной выбранной таблице сборника цен КР", templateId: "documentation:kg-design-price:selected-table:v1",
      templateVersion: KG_DESIGN_PRICE_SOURCE_METADATA.source_document_version, normId: KG_DESIGN_PRICE_NORM_ID,
      normFamilyId: "norm_family:documentation:kg_selected_design_price_table", normSourceId: KG_DESIGN_PRICE_SOURCE_ID,
      normSourceTitle: KG_DESIGN_PRICE_SOURCE_METADATA.source_title, normVersion: KG_DESIGN_PRICE_SOURCE_METADATA.source_document_version,
      normReviewStatus: "kg_official_primary_source_reviewed", normSourceProfile: "KG_PRIMARY" as const,
      normSourceJurisdiction: "KG", normSourcePublisher: "Министерство строительства Кыргызской Республики",
      normSourceEffectiveDate: "2016-01-01", normSourceCheckedAt: "2026-09-12",
      normSourceReference: KG_DESIGN_PRICE_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: KG_DESIGN_PRICE_SOURCE_METADATA.definition_hash, normSourceLicenseStatus: "public_government",
      normSourceLifecycleStatus: "ACTIVE" as const, rateKey: "kg_design_selected_table_price", laborKey: "kg_selected_design_deliverable" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Проектная мощность заблокирована до точного отраслевого раздела, таблицы, диапазона, стадии, состава и актуализации цен.",
      formulaId: "kg_design_selected_table_blocked_v1", quantityFormula: "blocked until every exact KG design-price table input is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    const unit = resolution.calculated_documentation_selected_table_unit!;
    return { ...source, quantity: resolution.calculated_documentation_selected_table_capacity!, unit, unitPrice: 0,
      sourcePolicy: "manual_review" as const,
      comment: "Количество равно мощности в единице выбранной таблицы; стоимость и трудоёмкость требуют отдельного полного расчёта по базовым значениям, стадии, составу и индексам.",
      formulaId: "kg_design_selected_table_capacity_v1",
      quantityFormula: "project_capacity_measure * 1 after explicit same-unit normalization",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_documentation_selected_table_capacity}`, `resultUnit=${unit}`,
        "genericConstructionPercent=false", "automaticPriceOrEffort=false"].join("; "),
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false,
      parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:kg_design_selected_table_full_price_calculation"] };
  });
}
