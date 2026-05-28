import { resolveCountryRegionCity } from "../../src/lib/ai/globalLocalContext";
import { buildRateSourceWarning, resolveLocalRateSources } from "../../src/lib/ai/localRateSources";

describe("local rate fallback policy", () => {
  it("uses BOQ-only mode with warning when local data is unsupported", () => {
    const context = resolveCountryRegionCity({ prompt: "estimate for well drilling in Nepal" });
    const policy = resolveLocalRateSources(context);

    expect(context.completeness).toBe("LOCAL_CONTEXT_UNSUPPORTED");
    expect(policy.level).toBe("boq_only_manual_estimator_required");
    expect(buildRateSourceWarning(policy)).toContain("ручная проверка");
  });
});
