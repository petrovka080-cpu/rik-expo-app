import {
  MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4,
  routeMultiDomainReferencePromptV4,
} from "../../src/lib/estimate/v4/multiDomainReferenceNlpV4";

describe("multi-domain reference NLP contract", () => {
  test("contains 120 prompts with mostly natural positive language", () => {
    expect(MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4).toHaveLength(120);
    const positives = MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4.filter((item) => item.expectation.kind === "MATCH");
    const withoutFullName = positives.filter((item) => !item.containsFullProfessionalName);
    expect(withoutFullName.length / positives.length).toBeGreaterThanOrEqual(0.7);
  });

  test.each(MULTI_DOMAIN_REFERENCE_NLP_PROMPTS_V4)("$promptId routes without cross-domain collision", (prompt) => {
    expect(routeMultiDomainReferencePromptV4(prompt.text)).toEqual(prompt.expectation);
  });
});
