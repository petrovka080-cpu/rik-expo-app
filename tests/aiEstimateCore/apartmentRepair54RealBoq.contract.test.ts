import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  approveConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  capitalRenovationBundle,
  includedInProcurement,
  rowCode,
} from "../estimateCalculator/capitalRenovationTestHelpers";

describe("apartment repair 54 real BOQ", () => {
  it("returns professional capital renovation items with row-specific quantities and no generic dump rows", () => {
    const bundle = capitalRenovationBundle();
    const rows = bundle.items;

    expect(bundle.structuredEstimatePayload).toBeFalsy();
    expect(bundle.draft.repairType).toBe("apartment_capital_renovation");
    expect(rows.length).toBeGreaterThanOrEqual(60);
    expect(rows.every((row) => row.formulaId && row.quantityFormula && row.calculationTrace && row.templateId && row.templateVersion)).toBe(true);
    expect(rows.every((row) => row.sourceParameters?.area_m2 === 54)).toBe(true);

    const rowsWithInputAreaQuantity = rows.filter((row) => row.quantity === 54);
    expect(rowsWithInputAreaQuantity.length / rows.length).toBeLessThan(0.1);

    const electricalRows = rows.filter((row) => /electrical|cable|socket|conduit|panel/.test(rowCode(row)));
    const plumbingRows = rows.filter((row) => row.sourceParameters?.capitalRenovationGroupId === "plumbing");
    expect(electricalRows.length).toBeGreaterThan(0);
    expect(plumbingRows.length).toBeGreaterThan(0);
    expect(electricalRows.every((row) => row.unit !== "sq_m")).toBe(true);
    expect(plumbingRows.every((row) => row.unit !== "sq_m")).toBe(true);

    expect(rows.find((row) => rowCode(row) === "capreno_baseboard_lm")?.unit).toBe("linear_m");
    expect(rows.find((row) => rowCode(row) === "capreno_material_delivery_trips")?.unit).toBe("trip");
    expect(rows.map((row) => row.titleRu).join("\n")).not.toMatch(/Комплект расходных|работы на объекте|Apartment capital/i);
    expect(rows.every((row) => row.unitPrice == null && row.totalPrice == null)).toBe(true);
  });

  it("keeps editable UI sections, history, PDF view model, and procurement handoff clean", () => {
    const bundle = capitalRenovationBundle();
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
    const procurementRows = approved.items.filter(includedInProcurement);
    const visibleText = [
      vm.title,
      vm.summary,
      vm.totalLabel,
      ...vm.sections.flatMap((section) => [section.title, ...section.items.map((item) => item.titleRu)]),
      ...vm.previewSections.flatMap((section) => [section.title, ...section.rows.map((row) => row.name)]),
      ...(pdfViewModel?.sections.flatMap((section) => [section.title, ...section.rows.flatMap((row) => [row.name, ...row.sourceLabels])]) ?? []),
    ].join("\n");

    expect(vm.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
      "Демонтаж и подготовка",
      "Черновые полы",
      "Стены",
      "Санузлы",
      "Электрика",
      "Сантехника",
      "Услуги / логистика",
    ]));
    expect(vm.totalLabel).toBe("Полный итог не рассчитан");
    expect(approved.items.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace && item.templateId)).toBe(true);
    expect(history.items[0]?.items.every((item) => item.calculationTrace && item.sourceParameters)).toBe(true);
    expect(pdfViewModel?.sections.map((section) => section.title)).toEqual(expect.arrayContaining(["Черновые полы", "Санузлы", "Электрика"]));
    expect(procurementRows.length).toBeGreaterThan(0);
    expect(procurementRows.every((item) => item.itemType !== "work")).toBe(true);
    expect(visibleText).not.toMatch(/PRICE_MISSING|round_to|normFactor|formula:|trace:|Комплект расходных|Apartment capital|materialKey|rateKey/i);
  });
});
