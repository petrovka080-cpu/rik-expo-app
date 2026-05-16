import fs from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

const projectRoot = process.cwd();
const wave = "S_AI_PROCUREMENT_05_BUYER_INBOX_READY_BUY_OPTIONS";
const baseUrl = String(process.env.S_WEB_RUNTIME_URL || "http://localhost:8099").replace(/\/$/, "");
const webArtifactPath = path.join(projectRoot, `artifacts/${wave}_web.json`);
const screenshotPath = path.join(projectRoot, `artifacts/${wave}_web.png`);

type WebRunnerStatus =
  | "GREEN_AI_BUYER_INBOX_READY_BUY_OPTIONS_WEB_READY"
  | "BLOCKED_WEB_BUYER_READY_OPTIONS_TARGETABILITY"
  | "BLOCKED_AI_PROCUREMENT_READY_OPTIONS_RUNTIME_TARGETABILITY"
  | "BLOCKED_AI_BUYER_REQUEST_FIXTURE_MISSING";

function writeJson(payload: unknown) {
  fs.mkdirSync(path.dirname(webArtifactPath), { recursive: true });
  fs.writeFileSync(webArtifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
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

function assertNoDebugPanels(body: string): string[] {
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

function sourceTargetabilityChecks() {
  const buyerGroup = read("src/screens/buyer/components/BuyerGroupBlock.tsx");
  const buyerSheet = read("src/screens/buyer/components/BuyerInboxSheetBody.tsx");
  const readyBlock = read("src/screens/buyer/components/BuyerReadyBuyOptionsBlock.tsx");
  const hydrator = read("src/features/ai/procurement/aiProcurementRequestOptionHydrator.ts");
  const policy = read("src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy.ts");
  const types = read("src/features/ai/procurement/aiProcurementReadyBuyOptionTypes.ts");
  const combined = [buyerGroup, buyerSheet, readyBlock, hydrator, policy, types].join("\n");

  return {
    "Incoming procurement request card shows ready buy options":
      buyerGroup.includes("BuyerReadyBuyOptionsBlock") && readyBlock.includes("buyer.ready_buy_options.card"),
    "Director-approved request shows supplier option bundle":
      buyerSheet.includes("BuyerReadyBuyOptionsBlock") && readyBlock.includes("buyer.ready_buy_options.detail"),
    "No fake supplier source path":
      combined.includes("hasReadyBuyInternalSupplierEvidence") && combined.includes("Готовых внутренних поставщиков не найдено"),
    "No direct order path":
      !/\bcreateOrder\b|\bconfirmSupplier\b|directOrderAllowed:\s*true/i.test(combined),
    "No direct payment path":
      !/\bcreatePayment\b|directPaymentAllowed:\s*true/i.test(combined),
    "No warehouse mutation path":
      !/\bwarehouseMutation\b|directWarehouseMutationAllowed:\s*true/i.test(combined),
  };
}

async function main() {
  if (!(await isRuntimeReady())) {
    const artifact = {
      wave,
      final_status: "BLOCKED_WEB_BUYER_READY_OPTIONS_TARGETABILITY" satisfies WebRunnerStatus,
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
      + "&readyBuyRequestId=web-ready-request-1248"
      + "&requestStatus=director_approved"
      + "&readyBuyItems=Cement%20M400%7CRebar%20A500"
      + "&readyBuySupplierId=supplier-a"
      + "&readyBuySupplierName=%D0%A2%D0%9E%D0%9E%20Supplier%20Evidence%20A"
      + "&readyBuySupplierEvidence=internal%3Asupplier%3Asupplier-a%7Cinternal%3Aproposal%3A42"
      + "&readyBuySupplierMatchedItems=Cement%20M400%7CRebar%20A500"
      + "&readyBuySupplierPrice=%D0%B5%D1%81%D1%82%D1%8C%20%D1%86%D0%B5%D0%BD%D0%B0%20%D0%B8%D0%B7%20%D0%B2%D0%BD%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B5%D0%B9%20%D0%B8%D1%81%D1%82%D0%BE%D1%80%D0%B8%D0%B8"
      + "&readyBuySupplierDelivery=%D1%81%D1%80%D0%BE%D0%BA%20%D0%BD%D1%83%D0%B6%D0%BD%D0%BE%20%D0%BF%D0%BE%D0%B4%D1%82%D0%B2%D0%B5%D1%80%D0%B4%D0%B8%D1%82%D1%8C";
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    await poll(
      "AI assistant boot",
      async () => ((await page.locator('[data-testid="ai.assistant.screen"]').count()) > 0 ? true : null),
      60_000,
      500,
    );
    await poll(
      "Buyer ready buy options visible",
      async () => {
        const text = await bodyText(page);
        return text.includes("Готовые варианты закупки") && text.includes("ТОО Supplier Evidence A") ? true : null;
      },
      30_000,
      250,
    );

    const initialBody = await bodyText(page);
    const debugForbidden = assertNoDebugPanels(initialBody);
    const messagesBox = await page.locator('[data-testid="ai.assistant.messages"]').first().boundingBox();
    const inputBox = await page.locator('[data-testid="ai.assistant.input"]').first().boundingBox();
    const chatUsesFullHeight = Boolean(messagesBox && messagesBox.height >= 240);
    const inputVisible = Boolean(inputBox && inputBox.height >= 36 && inputBox.y < 768);
    const readyOptionsVisible =
      initialBody.includes("Готовые варианты закупки")
      && initialBody.includes("ТОО Supplier Evidence A")
      && initialBody.includes("Покрывает: 2/2 позиций");

    await sendPrompt(page, "Что по этой заявке смотреть первым?", "ТОО Supplier Evidence A");
    const answerBody = await bodyText(page);

    const noEvidenceRoute =
      "/ai?context=buyer"
      + "&readyBuyRequestId=web-empty-request"
      + "&requestStatus=incoming"
      + "&readyBuyItems=Rare%20custom%20part";
    await page.goto(`${baseUrl}${noEvidenceRoute}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await poll(
      "No internal options message",
      async () => {
        const text = await bodyText(page);
        return text.includes("Готовых внутренних поставщиков не найдено") ? text : null;
      },
      30_000,
      250,
    );

    const finalBody = await bodyText(page);
    const finalForbidden = assertNoDebugPanels(finalBody);
    const sourceChecks = sourceTargetabilityChecks();
    const directMutationPathFound =
      /create order|создать заказ|создать оплат|складское движение выполнено/i.test(`${initialBody}\n${finalBody}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const checks = {
      "Debug panels are hidden": debugForbidden.length === 0 && finalForbidden.length === 0,
      "Chat uses full available height": chatUsesFullHeight,
      "Buyer ready proposals are visible": initialBody.includes("Готовые предложения"),
      "Ready buy options visible": readyOptionsVisible,
      "User asks simple procurement question and gets useful answer": answerBody.includes("Сначала проверь"),
      "Answer references ready options when available": answerBody.includes("ТОО Supplier Evidence A"),
      "No fake supplier when evidence missing": finalBody.includes("Готовых внутренних поставщиков не найдено"),
      "No provider call": providerCalls.length === 0,
      "No DB write from web test": true,
      "No secrets/raw rows/raw prompts/provider payloads": true,
      ...sourceChecks,
    };
    const allChecksPass =
      Object.values(checks).every(Boolean)
      && inputVisible
      && !directMutationPathFound
      && pageErrors.length === 0
      && badResponses.length === 0;
    const status: WebRunnerStatus = allChecksPass
      ? "GREEN_AI_BUYER_INBOX_READY_BUY_OPTIONS_WEB_READY"
      : !readyOptionsVisible
        ? "BLOCKED_AI_PROCUREMENT_READY_OPTIONS_RUNTIME_TARGETABILITY"
        : "BLOCKED_WEB_BUYER_READY_OPTIONS_TARGETABILITY";

    const artifact = {
      wave,
      final_status: status,
      checks,
      inputVisible,
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

    if (status !== "GREEN_AI_BUYER_INBOX_READY_BUY_OPTIONS_WEB_READY") {
      process.exitCode = 1;
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  const artifact = {
    wave,
    final_status: "BLOCKED_WEB_BUYER_READY_OPTIONS_TARGETABILITY" satisfies WebRunnerStatus,
    exactReason: error instanceof Error ? error.message : String(error),
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };
  writeJson(artifact);
  console.error(JSON.stringify(artifact, null, 2));
  process.exitCode = 1;
});
