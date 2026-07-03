import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  detectEstimateFakeRows,
  structuredRowsForDetector,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

describe("continuous AI estimate buyer BOQ detector", () => {
  it("rejects buyer work rows and sends only procurement material rows with matching quantities", () => {
    const fakeBuyerRows: ContinuousEstimateDetectorRow[] = [{
      row_id: "buyer-work-row",
      row_title: "Монтаж плитки",
      section: "labor",
      line_type: "work",
      quantity: 54,
      unit: "м²",
      unit_price: 980,
      amount: 52_920,
      currency: "KGS",
      formula_id: null,
      template_id: null,
      template_version: null,
      calculation_trace_visible: false,
      price_source: null,
      requires_measurement: false,
      included_in_procurement: true,
    }];
    expect(detectEstimateFakeRows({ rows: fakeBuyerRows, promptArea: 54, context: "buyer" }).failure_ids)
      .toEqual(expect.arrayContaining(["buyer_receives_work_rows_as_materials"]));

    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload!;
    const buyer = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      sourceRequestId: "continuous-buyer-request",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const rowsById = new Map(payload.rows.map((row) => [row.rowId, row]));
    const buyerRows = buyer.procurementItems.map((item) => {
      const source = rowsById.get(item.sourceEstimateRowId);
      return {
        row_id: item.sourceEstimateRowId,
        row_title: item.materialVisibleName,
        section: source?.sectionType ?? "materials",
        line_type: source?.sectionType === "materials" ? "material" : "unknown",
        quantity: item.quantity,
        unit: item.unit,
        unit_price: null,
        amount: null,
        currency: "KGS",
        formula_id: item.formulaId ?? null,
        template_id: item.templateId ?? null,
        template_version: item.templateVersion ?? null,
        calculation_trace_visible: Boolean(item.calculationTrace),
        calculation_trace: item.calculationTrace ?? null,
        norm_id: item.normId ?? (typeof item.sourceParameters?.normId === "string" ? item.sourceParameters.normId : null),
        norm_source: item.normSourceId ?? (typeof item.sourceParameters?.normSourceId === "string" ? item.sourceParameters.normSourceId : null),
        norm_version: item.normVersion ?? (typeof item.sourceParameters?.normVersion === "string" ? item.sourceParameters.normVersion : null),
        norm_source_type: typeof item.sourceParameters?.normSourceType === "string" ? item.sourceParameters.normSourceType : null,
        price_source: item.notes ?? null,
        requires_measurement: item.priceStatus === "price_required",
        included_in_procurement: true,
      } satisfies ContinuousEstimateDetectorRow;
    });
    const procurementRows = payload.rows.filter((row) => row.includedInProcurement && !row.deletedByUser);

    expect(buyer.procurementItems.length).toBe(procurementRows.length);
    expect(buyer.procurementItems.every((item) => rowsById.get(item.sourceEstimateRowId)?.sectionType === "materials")).toBe(true);
    expect(buyer.procurementItems.every((item) => rowsById.get(item.sourceEstimateRowId)?.quantity === item.quantity)).toBe(true);
    expect(detectEstimateFakeRows({ rows: buyerRows, promptArea: 54, context: "buyer" }).failure_ids).toEqual([]);
    expect(detectEstimateFakeRows({ rows: structuredRowsForDetector(payload.rows), promptArea: 54 }).failure_ids).toEqual([]);
  });
});
