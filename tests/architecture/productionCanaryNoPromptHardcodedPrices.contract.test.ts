import { expectNoProductionCanaryPattern, readProductionCanarySources } from "./productionCanaryArchitectureTestHelpers";

test("production canary adds no prompt-hardcoded prices or tax", () => {
  expectNoProductionCanaryPattern(/unitPrice\s*:\s*\d|taxRate\s*:\s*\d/i, "prompt_hardcoded_price_tax");
  expect(readProductionCanarySources()).not.toMatch(/prompt_hardcoded_(?:prices|tax)_found:\s*true/i);
});
