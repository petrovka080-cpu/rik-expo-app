import { test } from "playwright/test";

import { assertRealityCase, REALITY_CASES } from "./liveEstimateReality.shared";

test.describe("live chat estimate reality", () => {
  test.setTimeout(240_000);

  test("chat renders specific BOQ rows for GKL, gable roof and brick masonry", async ({ page }) => {
    await assertRealityCase(page, REALITY_CASES.drywall_gkl);
    await assertRealityCase(page, REALITY_CASES.gable_roof_installation);
    await assertRealityCase(page, REALITY_CASES.brick_masonry);
  });
});
