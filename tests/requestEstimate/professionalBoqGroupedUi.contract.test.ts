import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

function roadRequestViewModel() {
  __resetConsumerRepairRequestStoreForTests();
  const prompt = "строительство дороги 1 км ширина 6 м асфальт";
  const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "professional-boq-grouped-ui",
    problemText: prompt,
    repairType: aiDraft.repairType,
    city: "Бишкек",
    addressText: "Бишкек, тестовый адрес",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const viewModel = buildRequestEstimateViewModel(bundle);
  if (!viewModel) throw new Error("view_model_missing");
  return viewModel;
}

describe("professional BOQ grouped request UI", () => {
  it("renders grouped professional sections instead of one raw row dump", () => {
    const viewModel = roadRequestViewModel();

    expect(viewModel.professionalPreview).toBe(true);
    expect(viewModel.rawItemCount).toBe(18);
    expect(viewModel.sections.map((section) => section.id)).toEqual([
      "materials",
      "labor",
      "equipment",
      "logistics",
    ]);
    expect(viewModel.previewSections.every((section) => section.rows.length <= 6)).toBe(true);
    expect(viewModel.previewSections.find((section) => section.id === "materials")?.hiddenRowsCount).toBeGreaterThan(0);
    expect(viewModel.calculationPreviewLines.join("\n")).toContain("18");
    expect(viewModel.normSourcePreviewLines.length).toBeGreaterThan(0);
  });
});
