import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:8081";
const PASSWORD = "P@ssw0rd123!";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env in .env.local");
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForBody(page, needle, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const body = await page.evaluate(() => document.body.innerText || "");
    if (body.includes(needle)) return body;
    await sleep(400);
  }
  throw new Error(`waitForBody timeout: ${needle}`);
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText || "");
}

async function clickText(page, needle, opts = {}) {
  const last = Boolean(opts.last);
  const ok = await page.evaluate(
    ({ needle, last }) => {
      const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const els = Array.from(
        document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"],input[type="button"],input[type="submit"]'),
      ).filter((el) => norm(el.textContent).includes(needle));
      const hit = last ? els[els.length - 1] : els[0];
      if (!hit) return false;
      hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    },
    { needle, last },
  );
  if (!ok) throw new Error(`clickText not found: ${needle}`);
}

async function clickByAria(page, aria, opts = {}) {
  const nth = opts.nth ?? 0;
  const ok = await page.evaluate(
    ({ aria, nth }) => {
      const els = Array.from(document.querySelectorAll('button,[role="button"],div[tabindex]')).filter(
        (el) => {
          if ((el.getAttribute("aria-label") || "") !== aria) return false;
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          );
        },
      );
      const hit = els[nth];
      if (!hit) return false;
      hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    },
    { aria, nth },
  );
  if (!ok) throw new Error(`clickByAria not found: ${aria}`);
}

async function setInputByPlaceholder(page, placeholderNeedle, value) {
  const ok = await page.evaluate(
    ({ placeholderNeedle, value }) => {
      const norm = (input) => String(input || "").replace(/\s+/g, " ").trim();
      const el = Array.from(document.querySelectorAll("input,textarea")).find((node) =>
        norm(node.getAttribute("placeholder")).includes(placeholderNeedle),
      );
      if (!el) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      if (descriptor?.set) descriptor.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { placeholderNeedle, value },
  );
  if (!ok) throw new Error(`setInputByPlaceholder not found: ${placeholderNeedle}`);
}

async function getVisibleInputs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("input,textarea"))
      .filter((el) => {
        const styles = getComputedStyle(el);
        return styles.display !== "none" && styles.visibility !== "hidden";
      })
      .map((el, index) => ({
        index,
        placeholder: el.getAttribute("placeholder") || "",
        value: el.value || "",
        type: el.getAttribute("type") || el.tagName.toLowerCase(),
      })),
  );
}

