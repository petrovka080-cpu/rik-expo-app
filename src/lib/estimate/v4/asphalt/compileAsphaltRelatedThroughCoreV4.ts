import type { BuildEstimateFromInlineWorkPromptInput } from "../../backendPlatform/canonicalEstimateHistoricalIngress";
import {
  compileProfessionalProjectAssemblyV4,
  type ProfessionalEstimateScopeModeV4,
  type ProfessionalParameterValueV4,
  type ProfessionalValueSourceTypeV4,
} from "../professionalProjectAssemblyV4";
import { ASPHALT_ASSOCIATED_WORK_CHILD_ASSEMBLIES_V4 } from "./asphaltAssociatedWorkAssembliesV4";
import { ASPHALT_REMOVAL_RESOURCE_ASSEMBLIES_V4 } from "./asphaltRemovalResourceAssembliesV4";
import {
  compileAsphaltProfessionalEstimateV4,
  type AsphaltCompiledBoqLineV4,
  type AsphaltProfessionalEstimateCompilationV4,
} from "./compileAsphaltProfessionalEstimateV4";
import type { AsphaltAssemblyProfileIdV4 } from "./asphaltPreliminaryAssemblyPolicyV4";
import type { AsphaltRelatedProfileV4 } from "./asphaltRelatedSemanticContractV4";
import { getAsphaltRelatedBaselineAssumptionV4 } from "./asphaltRelatedBaselineAssumptionsV4";

import {
  ASPHALT_SURFACING_RESOURCE_LEVEL_PARAMETER_KEYS_V4,
  ASPHALT_BRIDGE_RESOURCE_LEVEL_PARAMETER_KEYS_V4,
  ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4,
  ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4,
} from "./asphaltRelatedResourceParameterIdsV4";
export {
  ASPHALT_SURFACING_RESOURCE_LEVEL_PARAMETER_KEYS_V4,
  ASPHALT_BRIDGE_RESOURCE_LEVEL_PARAMETER_KEYS_V4,
  ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4,
  ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4,
} from "./asphaltRelatedResourceParameterIdsV4";

export type AsphaltRelatedCoreRowV4 = {
  rowId: string;
  titleRu: string;
  category: string;
  quantity: number;
  unit: string;
  formulaId: string;
  formulaExpression: string;
  calculationTrace: string;
  formulaInputValues: Readonly<Record<string, number>>;
  semanticOwner: string;
  costOwnership: string;
  costOwnerId: string;
  normativeSourceIds: readonly string[];
  parameterSourceIds: readonly string[];
  includedInProcurement: boolean;
  childPassportId: string | null;
  childRevisionId: string | null;
  scopeTriggerParameter: string | null;
  inclusionCondition: string;
  assumptionIds: readonly string[];
};

function sourceType(sourceText: string | null | undefined, baselineAssumption: boolean): ProfessionalValueSourceTypeV4 {
  if (baselineAssumption) return "VISIBLE_BASELINE_ASSUMPTION";
  const source = sourceText?.toUpperCase() ?? "";
  if (source.includes("VERIFIED_RATEBOOK")) return "VERIFIED_RATEBOOK";
  if (source.includes("APPLICABLE_NORM")) return "APPLICABLE_NORM";
  if (source.includes("PROJECT_DOCUMENT") || source.includes("PROJECT_")) return "PROJECT_DOCUMENT";
  if (source.includes("SURVEY")) return "SURVEY_MEASUREMENT";
  if (source.includes("LAB_RESULT")) return "LAB_RESULT";
  if (source.includes("MATERIAL_PASSPORT")) return "MATERIAL_PASSPORT";
  return "USER_EXPLICIT";
}

function parameterValues(
  input: BuildEstimateFromInlineWorkPromptInput,
  values: Readonly<Record<string, unknown>>,
  profile: AsphaltRelatedProfileV4,
  assumptionKeys: ReadonlySet<string>,
  derivedKeys: ReadonlySet<string>,
): Record<string, ProfessionalParameterValueV4> {
  const result: Record<string, ProfessionalParameterValueV4> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    const override = input.paramOverrides?.[key];
    const baseline = assumptionKeys.has(key) ? getAsphaltRelatedBaselineAssumptionV4(profile, key) : null;
    const sourceText = override?.source ?? null;
    const derived = derivedKeys.has(key);
    const type = derived ? "PROJECT_DOCUMENT" : sourceType(sourceText, baseline != null);
    result[key] = {
      value,
      unit_id: null,
      source_type: type,
      source_id: derived
        ? `derived:full-waterproofing-replacement:${key}=area_m2`
        : baseline?.sourceId ?? (sourceText?.trim() || `user-input:${key}`),
      captured_at: "1970-01-01T00:00:00.000Z",
      confidence: type === "USER_EXPLICIT" ? "medium" : "high",
      applicability: derived
        ? `exact catalog ${profile.canonicalCatalogRecordId}; full replacement area follows confirmed deck area`
        : `exact catalog ${profile.canonicalCatalogRecordId}; parameter ${key}`,
    };
  }
  return result;
}

