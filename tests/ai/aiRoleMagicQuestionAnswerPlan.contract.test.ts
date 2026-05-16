import {
  listAiRoleMagicQuestionAnswerPlans,
  validateAiRoleMagicQuestionAnswerPlans,
} from "../../src/features/ai/roleMagic/aiRoleMagicQuestionAnswerPlan";

describe("AI role magic question-answer plan", () => {
  it("defines at least five role-specific questions per role and answers from screen context", () => {
    const plans = listAiRoleMagicQuestionAnswerPlans();
    const validation = validateAiRoleMagicQuestionAnswerPlans(plans);

    expect(validation.ok).toBe(true);
    expect(validation.rolesWithFiveQuestions).toBe(12);
    expect(plans.every((plan) => plan.answersFromScreenContext)).toBe(true);
    expect(plans.every((plan) => !plan.providerCallAllowed && !plan.dbWriteAllowed)).toBe(true);
    expect(plans.find((plan) => plan.roleId === "foreman")?.questions.map((item) => item.question).join(" ")).toContain("norms");
  });
});
