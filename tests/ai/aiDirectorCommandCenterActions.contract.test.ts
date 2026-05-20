import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director command center actions", () => {
  it("produces role-specific safe delegation actions", () => {
    const answer = answerDirectorCompanyQuestion({
      context: { ...buildDirectorRealCompanyFixture(), screenId: "ai.command_center" },
      questionRu: "кому что поручить",
    });

    expect(answer.answerKind).toBe("delegation_draft");
    expect(answer.events.map((event) => event.ownerRole)).toEqual(
      expect.arrayContaining(["accountant", "buyer", "warehouse", "contractor", "office"]),
    );
    expect(answer.events.every((event) => event.decisionOptions.every((option) => option.unsafeDirectAction === false))).toBe(true);
  });
});
