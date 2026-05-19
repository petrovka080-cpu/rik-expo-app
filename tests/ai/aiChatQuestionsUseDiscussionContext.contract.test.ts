import { groundedButtonTrace, groundedFreeTextTrace, groundedQaMatrix } from "./aiGroundedQaTestHarness";

describe("AI chat grounding", () => {
  it("ties chat answers to discussion context or a specific no-data reason", () => {
    expect(groundedQaMatrix().chat_questions_have_chat_message_trace).toBe(true);
    const entries = [...groundedButtonTrace(), ...groundedFreeTextTrace()].filter((entry) => entry.screenId === "chat.main");
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const sourceTypes = entry.groundedAnswer.facts.map((fact) => fact.sourceType);
      expect(
        sourceTypes.some((source) => ["chat_message", "approval", "screen_context"].includes(source)) ||
          Boolean(entry.groundedAnswer.exactNoDataReasonRu),
      ).toBe(true);
    }
  });
});
