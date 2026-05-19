import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  AI_GROUNDED_QA_ARTIFACT_PREFIX,
  AI_GROUNDED_QA_WAVE,
  buildAiGroundedButtonTrace,
  buildAiGroundedFreeTextTrace,
  writeAiGroundedQaArtifacts,
} from "../ai/aiGroundedButtonsAndFreeTextProof";
import {
  aiRealUserContextForScreen,
  listAiRealUserUiPacks,
  visibleButtonsForPack,
} from "../ai/aiRealUserButtonProof";

type WebGroundedTraceEntry = {
  screenId: string;
  context: string;
  kind: "button" | "free_text";
  id: string;
  labelRu: string;
  route: string;
  clickedOrAsked: boolean;
  resultVisible: boolean;
  resultGrounded: boolean;
  sourceSectionVisible: boolean;
  genericCopyFound: boolean;
  technicalCopyFound: boolean;
  consoleErrors: string[];
  resultPreviewRu: string;
  screenshotBefore: string;
  screenshotAfter: string;
};

type ScreenshotIndexEntry = {
  screenId: string;
  kind: "button" | "free_text";
  id: string;
  before: string;
  after: string;
};

const artifactsDir = path.join(process.cwd(), "artifacts");
const screenshotDir = path.join(artifactsDir, "ai-grounded-buttons-free-text-qa", "web");
const baseUrl = (process.env.S_WEB_RUNTIME_URL ?? "http://localhost:8099").replace(/\/+$/, "");
const bannedCopyPattern =
  /AI\s+собирает\s+этот\s+блок|данных\s+текущего\s+экрана|проверенных\s+маршрутов|safe_read|draft_only|approval_required|exact_blocker|provider unavailable|module unavailable|generic fallback/i;

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 140);
}

function buildRoute(screenId: string): string {
  const url = new URL(`${baseUrl}/ai`);
  url.searchParams.set("context", aiRealUserContextForScreen(screenId));
  url.searchParams.set("screenId", screenId);
  url.searchParams.set("groundedQa", "1");
  return url.toString();
}

function resultIsGrounded(text: string): boolean {
  return text.trim().length >= 120 &&
    /Коротко:/i.test(text) &&
    /Источники:/i.test(text) &&
    /Статус:/i.test(text) &&
    !bannedCopyPattern.test(text) &&
    (/Что найдено:/i.test(text) || /Точная причина:/i.test(text) || /Уточняющий вопрос:/i.test(text));
}

async function responseCount(page: Page): Promise<number> {
  return page.locator('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]').count();
}

async function latestResponseAfter(page: Page, beforeCount: number): Promise<string> {
  await page.waitForFunction(
    (count) => document.querySelectorAll('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]').length > count,
    beforeCount,
    { timeout: 25_000 },
  );
  await page.waitForSelector('[data-testid="ai.assistant.loading"]', { state: "detached", timeout: 25_000 }).catch(() => undefined);
  const texts = await page.locator('[data-testid="ai.assistant.response"], [data-testid="ai.assistant.response.history"]')
    .evaluateAll((elements) => elements.map((element) => element.textContent ?? "").filter((text) => text.trim().length > 0));
  return texts[texts.length - 1] ?? "";
}

async function assertScreenReady(page: Page, screenId: string, expectedButtonCount: number): Promise<void> {
  await page.waitForSelector('[data-testid="ai.screen_magic_pack"]', { timeout: 30_000 });
  const packCount = await page.locator('[data-testid="ai.screen_magic_pack"]').count();
  if (packCount !== 1) throw new Error(`BLOCKED_AI_NOISE_${screenId}: expected one AI block, found ${packCount}`);
  const actionCount = await page.locator('[data-testid="ai.screen_magic.action"]').count();
  if (actionCount !== expectedButtonCount) {
    throw new Error(`BLOCKED_ACTION_HAS_NO_CONCRETE_QUESTION_${screenId}_manifest: expected ${expectedButtonCount}, found ${actionCount}`);
  }
  const body = await page.locator("body").innerText({ timeout: 5_000 });
  if (bannedCopyPattern.test(body)) throw new Error(`BLOCKED_BUTTON_HAS_GENERIC_RESULT_${screenId}_body`);
}

