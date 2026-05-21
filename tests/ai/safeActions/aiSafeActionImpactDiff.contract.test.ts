import { buildAiSafeActionImpactDiff } from "../../../src/lib/ai/safeActions";

describe("AI safe action impact diff", () => {
  it("shows what will be drafted and what will not be done", () => {
    const diff = buildAiSafeActionImpactDiff("procurement_purchase_draft");
    expect(diff.businessMutationBlocked).toBe(true);
    expect(diff.requiresApproval).toBe(true);
    expect(diff.willCreateDrafts[0]?.fieldsRu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldRu: "докупить", valueRu: "60 листов" }),
      ]),
    );
    expect(diff.willNotDo.join(" ")).toContain("закупка не создана финально");
  });
});
