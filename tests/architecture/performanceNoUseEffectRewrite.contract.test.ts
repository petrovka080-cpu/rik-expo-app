import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no useEffect rewrite", () => {
  it("does not use useEffect to rewrite AI answers", () => {
    expectNoPattern(/\buseEffect\s*\(/, "useEffect_rewrite");
  });
});
