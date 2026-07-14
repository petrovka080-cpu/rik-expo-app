import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairProgressiveParameterCards } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { containsForbiddenAiEstimateVisibleToken } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

function privateHouseRevision() {
  return createEstimateDraftRevision({
    rawInput: "Частный дом 10x10, высота стен 4 м, высота конька 3 м, 8 окон",
    selectedTemplateId: "private_house_construction_rom_concept_expanded_complex_v1",
    createdAt: "2026-07-14T00:00:00.000Z",
  });
}

describe("AI estimate visible parameter truth", () => {
  it("does not expose unmapped source parameters or technical statuses as editable cards", () => {
    const revision = privateHouseRevision();
    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu}`).join("\n");

    expect(visible).not.toContain("Дополнительный параметр");
    expect(visible).not.toContain("PRELIMINARY_REQUIRES_INPUT");
    expect(visible).not.toContain("private_house_readiness_status");
    expect(visible).not.toContain("foundation_concrete_m3");
    expect(visible).not.toMatch(/(^|\s)[a-z]+_[a-z0-9_]+(\s|$)/);
    expect(cards.every((card) => !containsForbiddenAiEstimateVisibleToken(`${card.labelRu} ${card.displayValueRu}`))).toBe(true);
  });

  it("keeps calculated request assumption rows out of the editable filled input list", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "Частный дом 10x10, высота стен 4 м, высота конька 3 м, 8 окон";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "visible-parameter-truth",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    const revision = privateHouseRevision();
    if (!viewModel) throw new Error("REQUEST_VIEW_MODEL_MISSING");

    const cards = buildConsumerRepairProgressiveParameterCards({ revision, viewModel });
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`).join("\n");

    expect(visible).not.toContain("Дополнительный параметр");
    expect(visible).not.toContain("PRELIMINARY_REQUIRES_INPUT");
    expect(visible).not.toContain("private_house_readiness_status");
    expect(cards.filter((card) => card.source === "formula_derived").length).toBeGreaterThan(0);
    expect(visible).not.toMatch(/Задать значение вручную|foundation_concrete_m3/);
  });
});
