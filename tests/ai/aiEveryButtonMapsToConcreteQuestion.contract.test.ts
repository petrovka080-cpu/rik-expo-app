import { groundedButtonTrace } from "./aiGroundedQaTestHarness";

describe("AI grounded button question mapping", () => {
  it("gives every visible button a concrete Russian question", () => {
    for (const entry of groundedButtonTrace()) {
      expect(entry.concreteQuestionRu).toMatch(/\?/);
      expect(entry.concreteQuestionRu.length).toBeGreaterThanOrEqual(20);
      expect(entry.requiredContext.length + entry.allowedSourceTypes.length).toBeGreaterThan(0);
    }
  });
});
