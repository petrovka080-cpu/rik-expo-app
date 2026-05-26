import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const api34AcceptanceSources = [
  "scripts/e2e/ensureAndroidApi34DeviceReady.ts",
  "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts",
  "scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts",
].map(readRepoFile).join("\n");

describe("Android API34 acceptance wave: no product logic change", () => {
  it("keeps the wave in Android harness/proof code, not product estimate logic", () => {
    expect(api34AcceptanceSources).not.toMatch(/from\s+["'][^"']*src\/features\/consumerRepair/);
    expect(api34AcceptanceSources).not.toMatch(/from\s+["'][^"']*src\/features\/ai\/assistantAnswerPipeline/);
    expect(api34AcceptanceSources).not.toMatch(/calculate_global_estimate|calculateGlobalConstructionEstimate|answerBuiltInAi/);
    expect(api34AcceptanceSources).not.toMatch(/globalWorkTypeResolver|globalEstimateSeedData|coreTemplateReconciliation/);
    expect(api34AcceptanceSources).not.toMatch(/prompt-hardcoded|unitPrice\s*:\s*\d|taxRate\s*:\s*\d/);
  });
});
