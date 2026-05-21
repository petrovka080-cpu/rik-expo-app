import { createForemanActDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("foreman act draft action", () => {
  it("prepares an act draft without work close or signing", () => {
    const draft = createForemanActDraftAction();
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("акт не подписан");
    expect(draft.impactDiff.willNotDo.join(" ")).toContain("работа не закрыта");
    expectDraftIsSafe(draft);
  });
});
