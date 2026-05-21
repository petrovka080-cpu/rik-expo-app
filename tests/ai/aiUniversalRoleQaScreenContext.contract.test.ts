import { resolveUniversalScreenContext } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: screen context", () => {
  it("keeps screen default from overriding explicit question", () => {
    expect(resolveUniversalScreenContext("foreman").screenDefaultIntent).toBe("field_work_review");
    const answer = answerUniversalRoleQaFixture("сколько заявок за май", "foreman", "foreman");
    expect(answer.intent).toBe("app_data_count");
    expect(answer.intent).not.toBe(resolveUniversalScreenContext("foreman").screenDefaultIntent);
  });
});
