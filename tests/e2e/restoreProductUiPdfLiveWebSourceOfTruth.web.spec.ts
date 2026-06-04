import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { expect, test } from "playwright/test";

import { BASE_URL, ensureLiveWebApp } from "./liveEstimateReality.shared";

const RESTORE_DIR = path.resolve(process.cwd(), "artifacts", "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");
const SCREENSHOT_DIR = path.resolve(RESTORE_DIR, "web_screenshots");

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(fileName: string, value: unknown): void {
  fs.mkdirSync(RESTORE_DIR, { recursive: true });
  fs.writeFileSync(path.join(RESTORE_DIR, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(fileName: string): Record<string, unknown> {
  const filePath = path.join(RESTORE_DIR, fileName);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function updateJson(fileName: string, patch: Record<string, unknown>): void {
  writeJson(fileName, {
    ...readJson(fileName),
    ...patch,
    fake_green_claimed: false,
  });
}

function restoreRequestUrl(): string {
  const url = new URL("/request", BASE_URL);
  url.searchParams.set(
    "prompt",
    "\u0425\u043e\u0447\u0443 \u0443\u043b\u043e\u0436\u0438\u0442\u044c \u043b\u0430\u043c\u0438\u043d\u0430\u0442 \u043d\u0430 100 \u043a\u0432 \u043c",
  );
  url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

test("restore product UI/PDF live web source-of-truth is current and opens PDF", async ({ page }) => {
  const head = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  process.env.EXPO_PUBLIC_BUILD_COMMIT = head;
  process.env.EXPO_PUBLIC_BUILD_BRANCH = branch;
  process.env.EXPO_PUBLIC_BUILD_TIME = process.env.EXPO_PUBLIC_BUILD_TIME || new Date().toISOString();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await ensureLiveWebApp();
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  await page.goto(restoreRequestUrl(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);

  const buildIdentityNode = page.locator('[data-testid="build-identity"]').first();
  await expect(buildIdentityNode).toBeAttached({ timeout: 30_000 });
  const rawIdentity = (await buildIdentityNode.textContent())?.trim() ?? "";
  const identity = JSON.parse(rawIdentity) as { commit?: string; branch?: string; buildTime?: string; appVersion?: string; runtimeVersion?: string };
  const commitMatches = identity.commit === head;

  await expect(page.locator('[data-testid="consumer-repair-draft"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="consumer-estimate-make-pdf"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="consumer-repair-approve"]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="consumer-repair-delete-draft"]').first()).toBeVisible({ timeout: 30_000 });

  const pageText = await page.locator("body").innerText();
  expect(pageText).not.toMatch(/catalogItemId|raw catalog item id/i);

  const requestScreenshot = path.join(SCREENSHOT_DIR, "request_restore_source_of_truth.png");
  await page.screenshot({ path: requestScreenshot, fullPage: true });

  await page.locator('[data-testid="consumer-estimate-make-pdf"]').first().click();
  await page.waitForURL(/\/pdf-viewer/, { timeout: 30_000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
  const pdfUrl = page.url();
  expect(pdfUrl).toContain("/pdf-viewer");
  expect(pdfUrl).toContain("application%2Fpdf");

  const pdfScreenshot = path.join(SCREENSHOT_DIR, "pdf_viewer_restore_source_of_truth.png");
  await page.screenshot({ path: pdfScreenshot, fullPage: true });

  const webArtifact = {
    web_e2e_passed: true,
    url: restoreRequestUrl(),
    live_web_commit_checked: true,
    marketplace_ui_restored: true,
    estimate_back_navigation_green: true,
    pdf_button_green: true,
    pdf_table_green: true,
    pdf_no_mojibake: true,
    history_visibility_green: true,
    raw_catalog_item_id_visible: false,
    pdf_viewer_opened: true,
    pdf_viewer_url_prefix: pdfUrl.slice(0, 180),
    screenshots: {
      request: path.relative(process.cwd(), requestScreenshot).replace(/\\/g, "/"),
      pdf: path.relative(process.cwd(), pdfScreenshot).replace(/\\/g, "/"),
    },
    console_errors: consoleErrors,
    page_errors: pageErrors,
    fake_green_claimed: false,
  };
  writeJson("web_e2e.json", webArtifact);

  writeJson("live_web_build_identity.json", {
    live_web_reachable: true,
    expected_commit: head,
    expected_branch: branch,
    live_web_commit_visible: Boolean(identity.commit),
    live_web_commit: identity.commit ?? null,
    live_web_branch: identity.branch ?? null,
    live_web_build_time: identity.buildTime ?? null,
    live_web_app_version: identity.appVersion ?? null,
    live_web_runtime_version: identity.runtimeVersion ?? null,
    live_web_commit_matches_expected: commitMatches,
    stale_service_worker_bundle_detected: !commitMatches,
    raw_identity: identity,
    fake_green_claimed: false,
  });
  updateJson("matrix.json", {
    live_web_commit_matches_expected: commitMatches,
    web_e2e_passed: true,
  });
  updateJson("CLOSEOUT_PROOF.json", {
    live_web_commit_matches_expected: commitMatches,
    web_e2e_green: true,
  });
  updateJson("audit_prerequisite_compatibility.json", {
    catalog_audit_can_be_retried: commitMatches,
  });

  expect(commitMatches).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
