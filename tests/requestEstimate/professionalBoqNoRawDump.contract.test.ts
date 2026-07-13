import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

describe("professional BOQ request no raw dump", () => {
  it("keeps internal template and price markers out of public request text", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "строительство дороги 1 км ширина 6 м асфальт";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "professional-boq-no-raw-dump",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    if (!viewModel) throw new Error("view_model_missing");
    const publicText = [
      viewModel.title,
      viewModel.summary,
      viewModel.totalLabel,
      viewModel.priceStatusLabel,
      ...viewModel.sourceLabels,
      ...viewModel.visibleLines.map((line) => line.text),
      ...viewModel.previewSections.flatMap((section) => [
        section.title,
        ...section.rows.flatMap((row) => [
          row.name,
          row.quantityLabel,
          row.unitPriceLabel,
          row.totalLabel,
          row.priceStateLabel,
          row.sourceLabel,
          row.calculationLabel ?? "",
        ]),
      ]),
      ...viewModel.calculationPreviewLines,
      ...viewModel.normSourcePreviewLines,
    ].join("\n");

    expect(publicText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|calculatorId/i);
  });
});
