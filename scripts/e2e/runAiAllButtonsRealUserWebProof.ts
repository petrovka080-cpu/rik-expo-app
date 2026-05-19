import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX,
  aiRealUserContextForScreen,
  buildAiRealUserButtonManifest,
  buildAiRealUserUiMatrix,
  describeAiRealUserButtonValue,
  listAiRealUserUiPacks,
  visibleButtonsForPack,
  writeAiRealUserCoreArtifacts,
} from "../ai/aiRealUserButtonProof";
import {
  containsAiRealUserForbiddenUiWord,
  expectedAiRealUserResultTitle,
  hasAiRealUserEnglishLabel,
} from "../../src/features/ai/screenMagic/aiScreenMagicRealUserButtons";

type WebClickTraceEntry = {
  screenId: string;
  context: string;
  buttonId: string;
  labelRu: string;
  actionKind: string;
  route: string;
  clickable: boolean;
  clicked: boolean;
  resultVisible: boolean;
  resultTextLength: number;
  resultPreviewRu: string;
  neededForUser: boolean;
  userValueRu: string;
  usefulnessReasonRu: string;
  resultTitleRu: string;
  resultHasForbiddenWord: boolean;
  resultHasEnglishCopy: boolean;
  blankModalFound: boolean;
  genericFallbackFound: boolean;
  consoleErrors: string[];
  screenshotBefore: string;
  screenshotAfter: string;
};

type ScreenshotIndexEntry = {
  screenId: string;
  buttonId: string;
  before: string;
  after: string;
};

const artifactsDir = path.join(process.cwd(), "artifacts");
const screenshotDir = path.join(artifactsDir, "ai-real-user-ui-button-proof", "web");
const baseUrl = (process.env.S_WEB_RUNTIME_URL ?? "http://localhost:8099").replace(/\/+$/, "");

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 140);
}

function buildRoute(screenId: string): string {
  const url = new URL(`${baseUrl}/ai`);
  url.searchParams.set("context", aiRealUserContextForScreen(screenId));
  url.searchParams.set("screenId", screenId);
  url.searchParams.set("wave6", "1");
  return url.toString();
}

function hasForbiddenBodyCopy(text: string, screenId: string): boolean {
  if (containsAiRealUserForbiddenUiWord(text)) return true;
  if (screenId !== "screen.runtime" && /\bruntime\b|transport binding|service_role|provider unavailable|module unavailable/i.test(text)) {
    return true;
  }
  return false;
}

async function responseCount(page: Page): Promise<number> {
  return page.locator('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]').count();
}

async function latestResultText(page: Page, title: string): Promise<string> {
  await page.waitForFunction(
    (expectedTitle) =>
      Array.from(document.querySelectorAll('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]'))
        .some((element) => (element.textContent ?? "").includes(String(expectedTitle))),
    title,
    { timeout: 15_000 },
  );
  const texts = await page.locator('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent ?? "")
        .filter((text) => text.trim().length > 0),
    );
  return [...texts].reverse().find((text) => text.includes(title)) ?? "";
}

async function assertScreenReady(page: Page, screenId: string, expectedButtonCount: number): Promise<string> {
  await page.waitForSelector('[data-testid="ai.screen_magic_pack"]', { timeout: 30_000 });
  const packCount = await page.locator('[data-testid="ai.screen_magic_pack"]').count();
  if (packCount !== 1) {
    throw new Error(`BLOCKED_AI_NOISE_${screenId}: expected one AI block, found ${packCount}`);
  }
  const actionCount = await page.locator('[data-testid="ai.screen_magic.action"]').count();
  if (actionCount !== expectedButtonCount) {
    throw new Error(`BLOCKED_AI_BUTTON_MANIFEST_${screenId}: expected ${expectedButtonCount} visible buttons, found ${actionCount}`);
  }
  const body = await page.locator("body").innerText({ timeout: 5_000 });
  if (hasForbiddenBodyCopy(body, screenId)) {
    throw new Error(`BLOCKED_AI_TECHNICAL_COPY_VISIBLE_${screenId}`);
  }
  return body;
}

