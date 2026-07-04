import { calculateCapitalRenovationFromPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationCalculator";
import { CAPITAL_RENOVATION_98_PROMPT } from "./capitalRenovationTestHelpers";

describe("capital renovation 98 geometry", () => {
  it("parses apartment area, ceiling height and bathrooms into professional derived quantities", () => {
    const estimate = calculateCapitalRenovationFromPrompt(CAPITAL_RENOVATION_98_PROMPT);
    expect(estimate).toBeTruthy();

    expect(estimate!.geometry).toMatchObject({
      areaM2: 98,
      ceilingHeightM: 3,
      bathroomsCount: 2,
      ceilingAreaM2: 98,
      bathroomFloorAreaM2: 12,
      dryFloorAreaM2: 86,
      grossWallAreaM2: 338.1,
      netWallAreaM2: 297.5,
      bathroomWallTileAreaM2: 60,
      paintWallAreaM2: 237.5,
      paintTotalAreaM2: 335.5,
      baseboardLm: 90,
      electricalPoints: 78,
      waterPoints: 14,
      sewerPoints: 8,
      doorsCount: 6,
      wasteVolumeM3: 24.5,
    });
  });
});
