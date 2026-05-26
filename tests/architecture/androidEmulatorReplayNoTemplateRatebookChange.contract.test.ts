import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const replayHarnessSource = [
  "scripts/e2e/androidAdbDeviceHealth.ts",
  "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts",
  "scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts",
].map(readRepoFile).join("\n");

describe("Android emulator replay wave: no template/ratebook change", () => {
  it("does not import or mutate template, ratebook, or catalog binding modules", () => {
    expect(replayHarnessSource).not.toMatch(/from\s+["'][^"']*ratebook|GLOBAL_ESTIMATE_TEMPLATES|CatalogItem|catalog binding/i);
    expect(replayHarnessSource).not.toMatch(/templates\/|globalEstimateSeedData|coreTemplateReconciliation/);
  });
});
