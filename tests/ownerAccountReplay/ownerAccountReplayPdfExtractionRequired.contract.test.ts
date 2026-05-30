import { ownerReplayPdfCases } from "../../scripts/e2e/aiEstimateOwnerAccountLiveReplayCore";

test("owner account replay requires at least 20 PDF extraction cases with core domains", () => {
  const cases = ownerReplayPdfCases();
  const domains = new Set(cases.map((item) => item.domain));

  expect(cases).toHaveLength(20);
  expect(Array.from(domains)).toEqual(expect.arrayContaining([
    "metal_canopies",
    "paving_stone_paths",
    "drainage_channels",
    "concrete_pedestals",
    "roof_waterproofing",
    "electrical_installation",
    "hydropower_turbines",
    "industrial_floors",
    "apartment_renovation",
  ]));
});