async function setVisibleInputByIndex(page, visibleIndex, value) {
  const ok = await page.evaluate(
    ({ visibleIndex, value }) => {
      const inputs = Array.from(document.querySelectorAll("input,textarea")).filter((el) => {
        const styles = getComputedStyle(el);
        return styles.display !== "none" && styles.visibility !== "hidden";
      });
      const el = inputs[visibleIndex];
      if (!el) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      if (descriptor?.set) descriptor.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { visibleIndex, value },
  );
  if (!ok) throw new Error(`setVisibleInputByIndex not found: ${visibleIndex}`);
}

async function createTempUser(role, fullName) {
  const email = `${role}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
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
    await admin.from("request_items").delete().eq("created_by", user.id);
  } catch {}
  try {
    await admin.from("requests").delete().eq("created_by", user.id);
  } catch {}
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

async function latestRequestsByUser(userId) {
  const result = await admin
    .from("requests")
    .select("id, display_no, status, submitted_at, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (result.error) throw result.error;
  return result.data || [];
}

async function requestItemsCount(requestId) {
  const result = await admin
    .from("request_items")
    .select("*", { count: "exact", head: true })
    .eq("request_id", requestId);
  if (result.error) throw result.error;
  return result.count || 0;
}

async function activeRequestItemsCount(requestId) {
  const result = await admin
    .from("request_items")
    .select("*", { count: "exact", head: true })
    .eq("request_id", requestId)
    .neq("status", "cancelled");
  if (result.error) throw result.error;
  return result.count || 0;
}

async function requestItemsDebug(requestId) {
  const result = await admin
    .from("request_items")
    .select("id, rik_code, qty, status")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (result.error) throw result.error;
  return result.data || [];
}

async function readForemanLocalDraftStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("foreman_materials_local_draft_v1");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  });
}

async function loginDirector(page, user) {
  await page.goto(`${BASE_URL}/director`, { waitUntil: "networkidle" });
  const body = await bodyText(page);
  if (body.includes("Вход")) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[tabindex="0"],button,[role="button"]'))[0];
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
  }
  await waitForBody(page, "Контроль");
}

async function loginForeman(page, user) {
  await page.goto(`${BASE_URL}/foreman`, { waitUntil: "networkidle" });
  const body = await bodyText(page);
  if (body.includes("Вход")) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[tabindex="0"],button,[role="button"]'))[0];
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    });
  }
  await waitForBody(page, "Заявка");
  await sleep(1_000);
  const afterLoginBody = await bodyText(page);
  if (!afterLoginBody.includes("Каталог")) {
    try {
      await clickText(page, "Материалы");
    } catch {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('div[tabindex="0"],button,[role="button"]'))[0];
        btn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      });
    }
    await waitForBody(page, "Каталог");
  }
}

async function ensureForemanContext(page) {
  const visibleInputs = await getVisibleInputs(page);
  if (visibleInputs.length) {
    await page.locator("input").last().fill("Smoke Foreman");
    await clickText(page, "Сохранить");
    await sleep(800);
  }

  const body = await bodyText(page);
  if (!body.includes("Ангар")) {
    await clickText(page, "Выбрать объект...");
    await sleep(500);
    await clickText(page, "Ангар");
    await sleep(700);
  }

  const bodyAfterObject = await bodyText(page);
  if (!bodyAfterObject.includes("Мезонин")) {
    await clickText(page, "Весь корпус", { last: true }).catch(async () => clickText(page, "Весь корпус"));
    await sleep(500);
    await clickText(page, "Мезонин");
    await sleep(700);
  }
}

async function openDraftModal(page) {
  await clickText(page, "Открыть позиции и действия", { last: true }).catch(async () => clickText(page, "Позиции"));
  await sleep(800);
}

async function runCatalogAdd(page) {
  await clickText(page, "Каталог");
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    try {
      await setInputByPlaceholder(page, "Что ищем?", "BOLT");
      break;
    } catch {
      await sleep(300);
    }
  }
  await sleep(1_500);
  let qtyInputIndex = -1;
  const qtyStartedAt = Date.now();
  while (Date.now() - qtyStartedAt < 15_000) {
    const inputs = await getVisibleInputs(page);
    qtyInputIndex = inputs.findIndex((input) => input.placeholder === "0");
    if (qtyInputIndex >= 0) break;
    await sleep(300);
  }
  if (qtyInputIndex < 0) throw new Error("Catalog qty input not found");
  await setVisibleInputByIndex(page, qtyInputIndex, "2");
  await sleep(250);
  await page.evaluate(() => {
    const addButton = Array.from(document.querySelectorAll("button")).find(
      (el) => !(el.getAttribute("aria-label") || "") && !(el.textContent || "").trim(),
    );
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await waitForBody(page, "REQ-", 20_000).catch(async () => waitForBody(page, "Позиции", 20_000));
  await clickText(page, "Закрыть", { last: true }).catch(() => {});
  await sleep(600);
}

async function runCalcAdd(page) {
  await clickText(page, "Смета");
  await waitForBody(page, "Вид работ");
  await waitForBody(page, "Бетон", 25_000);
  await clickText(page, "Бетон");
  await sleep(400);
  await clickText(page, "Бетонирование");
  await waitForBody(page, "Рассчитать");
  let inputs = [];
  const inputsStartedAt = Date.now();
  while (Date.now() - inputsStartedAt < 10_000) {
    inputs = await getVisibleInputs(page);
    if (inputs.length >= 2) break;
    await sleep(300);
  }
  if (inputs.length < 2) throw new Error("Calc inputs not found");
  await setVisibleInputByIndex(page, 0, "10");
  await setVisibleInputByIndex(page, inputs.length - 1, "5");
  await sleep(300);
  await clickText(page, "Рассчитать");
  await waitForBody(page, "Результат", 20_000);
  await clickByAria(page, "Отправить");
  await waitForBody(page, "Позиции 4", 20_000);
}

async function runAiAdd(page, prompt) {
  await clickText(page, "AI заявка");
  await waitForBody(page, "Сформировать черновик");
  await page.evaluate((value) => {
    const input = Array.from(document.querySelectorAll("textarea,input")).find((node) =>
      String(node.getAttribute("placeholder") || "").includes("Что нужно"),
    );
    if (!input) throw new Error("AI input not found");
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
    if (descriptor?.set) descriptor.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, prompt);
  await sleep(300);
  await clickText(page, "Сформировать черновик");
}

async function main() {
  let browser = null;
  let foremanUser = null;
  let directorUser = null;

  const output = {
    materials: {},
    director: {},
    ai: {},
  };

  try {
    foremanUser = await createTempUser("foreman", "Smoke Foreman");
    directorUser = await createTempUser("director", "Smoke Director");

    browser = await chromium.launch({ headless: true });
    const foremanContext = await browser.newContext();
    const directorContext = await browser.newContext();
    const foremanPage = await foremanContext.newPage();
    const directorPage = await directorContext.newPage();

    const foremanLogs = [];
    const directorLogs = [];

    foremanPage.on("console", (message) => foremanLogs.push(message.text()));
    directorPage.on("console", (message) => directorLogs.push(message.text()));
    foremanPage.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await loginDirector(directorPage, directorUser);
    await loginForeman(foremanPage, foremanUser);
    await ensureForemanContext(foremanPage);

    const withFailureBody = async (fn, target) => {
      try {
        await fn();
      } catch (error) {
        target.passed = false;
        target.error = String(error?.message || error);
        target.body = (await bodyText(foremanPage)).slice(0, 2_000);
      }
    };

    await withFailureBody(async () => {
      await runCatalogAdd(foremanPage);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      output.materials.catalog_add = {
        passed: true,
        displayNo: latest?.display_no || null,
        itemCount: latest ? await requestItemsCount(latest.id) : null,
      };
    }, (output.materials.catalog_add = {}));

    await withFailureBody(async () => {
      await waitForBody(foremanPage, "Черновик", 10_000).catch(() => undefined);
      const latestBeforeDelete = (await latestRequestsByUser(foremanUser.id))[0];
      const storageBeforeDelete = await readForemanLocalDraftStorage(foremanPage);
      const serverRowsBeforeDelete = latestBeforeDelete ? await requestItemsDebug(latestBeforeDelete.id) : [];
      await clickByAria(foremanPage, "Удалить позицию");
      await sleep(4_000);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      const storageAfterDelete = await readForemanLocalDraftStorage(foremanPage);
      const serverRowsAfterDelete = latest ? await requestItemsDebug(latest.id) : [];
      output.materials.row_delete = {
        passed: latest ? (await activeRequestItemsCount(latest.id)) === 0 : false,
        displayNo: latest?.display_no || null,
        itemCount: latest ? await requestItemsCount(latest.id) : null,
        activeItemCount: latest ? await activeRequestItemsCount(latest.id) : null,
        storageBeforeDelete,
        storageAfterDelete,
        serverRowsBeforeDelete,
        serverRowsAfterDelete,
        body: (await bodyText(foremanPage)).slice(0, 1_500),
      };
    }, (output.materials.row_delete = {}));

    await withFailureBody(async () => {
      await clickByAria(foremanPage, "Удалить черновик");
      await sleep(4_000);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      output.materials.cancel = {
        passed: latest ? (await activeRequestItemsCount(latest.id)) === 0 : false,
        displayNo: latest?.display_no || null,
        status: latest?.status || null,
        activeItemCount: latest ? await activeRequestItemsCount(latest.id) : null,
        body: (await bodyText(foremanPage)).slice(0, 1_500),
      };
    }, (output.materials.cancel = {}));

    await withFailureBody(async () => {
      await clickByAria(foremanPage, "Закрыть черновик").catch(() => {});
      await clickText(foremanPage, "История заявок");
      await waitForBody(foremanPage, "История заявок");
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      if (latest?.display_no) {
        await waitForBody(foremanPage, latest.display_no, 10_000);
      }
      const historyBody = await bodyText(foremanPage);
      output.materials.history_visible = {
        passed: Boolean(latest?.display_no && historyBody.includes(latest.display_no)),
        displayNo: latest?.display_no || null,
        body: historyBody.slice(0, 1_500),
      };
      if (latest?.display_no) {
        await clickText(foremanPage, latest.display_no);
        await waitForBody(foremanPage, "Вернуть в черновик", 8_000);
        await clickText(foremanPage, "Вернуть в черновик");
        await sleep(2_500);
        const reopenedBody = await bodyText(foremanPage);
        output.materials.reopen = {
          passed: reopenedBody.includes(latest.display_no) || reopenedBody.includes("Позиции 0"),
          displayNo: latest.display_no,
        };
      } else {
        output.materials.reopen = { passed: false, error: "No latest draft display_no" };
      }
    }, (output.materials.history_visible = {}));
    if (!output.materials.reopen) {
      output.materials.reopen = { passed: false, error: "History flow did not reach reopen" };
    }

    await withFailureBody(async () => {
      await loginForeman(foremanPage, foremanUser);
      await ensureForemanContext(foremanPage);
      await runCalcAdd(foremanPage);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      output.materials.calc_add = {
        passed: latest ? (await requestItemsCount(latest.id)) === 4 : false,
        displayNo: latest?.display_no || null,
        itemCount: latest ? await requestItemsCount(latest.id) : null,
      };
    }, (output.materials.calc_add = {}));

    await withFailureBody(async () => {
      await openDraftModal(foremanPage);
      await clickByAria(foremanPage, "Отправить");
      await sleep(4_000);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      output.materials.submit = {
        passed: Boolean(latest?.submitted_at),
        displayNo: latest?.display_no || null,
        status: latest?.status || null,
      };
      if (latest?.display_no) {
        await waitForBody(directorPage, latest.display_no, 20_000);
        const directorBody = await bodyText(directorPage);
        output.director.end_to_end = {
          passed: directorBody.includes(latest.display_no),
          displayNo: latest.display_no,
          primaryNoFallback: directorLogs.some(
            (line) => line.includes("[director.repository]") && line.includes("fallbackUsed") && line.includes("false"),
          ),
        };
      } else {
        output.director.end_to_end = { passed: false, error: "No submitted display_no" };
      }
    }, (output.materials.submit = {}));
    if (!output.director.end_to_end) {
      output.director.end_to_end = { passed: false, error: "Submit flow did not reach director proof" };
    }

    await withFailureBody(async () => {
      await loginForeman(foremanPage, foremanUser);
      await ensureForemanContext(foremanPage);
      await runAiAdd(foremanPage, "Арматура A400 Ø18 1 т");
      await sleep(6_000);
      const latest = (await latestRequestsByUser(foremanUser.id))[0];
      const pageBody = await bodyText(foremanPage);
      output.ai.matched_add = {
        passed: Boolean(latest && pageBody.includes("Позиции") && (await requestItemsCount(latest.id)) > 0),
        displayNo: latest?.display_no || null,
        itemCount: latest ? await requestItemsCount(latest.id) : null,
      };
    }, (output.ai.matched_add = {}));

    await withFailureBody(async () => {
      await loginForeman(foremanPage, foremanUser);
      await ensureForemanContext(foremanPage);
      await runAiAdd(foremanPage, "Арматура A400 Ø32 1 т");
      await sleep(6_000);
      const pageBody = await bodyText(foremanPage);
      output.ai.blocked_prompt = {
        passed: pageBody.includes("Не удалось сопоставить с каталогом"),
        unresolvedLog:
          foremanLogs.find((line) => line.includes("catalog_unresolved") && line.includes("A400 32")) || null,
        body: pageBody.slice(0, 1_500),
      };
    }, (output.ai.blocked_prompt = {}));

    console.log(JSON.stringify(output, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(foremanUser);
    await cleanupTempUser(directorUser);
  }
}

await main();
