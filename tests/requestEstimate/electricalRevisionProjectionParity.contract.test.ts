import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  __resetConsumerRepairRequestStoreForTests,
  attachConsumerRepairMedia,
  bindConsumerRepairEstimateRevisionHistory,
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  generateConsumerRepairRequestPdfForDraft,
} from "../../src/lib/consumerRequests";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

function rowSignature(row: {
  rowId: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  includedInProcurement: boolean;
}) {
  return [
    row.rowId,
    row.quantity,
    row.unit,
    row.unitPrice ?? null,
    row.includedInProcurement,
  ].join("|");
}

describe("canonical electrical revision projection parity", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("projects one immutable revision to UI, PDF, history, and procurement", () => {
    let { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-revision-projection-parity",
      problemText:
        "электромонтаж под ключ, площадь 300 м², длина трассы 500 м, " +
        "30 розеток, 20 выключателей, 25 точек освещения, " +
        "открытая прокладка в кабель-канале",
      repairType: "estimate",
      city: "Bishkek",
      addressText: "redacted test address",
      preferredTimeText: "",
      contactPhone: "redacted",
      selectedWork: null,
    });
    bundle = attachConsumerRepairMedia({
      requestDraftId: bundle.draft.id,
      mediaKind: "photo",
    });
    const revisionState = bundle.estimateDraftRevisionState;
    const revision = revisionState?.revisions.find(
      (candidate) =>
        candidate.revisionId === revisionState.currentRevisionId,
    );
    if (!revision) throw new Error("electrical revision missing");

    const uiRowSignatures = bundle.items.map((item) =>
      [
        item.sourceParameters?.rowCode,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.sourceParameters?.includedInProcurement === true,
      ].join("|")
    );
    expect(uiRowSignatures).toEqual(revision.boq.rows.map(rowSignature));

    const runtime = createAiEstimateRuntime();
    const pdf = runtime.buildPdfSnapshot({ revision });
    const procurement = runtime.buildBuyerPackage({
      revision: pdf.revision,
      snapshot: pdf.snapshot,
    });
    expect(pdf.revision.revisionId).toBe(revision.revisionId);
    expect(pdf.snapshot.rows).toEqual(revision.boq.rows);
    expect(pdf.pdf.rowsHash).toBe(pdf.snapshot.rowsHash);
    expect(
      procurement.buyerPackage.items.map((item) => item.rowId),
    ).toEqual(
      revision.boq.rows
        .filter((row) => row.includedInProcurement)
        .map((row) => row.rowId),
    );

    const draftPayload = buildConsumerRepairCanonicalDraftPayload(
      bundle,
      "draft_save",
    );
    bundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-29T13:00:00.000Z",
    });
    const pdfPayload = buildConsumerRepairCanonicalDraftPayload(
      bundle,
      "pdf_generation",
    );
    const historyBundle = bindConsumerRepairEstimateRevisionHistory({
      bundle,
      history_entry_id: `consumer_repair_history:${bundle.draft.id}`,
      created_at: "2026-07-29T13:01:00.000Z",
    });
    const historyPayload = buildConsumerRepairCanonicalDraftPayload(
      historyBundle,
      "marketplace_send",
    );
    expect(compareConsumerRepairPayloadParity({
      draftSave: draftPayload,
      pdfGeneration: pdfPayload,
      marketplaceSend: historyPayload,
    })).toMatchObject({
      passed: true,
      itemCountEqual: true,
      totalsEqual: true,
      draftIdentityEqual: true,
    });
    expect(historyBundle.estimateDraftRevisionState).toEqual(
      bundle.estimateDraftRevisionState,
    );

    for (const row of revision.boq.rows) {
      if (row.unitPrice == null) {
        expect(
          bundle.items.find(
            (item) => item.sourceParameters?.rowCode === row.rowId,
          )?.totalPrice,
        ).toBeNull();
      }
    }
    for (const item of bundle.items) {
      if (item.unitPrice == null) {
        expect(item.totalPrice).toBeNull();
        expect(item.priceStatus).toBe("PRICE_MISSING");
        continue;
      }
      expect(item.priceTrace).toMatchObject({
        price_source_id: expect.any(String),
        currency: item.currency,
        price_unit: expect.any(String),
        price_valid_at: expect.any(String),
        region: expect.any(String),
      });
    }
  });
});
