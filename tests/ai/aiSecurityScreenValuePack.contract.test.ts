import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("security screen-native value pack", () => {
  it("prepares security overview without role mutation or service-role green path", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "security",
      context: "security",
      screenId: "security.screen",
      searchParams: {
        criticalTitle: "Risk role",
        criticalReason: "forbidden action attempts detected",
        nativeEvidence: "audit:forbidden:1",
      },
    });

    expect(pack.title).toContain("Security");
    expect(pack.criticalItems[0]?.reason).toContain("forbidden action");
    expect(pack.summary).not.toMatch(/service_role green path/i);
    expect(pack.directMutationAllowed).toBe(false);
  });
});
