import {
  capitalRenovationBundle,
  draftItemRowsForDetector,
  includedInProcurement,
} from "../estimateCalculator/capitalRenovationTestHelpers";
import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

describe("continuous AI estimate buyer BOQ detector", () => {
  it("rejects buyer work rows and sends only procurement material/service rows with matching quantities", () => {
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

    const bundle = capitalRenovationBundle();
    const procurementItems = bundle.items.filter(includedInProcurement);
    const buyerRows = draftItemRowsForDetector(procurementItems);

    expect(procurementItems.length).toBeGreaterThan(0);
    expect(procurementItems.every((item) => item.itemType !== "work")).toBe(true);
    expect(procurementItems.every((item) => item.quantity != null)).toBe(true);
    expect(detectEstimateFakeRows({ rows: buyerRows, promptArea: 54, context: "buyer" }).failure_ids)
      .not.toContain("buyer_receives_work_rows_as_materials");
  });
});
