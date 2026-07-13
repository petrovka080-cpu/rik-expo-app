import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS,
} from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 full manifest semantic anchors", () => {
  it("keeps the bathroom waterproofing macro-domain prompt explicit", () => {
    const domain = BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS.find(
      (candidate) => candidate.id === "12_waterproofing_insulation_fireproofing",
    );
    expect(domain).toBeDefined();
    expect(domain?.defaultWorkKey).toBe("bathroom_waterproofing");
    expect(domain?.promptAnchor).toMatch(/\bbathroom\b/);
    expect(domain?.promptAnchor).toMatch(/\bwet room\b/);
    expect(domain?.promptAnchor).toMatch(/\bwaterproofing\b/);
    expect(domain?.promptAnchor).not.toMatch(/\bfireproofing\b/);

    const estimatePrompts = BUILT_IN_AI_50000_FULL_CASES.filter(
      (testCase) =>
        testCase.macroDomainId === "12_waterproofing_insulation_fireproofing" &&
        testCase.intent === "estimate",
    );
    const syntheticEstimatePrompts = estimatePrompts.filter(
      (testCase) => !testCase.id.startsWith("phase1_anchor_"),
    );

    expect(estimatePrompts.length).toBeGreaterThan(0);
    expect(estimatePrompts.every((testCase) => testCase.workKey === "bathroom_waterproofing")).toBe(true);
    expect(syntheticEstimatePrompts.length).toBeGreaterThan(0);
    expect(
      syntheticEstimatePrompts.every((testCase) =>
        testCase.promptRu.includes("bathroom wet room waterproofing primer membrane mastic"),
      ),
    ).toBe(true);
  });
});
