import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import {
  DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3,
  DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3,
} from "./drywallCeilingBulkheadNormativeProofV3";
import type { DrywallArchitecturalElementProfessionalPackagePartsV4 } from "./drywallArchitecturalElementsProfessionalV4";

export function buildDrywallArchitecturalElementNormativeProofV4(parts: DrywallArchitecturalElementProfessionalPackagePartsV4) {
  const contract = parts.contract;
  const kgSources = [
    { source_id: "KG_SP_KR_65_101_2025", role: "KG_CONSTRUCTION_NORM_PRIMARY + KG_ACCEPTANCE_AND_TESTING", locators: ["4.4–4.9", "7.7.1–7.7.5", "таблица 7.8"] },
    { source_id: contract.operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011", role: "KG_ESTIMATE_RATE_PRIMARY", locators: contract.operation === "REPAIR" ? ["КРЕРр-2015, п. 3.3", "точный проектный код расценки"] : ["раздел 5", "таблица 10-05-011", "PDF 97–99", "Е10-05-011-01/02"] },
    { source_id: "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE", role: "KG_MATERIAL_STANDARD", locators: ["действующий сертификат партии", "паспорт совместимой системы", "проектная спецификация"] },
    { source_id: "KG_SN_KR_12_01_2018", role: "KG_SAFETY_PRIMARY", locators: ["ППР/технологическая карта", "рабочая зона", "работы на высоте", "СИЗ"] },
  ];
  const withoutHash = {
    schema_version: "DrywallArchitecturalElementNormativeProofV4" as const,
    bundle_id: contract.normative_proof_bundle_id,
    catalog_id: contract.catalog_id,
    group_key: contract.group_key,
    variant: contract.variant,
    kg_sources: kgSources,
    regional_decisions: DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3.map((decision) => ({ ...decision, applies_to_catalog_id: contract.catalog_id, foreign_mandatory_for_kg: false as const })),
    international_decisions: DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3.map((decision) => ({ ...decision, applies_to_catalog_id: contract.catalog_id, foreign_mandatory_for_kg: false as const })),
    unresolved_jurisdiction_decisions: 0,
    foreign_promoted_to_kg_mandatory_without_basis: 0,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function buildDrywallArchitecturalElementProfessionalProofV4(parts: DrywallArchitecturalElementProfessionalPackagePartsV4) {
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const withoutHash = {
    schema_version: "DrywallArchitecturalElementProfessionalProofV4" as const,
    bundle_id: parts.contract.professional_proof_bundle_id,
    catalog_id: parts.contract.catalog_id,
    group_key: parts.contract.group_key,
    variant: parts.contract.variant,
    parameter_ids: parts.schema.parameters.map((parameter) => parameter.parameter_id),
    row_ids: rows.map((row) => row.row_id),
    formula_ids: rows.map((row) => row.formula.formula_id),
    cost_owner_ids: rows.map((row) => row.cost_owner_id),
    price_route_count: rows.filter((row) => row.price_route_v3 != null).length,
    normative_trace_count: rows.filter((row) => (row.normative_trace_v3?.length ?? 0) === 4).length,
    hidden_numeric_defaults: 0,
    padding_rows: 0,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
