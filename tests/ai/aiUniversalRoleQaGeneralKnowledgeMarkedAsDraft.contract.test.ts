import { answerUniversalRoleQaFixture } from "./aiUniversalRoleQaTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA: canonical estimate handoff", () => {
  it("does not replace a canonical backend estimate with a general-knowledge draft", () => {
    const answer = answerUniversalRoleQaFixture("дай смету на асфальт 100 м2", "director", "director", { web: true });
    expect(answer.answerKind).toBe("backend_estimate_handoff");
    expect(answer.sourceDisclosure.generalKnowledge).toBe("not_used");
    expect(answer.statusRu).toBe("Данные не изменены");
    expect(answer.sections.some((section) => section.items.some((item) => item.status === "requires_review"))).toBe(true);
    expect(answer.sections.some((section) => section.items.some((item) => item.status === "draft"))).toBe(false);
    expect(answer.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: "canonical-estimate-backend", route: "/request" }),
    ]));
  });
});
