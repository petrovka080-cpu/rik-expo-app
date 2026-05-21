import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: bounded app-data queries", () => {
  it("uses a bounded period count trace for request count questions", () => {
    const answer = answerLiveAiForContext({ context: "buyer", userText: "сколько заявок было за месяц май" });

    expect(answer.providerTrace).toContain("boundedPeriodCount");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining([
      "bounded:procurement_requests:period:2026-05-01:2026-05-31:count_only",
    ]));
  });
});
