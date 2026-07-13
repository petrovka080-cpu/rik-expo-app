import { auditAiPlatformSurfaceInventory, GREEN_AI_PLATFORM_SURFACE_INVENTORY } from "../../scripts/architecture/auditAiPlatformSurfaceInventory";

describe("AI platform surface inventory", () => {
  it("maps AI entrypoints without unclassified dangerous surfaces", () => {
    const summary = auditAiPlatformSurfaceInventory();
    expect(summary.final_status).toBe(GREEN_AI_PLATFORM_SURFACE_INVENTORY);
    expect(summary.all_ai_entrypoints_mapped).toBe(true);
    expect(summary.unclassified_ai_surfaces_count).toBe(0);
    expect(summary.dangerous_ai_surfaces_without_policy_count).toBe(0);
  });
});
