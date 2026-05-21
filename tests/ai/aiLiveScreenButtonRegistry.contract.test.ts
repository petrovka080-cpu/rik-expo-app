import {
  assertAiLiveScreenButtonRegistryMatchesManifest,
  listAiLiveScreenButtons,
  validateAiLiveScreenRussianCopy,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen button registry", () => {
  it("matches manifests and contains concrete Russian labels", () => {
    expect(() => assertAiLiveScreenButtonRegistryMatchesManifest()).not.toThrow();
    const buttons = listAiLiveScreenButtons();
    expect(buttons).toHaveLength(67);
    const audit = validateAiLiveScreenRussianCopy({ buttons });
    expect(audit).toMatchObject({
      passed: true,
      englishSignals: [],
      mojibakeSignals: [],
      genericButtonLabels: [],
    });
  });
});
