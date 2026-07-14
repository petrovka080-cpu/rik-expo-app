import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { calculateCapitalRenovationGeometry } from "../../src/features/estimates/calculator/families/capitalRenovationGeometry";
import { buildCapitalRenovationRows } from "../../src/features/estimates/calculator/families/capitalRenovationRecipes";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import { matchWorkTemplateFromPrompt } from "../../src/lib/ai/matchWorkTemplateFromPrompt";

const PROMPT = "Капитальный ремонт квартиры 101 кв метр";

function installLocalStorageMock(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
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

function createCapitalRenovationBundle() {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: PROMPT,
    city: "Bishkek",
    currency: "KGS",
  });
  if (!aiDraft) throw new Error("capital_renovation_runtime_draft_missing");
  return createConsumerRepairRequestDraft({
    consumerUserId: "capital-renovation-batch-param-test",
    problemText: PROMPT,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    aiDraft,
  });
}

describe("capital renovation batch parameter apply", () => {
  it("keeps capital renovation out of asphalt and applies three params as one non-empty revision", () => {
    const match = matchWorkTemplateFromPrompt({ rawInput: PROMPT });
    expect(match.matchedTemplate?.family).toBe("apartment_capital_renovation");
    expect(match.matchedTemplate?.templateId).toBe("capital_renovation_professional_calculator_v1");
    expect(match.candidateTemplates[0]?.family).not.toBe("asphalt_concrete_pavement");

    const bundle = createCapitalRenovationBundle();
    const beforeState = bundle.estimateDraftRevisionState;
    const beforeRevision = beforeState?.revisions.find((revision) => revision.revisionId === beforeState.currentRevisionId);
    expect(bundle.items).toHaveLength(64);
    expect(beforeRevision?.boq.rows).toHaveLength(64);

    const updated = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      patches: [
        { operation: "update_param", paramKey: "area_m2", rawValue: "120" },
        { operation: "update_param", paramKey: "ceiling_height_m", rawValue: "3" },
        { operation: "update_param", paramKey: "bathrooms_count", rawValue: "2" },
      ],
    });
    const afterState = updated.estimateDraftRevisionState;
    const afterRevision = afterState?.revisions.find((revision) => revision.revisionId === afterState.currentRevisionId);

    expect(afterState?.revisions).toHaveLength((beforeState?.revisions.length ?? 0) + 1);
    expect(afterState?.diffs).toHaveLength((beforeState?.diffs.length ?? 0) + 1);
    expect(afterRevision?.source).toBe("param_batch");
    expect(afterRevision?.boq.rows).toHaveLength(64);
    expect(updated.items).toHaveLength(64);
    expect(afterRevision?.params.area_m2.value).toBe(120);
    expect(afterRevision?.params.ceiling_height_m.value).toBe(3);
    expect(afterRevision?.params.bathrooms_count.value).toBe(2);
    expect(afterState?.diffs.at(-1)?.changedParams).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "area_m2", before: 101, after: 120 }),
      expect.objectContaining({ key: "ceiling_height_m", before: 2.7, after: 3 }),
      expect.objectContaining({ key: "bathrooms_count", before: 1, after: 2 }),
    ]));
    expect(updated.events.at(-1)?.eventType).toBe("estimate_params_batch_recalculated");
    expect(updated.events.at(-1)?.payload).toEqual(expect.objectContaining({
      patchCount: 3,
      rowsBefore: 64,
      rowsAfter: 64,
      previousRevisionId: beforeRevision?.revisionId,
      revisionId: afterRevision?.revisionId,
    }));
  });

  it("rejects an invalid batch before replacing the active estimate", () => {
    const bundle = createCapitalRenovationBundle();
    const beforeState = bundle.estimateDraftRevisionState;

    expect(() =>
      applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: bundle.draft.id,
        userId: bundle.draft.consumerUserId,
        patches: [
          { operation: "update_param", paramKey: "area_m2", rawValue: "" },
          { operation: "update_param", paramKey: "ceiling_height_m", rawValue: "3" },
        ],
      }),
    ).toThrow();

    const stored = getConsumerRepairRequest(bundle.draft.id);
    expect(stored.items).toHaveLength(64);
    expect(stored.estimateDraftRevisionState?.currentRevisionId).toBe(beforeState?.currentRevisionId);
    expect(stored.estimateDraftRevisionState?.revisions).toHaveLength(beforeState?.revisions.length ?? 0);
  });

  it("lets a calculated parameter become a user override without dropping BOQ rows", () => {
    const bundle = createCapitalRenovationBundle();
    const beforeState = bundle.estimateDraftRevisionState;
    const beforeRevision = beforeState?.revisions.find((revision) => revision.revisionId === beforeState.currentRevisionId);

    expect(beforeRevision?.params.electrical_points).toEqual(expect.objectContaining({
      value: 81,
      source: "derived",
    }));

    const updated = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      patches: [
        { operation: "update_param", paramKey: "electrical_points", rawValue: "99" },
      ],
    });
    const afterState = updated.estimateDraftRevisionState;
    const afterRevision = afterState?.revisions.find((revision) => revision.revisionId === afterState.currentRevisionId);

    expect(afterState?.revisions).toHaveLength((beforeState?.revisions.length ?? 0) + 1);
    expect(afterRevision?.source).toBe("param_edit");
    expect(afterRevision?.boq.rows).toHaveLength(64);
    expect(updated.items).toHaveLength(64);
    expect(afterRevision?.params.electrical_points).toEqual(expect.objectContaining({
      value: 99,
      source: "edited_by_user",
      sourceText: "99",
    }));
    expect(afterState?.diffs.at(-1)?.changedParams).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "electrical_points", before: 81, after: 99 }),
    ]));
  });

  it("persists a batch revision across reload and rebinds PDF artifacts to the latest revision", () => {
    const cleanupLocalStorage = installLocalStorageMock();
    try {
      const bundle = createCapitalRenovationBundle();
      const withOldPdf = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: bundle.draft.id,
        userId: bundle.draft.consumerUserId,
        generatedAt: "2026-07-12T10:00:00.000Z",
      });
      const oldRevisionId = withOldPdf.estimateDraftRevisionState?.currentRevisionId;
      const oldPdfRevisionId = withOldPdf.estimateRevisionState?.current_revision_id;
      const oldPdf = withOldPdf.pdfs[0];

      expect(oldPdf?.pdfStatus).toBe("generated");
      expect(oldPdf?.revisionId).toBe(oldPdfRevisionId);

      const updated = applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: bundle.draft.id,
        userId: bundle.draft.consumerUserId,
        createdAt: "2026-07-12T10:05:00.000Z",
        patches: [
          { operation: "update_param", paramKey: "area_m2", rawValue: "120" },
          { operation: "update_param", paramKey: "paint_total_area_m2", rawValue: "410" },
          { operation: "update_param", paramKey: "electrical_points", rawValue: "99" },
        ],
      });
      const newRevisionId = updated.estimateDraftRevisionState?.currentRevisionId;
      const newPdfRevisionId = updated.estimateRevisionState?.current_revision_id;

      expect(newRevisionId).toBeTruthy();
      expect(newRevisionId).not.toBe(oldRevisionId);
      expect(newPdfRevisionId).toBeTruthy();
      expect(newPdfRevisionId).not.toBe(oldPdfRevisionId);
      expect(updated.pdfs.find((pdf) => pdf.id === oldPdf?.id)?.pdfStatus).toBe("archived");
      expect(updated.estimateDraftRevisionState?.diffs.at(-1)?.changedParams).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: "area_m2", before: 101, after: 120 }),
        expect.objectContaining({ key: "paint_total_area_m2", before: 347, after: 410 }),
        expect.objectContaining({ key: "electrical_points", before: 81, after: 99 }),
      ]));

      __simulateConsumerRepairRequestStoreReloadForTests();
      const reloaded = getConsumerRepairRequest(bundle.draft.id);
      const reloadedRevision = reloaded.estimateDraftRevisionState?.revisions.find((revision) =>
        revision.revisionId === reloaded.estimateDraftRevisionState?.currentRevisionId
      );
      expect(reloaded.estimateDraftRevisionState?.currentRevisionId).toBe(newRevisionId);
      expect(reloaded.items).toHaveLength(64);
      expect(reloadedRevision?.params.paint_total_area_m2.value).toBe(410);
      expect(reloadedRevision?.boq.rows.find((row) => row.rowId === "capreno_paint_work_two_coats")?.quantity).toBe(410);

      const withNewPdf = generateConsumerRepairRequestPdfForDraft({
        requestDraftId: bundle.draft.id,
        userId: bundle.draft.consumerUserId,
        generatedAt: "2026-07-12T10:10:00.000Z",
      });
      expect(withNewPdf.pdfs[0]?.pdfStatus).toBe("generated");
      expect(withNewPdf.pdfs[0]?.revisionId).toBe(newPdfRevisionId);
      expect(withNewPdf.pdfs.find((pdf) => pdf.id === oldPdf?.id)?.pdfStatus).toBe("archived");
    } finally {
      __resetConsumerRepairRequestStoreForTests();
      cleanupLocalStorage();
    }
  });

  it("matches the canonical capital renovation calculator output row-for-row", () => {
    const bundle = createCapitalRenovationBundle();
    const revision = bundle.estimateDraftRevisionState?.revisions.find((row) =>
      row.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId
    );
    const expectedGeometry = calculateCapitalRenovationGeometry({
      areaM2: 101,
      ceilingHeightM: 2.7,
      bathroomsCount: 1,
    });
    const expectedRows = buildCapitalRenovationRows(expectedGeometry);

    expect(revision?.boq.rows).toHaveLength(expectedRows.length);
    expect(revision?.boq.rows.map((row) => ({
      code: row.sourceParameters?.rowCode,
      quantity: row.quantity,
      unit: row.unit,
      formula: row.quantityFormula,
    }))).toEqual(expectedRows.map((row) => ({
      code: row.code,
      quantity: row.quantity,
      unit: row.unit,
      formula: row.formula,
    })));
  });

  it("reuses the existing capital renovation calculator instead of duplicating formulas in the runtime adapter", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts"),
      "utf8",
    );

    expect(source).toContain("buildCapitalRenovationRows");
    expect(source).toContain("calculateCapitalRenovationGeometry");
    expect(source).not.toContain("screedMixKg");
    expect(source).not.toContain("areaM2 * 5 * 18");
  });
});
