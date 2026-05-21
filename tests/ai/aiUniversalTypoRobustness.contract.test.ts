import { classifyUniversalIntent, normalizeUniversalQuestion } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: typo robustness", () => {
  it("normalizes messy Russian typos before intent routing", () => {
    expect(normalizeUniversalQuestion("сколко заявк было за май")).toContain("сколько");
    expect(classifyUniversalIntent("сколко заявк было за май")).toBe("app_data_count");
    expect(classifyUniversalIntent("дай смтеу на асфалт 100 кв метров")).toBe("construction_estimate");
  });
});
