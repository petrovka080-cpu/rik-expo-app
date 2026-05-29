import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no prompt hardcoded prices", () => {
  it("does not hardcode prompt-specific prices", () => {
    expectNoPattern(/prompt\s*[=:].*(price|unitPrice)|includes\([^)]*(price|цена)/i, "prompt_hardcoded_prices");
  });
});
