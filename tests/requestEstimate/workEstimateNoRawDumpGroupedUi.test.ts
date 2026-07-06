import { buildProfessionalEstimate1500Cases } from "../../scripts/e2e/professionalEstimate1500WorkCases";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

const RAW_MARKER_RE =
  /PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|calculatorId|normFactor/i;

describe("work estimate grouped UI and no raw dump contract", () => {
  it("keeps grouped request view-model text free of internal runtime markers", () => {
    const cases = buildProfessionalEstimate1500Cases().slice(0, 25);
    const viewModels = cases.map((testCase, index) => {
      __resetConsumerRepairRequestStoreForTests();
      const aiDraft = buildConsumerRepairAiDraft(testCase.user_input_ru, {
        currency: testCase.expected_currency,
        city: "Bishkek",
      });
      const bundle = createConsumerRepairRequestDraft({
        consumerUserId: `work-estimate-no-raw-dump-${index}`,
        problemText: testCase.user_input_ru,
        repairType: aiDraft.repairType,
        city: "Bishkek",
        addressText: "Bishkek, semantic contract address",
        contactPhone: "+996700000000",
        aiDraft,
      });
      const viewModel = buildRequestEstimateViewModel(bundle);
      if (!viewModel) throw new Error(`view_model_missing:${testCase.id}`);
      return viewModel;
    });

    const publicText = viewModels.flatMap((viewModel) => [
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
    ]).join("\n");

    expect(viewModels.every((viewModel) => viewModel.previewSections.length > 0)).toBe(true);
    expect(viewModels.every((viewModel) => viewModel.visibleLines.length > 0)).toBe(true);
    expect(publicText).not.toMatch(RAW_MARKER_RE);
  });
});
