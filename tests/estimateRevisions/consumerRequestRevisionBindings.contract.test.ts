import {
  attachConsumerRepairMedia,
  approveConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  listConsumerRepairRequestHistory,
  restoreConsumerRepairEstimateRevision,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
} from "../../src/lib/consumerRequests";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { foundationDraftWithManualCatalogItem, MANUAL_CATALOG_ITEM } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

describe("consumer request estimate revision integration", () => {
  it("binds generated PDF to the exact edited revision and preserves that binding after later edits", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");

    bundle = updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity: 5 });
    const exportedRevision = getCurrentEstimateRevision(bundle.estimateRevisionState!);
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-15T01:00:00.000Z",
    });
    const pdf = bundle.pdfs[0];

    expect(pdf.revisionId).toBe(exportedRevision.revision_id);
    expect(pdf.revisionRowsHash).toBe(exportedRevision.rows_hash);
    expect(bundle.estimateRevisionState?.pdf_exports[0].pdf_export_revision_id).toBe(exportedRevision.revision_id);

    bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: item.id, unitPrice: 6100 });

    expect(getCurrentEstimateRevision(bundle.estimateRevisionState!).revision_id).not.toBe(exportedRevision.revision_id);
    expect(bundle.pdfs[0].revisionId).toBe(exportedRevision.revision_id);
  });

  it("binds marketplace payload and history row to the current revision", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-15T01:00:00.000Z",
    });
    bundle = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-15T01:30:00.000Z",
    });
    bundle = sendConsumerRepairRequestToMarketplace({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      idempotencyKey: `test:${bundle.draft.id}`,
    });
    const current = getCurrentEstimateRevision(bundle.estimateRevisionState!);

    expect(bundle.estimateRevisionState?.request_bindings[0]).toMatchObject({
      request_payload_id: bundle.marketplaceLink.marketplaceDemandId,
      request_revision_id: current.revision_id,
      request_rows_hash: current.rows_hash,
      request_recalculated_separately: false,
    });

    const historyRow = listConsumerRepairRequestHistory(bundle.draft.consumerUserId)[0];

    expect(historyRow.estimateRevisionState?.history_bindings[0]).toMatchObject({
      history_entry_id: `consumer_repair_history:${bundle.draft.id}`,
      history_revision_id: current.revision_id,
      history_rows_hash: current.rows_hash,
      history_recalculated_separately: false,
    });
  });

  it("restores an earlier consumer request revision as a new current revision", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");
    const originalRevision = getCurrentEstimateRevision(bundle.estimateRevisionState!);

    bundle = updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity: 5 });
    bundle = restoreConsumerRepairEstimateRevision({
      bundle,
      source_revision_id: originalRevision.revision_id,
      actor_id: bundle.draft.consumerUserId,
      created_at: "2026-06-15T02:00:00.000Z",
    });
    const restored = getCurrentEstimateRevision(bundle.estimateRevisionState!);

    expect(restored.version_number).toBe(4);
    expect(restored.source).toBe("RESTORED_FROM_REVISION");
    expect(restored.editable_estimate_snapshot.hash).toBe(originalRevision.editable_estimate_snapshot.hash);
    expect(bundle.items.find((row) => row.id === item.id)?.quantity).toBe(item.quantity);
  });
});
