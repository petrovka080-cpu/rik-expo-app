import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { createAndroidHarness } from "./_shared/androidHarness";
import { buildRuntimeSummary, createFailurePlatformResult } from "./_shared/runtimeSummary";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const baseUrl = "http://localhost:8081";
const password = "Pass1234";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-finance-runtime-verify" } },
});

const runtimeOutPath = path.join(projectRoot, "artifacts/director-finance-runtime.json");
const runtimeSummaryOutPath = path.join(projectRoot, "artifacts/director-finance-runtime.summary.json");
const webArtifactBase = "artifacts/director-finance-web-smoke";
const androidDevClientPort = Number(process.env.DIRECTOR_ANDROID_DEV_PORT ?? "8081");
const androidOnlyRuntime = process.env.WAVE3_ANDROID_ONLY === "1" || process.env.RUNTIME_ANDROID_ONLY === "1";
const androidDevClientStdoutPath = path.join(projectRoot, `artifacts/director-dev-client-${androidDevClientPort}.stdout.log`);
const androidDevClientStderrPath = path.join(projectRoot, `artifacts/director-dev-client-${androidDevClientPort}.stderr.log`);

const WEB_LABELS = {
  email: "Email",
  header: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c",
  financeTab: "\u0424\u0438\u043d\u0430\u043d\u0441\u044b",
  debtCard: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430",
  spendCard: "\u0420\u0430\u0441\u0445\u043e\u0434\u044b",
  debtModalTitle: "\u0414\u043e\u043b\u0433\u0438 \u0438 \u0440\u0438\u0441\u043a\u0438",
  suppliersSection: "\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0438 (\u0434\u043e\u043b\u0433)",
  supplierPdf: "\u0421\u0432\u043e\u0434\u043a\u0430 (PDF)",
  debtSummary: "\u0414\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c:",
  emptyState: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445",
};

const WEB_TEXT = {
  header: [WEB_LABELS.header, "\u0420\u0459\u0420\u0455\u0420\u045a\u0421\u201a\u0421\u201a\u0420\u0455\u0420\u00bb\u0421\u040a"],
  financeTab: [WEB_LABELS.financeTab, "\u0420\u201e\u0420\u0451\u0420\u045a\u0420\u00b0\u0420\u045a\u0421\u2039"],
  debtCard: [WEB_LABELS.debtCard, "\u0420\u045e\u0420\u00b1\u0421\u040f\u0420\u00b7\u0420\u00b0\u0421\u201a\u0420\u00b5\u0420\u00bb\u0421\u040c\u0421\u0401\u0421\u201a\u0420\u0406\u0420\u00b0"],
  spendCard: [WEB_LABELS.spendCard, "\u0420\u00a0\u0420\u00b0\u0421\u0401\u0421\u2026\u0420\u0455\u0420\u00b4\u0421\u2039"],
  debtModalTitle: [WEB_LABELS.debtModalTitle, "\u0420\u201d\u0420\u0455\u0420\u00bb\u0420\u0456\u0420\u0451 \u0420\u0451 \u0421\u0402\u0420\u0455\u0421\u0401\u0420\u045a\u0420\u0455"],
  suppliersSection: [WEB_LABELS.suppliersSection, "\u0420\u040f\u0420\u0455\u0421\u0401\u0421\u201a\u0420\u00b0\u0420\u0406\u0421\u2030\u0420\u0451\u0420\u045a\u0420\u0455 (\u0420\u0451\u0420\u0455\u0420\u00bb\u0420\u0456)"],
  supplierPdf: [WEB_LABELS.supplierPdf, "\u0420\u040e\u0420\u0406\u0420\u0455\u0420\u00b4\u0420\u045a\u0420\u00b0 (PDF)"],
  debtSummary: [
    WEB_LABELS.debtSummary,
    "\u041a \u043e\u043f\u043b\u0430\u0442\u0435:",
    "\u0420\u201d\u0420\u0455\u0420\u00bb\u0420\u0456 \u0420\u045f\u0420\u0455 \u0420\u045f\u0421\u0402\u0420\u00b5\u0420\u00b4\u0420\u00bb\u0420\u0455\u0420\u00b6\u0420\u00b5\u0420\u0405\u0420\u0451\u0421\u040f\u0420\u00bc:",
    "\u0420\u0459 \u0420\u0455\u0420\u040f\u0420\u00bb\u0420\u00b0\u0421\u201a\u0420\u00b5:",
  ],
  debtLabel: ["\u0414\u043e\u043b\u0433:", "\u0420\u201d\u0420\u0455\u0420\u00bb\u0420\u0456:"],
  emptyState: [WEB_LABELS.emptyState, "\u0420\u045a\u0420\u00b5\u0421\u201a \u0420\u00b4\u0420\u00b0\u0420\u0459\u0420\u0459\u0421\u2039\u0421\u2026"],
};

const WEB_LOGIN_RE = /\u0412\u043e\u0439\u0442\u0438|Login/i;
const WEB_SUPPLIER_ROW_RE = /\u0421\u0447\u0435\u0442\u043e\u0432 .* \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043e\u043f\u043b\u0430\u0442\u044b .* \u043a\u0440\u0438\u0442\u0438\u0447\u043d\u043e/i;

