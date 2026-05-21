import { createWarehouseDeficitRequestDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("warehouse deficit request draft action", () => {
  it("prepares a 60 sheet deficit request without stock mutation", () => {
    const draft = createWarehouseDeficitRequestDraftAction();
    expect(draft.draftPayload).toMatchObject({
      quantity: 60,
      issued: 20,
      remaining: 0,
    });
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("склад не изменен");
    expectDraftIsSafe(draft);
  });
});
