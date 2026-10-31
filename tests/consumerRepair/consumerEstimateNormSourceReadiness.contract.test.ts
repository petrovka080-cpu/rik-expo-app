import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests/consumerRequestTypes";
import { consumerEstimateUnadmittedNormSourceItems } from "../../src/lib/consumerRequests/consumerEstimateNormSourceReadiness";
import {appliedFormworkResolution,boundNormSourceFixture} from './fixtures/canonicalNormSourceAdmissionFixture';
const NOW = "2026-09-13T00:00:00.000Z";

function item(
  changes: Partial<ConsumerRepairRequestItem> = {},
): ConsumerRepairRequestItem {
  return {
    id: "row-1",
    requestDraftId: "request-1",
    itemType: "work",
    titleRu: "Расчётная строка",
    quantity: 10,
    unit: "m2",
    unitPrice: 100,
    totalPrice: 1000,
    currency: "KGS",
    source: "reference_price_book",
    editableByConsumer: true,
    createdAt: NOW,
    addedBy: "ai",
    ...changes,
  };
}

function bundle(items: ConsumerRepairRequestItem[]): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "request-1",
      consumerUserId: "consumer-1",
      repairType: "formwork",
      status: "draft",
      missingData: [],
      createdAt: NOW,
    },
    items,
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: "market-1",
      requestDraftId: "request-1",
      status: "not_sent",
      createdAt: NOW,
    },
    events: [],
  };
}


describe("consumer estimate norm-source readiness", () => {
  test("admits an exact physical row and rejects an identity mismatch", () => {
    const resolution = appliedFormworkResolution();
    expect(resolution.status).toBe("APPLIED");
    const exact = item({
      normId: resolution.norm_id,
      normSourceId: resolution.source_id,
      normVersion: resolution.source_document_version,
      sourceParameters: boundNormSourceFixture(resolution).source,
    });
    expect(consumerEstimateUnadmittedNormSourceItems(bundle([exact]))).toEqual([]);

    const mismatch = { ...exact, normVersion: "tampered-version" };
    expect(consumerEstimateUnadmittedNormSourceItems(bundle([mismatch])))
      .toEqual([{ item: mismatch, reason: "BACKEND_SOURCE_ADMISSION_IDENTITY_MISMATCH" }]);
  });

  test("reports generated or source-less calculated rows without blocking manual facts", () => {
    const generated = item({
      id: "generated",
      normId: "norm:generated",
      normSourceId: "src_professional_norm_pack_catalog_generated",
      normVersion: "v1",
    });
    const sourceLess = item({ id: "source-less" });
    const manual = item({
      id: "manual",
      source: "user_added",
      addedBy: "user",
      normId: null,
      normSourceId: null,
      normVersion: null,
    });
    const excluded = item({
      id: "excluded",
      sourceParameters: { includedInEstimate: false },
    });

    expect(consumerEstimateUnadmittedNormSourceItems(
      bundle([generated, sourceLess, manual, excluded]),
    ).map(({ item: gapItem, reason }) => [gapItem.id, reason])).toEqual([
      ["generated", "PHYSICAL_APPLICABILITY_NOT_APPLIED"],
      ["source-less", "SOURCE_ID_MISSING"],
    ]);
  });
});
