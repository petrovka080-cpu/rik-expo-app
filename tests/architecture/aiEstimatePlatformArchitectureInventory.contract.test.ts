import {
  auditAiEstimatePlatformArchitectureInventory,
  GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY,
} from "../../scripts/estimate/auditAiEstimatePlatformArchitectureInventory";

describe("AI estimate platform architecture inventory", () => {
  it("maps runtime boundaries and second-engine risks", () => {
    const { summary } = auditAiEstimatePlatformArchitectureInventory({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY);
    expect(summary.estimate_entrypoints_mapped).toBe(true);
    expect(summary.second_engine_risk_list_created).toBe(true);
    expect(summary.low_level_ui_imports).toEqual([]);
  });
});
