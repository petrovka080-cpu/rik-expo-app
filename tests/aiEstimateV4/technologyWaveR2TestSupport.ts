import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
  buildInteriorFinishesProductionDraftV1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { technologyWaveParameterValues } from "./technologyWaveR1TestSupport";

export const TECHNOLOGY_WAVE_R2_CAPTURED_AT = "2026-08-13T18:00:00.000Z";

export function exactTechnologyWaveR2Parts(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TECHNOLOGY_WAVE_R2_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory);
  if (!parts) throw new Error(`TECHNOLOGY_WAVE_R2_PARTS_MISSING:${catalogId}`);
  return parts;
}

export function technologyWaveR2ParameterValues(catalogId: string): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return technologyWaveParameterValues(catalogId);
}

export function technologyWaveR2ParamOverrides(catalogId: string) {
  return Object.fromEntries(Object.entries(technologyWaveR2ParameterValues(catalogId)).map(([key, value]) => [
    key,
    { value: value.value, source: "user_input" as const, sourceText: value.source_id, lastChangedAt: TECHNOLOGY_WAVE_R2_CAPTURED_AT },
  ]));
}

export function compileTechnologyWaveR2Work(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TECHNOLOGY_WAVE_R2_INVENTORY_MISSING:${catalogId}`);
  const operation = catalogId.match(/_drywall_ceiling_(prepare|frame|align|insulate|clad|finish_joint|repair)_/u)?.[1]?.toUpperCase() ?? "UNKNOWN";
  return buildInteriorFinishesProductionDraftV1({
    catalog_id: catalogId,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: technologyWaveR2ParameterValues(catalogId),
    normative_request: {
      country: "KG", region: "Bishkek", funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR", construction_state: operation === "REPAIR" ? "REPAIR" : "NEW",
      contract_basis: [], effective_date: "2026-08-13", material_system: "FLAT_CEILING",
      operation_class: operation,
      rate_code_by_source_id: {
        KG_KRER_10_05_011: "Е10-05-011-02-PARTIAL-APPLICABILITY",
        kg_krerr_2015_application_guidance: "PROJECT-VERIFIED-KRERr-CODE",
        KG_PROJECT_RESOURCE_CALCULATION_V6: `PROJECT-RESOURCE-CALC-${operation}`,
      },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
}

export function allTechnologyWaveR2Parts() {
  return DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6.map(exactTechnologyWaveR2Parts);
}

export function compileAllTechnologyWaveR2Works() {
  return DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6.map(compileTechnologyWaveR2Work);
}