export function resolveAsphaltRelatedAssemblyProfileV4(
  profile: AsphaltRelatedProfileV4,
  values: Readonly<Record<string, unknown>>,
  scopeMode: ProfessionalEstimateScopeModeV4,
): AsphaltAssemblyProfileIdV4 {
  if (profile.canonicalWorkKey === "asphalt_patch_repair") return "local_patch_repair";
  if (profile.canonicalWorkKey === "asphalt_overlay") return "overlay_on_existing_pavement";
  if (profile.canonicalWorkKey === "asphalt_milling") return "rehabilitation_with_milling";
  if (profile.canonicalWorkKey === "bridge_asphalt" || profile.canonicalWorkKey === "asphalt_base_layer") {
    return "surfacing_on_prepared_base";
  }
  const projectScope = String(values.project_scope ?? "");
  if (projectScope === "REHABILITATION") return "rehabilitation_with_milling";
  if (projectScope === "FULL_ROAD_INFRASTRUCTURE") {
    return "new_full_road_infrastructure";
  }
  if (scopeMode === "FULL_APPLICABLE_SCOPE" || projectScope === "PAVEMENT_STRUCTURE" || projectScope === "TURNKEY_PARKING_WITH_SITE_FEATURES") {
    return profile.applicationContext === "PARKING" || profile.applicationContext === "YARD_OR_SITE"
      ? "parking_full_construction"
      : "new_full_road_pavement";
  }
  return profile.applicationContext === "PARKING" || profile.applicationContext === "YARD_OR_SITE"
    ? "parking_surfacing_only"
    : "surfacing_on_prepared_base";
}

function copyCoreValues(
  profile: AsphaltRelatedProfileV4,
  values: Readonly<Record<string, unknown>>,
  assumptionKeys: ReadonlySet<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const entry = (key: string, value: unknown): { value: unknown; source: string; sourceText?: string } => {
    const baseline = assumptionKeys.has(key) ? getAsphaltRelatedBaselineAssumptionV4(profile, key) : null;
    return baseline
      ? { value, source: "default_assumption", sourceText: `${baseline.sourceId}:${baseline.sourceVersion}` }
      : { value, source: "edited_by_user" };
  };
  for (const key of ASPHALT_RESOURCE_LEVEL_CORE_PARAMETER_KEYS_V4) {
    const value = values[key];
    if (value !== undefined && value !== null && value !== "") result[key] = entry(key, value);
  }
  for (const key of [
    "area_m2",
    "length_m",
    "width_m",
    "truck_payload_t",
    "removal_depth_mm",
    "existing_asphalt_density_t_m3",
    "material_destination",
  ] as const) {
    const value = values[key];
    if (value !== undefined && value !== null && value !== "") result[key] = entry(key, value);
  }
  for (const key of [
    "asphalt_reference_design_id", "asphalt_reference_design_sha256",
    "asphalt_reference_design_manifest", "asphalt_reference_design_fingerprint",
  ] as const) {
    const value = values[key];
    if (typeof value === "string" && value.trim()) result[key] = { value, source: "user_input" };
  }
  return result;
}

