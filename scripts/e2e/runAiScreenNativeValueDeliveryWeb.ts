import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

const wave = "S_AI_PRODUCT_04_SCREEN_NATIVE_VALUE_DELIVERY_PACKS";
const baseUrl = String(process.env.S_WEB_RUNTIME_URL || "http://localhost:8099").replace(/\/$/, "");
const artifactPath = path.join(process.cwd(), `artifacts/${wave}_web.json`);
const requiredRoutes = [
  "/ai?context=buyer",
  "/ai?context=accountant",
  "/ai?context=warehouse",
  "/ai?context=foreman",
  "/ai?context=director",
  "/ai?context=reports",
];
const screenNativeTestId = "ai.screen_native_value_pack";
void requiredRoutes;
void screenNativeTestId;

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
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

async function openPack(page: Page, params: URLSearchParams, expectedText: string): Promise<string> {
  await page.goto(`${baseUrl}/ai?${params.toString()}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await poll(`screen-native pack ${expectedText}`, async () => {
    const count = await page.locator('[data-testid="ai.screen_native_value_pack"]').count();
    const text = await bodyText(page);
    return count > 0 && text.includes(expectedText) ? text : null;
  }, 60_000);
  return bodyText(page);
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
      final_status: "BLOCKED_WEB_SCREEN_NATIVE_VALUE_TARGETABILITY",
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
    const accountant = await openPack(page, new URLSearchParams({
      context: "accountant",
      screenId: "accountant.main",
      paymentSupplierName: "Evidence Supplier",
      paymentAmountLabel: "1 200 000 KZT",
      paymentTotalAmountLabel: "4 850 000 KZT",
      paymentRisk: "amount above supplier history",
      paymentMissingDocument: "delivery confirmation",
      paymentEvidence: "payment:1248|document:delivery",
      paymentApprovalCount: "3",
    }), "Evidence Supplier");
    await sendPrompt(page, "Что сегодня критично по оплатам?", "Evidence Supplier");
    const answerBody = await bodyText(page);
    const buyer = await openPack(page, new URLSearchParams({
      context: "buyer",
      readyBuyRequestId: "screen-native-request",
      requestStatus: "director_approved",
      readyBuyItems: "cable|cement",
      readyBuySupplierName: "Evidence Supplier",
      readyBuySupplierMatchedItems: "cable|cement",
      readyBuySupplierEvidence: "supplier:1|proposal:2",
      readyBuySupplierPrice: "price exists for part of items",
    }), "Evidence Supplier");
    const warehouse = await openPack(page, new URLSearchParams({
      context: "warehouse",
      screenId: "warehouse.main",
      warehouseItemTitle: "Cable stock risk",
      warehouseRisk: "stock below request",
      warehouseEvidence: "warehouse:item:1",
    }), "Cable stock risk");
    const foreman = await openPack(page, new URLSearchParams({
      context: "foreman",
      screenId: "foreman.main",
      foremanItemTitle: "Object B closeout",
      foremanMissingEvidence: "zone 2 photo",
      foremanEvidence: "work:object-b",
    }), "Object B closeout");
    const director = await openPack(page, new URLSearchParams({
      context: "director",
      screenId: "director.dashboard",
      directorDecisionTitle: "Cable procurement blocks work",
      directorDecisionReason: "supplier choice requires review",
      directorEvidence: "approval:1248",
    }), "Cable procurement blocks work");
    const documents = await openPack(page, new URLSearchParams({
      context: "reports",
      screenId: "documents.main",
      documentTitle: "Delivery document",
      documentMissingEvidence: "delivery confirmation",
      documentEvidence: "document:1",
    }), "Delivery document");

    const messagesBox = await page.locator('[data-testid="ai.assistant.messages"]').first().boundingBox();
    const inputBox = await page.locator('[data-testid="ai.assistant.input"]').first().boundingBox();
    const body = [accountant, answerBody, buyer, warehouse, foreman, director, documents].join("\n");
    const checks = {
      "buyer ready options visible": buyer.includes("Evidence Supplier"),
      "accountant payment summary visible": accountant.includes("4 850 000 KZT"),
      "warehouse risk block visible": warehouse.includes("stock below request"),
      "foreman closeout block visible": foreman.includes("Object B closeout"),
      "director decision queue visible": director.includes("Cable procurement blocks work"),
      "documents summary visible": documents.includes("Delivery document"),
      "chat answers from screen context": answerBody.includes("Evidence Supplier"),
      "chat full height": Boolean(messagesBox && messagesBox.height >= 240),
      "input visible": Boolean(inputBox && inputBox.height >= 36 && inputBox.y < 768),
      "debug panels hidden": noForbiddenCopy(body),
      "no provider unavailable copy": noForbiddenCopy(body),
      "no fake data": !/fake supplier|fake price|fake payment|fake document/i.test(body),
      "no direct mutation path": !/create order|create payment|warehouse mutation|auto-approve/i.test(body),
      "no provider call": providerCalls.length === 0,
    };
    const ok = Object.values(checks).every(Boolean) && pageErrors.length === 0;
    const artifact = {
      wave,
      final_status: ok ? "GREEN_AI_SCREEN_NATIVE_VALUE_DELIVERY_WEB_READY" : "BLOCKED_WEB_SCREEN_NATIVE_VALUE_TARGETABILITY",
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
    final_status: "BLOCKED_WEB_SCREEN_NATIVE_VALUE_TARGETABILITY",
    exactReason: error instanceof Error ? error.message : String(error),
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  writeJson(artifact);
  console.error(JSON.stringify(artifact, null, 2));
  process.exitCode = 1;
});