const DEV_LAUNCHER_LABELS = ["Development Build", "DEVELOPMENT SERVERS"];

const ANDROID_LABELS = {
  financeTab: ["\u0424\u0438\u043d\u0430\u043d\u0441\u044b", "\u0420\u201e\u0420\u0451\u0420\u045a\u0420\u00b0\u0420\u045a\u0421\u2039"],
  debtCard: ["\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430", "\u0420\u045e\u0420\u00b1\u0421\u040f\u0420\u00b7\u0420\u00b0\u0421\u201a\u0420\u00b5\u0420\u00bb\u0421\u040c\u0421\u0401\u0421\u201a\u0420\u0406\u0420\u00b0"],
  spendCard: ["\u0420\u0430\u0441\u0445\u043e\u0434\u044b", "\u0420\u00a0\u0420\u00b0\u0421\u0401\u0421\u2026\u0420\u0455\u0420\u00b4\u0421\u2039"],
  debtModalTitle: ["\u0414\u043e\u043b\u0433\u0438 \u0438 \u0440\u0438\u0441\u043a\u0438", "\u0420\u201d\u0420\u0455\u0420\u00bb\u0420\u0456\u0420\u0451 \u0420\u0451 \u0421\u0402\u0420\u0455\u0421\u0401\u0420\u045a\u0420\u0455"],
  suppliersSection: ["\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0438 (\u0434\u043e\u043b\u0433)", "\u0420\u040f\u0420\u0455\u0421\u0401\u0421\u201a\u0420\u00b0\u0420\u0406\u0421\u2030\u0420\u0451\u0420\u045a\u0420\u0455 (\u0420\u0451\u0420\u0455\u0420\u00bb\u0420\u0456)"],
  supplierPdf: ["\u0421\u0432\u043e\u0434\u043a\u0430 (PDF)", "\u0420\u040e\u0420\u0406\u0420\u0455\u0420\u00b4\u0420\u045a\u0420\u00b0 (PDF)"],
  period: ["\u041f\u0435\u0440\u0438\u043e\u0434", "\u0420\u040f\u0420\u00b5\u0421\u0402\u0420\u0451\u0420\u0455\u0420\u00b4"],
  refresh: ["\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c", "\u0420\u045e\u0420\u00b1\u0420\u045a\u0420\u0455\u0420\u0406\u0420\u0451\u0421\u201a\u0421\u040c"],
  close: ["\u0417\u0430\u043a\u0440\u044b\u0442\u044c", "\u0420\u2014\u0420\u00b0\u0420\u045a\u0421\u0402\u0421\u2039\u0421\u201a\u0421\u040c"],
  debtSummary: [
    "\u0414\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c",
    "\u041a \u043e\u043f\u043b\u0430\u0442\u0435",
    "\u0420\u201d\u0420\u0455\u0420\u00bb\u0420\u0456 \u0420\u045f\u0420\u0455 \u0420\u045f\u0421\u0402\u0420\u00b5\u0420\u00b4\u0420\u00bb\u0420\u0455\u0420\u00b6\u0420\u00b5\u0420\u0405\u0420\u0451\u0421\u040f\u0420\u00bc",
    "\u0420\u0459 \u0420\u0455\u0420\u040f\u0420\u00bb\u0420\u00b0\u0421\u201a\u0420\u00b5",
  ],
  emptyState: ["\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445", "\u0420\u045a\u0420\u00b5\u0421\u201a \u0420\u00b4\u0420\u00b0\u0420\u0459\u0420\u0459\u0421\u2039\u0421\u2026"],
};

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const includesAnyLabel = (text: string, labels: string[]) => labels.some((label) => text.includes(label));
const hasFinanceHomeSurface = (text: string) => includesAnyLabel(text, [...WEB_TEXT.debtCard, ...WEB_TEXT.spendCard]);
const hasFinanceDebtSurface = (text: string) =>
  includesAnyLabel(text, [...WEB_TEXT.debtModalTitle, ...WEB_TEXT.suppliersSection]);

const webTextLocator = (page: import("playwright").Page, labels: string[]) =>
  page.getByText(new RegExp(labels.map(escapeRegex).join("|"), "i")).first();

const findVisibleWebText = async (
  page: import("playwright").Page,
  labels: string[],
): Promise<import("playwright").Locator | null> => {
  const locator = page.getByText(new RegExp(labels.map(escapeRegex).join("|"), "i"));
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
};

const clickWebLocatorWithAncestors = async (
  page: import("playwright").Page,
  locator: import("playwright").Locator,
) => {
  const point = await locator.evaluate((node) => {
    let current: HTMLElement | null = node as HTMLElement;
    let chosen: HTMLElement = node as HTMLElement;
    while (current) {
      const rect = current.getBoundingClientRect();
      const fitsCard =
        rect.width >= 180 &&
        rect.height >= 32 &&
        rect.width <= window.innerWidth - 12 &&
        rect.height <= window.innerHeight;
      if (fitsCard) {
        chosen = current;
        break;
      }
      current = current.parentElement;
    }

    const rect = chosen.getBoundingClientRect();
    return {
      x: rect.left + Math.max(24, Math.min(rect.width / 2, rect.width - 24)),
      y: rect.top + rect.height / 2,
    };
  }).catch(() => null);

  if (point) {
    await page.mouse.click(point.x, point.y).catch(() => {});
  }
  await locator.click({ force: true }).catch(() => {});
};

