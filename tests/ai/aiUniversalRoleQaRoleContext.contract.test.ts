import { resolveUniversalRoleContext } from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: role context", () => {
  it("separates role permissions and web ability", () => {
    expect(resolveUniversalRoleContext("director").canSeeFinanceDetails).toBe(true);
    expect(resolveUniversalRoleContext("warehouse").canSeeFinanceDetails).toBe(false);
    expect(resolveUniversalRoleContext("contractor").canSeeOtherContractors).toBe(false);
  });
});
