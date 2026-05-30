import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited beta closeout does not add useEffect rewrites", () => {
  expectNoLimitedPublicBetaPattern(/useEffect\s*\(/, "useEffect");
});