function coreOverrides(
  profile: AsphaltRelatedProfileV4,
  values: Readonly<Record<string, unknown>>,
  scopeMode: ProfessionalEstimateScopeModeV4,
  assumptionKeys: ReadonlySet<string>,
): Record<string, unknown> {
  const result = copyCoreValues(profile, values, assumptionKeys);
  const length = values.length_m;
  const width = values.width_m;
  if (
    typeof length === "number" && Number.isFinite(length) && length > 0 &&
    typeof width === "number" && Number.isFinite(width) && width > 0 &&
    inputHasNoDirectArea(values)
  ) {
    result.area_m2 = {
      value: length * width,
      source: "user_input",
      sourceText: "area_m2 = length_m * width_m",
    };
  }
  if (
    result.area_m2 == null &&
    values.work_scope === "DEMOLITION_AND_REINSTATEMENT" &&
    typeof values.removal_area_m2 === "number" &&
    Number.isFinite(values.removal_area_m2) &&
    values.removal_area_m2 > 0
  ) {
    result.area_m2 = {
      value: values.removal_area_m2,
      source: "derived_from_explicit_removal_geometry",
    };
  }
  result.geometry_method = { value: "direct_area", source: "catalog_binding" };
  result.costing_mode = { value: "RESOURCE_MODE", source: "catalog_binding" };
  result.scope_profile = {
    value: resolveAsphaltRelatedAssemblyProfileV4(profile, values, scopeMode),
    source: "catalog_binding",
  };
  result.construction_mode = {
    value: ["asphalt_overlay", "asphalt_patch_repair", "asphalt_milling"].includes(profile.canonicalWorkKey) ? "repair" : "new_construction",
    source: "catalog_binding",
  };
  result.purpose = {
    value: profile.applicationContext === "PARKING" ? "yard_parking" : "public_road",
    source: "catalog_binding",
  };
  if (values.base_condition != null) {
    result.base_condition = { value: String(values.base_condition), source: "edited_by_user" };
  }
  result.emulsion_measurement_basis = { value: "litre", source: "catalog_binding" };
  if (values.base_emulsion_rate_l_m2 != null) {
    result.base_emulsion_rate_l_m2 = { value: values.base_emulsion_rate_l_m2, source: "edited_by_user" };
  }
  if (values.tack_coat_rate_l_m2 != null && values.emulsion_rate_l_m2 == null) {
    result.emulsion_rate_l_m2 = { value: values.tack_coat_rate_l_m2, source: "edited_by_user" };
  }

  const density = values.asphalt_density_t_m3 ?? values.new_asphalt_density_t_m3;
  const waste = values.asphalt_waste_percent;
  const coreMixtureType = (value: unknown): unknown => {
    if (value === "DENSE_FINE_GRAINED") return "dense_fine";
    if (value === "DENSE_COARSE_GRAINED") return "coarse_lower";
    if (value === "STONE_MASTIC") return "sma";
    if (value === "POROUS") return "porous";
    if (value === "PROJECT_SPECIFIED") return "project_spec";
    return value;
  };
  const layerInputs: { mixture: unknown; thickness: unknown }[] = [];
  if (profile.canonicalWorkKey === "asphalt_base_layer") {
    layerInputs.push({ mixture: values.binder_mix_type, thickness: values.binder_layer_thickness_mm });
  } else {
    if (values.binder_layer_required === true || values.binder_layer_thickness_mm != null) {
      layerInputs.push({ mixture: values.binder_mix_type, thickness: values.binder_layer_thickness_mm });
    }
    layerInputs.push({
      mixture: values.wearing_mix_type,
      thickness: values.wearing_layer_thickness_mm ?? values.reinstatement_depth_mm ?? values.removal_depth_mm,
    });
  }
  const completeLayers = layerInputs.filter((layer) => layer.mixture != null && layer.thickness != null);
  result.asphalt_layer_count = { value: completeLayers.length, source: "catalog_binding" };
  completeLayers.forEach((layer, index) => {
    const position = index + 1;
    result[`asphalt_layer_${position}_mixture_type`] = { value: coreMixtureType(layer.mixture), source: "edited_by_user" };
    result[`asphalt_layer_${position}_thickness_mm`] = { value: layer.thickness, source: "edited_by_user" };
    result[`asphalt_layer_${position}_density_t_m3`] = { value: density, source: "edited_by_user" };
    result[`asphalt_layer_${position}_waste_percent`] = { value: waste, source: "edited_by_user" };
  });

  if (scopeMode === "MINIMAL_EXPLICIT_SCOPE") {
    result.sand_layer_required = { value: false, source: "catalog_binding" };
    result.crushed_layer_count = { value: 0, source: "catalog_binding" };
    result.geotextile_required = { value: false, source: "catalog_binding" };
  }
  return result;
}

