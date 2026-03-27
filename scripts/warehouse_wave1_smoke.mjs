import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs/promises";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:8081";
const PASSWORD = "P@ssw0rd123!";
const ARTIFACT_BASE = "artifacts/warehouse-wave1-smoke";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env in .env.local");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const LABELS = {
  tabs: ["К приходу", "Склад факт", "Расход", "Отчёты"],
  fioPlaceholder: "Фамилия Имя Отчество",
  recipientPlaceholder: "Поиск или новый ФИО...",
  recipientConfirm: "Подтвердить ввод",
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

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText || "");
}

async function waitForBody(page, needles, timeoutMs = 30_000) {
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

async function createTempUser(role, fullName) {
  const email = `${role}.warehouse.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
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
  if ((await page.locator('input[placeholder="Email"]').count()) > 0) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
}

async function maybeConfirmFio(page) {
  const fioInput = page.locator(`input[placeholder="${LABELS.fioPlaceholder}"]`).first();
  if ((await fioInput.count()) === 0) return false;
  await fioInput.fill("Smoke Warehouseman");

  const confirm = page.getByText(/Сохранить|Подтвердить/).first();
  if ((await confirm.count()) > 0) {
    await confirm.click();
  } else {
    await page.locator('button,[role="button"],div[tabindex="0"]').last().click();
  }

  await poll(
    "warehouse:fio_modal_closed",
    async () => ((await fioInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
}

async function confirmRecipientModal(page) {
  const recipientInput = page.locator(`input[placeholder="${LABELS.recipientPlaceholder}"]`).first();
  await poll(
    "warehouse:recipient_modal_open",
    async () => ((await recipientInput.count()) > 0 ? true : null),
    15_000,
    250,
  );
  await recipientInput.fill("Smoke Recipient");
  const confirm = page.getByText(LABELS.recipientConfirm).first();
  await confirm.click();
  await poll(
    "warehouse:recipient_modal_closed",
    async () => ((await recipientInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
}

async function clickTab(page, label) {
  await page.getByText(label, { exact: false }).first().click();
  await waitForBody(page, label, 15_000);
}

async function main() {
  let user = null;
  let browser = null;
  const result = {
    status: "failed",
    route_start: `${BASE_URL}/warehouse`,
    fio_confirmed: false,
    recipient_modal_confirmed: false,
    tabs_opened: [],
    console_errors_empty: true,
    page_errors_empty: true,
    screenshot: `${ARTIFACT_BASE}.png`,
    runtime_json: `${ARTIFACT_BASE}.json`,
  };

  const runtime = {
    console: [],
    pageErrors: [],
    responses: [],
  };

  try {
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Smoke Warehouse");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

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

    await loginRole(page, "/warehouse", user);
    await waitForBody(page, [...LABELS.tabs, "Пожалуйста", "Представьтесь"], 30_000);

    result.fio_confirmed = await maybeConfirmFio(page);
    await waitForBody(page, LABELS.tabs, 30_000);

    await clickTab(page, "Склад факт");
    result.tabs_opened.push("Склад факт");
    await confirmRecipientModal(page);
    result.recipient_modal_confirmed = true;

    await clickTab(page, "Расход");
    result.tabs_opened.push("Расход");

    await clickTab(page, "Отчёты");
    result.tabs_opened.push("Отчёты");

    await page.screenshot({ path: result.screenshot, fullPage: true });

    result.console_errors_empty = runtime.console.every((entry) => entry.type !== "error");
    result.page_errors_empty = runtime.pageErrors.length === 0;
    result.status =
      result.fio_confirmed &&
      result.recipient_modal_confirmed &&
      result.tabs_opened.length === 3 &&
      result.console_errors_empty &&
      result.page_errors_empty
        ? "passed"
        : "failed";

    await fs.writeFile(result.runtime_json, JSON.stringify(runtime, null, 2));
    await fs.writeFile(`${ARTIFACT_BASE}.summary.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

void main();
