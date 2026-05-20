import {
  REQUIRED_LIVE_AI_CONTEXTS,
  answerFor,
} from "./aiLiveUiTestHelpers";

describe("live AI no selected entity overblocking", () => {
  it("uses role default context when no selected entity is present", () => {
    for (const context of REQUIRED_LIVE_AI_CONTEXTS) {
      const answer = answerFor(context, "Что важно сейчас без выбранной сущности?");
      expect(answer.selectedEntityOverblocked).toBe(false);
      expect(answer.answerTextRu).not.toMatch(/нет выбранн(ой|ого)/i);
      expect(answer.defaultContextKind).toContain(".");
    }
  });
});
