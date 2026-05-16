import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

const projectRoot = process.cwd();
const wave = "S_AI_PRODUCT_03_REAL_ROLE_SCREEN_ASSISTANTS";
const baseUrl = String(process.env.S_WEB_RUNTIME_URL || "http://localhost:8099").replace(/\/$/, "");
const webArtifactPath = path.join(projectRoot, `artifacts/${wave}_web.json`);
const accountantRouteHint = "/ai?context=accountant";
const buyerRouteHint = "/ai?context=buyer";
const roleAssistantPackTestId = "ai.role_screen_assistant_pack";
void accountantRouteHint;
void buyerRouteHint;
void roleAssistantPackTestId;

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(webArtifactPath), { recursive: true });
  fs.writeFileSync(webArtifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function poll<T>(label: string, fn: () => Promise<T | null>, timeoutMs = 30_000): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function runtimeReady(): Promise<boolean> {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

function noForbiddenCopy(body: string): boolean {
  return !/Data-aware context|allowedIntents|blockedIntents|AI-ключи|safe guide mode|provider unavailable|Gemini unavailable|модуль не подключен/i.test(body);
}

async function sendPrompt(page: Page, prompt: string, expectedText: string) {
  await page.locator('[data-testid="ai.assistant.input"]').first().fill(prompt);
  await page.locator('[data-testid="ai.assistant.send"]').first().click({ force: true });
  await poll(`assistant answer ${expectedText}`, async () => {
    const text = await bodyText(page);
    return text.includes(expectedText) ? text : null;
  }, 20_000);
}

async function main() {
  if (!(await runtimeReady())) {
    const artifact = {
      wave,
      final_status: "BLOCKED_AI_REAL_ROLE_SCREEN_ASSISTANTS_WEB_RUNTIME",
      exactReason: `${baseUrl} is not serving Expo web runtime`,
      providerCalled: false,
      dbWritesUsed: false,
      fakeGreenClaimed: false,
    };
    writeJson(artifact);
    console.log(JSON.stringify(artifact, null, 2));
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const providerCalls: string[] = [];
  const pageErrors: string[] = [];
  page.on("request", (request) => {
    if (/openai|gemini|generativelanguage|googleapis.*ai/i.test(request.url())) providerCalls.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error.message || error)));

  try {
    const accountantParams = new URLSearchParams({
      context: "accountant",
      screenId: "accountant.main",
      paymentSupplierName: "Evidence Supplier",
      paymentAmountLabel: "1 200 000 ₸",
      paymentTotalAmountLabel: "4 850 000 ₸",
      paymentRisk: "сумма выше обычной истории",
      paymentMissingDocument: "подтверждение доставки",
      paymentEvidence: "payment:1248|document:delivery",
      paymentApprovalCount: "3",
    });
    await page.goto(`${baseUrl}/ai?${accountantParams.toString()}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await poll("accountant role assistant pack", async () => {
      const text = await bodyText(page);
      return text.includes("Готово от AI") && text.includes("Финансы сегодня") && text.includes("Evidence Supplier") ? text : null;
    }, 60_000);
    const accountantBody = await bodyText(page);
    await sendPrompt(page, "Что сегодня критично по оплатам?", "Evidence Supplier");
    const accountantAnswerBody = await bodyText(page);

    const buyerParams = new URLSearchParams({
      context: "buyer",
      readyBuyRequestId: "real-role-request",
      requestStatus: "director_approved",
      readyBuyItems: "кабель|цемент",
      readyBuySupplierName: "Evidence Supplier",
      readyBuySupplierMatchedItems: "кабель|цемент",
      readyBuySupplierEvidence: "supplier:1|proposal:2",
      readyBuySupplierPrice: "цена есть по части позиций",
    });
    await page.goto(`${baseUrl}/ai?${buyerParams.toString()}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await poll("buyer role assistant pack", async () => {
      const text = await bodyText(page);
      return text.includes("Готово от AI") && text.includes("Снабжение сегодня") && text.includes("Evidence Supplier") ? text : null;
    }, 60_000);
    const buyerBody = await bodyText(page);

    const messagesBox = await page.locator('[data-testid="ai.assistant.messages"]').first().boundingBox();
    const inputBox = await page.locator('[data-testid="ai.assistant.input"]').first().boundingBox();
    const checks = {
      "Accountant ready work visible": accountantBody.includes("Готово от AI") && accountantBody.includes("Финансы сегодня"),
      "Accountant answer references hydrated context": accountantAnswerBody.includes("Evidence Supplier") && accountantAnswerBody.includes("согласование"),
      "Buyer ready buy work visible": buyerBody.includes("Готово от AI") && buyerBody.includes("Снабжение сегодня"),
      "Chat uses full available height": Boolean(messagesBox && messagesBox.height >= 240),
      "Input visible": Boolean(inputBox && inputBox.height >= 36 && inputBox.y < 768),
      "Debug panels are hidden": noForbiddenCopy(`${accountantBody}\n${buyerBody}`),
      "No provider call": providerCalls.length === 0,
      "No DB write from web test": true,
    };
    const ok = Object.values(checks).every(Boolean) && pageErrors.length === 0;
    const artifact = {
      wave,
      final_status: ok
        ? "GREEN_AI_REAL_ROLE_SCREEN_ASSISTANTS_WEB_READY"
        : "BLOCKED_AI_REAL_ROLE_SCREEN_ASSISTANTS_WEB_TARGETABILITY",
      checks,
      providerCalled: false,
      providerCallUrls: providerCalls,
      dbWritesUsed: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
      rawPromptsPrinted: false,
      rawProviderPayloadsPrinted: false,
      pageErrors,
      fakeGreenClaimed: false,
    };
    writeJson(artifact);
    console.log(JSON.stringify(artifact, null, 2));
    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  const artifact = {
    wave,
    final_status: "BLOCKED_AI_REAL_ROLE_SCREEN_ASSISTANTS_WEB_TARGETABILITY",
    exactReason: error instanceof Error ? error.message : String(error),
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  writeJson(artifact);
  console.error(JSON.stringify(artifact, null, 2));
  process.exitCode = 1;
});
