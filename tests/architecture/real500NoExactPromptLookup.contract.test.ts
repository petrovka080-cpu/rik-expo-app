import { exactPromptLookupScan } from "../../scripts/e2e/real500AcceptanceCore";

test("real 500 production code does not use exact prompt lookup", () => {
  expect(exactPromptLookupScan()).toEqual({ exact_prompt_lookup_found: false, findings: [] });
});
