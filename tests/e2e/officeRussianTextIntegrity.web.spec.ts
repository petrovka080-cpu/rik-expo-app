import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "S_OFFICE_RUSSIAN_TEXT_INTEGRITY", "web");

const ROUTES = [
  "/office/director",
  "/office/foreman",
  "/office/buyer",
  "/office/accountant",
  "/request",
] as const;

const forbiddenPatterns: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "mojibake",
    pattern:
      /[\u0420\u0421][\u0080-\u00bf\u00d7\u2010-\u202f\u0400-\u040f\u0450-\u045f\u0490-\u0491]|[\u00d0\u00d1][\u0080-\u00bf\u0400-\u045f]|\ufffd|\u043f\u0457\u0405|\u0413[\u0450-\u045f\u2010-\u202f]|\u0432\u0402[\u201c\u201d\u00a6]/u,
  },
  { name: "test supplier label", pattern: /E2E Supplier/u },
  { name: "internal system id", pattern: /\bSYS-[A-Z0-9_-]+\b/u },
  { name: "director report code", pattern: /\bdirector_reports\b/u },
  { name: "summary bucket code", pattern: /\bsummary_buckets\b/u },
  { name: "request timeout code", pattern: /\brequest_timeout_discipline\b/u },
];

function routeUrl(route: (typeof ROUTES)[number]): string {
  return new URL(route, BASE_URL).toString();
}

function routeSlug(route: string): string {
  return route.replace(/^\//, "").replace(/[^a-z0-9_-]+/gi, "_") || "root";
}

function findVisibleTextViolations(text: string): string[] {
  return forbiddenPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ name }) => name);
}

async function readBodyText(page: Page): Promise<string> {
  await page.waitForFunction(() => (document.body?.textContent ?? "").trim().length > 0, null, {
    timeout: 30_000,
  });
  const text = await page.evaluate(() => document.body?.textContent ?? "");
  return text.replace(/\s+/g, " ").trim();
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

test("keeps office and request web routes free of mojibake/internal visible text", async ({ page }) => {
  await ensureLiveWebApp();
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });

  const transcripts: Array<{
    route: string;
    screenshotPath: string;
    textSample: string;
    violations: string[];
  }> = [];

  for (const route of ROUTES) {
    await page.goto(routeUrl(route), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("body").waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 30_000 });
    const text = await readBodyText(page);
    const violations = findVisibleTextViolations(text);
    const screenshotPath = path.join(SCREENSHOT_DIR, `${routeSlug(route)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    transcripts.push({
      route,
      screenshotPath,
      textSample: text.slice(0, 1200),
      violations,
    });

    expect(text.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);

    if (route === "/office/director") {
      await page.getByTestId("director-top-tab-reports").click();
      await page.getByTestId("director-reports-home-card").click();
      await expect(page.getByText("Объекты по подтверждённым выдачам").first()).toBeVisible({
        timeout: 30_000,
      });
      const reportsModalText = await readBodyText(page);
      const reportsModalViolations = findVisibleTextViolations(reportsModalText);
      const reportsModalScreenshotPath = path.join(SCREENSHOT_DIR, "office_director_reports_modal.png");
      await page.screenshot({ path: reportsModalScreenshotPath, fullPage: true });
      transcripts.push({
        route: `${route}#reports-modal`,
        screenshotPath: reportsModalScreenshotPath,
        textSample: reportsModalText.slice(0, 1200),
        violations: reportsModalViolations,
      });
      expect(reportsModalViolations).toEqual([]);
    }
  }

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, "office_russian_text_integrity.json"),
    `${JSON.stringify(
      {
        baseUrl: BASE_URL,
        webPlaywrightPassed: true,
        routes: ROUTES,
        transcripts,
        fakeGreenClaimed: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  expect(consoleErrors).toEqual([]);
});
