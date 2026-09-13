import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID, SOUDAFOAM_GENIUS_NORM_ID,
  SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS, SOUDAFOAM_GENIUS_SOURCE_ID, SOUDAFOAM_GENIUS_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function num(text: string, label: RegExp, unit = "") { const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu")); return match?.[1] ? decimal(match[1]) : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractSoudafoamGeniusCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*soudafoam)(?=.*genius)(?=.*9900539)(?=.*600\s*ml)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID,
    exact_product_master_code: "9900539", package_volume_ml: 600 };
  const numbers: readonly (readonly [string, RegExp, string])[] = [
    ["qualified_joint_length_linear_m", /qualified\s+joint\s+length/iu, "m"], ["joint_width_mm", /joint\s+width/iu, "mm"],
    ["joint_depth_mm", /joint\s+depth/iu, "mm"], ["total_joint_volume_l", /total\s+joint\s+volume/iu, "l"],
    ["can_temperature_c", /can\s+temperature/iu, "c"], ["ambient_temperature_c", /ambient\s+temperature/iu, "c"],
    ["surface_temperature_c", /surface\s+temperature/iu, "c"], ["application_layer_count", /application\s+layer\s+count/iu, ""],
    ["onsite_validated_joint_yield_m_per_can", /onsite\s+validated\s+joint\s+yield/iu, "(?:m\/can|m_per_can)"],
  ];
  for (const [id, label, unit] of numbers) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["en_17333_1_reference_joint_geometry", /en\s*17333-1\s+reference\s+joint\s+geometry/iu],
    ["substrate_type_and_condition", /substrate\s+type\s+and\s+condition/iu],
    ["surface_moistening_condition", /surface\s+moistening\s+condition/iu],
    ["storage_and_expiry_condition", /storage\s+and\s+expiry\s+condition/iu],
    ["external_uv_and_weather_protection_scope", /external\s+uv\s+and\s+weather\s+protection\s+scope/iu],
    ["frame_fixings_tapes_membranes_and_sealants_scope", /frame\s+fixings\s+tapes\s+membranes\s+and\s+sealants\s+scope/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function soudafoamGeniusMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID) return [];
  return SOUDAFOAM_GENIUS_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => parameters[id] == null)
    .map((id) => `Укажите точное проектное значение: ${id}`);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.endsWith("_linear_m") ? "linear_m" : id.endsWith("_mm") ? "mm" : id.endsWith("_l") ? "l" :
      id.endsWith("_ml") ? "ml" : id.endsWith("_c") ? "celsius" : id.includes("yield_m_per_can") ? "m_per_can" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-soudafoam-prompt:${id}`,
    captured_at: "consumer-soudafoam-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact Soudafoam Genius joint request." }]));
}
export function applySoudafoamGeniusPhysicalNormToWindowsDoorsBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== SOUDAFOAM_GENIUS_9900539_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "window_door_joint" || plan.semanticFrame.materialSystem !== "soudafoam_genius_9900539") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "WINDOW_DOOR_JOINT_FOAM", operation_class: "INSTALL",
    material_system: "SOUDAFOAM_WINDOW_DOOR_GENIUS_9900539_600ML", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "material_1") return row;
    const source = { ...row, name: "Soudafoam Window & Door Genius 600 мл по проверенному выходу на объекте",
      templateId: "windows-doors:soudafoam-genius-9900539:v1", templateVersion: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_document_version,
      normId: SOUDAFOAM_GENIUS_NORM_ID, normFamilyId: "norm_family:windows_doors:soudafoam_genius",
      normSourceId: SOUDAFOAM_GENIUS_SOURCE_ID, normSourceTitle: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_title,
      normVersion: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_document_version, normReviewStatus: "manufacturer_primary_source_reviewed",
      normSourceProfile: "MANUFACTURER_TECHNICAL" as const, normSourceJurisdiction: "INTERNATIONAL_PROJECT", normSourcePublisher: "Soudal UK",
      normSourceEffectiveDate: "2026-05-08", normSourceCheckedAt: "2026-09-12",
      normSourceReference: SOUDAFOAM_GENIUS_SOURCE_METADATA.source_url, normSourceSnapshotSha256: SOUDAFOAM_GENIUS_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "manufacturer_public", normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "soudafoam_genius_600ml_can", materialKey: "soudafoam_window_door_genius_9900539" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Баллоны заблокированы до точной геометрии шва, температур и проверенного площадочного выхода.",
      formulaId: "soudafoam_genius_can_count_blocked_v1", quantityFormula: "blocked until exact joint and site-yield inputs are explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    return { ...source, quantity: resolution.calculated_soudafoam_genius_required_can_count!, unit: "can",
      sourcePolicy: "configured_reference" as const,
      comment: "Количество округлено вверх по проверенному выходу на объекте; 16 м из TDS не подменяет проектный выход, 750 мл/26 м исключён.",
      formulaId: "soudafoam_genius_required_can_count_v1", quantityFormula: "ceil(qualified_joint_length / onsite_validated_joint_yield_m_per_can)",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_soudafoam_genius_required_can_count}`, "resultUnit=can",
        "tds16mAsFixedProjectRate=false", "manufacturerWasteDefault=false", "different750mlProduct=false"].join("; "),
      includedInEstimate: true, includedInProcurement: true, optional: false, editable: false, parameterBlockerIds: [] };
  });
}
