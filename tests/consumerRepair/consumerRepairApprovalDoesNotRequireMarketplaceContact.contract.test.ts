import {
  __resetConsumerRepairRequestStoreForTests,
  addConsumerRepairRequestItem,
  approveConsumerRepairRequestDraft,
  ConsumerRepairValidationError,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { approveCanonicalConsumerRepairAuditRequest } from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { appendCanonicalBackendRevisionProjection } from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import { validateConsumerRepairRequestForApprove } from "../../src/lib/consumerRequests/consumerRequestValidationService";
import type { StructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline/structuredEstimateTypes";
import { flushTransactionalConsumerRepairWrites } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import {
  buildCanonicalConsumerRepairRevisionFixture,
  canonicalArtifactForConsumerRepairRevisionFixture,
} from "./canonicalConsumerRepairRevisionFixture";

describe("consumer estimate approval boundary", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(async () => { await flushTransactionalConsumerRepairWrites(); });

  function shortCatalogDraft(mismatch = "none") {
    const prompt = "Окраска стен 50 м²";
    const catalogId = "canonical-work:test:consumer-history-fixture";
    const aiDraft = buildCanonicalConsumerRepairRevisionFixture(prompt, { selectedWork: {
      selectedCatalogWorkId: catalogId, selectedWorkKey: catalogId,
      selectedWorkTitleRu: "Окраска стен", selectedWorkCategoryKey: "finishes",
      selectedWorkCategoryTitleRu: "Отделка", selectedWorkRawInput: prompt,
      selectedWorkSource: "user_selected", selectedWorkResolverReGuessed: false,
    } });
    const before = createConsumerRepairRequestDraft({
      consumerUserId: "short-catalog-approval-user", problemText: prompt, aiDraft,
    });
    const revisionId = String(before.items[0].sourceParameters?.canonicalBackendRevisionId);
    const releaseId = String(before.items[0].sourceParameters?.canonicalBackendReleaseId);
    if (mismatch === "no-choice") before.draft.selectedWorkSource = undefined;
    if (mismatch === "mixed-rows") before.items[0].sourceParameters = {
      ...before.items[0].sourceParameters, canonicalBackendCatalogId: "another-catalog",
    };
    const projected = appendCanonicalBackendRevisionProjection({ previousBundle: null, nextBundle: before,
      payload: { inputText: prompt, workKey: "wall_paint_standard",
        canonicalBackend: { compilerOwner: "backend", revisionId: mismatch === "stale-revision" ? "other-revision" : revisionId,
          parentRevisionId: null, revisionNumber: 1, releaseId: mismatch === "other-release" ? "other-release" : releaseId,
          catalogId: mismatch === "other-catalog" ? "another-catalog" : catalogId,
          checksumSha256: "a".repeat(64), createdAt: "2026-10-05T10:00:00Z",
          parameters: { area_m2: 50 }, preliminaryNeeds: [] } } as unknown as StructuredEstimatePayload,
    });
    return saveConsumerRepairBundle(projected);
  }

  it("accepts a short explicit catalog request with the exact current canonical projection and null prices", () => {
    const bundle = shortCatalogDraft();
    expect(bundle.draft.problemText!.length).toBeLessThan(20);
    expect(validateConsumerRepairRequestForApprove(bundle.draft.id, bundle.draft.consumerUserId)).toEqual({ ok: true, errors: [] });
    expect(bundle.items.every(item => item.unitPrice == null)).toBe(true);
  });

  it.each(["other-catalog", "stale-revision", "mixed-rows", "other-release", "no-choice"])(
    "does not waive the description requirement for %s", (mismatch) => {
      const bundle = shortCatalogDraft(mismatch);
      expect(validateConsumerRepairRequestForApprove(bundle.draft.id, bundle.draft.consumerUserId).errors)
        .toEqual(expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_REQUIRED" })]));
    },
  );

  it("approves a complete estimate without delivery contact but keeps marketplace validation strict", async () => {
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "approval-boundary-user",
      problemText: "Профессиональная предварительная смета электромонтажных работ",
      repairType: "electrical",
      city: "Bishkek",
      addressText: null,
      contactPhone: null,
    });
    bundle = addConsumerRepairRequestItem({
      requestDraftId: bundle.draft.id,
      titleRu: "Кабель силовой",
      itemType: "material",
      quantity: 25,
      unit: "linear_m",
      unitLabel: "пог. м",
      unitPrice: 118,
      currency: "KGS",
      source: "user_added",
      addedBy: "ai",
    });

    const approved = approveCanonicalConsumerRepairAuditRequest({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
    expect(approved.pdfs[0]?.revisionId).toBeTruthy();

    await expect(
      sendConsumerRepairRequestToMarketplace({
        requestDraftId: approved.draft.id,
        userId: approved.draft.consumerUserId,
      }),
    ).rejects.toThrow(ConsumerRepairValidationError);

    try {
      await sendConsumerRepairRequestToMarketplace({
        requestDraftId: approved.draft.id,
        userId: approved.draft.consumerUserId,
      });
    } catch (error) {
      const codes = (error as ConsumerRepairValidationError).errors.map(
        (item) => item.code,
      );
      expect(codes).toEqual(
        expect.arrayContaining(["CONTACT_REQUIRED", "DELIVERY_ADDRESS_REQUIRED"]),
      );
    }
  });

  it("approves known quantities without prices and does not invent a total", () => {
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "unpriced-approval-user",
      problemText: "Ведомость объемов готова, рыночные цены будут заполнены позднее",
      repairType: "foundation",
      city: "Bishkek",
      addressText: null,
      contactPhone: null,
      aiDraft: buildCanonicalConsumerRepairRevisionFixture(
        "Устройство монолитного железобетонного ленточного фундамента",
      ),
    });
    expect(bundle.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
    });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      canonicalArtifact: canonicalArtifactForConsumerRepairRevisionFixture(bundle),
    });

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.items.every((item) => item.unitPrice == null && item.totalPrice == null)).toBe(true);
    expect(approved.pdfs[0]?.pdfStatus).toBe("generated");
  });
});
