import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { evaluateApprovedHistoryScaleMatrix } from "../../src/lib/consumerRequests/approvedHistoryScaleMatrix";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";

function seedApprovedHistoryBundle(input: {
  userId: string;
  index: number;
  createdAt: string;
}): ConsumerRepairDraftBundle {
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: input.userId,
    problemText: `scale approved estimate ${input.index}`,
    repairType: "flooring",
    contactPhone: "+996 555 123 456",
    city: "Bishkek",
    addressText: "64 Malikova Street",
  });
  bundle = addConsumerRepairRequestItem({
    requestDraftId: bundle.draft.id,
    itemType: "work",
    titleRu: `Scale work ${input.index}`,
    quantity: 1,
    unit: "шт",
    unitPrice: null,
    currency: "KGS",
    source: "ai_suggested",
  });
  const pdf: ConsumerRepairRequestPdf = {
    id: `scale_pdf_${input.index}`,
    requestDraftId: bundle.draft.id,
    revisionId: `scale_revision_${input.index}`,
    snapshotId: `scale_snapshot_${input.index}`,
    revisionRowsHash: `scale_rows_${input.index}`,
    revisionTotalsHash: `scale_totals_${input.index}`,
    revisionFullSnapshotHash: `scale_full_${input.index}`,
    documentAssetId: `scale_doc_${input.index}`,
    storageBucket: "consumer-repair-pdfs",
    storageKey: `scale/${input.index}.pdf`,
    titleRu: `Scale PDF ${input.index}`,
    pdfStatus: "generated",
    contentType: "application/pdf",
    uploadedAt: input.createdAt,
    storageVerifiedAt: input.createdAt,
    createdAt: input.createdAt,
  };

  return saveConsumerRepairBundle({
    ...bundle,
    draft: {
      ...bundle.draft,
      title: `Scale approved estimate ${input.index}`,
      status: "consumer_approved",
      createdAt: input.createdAt,
      approvedAt: input.createdAt,
      updatedAt: input.createdAt,
      missingData: [],
      marketplaceValidationErrors: [],
    },
    pdfs: [pdf],
  });
}

describe("approved history 1000+ scale contract", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("keeps total count durable and paginates through more than 1000 approved estimates", () => {
    const userId = "approved-history-1000-scale-consumer";
    const total = 1005;
    for (let index = 0; index < total; index += 1) {
      seedApprovedHistoryBundle({
        userId,
        index,
        createdAt: new Date(Date.UTC(2026, 6, 8, 13, 0, index)).toISOString(),
      });
    }

    const firstPage = listConsumerRepairApprovedHistory(userId, { limit: 20 });
    const loadedIds = new Set<string>();
    let cursorCreatedAt = firstPage.nextCursorCreatedAt;
    let page = firstPage;
    let pageCount = 1;
    let lastPageSize = firstPage.items.length;

    while (true) {
      page.items.forEach((bundle) => loadedIds.add(bundle.draft.id));
      lastPageSize = page.items.length;
      expect(page.items.length).toBeLessThanOrEqual(20);
      expect(page.records.map((record) => record.approvedEstimateId)).toEqual(
        page.items.map((bundle) => bundle.draft.id),
      );
      if (!cursorCreatedAt) break;
      page = listConsumerRepairApprovedHistory(userId, { limit: 20, cursorCreatedAt });
      cursorCreatedAt = page.nextCursorCreatedAt;
      pageCount += 1;
    }

    expect(evaluateApprovedHistoryScaleMatrix({
      totalApprovedCount: firstPage.totalApprovedCount,
      firstPageCount: firstPage.items.length,
      lastPageCount: lastPageSize,
      pageCount,
      totalCountSource: firstPage.totalCountSource,
      uniqueLoadedIds: loadedIds.size,
    })).toMatchObject({
      final_status: "GREEN_APPROVED_HISTORY_SCALE_MATRIX_READY",
      blockers: [],
    });
  });
});
