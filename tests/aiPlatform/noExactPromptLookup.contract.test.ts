import { exactPromptLookupScanReal10000 } from "../../scripts/e2e/real10000AcceptanceCore";

describe("universal professional estimate engine exact prompt lookup guard", () => {
  it("uses semantic routing, not exact prompt lookup", () => {
    expect(exactPromptLookupScanReal10000()).toEqual({
      exact_prompt_lookup_found: false,
      findings: [],
    });
  });
});
