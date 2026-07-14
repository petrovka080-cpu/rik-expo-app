import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "../../src/lib/estimate/platformCoreRegistry";
import { validatePlatformCoreRegistry } from "../../src/lib/estimate/validatePlatformCoreRegistry";

describe("platform core request flow", () => {
  it("routes /request through the shared estimate engine contract", () => {
    const entry = AI_ESTIMATE_PLATFORM_CORE_REGISTRY.find((item) => item.entryId === "request");

    expect(entry?.routeOrSurface).toBe("/request");
    expect(entry?.usesSharedEstimateEngine).toBe(true);
    expect(entry?.usesSharedRevisionModel).toBe(true);
    expect(entry?.forbiddenLocalCalculator).toBe(false);
    expect(validatePlatformCoreRegistry().passed).toBe(true);
  });
});
