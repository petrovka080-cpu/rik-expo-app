import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited beta closeout does not add screen-local calculation", () => {
  expectNoLimitedPublicBetaPattern(/useMemo\s*\([^)]*(?:price|total|amount|subtotal|tax|quantity)/i, "screen-local-calculation");
});

