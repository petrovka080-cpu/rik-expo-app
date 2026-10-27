import type { AiDomainRelationshipEntry } from "./aiDomainEntityTypes";

export const AI_DOMAIN_RELATIONSHIP_REGISTRY: readonly AiDomainRelationshipEntry[] = [
  { from: "project", to: "request", relationship: "project_request", evidenceRequired: true },
  { from: "request", to: "material", relationship: "request_material", evidenceRequired: true },
  { from: "request", to: "supplier", relationship: "request_supplier", evidenceRequired: true },
  { from: "material", to: "warehouse_item", relationship: "material_warehouse_item", evidenceRequired: true },
  { from: "warehouse_item", to: "stock_movement", relationship: "warehouse_item_stock_movement", evidenceRequired: true },
  { from: "project", to: "report", relationship: "project_report", evidenceRequired: true },
  { from: "project", to: "act", relationship: "project_act", evidenceRequired: true },
  { from: "project", to: "subcontract", relationship: "project_subcontract", evidenceRequired: true },
  { from: "subcontract", to: "contractor", relationship: "subcontract_contractor", evidenceRequired: true },
  { from: "supplier", to: "payment", relationship: "company_payment", evidenceRequired: true },
  { from: "supplier", to: "company_debt", relationship: "company_debt", evidenceRequired: true },
  { from: "real_estate_object", to: "project_estimate", relationship: "real_estate_project_estimate", evidenceRequired: true },
] as const;

export function listAiDomainRelationshipsForEntity(
  entity: AiDomainRelationshipEntry["from"] | AiDomainRelationshipEntry["to"],
): AiDomainRelationshipEntry[] {
  return AI_DOMAIN_RELATIONSHIP_REGISTRY.filter(
    (relationship) => relationship.from === entity || relationship.to === entity,
  );
}
