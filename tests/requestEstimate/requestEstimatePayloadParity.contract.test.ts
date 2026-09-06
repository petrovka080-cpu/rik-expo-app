import {
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  updateConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  approveCanonicalConsumerRepairAuditDraft,
  reprojectCanonicalConsumerRepairAuditDraft,
  sendCanonicalConsumerRepairAuditDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import {
  foundationDraftWithManualCatalogItem,
  MANUAL_CATALOG_ITEM,
} from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate payload parity", () => {
  it("keeps canonical save, PDF, and send payloads aligned", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    bundle = updateConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      patch: {
        city: "Bishkek",
        addressText: "Bishkek, payload parity test address",
        contactPhone: "+996700000000",
      },
    });
    bundle = reprojectCanonicalConsumerRepairAuditDraft(bundle, "request-estimate-payload-parity");
    const savePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");

    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    bundle = approveCanonicalConsumerRepairAuditDraft({ bundle });
    const pdfPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");

    bundle = sendCanonicalConsumerRepairAuditDraft({
      bundle,
      idempotencyKey: `payload-parity:${bundle.draft.id}`,
    });
    const sendPayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");

    const parity = compareConsumerRepairPayloadParity({
      draftSave: savePayload,
      pdfGeneration: pdfPayload,
      marketplaceSend: sendPayload,
    });

    expect(parity.passed).toBe(true);
    expect(sendPayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId)).toBe(true);
    expect(pdfPayload.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId)).toBe(true);
  });

  it("fails parity when catalog selections diverge", () => {
    const bundle = foundationDraftWithManualCatalogItem();
    const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
    const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
    const marketplaceSend = {
      ...buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send"),
      items: buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send").items.map((item) =>
        item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId
          ? { ...item, catalogItemId: null, selectedCatalogItemId: null }
          : item,
      ),
    };
    const parity = compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend });
    expect(parity.passed).toBe(false);
    expect(parity.failures).toContain("CATALOG_SELECTION_MISMATCH");
  });
});