const waitForVisibleWebText = async (
  page: import("playwright").Page,
  labels: string[],
  timeoutMs = 30_000,
): Promise<import("playwright").Locator> => {
  const visible = await poll(
    `director:web_visible:${labels[0] ?? "label"}`,
    async () => (await findVisibleWebText(page, labels)) ?? null,
    timeoutMs,
    250,
  );
  return visible;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
  devClientStdoutPath: androidDevClientStdoutPath,
  devClientStderrPath: androidDevClientStderrPath,
});

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 250,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function createTempUser(role: string, fullName: string): Promise<TempUser> {
  const email = `director.finance.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  return { id: user.id, email, password, role };
}

async function cleanupTempUser(user: TempUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {}
}

async function bodyText(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() => (document.body.innerText || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim());
}

async function waitForBody(page: import("playwright").Page, needles: string | string[], timeoutMs = 30_000) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.join("|")}`,
    async () => {
      const body = await bodyText(page);
      return list.some((needle) => body.includes(needle)) ? body : null;
    },
    timeoutMs,
    250,
  );
}

async function loginDirector(page: import("playwright").Page, user: TempUser) {
  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" });
  const emailInput = page.locator(`input[placeholder="${WEB_LABELS.email}"]`).first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    const loginButton = page.getByText(WEB_LOGIN_RE).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

async function runWebRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  let browser: import("playwright").Browser | null = null;

  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
    badResponses: [] as { url: string; status: number; method: string }[],
    screenshot: `${webArtifactBase}.png`,
  };

  try {
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Director Finance Smoke");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push(String(error?.message ?? error));
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        runtime.badResponses.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    await loginDirector(page, user);
    const initialBody = await waitForBody(
      page,
      [
        ...WEB_TEXT.header,
        ...WEB_TEXT.financeTab,
        ...WEB_TEXT.debtCard,
        ...WEB_TEXT.spendCard,
        ...WEB_TEXT.debtModalTitle,
        ...WEB_TEXT.suppliersSection,
        ...WEB_TEXT.debtSummary,
      ],
      45_000,
    );

    let financeHomeBody = initialBody;
    if (!hasFinanceHomeSurface(initialBody) && !hasFinanceDebtSurface(initialBody)) {
      const financeTab = await findVisibleWebText(page, WEB_TEXT.financeTab);
      if (financeTab) {
        await financeTab.click();
      }
      financeHomeBody = await waitForBody(
        page,
        [...WEB_TEXT.debtCard, ...WEB_TEXT.spendCard, ...WEB_TEXT.debtModalTitle, ...WEB_TEXT.debtSummary],
        30_000,
      );
    }

    const debtCard = await findVisibleWebText(page, WEB_TEXT.debtCard);
    if (!debtCard) {
      throw new Error("Visible debt card was not found on director finance home screen");
    }
    await clickWebLocatorWithAncestors(page, debtCard);
    await waitForVisibleWebText(page, [...WEB_TEXT.debtModalTitle, ...WEB_TEXT.suppliersSection], 10_000).catch(() => null);
    const debtBody = await bodyText(page);

    let supplierToggle = await findVisibleWebText(page, WEB_TEXT.suppliersSection);
    let supplierToggleVisible = supplierToggle != null;
    if (!supplierToggleVisible) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await page.mouse.wheel(0, 480);
        await page.waitForTimeout(200);
        supplierToggle = await findVisibleWebText(page, WEB_TEXT.suppliersSection);
        supplierToggleVisible = supplierToggle != null;
        if (supplierToggleVisible) break;
      }
    }
    if (supplierToggleVisible && supplierToggle) {
      await clickWebLocatorWithAncestors(page, supplierToggle);
    }

    const supplierRow = page.getByText(WEB_SUPPLIER_ROW_RE).first();
    const supplierRowVisible = await poll(
      "director:web_supplier_rows",
      async () => ((await supplierRow.count()) > 0 ? true : null),
      8_000,
      250,
    ).catch(() => false);
    const supplierEmptyStateVisible =
      !supplierRowVisible &&
      (await poll(
        "director:web_supplier_empty",
        async () => {
          const body = await bodyText(page);
          return includesAnyLabel(body, WEB_TEXT.emptyState) ? true : null;
        },
        8_000,
        250,
      ).catch(() => false));

    if (supplierRowVisible) {
      await clickWebLocatorWithAncestors(page, supplierRow);
    }
    const supplierBody =
      supplierRowVisible
        ? await waitForVisibleWebText(page, [...WEB_TEXT.supplierPdf, ...WEB_TEXT.debtLabel], 30_000)
            .then(() => bodyText(page))
            .catch(() => "")
        : "";

    await page.screenshot({ path: runtime.screenshot, fullPage: true });

    const blockingConsoleErrors = runtime.console.filter(isBlockingWebConsoleError);
    const financeHomeCardsRendered =
      includesAnyLabel(financeHomeBody, WEB_TEXT.debtCard) &&
      includesAnyLabel(financeHomeBody, WEB_TEXT.spendCard);
    const debtSurfaceText = `${financeHomeBody}\n${debtBody}`;
    const debtModalOpened =
      includesAnyLabel(debtSurfaceText, WEB_TEXT.debtModalTitle) ||
      includesAnyLabel(debtSurfaceText, WEB_TEXT.suppliersSection) ||
      includesAnyLabel(debtSurfaceText, WEB_TEXT.debtSummary);
    const result = {
      status:
        financeHomeCardsRendered &&
        debtModalOpened &&
        blockingConsoleErrors.length === 0 &&
        runtime.pageErrors.length === 0 &&
        runtime.badResponses.length === 0
          ? "passed"
          : "failed",
      financeTabOpened: true,
      financeHomeCardsRendered,
      debtModalOpened,
      supplierToggleVisible,
      supplierRowVisible,
      supplierEmptyStateVisible,
      supplierDetailOpened:
        includesAnyLabel(supplierBody, WEB_TEXT.supplierPdf) && includesAnyLabel(supplierBody, WEB_TEXT.debtLabel),
      consoleErrorsEmpty: blockingConsoleErrors.length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.length === 0,
      screenshot: runtime.screenshot,
      platformSpecificIssues: blockingConsoleErrors.map((entry) => entry.text),
    };

    writeJson(path.join(projectRoot, `${webArtifactBase}.json`), runtime);
    writeJson(path.join(projectRoot, `${webArtifactBase}.summary.json`), result);
    return { ...result, runtime };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: encoding === "buffer" ? undefined : encoding,
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "")}`.trim());
  }
  return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
};

const tailText = (fullPath: string, maxChars = 4000) => {
  if (!fs.existsSync(fullPath)) return "";
  const text = fs.readFileSync(fullPath, "utf8");
  return text.slice(Math.max(0, text.length - maxChars));
};

const buildAndroidDevClientUrl = (port: number) => `http://127.0.0.1:${port}`;

