import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { getAsphaltRelatedBaselineAssumptionV4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedBaselineAssumptionsV4";
import { ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4";
import { getAsphaltRelatedProfileByCatalogRecordIdV4 } from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import { CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID } from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";
import {
  WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
  WALL_PUTTY_CT127_KRER15_RATE_CODE,
  WALL_PUTTY_CT127_KRER15_WORK_KEY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1";

type AuditParamValue = EstimateDraftRevision["params"][string]["value"];

export function selectProfessionalBoq11610AuditEditableParam(
  revision: EstimateDraftRevision,
): string | null {
  return revision.trace.params
    .filter((param) =>
      param.affectsRowIds.length > 0 &&
      typeof revision.params[param.key]?.value === "number")
    .sort((left, right) =>
      right.affectsRowIds.length - left.affectsRowIds.length || left.key.localeCompare(right.key))[0]
    ?.key ?? null;
}

export function nextProfessionalBoq11610AuditNumericValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "2";
  return String(Math.max(1, Math.round((value * 1.23 + 1) * 100) / 100));
}

export function boundaryProfessionalBoq11610AuditNumericValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "100";
  return String(Math.max(100, Math.round((Math.abs(value) * 12 + 10) * 100) / 100));
}

function auditParam(
  value: AuditParamValue,
  sourceText: string,
  createdAt: string,
): EstimateDraftRevision["params"][string] {
  return {
    value,
    source: "user_input",
    sourceText: `professional-catalog-audit:${sourceText}`,
    lastChangedAt: createdAt,
  };
}

/**
 * Explicit, test-owned project inputs needed by fail-closed catalog owners.
 * Both complete-catalog acceptance paths use this function so that they prove
 * the same compiler contract without introducing product defaults.
 */
export function buildProfessionalBoq11610AuditParamOverrides(
  templateId: string,
  createdAt: string,
): EstimateDraftRevision["params"] | undefined {
  const overrides: EstimateDraftRevision["params"] = {};
  const registered = resolveRegisteredProfessionalEstimateSelectionV1(templateId);

  if (registered) {
    const declaredParameterIds = new Set(
      registered.canonical_parameter_schema.definitions.map((definition) => definition.parameterId),
    );
    if (declaredParameterIds.has("normative_rate_code")) {
      overrides.normative_rate_code = auditParam(
        "PROJECT-VERIFIED-EXACT-RATE-CODE",
        "project-confirmed-normative-rate",
        createdAt,
      );
    }
    if (declaredParameterIds.has("access_equipment_shift_count")) {
      overrides.access_equipment_shift_count = auditParam(
        3,
        "project-confirmed-access-schedule",
        createdAt,
      );
    }
    if (declaredParameterIds.has("access_delivery_trip_count")) {
      overrides.access_delivery_trip_count = auditParam(
        2,
        "project-confirmed-access-schedule",
        createdAt,
      );
    }
    if (registered.work_key === WALL_PUTTY_CT127_KRER15_WORK_KEY) {
      Object.assign(overrides, {
        area_m2: auditParam(10, "measured-area", createdAt),
        estimate_scope_mode: auditParam("FULL_APPLICABLE_SCOPE", "full-applicable-scope", createdAt),
        product_profile_id: auditParam(
          CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
          "selected-ct127-passport",
          createdAt,
        ),
        normative_rate_code: auditParam(WALL_PUTTY_CT127_KRER15_RATE_CODE, "exact-krer-rate", createdAt),
        [WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID]: auditParam(
          true,
          "krer-applicability-confirmed",
          createdAt,
        ),
        funding_source: auditParam("PRIVATE_RECOMMENDED", "private-funding", createdAt),
        project_type: auditParam("CATALOG_REGRESSION_AUDIT", "project-type", createdAt),
        surface_type: auditParam("CONCRETE", "surface-type", createdAt),
        substrate_type: auditParam("concrete", "substrate-type", createdAt),
        substrate_absorbency: auditParam("absorbent", "substrate-absorbency", createdAt),
        substrate_load_bearing_dry_clean_confirmed: auditParam(
          true,
          "substrate-condition-confirmed",
          createdAt,
        ),
        substrate_preparation_system: auditParam("CERESIT_CT17", "substrate-preparation", createdAt),
        selected_consumption_kg_m2: auditParam(0.7, "project-selected-consumption", createdAt),
        dry_interior_no_permanent_humidity_confirmed: auditParam(true, "dry-interior-confirmed", createdAt),
        application_temperature_confirmed: auditParam(true, "application-temperature-confirmed", createdAt),
        layer_thickness_mm: auditParam(1, "project-layer-thickness", createdAt),
      });
    }
  }

  const selectedRoadScope = /(?:^|_)village_road_construction_|(?:^|_)road_construction_/u.test(templateId)
    ? "FULL_ROAD_INFRASTRUCTURE"
    : /(?:^|_)asphalt_concrete_pavement_/u.test(templateId)
      ? "FULL_PAVEMENT_STRUCTURE"
      : null;
  if (selectedRoadScope) {
    overrides.selectedRoadScope = auditParam(selectedRoadScope, "explicit-road-scope", createdAt);
  }

  const asphaltRelatedProfile = getAsphaltRelatedProfileByCatalogRecordIdV4(templateId);
  if (asphaltRelatedProfile?.canonicalWorkKey === "bridge_asphalt") {
    const bridgeValues: Record<string, AuditParamValue> = {
      geometry_method: "rectangle",
      length_m: 20,
      width_m: 5,
      bridge_deck_system_confirmed: true,
      waterproofing_type: "ROLLED",
      waterproofing_condition: "ACCEPTED",
      protective_layer_thickness_mm: 40,
      binder_layer_thickness_mm: 60,
      binder_mix_type: "DENSE_COARSE_GRAINED",
      wearing_layer_thickness_mm: 50,
      wearing_mix_type: "DENSE_FINE_GRAINED",
      asphalt_density_t_m3: 2.35,
      traffic_class: "HEAVY",
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      project_scope: "SURFACING_ONLY",
    };
    for (const parameterId of ASPHALT_MINIMAL_RESOURCE_REQUIRED_KEYS_V4) {
      const baseline = getAsphaltRelatedBaselineAssumptionV4(asphaltRelatedProfile, parameterId);
      if (baseline) bridgeValues[parameterId] = baseline.value;
    }
    bridgeValues.emulsion_rate_l_m2 = bridgeValues.base_emulsion_rate_l_m2;
    for (const [parameterId, value] of Object.entries(bridgeValues)) {
      overrides[parameterId] = auditParam(
        value,
        `bridge-r9-explicit-input:${parameterId}`,
        createdAt,
      );
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}
