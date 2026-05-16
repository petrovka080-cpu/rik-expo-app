import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("director screen-native value packs", () => {
  it("prepares decision queue without auto-approval", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "director",
      context: "director",
      screenId: "director.dashboard",
      searchParams: {
        directorDecisionTitle: "Cable procurement blocks work",
        directorDecisionReason: "supplier choice requires review",
        directorEvidence: "approval:1248|request:1248",
        approvalCount: "6",
        blocksWorkCount: "2",
      },
    });

    expect(pack.title).toContain("Решения");
    expect(pack.criticalItems[0]?.title).toContain("Cable procurement");
    expect(pack.nextActions.map((action) => action.label).join(" ")).toContain("approval inbox");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
