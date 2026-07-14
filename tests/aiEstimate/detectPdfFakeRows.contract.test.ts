import {
  approveConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";
import { capitalRenovationBundle } from "../estimateCalculator/capitalRenovationTestHelpers";

function fakePdfRows(): ContinuousEstimateDetectorRow[] {
  return Array.from({ length: 12 }, (_, index) => ({
    row_id: `pdf-fake-${index}`,
    row_title: index % 3 === 0 ? "Доставка материалов" : "Материал сметы",
    section: "PDF",
    line_type: index % 3 === 0 ? "service" : "material",
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
    included_in_procurement: index % 3 !== 0,
  }));
}

describe("continuous AI estimate PDF detector", () => {
  it("detects fake PDF rows and verifies director PDF view model carries public norm evidence", () => {
    expect(detectEstimateFakeRows({ rows: fakePdfRows(), promptArea: 54, context: "pdf" }).failure_ids)
      .toEqual(expect.arrayContaining(["all_rows_quantity_equal_input_area", "default_price_980", "calculated_row_without_template_version"]));

    const bundle = capitalRenovationBundle();
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const viewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const labels = viewModel!.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceLabels));

    expect(labels.some((label) => label.includes("количество рассчитано по норме"))).toBe(true);
    expect(labels.some((label) => label.includes("версия норм: 2026.07.03"))).toBe(true);
    expect(labels.join("\n")).not.toMatch(/PRICE_MISSING|formula:|trace:|raw_ai_json|```|\{".*":/);
  });
});
