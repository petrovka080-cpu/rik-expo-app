import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";

const scenario = buildEstimateRevisionAuditScenario();
const quantityRow = getCurrentEstimateRevision(scenario.quantity).editable_estimate_snapshot.rows[0];
const priceRow = getCurrentEstimateRevision(scenario.price).editable_estimate_snapshot.rows[0];

assertAuditPass(quantityRow.quantity === 12, "quantity edit did not persist");
assertAuditPass(priceRow.priceSource === "user", "manual price source not user");
assertAuditPass(priceRow.priceSourceId == null, "manual price leaked source id");

writeEstimateRevisionArtifact("manual_edit_revision_results.json", {
  passed: true,
  quantity_revision: getCurrentEstimateRevision(scenario.quantity).version_number,
  price_revision: getCurrentEstimateRevision(scenario.price).version_number,
  manual_quantity: quantityRow.quantity,
  manual_unit_price: priceRow.unitPrice,
  manual_total_price: priceRow.totalPrice,
  manual_price_source: priceRow.priceSource,
  manual_price_source_id: priceRow.priceSourceId ?? null,
});
