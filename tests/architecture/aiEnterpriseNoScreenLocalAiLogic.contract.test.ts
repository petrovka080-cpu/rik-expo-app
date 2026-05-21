import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no screen-local AI logic", () => {
  it("keeps screens out of intent/source/provider/answer-composer ownership", () => {
    expect(getAiEnterpriseGuardrailMatrix().screen_local_ai_logic_found).toBe(0);
  });
});
