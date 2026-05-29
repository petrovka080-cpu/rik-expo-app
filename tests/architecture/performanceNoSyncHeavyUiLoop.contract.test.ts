import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no sync heavy UI loop", () => {
  it("does not add unbounded sync loops to performance guard code", () => {
    expectNoPattern(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)|setInterval\s*\(/, "unbounded_loop");
  });
});
