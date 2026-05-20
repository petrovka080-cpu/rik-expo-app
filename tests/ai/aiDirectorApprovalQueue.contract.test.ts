import { answerDirectorCompanyQuestion } from "../../src/lib/ai/directorCompany";
import { buildDirectorRealCompanyFixture } from "./aiDirectorRealCompany.fixture";

describe("director approval queue", () => {
  it("routes approval review through sources without approve/reject", () => {
    const answer = answerDirectorCompanyQuestion({
      context: buildDirectorRealCompanyFixture(),
      questionRu: "что ждёт моего согласования",
    });

    expect(answer.answerKind).toBe("approval_review");
    expect(answer.providerTrace).toContain("aiApprovalQueueProvider");
    expect(answer.approvedByAi).toBe(false);
    expect(answer.rejectedByAi).toBe(false);
    expect(answer.events.some((event) => event.eventType === "approval_pending")).toBe(true);
  });
});
