import { test } from "playwright/test";

import { assertRealityCase, REALITY_CASES } from "./liveEstimateReality.shared";

test.describe("live request AI estimate reality", () => {
  test.setTimeout(180_000);

  test("request draft for carpet uses specific estimate rows", async ({ page }) => {
    await assertRealityCase(page, REALITY_CASES.carpet_laying);
  });
});
