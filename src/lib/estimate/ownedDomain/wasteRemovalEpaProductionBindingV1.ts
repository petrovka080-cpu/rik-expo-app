import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../../ai/estimatorKernel/estimatorKernelTypes";
import type { ProfessionalParameterValueV4 } from "../v4/professionalProjectAssemblyV4";
import { EPA_CD_COMPOSITE_NORM_ID, EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID, EPA_CD_COMPOSITE_REQUIRED_IDS,
  EPA_CD_COMPOSITE_SOURCE_ID, EPA_CD_COMPOSITE_SOURCE_METADATA, EPA_CD_CONCRETE_NORM_ID,
  EPA_CD_CONCRETE_PRODUCT_PROFILE_ID, EPA_CD_CONCRETE_REQUIRED_IDS, EPA_CD_CONCRETE_SOURCE_ID,
  EPA_CD_CONCRETE_SOURCE_METADATA, resolveProfessionalPhysicalNormParameterValuesV1 } from "../v4/domainFactory";
type Primitive = string | number | boolean;
function decimal(raw: string) { const value = Number(raw.replace(/\s+/gu, "").replace(",", ".")); return Number.isFinite(value) ? value : null; }
function num(text: string, label: RegExp, unit = "") { const match = text.match(new RegExp(`${label.source}\\s*[:=]\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}`, "iu")); return match?.[1] ? decimal(match[1]) : null; }
function ref(text: string, label: RegExp) { return text.match(new RegExp(`${label.source}\\s*[:=]\\s*([^;\\n]+)`, "iu"))?.[1]?.trim() || null; }
export function extractEpaCdWasteCanonicalParametersV1(text: string): Readonly<Record<string, Primitive>> | null {
  const concrete = /(?=.*us\s+epa)(?=.*2016)(?=.*concrete\s+debris)(?=.*860\s*lb)/iu.test(text);
  const composite = /(?=.*us\s+epa)(?=.*2016)(?=.*composite\s+c&d)(?=.*417\s*lb)/iu.test(text);
  if (!concrete && !composite) return null;
  const result: Record<string, Primitive> = { product_profile_id: concrete ? EPA_CD_CONCRETE_PRODUCT_PROFILE_ID : EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID };
  const volumeId = concrete ? "measured_epa_compatible_concrete_debris_volume_m3" : "measured_epa_compatible_composite_cd_volume_m3";
  const volume = num(text, /measured\s+epa-compatible\s+volume/iu, "m3"); if (volume !== null) result[volumeId] = volume;
  const weighbridge = ref(text, /local\s+weighbridge\s+mass/iu);
  if (weighbridge) result.local_weighbridge_mass_kg_if_available = weighbridge === "NOT_AVAILABLE" ? weighbridge : decimal(weighbridge.replace(/\s*kg$/iu, "")) ?? weighbridge;
  const refs: (readonly [string, RegExp])[] = [["volume_measurement_method_and_state", /volume\s+measurement\s+method\s+and\s+state/iu],
    ["waste_material_class_confirmed", /waste\s+material\s+class/iu], ["local_hauler_container_payload_and_disposal_rules", /local\s+hauler\s+rules/iu],
    ["conversion_calculation_reference", /conversion\s+calculation\s+reference/iu]];
  if (concrete) refs.push(["concrete_piece_size_class", /concrete\s+piece\s+size\s+class/iu], ["rebar_condition", /rebar\s+condition/iu]);
  else refs.push(["composite_or_bulk_cd_row_selected", /composite\s+or\s+bulk\s+c&d\s+row/iu], ["container_compaction_state", /container\s+compaction\s+state/iu]);
  for (const [id, label] of refs) { const value = ref(text, label); if (value) result[id] = value; }
  return Object.freeze(result);
}
export function epaCdWasteMissingQuestionsRuV1(parameters: Readonly<Record<string, Primitive>> | null | undefined): string[] {
  const ids = parameters?.product_profile_id === EPA_CD_CONCRETE_PRODUCT_PROFILE_ID ? EPA_CD_CONCRETE_REQUIRED_IDS :
    parameters?.product_profile_id === EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID ? EPA_CD_COMPOSITE_REQUIRED_IDS : [];
  return ids.filter((id) => parameters?.[id] == null).map((id) => `Укажите точное проектное значение: ${id}`);
}
function explicitValues(parameters: Readonly<Record<string, Primitive>>): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, { value,
    unit_id: id.endsWith("_m3") ? "m3" : id.includes("mass_kg") && typeof value === "number" ? "kg" : null,
    source_type: "USER_EXPLICIT" as const, source_id: `consumer-epa-waste-prompt:${id}`,
    captured_at: "consumer-epa-waste-prompt-snapshot", confidence: "high" as const,
    applicability: "Value explicitly stated in the exact EPA C&D planning conversion request." }]));
}
export function applyEpaCdWastePhysicalNormToBoqV1(plan: EstimatorReasoningPlan,
  rows: readonly DynamicProfessionalBoqRow[]): DynamicProfessionalBoqRow[] {
  const parameters = plan.canonicalParameters, profile = parameters?.product_profile_id;
  const concrete = profile === EPA_CD_CONCRETE_PRODUCT_PROFILE_ID, composite = profile === EPA_CD_COMPOSITE_PRODUCT_PROFILE_ID;
  if ((!concrete && !composite) || plan.semanticFrame.object !== "epa_cd_waste_planning_mass") return [...rows];
  const resolution = resolveProfessionalPhysicalNormParameterValuesV1({ technology_class: "WASTE_VOLUME_TO_PLANNING_MASS", operation_class: "CONVERT",
    material_system: concrete ? "US_EPA_2016_CD_CONCRETE" : "US_EPA_2016_CD_COMPOSITE_REMAINDER",
    scope_mode: "FULL_APPLICABLE_SCOPE", parameter_values: explicitValues(parameters!) });
  const sourceMeta = concrete ? EPA_CD_CONCRETE_SOURCE_METADATA : EPA_CD_COMPOSITE_SOURCE_METADATA;
  const normId = concrete ? EPA_CD_CONCRETE_NORM_ID : EPA_CD_COMPOSITE_NORM_ID;
  const sourceId = concrete ? EPA_CD_CONCRETE_SOURCE_ID : EPA_CD_COMPOSITE_SOURCE_ID;
  return rows.map((row) => {
    if (row.code !== "logistics_1") return row;
    const source = { ...row, name: concrete ? "Плановая масса бетонного лома по US EPA 860 lb/yd³" : "Плановая масса composite C&D по US EPA 417 lb/yd³",
      templateId: concrete ? "waste-removal:us-epa:concrete:v1" : "waste-removal:us-epa:composite:v1",
      templateVersion: sourceMeta.source_document_version, normId, normFamilyId: "norm_family:waste_removal:us_epa_cd",
      normSourceId: sourceId, normSourceTitle: sourceMeta.source_title, normVersion: sourceMeta.source_document_version,
      normReviewStatus: "public_primary_reference_reviewed", normSourceProfile: "INTL_REFERENCE" as const,
      normSourceJurisdiction: "INTERNATIONAL_PROJECT", normSourcePublisher: "U.S. Environmental Protection Agency",
      normSourceEffectiveDate: "2016-04-01", normSourceCheckedAt: "2026-09-12", normSourceReference: sourceMeta.source_url,
      normSourceSnapshotSha256: sourceMeta.definition_hash, normSourceLicenseStatus: "public_government",
      normSourceLifecycleStatus: "ACTIVE" as const, rateKey: "epa_cd_planning_mass_kg", materialKey: "epa_cd_planning_mass" };
    if (resolution.status !== "APPLIED") return { ...source, quantity: 0, unitPrice: 0, sourcePolicy: "manual_review" as const,
      comment: "Плановая масса заблокирована до точного класса отходов, совместимого объёма и статуса локальной весовой.",
      formulaId: "epa_cd_planning_mass_blocked_v1", quantityFormula: "blocked until exact waste class and measurement state are explicit",
      calculationTrace: `physicalNorm=${resolution.norm_id}; status=${resolution.status}; blockers=${resolution.blockers.join("|")}`,
      includedInEstimate: false, includedInProcurement: false, optional: false, editable: false, parameterBlockerIds: resolution.blockers };
    return { ...source, quantity: resolution.calculated_epa_cd_planning_mass_kg!, unit: "kg", unitPrice: 0,
      sourcePolicy: "manual_review" as const,
      comment: "Плановая масса для recovery planning; локальная весовая имеет приоритет. Рейсы, контейнеры, тариф перевозчика и утилизация не выводятся из коэффициента EPA.",
      formulaId: "epa_cd_planning_mass_kg_v1", quantityFormula: "local_weighbridge_mass_or(volume_m3 * selected_epa_lb_yd3 * 0.45359237 / 0.764554857984)",
      calculationTrace: [`physicalNorm=${resolution.norm_id}`, `source=${resolution.source_id}`,
        `sourceVersion=${resolution.source_document_version}`, `sourceHash=${resolution.source_definition_hash}`,
        `result=${resolution.calculated_epa_cd_planning_mass_kg}`, "resultUnit=kg", "costBlockedSeparateHaulerRules=true",
        "tripContainerDisposalFeeDerivation=false"].join("; "), includedInEstimate: false, includedInProcurement: false,
      optional: false, editable: false, parameterBlockerIds: ["PRICE_SOURCE_REQUIRED:local_hauler_disposal_tariff"] };
  });
}
