import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("foreman screen-native value packs", () => {
  it("prepares closeout drafts and missing evidence without final submission", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "foreman",
      context: "foreman",
      screenId: "foreman.main",
      searchParams: {
        foremanItemTitle: "Object B closeout",
        foremanMissingEvidence: "zone 2 photo",
        foremanRisk: "cannot close act without evidence",
        foremanEvidence: "work:object-b",
      },
    });

    expect(pack.readyOptions[0]?.title).toContain("Object B");
    expect(pack.missingData[0]?.label).toContain("zone 2 photo");
    expect(pack.nextActions.map((action) => action.label).join(" ")).toContain("Подготовить");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
