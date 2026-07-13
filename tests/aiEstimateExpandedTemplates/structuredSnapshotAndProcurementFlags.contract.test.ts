import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

describe("professional expanded structured snapshot and procurement flags", () => {
  it("keeps the expanded estimate snapshot and uses procurement-included rows downstream", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442\u0430 154 \u043c2",
      explicitWorkKey: "laminate_laying",
      volume: 154,
      unit: "sq_m",
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const sourceRows = estimate.sections.flatMap((section) => section.rows);
    const payload = buildStructuredEstimatePayload(estimate, { source: "history" });
    const procurementRows = payload.rows.filter((row) => row.includedInProcurement && !row.deletedByUser);
    const nonProcurementRows = payload.rows.filter((row) => !row.includedInProcurement);
    const catalogBinding = buildStructuredEstimateCatalogBinding(payload);
    const draft = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: "2026-06-17T00:00:00.000Z",
    });

    expect(payload.sourceEstimate.outputContract.detailLevel).toBe("professional_expanded");
    expect(payload.sourceEstimate.sections.flatMap((section) => section.rows)).toHaveLength(sourceRows.length);
    expect(payload.rows).toHaveLength(sourceRows.length);
    expect(payload.rows.every((row) => row.includedInEstimate && row.editable)).toBe(true);
    expect(procurementRows.length).toBeGreaterThan(0);
    expect(nonProcurementRows.length).toBeGreaterThan(0);
    expect(catalogBinding.rows.map((row) => row.rowId).sort()).toEqual(procurementRows.map((row) => row.rowId).sort());
    expect(draft.procurementItems.map((item) => item.sourceEstimateRowId).sort()).toEqual(procurementRows.map((row) => row.rowId).sort());
  });
});
