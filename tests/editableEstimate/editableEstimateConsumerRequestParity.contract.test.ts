import {
  __simulateConsumerRepairRequestStoreReloadForTests,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  commitPreparedConsumerRepairRequestBundle,
  compareConsumerRepairPayloadParity,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequest,
  getConsumerRepairPdfStorageObject,
  prepareConsumerRepairRequestItemQuantityUpdate,
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
  validateConsumerRepairPayloadSourceGovernance,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { extractEstimatePdfText } from "../../src/lib/estimatePdf";
import { foundationDraftWithManualCatalogItem, MANUAL_CATALOG_ITEM } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

function installLocalStorageMock(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  return () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  };
}

describe("editable estimate consumer request parity", () => {
  it("keeps manual quantity and price in save, PDF, and send canonical payloads", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");

    bundle = updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity: 5 });
    bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: item.id, unitPrice: 6100 });
    const draftSave = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
    bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
    bundle = generateConsumerRepairRequestPdfForDraft({ requestDraftId: bundle.draft.id, userId: bundle.draft.consumerUserId });
    const pdfGeneration = buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation");
    const marketplaceSend = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");

    const parity = compareConsumerRepairPayloadParity({ draftSave, pdfGeneration, marketplaceSend });
    const payloadRow = pdfGeneration.items.find((row) => row.id === item.id);
    expect(parity.passed).toBe(true);
    expect(payloadRow).toMatchObject({
      quantity: 5,
      unitPrice: 6100,
      totalPrice: 30500,
      priceStatus: "USER_PRICE_OVERRIDE",
      priceSource: "user",
      priceSourceId: null,
      quantityEditedByConsumer: true,
      priceEditedByConsumer: true,
    });
  });

  it("can stage a quantity revision before durable commit without losing rehydrate parity", () => {
    const cleanupStorage = installLocalStorageMock();
    const bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    try {
      if (!item) throw new Error("manual item missing");

      const prepared = prepareConsumerRepairRequestItemQuantityUpdate({
        requestDraftId: bundle.draft.id,
        itemId: item.id,
        quantity: 7,
      });
      const preparedRevision = prepared.estimateRevisionState?.current_revision_id;
      const preparedHash = prepared.estimateRevisionState?.revisions.at(-1)?.rows_hash;

      expect(prepared.items.find((row) => row.id === item.id)?.quantity).toBe(7);
      expect(preparedRevision).not.toBe(bundle.estimateRevisionState?.current_revision_id);
      expect(preparedHash).not.toBe(bundle.estimateRevisionState?.revisions.at(-1)?.rows_hash);
      expect(prepared.events.at(-1)?.payload).toMatchObject({
        itemId: item.id,
        previousQuantity: item.quantity,
        nextQuantity: 7,
      });

      commitPreparedConsumerRepairRequestBundle(prepared);
      __simulateConsumerRepairRequestStoreReloadForTests();
      const rehydrated = getConsumerRepairRequest(bundle.draft.id);

      expect(rehydrated.items.find((row) => row.id === item.id)?.quantity).toBe(7);
      expect(rehydrated.estimateRevisionState?.current_revision_id).toBe(preparedRevision);
      expect(rehydrated.estimateRevisionState?.revisions.at(-1)?.rows_hash).toBe(preparedHash);
    } finally {
      cleanupStorage();
    }
  });

  it("allows user-entered prices through source governance without fake supplier evidence", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");
    bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: item.id, unitPrice: 7000 });

    const payload = buildConsumerRepairCanonicalDraftPayload(bundle, "draft_save");
    const result = validateConsumerRepairPayloadSourceGovernance(payload);
    const row = payload.items.find((candidate) => candidate.id === item.id);

    expect(row?.priceSource).toBe("user");
    expect(row?.priceSourceId).toBeNull();
    expect(result.passed).toBe(true);
  });

  it("renders PDF from edited snapshot rows and user price label", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");
    bundle = updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity: 4 });
    bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: item.id, unitPrice: 6200 });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-15T00:00:00.000Z",
    });

    const pdf = bundle.pdfs[0];
    const object = getConsumerRepairPdfStorageObject({ storageBucket: pdf.storageBucket, storageKey: pdf.storageKey });
    const text = extractEstimatePdfText(object!.body);
    const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: "2026-06-15T00:00:00.000Z",
    });

    expect(viewModel?.sections.flatMap((section) => section.rows).some((row) => row.name.includes(MANUAL_CATALOG_ITEM.name))).toBe(true);
    expect(text).toContain("вручную");
    expect(text).not.toContain("supplier_");
  });
});
