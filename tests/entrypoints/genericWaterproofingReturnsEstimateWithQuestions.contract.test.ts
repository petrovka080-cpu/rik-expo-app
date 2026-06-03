import { evaluateEnterpriseVisible500Case } from "../../scripts/e2e/enterpriseVisible500RequestDraftRealPathCore";

describe("generic waterproofing request draft", () => {
  it("returns a neutral waterproofing estimate with clarifying questions instead of roof or bathroom confusion", () => {
    const result = evaluateEnterpriseVisible500Case({
      caseId: "GENERIC-WATERPROOFING",
      promptRu: "смета на гидроизоляцию 100 м²",
      route: "/request",
      expectedWorkKey: "dynamic_waterproofing_estimate",
      requiredTokens: ["гидроизоляционный материал", "праймер", "уточните объект"],
      forbiddenTokens: ["ванн", "сануз", "кровельная гидроизоляция", "гидроизоляция кровли"],
      minimumRows: 18,
    });

    expect(result.failures).toEqual([]);
    expect(result.repairType).toBe("waterproofing");
    expect(result.estimateRows).toBeGreaterThanOrEqual(18);
    expect(result.draftItems).toBeGreaterThanOrEqual(18);
  });
});
