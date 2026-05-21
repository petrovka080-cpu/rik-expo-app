import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal large question smoke proof", () => {
  it("keeps the 50 screen / 70 internet question proof as the source smoke", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalLargeQuestionSmokeProof.ts");

    expect(source).toContain("Expected 50 screen questions");
    expect(source).toContain("Expected 70 internet questions");
    expect(source).toContain("screen_questions_used_public_web_fact");
    expect(source).toContain("internet_questions_used_public_web_fact");
    expect(source).toContain("сколько счетов для оплаты есть у меня");
    expect(source).toContain("дай сметуц на укладку ламинат на площади 100 кв м");
    expect(source).toContain("GREEN_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE_READY");
  });
});
