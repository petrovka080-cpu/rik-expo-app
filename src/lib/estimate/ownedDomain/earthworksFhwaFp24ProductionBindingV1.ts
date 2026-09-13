import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { FHWA_FP24_SECTION208_NORM_ID, FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID,
  FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS, FHWA_FP24_SECTION208_SOURCE_ID,
  FHWA_FP24_SECTION208_SOURCE_METADATA, resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function num(text: string, label: RegExp, unit = "") { const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu")); return match?.[1] ? decimal(match[1]) : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractFhwaFp24Section208CanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  if (!/(?=.*fhwa\s+fp-?24)(?=.*section\s*208)(?=.*structural\s+backfill)/iu.test(text)) return null;
  const result: Record<string, Primitive> = { product_profile_id: FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID };
  const numbers: readonly (readonly [string, RegExp, string])[] = [
    ["compacted_backfill_depth_m", /compacted\s+backfill\s+depth/iu, "m"],
    ["selected_compacted_lift_thickness_m", /selected\s+compacted\s+lift\s+thickness/iu, "m"],
    ["aashto_t99_method_c_maximum_dry_density", /aashto\s+t99\s+method\s+c\s+maximum\s+dry\s+density/iu, "(?:kg\/m3)?"],
    ["required_density_percent", /required\s+density/iu, "%"], ["density_test_count_per_lift", /density\s+test\s+count\s+per\s+lift/iu, ""],
    ["concrete_design_strength_before_backfill_percent", /concrete\s+design\s+strength\s+before\s+backfill/iu, "%"],
  ];
  for (const [id, label, unit] of numbers) { const value = num(text, label, unit); if (value !== null) result[id] = value; }
  const refs: readonly (readonly [string, RegExp])[] = [
    ["project_supplemental_specification_revision", /project\s+supplemental\s+specification\s+revision/iu],
    ["structure_and_excavation_limits", /structure\s+and\s+excavation\s+limits/iu],
    ["material_source_and_section_704_01_qualification", /material\s+source\s+and\s+section\s+704\.01\s+qualification/iu],
    ["material_class_and_rock_content", /material\s+class\s+and\s+rock\s+content/iu],
    ["moisture_condition_and_optimum_moisture", /moisture\s+condition\s+and\s+optimum\s+moisture/iu],
    ["aashto_t310_or_approved_in_place_test_method", /aashto\s+t310\s+test\s+method/iu],
    ["even_placement_around_structure_sequence", /even\s+placement\s+sequence/iu],
    ["running_waterway_condition", /running\s+waterway\s+condition/iu], ["selected_compaction_equipment", /selected\s+compaction\s+equipment/iu],
    ["rocky_material_exception_procedure", /rocky\s+material\s+exception\s+procedure/iu],
    ["regional_code_and_geotechnical_specification", /regional\s+code\s+and\s+geotechnical\s+specification/iu],
  ];
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  if (/fhwa\s+fp-?24\s+project\s+applicability\s+confirmed/iu.test(text)) result.fhwa_fp24_project_applicability_confirmed = true;
  return Object.freeze(result);
}
export function fhwaFp24Section208MissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  if (parameters?.product_profile_id !== FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID) return [];
  return FHWA_FP24_SECTION208_REQUIRED_EXPLICIT_PARAMETER_IDS.filter((id) => parameters[id] == null)
    .map((id) => `Укажите точное проектное значение: ${id}`);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.endsWith("_m") ? "m" : id.endsWith("_percent") ? "percent" : id.includes("density") ? "kg/m3" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-fhwa-fp24-prompt:${id}`,
    captured_at: "consumer-fhwa-fp24-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact FHWA FP-24 Section 208 request." }]));
}
export function applyFhwaFp24PhysicalNormToEarthworksBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters;
  if (parameters?.product_profile_id !== FHWA_FP24_SECTION208_PRODUCT_PROFILE_ID ||
    plan.semanticFrame.object !== "structural_backfill" || plan.semanticFrame.materialSystem !== "fhwa_fp24_section208") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "STRUCTURAL_BACKFILL", operation_class: "BACKFILL",
    material_system: "FHWA_FP24_SECTION208_STRUCTURAL_BACKFILL", scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: explicitValues(parameters) });
  return rows.map((row) => {
    if (row.code !== "labor_1") return row;
    const source = { ...row, professionalPhysicalNormApplicabilityV1: resolution, name: "Послойная укладка и приёмка structural backfill по FHWA FP-24 §208",
      templateId: "earthworks:fhwa-fp24:section208:v1", templateVersion: FHWA_FP24_SECTION208_SOURCE_METADATA.source_document_version,
      normId: FHWA_FP24_SECTION208_NORM_ID, normFamilyId: "norm_family:earthworks:fhwa_fp24_section208",
      normSourceId: FHWA_FP24_SECTION208_SOURCE_ID, normSourceTitle: FHWA_FP24_SECTION208_SOURCE_METADATA.source_title,
      normVersion: FHWA_FP24_SECTION208_SOURCE_METADATA.source_document_version, normReviewStatus: "public_primary_standard_reviewed",
      normSourceProfile: "INTL_REFERENCE" as const, normSourceJurisdiction: "INTERNATIONAL_PROJECT",
      normSourcePublisher: "Federal Highway Administration", normSourceEffectiveDate: "2024-01-01", normSourceCheckedAt: "2026-09-12",
      normSourceReference: FHWA_FP24_SECTION208_SOURCE_METADATA.source_url,
      normSourceSnapshotSha256: FHWA_FP24_SECTION208_SOURCE_METADATA.definition_hash,
      normSourceLicenseStatus: "public_government", normSourceLifecycleStatus: "ACTIVE" as const,
      rateKey: "fhwa_fp24_structural_backfill_lift", materialKey: "structural_backfill_lift_acceptance" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Слои заблокированы до подтверждения §208, грунта, геотехники, толщины, плотности, испытаний и условий сооружения.",
      formulaId: "fhwa_fp24_structural_backfill_lifts_blocked_v1", quantityFormula: "blocked until every Section 208 input is explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    return { ...source, quantity: resolution.calculated_fhwa_fp24_structural_backfill_lift_count!, unit: "lift",
      sourcePolicy: "configured_reference" as const,
      comment: "Число слоёв округлено вверх по выбранной толщине не более 0,1524 м; испытания, техника и каменистое исключение заданы отдельно.",
      formulaId: "fhwa_fp24_structural_backfill_lift_count_v1", quantityFormula: "ceil(compacted_backfill_depth_m / selected_compacted_lift_thickness_m)",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_fhwa_fp24_structural_backfill_lift_count}`, "resultUnit=lift", "genericEarthworks=false",
        "densityTestsPerLift=2", "regionalGeotechnicalSpecificationExplicit=true"].join("; "),
      includedInEstimate: true, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: [] };
  });
}