function inputHasNoDirectArea(values: Readonly<Record<string, unknown>>): boolean {
  // extractParameters exposes the deterministically derived area alongside
  // length/width. Preserve the explicit oneOf branch by detecting whether the
  // original dimensions are present and deriving the same value here.
  return typeof values.length_m === "number" && typeof values.width_m === "number";
}

function baseRow(
  row: AsphaltCompiledBoqLineV4,
  compilation: AsphaltProfessionalEstimateCompilationV4,
): AsphaltRelatedCoreRowV4 {
  const formula = compilation.passport.formulas.find((item) => item.formula_id === row.definition.formula_id);
  return {
    rowId: row.definition.row_id,
    titleRu: row.definition.professional_name_ru,
    category: row.definition.category,
    quantity: row.quantity,
    unit: row.definition.unit_id ?? "",
    formulaId: row.definition.formula_id ?? "",
    formulaExpression: formula?.expression ?? "",
    calculationTrace: row.definition.explanation_trace_ru,
    formulaInputValues: row.formula_input_values,
    // The core passport's semantic_owner_id identifies the reusable child
    // passport, not the individual BOQ resource. Resource-level cost and
    // formula traces need the row identity as their semantic owner.
    semanticOwner: row.definition.row_id,
    costOwnership: row.definition.costing_mode === "COMPOSITE_RATE"
      ? "priced_unit_rate"
      : row.definition.costing_mode === "RESOURCE_BASED"
        ? "priced_resource"
        : "informational_output",
    costOwnerId: row.definition.cost_ownership_id ?? `cost:${row.definition.row_id}`,
    normativeSourceIds: formula?.source_ids ?? [],
    parameterSourceIds: [],
    includedInProcurement: row.included_in_procurement,
    childPassportId: null,
    childRevisionId: null,
    scopeTriggerParameter: null,
    inclusionCondition: "EXACT_ASPHALT_CORE_RESOURCE_ASSEMBLY",
    assumptionIds: row.assumption_ids,
  };
}

