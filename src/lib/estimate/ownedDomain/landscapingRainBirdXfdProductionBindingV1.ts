import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID, RAIN_BIRD_XFD_DRIPLINE_NORM_ID,
  RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA,
  RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
const QUESTIONS: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.map((id) => [id, `Укажите точное проектное значение: ${id}`]),
));
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function num(text: string, label: RegExp, unit = "") {
  const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu"));
  return match?.[1] ? decimal(match[1]) : null;
}
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractRainBirdXfdCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*rain\s+bird\s+xfd)(?=.*xfd-06-12-500)(?=.*d39717e)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID,
    exact_xfd_model: "XFD-06-12-500" };
  const numbers: readonly (readonly [string, RegExp, string])[] = [
    ["approved_dripline_route_linear_m", /approved\s+dripline\s+route/iu, "(?:m|linear_m)"],
    ["emitter_spacing_cm", /emitter\s+spacing/iu, "cm"], ["emitter_flow_l_h", /emitter\s+flow/iu, "(?:l\/h|l_h)"],
    ["zone_inlet_pressure_bar", /zone\s+inlet\s+pressure/iu, "bar"], ["zone_total_flow_l_h", /zone\s+total\s+flow/iu, "(?:l\/h|l_h)"],
    ["filtration_mesh", /filtration/iu, "mesh"], ["selected_coil_length_m", /selected\s+coil\s+length/iu, "m"],
    ["project_cutting_allowance_percent", /project\s+cutting\s+allowance/iu, "%"],
  ];
  for (const [id, label, unit] of numbers) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["irrigated_planting_area_and_layout", /irrigated\s+planting\s+layout/iu],
    ["maximum_lateral_length_table_check", /maximum\s+lateral\s+table\s+check/iu],
    ["zone_hydraulic_design", /zone\s+hydraulic\s+design/iu], ["water_source_and_quality", /water\s+source\s+and\s+quality/iu],
    ["pressure_regulation_scope", /pressure\s+regulation\s+scope/iu], ["header_and_manifold_schedule", /header\s+and\s+manifold\s+schedule/iu],
    ["fitting_schedule", /fitting\s+schedule/iu], ["flush_point_schedule", /flush\s+point\s+schedule/iu],
    ["elevation_and_slope_conditions", /elevation\s+and\s+slope\s+conditions/iu],
    ["reusable_coil_remainder_plan", /reusable\s+coil\s+remainder\s+plan/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function rainBirdXfdMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID) return [];
  return RAIN_BIRD_XFD_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => parameters[id] == null).map((id) => QUESTIONS[id] ?? id);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.includes("linear_m") || id === "selected_coil_length_m" ? "linear_m" : id.endsWith("_cm") ? "cm" :
      id.endsWith("_bar") ? "bar" : id.endsWith("_l_h") ? "l/h" : id.endsWith("_percent") ? "percent" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-rain-bird-prompt:${id}`,
    captured_at: "consumer-rain-bird-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact Rain Bird XFD project request." }]));
}
export function applyRainBirdXfdPhysicalNormToLandscapingBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== RAIN_BIRD_XFD_06_12_500_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "irrigation_system" || plan.semanticFrame.materialSystem !== "rain_bird_xfd_06_12_500") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "DRIP_IRRIGATION", operation_class: "INSTALL",
    material_system: "RAIN_BIRD_XFD_06_12_500", scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = { ...row, professionalPhysicalNormApplicabilityV1: resolution, name: "Капельная линия Rain Bird XFD-06-12-500 по утверждённой гидравлической трассе",
      templateId: "landscaping:rain-bird-xfd-06-12-500:v1", templateVersion: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_document_version,
      normId: RAIN_BIRD_XFD_DRIPLINE_NORM_ID, normFamilyId: "norm_family:landscaping:rain_bird_xfd",
      normSourceId: RAIN_BIRD_XFD_DRIPLINE_SOURCE_ID, normSourceTitle: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_title,
      normVersion: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_document_version, normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const, normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Rain Bird Corporation", normSourceEffectiveDate: "2022-04-21", normSourceCheckedAt: "2026-09-12",
      normSourceReference: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: RAIN_BIRD_XFD_DRIPLINE_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public", normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "rain_bird_xfd_project_dripline_linear_m", materialKey: "rain_bird_xfd_06_12_500_dripline" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Количество заблокировано до точного XFD-моделя, гидравлической проверки зоны, ведомостей фитингов и явного плана резки.",
      formulaId: "rain_bird_xfd_dripline_blocked_v1", quantityFormula: "blocked until exact product and hydraulic inputs are explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    return { ...source, quantity: resolution.calculated_rain_bird_xfd_project_dripline_linear_m!, unit: "linear_m",
      sourcePolicy: "configured_reference" as const,
      comment: "Чистая длина равна утверждённой трассе; добавлен только явный проектный запас резки. Фитинги, коллекторы и округление бухт — отдельно.",
      formulaId: "rain_bird_xfd_project_dripline_linear_m_v1",
      quantityFormula: "approved_route_linear_m * (1 + explicit_project_cutting_allowance_percent / 100)",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_rain_bird_xfd_project_dripline_linear_m}`, "resultUnit=linear_m",
        "manufacturerWasteDefault=false", "coilCutPlanSeparate=true", "hydraulicDesignConfirmed=true"].join("; "),
      includedInEstimate: true, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: [] };
  });
}
