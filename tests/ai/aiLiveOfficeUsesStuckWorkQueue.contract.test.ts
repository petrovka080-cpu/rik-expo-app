import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";
import { expectUsefulLiveAnswer } from "./aiLiveUiTestHelpers";

describe("live office uses stuck work queue", () => {
  it("answers stuck work and reminder draft from office default queue", () => {
    const stuck = answerLiveAiForContext({
      context: "office",
      userText: "Что застряло",
      forceActionId: "stuck_today",
    });
    const reminder = answerLiveAiForContext({
      context: "office",
      userText: "Кому напомнить",
      forceActionId: "reminder_draft",
    });

    expect(stuck.pipelineKey).toBe("officeDocumentControl");
    expect(stuck.answerTextRu).toMatch(/PAY-GKL|PKG-GKL|DOC-GKL|застр|Office/i);
    expect(reminder.status).toBe("draft_prepared");
    expect(reminder.answerTextRu).not.toMatch(/final send|отправлено финально/i);
    expectUsefulLiveAnswer(stuck);
    expectUsefulLiveAnswer(reminder);
  });
});
