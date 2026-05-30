import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta adds no useEffect rewrite", () => {
  expectNoLimitedPublicBetaPattern(/useEffect\s*\(/, "use_effect_rewrite");
});
