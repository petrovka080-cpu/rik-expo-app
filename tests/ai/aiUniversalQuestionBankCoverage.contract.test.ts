import { getUniversalQuestionBank } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: question bank", () => {
  it("contains the required first-stage 500-case evaluation bank", () => {
    const bank = getUniversalQuestionBank();
    const counts = bank.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    expect(bank).toHaveLength(500);
    expect(counts).toMatchObject({
      app_data: 100,
      construction: 100,
      marketplace: 75,
      documents: 75,
      role: 75,
      typo: 50,
      governance: 25,
    });
  });
});
