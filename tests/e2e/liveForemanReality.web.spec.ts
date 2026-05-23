import { test } from "playwright/test";

import { assertRealityCase, REALITY_CASES } from "./liveEstimateReality.shared";

test.describe("live foreman AI estimate reality", () => {
  test.setTimeout(180_000);

  test("foreman context keeps estimate intent and renders asphalt-specific BOQ", async ({ page }) => {
    await assertRealityCase(page, REALITY_CASES.asphalt_paving);
  });
});
