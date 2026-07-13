import { buildForemanAiEstimateEntries } from "../../src/lib/foreman";
import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "../../src/lib/estimate/platformCoreRegistry";

describe("platform core foreman flow", () => {
  it("registers materials and subcontracts estimate entrypoints on the shared core", () => {
    const foremanEntries = buildForemanAiEstimateEntries();
    const materials = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "foreman_materials_estimate");
    const subcontracts = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "foreman_subcontracts_estimate");

    expect(foremanEntries).toHaveLength(2);
    expect(foremanEntries.every((entry) => entry.usesSharedAiEstimateEngine)).toBe(true);
    expect(materials?.usesSharedBuyerHandoff).toBe(true);
    expect(subcontracts?.usesSharedPdfRenderer).toBe(true);
  });
});
