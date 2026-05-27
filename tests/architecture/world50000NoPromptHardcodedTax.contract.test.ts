import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no prompt hardcoded tax", () => {
  it("does not hardcode tax rates in prompts or test cases", () => {
    expect(world50000Source()).not.toMatch(/taxRate\s*:|НДС\s*\d+%|VAT\s*\d+%/i);
  });
});
