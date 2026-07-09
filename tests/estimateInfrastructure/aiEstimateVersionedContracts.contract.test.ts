import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { createInMemoryAiEstimateLedgerStore } from "../../src/lib/estimate/ledger/adapters/InMemoryAiEstimateLedgerStore";
import { createAiEstimateArtifactContract } from "../../src/lib/estimate/contracts/AiEstimateArtifactContract";
import { createAiEstimateDraftContract } from "../../src/lib/estimate/contracts/AiEstimateDraftContract";
import { createAiEstimateLedgerContract } from "../../src/lib/estimate/contracts/AiEstimateLedgerContract";
import { createAiEstimateRevisionContract } from "../../src/lib/estimate/contracts/AiEstimateRevisionContract";
import { validateAiEstimateContractCompatibility } from "../../src/lib/estimate/contracts/validateAiEstimateContractCompatibility";

describe("AI estimate versioned contracts", () => {
  it("adds schema, contract, timestamps, source SHA, and runtime version to persisted envelopes", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "contract-version-test",
      rawInput: "capital repair 98 m2",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const store = createInMemoryAiEstimateLedgerStore();
    store.upsertDraft({
      estimateId: revision.estimateDraftId,
      ownerUserId: "contract-owner",
      kind: "ai_estimate",
      sourceRoute: "/request",
      title: "Contract test",
      prompt: revision.rawInput,
      selectedTemplateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
      currentRevisionId: revision.revisionId,
      rowCount: revision.boq.rows.length,
      materialRowsCount: revision.boq.rows.filter((row) => row.rowType === "material").length,
      workRowsCount: revision.boq.rows.filter((row) => row.rowType === "work").length,
      sourceLayer: "runtime",
      idempotencyKey: "contract-upsert",
    });
    const record = store.getRecord(revision.estimateDraftId)!;
    const contracts = [
      createAiEstimateDraftContract({ revision }),
      createAiEstimateRevisionContract({ revision }),
      createAiEstimateLedgerContract({ ledgerRecord: record }),
      createAiEstimateArtifactContract({
        revisionId: revision.revisionId,
        snapshot: pdf.snapshot,
        pdf: pdf.pdf,
        buyerPackage: buyer.buyerHandoff,
        createdAt: "2026-07-10T00:00:00.000Z",
      }),
    ];
    const result = validateAiEstimateContractCompatibility(contracts);

    expect(result.ok).toBe(true);
    expect(result.schemaVersionPresent).toBe(true);
    expect(result.contractVersionPresent).toBe(true);
    expect(result.timestampsPresent).toBe(true);
    expect(result.sourceShaOrRuntimeVersionPresent).toBe(true);
  });
});
