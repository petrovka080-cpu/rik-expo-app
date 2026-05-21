import { adaptUniversalRoleQaAnswerToUiText } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: no fake data", () => {
  it("does not present demo fixture or invented write results as real", () => {
    const text = adaptUniversalRoleQaAnswerToUiText(answerUniversalRoleQaFixture("покажи заявки по первому этажу"));
    expect(text).not.toMatch(/demo_fixture|тестовый fixture|закупка создана|платеж проведен/i);
  });
});
