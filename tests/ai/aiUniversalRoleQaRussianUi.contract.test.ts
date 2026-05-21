import { adaptUniversalRoleQaAnswerToUiText } from "../../src/lib/ai/universalRoleQa";
import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: Russian UI answer", () => {
  it("renders Russian business sections and hides debug contracts", () => {
    const text = adaptUniversalRoleQaAnswerToUiText(answerUniversalRoleQaFixture("что в этом PDF", "documents", "documents"));
    expect(text).toMatch(/[А-Яа-яЁё]/);
    expect(text).toContain("Источник ответа:");
    expect(text).toContain("Данные не изменены");
    expect(text).not.toMatch(/sourcePlan|sourceRefs|provider payload|runtime/i);
  });
});
