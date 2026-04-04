import * as fs from "node:fs";
import * as path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

export const baseUrl = String(process.env.RIK_WEB_BASE_URL ?? "http://localhost:8081").trim();
export const runtimeLoginLabelRe = /Р’РѕР№С‚Рё|Войти|Login/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

export async function waitForBody(
  page: Page,
  needles: string | RegExp | (string | RegExp)[],
  timeoutMs = 30_000,
) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.map((needle) => String(needle)).join("|")}`,
    async () => {
      const body = await bodyText(page);
      return list.some((needle) => (typeof needle === "string" ? body.includes(needle) : needle.test(body)))
        ? body
        : null;
    },
    timeoutMs,
    250,
  );
}

export async function launchWebRuntime(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
  runtime: {
    console: { type: string; text: string }[];
    pageErrors: string[];
    badResponses: { url: string; status: number; method: string }[];
  };
}> {
  const browserChannel = String(process.env.RIK_WEB_BROWSER_CHANNEL ?? "").trim().toLowerCase();
  const browser = await chromium.launch({
    channel: browserChannel === "msedge" ? "msedge" : undefined,
    headless: true,
  });
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

  return { browser, context, page, runtime };
}

export async function loginWithProtectedRoute(
  page: Page,
  route: string,
  user: { email: string; password: string },
  options: {
    readyNeedles?: (string | RegExp)[];
    unauthorizedNeedles?: (string | RegExp)[];
  } = {},
) {
  const readyNeedles = options.readyNeedles ?? [];
  const unauthorizedNeedles = options.unauthorizedNeedles ?? [/Email/i, /password/i, runtimeLoginLabelRe];

  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForBody(page, unauthorizedNeedles, 45_000).catch(() => undefined);

  const body = await bodyText(page);
  const needsLogin = unauthorizedNeedles.some((needle) =>
    typeof needle === "string" ? body.includes(needle) : needle.test(body),
  );

  if (needsLogin) {
    const emailInput = page.locator('input[placeholder="Email"]').first();
    if ((await emailInput.count()) > 0) {
      await emailInput.fill(user.email);
      await page.locator('input[type="password"]').first().fill(user.password);

      const loginButton = page.getByText(runtimeLoginLabelRe).first();
      if ((await loginButton.count()) > 0) {
        await loginButton.click();
      } else {
        await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
      }

      await poll(
        `login:${route}`,
        async () => {
          if (!page.url().includes("/auth/login")) return true;
          const nextBody = await bodyText(page);
          const stillUnauthorized = unauthorizedNeedles.some((needle) =>
            typeof needle === "string" ? nextBody.includes(needle) : needle.test(nextBody),
          );
          return stillUnauthorized ? null : true;
        },
        45_000,
        500,
      ).catch(() => undefined);

      if (!page.url().includes(route)) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      }
    }
  }

  if (readyNeedles.length > 0) {
    await waitForBody(page, readyNeedles, 45_000);
  }
}

export async function captureWebFailureArtifact(page: Page, artifactBase: string) {
  const screenshotPath = `${artifactBase}.png`;
  const htmlPath = `${artifactBase}.html`;
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const html = await page.content().catch(() => "");
  fs.writeFileSync(htmlPath, html);
  return {
    screenshot: screenshotPath.replace(/\\/g, "/"),
    html: htmlPath.replace(/\\/g, "/"),
  };
}

export function writeJsonArtifact(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}
