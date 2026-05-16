import { getAiScreenNativeAssistantPack } from "../../src/features/ai/screenNative/aiScreenNativeAssistantEngine";

describe("warehouse screen-native value packs", () => {
  it("prepares stock risk and issue draft work without warehouse mutation", () => {
    const pack = getAiScreenNativeAssistantPack({
      role: "warehouse",
      context: "warehouse",
      screenId: "warehouse.issue",
      searchParams: {
        warehouseItemTitle: "Cable issue request",
        warehouseRisk: "stock below requested quantity",
        warehouseMissingDocument: "incoming confirmation",
        warehouseEvidence: "warehouse:item:1|request:1248",
      },
    });

    expect(pack.title).toContain("Выдача");
    expect(pack.criticalItems[0]?.reason).toContain("stock below");
    expect(pack.missingData[0]?.label).toContain("incoming confirmation");
    expect(pack.directMutationAllowed).toBe(false);
  });
});
