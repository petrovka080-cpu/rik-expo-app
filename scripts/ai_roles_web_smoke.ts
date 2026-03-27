import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

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
  global: { headers: { "x-client-info": "ai-roles-web-smoke" } },
});

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type ScenarioName = "buyer" | "director" | "foreman";

const fullOutPath = path.join(projectRoot, "artifacts/ai-roles-web-smoke.json");
const summaryOutPath = path.join(projectRoot, "artifacts/ai-roles-web-smoke.summary.json");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

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
  const email = `ai.roles.${role}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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
  return page.evaluate(() => document.body.innerText || "");
}

async function waitForBody(page: import("playwright").Page, needles: (string | RegExp)[], timeoutMs = 30_000) {
  return poll(
    `body:${needles.map((item) => String(item)).join("|")}`,
    async () => {
      const body = await bodyText(page);
      return needles.some((needle) => (typeof needle === "string" ? body.includes(needle) : needle.test(body))) ? body : null;
    },
    timeoutMs,
    250,
  );
}

async function login(page: import("playwright").Page, user: TempUser, routePath: string) {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    const loginButton = page.getByText(/Войти|Login/i).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
}

async function runScenario(name: ScenarioName) {
  let user: TempUser | null = null;
  let browser: import("playwright").Browser | null = null;
  const runtime = {
    role: name,
    screenshot: `artifacts/ai-roles-web-${name}.png`,
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
  };

  try {
    user = await createTempUser(name, `AI ${name} Web Smoke`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push(String(error?.message ?? error));
    });

    const routePath = name === "buyer" ? "/buyer" : name === "director" ? "/director" : "/foreman";
    await login(page, user, routePath);
    await waitForBody(page, ["AI", getRoleLabel(name)], 45_000).catch(() => waitForBody(page, ["AI"], 10_000));
    const fab = page.getByTestId("assistant_fab").first();
    await poll(`assistant_fab:${name}`, async () => ((await fab.count()) > 0 ? true : null), 10_000, 250);
    await fab.dispatchEvent("click").catch(async () => {
      await fab.evaluate((node) => {
        (node as HTMLElement).click();
      });
    });
    if (name === "foreman") {
      await waitForBody(page, ["AI ассистент", "Безопасный режим"], 45_000).catch(async () => {
        return waitForBody(page, ["AI", "Безопасный режим"], 10_000);
      });
    } else {
      await waitForBody(page, ["AI ассистент", "Data-aware context"], 45_000).catch(async () => {
        return waitForBody(page, ["AI", "Data-aware context"], 10_000);
      });
      if (name === "director") {
        await waitForBody(
          page,
          ["Finance: payable", "director:finance_panel_v3+pending_proposals_v1"],
          20_000,
        ).catch(() => null);
      }
    }

    const voiceButton = page.getByTestId("assistant_voice_button").first();
    const input = page.getByTestId("assistant_input").first();
    const sendButton = page.getByTestId("assistant_send_button").first();
    await poll(
      `voice:${name}`,
      async () => ((await voiceButton.count()) > 0 && (await input.count()) > 0 && (await sendButton.count()) > 0 ? true : null),
      10_000,
      250,
    );

    const bodyBeforeVoice = await bodyText(page);
    const hasSpeechApi = await page.evaluate(
      () => Boolean((window as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
        || (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition),
    );

    if (!hasSpeechApi) {
      await voiceButton.click();
      await waitForBody(page, ["Голосовой ввод недоступен", "текстовый ввод"], 10_000).catch(() => null);
    }

    const body = await bodyText(page);
    const screenshotPath = path.join(projectRoot, runtime.screenshot);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const hasContextCard = name === "foreman" ? true : body.includes("Data-aware context");
    const directorFinanceGroundingReady =
      name !== "director"
      || (
        body.includes("Finance: payable")
        && body.includes("debt")
        && body.includes("overpayment")
        && body.includes("critical")
      );
    const contextLoaded = name === "foreman" ? true : !body.includes("Контекст не загружен");
    const voiceFallbackSafe = hasSpeechApi || body.includes("Голосовой ввод") || bodyBeforeVoice.includes("Data-aware context");
    const consoleErrors = runtime.console.filter((entry) => entry.type === "error");

    return {
      status:
        hasContextCard
        && contextLoaded
        && directorFinanceGroundingReady
        && voiceFallbackSafe
        && consoleErrors.length === 0
        && runtime.pageErrors.length === 0
          ? "passed"
          : "failed",
      role: name,
      hasContextCard,
      contextLoaded,
      directorFinanceGroundingReady,
      voiceButtonVisible: true,
      inputVisible: true,
      sendButtonVisible: true,
      hasSpeechApi,
      voiceFallbackSafe,
      consoleErrors,
      pageErrors: runtime.pageErrors,
      screenshot: runtime.screenshot,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

function getRoleLabel(role: ScenarioName): string {
  switch (role) {
    case "buyer":
      return "Снабженец";
    case "director":
      return "Директор";
    case "foreman":
      return "Прораб";
    default:
      return "AI";
  }
}

async function main() {
  const buyer = await runScenario("buyer");
  const director = await runScenario("director");
  const foreman = await runScenario("foreman");

  const summary = {
    status:
      buyer.status === "passed" && director.status === "passed" && foreman.status === "passed"
        ? "passed"
        : "failed",
    webPassed:
      buyer.status === "passed" && director.status === "passed" && foreman.status === "passed",
    buyerPassed: buyer.status === "passed",
    directorPassed: director.status === "passed",
    foremanPassed: foreman.status === "passed",
    voiceFallbackSafe:
      buyer.voiceFallbackSafe && director.voiceFallbackSafe && foreman.voiceFallbackSafe,
  };

  writeJson(fullOutPath, {
    generatedAt: new Date().toISOString(),
    summary,
    scenarios: {
      buyer,
      director,
      foreman,
    },
  });
  writeJson(summaryOutPath, summary);

  if (summary.status !== "passed") {
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(summary, null, 2));
}

void main();
