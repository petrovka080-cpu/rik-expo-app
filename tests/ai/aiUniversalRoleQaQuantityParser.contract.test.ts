import {
  parseUniversalRoleQaAmount,
  parseUniversalRoleQaQuantity,
} from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: quantity parser", () => {
  it("parses area and money", () => {
    expect(parseUniversalRoleQaQuantity("асфальт 100 м²")).toEqual({ value: 100, unit: "м2", source: "question" });
    expect(parseUniversalRoleQaAmount("125 000 KGS")).toEqual({ min: 125000, max: 125000, currency: "KGS" });
  });
});
