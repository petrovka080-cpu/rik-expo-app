import { parseUniversalPeriod } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: period parser", () => {
  it("parses May 2026 from Russian month phrasing", () => {
    expect(parseUniversalPeriod("сколько заявок было за месяц май")).toEqual({
      from: "2026-05-01",
      to: "2026-05-31",
      labelRu: "май 2026",
      source: "user_question",
    });
  });
});
