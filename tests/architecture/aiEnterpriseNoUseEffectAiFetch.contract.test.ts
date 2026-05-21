import { getAiEnterpriseGuardrailMatrix } from "./aiEnterpriseGuardrailsTestHelpers";

describe("enterprise AI architecture guardrails - no useEffect AI fetch", () => {
  it("blocks useEffect-based AI source planning or answer fetching", () => {
    expect(getAiEnterpriseGuardrailMatrix().useEffect_ai_fetch_hacks_found).toBe(0);
  });
});
