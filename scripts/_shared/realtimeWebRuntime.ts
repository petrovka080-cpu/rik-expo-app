import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

export const projectRoot = process.cwd();
export const baseUrl = "http://localhost:8081";
export const password = "Pass1234";

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "realtime-web-runtime" } },
});

export type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

export type PlatformObservabilityEvent = {
  screen?: string;
  surface?: string;
  category?: string;
  event?: string;
  result?: string;
  trigger?: string;
  sourceKind?: string | null;
  extra?: Record<string, unknown> | null;
};

export type BrowserRuntimeCapture = {
  browser: Browser;
  page: Page;
  runtime: {
    console: { type: string; text: string }[];
    pageErrors: string[];
    badResponses: { url: string; status: number; method: string }[];
  };
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function poll<T>(
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

export const writeArtifact = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

export async function createTempUser(role: string, fullName: string): Promise<TempUser> {
  const email = `${role}.rt.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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

export async function cleanupTempUser(user: TempUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {
    // no-op
  }
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {
    // no-op
  }
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    // no-op
  }
}

export async function launchRolePage(): Promise<BrowserRuntimeCapture> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
    badResponses: [] as { url: string; status: number; method: string }[],
  };

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

  return { browser, page, runtime };
}

export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

export async function waitForBodyContains(
  page: Page,
  needles: string | RegExp | Array<string | RegExp>,
  timeoutMs = 30_000,
) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.map((needle) => String(needle)).join("|")}`,
    async () => {
      const text = await bodyText(page);
      return list.some((needle) => (typeof needle === "string" ? text.includes(needle) : needle.test(text)))
        ? text
        : null;
    },
    timeoutMs,
    250,
  );
}

export async function loginWithTempUser(page: Page, route: string, user: TempUser) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
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

export async function maybeConfirmFio(page: Page, fullName: string): Promise<boolean> {
  const fioInput = page.locator('input[placeholder="Фамилия Имя Отчество"]').first();
  if ((await fioInput.count()) === 0) return false;
  await fioInput.fill(fullName);
  const confirm = page.getByText(/Сохранить|Подтвердить/i).first();
  if ((await confirm.count()) > 0) {
    await confirm.click();
  } else {
    await page.locator('button,[role="button"],div[tabindex="0"]').last().click();
  }
  await poll(
    "fio_modal_closed",
    async () => ((await fioInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
}

export async function maybeConfirmWarehouseRecipient(page: Page, recipient: string): Promise<boolean> {
  const recipientInput = page.locator('input[placeholder*="ФИО"]').first();
  if ((await recipientInput.count()) === 0) return false;
  const placeholder = await recipientInput.getAttribute("placeholder");
  if (!placeholder || !/Поиск|ФИО/i.test(placeholder)) return false;
  await recipientInput.fill(recipient);
  const confirm = page.getByText(/Подтвердить/i).first();
  if ((await confirm.count()) > 0) {
    await confirm.click();
    await poll(
      "recipient_modal_closed",
      async () => ((await recipientInput.count()) === 0 ? true : null),
      15_000,
      250,
    );
    return true;
  }
  return false;
}

export async function getObservabilityEvents(page: Page): Promise<PlatformObservabilityEvent[]> {
  return page.evaluate(() => {
    const root = globalThis as typeof globalThis & {
      __RIK_PLATFORM_OBSERVABILITY__?: { events?: unknown[] };
    };
    const events = root.__RIK_PLATFORM_OBSERVABILITY__?.events;
    return Array.isArray(events) ? events : [];
  });
}

export async function resetObservabilityEvents(page: Page) {
  await page.evaluate(() => {
    const root = globalThis as typeof globalThis & {
      __RIK_PLATFORM_OBSERVABILITY__?: { seq?: number; events?: unknown[] };
    };
    if (!root.__RIK_PLATFORM_OBSERVABILITY__) {
      root.__RIK_PLATFORM_OBSERVABILITY__ = { seq: 0, events: [] };
      return;
    }
    root.__RIK_PLATFORM_OBSERVABILITY__.seq = 0;
    root.__RIK_PLATFORM_OBSERVABILITY__.events = [];
  });
}

export async function waitForObservability(
  page: Page,
  label: string,
  predicate: (event: PlatformObservabilityEvent) => boolean,
  timeoutMs = 30_000,
) {
  return poll(
    label,
    async () => {
      const events = await getObservabilityEvents(page);
      return events.some(predicate) ? events : null;
    },
    timeoutMs,
    250,
  );
}

export const findEvent = (
  events: PlatformObservabilityEvent[],
  predicate: (event: PlatformObservabilityEvent) => boolean,
) => events.find(predicate) ?? null;

export const countEvents = (
  events: PlatformObservabilityEvent[],
  predicate: (event: PlatformObservabilityEvent) => boolean,
) => events.filter(predicate).length;

export const hasBlockingConsoleErrors = (entries: { type: string; text: string }[]) =>
  entries.some(
    (entry) =>
      entry.type === "error" &&
      !/Accessing element\.ref was removed in React 19/i.test(entry.text),
  );
