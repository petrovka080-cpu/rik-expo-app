import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const replaySources = [
  "scripts/e2e/androidAdbDeviceHealth.ts",
  "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts",
  "scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts",
].map(readRepoFile).join("\n");

describe("Android emulator replay wave: no estimate logic change", () => {
  it("keeps replay work in Android harness files instead of estimate engines or resolvers", () => {
    expect(replaySources).not.toMatch(/calculate_global_estimate|calculateGlobalConstructionEstimate|answerBuiltInAi/);
    expect(replaySources).not.toMatch(/globalWorkTypeResolver|globalEstimateSeedData|coreTemplateReconciliation/);
    expect(replaySources).not.toMatch(/src\/lib\/ai\/builtInAi|src\/lib\/ai\/globalEstimate/);
  });
});
