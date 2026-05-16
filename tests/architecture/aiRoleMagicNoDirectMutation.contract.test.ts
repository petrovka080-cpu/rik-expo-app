import { validateAiRoleMagicButtonClickContract } from "../../src/features/ai/roleMagic/aiRoleMagicButtonClickContract";
import { listAiRoleMagicButtonCoveragePlans } from "../../src/features/ai/roleMagic/aiRoleMagicButtonCoveragePlanner";

describe("AI role magic has no direct dangerous mutations", () => {
  it("routes dangerous actions to approval and blocks forbidden actions with reasons", () => {
    const contract = validateAiRoleMagicButtonClickContract();
    const actions = listAiRoleMagicButtonCoveragePlans().flatMap((plan) => plan.actions);

    expect(contract.ok).toBe(true);
    expect(actions.filter((action) => action.actionKind === "approval_required").every((action) => action.approvalRequired)).toBe(true);
    expect(actions.filter((action) => action.actionKind === "forbidden").every((action) => action.userFacingBlockedReason)).toBe(true);
  });
});
