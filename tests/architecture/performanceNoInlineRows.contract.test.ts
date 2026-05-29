import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no inline rows", () => {
  it("does not add screen inline estimate rows", () => {
    expectNoPattern(/inlineRows|rows:\s*\[\s*\{[^]*nameRu/i, "inline_rows");
  });
});