async function sendQuestion(page: Page, question: string): Promise<void> {
  const input = page.locator('[data-testid="ai.assistant.input"]').first();
  await input.scrollIntoViewIfNeeded({ timeout: 5_000 });
  await input.fill(question);
  await page.locator('[data-testid="ai.assistant.send"]').first().click({ timeout: 10_000 });
}

async function run(): Promise<void> {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const expectedButtonTrace = buildAiGroundedButtonTrace();
  const expectedFreeTextTrace = buildAiGroundedFreeTextTrace();
  const expectedButtonsByScreen = new Map<string, number>();
  for (const entry of expectedButtonTrace) {
    expectedButtonsByScreen.set(entry.screenId, (expectedButtonsByScreen.get(entry.screenId) ?? 0) + 1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const trace: WebGroundedTraceEntry[] = [];
  const screenshots: ScreenshotIndexEntry[] = [];

  try {
    for (const pack of listAiRealUserUiPacks()) {
      const route = buildRoute(pack.screenId);
      const visibleButtons = visibleButtonsForPack(pack);
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => undefined);
      await assertScreenReady(page, pack.screenId, expectedButtonsByScreen.get(pack.screenId) ?? visibleButtons.length);

      for (const [index, button] of visibleButtons.entries()) {
        const beforeCount = await responseCount(page);
        const consoleStart = consoleErrors.length;
        const baseName = `${safeFileName(pack.screenId)}-button-${String(index + 1).padStart(2, "0")}-${safeFileName(button.id)}`;
        const beforePath = path.join(screenshotDir, `${baseName}-before.png`);
        const afterPath = path.join(screenshotDir, `${baseName}-after.png`);
        await page.screenshot({ path: beforePath, fullPage: true });

        const buttonLocator = page.locator('[data-testid="ai.screen_magic.action"]').filter({ hasText: button.label }).first();
        await buttonLocator.scrollIntoViewIfNeeded({ timeout: 5_000 });
        await buttonLocator.click({ timeout: 10_000 });
        const resultText = await latestResponseAfter(page, beforeCount);
        await page.screenshot({ path: afterPath, fullPage: true });

        const resultGrounded = resultIsGrounded(resultText);
        trace.push({
          screenId: pack.screenId,
          context: aiRealUserContextForScreen(pack.screenId),
          kind: "button",
          id: button.id,
          labelRu: button.label,
          route,
          clickedOrAsked: true,
          resultVisible: resultText.trim().length >= 120,
          resultGrounded,
          sourceSectionVisible: /Источники:/i.test(resultText),
          genericCopyFound: bannedCopyPattern.test(resultText),
          technicalCopyFound: bannedCopyPattern.test(resultText),
          consoleErrors: consoleErrors.slice(consoleStart),
          resultPreviewRu: resultText.trim().split(/\n+/).slice(0, 8).join(" ").slice(0, 420),
          screenshotBefore: path.relative(process.cwd(), beforePath),
          screenshotAfter: path.relative(process.cwd(), afterPath),
        });
        screenshots.push({
          screenId: pack.screenId,
          kind: "button",
          id: button.id,
          before: path.relative(process.cwd(), beforePath),
          after: path.relative(process.cwd(), afterPath),
        });
      }

      for (const question of expectedFreeTextTrace.filter((entry) => entry.screenId === pack.screenId)) {
        const beforeCount = await responseCount(page);
        const consoleStart = consoleErrors.length;
        const baseName = `${safeFileName(pack.screenId)}-question-${safeFileName(question.questionId)}`;
        const beforePath = path.join(screenshotDir, `${baseName}-before.png`);
        const afterPath = path.join(screenshotDir, `${baseName}-after.png`);
        await page.screenshot({ path: beforePath, fullPage: true });
        await sendQuestion(page, question.questionRu);
        const resultText = await latestResponseAfter(page, beforeCount);
        await page.screenshot({ path: afterPath, fullPage: true });
        const resultGrounded = resultIsGrounded(resultText);
        trace.push({
          screenId: pack.screenId,
          context: aiRealUserContextForScreen(pack.screenId),
          kind: "free_text",
          id: question.questionId,
          labelRu: question.questionRu,
          route,
          clickedOrAsked: true,
          resultVisible: resultText.trim().length >= 120,
          resultGrounded,
          sourceSectionVisible: /Источники:/i.test(resultText),
          genericCopyFound: bannedCopyPattern.test(resultText),
          technicalCopyFound: bannedCopyPattern.test(resultText),
          consoleErrors: consoleErrors.slice(consoleStart),
          resultPreviewRu: resultText.trim().split(/\n+/).slice(0, 8).join(" ").slice(0, 420),
          screenshotBefore: path.relative(process.cwd(), beforePath),
          screenshotAfter: path.relative(process.cwd(), afterPath),
        });
        screenshots.push({
          screenId: pack.screenId,
          kind: "free_text",
          id: question.questionId,
          before: path.relative(process.cwd(), beforePath),
          after: path.relative(process.cwd(), afterPath),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const webOk = trace.length === expectedButtonTrace.length + expectedFreeTextTrace.length &&
    trace.every((entry) =>
      entry.clickedOrAsked &&
      entry.resultVisible &&
      entry.resultGrounded &&
      entry.sourceSectionVisible &&
      entry.consoleErrors.length === 0 &&
      !entry.genericCopyFound &&
      !entry.technicalCopyFound,
    );
  const androidPath = path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_android.json`);
  const androidOk = fs.existsSync(androidPath) &&
    JSON.parse(fs.readFileSync(androidPath, "utf8")).all_targetable_ai_buttons_tapped_on_android === true;
  const core = writeAiGroundedQaArtifacts({ webProofPass: webOk, androidProofPass: androidOk });
  const artifact = {
    wave: AI_GROUNDED_QA_WAVE,
    scope: process.argv.includes("--scope") ? process.argv[process.argv.indexOf("--scope") + 1] : "ALL_AI_SCREENS",
    final_status: webOk
      ? "GREEN_AI_GROUNDED_BUTTONS_AND_FREE_TEXT_QA_WEB_READY"
      : "BLOCKED_AI_GROUNDED_BUTTONS_AND_FREE_TEXT_QA_WEB",
    web_runtime_url: baseUrl,
    all_visible_ai_buttons_clicked_on_web: trace.filter((entry) => entry.kind === "button").every((entry) => entry.clickedOrAsked),
    free_text_questions_answered_on_web: trace.filter((entry) => entry.kind === "free_text").every((entry) => entry.clickedOrAsked),
    trace_entries: trace.length,
    expected_trace_entries: expectedButtonTrace.length + expectedFreeTextTrace.length,
    generic_answers_found: trace.filter((entry) => entry.genericCopyFound).length,
    technical_copy_found: trace.filter((entry) => entry.technicalCopyFound).length,
    console_errors_found: trace.reduce((sum, entry) => sum + entry.consoleErrors.length, 0),
    screenshots_captured: screenshots.length,
    matrix_final_status_after_web: core.matrix.final_status,
    fake_green_claimed: false,
  };

  fs.writeFileSync(
    path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_web.json`),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_web_click_trace.json`),
    `${JSON.stringify({ trace }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_GROUNDED_QA_ARTIFACT_PREFIX}_screenshots_index.json`),
    `${JSON.stringify({ screenshots }, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(artifact, null, 2));
  if (!webOk) throw new Error("BLOCKED_BUTTON_HAS_GENERIC_RESULT_web_grounded_proof");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
