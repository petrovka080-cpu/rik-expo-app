import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

export const projectRoot = process.cwd();
export const baseUrl = "http://localhost:8081";
export const password = "pass1234";

const LOGIN_BUTTON_RE = /\u0412\u043e\u0439\u0442\u0438|Login/i;
const FIO_PLACEHOLDER = "\u0424\u0430\u043c\u0438\u043b\u0438\u044f \u0418\u043c\u044f \u041e\u0442\u0447\u0435\u0441\u0442\u0432\u043e";
const FIO_CONFIRM_RE = /\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c|\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c/i;
const WAREHOUSE_RECIPIENT_PLACEHOLDER = "\u041f\u043e\u0438\u0441\u043a \u0438\u043b\u0438 \u043d\u043e\u0432\u044b\u0439 \u0424\u0418\u041e...";
const WAREHOUSE_RECIPIENT_CONFIRM_RE =
  /\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0432\u0432\u043e\u0434|\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c/i;

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "realtime-web-runtime" } },
});

async function waitForTempUserLoginReady(email: string, passwordValue: string) {
  await poll(
    `temp-user-login-ready:${email}`,
    async () => {
      const probe = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { "x-client-info": "realtime-web-runtime-auth-probe" } },
      });
      const result = await probe.auth.signInWithPassword({
        email,
        password: passwordValue,
      });
      if (result.error || !result.data.session) {
        return null;
      }
      await probe.auth.signOut().catch(() => {});
      return true;
    },
    30_000,
    750,
  );
}

export type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

function buildRealtimeRoleSeed(role: string) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "buyer") {
    return {
      profile: { role: "buyer" },
      userProfile: {
        usage_market: true,
        usage_build: false,
        is_contractor: false,
      },
      appMetadata: { role: "buyer" },
    };
  }
  if (normalizedRole === "warehouse") {
    return {
      profile: { role: "warehouse" },
      userProfile: {
        usage_market: false,
        usage_build: true,
        is_contractor: false,
      },
      appMetadata: { role: "warehouse" },
    };
  }
  if (normalizedRole === "accountant") {
    return {
      profile: { role: "accountant" },
      userProfile: {
        usage_market: false,
        usage_build: true,
        is_contractor: false,
      },
      appMetadata: { role: "accountant" },
    };
  }
  return {
    profile: { role },
    userProfile: {},
    appMetadata: role ? { role } : {},
  };
}

export type PlatformObservabilityEvent = {
  screen?: string | null;
  surface?: string | null;
  category?: string | null;
  event?: string | null;
  result?: string | null;
  trigger?: string;
  sourceKind?: string | null;
  extra?: Record<string, unknown> | null;
} & Record<string, unknown>;

const isPlatformObservabilityEvent = (value: unknown): value is PlatformObservabilityEvent =>
  value != null && typeof value === "object" && !Array.isArray(value);

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
  const seed = buildRealtimeRoleSeed(role);
  const userResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: seed.appMetadata,
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert({ user_id: user.id, full_name: fullName, ...seed.profile }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName, ...seed.userProfile }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  await waitForTempUserLoginReady(email, password);

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
    const loginButton = page.getByText(LOGIN_BUTTON_RE).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('input[type="password"]').first().press("Enter").catch(() => {});
    }
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
    await poll(
      `auth_settled:${route}`,
      async () => {
        const pathname = new URL(page.url()).pathname;
        const authVisible = (await page.locator('input[placeholder="Email"]').count()) > 0;
        return !pathname.startsWith("/auth/") && !authVisible ? true : null;
      },
      30_000,
      250,
    );
  }
}

export async function maybeConfirmFio(page: Page, fullName: string): Promise<boolean> {
  const fioAppeared = await poll(
    "fio_modal_present",
    async () => {
      const count = await page.getByPlaceholder(FIO_PLACEHOLDER).first().count();
      return count > 0 ? true : null;
    },
    3_000,
    150,
  ).catch(() => false);
  if (!fioAppeared) return false;
  const fioInput = page.getByPlaceholder(FIO_PLACEHOLDER).first();
  await poll(
    "fio_modal_confirmed",
    async () => {
      const input = page.getByPlaceholder(FIO_PLACEHOLDER).first();
      if ((await input.count()) === 0) return true;
      try {
        await input.fill(fullName, { timeout: 1500 });
      } catch {
        return null;
      }
      const confirm = page.getByText(FIO_CONFIRM_RE).first();
      if ((await confirm.count()) > 0) {
        await confirm.click().catch(() => {});
      } else {
        await input.press("Enter").catch(() => {});
      }
      return (await input.count()) === 0 ? true : null;
    },
    15_000,
    250,
  );
  await poll(
    "fio_modal_closed",
    async () => ((await fioInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
}

export async function maybeConfirmWarehouseRecipient(page: Page, recipient: string): Promise<boolean> {
  const recipientAppeared = await poll(
    "warehouse_recipient_present",
    async () => {
      const count = await page.getByPlaceholder(WAREHOUSE_RECIPIENT_PLACEHOLDER).first().count();
      return count > 0 ? true : null;
    },
    3_000,
    150,
  ).catch(() => false);
  if (!recipientAppeared) return false;
  const recipientInput = page.getByPlaceholder(WAREHOUSE_RECIPIENT_PLACEHOLDER).first();
  await poll(
    "warehouse_recipient_filled",
    async () => {
      const input = page.getByPlaceholder(WAREHOUSE_RECIPIENT_PLACEHOLDER).first();
      if ((await input.count()) === 0) return true;
      try {
        await input.fill(recipient, { timeout: 1500 });
        return true;
      } catch {
        return null;
      }
    },
    10_000,
    250,
  );
  const confirm = page.getByText(WAREHOUSE_RECIPIENT_CONFIRM_RE).first();
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
  const events = await page.evaluate(() => {
    const root = globalThis as typeof globalThis & {
      __RIK_PLATFORM_OBSERVABILITY__?: { events?: unknown[] };
    };
    const events = root.__RIK_PLATFORM_OBSERVABILITY__?.events;
    return Array.isArray(events) ? events : [];
  });
  return events.filter(isPlatformObservabilityEvent);
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