async function run(): Promise<void> {
  fs.mkdirSync(screenshotDir, { recursive: true });

  const visibleManifest = buildAiRealUserButtonManifest().filter((entry) => entry.visibleToUser);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const trace: WebClickTraceEntry[] = [];
  const screenshots: ScreenshotIndexEntry[] = [];

  try {
    for (const pack of listAiRealUserUiPacks()) {
      const route = buildRoute(pack.screenId);
      const visibleButtons = visibleButtonsForPack(pack);
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);
      await assertScreenReady(page, pack.screenId, visibleButtons.length);

      for (const [index, button] of visibleButtons.entries()) {
        const buttonConsoleStart = consoleErrors.length;
        const beforeCount = await responseCount(page);
        const baseName = `${safeFileName(pack.screenId)}-${String(index + 1).padStart(2, "0")}-${safeFileName(button.id)}`;
        const beforePath = path.join(screenshotDir, `${baseName}-before.png`);
        const afterPath = path.join(screenshotDir, `${baseName}-after.png`);
        await page.screenshot({ path: beforePath, fullPage: true });

        const buttonLocator = page.locator('[data-testid="ai.screen_magic.action"]').filter({ hasText: button.label }).first();
        await buttonLocator.scrollIntoViewIfNeeded({ timeout: 5_000 });
        await buttonLocator.click({ timeout: 10_000 });
        await page.waitForFunction(
          (count) => document.querySelectorAll('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]').length > count,
          beforeCount,
          { timeout: 20_000 },
        );
        await page.waitForSelector('[data-testid="ai.assistant.loading"]', { state: "detached", timeout: 20_000 }).catch(() => undefined);

        const title = expectedAiRealUserResultTitle(button.actionKind);
        const resultText = await latestResultText(page, title);
        await page.screenshot({ path: afterPath, fullPage: true });

        const value = describeAiRealUserButtonValue({ pack, button });
        const perButtonErrors = consoleErrors.slice(buttonConsoleStart);
        const resultHasForbiddenWord = containsAiRealUserForbiddenUiWord(resultText);
        const resultHasEnglishCopy = hasAiRealUserEnglishLabel(resultText);
        const genericFallbackFound = /generic fallback|provider unavailable|module unavailable|нет контекста/i.test(resultText);
        const blankModalFound = resultText.trim().length < 80;
        const resultVisible = resultText.includes(title) &&
          !resultHasForbiddenWord &&
          !resultHasEnglishCopy &&
          !genericFallbackFound &&
          !blankModalFound;
        trace.push({
          screenId: pack.screenId,
          context: aiRealUserContextForScreen(pack.screenId),
          buttonId: button.id,
          labelRu: button.label,
          actionKind: button.actionKind,
          route,
          clickable: true,
          clicked: true,
          resultVisible,
          resultTextLength: resultText.trim().length,
          resultPreviewRu: resultText.trim().split(/\n+/).slice(0, 6).join(" ").slice(0, 320),
          ...value,
          resultTitleRu: title,
          resultHasForbiddenWord,
          resultHasEnglishCopy,
          blankModalFound,
          genericFallbackFound,
          consoleErrors: perButtonErrors,
          screenshotBefore: path.relative(process.cwd(), beforePath),
          screenshotAfter: path.relative(process.cwd(), afterPath),
        });
        screenshots.push({
          screenId: pack.screenId,
          buttonId: button.id,
          before: path.relative(process.cwd(), beforePath),
          after: path.relative(process.cwd(), afterPath),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const webOk = trace.length === visibleManifest.length &&
    trace.every((entry) =>
      entry.clickable &&
      entry.clicked &&
      entry.resultVisible &&
      entry.consoleErrors.length === 0 &&
      !entry.blankModalFound &&
      !entry.genericFallbackFound,
    );
  const androidTracePath = path.join(artifactsDir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_android_tap_trace.json`);
  const androidOk = fs.existsSync(androidTracePath) &&
    JSON.parse(fs.readFileSync(androidTracePath, "utf8")).trace?.every?.((entry: { tapped?: boolean; resultVisibleAfterTap?: boolean }) =>
      entry.tapped === true && entry.resultVisibleAfterTap === true,
    ) === true;
  const matrix = buildAiRealUserUiMatrix({
    webProofPass: webOk,
    androidProofPass: androidOk,
    webScreenshotsCaptured: screenshots.length === trace.length && screenshots.length > 0,
    androidScreenshotsCaptured: androidOk,
  });
  const artifact = {
    wave: "S_AI_REAL_USER_UI_BUTTON_PROOF_POINT_OF_NO_RETURN",
    scope: process.argv.includes("--scope") ? process.argv[process.argv.indexOf("--scope") + 1] : "ALL_AI_SCREENS",
    final_status: webOk
      ? "GREEN_AI_REAL_USER_UI_BUTTONS_WEB_READY"
      : "BLOCKED_WEB_AI_REAL_USER_BUTTON_PROOF",
    web_runtime_url: baseUrl,
    all_visible_ai_buttons_clicked_on_web: webOk,
    visible_buttons_expected: visibleManifest.length,
    visible_buttons_clicked: trace.filter((entry) => entry.clicked).length,
    all_buttons_have_visible_result: trace.every((entry) => entry.resultVisible),
    blank_modals_found: trace.filter((entry) => entry.blankModalFound).length,
    generic_results_found: trace.filter((entry) => entry.genericFallbackFound).length,
    console_errors_found: trace.reduce((count, entry) => count + entry.consoleErrors.length, 0),
    screenshots_captured: screenshots.length,
    fakeGreenClaimed: false,
  };

  writeAiRealUserCoreArtifacts({
    webProofPass: webOk,
    androidProofPass: androidOk,
    webScreenshotsCaptured: screenshots.length === trace.length && screenshots.length > 0,
    androidScreenshotsCaptured: androidOk,
  });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_web_click_trace.json`),
    `${JSON.stringify({ trace }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_screenshots_index.json`),
    `${JSON.stringify({ screenshots }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_web.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(artifact, null, 2));

  if (!webOk || matrix.all_visible_ai_buttons_clicked_on_web !== true) {
    throw new Error(`${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX} web button proof blocked`);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_REAL_USER_UI_BUTTON_PROOF_ARTIFACT_PREFIX}_web.json`),
    `${JSON.stringify({
      wave: "S_AI_REAL_USER_UI_BUTTON_PROOF_POINT_OF_NO_RETURN",
      final_status: "BLOCKED_WEB_AI_REAL_USER_BUTTON_PROOF",
      web_runtime_url: baseUrl,
      exact_blocker: message,
      fakeGreenClaimed: false,
    }, null, 2)}\n`,
    "utf8",
  );
  console.error(message);
  process.exit(1);
});
