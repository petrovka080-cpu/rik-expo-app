import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export type SafeUnknownConstructionTriage = {
  classification: "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE";
  manualEstimatorRequired: true;
  neededInputs: string[];
  fakePricesGenerated: false;
  genericConstructionRowsGenerated: false;
};

export function buildSafeUnknownConstructionTriage(
  primitive: WorldConstructionPrimitive,
): SafeUnknownConstructionTriage {
  return {
    classification: "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE",
    manualEstimatorRequired: true,
    neededInputs: [
      `object_scope:${primitive.objectScope}`,
      `operation:${primitive.operation}`,
      "method",
      "quantity",
      "city_or_region",
      "site_access",
      "source_or_catalog_evidence",
    ],
    fakePricesGenerated: false,
    genericConstructionRowsGenerated: false,
  };
}
