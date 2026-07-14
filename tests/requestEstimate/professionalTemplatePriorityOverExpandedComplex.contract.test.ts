import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";

describe("professional template priority over expanded complex", () => {
  it("keeps specific ventilation templates ahead of broad engineering matchers", () => {
    const ductInstallation = buildConsumerRepairAiDraft("Duct Installation 500 linear m in Russia request 1391", {
      city: "Bishkek",
      currency: "KGS",
    });
    const ductInsulation = buildConsumerRepairAiDraft("Duct Insulation 524 linear m in Bishkek request 1392", {
      city: "Bishkek",
      currency: "KGS",
    });

    expect(ductInstallation.selectedWork?.selectedWorkKey).toBe("duct_installation");
    expect(ductInsulation.selectedWork?.selectedWorkKey).toBe("duct_insulation");
    expect(ductInstallation.items.length).toBeGreaterThan(0);
    expect(ductInsulation.items.length).toBeGreaterThan(0);
  });

  it("keeps runtime drafts aligned with specific ventilation templates", () => {
    const runtimeDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      rawInput: "Duct Installation 500 linear m in Russia request 1391",
      city: "Bishkek",
      currency: "KGS",
    });

    expect(runtimeDraft?.selectedWork?.selectedWorkKey).toBe("duct_installation");
    expect(runtimeDraft?.items.length).toBeGreaterThan(0);
  });
});
