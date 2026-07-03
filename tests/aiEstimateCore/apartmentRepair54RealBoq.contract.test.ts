import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

function rowCode(row: { sourceParameters?: Record<string, unknown> | null; id?: string; rowId?: string }): string {
  return String(row.sourceParameters?.rowCode ?? row.id ?? row.rowId ?? "");
}

function productionSection(row: { sourceParameters?: Record<string, unknown> | null }): string {
  return String(row.sourceParameters?.rowCode ?? "").split("_").slice(-2, -1)[0] || "";
}

function apartmentDraftBundle(): ConsumerRepairDraftBundle {
  __resetConsumerRepairRequestStoreForTests();
  return createConsumerRepairRequestDraft({
    consumerUserId: "ai-estimate-real-boq-test-user",
    problemText: PROMPT,
    repairType: "apartment_capital_renovation",
    city: "Бишкек",
    addressText: "Бишкек, тестовый адрес",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(PROMPT),
  });
}

describe("apartment repair 54 real BOQ", () => {
  it("returns an expanded professional estimate with row-specific units, formulas, and prices", () => {
    const aiDraft = buildConsumerRepairAiDraft(PROMPT);
    const rows = aiDraft.structuredEstimatePayload?.rows ?? [];

    expect(aiDraft.structuredEstimatePayload?.workKey).toBe("apartment_capital_renovation");
    expect(rows.length).toBeGreaterThanOrEqual(100);
    expect(rows.every((row) => row.formulaId && row.quantityFormula && row.calculationTrace && row.templateId && row.templateVersion)).toBe(true);
    expect(rows.every((row) => row.sourceParameters?.baseQuantity === 54)).toBe(true);

    const rowsWithInputAreaQuantity = rows.filter((row) => row.quantity === 54);
    expect(rowsWithInputAreaQuantity.length / rows.length).toBeLessThan(0.1);
    expect(rowsWithInputAreaQuantity.every((row) => row.sourceParameters?.projectTemplateGroupChildId)).toBe(true);

    const electricalRows = rows.filter((row) => /electrical|cable|socket|conduit|panel/.test(rowCode(row)));
    const plumbingRows = rows.filter((row) => /plumbing|pipe|fitting|valve|sanitary/.test(rowCode(row)));
    expect(electricalRows.length).toBeGreaterThan(0);
    expect(plumbingRows.length).toBeGreaterThan(0);
    expect(electricalRows.every((row) => row.unit !== "sq_m")).toBe(true);
    expect(plumbingRows.every((row) => row.unit !== "sq_m")).toBe(true);

    const baseboardRows = rows.filter((row) => row.sourceParameters?.projectTemplateGroupChildId === "baseboard_install");
    expect(baseboardRows.length).toBeGreaterThan(0);
    expect(new Set(baseboardRows.map((row) => row.unit)).size).toBeGreaterThan(1);

    const deliveryRows = rows.filter((row) => row.sectionType === "delivery");
    expect(deliveryRows.length).toBeGreaterThan(0);
    expect(deliveryRows.every((row) => row.unit !== "sq_m" && row.sourceParameters?.projectTemplateGroupChildId)).toBe(true);

    const repeatedTotals = new Map<number, number>();
    for (const row of rows) {
      if (row.total != null) repeatedTotals.set(row.total, (repeatedTotals.get(row.total) ?? 0) + 1);
    }
    expect([...repeatedTotals.values()].filter((count) => count >= 8)).toHaveLength(0);
  });

  it("keeps formula trace visible in request UI sections, history, PDF view model, and buyer procurement handoff", () => {
    const bundle = apartmentDraftBundle();
    const vm = buildRequestEstimateViewModel(bundle);
    if (!vm) throw new Error("request estimate view model missing");
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const history = listConsumerRepairApprovedHistory(bundle.draft.consumerUserId, { limit: 5 });
    const pdfViewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const payload = approved.structuredEstimatePayload;
    if (!payload) throw new Error("structured estimate payload missing");
    const buyerDraft = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      sourceRequestId: approved.draft.id,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const procurementRows = payload.rows.filter((row) => row.includedInProcurement && !row.deletedByUser);

    expect(vm.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Материалы", "Работы", "Оборудование", "Услуги / логистика"]));
    expect(bundle.items.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace && item.templateId)).toBe(true);
    expect(history.items[0]?.items.every((item) => item.calculationTrace && item.sourceParameters)).toBe(true);
    expect(pdfViewModel?.sections.flatMap((section) => section.rows).some((row) =>
      row.sourceLabels.some((label) => label.includes("formula:") && label.includes("trace:"))
    )).toBe(true);
    expect(buyerDraft.procurementItems.map((item) => item.sourceEstimateRowId).sort()).toEqual(procurementRows.map((row) => row.rowId).sort());
    expect(buyerDraft.procurementItems.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace && item.sourceParameters)).toBe(true);
    expect(buyerDraft.procurementItems.every((item) => !/labor|preparation|quality_control|overhead|tax/.test(productionSection({ sourceParameters: item.sourceParameters }))))
      .toBe(true);
  });
});