const xcrunAvailable = (): boolean => {
  const result = spawnSync("xcrun", ["--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.status === 0;
};

const parseAndroidNodes = (xml: string): AndroidNode[] => {
  const nodes: AndroidNode[] = [];
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return attrMatch?.[1] ?? "";
    };
    nodes.push({
      text: pick("text"),
      contentDesc: pick("content-desc"),
      className: pick("class"),
      clickable: pick("clickable") === "true",
      enabled: pick("enabled") === "true",
      bounds: pick("bounds"),
      hint: pick("hint"),
    });
  }
  return nodes;
};

const parseBoundsCenter = (bounds: string): { x: number; y: number } | null => {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
};

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const pressAndroidKey = (keyCode: string | number) => {
  execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const escapeAndroidInputText = (value: string) =>
  String(value ?? "").replace(/ /g, "%s");

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const dumpAndroidScreen = (name: string) => {
  const xmlDevicePath = `/sdcard/${name}.xml`;
  const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
  const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
  execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
  execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
  fs.writeFileSync(pngArtifactPath, screenshot);
  return {
    xmlPath: `artifacts/${name}.xml`,
    pngPath: `artifacts/${name}.png`,
    xml: fs.readFileSync(xmlArtifactPath, "utf8"),
  };
};

const detectAndroidPackage = (): string | null => {
  const packages = adb(["shell", "pm", "list", "packages"]);
  if (packages.includes("package:com.azisbek_dzhantaev.rikexpoapp")) {
    return "com.azisbek_dzhantaev.rikexpoapp";
  }
  if (packages.includes("package:host.exp.exponent")) {
    return "host.exp.exponent";
  }
  return null;
};

const startAndroidDirectorRoute = (packageName: string | null) => {
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://director"];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const buildAndroidDevClientDeepLink = (port: number) =>
  `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(buildAndroidDevClientUrl(port))}`;

async function isAndroidDevClientServerReachable(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

const ensureAndroidReverseProxy = (port: number) => {
  execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

async function warmAndroidDevClientBundle(port: number) {
  const candidates = [
    `http://127.0.0.1:${port}/status`,
    `http://127.0.0.1:${port}/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false`,
    `http://127.0.0.1:${port}/index.bundle?platform=android&dev=true&minify=false`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) continue;
      await response.text();
      return;
    } catch {
      continue;
    }
  }
}

const resetAndroidAppState = (packageName: string | null) => {
  if (!packageName) return;
  execFileSync("adb", ["shell", "am", "force-stop", packageName], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  execFileSync("adb", ["shell", "pm", "clear", packageName], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

async function ensureAndroidDevClientServer() {
  if (await isAndroidDevClientServerReachable(androidDevClientPort)) {
    return {
      port: androidDevClientPort,
      startedByScript: false,
      cleanup: () => undefined,
    };
  }

  fs.writeFileSync(androidDevClientStdoutPath, "");
  fs.writeFileSync(androidDevClientStderrPath, "");

  const child = spawn(
    process.execPath,
    [
      path.join(projectRoot, "node_modules", "expo", "bin", "cli"),
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--non-interactive",
      "--port",
      String(androidDevClientPort),
      "--clear",
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        BROWSER: "none",
        EXPO_NO_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(androidDevClientStdoutPath, chunk);
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(androidDevClientStderrPath, chunk);
  });

  try {
    await poll(
      "android:director_dev_client_manifest_ready",
      async () => ((await isAndroidDevClientServerReachable(androidDevClientPort)) ? true : null),
      180_000,
      1500,
    );
  } catch (error) {
    const stdoutTail = tailText(androidDevClientStdoutPath);
    const stderrTail = tailText(androidDevClientStderrPath);
    if (child.pid) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 15_000,
      });
    }
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        stdoutTail ? `dev-client stdout tail:\n${stdoutTail}` : null,
        stderrTail ? `dev-client stderr tail:\n${stderrTail}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return {
    port: androidDevClientPort,
    startedByScript: true,
    cleanup: () => {
      if (!child.pid) return;
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 15_000,
      });
    },
  };
}

const startAndroidDevClientProject = (packageName: string | null, port: number) => {
  const args = [
    "shell",
    "am",
    "start",
    "-S",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    buildAndroidDevClientDeepLink(port),
  ];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Войти|Login|Р’РѕР№С‚Рё/i.test(xml);

const isAndroidFinanceHome = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.debtCard) && matchesAndroidLabel(xml, ANDROID_LABELS.spendCard);

const isAndroidDevLauncherHome = (xml: string) =>
  DEV_LAUNCHER_LABELS.every((label) => xml.includes(label));

const isAndroidDevLauncherErrorScreen = (xml: string) =>
  xml.includes("There was a problem loading the project.") ||
  xml.includes("This development build encountered the following error.");

const isAndroidDevMenuIntroScreen = (xml: string) =>
  xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");

const isAndroidDirectorRenderableScreen = (xml: string) =>
  isAndroidLoginScreen(xml) || matchesAndroidLabel(xml, ANDROID_LABELS.financeTab) || isAndroidFinanceHome(xml);

const isAndroidDirectorControlHome = (xml: string) =>
  /\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c|\u0420\u0459\u0420\u0455\u0420\u045a\u0421\u201a\u0421\u201a\u0420\u0455\u0420\u00bb\u0421\u040a/i.test(xml) &&
  matchesAndroidLabel(xml, ANDROID_LABELS.financeTab);

const isAndroidDirectorSurface = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.financeTab) || isAndroidFinanceHome(xml);

const isAndroidDebtModal = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.debtModalTitle) ||
  matchesAndroidLabel(xml, ANDROID_LABELS.suppliersSection) ||
  matchesAndroidLabel(xml, ANDROID_LABELS.debtSummary);

const isAndroidSupplierModal = (xml: string) => matchesAndroidLabel(xml, ANDROID_LABELS.supplierPdf);

const findAndroidTopTab = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null => {
  for (const node of nodes) {
    const label = `${node.contentDesc} ${node.text}`.trim();
    if (!node.clickable || !node.enabled || !label || !matchesAndroidLabel(label, labels)) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    if (top >= 150 && bottom <= 420) return node;
  }
  return null;
};

const findAndroidDevServerNode = (nodes: AndroidNode[], preferredPort: number): AndroidNode | null => {
  const candidates = nodes
    .filter((node) => node.enabled && /http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):\d+/i.test(node.text))
    .sort((left, right) => {
      const leftPort = Number(left.text.match(/:(\d+)/)?.[1] ?? 0);
      const rightPort = Number(right.text.match(/:(\d+)/)?.[1] ?? 0);
      if (leftPort === preferredPort && rightPort !== preferredPort) return -1;
      if (rightPort === preferredPort && leftPort !== preferredPort) return 1;
      return rightPort - leftPort;
    });
  return candidates[0] ?? null;
};

const dismissAndroidDevMenuIntro = (xml: string) => {
  const nodes = parseAndroidNodes(xml);
  const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close/i.test(`${node.text} ${node.contentDesc}`));
  if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;

  const continueNode = findAndroidNode(
    nodes,
    (node) => node.enabled && /Continue/i.test(`${node.text} ${node.contentDesc}`),
  );
  if (continueNode && tapAndroidBounds(continueNode.bounds)) return true;

  pressAndroidKey(4);
  return true;
};

async function ensureAndroidDevClientLoaded(packageName: string | null, port: number) {
  ensureAndroidReverseProxy(port);
  startAndroidDevClientProject(packageName, port);

  let screen = await poll(
    "android:director_dev_client_loaded",
    async () => {
      await sleep(2500);
      const next = dumpAndroidScreen("android-director-finance-dev-client-loading");
      if (isAndroidDevMenuIntroScreen(next.xml)) {
        dismissAndroidDevMenuIntro(next.xml);
        return null;
      }
      if (isAndroidDirectorRenderableScreen(next.xml)) return next;
      if (isAndroidDevLauncherHome(next.xml)) return next;
      if (isAndroidDevLauncherErrorScreen(next.xml)) {
        const compactError = next.xml.replace(/\s+/g, " ").slice(0, 2000);
        throw new Error(`android dev client error screen: ${compactError}`);
      }
      return null;
    },
    180_000,
    2500,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!isAndroidDevLauncherHome(screen.xml)) return screen;
    const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml), port);
    if (!serverNode) return screen;
    tapAndroidBounds(serverNode.bounds);
    screen = await poll(
      "android:director_dev_client_reloaded",
      async () => {
        await sleep(2500);
        const next = dumpAndroidScreen(`android-director-finance-dev-client-${attempt + 1}`);
        if (isAndroidDevMenuIntroScreen(next.xml)) {
          dismissAndroidDevMenuIntro(next.xml);
          return null;
        }
        if (isAndroidDirectorRenderableScreen(next.xml)) return next;
        if (isAndroidDevLauncherErrorScreen(next.xml)) {
          const compactError = next.xml.replace(/\s+/g, " ").slice(0, 2000);
          throw new Error(`android dev client error screen: ${compactError}`);
        }
        return isAndroidDevLauncherHome(next.xml) ? next : null;
      },
      180_000,
      2500,
    );
  }

  return screen;
}

const findAndroidLabelNode = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const label = `${node.contentDesc} ${node.text}`.trim();
    return node.clickable && node.enabled && label.length > 0 && matchesAndroidLabel(label, labels);
  });

const findAndroidLoginNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      /Р’РѕР№С‚Рё|Login|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(`${node.text} ${node.contentDesc}`),
  );

const findAndroidSupplierRowNode = (nodes: AndroidNode[]): AndroidNode | null => {
  for (const node of nodes) {
    const label = `${node.contentDesc} ${node.text}`.trim();
    if (!node.clickable || !node.enabled || !label) continue;
    if (matchesAndroidLabel(label, ANDROID_LABELS.suppliersSection)) continue;
    if (matchesAndroidLabel(label, ANDROID_LABELS.period)) continue;
    if (matchesAndroidLabel(label, ANDROID_LABELS.refresh)) continue;
    if (matchesAndroidLabel(label, ANDROID_LABELS.close)) continue;
    if (!/KGS/i.test(label)) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    if (top >= 700 && bottom <= 2235) return node;
  }
  return null;
};

async function dismissAndroidClosableOverlays(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (isAndroidFinanceHome(screen.xml)) return screen;

    const closeNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), ANDROID_LABELS.close);
    if (!closeNode) return screen;

    tapAndroidBounds(closeNode.bounds);
    await sleep(1200);
    screen = dumpAndroidScreen(`android-director-finance-close-${attempt + 1}`);
  }

  return screen;
}

async function loginDirectorAndroid(user: TempUser, packageName: string | null, devClientPort: number) {
  writeJson(path.join(projectRoot, "artifacts/android-director-finance-user.json"), user);
  {
    const current = await androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: "rik://director",
      artifactBase: "android-director-finance",
      successPredicate: (xml) => isAndroidDirectorControlHome(xml) || isAndroidDirectorSurface(xml) || isAndroidDebtModal(xml),
      renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidDirectorControlHome(xml) || isAndroidDirectorSurface(xml) || isAndroidDebtModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
    });
    return dismissAndroidClosableOverlays(current);
  }
  resetAndroidAppState(packageName);
  let current = await ensureAndroidDevClientLoaded(packageName, devClientPort);
  if (isAndroidDevMenuIntroScreen(current.xml)) {
    dismissAndroidDevMenuIntro(current.xml);
    current = await poll(
      "android:director_dev_menu_closed",
      async () => {
        const next = dumpAndroidScreen("android-director-finance-dev-menu-closed");
        if (isAndroidDevMenuIntroScreen(next.xml)) return null;
        return next;
      },
      15_000,
      1000,
    ).catch(() => dumpAndroidScreen("android-director-finance-dev-menu-timeout"));
  }
  if (!isAndroidLoginScreen(current.xml) && !isAndroidDevLauncherHome(current.xml)) {
    return dismissAndroidClosableOverlays(current);
  }
  if (isAndroidLoginScreen(current.xml)) {
    const nodes = parseAndroidNodes(current.xml);
  const emailNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /email/i.test(`${node.text} ${node.hint}`),
  );
  const passwordNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /Пароль|password|РџР°СЂРѕР»СЊ/i.test(`${node.text} ${node.hint}`),
  );
  const loginNode = findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      /Войти|Login|Р’РѕР№С‚Рё/i.test(`${node.text} ${node.contentDesc}`),
  );

  const stableLoginNode = findAndroidLoginNode(nodes) ?? loginNode;

  const requireLoginControl = <T,>(node: T | null, label: string): T => {
    if (!node) throw new Error(`Android director ${label} control was not found`);
    return node;
  };
  const emailControl = requireLoginControl(emailNode, "email");
  const passwordControl = requireLoginControl(passwordNode, "password");
  const loginControl = requireLoginControl(stableLoginNode, "login");

  tapAndroidBounds(emailControl.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  tapAndroidBounds(passwordControl.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  pressAndroidKey(4);
  await sleep(500);
  tapAndroidBounds(loginControl.bounds);
  await sleep(1200);
  pressAndroidKey(66);
  await sleep(1500);

    current = await poll(
    "android:director_login_complete",
    async () => {
      const screen = dumpAndroidScreen("android-director-finance-after-login");
      if (isAndroidLoginScreen(screen.xml)) {
        const retryLoginNode = findAndroidLoginNode(parseAndroidNodes(screen.xml));
        if (retryLoginNode) {
          pressAndroidKey(4);
          await sleep(300);
          tapAndroidBounds(retryLoginNode.bounds);
        }
      }
      return isAndroidLoginScreen(screen.xml) ? null : screen;
    },
    45_000,
    1500,
    );
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (isAndroidDevLauncherHome(current.xml)) {
      current = await ensureAndroidDevClientLoaded(packageName, devClientPort);
    }
    if (isAndroidDirectorSurface(current.xml)) {
      return dismissAndroidClosableOverlays(current);
    }

    startAndroidDirectorRoute(packageName);
    await sleep(1500);
    current = dumpAndroidScreen(`android-director-finance-route-${attempt + 1}`);
    if (isAndroidDevMenuIntroScreen(current.xml)) {
      dismissAndroidDevMenuIntro(current.xml);
      current = await poll(
        "android:director_route_dev_menu_closed",
        async () => {
          const next = dumpAndroidScreen("android-director-finance-route-dev-menu-closed");
          if (isAndroidDevMenuIntroScreen(next.xml)) return null;
          return next;
        },
        15_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-director-finance-route-dev-menu-timeout"));
    }
  }
  return dismissAndroidClosableOverlays(current);
}

async function ensureAndroidFinanceTab(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidFinanceHome(screen.xml)) {
    return { screen, switched: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.financeTab);
    if (!tab) {
      return {
        screen,
        switched: false,
        issue: "Finance top tab was not found on Android director screen",
      };
    }

    tapAndroidBounds(tab.bounds);
    await sleep(1200);

    try {
      screen = await poll(
        `android:director_finance_tab:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`android-director-finance-tab-${attempt + 1}`);
          return isAndroidFinanceHome(next.xml) ? next : null;
        },
        15_000,
        1000,
      );
    } catch {
      screen = dumpAndroidScreen(`android-director-finance-tab-${attempt + 1}-timeout`);
    }

    if (isAndroidFinanceHome(screen.xml)) {
      return { screen, switched: true, issue: null as string | null };
    }
  }

  return {
    screen,
    switched: false,
    issue: "Finance tab did not open after tapping the Android director tab strip",
  };
}

