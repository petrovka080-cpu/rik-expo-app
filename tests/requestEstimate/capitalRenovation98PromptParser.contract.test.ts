import { parseCapitalRenovationPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationGeometry";
import { isCapitalRenovationPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import { CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 prompt parser", () => {
  it("extracts apartment area, ceiling height and bathrooms from the user prompt", () => {
    const parsed = parseCapitalRenovationPrompt(CAPITAL_RENOVATION_98_PROMPT);

    expect(isCapitalRenovationPrompt(CAPITAL_RENOVATION_98_PROMPT)).toBe(true);
    expect(parsed.matched).toBe(true);
    expect(parsed.areaM2).toBe(98);
    expect(parsed.ceilingHeightM).toBe(3);
    expect(parsed.bathroomsCount).toBe(2);
  });
});
