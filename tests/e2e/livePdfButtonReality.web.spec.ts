import { test } from "playwright/test";

import { assertRealityCase, REALITY_CASES } from "./liveEstimateReality.shared";

test.describe("live PDF button estimate reality", () => {
  test.setTimeout(180_000);

  test("PDF action creates a valid PDF and opens viewer", async ({ page }) => {
    await assertRealityCase(page, REALITY_CASES.asphalt_paving, { clickPdf: true });
  });
});
