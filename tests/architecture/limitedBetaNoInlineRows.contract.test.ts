import { expectNoLimitedPublicBetaPattern } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited beta closeout does not add inline estimate rows", () => {
  expectNoLimitedPublicBetaPattern(/rows\s*:\s*\[\s*\{[^}]*\b(?:unitPrice|quantity|total|material|labor)\b/is, "inline-rows");
});

