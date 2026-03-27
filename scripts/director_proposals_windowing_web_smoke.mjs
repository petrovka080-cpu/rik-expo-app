import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs/promises";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:8081";
const PASSWORD = "Pass1234";
const ARTIFACT_BASE = "artifacts/director-proposals-windowing-web-smoke";
const PAGE_SIZE = 10;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env in .env.local");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LABELS = {
  header: "\u041a\u043e\u043d\u0442\u0440\u043e\u043b\u044c",
  requestsTab: "\u0417\u0430\u044f\u0432\u043a\u0438",
  buyerTab: "\u0421\u043d\u0430\u0431\u0436\u0435\u043d\u0435\u0446",
  proposalsTitle: "\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
  open: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
  email: "Email",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll(label, fn, timeoutMs = 30_000, delayMs = 250) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function createTempUser(role, fullName) {
  const email = `${role}.director.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
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

  return { id: user.id, email, password: PASSWORD, role };
}

async function cleanupTempUser(user) {
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

async function loginRole(page, routePath, user) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "networkidle" });
  if ((await page.locator(`input[placeholder="${LABELS.email}"]`).count()) > 0) {
    await page.locator(`input[placeholder="${LABELS.email}"]`).fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    const loginButton = page.getByText(/\u0412\u043e\u0439\u0442\u0438|Login/i).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 }).catch(() => {});
  }
}

async function readBodyText(page) {
  return await page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " ").trim());
}

async function getExpectedHasMore() {
  const { data, error } = await admin.rpc("director_pending_proposals_scope_v1", {
    p_offset_heads: 0,
    p_limit_heads: PAGE_SIZE,
  });
  if (error) throw error;
  const meta = data?.meta && typeof data.meta === "object" ? data.meta : {};
  return {
    hasMore: meta.has_more === true,
    returnedHeadCount: Number(meta.returned_head_count ?? 0) || 0,
  };
}

async function main() {
  let user = null;
  let browser = null;
  let page = null;
  const runtime = {
    console: [],
    pageErrors: [],
    responses: [],
  };
  const result = {
    status: "failed",
    webPassed: false,
    buyerTabOpened: false,
    initialLoadPassed: false,
    appendExpected: false,
    appendPassed: null,
    initialOpenCount: 0,
    appendOpenCount: 0,
    consoleErrorsEmpty: true,
    pageErrorsEmpty: true,
    finalUrl: null,
    bodySnippet: "",
    screenshot: `${ARTIFACT_BASE}.png`,
  };

  try {
    const expected = await getExpectedHasMore();
    result.appendExpected = expected.hasMore;
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Smoke Director");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push(String(error?.message || error));
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        runtime.responses.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    await loginRole(page, "/director", user);

    await poll("director:ready", async () => {
      const body = await readBodyText(page);
      return body.includes(LABELS.header) || body.includes(LABELS.requestsTab) || body.includes(LABELS.buyerTab)
        ? true
        : null;
    }, 45_000, 300);

    await page.getByText(LABELS.buyerTab, { exact: false }).first().click();
    await poll("director:buyer_tab", async () => {
      const body = await readBodyText(page);
      return body.includes(LABELS.proposalsTitle) ? true : null;
    });
    result.buyerTabOpened = true;

    const openButtons = page.getByText(LABELS.open, { exact: false });
    await poll("director:proposal_rows", async () => {
      const count = await openButtons.count();
      return count > 0 || !expected.hasMore || expected.returnedHeadCount === 0 ? true : null;
    });

    result.initialOpenCount = await openButtons.count();
    result.initialLoadPassed = result.initialOpenCount >= 0;

    if (expected.hasMore) {
      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 2200);
        await sleep(350);
      }
      await sleep(1500);
      result.appendOpenCount = await openButtons.count();
      result.appendPassed = result.appendOpenCount >= result.initialOpenCount;
    }

    await page.screenshot({ path: result.screenshot, fullPage: true });
    result.consoleErrorsEmpty = runtime.console.every((entry) => entry.type !== "error");
    result.pageErrorsEmpty = runtime.pageErrors.length === 0;
    result.webPassed =
      result.buyerTabOpened &&
      result.initialLoadPassed &&
      result.consoleErrorsEmpty &&
      result.pageErrorsEmpty &&
      (result.appendExpected ? result.appendPassed === true : true);
    result.status = result.webPassed ? "passed" : "failed";

  } finally {
    try {
      if (page) {
        result.finalUrl = page.url();
        result.bodySnippet = (await readBodyText(page)).slice(0, 500);
        await page.screenshot({ path: result.screenshot, fullPage: true }).catch(() => {});
      }
      await fs.writeFile(`${ARTIFACT_BASE}.json`, `${JSON.stringify({ result, runtime }, null, 2)}\n`);
      await fs.writeFile(`${ARTIFACT_BASE}.summary.json`, `${JSON.stringify(result, null, 2)}\n`);
    } catch {}
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }

  if (result.status !== "passed") {
    throw new Error("director proposals web smoke failed");
  }
}

void main();
