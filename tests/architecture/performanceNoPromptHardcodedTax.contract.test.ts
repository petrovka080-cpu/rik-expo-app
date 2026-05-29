import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no prompt hardcoded tax", () => {
  it("does not hardcode prompt-specific tax", () => {
    expectNoPattern(/prompt\s*[=:].*(tax|vat|ндс)|includes\([^)]*(tax|vat|ндс)/i, "prompt_hardcoded_tax");
  });
});
