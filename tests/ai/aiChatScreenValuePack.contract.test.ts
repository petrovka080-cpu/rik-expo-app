import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("chat screen-native value pack", () => {
  it("extracts action work from chat context instead of generic chat-only UX", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "unknown",
      context: "unknown",
      screenId: "chat.main",
      searchParams: {
        readyOptionTitle: "Discussion summary",
        readyOptionDescription: "Buyer requests price, warehouse checks stock, director reviews approval.",
        nativeEvidence: "chat:thread:1",
      },
    });

    expect(pack.title).toContain("Итоги");
    expect(pack.readyOptions[0]?.description).toContain("Buyer requests price");
    expect(pack.nextActions.map((action) => action.label).join(" ")).toContain("summary");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
