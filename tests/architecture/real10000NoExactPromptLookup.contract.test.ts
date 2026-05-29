import { exactPromptLookupScanReal10000 } from "../../scripts/e2e/real10000AcceptanceCore";

test("real 10000 production code does not use exact prompt lookup", () => {
  expect(exactPromptLookupScanReal10000()).toEqual({ exact_prompt_lookup_found: false, findings: [] });
});
