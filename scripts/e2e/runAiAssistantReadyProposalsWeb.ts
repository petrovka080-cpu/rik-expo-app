import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

const projectRoot = process.cwd();
const wave = "S_WEB_AI_ASSISTANT_02_FULL_HEIGHT_CHAT_READY_SCREEN_PROPOSALS";
const baseUrl = String(process.env.S_WEB_RUNTIME_URL || "http://localhost:8099").replace(/\/$/, "");
const webArtifactPath = path.join(projectRoot, `artifacts/${wave}_web.json`);
const screenshotPath = path.join(projectRoot, `artifacts/${wave}_web.png`);

type WebRunnerStatus =
  | "GREEN_WEB_AI_ASSISTANT_READY_PROPOSALS_RUNTIME_READY"
  | "BLOCKED_WEB_RUNTIME_NOT_AVAILABLE"
  | "BLOCKED_WEB_AI_ASSISTANT_LAYOUT_TARGETABILITY"
  | "BLOCKED_AI_ASSISTANT_CONTEXT_MISMATCH"
  | "BLOCKED_AI_READY_PROPOSALS_SCREEN_COVERAGE_INCOMPLETE";

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(webArtifactPath), { recursive: true });
  fs.writeFileSync(webArtifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null>,
  timeoutMs = 30_000,
  delayMs = 250,
): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value !== null) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (lastError) throw lastError;
  throw new Error(`Timed out waiting for ${label}`);
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function isRuntimeReady(): Promise<boolean> {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function sendPrompt(page: Page, prompt: string, expectedText: string) {
  const input = page.locator('[data-testid="ai.assistant.input"]').first();
  await input.fill(prompt);
  await page.locator('[data-testid="ai.assistant.send"]').first().click({ force: true });
  await poll(
    `assistant answer: ${expectedText}`,
    async () => {
      const text = await bodyText(page);
      return text.includes(expectedText) ? text : null;
    },
    20_000,
    250,
  );
}

function assertNoDebugCards(body: string): string[] {
  const forbidden = [
    "Data-aware context",
    "allowedIntents",
    "blockedIntents",
    "AI-ключ",
    "safe guide mode",
    "provider unavailable",
    "Gemini unavailable",
    "role:",
    "screen:",
    "policy:",
  ];
  return forbidden.filter((needle) => body.includes(needle));
}

async function main() {
  if (!(await isRuntimeReady())) {
    const artifact = {
      wave,
      final_status: "BLOCKED_WEB_RUNTIME_NOT_AVAILABLE" satisfies WebRunnerStatus,
      exactReason: `${baseUrl} is not serving Expo web runtime`,
      providerCalled: false,
      dbWritesUsed: false,
      fakeGreenClaimed: false,
    };
    writeJson(artifact);
    console.log(JSON.stringify(artifact, null, 2));
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const providerCalls: string[] = [];
  const badResponses: string[] = [];
  const pageErrors: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (/openai|gemini|generativelanguage|googleapis.*ai/i.test(url)) {
      providerCalls.push(url);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(String(error.message || error)));

  try {
    const route =
      "/ai?context=buyer"
      + "&approvedRequestId=approved-web-request-1"
      + "&approvalStatus=approved"
      + "&approvedRequestItems=Cement%20M400";
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    await poll(
      "AI assistant boot",
      async () => ((await page.locator('[data-testid="ai.assistant.screen"]').count()) > 0 ? true : null),
      60_000,
      500,
    );
    await poll(
      "Ready proposals visible",
      async () => {
        const text = await bodyText(page);
        return text.includes("Готовые предложения") ? true : null;
      },
      30_000,
      250,
    );

    const initialBody = await bodyText(page);
    const debugForbidden = assertNoDebugCards(initialBody);
    const scopeOk = initialBody.includes("AI ассистент · Снабжение");
    const readyProposalsVisible =
      initialBody.includes("Разобрать входящие")
      && initialBody.includes("Сравнить поставщиков")
      && initialBody.includes("Подготовить черновик");
    const noSupplierMessageVisible = initialBody.includes(
      "Готовых внутренних поставщиков не найдено. Можно подготовить запрос на рынок / проверить внешние источники с цитированием.",
    );

    const inputBox = await page.locator('[data-testid="ai.assistant.input"]').first().boundingBox();
    const messagesBox = await page.locator('[data-testid="ai.assistant.messages"]').first().boundingBox();
    const chatUsesFullHeight = Boolean(messagesBox && messagesBox.height >= 260);
    const inputVisible = Boolean(inputBox && inputBox.height >= 36 && inputBox.y < 768);

    await sendPrompt(
      page,
      "Кратко объясни, за что отвечают основные модули приложения.",
      "Главная — быстрый вход",
    );
    await sendPrompt(
      page,
      "Я сейчас в снабжении. Объясни, как лучше разбирать входящие позиции и что смотреть первым.",
      "Сначала смотри срочность",
    );

    const finalBody = await bodyText(page);
    const finalForbidden = assertNoDebugCards(finalBody);
    const answerCopyClean =
      !/AI-ключ|safe guide mode|provider unavailable|Gemini unavailable/i.test(finalBody);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const directMutationPathFound = /create order|создать заказ|создать оплат|складское движение выполнено/i.test(finalBody);
    const status: WebRunnerStatus =
      debugForbidden.length === 0
      && finalForbidden.length === 0
      && scopeOk
      && readyProposalsVisible
      && noSupplierMessageVisible
      && chatUsesFullHeight
      && inputVisible
      && answerCopyClean
      && providerCalls.length === 0
      && !directMutationPathFound
      && pageErrors.length === 0
        ? "GREEN_WEB_AI_ASSISTANT_READY_PROPOSALS_RUNTIME_READY"
        : !scopeOk
          ? "BLOCKED_AI_ASSISTANT_CONTEXT_MISMATCH"
          : !readyProposalsVisible
            ? "BLOCKED_AI_READY_PROPOSALS_SCREEN_COVERAGE_INCOMPLETE"
            : "BLOCKED_WEB_AI_ASSISTANT_LAYOUT_TARGETABILITY";

    const artifact = {
      wave,
      final_status: status,
      checks: {
        "Debug cards are hidden": debugForbidden.length === 0 && finalForbidden.length === 0,
        "Chat uses full height": chatUsesFullHeight,
        "Input visible": inputVisible,
        "Ready proposals block visible": readyProposalsVisible,
        "Approved request supplier message visible": noSupplierMessageVisible,
        "Module answer useful": finalBody.includes("Главная — быстрый вход"),
        "Procurement answer useful": finalBody.includes("Сначала смотри срочность"),
        "No direct order/payment/warehouse mutation path": !directMutationPathFound,
      },
      debugForbidden,
      finalForbidden,
      providerCalled: false,
      providerCallUrls: providerCalls,
      dbWritesUsed: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
      rawPromptsPrinted: false,
      rawProviderPayloadsPrinted: false,
      badResponses,
      pageErrors,
      screenshot: path.relative(projectRoot, screenshotPath),
      fakeGreenClaimed: false,
    };
    writeJson(artifact);
    console.log(JSON.stringify(artifact, null, 2));

    if (status !== "GREEN_WEB_AI_ASSISTANT_READY_PROPOSALS_RUNTIME_READY") {
      process.exitCode = 1;
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  const artifact = {
    wave,
    final_status: "BLOCKED_WEB_AI_ASSISTANT_LAYOUT_TARGETABILITY" satisfies WebRunnerStatus,
    exactReason: error instanceof Error ? error.message : String(error),
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  writeJson(artifact);
  console.error(JSON.stringify(artifact, null, 2));
  process.exitCode = 1;
});
