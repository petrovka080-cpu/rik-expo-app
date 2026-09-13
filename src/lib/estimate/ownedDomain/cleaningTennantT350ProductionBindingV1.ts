import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { TENNANT_T350_CONVENTIONAL_NORM_ID, TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID,
  TENNANT_T350_CONVENTIONAL_SOURCE_ID, TENNANT_T350_CONVENTIONAL_SOURCE_METADATA,
  TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS, resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze({
  cleanable_hard_floor_area_m2: "Укажите чистую площадь твёрдого пола для машинной уборки, м².",
  machine_variant: "Подтвердите Tennant T350 24-inch/600-mm dual-disk.", cleaning_path_mm: "Подтвердите рабочую ширину 600 мм.",
  cleaning_technology_mode: "Подтвердите conventional, а не ec-H2O режим.", required_pass_count: "Укажите требуемое число проходов.",
  soil_type: "Укажите вид и тяжесть загрязнения.", obstruction_factor: "Укажите проектный коэффициент препятствий не менее 1.",
  dump_fill_cycle_allowance: "Укажите добавочные часы циклов слива и заполнения.", battery_runtime_allowance: "Укажите добавочные часы ограничения батареи.",
  manual_detail_cleaning_scope: "Укажите ручную детальную уборку отдельно в формате SEPARATE_SCOPE:…",
  operator_labor_scope: "Укажите труд оператора отдельно в формате SEPARATE_SCOPE:…",
});
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function num(text: string, label: RegExp, unit = "") { const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu")); return match?.[1] ? decimal(match[1]) : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractTennantT350CanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*tennant\s+t350)(?=.*(?:600\s*мм|600\s*mm|24\s*inch))(?=.*conventional)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID,
    machine_variant: "TENNANT_T350_24_INCH_600_MM_DUAL_DISK", cleaning_path_mm: 600, cleaning_technology_mode: "CONVENTIONAL" };
  const values: readonly (readonly [string, RegExp, string])[] = [
    ["cleanable_hard_floor_area_m2", /чист[а-яё]*\s+площад[ьи]\s+тв[её]рд[а-яё]*\s+пол[а-яё]*/, "(?:м2|м²|m2|sqm)"],
    ["required_pass_count", /числ[а-яё]*\s+проход[а-яё]*/, ""], ["obstruction_factor", /коэффициент\s+препятств[а-яё]*/, ""],
    ["dump_fill_cycle_allowance", /часы\s+слив[а-яё]*\s+и\s+заполнени[а-яё]*/, "(?:ч|h|hour)?"],
    ["battery_runtime_allowance", /часы\s+ограничени[а-яё]*\s+батаре[а-яё]*/, "(?:ч|h|hour)?"],
  ];
  for (const [id, label, unit] of values) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["soil_type", /вид\s+загрязнени[а-яё]*/iu], ["manual_detail_cleaning_scope", /ручн[а-яё]*\s+детальн[а-яё]*\s+уборк[а-яё]*/iu],
    ["operator_labor_scope", /труд\s+оператор[а-яё]*/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function tennantT350MissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID) return [];
  return TENNANT_T350_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.endsWith("_m2") ? "m2" : id.endsWith("_mm") ? "mm" : id.includes("allowance") ? "equipment_hour" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-cleaning-prompt:${id}`,
    captured_at: "consumer-cleaning-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact Tennant T350 conventional cleaning request." }]));
}
export function applyTennantT350PhysicalNormToCleaningBoqV1(plan: EstimatorReasoningPlan, rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== TENNANT_T350_CONVENTIONAL_PRODUCT_PROFILE_ID || plan.semanticFrame.object !== "mechanized_hard_floor_cleaning" ||
    plan.semanticFrame.materialSystem !== "tennant_t350_conventional") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "MECHANIZED_HARD_FLOOR_CLEANING", operation_class: "CLEAN",
    material_system: "TENNANT_T350_600MM_DUAL_DISK_CONVENTIONAL", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "equipment_1") return row;
    const source = { ...row, name: "Tennant T350 600 мм dual-disk — машинные часы conventional",
      templateId: "cleaning:tennant-t350-600mm-conventional:v1", templateVersion: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_document_version,
      normId: TENNANT_T350_CONVENTIONAL_NORM_ID, normFamilyId: "norm_family:cleaning:tennant_t350",
      normSourceId: TENNANT_T350_CONVENTIONAL_SOURCE_ID, normSourceTitle: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_title,
      normVersion: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_document_version, normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const, normSourceJurisdiction: "INTERNATIONAL_PROJECT", normSourcePublisher: "Tennant Company",
      normSourceEffectiveDate: "2017-11-01", normSourceCheckedAt: "2026-09-12", normSourceReference: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: TENNANT_T350_CONVENTIONAL_SOURCE_METADATA.definition_hash, normSourceLicenseStatus: "manufacturer_public",
      normSourceLifecycleStatus: "ACTIVE" as const, rateKey: "cleaning_tennant_t350_equipment_hour", materialKey: "tennant_t350_machine_time" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Машинные часы заблокированы до подтверждения варианта, режима, проходов и всех проектных поправок.",
      formulaId: "tennant_t350_hours_blocked_v1", quantityFormula: "blocked until all exact machine and project inputs are explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    return { ...source, quantity: resolution.calculated_tennant_t350_project_equipment_hours!, unit: "equipment_hour",
      comment: "База 2795 м²/ч для conventional скорректирована только явно заданными проектными поправками; оператор и ручная уборка отдельно.",
      sourcePolicy: "configured_reference" as const, formulaId: "tennant_t350_project_equipment_hours_v1",
      quantityFormula: "area * passes / 2795 * obstruction_factor + cycle_hours + battery_hours",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`, `sourceVersion=${resolution.source_document_version}`,
        `sourceHash=${resolution.source_definition_hash}`, `result=${resolution.calculated_tennant_t350_project_equipment_hours}`,
        "resultUnit=equipment_hour", "operatorLaborSeparate=true", "manualDetailSeparate=true", "billingIncrementSeparate=true"].join("; "),
      includedInEstimate: true, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: [] };
  });
}
