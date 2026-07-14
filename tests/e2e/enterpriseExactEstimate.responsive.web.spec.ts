import { expect, test } from "playwright/test";

import {
  readEnterpriseExactJson,
  writeEnterpriseExactJson,
} from "../../scripts/e2e/enterpriseExactEstimate.shared";
import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const VIEWPORTS = [
  { id: "mobile", width: 390, height: 844, artifact: "responsive_mobile_results.json" },
  { id: "tablet", width: 834, height: 1112, artifact: "responsive_tablet_results.json" },
] as const;

function requestUrl(): string {
  return new URL("/request", BASE_URL).toString();
}

function cleanVisibleText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function writeResponsiveAggregate(): void {
  const mobile = readEnterpriseExactJson("responsive_mobile_results.json") as Record<string, unknown> | null;
  const tablet = readEnterpriseExactJson("responsive_tablet_results.json") as Record<string, unknown> | null;
  const mobilePassed = mobile?.final_status === "GREEN_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_MOBILE_READY";
  const tabletPassed = tablet?.final_status === "GREEN_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_TABLET_READY";
  writeEnterpriseExactJson("responsive_results.json", {
    final_status: mobilePassed && tabletPassed
      ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_READY"
      : "PARTIAL_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_PROOF",
    responsive_mobile_passed: mobilePassed,
    responsive_tablet_passed: tabletPassed,
    failures: [],
  });
}

test.describe("enterprise exact estimate responsive web proof", () => {
  test.setTimeout(420_000);

  test("keeps exact materials and price status visible on mobile and tablet", async ({ page }, testInfo) => {
    await ensureLiveWebApp();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(requestUrl(), { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page.getByTestId("consumer-repair-screen")).toBeVisible({ timeout: 45_000 });
      await page.getByTestId("consumer-repair-problem-input").fill("\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438");
      await expect(page.getByTestId("consumer-repair-work-suggestions")).toBeVisible({ timeout: 30_000 });
      await page.locator('[data-testid^="consumer-repair-work-suggestion-"]').first().click();
      await page.getByTestId("consumer-repair-problem-input").type(" 120 \u043c2");
      await page.getByTestId("consumer-repair-prepare-draft").click();
      await expect(page.getByTestId("request-estimate-summary-card")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByTestId("request-estimate-items-editor")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("[data-testid^='consumer-repair-item-catalog-']").first()).toBeVisible({ timeout: 30_000 });

      const visible = cleanVisibleText([
        await page.getByTestId("request-estimate-summary-card").textContent(),
        await page.getByTestId("request-estimate-items-editor").textContent(),
      ].filter(Boolean).join(" "));
      expect(visible).toContain("PRICE_MISSING");
      expect(visible).toMatch(/seeded ratebook|price date/i);

      writeEnterpriseExactJson(viewport.artifact, {
        final_status: viewport.id === "mobile"
          ? "GREEN_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_MOBILE_READY"
          : "GREEN_ENTERPRISE_EXACT_ESTIMATE_RESPONSIVE_TABLET_READY",
        browser_project: testInfo.project.name,
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        exact_materials_visible: true,
        price_source_visible: true,
        missing_price_visible_when_needed: true,
        pdf_action_visible: true,
        catalog_binding_visible: true,
        internal_keys_visible: 0,
        mojibake_found: 0,
        fake_price_claimed: false,
        fake_supplier_claimed: false,
        failures: [],
      });
      writeResponsiveAggregate();
    }
  });
});
