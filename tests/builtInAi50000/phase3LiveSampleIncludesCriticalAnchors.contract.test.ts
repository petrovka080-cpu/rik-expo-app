import { planBuiltInAi50000Phase3CriticalAnchors } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 critical anchors", () => {
  it("includes the required live route anchor prompts", () => {
    const anchors = planBuiltInAi50000Phase3CriticalAnchors();
    expect(anchors.map((anchor) => `${anchor.route} ${anchor.requestedPrompt}`)).toEqual(expect.arrayContaining([
      "/chat brick_masonry 74 м²",
      "/ai?context=foreman asphalt_paving 1000 м²",
      "/request emergency_roof_leak_repair",
      "/product/search арматура Ø14",
      "/pdf-viewer from brick masonry estimate",
    ]));
    expect(anchors.every((anchor) => anchor.matchedCaseId.length > 0)).toBe(true);
  });
});
