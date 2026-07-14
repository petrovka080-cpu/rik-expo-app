import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  type ConsumerRepairAiDraft,
} from "../../src/lib/consumerRequests";
import {
  addConsumerRepairPhotoMaterialPlaceholder,
  applyConsumerRepairCatalogItemSelection,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import type { CatalogItemPickerItem } from "../../src/lib/catalog/catalog.facade";

function currentRevisionId(bundle: {
  estimateRevisionState?: { current_revision_id?: string | null } | null;
  estimateDraftRevisionState?: { currentRevisionId?: string | null } | null;
}): string | null {
  return bundle.estimateRevisionState?.current_revision_id
    ?? bundle.estimateDraftRevisionState?.currentRevisionId
    ?? null;
}

const EMPTY_PHOTO_DRAFT: ConsumerRepairAiDraft = {
  titleRu: "Фото материала",
  summaryRu: "Черновик для добавления материала по фото.",
  repairType: "Ремонт",
  items: [],
  missingData: [],
  dangerousDiyBlocked: false,
};

const RECOGNIZED_CATALOG_MATERIAL: CatalogItemPickerItem = {
  catalogItemId: "catalog_items_photo_tile_glue",
  rikCode: "RIK-PHOTO-TILE-GLUE",
  name: "Клей плиточный C2",
  unit: "bag",
  unitLabel: "меш.",
  kind: "material",
  sourceId: "catalog_items",
  sourceLabel: "catalog_items",
  unitPrice: 520,
  currency: "KGS",
};

describe("photo to estimate material draft", () => {
  it("creates a safe material row for + Фото and applies recognized material only after catalog confirmation", () => {
    __resetConsumerRepairRequestStoreForTests();
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "photo-to-estimate-user",
      problemText: "добавить материал по фото",
      repairType: "Ремонт",
      city: "Бишкек",
      addressText: "Адрес",
      contactPhone: "+996700000000",
      aiDraft: EMPTY_PHOTO_DRAFT,
    });

    expect(bundle.items).toHaveLength(0);

    const placeholder = addConsumerRepairPhotoMaterialPlaceholder(bundle);
    bundle = placeholder.bundle;
    const draftRow = bundle.items.find((item) => item.id === placeholder.itemId);
    const placeholderRevisionId = currentRevisionId(bundle);

    expect(draftRow).toMatchObject({
      itemType: "material",
      titleRu: "Материал по фото",
      unitPrice: null,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
    });
    expect(placeholderRevisionId).toBeTruthy();
    expect(placeholder.statusMessage).toContain("После распознавания выберите материал");

    const withPdf = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-10T00:00:00.000Z",
    });
    const stalePdf = withPdf.pdfs[0];

    const applied = applyConsumerRepairCatalogItemSelection({
      current: withPdf,
      catalogItem: RECOGNIZED_CATALOG_MATERIAL,
      targetItemId: placeholder.itemId,
    }).bundle;
    const appliedRow = applied.items.find((item) => item.id === placeholder.itemId);
    const appliedRevisionId = currentRevisionId(applied);
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(applied);

    expect(appliedRow).toMatchObject({
      itemType: "material",
      titleRu: RECOGNIZED_CATALOG_MATERIAL.name,
      catalogItemId: RECOGNIZED_CATALOG_MATERIAL.catalogItemId,
      selectedCatalogItemId: RECOGNIZED_CATALOG_MATERIAL.catalogItemId,
      unitPrice: RECOGNIZED_CATALOG_MATERIAL.unitPrice,
    });
    expect(appliedRevisionId).toBeTruthy();
    expect(appliedRevisionId).not.toBe(placeholderRevisionId);
    expect(applied.pdfs.find((pdf) => pdf.id === stalePdf.id)?.pdfStatus).toBe("archived");
    expect(handoff.revisionId).toBe(applied.estimateRevisionState?.current_revision_id);
    expect(handoff.items.some((item) => item.titleRu === RECOGNIZED_CATALOG_MATERIAL.name)).toBe(true);
  });
});
