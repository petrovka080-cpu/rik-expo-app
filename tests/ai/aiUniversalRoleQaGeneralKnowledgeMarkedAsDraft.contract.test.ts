import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: general knowledge draft marking", () => {
  it("marks construction estimates as drafts, not project facts", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    expect(answer.sourceDisclosure.generalKnowledge).toBe("used_as_draft");
    expect(answer.statusRu).toBe("Черновик подготовлен");
    expect(answer.sections.some((section) => section.items.some((item) => item.status === "draft"))).toBe(true);
  });
});
