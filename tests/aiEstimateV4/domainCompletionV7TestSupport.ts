import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallDomainCompletionProfessionalPackagePartsV7,
  buildInteriorFinishesProductionDraftV1,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { technologyWaveParameterValues } from "./technologyWaveR1TestSupport";

export const BATCH004_CAPTURED_AT = "2026-08-13T18:30:00.000Z";

export function exactDomainCompletionParts(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH004_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory);
  if (!parts) throw new Error(`BATCH004_PARTS_MISSING:${catalogId}`);
  return parts;
}

export function domainCompletionParameterValues(catalogId: string): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return technologyWaveParameterValues(catalogId);
}

export function compileDomainCompletionWork(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH004_INVENTORY_MISSING:${catalogId}`);
  const parts = exactDomainCompletionParts(catalogId);
  return buildInteriorFinishesProductionDraftV1({
    catalog_id: catalogId,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: domainCompletionParameterValues(catalogId),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: parts.contract.operation === "REPAIR" ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-13",
      material_system: "DRYWALL_DOMAIN",
      operation_class: parts.contract.operation,
      rate_code_by_source_id: {
        KG_KRER_10_05_011: "Е10-05-011-PARTIAL-APPLICABILITY",
        kg_krerr_2015_application_guidance: "PROJECT-VERIFIED-KRERr-CODE",
      },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
}

export function allDomainCompletionParts() {
  return DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map(exactDomainCompletionParts);
}

export function compileAllDomainCompletionWorks() {
  return DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map(compileDomainCompletionWork);
}
