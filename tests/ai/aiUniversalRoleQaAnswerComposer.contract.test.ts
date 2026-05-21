import { adaptUniversalRoleQaAnswerToUiText } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture, expectUniversalGuardPass } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: answer composer", () => {
  it("composes user-facing Russian answer without JSON/debug/provider noise", () => {
    const answer = answerUniversalRoleQaFixture("покажи заявки по первому этажу", "foreman", "foreman");
    const text = adaptUniversalRoleQaAnswerToUiText(answer);

    expect(text).toContain("Коротко:");
    expect(text).toContain("Источник ответа:");
    expect(text).toContain("Следующий шаг:");
    expect(text).toContain("Статус:");
    expect(text).not.toMatch(/intent:|entity:|provider payload|stack trace/i);
    expectUniversalGuardPass(answer);
  });
});
