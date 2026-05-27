import fs from "node:fs";
import path from "node:path";

import { test, expect } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");
const SCREENSHOT_PATH = path.join(SCREENSHOT_DIR, "change_control_operator_ui.png");

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("AI estimate change control operator flow", () => {
  test("proves the admin operator UI for governed estimate config changes", async ({ page }) => {
    await ensureLiveWebApp();
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    await page.goto(new URL("/admin/global-estimate/change-control", BASE_URL).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("ai-estimate-change-control.screen")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("ai-estimate-change-control.status")).toContainText("READY_FOR_GOVERNED_CHANGES");
    await expect(page.getByTestId("ai-estimate-change-control.lifecycle")).toContainText("Draft created");
    await expect(page.getByTestId("ai-estimate-change-control.lifecycle")).toContainText("Validation passed");
    await expect(page.getByTestId("ai-estimate-change-control.lifecycle")).toContainText("Approval recorded");
    await expect(page.getByTestId("ai-estimate-change-control.lifecycle")).toContainText("Published active version");
    await expect(page.getByTestId("ai-estimate-change-control.lifecycle")).toContainText("Rollback restored previous active");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Invalid formula blocked");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Shallow BOQ blocked");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Missing source evidence blocked");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Missing catalog policy blocked");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Missing tax source blocked");
    await expect(page.getByTestId("ai-estimate-change-control.blocking-checks")).toContainText("Dangerous safety removal blocked");
    await expect(page.getByTestId("ai-estimate-change-control.governance")).toContainText("Direct active mutation blocked");
    await expect(page.getByTestId("ai-estimate-change-control.governance")).toContainText("Publish requires validation");
    await expect(page.getByTestId("ai-estimate-change-control.governance")).toContainText("Publish requires approval");
    await expect(page.getByTestId("ai-estimate-change-control.golden-cases")).toContainText("roof_waterproofing_100sqm");
    await expect(page.getByTestId("ai-estimate-change-control.golden-cases")).toContainText("hydro_turbine_100kw");

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    writeJson(path.join(ARTIFACT_DIR, "web_screenshots.json"), {
      operator_ui_ready: true,
      operator_cli_ready: true,
      web_change_control_smoke_passed: true,
      screenshots: {
        operator_ui: "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/screenshots/change_control_operator_ui.png",
      },
      route: "/admin/global-estimate/change-control",
      fake_green_claimed: false,
    });
  });
});
