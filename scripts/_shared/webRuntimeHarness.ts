import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

export const projectRoot = process.cwd();
export const baseUrl = "http://localhost:8081";
export const runtimeLoginLabelRe = /Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘|Login/i;

export type WebRuntimeCapture = {
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

export function writeJsonArtifact(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

export async function launchWebRuntime(): Promise<WebRuntimeCapture> {
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

export async function waitForBody(
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

export async function loginWithProtectedRoute(
  page: Page,
  route: string,
  user: { email: string; password: string },
  options?: {
    emailPlaceholder?: string;
    loginButtonPattern?: RegExp;
  },
) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  const emailInput = page.locator(`input[placeholder="${options?.emailPlaceholder ?? "Email"}"]`).first();
  if ((await emailInput.count()) === 0) return;

  await emailInput.fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);

  const loginButton = page.getByText(options?.loginButtonPattern ?? runtimeLoginLabelRe).first();
  if ((await loginButton.count()) > 0) {
    await loginButton.click();
  } else {
    await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
  }

  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
}

export async function captureWebFailureArtifact(page: Page | null, artifactPath: string) {
  if (!page) return null;
  await page.screenshot({ path: path.join(projectRoot, artifactPath), fullPage: true }).catch(() => null);
  return artifactPath;
}