async function runAndroidRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  const devices = adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    return {
      status: "failed",
      financeHomeVisible: false,
      debtModalOpened: false,
      supplierDetailOpened: false,
      platformSpecificIssues: ["No Android emulator/device detected"],
    };
  }

  try {
    const devClient = await ensureAndroidDevClientServer();
    const packageName = detectAndroidPackage();
    const preflight = androidHarness.runAndroidPreflight({ packageName, clearApp: true });
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Director Finance Android");
    try {
      await warmAndroidDevClientBundle(devClient.port);
      const current = await loginDirectorAndroid(user, packageName, devClient.port);
    const platformSpecificIssues: string[] = [];

    const financeTab = await ensureAndroidFinanceTab(current);
    let workingScreen = financeTab.screen;
    if (financeTab.issue) {
      platformSpecificIssues.push(financeTab.issue);
    }

    const debtCard = findAndroidLabelNode(parseAndroidNodes(workingScreen.xml), ANDROID_LABELS.debtCard);
    if (!debtCard) {
      return {
        status: "failed",
        financeHomeVisible: isAndroidFinanceHome(workingScreen.xml),
        debtModalOpened: false,
        supplierDetailOpened: false,
        currentXml: workingScreen.xmlPath,
        currentPng: workingScreen.pngPath,
        platformSpecificIssues: [...platformSpecificIssues, "Debt card was not found on Android director finance screen"],
      };
    }

    tapAndroidBounds(debtCard.bounds);
    await sleep(1200);

    let debtModal = await poll(
      "android:director_finance_debt_modal",
      async () => {
        const next = dumpAndroidScreen("android-director-finance-debt-modal");
        return isAndroidDebtModal(next.xml) ? next : null;
      },
      20_000,
      1000,
    ).catch(() => dumpAndroidScreen("android-director-finance-debt-modal-timeout"));

    const suppliersToggle = findAndroidLabelNode(parseAndroidNodes(debtModal.xml), ANDROID_LABELS.suppliersSection);
    let supplierRowsVisible = false;
    let supplierEmptyStateVisible = false;
    if (suppliersToggle) {
      tapAndroidBounds(suppliersToggle.bounds);
      await sleep(1200);
      debtModal = await poll(
        "android:director_finance_supplier_rows",
        async () => {
          const next = dumpAndroidScreen("android-director-finance-suppliers");
          const nodes = parseAndroidNodes(next.xml);
          if (findAndroidSupplierRowNode(nodes)) return next;
          if (findAndroidLabelNode(nodes, ANDROID_LABELS.emptyState)) return next;
          return null;
        },
        20_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-director-finance-suppliers-timeout"));
      const debtNodes = parseAndroidNodes(debtModal.xml);
      supplierRowsVisible = findAndroidSupplierRowNode(debtNodes) != null;
      supplierEmptyStateVisible = findAndroidLabelNode(debtNodes, ANDROID_LABELS.emptyState) != null;
    }

    const supplierRow = findAndroidSupplierRowNode(parseAndroidNodes(debtModal.xml));
    let supplierDetail = debtModal;
    let supplierDetailOpened = false;
    if (supplierRow) {
      tapAndroidBounds(supplierRow.bounds);
      await sleep(1200);
      supplierDetail = await poll(
        "android:director_finance_supplier_modal",
        async () => {
          const next = dumpAndroidScreen("android-director-finance-supplier-detail");
          return isAndroidSupplierModal(next.xml) ? next : null;
        },
        20_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-director-finance-supplier-detail-timeout"));
      supplierDetailOpened = isAndroidSupplierModal(supplierDetail.xml);
    }

    if (!supplierRowsVisible && !supplierEmptyStateVisible) {
      platformSpecificIssues.push("Supplier rows were not visible after opening debt supplier section");
    }
    if (!supplierDetailOpened && !supplierEmptyStateVisible) {
      platformSpecificIssues.push("Supplier detail modal did not open on Android finance screen");
    }

    const recovery = androidHarness.getRecoverySummary();
    return {
      status:
        isAndroidFinanceHome(workingScreen.xml) &&
        isAndroidDebtModal(debtModal.xml) &&
        (supplierDetailOpened || supplierEmptyStateVisible)
          ? "passed"
          : "failed",
      packageName,
      androidPreflight: preflight,
      ...recovery,
      financeTabOpened: financeTab.switched,
      financeHomeVisible: isAndroidFinanceHome(workingScreen.xml),
      debtModalOpened: isAndroidDebtModal(debtModal.xml),
      supplierRowsVisible,
      supplierEmptyStateVisible,
      supplierDetailOpened,
      currentXml: current.xmlPath,
      currentPng: current.pngPath,
      financeXml: workingScreen.xmlPath,
      financePng: workingScreen.pngPath,
      debtModalXml: debtModal.xmlPath,
      debtModalPng: debtModal.pngPath,
      supplierDetailXml: supplierDetail.xmlPath,
      supplierDetailPng: supplierDetail.pngPath,
      platformSpecificIssues,
    };
    } finally {
      devClient.cleanup();
    }
  } finally {
    await cleanupTempUser(user);
  }
}

function runIosRuntime(): Record<string, unknown> {
  if (!xcrunAvailable()) {
    return {
      status: "residual",
      iosResidual: "xcrun is unavailable on this host; iOS simulator cannot be started from Windows",
      platformSpecificIssues: ["xcrun is unavailable on this host; iOS simulator cannot be started from Windows"],
    };
  }
  return {
    status: "failed",
    platformSpecificIssues: ["xcrun is available but automated Director Finance iOS runtime is not implemented in this host flow"],
  };
}

async function main() {
  const web = androidOnlyRuntime
    ? {
        status: "residual",
        platformSpecificIssues: ["web runtime skipped: WAVE 3 requires Android proof; web auth harness is out of scope"],
      }
    : await runWebRuntime().catch((error) =>
        createFailurePlatformResult("web", error, {
          financeTabOpened: false,
          financeHomeCardsRendered: false,
          debtModalOpened: false,
          supplierRowVisible: false,
          supplierDetailOpened: false,
        }),
      );
  const android = await runAndroidRuntime().catch((error) => {
    const artifacts = androidHarness.captureFailureArtifacts("android-director-finance-failure");
    return createFailurePlatformResult("android", error, {
      financeHomeVisible: false,
      debtModalOpened: false,
      supplierDetailOpened: false,
      ...androidHarness.getRecoverySummary(),
      ...artifacts,
    });
  });
  const ios = runIosRuntime();
  const webRecord = web as Record<string, unknown>;
  const androidRecord = android as Record<string, unknown>;
  const summary = buildRuntimeSummary({
    web,
    android,
    ios,
    requiredPlatforms: {
      web: !androidOnlyRuntime,
      android: true,
      ios: false,
    },
    scenariosPassed: {
      web: {
        initialOpen: web.financeTabOpened === true,
        financeSurface: web.financeHomeCardsRendered === true,
        debtModal: web.debtModalOpened === true,
        supplierDetail: web.supplierDetailOpened === true || web.supplierEmptyStateVisible === true,
      },
      android: {
        initialOpen: android.financeHomeVisible === true,
        financeSurface: android.financeHomeVisible === true,
        debtModal: android.debtModalOpened === true,
        supplierDetail: android.supplierDetailOpened === true || android.supplierEmptyStateVisible === true,
      },
      ios: {
        initialOpen: ios.status === "passed",
        financeSurface: ios.status === "passed",
        debtModal: ios.status === "passed",
        supplierDetail: ios.status === "passed",
      },
    },
    artifacts: {
      web: typeof webRecord.screenshot === "string" ? webRecord.screenshot : `${webArtifactBase}.png`,
      android: {
        currentXml: typeof androidRecord.currentXml === "string" ? androidRecord.currentXml : null,
        currentPng: typeof androidRecord.currentPng === "string" ? androidRecord.currentPng : null,
        financeXml: typeof androidRecord.financeXml === "string" ? androidRecord.financeXml : null,
        financePng: typeof androidRecord.financePng === "string" ? androidRecord.financePng : null,
        debtModalXml: typeof androidRecord.debtModalXml === "string" ? androidRecord.debtModalXml : null,
        debtModalPng: typeof androidRecord.debtModalPng === "string" ? androidRecord.debtModalPng : null,
        supplierDetailXml: typeof androidRecord.supplierDetailXml === "string" ? androidRecord.supplierDetailXml : null,
        supplierDetailPng: typeof androidRecord.supplierDetailPng === "string" ? androidRecord.supplierDetailPng : null,
      },
    },
    extra: {
      gate: "director_finance_runtime_verify",
    },
  });

  writeJson(runtimeOutPath, { web, android, ios, summary });
  writeJson(runtimeSummaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