export function compileAsphaltRelatedThroughCoreV4(input: {
  sourceInput: BuildEstimateFromInlineWorkPromptInput;
  profile: AsphaltRelatedProfileV4;
  values: Readonly<Record<string, unknown>>;
  scopeMode: ProfessionalEstimateScopeModeV4;
  assumptionKeys: ReadonlySet<string>;
  derivedKeys?: ReadonlySet<string>;
}): {
  baseCompilation: AsphaltProfessionalEstimateCompilationV4;
  childCompilation: ReturnType<typeof compileProfessionalProjectAssemblyV4>;
  rows: AsphaltRelatedCoreRowV4[];
  blockers: string[];
} {
  const parameterOverrides = coreOverrides(input.profile, input.values, input.scopeMode, input.assumptionKeys);
  const assemblyProfile = resolveAsphaltRelatedAssemblyProfileV4(input.profile, input.values, input.scopeMode);
  const visiblePreliminaryAssembly = assemblyProfile === "new_full_road_infrastructure" ||
    assemblyProfile === "parking_full_construction";
  let baseCompilation: AsphaltProfessionalEstimateCompilationV4;
  try {
    baseCompilation = compileAsphaltProfessionalEstimateV4({
      raw_text: input.sourceInput.rawInput,
      parameter_overrides: parameterOverrides,
      ...(visiblePreliminaryAssembly ? {} : { assumption_policy: "FORBID_QUANTITY_ASSUMPTIONS" as const }),
      profile_override: assemblyProfile,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    if (cause.startsWith("ASPHALT_V4_QUANTITY_BASIS_MISSING")) {
      throw new Error([
        cause,
        `catalog=${input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? input.profile.canonicalCatalogRecordId}`,
        `area=${JSON.stringify(parameterOverrides.area_m2 ?? null)}`,
        `length=${JSON.stringify(parameterOverrides.length_m ?? null)}`,
        `width=${JSON.stringify(parameterOverrides.width_m ?? null)}`,
      ].join(";"));
    }
    throw error;
  }
  const childCompilation = compileProfessionalProjectAssemblyV4({
    project_assembly_id: `asphalt:${input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? input.profile.canonicalWorkKey}:${input.scopeMode}`,
    parent_passport_id: input.profile.passportId,
    parent_revision_id: null,
    requested_catalog_id: input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? input.profile.canonicalCatalogRecordId,
    requested_work_key: input.profile.canonicalWorkKey,
    scope_mode: input.scopeMode,
    parameter_values: parameterValues(
      input.sourceInput,
      input.values,
      input.profile,
      input.assumptionKeys,
      input.derivedKeys ?? new Set(),
    ),
    child_assemblies: ASPHALT_ASSOCIATED_WORK_CHILD_ASSEMBLIES_V4,
  });
  const childRows: AsphaltRelatedCoreRowV4[] = childCompilation.compiled_rows.map((row) => ({
    rowId: row.row_id,
    titleRu: row.title_ru,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit_id,
    formulaId: row.formula_id,
    formulaExpression: row.formula_expression,
    calculationTrace: row.calculation_trace,
    formulaInputValues: row.formula_input_values,
    semanticOwner: row.semantic_owner,
    costOwnership: row.cost_ownership,
    costOwnerId: row.cost_owner_id,
    normativeSourceIds: row.normative_source_ids,
    parameterSourceIds: row.parameter_source_ids,
    includedInProcurement: row.procurement_eligible,
    childPassportId: row.child_passport_id,
    childRevisionId: row.child_revision_id,
    scopeTriggerParameter: row.scope_trigger_parameter,
    inclusionCondition: row.inclusion_condition,
    assumptionIds: [],
  }));
  return {
    baseCompilation,
    childCompilation,
    rows: [...baseCompilation.compiled_rows.map((row) => baseRow(row, baseCompilation)), ...childRows],
    blockers: [
      ...baseCompilation.compile_blockers,
      ...baseCompilation.passport.unresolved_requirements,
      ...childCompilation.requirements.map((item) => `${item.code}:${item.parameter_id}`),
    ],
  };
}

export function compileAsphaltRemovalThroughCoreV4(input: {
  sourceInput: BuildEstimateFromInlineWorkPromptInput;
  profile: AsphaltRelatedProfileV4;
  values: Readonly<Record<string, unknown>>;
  scopeMode: ProfessionalEstimateScopeModeV4;
  assumptionKeys: ReadonlySet<string>;
}): {
  childCompilation: ReturnType<typeof compileProfessionalProjectAssemblyV4>;
  rows: AsphaltRelatedCoreRowV4[];
  blockers: string[];
} {
  const removalValues: Readonly<Record<string, unknown>> = {
    ...input.values,
    // Exact removal catalog selections always own the resource removal
    // package. This is binding metadata, not a guessed project quantity.
    asphalt_removal_package_required: true,
    ...(input.profile.canonicalWorkKey === "asphalt_milling"
      ? { removal_method: "COLD_MILLING" }
      : {}),
  };
  const childCompilation = compileProfessionalProjectAssemblyV4({
    project_assembly_id: `asphalt-removal:${input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? input.profile.canonicalWorkKey}:${input.scopeMode}`,
    parent_passport_id: input.profile.passportId,
    parent_revision_id: null,
    requested_catalog_id: input.sourceInput.selectedWorkKey ?? input.sourceInput.selectedTemplateId ?? input.profile.canonicalCatalogRecordId,
    requested_work_key: input.profile.canonicalWorkKey,
    scope_mode: input.scopeMode,
    parameter_values: parameterValues(
      input.sourceInput,
      removalValues,
      input.profile,
      input.assumptionKeys,
      new Set(),
    ),
    child_assemblies: ASPHALT_REMOVAL_RESOURCE_ASSEMBLIES_V4,
  });
  const rows: AsphaltRelatedCoreRowV4[] = childCompilation.compiled_rows.map((row) => ({
    rowId: row.row_id,
    titleRu: row.title_ru,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit_id,
    formulaId: row.formula_id,
    formulaExpression: row.formula_expression,
    calculationTrace: row.calculation_trace,
    formulaInputValues: row.formula_input_values,
    semanticOwner: row.semantic_owner,
    costOwnership: row.cost_ownership,
    costOwnerId: row.cost_owner_id,
    normativeSourceIds: row.normative_source_ids,
    parameterSourceIds: row.parameter_source_ids,
    includedInProcurement: row.procurement_eligible,
    childPassportId: row.child_passport_id,
    childRevisionId: row.child_revision_id,
    scopeTriggerParameter: row.scope_trigger_parameter,
    inclusionCondition: row.inclusion_condition,
    assumptionIds: [],
  }));
  return {
    childCompilation,
    rows,
    blockers: childCompilation.requirements.map((item) => `${item.code}:${item.parameter_id}`),
  };
}
