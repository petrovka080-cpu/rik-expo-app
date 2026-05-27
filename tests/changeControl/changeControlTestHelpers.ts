import {
  approveEstimateConfigChange,
  createEstimateConfigChange,
  publishEstimateConfigChange,
  validateEstimateConfigChange,
  type EstimateChangeEntityType,
  type EstimateConfigPayload,
} from "../../src/lib/ai/changeControl";
import {
  createSeededChangeControlStore,
  runChangeControlScenario,
  validBoqPayload,
  validCatalogPayload,
  validDangerousPayload,
  validFormulaPayload,
  validPdfPayload,
  validRatePayload,
  validTaxPayload,
  validTemplatePayload,
} from "../../scripts/e2e/aiEstimateChangeControlProof.shared";

export {
  createSeededChangeControlStore,
  runChangeControlScenario,
  validBoqPayload,
  validCatalogPayload,
  validDangerousPayload,
  validFormulaPayload,
  validPdfPayload,
  validRatePayload,
  validTaxPayload,
  validTemplatePayload,
};

export function validatePayload(entityType: EstimateChangeEntityType, entityId: string, payload: EstimateConfigPayload) {
  const store = createSeededChangeControlStore();
  const change = createEstimateConfigChange(store, {
    entity_type: entityType,
    entity_id: entityId,
    new_payload: payload,
    actor_id: "test",
  });
  const run = validateEstimateConfigChange(store, change.id);
  return { store, change, run };
}

export function publishValidTemplateChange() {
  const store = createSeededChangeControlStore();
  const change = createEstimateConfigChange(store, {
    entity_type: "GLOBAL_ESTIMATE_TEMPLATE",
    entity_id: "roof_waterproofing",
    new_payload: validTemplatePayload(),
    actor_id: "test",
  });
  validateEstimateConfigChange(store, change.id);
  approveEstimateConfigChange(store, change.id, "approver", "ok");
  const active = publishEstimateConfigChange(store, change.id, "publisher");
  return { store, change, active };
}
