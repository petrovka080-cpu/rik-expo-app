import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
} from "../../src/lib/consumerRequests";
import { saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  selectedWorkFromBundle,
  syncConsumerRepairDraftFromScreenState,
} from "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("assumption replacement from request UI path", () => {
  it("creates a recalculated revision, archives stale PDF and exposes buyer handoff for latest revision", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "вентфасад под ключ 1500 кв метров";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    if (!result.draft) throw new Error("draft_missing");
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "assumption-ui",
      problemText: prompt,
      repairType: result.draft.repairType,
      city: "Бишкек",
      addressText: "Адрес",
      contactPhone: "+996700000000",
      aiDraft: result.draft,
    });
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-07T00:00:00.000Z",
    });
    const oldPdf = bundle.pdfs[0];
    const oldRevisionId = bundle.estimateDraftRevisionState?.currentRevisionId;

    const recalculated = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      operation: "add_param",
      paramKey: "height_m",
      rawValue: "40 м",
      createdAt: "2026-07-07T00:01:00.000Z",
    });
    const latestRevisionId = recalculated.estimateDraftRevisionState?.currentRevisionId;
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(recalculated);

    expect(latestRevisionId).toBeTruthy();
    expect(latestRevisionId).not.toBe(oldRevisionId);
    expect(recalculated.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(recalculated.estimateDraftRevisionState?.revisions[1].params.height_m.value).toBe(40);
    expect(recalculated.pdfs.find((pdf) => pdf.id === oldPdf.id)?.pdfStatus).toBe("archived");
    expect(handoff.revisionId).toBe(recalculated.estimateRevisionState?.current_revision_id);
    expect(handoff.items.length).toBeGreaterThan(0);
  });

  it("keeps recalculated revision state stable when the screen syncs unchanged fields before PDF", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "РІРµРЅС‚С„Р°СЃР°Рґ РїРѕРґ РєР»СЋС‡ 1500 РєРІ РјРµС‚СЂРѕРІ";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    if (!result.draft) throw new Error("draft_missing");
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "assumption-ui-sync-pdf",
      problemText: prompt,
      repairType: result.draft.repairType,
      city: "Р‘РёС€РєРµРє",
      addressText: "РђРґСЂРµСЃ",
      contactPhone: "+996700000000",
      aiDraft: result.draft,
    });
    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      operation: "add_param",
      paramKey: "height_m",
      rawValue: "40 Рј",
      createdAt: "2026-07-07T00:01:00.000Z",
    });

    const currentRevisionId = bundle.estimateRevisionState?.current_revision_id;
    const currentEditableHash = bundle.editableEstimateSnapshot?.hash;
    const eventCountBeforeSync = bundle.events.length;
    const synced = syncConsumerRepairDraftFromScreenState(bundle, {
      problemText: bundle.draft.problemText ?? "",
      repairType: bundle.draft.repairType,
      city: bundle.draft.city ?? "",
      addressText: bundle.draft.addressText ?? "",
      preferredTimeText: bundle.draft.preferredTimeText ?? "",
      contactPhone: bundle.draft.contactPhone ?? "",
      selectedWork: selectedWorkFromBundle(bundle),
    });
    const pdfBundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: synced.draft.id,
      userId: synced.draft.consumerUserId,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });

    expect(synced.estimateRevisionState?.current_revision_id).toBe(currentRevisionId);
    expect(synced.editableEstimateSnapshot?.hash).toBe(currentEditableHash);
    expect(synced.events).toHaveLength(eventCountBeforeSync);
    expect(pdfBundle.pdfs[0]?.revisionId).toBe(currentRevisionId);
    expect(pdfBundle.estimateRevisionState?.current_revision_id).toBe(currentRevisionId);
  });

  it("repairs a draft bundle whose professional BOQ was recalculated before legacy revision state was persisted", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "РІРµРЅС‚С„Р°СЃР°Рґ РїРѕРґ РєР»СЋС‡ 1500 РєРІ РјРµС‚СЂРѕРІ";
    const result = buildEstimateFromInlineWorkPrompt({ rawInput: prompt, currency: "KGS" });
    if (!result.draft) throw new Error("draft_missing");
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "assumption-ui-legacy-repair",
      problemText: prompt,
      repairType: result.draft.repairType,
      city: "Р‘РёС€РєРµРє",
      addressText: "РђРґСЂРµСЃ",
      contactPhone: "+996700000000",
      aiDraft: result.draft,
    });
    const staleRevisionState = bundle.estimateRevisionState;
    const staleSnapshot = bundle.editableEstimateSnapshot;

    bundle = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      operation: "add_param",
      paramKey: "height_m",
      rawValue: "40 Рј",
      createdAt: "2026-07-07T00:01:00.000Z",
    });

    const repaired = saveConsumerRepairBundle({
      ...bundle,
      estimateRevisionState: staleRevisionState,
      editableEstimateSnapshot: staleSnapshot,
    });
    const pdfBundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: repaired.draft.id,
      userId: repaired.draft.consumerUserId,
      generatedAt: "2026-07-07T00:02:00.000Z",
    });

    expect(repaired.estimateRevisionState?.revisions).toHaveLength((staleRevisionState?.revisions.length ?? 0) + 1);
    expect(repaired.estimateRevisionState?.current_revision_id).not.toBe(staleRevisionState?.current_revision_id);
    expect(repaired.editableEstimateSnapshot?.hash).toBe(bundle.editableEstimateSnapshot?.hash);
    expect(pdfBundle.pdfs[0]?.revisionId).toBe(repaired.estimateRevisionState?.current_revision_id);
  });
});
