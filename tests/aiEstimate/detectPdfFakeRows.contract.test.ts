import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  detectEstimateFakeRows,
  type ContinuousEstimateDetectorRow,
} from "../../src/lib/ai/estimateContinuousDetection";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

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
  it("detects fake PDF rows and verifies director PDF view model carries trace/version without raw AI JSON", () => {
    expect(detectEstimateFakeRows({ rows: fakePdfRows(), promptArea: 54, context: "pdf" }).failure_ids)
      .toEqual(expect.arrayContaining(["all_rows_quantity_equal_input_area", "default_price_980", "calculated_row_without_template_version"]));

    __resetConsumerRepairRequestStoreForTests();
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "continuous-pdf-user",
      problemText: PROMPT,
      repairType: "apartment_capital_renovation",
      city: "Bishkek",
      addressText: "Bishkek, continuous detector test address",
      contactPhone: "+996700000000",
      aiDraft: buildConsumerRepairAiDraft(PROMPT),
    });
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

    expect(labels.some((label) => label.includes("trace:"))).toBe(true);
    expect(labels.some((label) => label.includes("version:"))).toBe(true);
    expect(labels.join("\n")).not.toMatch(/raw_ai_json|```|\{".*":/);
  });
});
