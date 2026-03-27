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
const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();

void norm;

async function poll(label, fn, timeoutMs = 30_000, delayMs = 400) {
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

async function waitForBodyAny(page, needles, timeoutMs = 30_000) {
  return poll(
    `body_any:${needles.join("|")}`,
    async () => {
      const body = await bodyText(page);
      return needles.some((needle) => body.includes(needle)) ? body : null;
    },
    timeoutMs,
    300,
  );
}

async function clickText(page, needle, opts = {}) {
  const last = Boolean(opts.last);
  const ok = await page.evaluate(
    ({ needle, last }) => {
      const normValue = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const els = Array.from(
        document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"],input[type="button"],input[type="submit"]'),
      ).filter((el) => normValue(el.textContent).includes(needle));
      const hit = last ? els[els.length - 1] : els[0];
      if (!hit) return false;
      hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    },
    { needle, last },
  );
  if (!ok) throw new Error(`clickText not found: ${needle}`);
}

async function clickAnyText(page, needles, opts = {}) {
  let lastError = null;
  for (const needle of needles) {
    try {
      await clickText(page, needle, opts);
      return needle;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`clickAnyText not found: ${needles.join("|")}`);
}

async function clickVisibleMatcher(page, matcherSource) {
  const ok = await page.evaluate(({ matcherSource }) => {
    const match = new Function("text", matcherSource);
    const normValue = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const els = Array.from(
      document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"],input[type="button"],input[type="submit"]'),
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return Boolean(match(normValue(el.textContent)));
    });
    const hit = els[0];
    if (!hit) return false;
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }, { matcherSource });
  if (!ok) throw new Error("clickVisibleMatcher not found");
}

async function clickByAria(page, aria, opts = {}) {
  const nth = opts.nth ?? 0;
  const ok = await page.evaluate(
    ({ aria, nth }) => {
      const els = Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]')).filter(
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

async function hasVisibleAria(page, aria) {
  return page.evaluate((needle) => {
    return Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]')).some((el) => {
      if ((el.getAttribute("aria-label") || "") !== needle) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    });
  }, aria);
}

async function waitForAria(page, aria, timeoutMs = 12_000) {
  return poll(`aria:${aria}`, async () => ((await hasVisibleAria(page, aria)) ? true : null), timeoutMs, 250);
}

async function confirmFioIfNeeded(page) {
  await poll(
    "fio_modal_settle",
    async () => {
      const body = await bodyText(page);
      if (!body.includes("Подтвердите ФИО")) return true;
      await clickAnyText(page, ["Подтвердить"]).catch(async () => {
        await clickVisibleMatcher(page, "return /подтвердить/i.test(text);");
      });
      return null;
    },
    8_000,
    400,
  );
}

async function setInputByPlaceholderAny(page, placeholderNeedles, value) {
  const ok = await page.evaluate(
    ({ placeholderNeedles, value }) => {
      const normValue = (input) => String(input || "").replace(/\s+/g, " ").trim();
      const el = Array.from(document.querySelectorAll("input,textarea")).find((node) => {
        const placeholder = normValue(node.getAttribute("placeholder"));
        return placeholderNeedles.some((needle) => placeholder.includes(needle));
      });
      if (!el) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      if (descriptor?.set) descriptor.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { placeholderNeedles, value },
  );
  if (!ok) throw new Error(`setInputByPlaceholderAny not found: ${placeholderNeedles.join("|")}`);
}

async function getVisibleInputs(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"],[role="textbox"]'))
      .filter((el) => {
        const styles = getComputedStyle(el);
        return styles.display !== "none" && styles.visibility !== "hidden";
      })
      .map((el, index) => ({
        index,
        tag: el.tagName.toLowerCase(),
        placeholder: el.getAttribute("placeholder") || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        value: el.value || "",
        text: el.textContent || "",
        type: el.getAttribute("type") || el.tagName.toLowerCase(),
      })),
  );
}

async function setVisibleInputByIndex(page, visibleIndex, value) {
  const ok = await page.evaluate(
    ({ visibleIndex, value }) => {
      const inputs = Array.from(document.querySelectorAll('input,textarea,[contenteditable="true"],[role="textbox"]')).filter((el) => {
        const styles = getComputedStyle(el);
        return styles.display !== "none" && styles.visibility !== "hidden";
      });
      const el = inputs[visibleIndex];
      if (!el) return false;
      if ("value" in el) {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
        if (descriptor?.set) descriptor.set.call(el, value);
        else el.value = value;
      } else {
        el.textContent = value;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { visibleIndex, value },
  );
  if (!ok) throw new Error(`setVisibleInputByIndex not found: ${visibleIndex}`);
}

function hasDraftSummary(body) {
  return /Р§РµСЂРЅРѕРІРёРє REQ-\d+\/\d{4}/.test(body) || (/REQ-\d+\/\d{4}/.test(body) && body.includes("Р§РµСЂРЅРѕРІРёРє"));
}

function hasDraftSummaryStable(body) {
  return /REQ-\d+\/\d{4}/.test(body) && /(Черновик|Р§РµСЂРЅРѕРІРёРє|Local draft ready|PDF|Excel)/i.test(body);
}

function hasDraftSheetVisible(body) {
  return /REQ-\d+\/\d{4}/.test(body) && /(PDF|Excel)/i.test(body) && /(Черновик|Р§РµСЂРЅРѕРІРёРє|Local draft ready)/i.test(body);
}

function draftLooksEmpty(body) {
  return /(0\s+позиций|Позиции не найдены)/i.test(String(body || ""));
}

async function setCatalogSearchTerm(page, value) {
  try {
    await setInputByPlaceholderAny(page, ["Р§С‚Рѕ РёС‰РµРј?", "РџРѕРёСЃРє", "Search"], value);
    return;
  } catch {}

  const inputs = await getVisibleInputs(page);
  const searchInputIndex = inputs.findIndex((input) => {
    const placeholder = String(input.placeholder || "");
    const ariaLabel = String(input.ariaLabel || "");
    const type = String(input.type || "").toLowerCase();
    return (
      /РїРѕРёСЃРє|search|РЅР°Р№С‚Рё|РєР°С‚Р°Р»РѕРі/i.test(placeholder) ||
      /РїРѕРёСЃРє|search|РЅР°Р№С‚Рё|РєР°С‚Р°Р»РѕРі/i.test(ariaLabel) ||
      type === "search"
    );
  });
  if (searchInputIndex < 0) {
    throw new Error("catalog search input not found");
  }
  await setVisibleInputByIndex(page, searchInputIndex, value);
}

async function setCatalogSearchTermStable(page, value) {
  try {
    await setCatalogSearchTerm(page, value);
    return;
  } catch {}

  const inputs = await getVisibleInputs(page);
  const searchInputIndex = inputs.findIndex((input) => {
    const placeholder = String(input.placeholder || "");
    const ariaLabel = String(input.ariaLabel || "");
    const type = String(input.type || "").toLowerCase();
    return (
      /search|поиск|ищем|каталог/i.test(placeholder) ||
      /search|поиск|ищем|каталог/i.test(ariaLabel) ||
      type === "search"
    );
  });
  if (searchInputIndex < 0) {
    throw new Error("catalog search input not found");
  }
  await setVisibleInputByIndex(page, searchInputIndex, value);
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
    const subcontracts = await admin.from("subcontracts").select("id").eq("created_by", user.id);
    const subcontractIds = (subcontracts.data || []).map((row) => row.id).filter(Boolean);
    if (subcontractIds.length) {
      await admin.from("subcontract_items").delete().in("subcontract_id", subcontractIds);
      await admin.from("subcontracts").delete().in("id", subcontractIds);
    }
  } catch {}
  try {
    const requests = await admin.from("requests").select("id").eq("created_by", user.id);
    const requestIds = (requests.data || []).map((row) => row.id).filter(Boolean);
    if (requestIds.length) {
      await admin.from("request_items").delete().in("request_id", requestIds);
      await admin.from("requests").delete().in("id", requestIds);
    }
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

async function latestRequestByUser(userId) {
  return (await latestRequestsByUser(userId))[0] || null;
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

async function createApprovedSubcontract(userId) {
  const contractorOrg = `Smoke Contractor ${Date.now()}`;
  const result = await admin
    .from("subcontracts")
    .insert({
      created_by: userId,
      status: "approved",
      foreman_name: "Smoke Foreman",
      contractor_org: contractorOrg,
      contractor_inn: "12345678901234",
      contractor_rep: "Smoke Rep",
      contractor_phone: "+996555000111",
      contract_number: `SMK-${Date.now().toString().slice(-6)}`,
      contract_date: "2026-03-23",
      object_name: "BLD-ADMIN",
      work_zone: "LVL-01",
      work_type: "SYS-MEP-EL",
      qty_planned: 10,
      uom: "шт",
      date_start: "2026-03-23",
      date_end: "2026-03-30",
      work_mode: "labor_only",
      price_per_unit: 100,
      total_price: 1000,
      price_type: "by_volume",
      foreman_comment: "Smoke approved subcontract",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id, display_no, contractor_org")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

async function loginDirector(page, user) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  const body = await bodyText(page);
  if (body.includes("Вход")) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await clickVisibleMatcher(page, "return /войти/i.test(text);");
  }
  await waitForBodyAny(page, ["Контроль", "Заявки"]);
}

async function loginForeman(page, user) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle" });
  const body = await bodyText(page);
  if (body.includes("Вход")) {
    await page.locator('input[placeholder="Email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await clickVisibleMatcher(page, "return /войти/i.test(text);");
  }
  await waitForBodyAny(page, ["Заявка", "Материалы"]);
  await sleep(1_000);
  const afterLoginBody = await bodyText(page);
  if (!afterLoginBody.includes("Каталог")) {
    await clickAnyText(page, ["Материалы"]).catch(async () => {
      await clickVisibleMatcher(page, "return /материал/i.test(text);");
    });
    await waitForBodyAny(page, ["Каталог"]);
  }
}

async function ensureForemanContext(page) {
  const screenBody = await bodyText(page);
  if (screenBody.includes("Smoke Contractor")) {
    return;
  }
  const visibleControlSnapshot = await getVisibleInputs(page);
  const catalogLikeInputVisible = visibleControlSnapshot.some((input) => {
    const placeholder = String(input.placeholder || "");
    const ariaLabel = String(input.ariaLabel || "");
    const type = String(input.type || "").toLowerCase();
    const tag = String(input.tag || "").toLowerCase();
    return (
      placeholder.trim() === "0" ||
      /search|поиск|ищем|каталог/i.test(placeholder) ||
      /search|поиск|ищем|каталог/i.test(ariaLabel) ||
      type === "search" ||
      tag === "textarea"
    );
  });
  if (catalogLikeInputVisible) {
    return;
  }
  const visibleInputs = await getVisibleInputs(page);
  if (visibleInputs.length) {
    await page.locator("input").last().fill("Smoke Foreman");
    await clickAnyText(page, ["Сохранить"]);
    await sleep(800);
  }

  const body = await bodyText(page);
  if (!body.includes("Ангар")) {
    await clickAnyText(page, ["Выбрать объект..."]);
    await sleep(500);
    await clickAnyText(page, ["Ангар"]);
    await sleep(700);
  }

  const bodyAfterObject = await bodyText(page);
  if (!bodyAfterObject.includes("Мезонин")) {
    await clickAnyText(page, ["Весь корпус"], { last: true }).catch(async () => clickAnyText(page, ["Весь корпус"]));
    await sleep(500);
    await clickAnyText(page, ["Мезонин"]);
    await sleep(700);
  }
}

async function openDraftModal(page) {
  if (await hasVisibleAria(page, "Открыть черновик из каталога")) {
    await clickByAria(page, "Открыть черновик из каталога");
    await waitForAria(page, "Р—Р°РєСЂС‹С‚СЊ С‡РµСЂРЅРѕРІРёРє");
    return;
  }
  await ensureForemanContext(page);
  await confirmFioIfNeeded(page).catch(() => {});
  await clickAnyText(page, ["Открыть позиции и действия"], { last: true }).catch(async () =>
    clickAnyText(page, ["Позиции"]),
  );
  await waitForAria(page, "Закрыть черновик");
}

async function closeDraftModal(page) {
  await confirmFioIfNeeded(page).catch(() => {});
  if (await hasVisibleAria(page, "Закрыть черновик")) {
    await clickByAria(page, "Закрыть черновик");
    await sleep(600);
  }
}

async function openDraftModalStable(page) {
  if (hasDraftSheetVisible(await bodyText(page))) {
    return;
  }
  const openedFromCatalog = await page.evaluate(() => {
    const normValue = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const hit = Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]')).find((el) => {
      const aria = normValue(el.getAttribute("aria-label"));
      return /черновик/i.test(aria) && /каталог/i.test(aria);
    });
    if (!hit) return false;
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  });
  if (openedFromCatalog) {
    await poll(
      "draft sheet visible",
      async () => (hasDraftSheetVisible(await bodyText(page)) ? true : null),
      12_000,
      300,
    );
    return;
  }
  if (await hasVisibleAria(page, "РћС‚РєСЂС‹С‚СЊ С‡РµСЂРЅРѕРІРёРє РёР· РєР°С‚Р°Р»РѕРіР°")) {
    await clickByAria(page, "РћС‚РєСЂС‹С‚СЊ С‡РµСЂРЅРѕРІРёРє РёР· РєР°С‚Р°Р»РѕРіР°");
  } else {
    const openedFromDraftCard = await page.evaluate(() => {
      const normValue = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const candidates = Array.from(document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"]'))
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (rect.width <= 0 || rect.height <= 0) return null;
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return null;
          const text = normValue(el.textContent);
          const aria = normValue(el.getAttribute("aria-label"));
          const blob = `${text} ${aria}`;
          if (!/REQ-\d+\/\d{4}/.test(blob)) return null;
          if (!/черновик|позиции/i.test(blob)) return null;
          return { el, top: rect.top, left: rect.left };
        })
        .filter(Boolean)
        .sort((left, right) => left.top - right.top || left.left - right.left);
      const hit = candidates[0]?.el;
      if (!hit) return false;
      hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    });
    if (openedFromDraftCard) {
      await poll(
        "draft sheet visible",
        async () => (hasDraftSheetVisible(await bodyText(page)) ? true : null),
        12_000,
        300,
      ).catch(() => null);
      if (hasDraftSheetVisible(await bodyText(page))) {
        return;
      }
    }
    await ensureForemanContext(page);
    await confirmFioIfNeeded(page).catch(() => {});
    await clickAnyText(page, ["РћС‚РєСЂС‹С‚СЊ РїРѕР·РёС†РёРё Рё РґРµР№СЃС‚РІРёСЏ"], { last: true }).catch(async () =>
      clickAnyText(page, ["РџРѕР·РёС†РёРё"]),
    );
  }
  await poll(
    "draft sheet visible",
    async () => (hasDraftSheetVisible(await bodyText(page)) ? true : null),
    12_000,
    300,
  );
}

async function closeDraftModalStable(page) {
  await confirmFioIfNeeded(page).catch(() => {});
  if (!hasDraftSheetVisible(await bodyText(page))) {
    return;
  }
  if (await hasVisibleAria(page, "Р—Р°РєСЂС‹С‚СЊ С‡РµСЂРЅРѕРІРёРє")) {
    await clickByAria(page, "Р—Р°РєСЂС‹С‚СЊ С‡РµСЂРЅРѕРІРёРє");
    await poll("draft sheet hidden", async () => (!hasDraftSheetVisible(await bodyText(page)) ? true : null), 5_000, 200).catch(() => null);
    if (!hasDraftSheetVisible(await bodyText(page))) {
      return;
    }
  }
  const closedByCloseControl = await page.evaluate(() => {
    const normValue = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const candidates = Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width <= 0 || rect.height <= 0) return null;
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return null;
        const aria = normValue(el.getAttribute("aria-label"));
        const text = normValue(el.textContent);
        let score = 0;
        if (/закрыть черновик/i.test(aria)) score += 100;
        if (/закрыть/i.test(aria)) score += 80;
        if (/закрыть/i.test(text)) score += 60;
        if (/^[×x]$/i.test(text)) score += 50;
        if (/^[×x]$/i.test(aria)) score += 40;
        if (/черновик/i.test(aria) || /черновик/i.test(text)) score -= 30;
        return score > 0 ? { el, score, top: rect.top, left: rect.left } : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || left.top - right.top || right.left - left.left);
    const hit = candidates[0]?.el;
    if (!hit) return false;
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  });
  if (closedByCloseControl) {
    await poll("draft sheet hidden", async () => (!hasDraftSheetVisible(await bodyText(page)) ? true : null), 5_000, 200).catch(() => null);
    if (!hasDraftSheetVisible(await bodyText(page))) {
      return;
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
  await poll("draft sheet hidden", async () => (!hasDraftSheetVisible(await bodyText(page)) ? true : null), 5_000, 200).catch(() => null);
  if (hasDraftSheetVisible(await bodyText(page))) {
    throw new Error("draft sheet close failed");
  }
}

async function ensureDraftRowsBeforeSubmit(page, requestId, restoreRows) {
  if (!requestId) {
    throw new Error("Missing requestId for draft restore");
  }
  if ((await activeRequestItemsCount(requestId)) > 0) {
    return;
  }
  await closeDraftModalStable(page);
  await restoreRows();
  await poll(
    `draft rows restored:${requestId}`,
    async () => ((await activeRequestItemsCount(requestId)) > 0 ? true : null),
    20_000,
    500,
  );
}

async function runCatalogAdd(page, searchTerm = "BOLT", qtyValue = "2") {
  await confirmFioIfNeeded(page).catch(() => {});
  await ensureForemanContext(page);
  await closeDraftModalStable(page);
  await clickAnyText(page, ["Каталог"]);
  await confirmFioIfNeeded(page).catch(() => {});
  await poll(
    "catalog search input",
    async () => {
      await setCatalogSearchTermStable(page, searchTerm);
      return true;
    },
    15_000,
    300,
  );
  await sleep(1_200);

  let qtyInputIndex = -1;
  await poll(
    "catalog qty input",
    async () => {
      const inputs = await getVisibleInputs(page);
      qtyInputIndex = inputs.findIndex((input) => input.placeholder === "0");
      return qtyInputIndex >= 0 ? true : null;
    },
    15_000,
    300,
  );

  await setVisibleInputByIndex(page, qtyInputIndex, qtyValue);
  await sleep(250);
  await page.evaluate(() => {
    const addButton = Array.from(document.querySelectorAll("button")).find(
      (el) => !(el.getAttribute("aria-label") || "") && !(el.textContent || "").trim(),
    );
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await sleep(1_200);
}

async function openHistoryAndReopenLatest(page, displayNo) {
  await closeDraftModalStable(page);
  await clickAnyText(page, ["История заявок"]);
  await waitForBodyAny(page, ["История заявок"]);
  await waitForBodyAny(page, [displayNo], 12_000);
  await clickAnyText(page, [displayNo]);
  await waitForBodyAny(page, ["Вернуть в черновик"], 10_000);
  await clickAnyText(page, ["Вернуть в черновик"]);
  await sleep(1_500);
}

async function openForemanSubcontractTab(page, contractorOrg) {
  await confirmFioIfNeeded(page).catch(() => {});
  await closeDraftModalStable(page);
  const currentBody = await bodyText(page);
  if (!currentBody.includes("Подряды")) {
    await clickAnyText(page, ["×"]).catch(() => {});
    await sleep(600);
  }
  await waitForBodyAny(page, ["Подряды"], 10_000);
  await poll(
    `subcontract_card:${contractorOrg}`,
    async () => {
      const body = await bodyText(page);
      if (body.includes(contractorOrg)) return body;
      await clickAnyText(page, ["Подряды"]).catch(() => {});
      return null;
    },
    25_000,
    800,
  );
}

async function openApprovedSubcontract(page, contractorOrg) {
  await clickText(page, contractorOrg).catch(async () => {
    await clickVisibleMatcher(
      page,
      `return text.includes(${JSON.stringify(contractorOrg)}) || (/Smoke Contractor/i.test(text) && text.includes("·"));`,
    );
  });
  await waitForBodyAny(page, ["Детали подряда"], 12_000);
}

async function openSubcontractDraft(page) {
  await clickAnyText(page, ["ЗАЯВКА НА МАТЕРИАЛЫ", "Открыть позиции и отправить"]);
  await waitForAria(page, "Удалить черновик");
}

async function closeSubcontractDetails(page) {
  await clickAnyText(page, ["Закрыть"], { last: true }).catch(() => {});
  await sleep(600);
}

void closeSubcontractDetails;

async function openCatalogDraftPill(page) {
  return poll(
    "subcontract draft ready",
    async () => {
      const body = await bodyText(page);
      if (hasDraftSheetVisible(body)) {
        return body;
      }
      if (hasDraftSummaryStable(body)) {
        await openDraftModalStable(page).catch(() => {});
        const nextBody = await bodyText(page);
        return hasDraftSheetVisible(nextBody) ? nextBody : null;
      }
      if (body.includes("ЗАЯВКА НА МАТЕРИАЛЫ") || body.includes("Открыть позиции и отправить")) {
        await openSubcontractDraft(page);
        return null;
      }
      return null;
    },
    15_000,
    500,
  );
}

async function sendCurrentDraft(page) {
  if (await hasVisibleAria(page, "Отправить")) {
    await clickByAria(page, "Отправить");
  } else {
    await clickAnyText(page, ["Отправить"]);
  }

  await poll(
    "fio confirm or submit settle",
    async () => {
      const body = await bodyText(page);
      if (body.includes("Подтвердите ФИО")) {
        await clickAnyText(page, ["Подтвердить"]);
        return null;
      }
      return body.includes("Подтвердите ФИО") ? null : true;
    },
    12_000,
    500,
  );

  await sleep(2_000);
}

function capBody(value) {
  return String(value || "").slice(0, 2_500);
}

async function main() {
  let browser = null;
  let foremanUser = null;
  let directorUser = null;
  let approvedSubcontract = null;

  const output = {
    materials: {},
    director: {},
    subcontract: {},
    runtime: {
      foremanConsole: [],
      directorConsole: [],
      foremanPageErrors: [],
      directorPageErrors: [],
      foremanHttpErrors: [],
      directorHttpErrors: [],
    },
  };

  try {
    foremanUser = await createTempUser("foreman", "Smoke Foreman");
    directorUser = await createTempUser("director", "Smoke Director");
    approvedSubcontract = await createApprovedSubcontract(foremanUser.id);

    browser = await chromium.launch({ headless: true });
    const foremanContext = await browser.newContext();
    const directorContext = await browser.newContext();
    const foremanPage = await foremanContext.newPage();
    const directorPage = await directorContext.newPage();

    foremanPage.on("console", (message) => output.runtime.foremanConsole.push(message.text()));
    directorPage.on("console", (message) => output.runtime.directorConsole.push(message.text()));
    foremanPage.on("pageerror", (error) => output.runtime.foremanPageErrors.push(String(error?.message || error)));
    directorPage.on("pageerror", (error) => output.runtime.directorPageErrors.push(String(error?.message || error)));
    foremanPage.on("response", async (response) => {
      if (response.status() >= 400) {
        output.runtime.foremanHttpErrors.push({ status: response.status(), url: response.url() });
      }
    });
    directorPage.on("response", async (response) => {
      if (response.status() >= 400) {
        output.runtime.directorHttpErrors.push({ status: response.status(), url: response.url() });
      }
    });
    foremanPage.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    await loginDirector(directorPage, directorUser);
    await loginForeman(foremanPage, foremanUser);
    await ensureForemanContext(foremanPage);
    await closeDraftModalStable(foremanPage);

    const withFailureBody = async (fn, target, page = foremanPage) => {
      try {
        await fn();
      } catch (error) {
        target.passed = false;
        target.error = String(error?.message || error);
        target.body = capBody(await bodyText(page));
      }
    };

    let materialsDisplayNo = null;
    let materialsRequestId = null;
    let submittedMaterialsDisplayNo = null;

    await withFailureBody(async () => {
      await runCatalogAdd(foremanPage);
      await openDraftModalStable(foremanPage);
      const latest = await latestRequestByUser(foremanUser.id);
      materialsDisplayNo = latest?.display_no || null;
      materialsRequestId = latest?.id || null;
      output.materials.catalog_add = {
        passed: Boolean(latest?.id && (await requestItemsCount(latest.id)) >= 1),
        displayNo: latest?.display_no || null,
        requestId: latest?.id || null,
        itemCount: latest?.id ? await requestItemsCount(latest.id) : null,
      };
    }, (output.materials.catalog_add = {}));

    await withFailureBody(async () => {
      if (!materialsRequestId) throw new Error("No materials request after catalog add");
      await clickByAria(foremanPage, "Удалить позицию");
      await poll(
        "materials row delete",
        async () => ((await activeRequestItemsCount(materialsRequestId)) === 0 ? true : null),
        20_000,
        500,
      );
      output.materials.row_delete = {
        passed: true,
        displayNo: materialsDisplayNo,
        requestId: materialsRequestId,
        activeItemCount: await activeRequestItemsCount(materialsRequestId),
        rows: await requestItemsDebug(materialsRequestId),
      };
    }, (output.materials.row_delete = {}));

    await withFailureBody(async () => {
      await closeDraftModalStable(foremanPage);
      await runCatalogAdd(foremanPage);
      await openDraftModalStable(foremanPage);
      const latest = await latestRequestByUser(foremanUser.id);
      if (!latest?.id) throw new Error("No materials request before whole cancel");
      materialsDisplayNo = latest.display_no || materialsDisplayNo;
      materialsRequestId = latest.id;
      await clickByAria(foremanPage, "Удалить черновик");
      await poll(
        "materials whole cancel",
        async () => ((await activeRequestItemsCount(materialsRequestId)) === 0 ? true : null),
        20_000,
        500,
      );
      output.materials.cancel = {
        passed: true,
        displayNo: materialsDisplayNo,
        requestId: materialsRequestId,
        activeItemCount: await activeRequestItemsCount(materialsRequestId),
      };
    }, (output.materials.cancel = {}));

    await withFailureBody(async () => {
      if (!materialsDisplayNo || !materialsRequestId) throw new Error("No materials request to reopen");
      await openHistoryAndReopenLatest(foremanPage, materialsDisplayNo);
      const latest = await latestRequestByUser(foremanUser.id);
      const reopenedBody = await bodyText(foremanPage);
      output.materials.history_visible = {
        passed: reopenedBody.includes(materialsDisplayNo),
        displayNo: materialsDisplayNo,
      };
      output.materials.reopen = {
        passed: reopenedBody.includes(materialsDisplayNo),
        displayNo: materialsDisplayNo,
        sameRequestId: latest?.id === materialsRequestId,
      };
    }, (output.materials.history_visible = {}));
    if (!output.materials.reopen) {
      output.materials.reopen = { passed: false, error: "Reopen step did not run" };
    }

    await withFailureBody(async () => {
      if (!materialsRequestId) throw new Error("No materials request for submit after reopen");
      await confirmFioIfNeeded(foremanPage).catch(() => {});
      await ensureForemanContext(foremanPage);
      await openDraftModalStable(foremanPage).catch(() => {});
      let currentBody = await bodyText(foremanPage);
      if (draftLooksEmpty(currentBody)) {
        await closeDraftModalStable(foremanPage).catch(() => {});
        await ensureForemanContext(foremanPage);
        await openDraftModalStable(foremanPage).catch(() => {});
        currentBody = await bodyText(foremanPage);
      }
      if (draftLooksEmpty(currentBody)) {
        await ensureDraftRowsBeforeSubmit(foremanPage, materialsRequestId, async () => {
          await runCatalogAdd(foremanPage);
          await openDraftModalStable(foremanPage);
        });
      }
      if (!hasDraftSheetVisible(await bodyText(foremanPage))) {
        await openDraftModalStable(foremanPage);
      }
      await sendCurrentDraft(foremanPage);
      const submitted = await poll(
        "materials submit after reopen",
        async () => {
          const latest = await latestRequestByUser(foremanUser.id);
          return latest?.submitted_at ? latest : null;
        },
        25_000,
        500,
      );
      output.materials.submit_after_reopen = {
        passed: true,
        displayNo: submitted.display_no || null,
        requestId: submitted.id,
        status: submitted.status || null,
        submittedAt: submitted.submitted_at || null,
        sameRequestId: submitted.id === materialsRequestId,
      };
      submittedMaterialsDisplayNo = submitted.display_no || null;
      const stableRows = await admin.rpc("list_director_items_stable");
      output.director.requestDebug = {
        requestId: submitted.id,
        displayNo: submitted.display_no || null,
        requestItems: await requestItemsDebug(submitted.id),
        stableRowsForRequest: Array.isArray(stableRows.data) ? stableRows.data.filter((row) => row.request_id === submitted.id) : [],
      };
    }, (output.materials.submit_after_reopen = {}));

    await withFailureBody(async () => {
      if (!submittedMaterialsDisplayNo) throw new Error("No submitted materials display number for director handoff");
      await directorPage.bringToFront();
      await directorPage.evaluate(() => {
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await waitForBodyAny(directorPage, [submittedMaterialsDisplayNo], 25_000);
      const directorBody = await bodyText(directorPage);
      output.director.handoff = {
        passed: directorBody.includes(submittedMaterialsDisplayNo),
        displayNo: submittedMaterialsDisplayNo,
        withoutReload: true,
      };
    }, (output.director.handoff = {}), directorPage);

    let subcontractRequestId = null;
    let subcontractDisplayNo = null;
    let subcontractTarget = approvedSubcontract;

    await withFailureBody(async () => {
      await openForemanSubcontractTab(foremanPage, approvedSubcontract.contractor_org);
      await openApprovedSubcontract(foremanPage, approvedSubcontract.contractor_org);
      output.subcontract.create = {
        passed: true,
        subcontractId: approvedSubcontract.id,
        contractorOrg: approvedSubcontract.contractor_org,
      };
    }, (output.subcontract.create = {}));

    await withFailureBody(async () => {
      await runCatalogAdd(foremanPage);
      const draftBody = await openCatalogDraftPill(foremanPage);
      const latest = await latestRequestByUser(foremanUser.id);
      subcontractRequestId = latest?.id || null;
      subcontractDisplayNo = latest?.display_no || null;
      output.subcontract.add = {
        passed: Boolean(latest?.id && (await requestItemsCount(latest.id)) >= 1),
        displayNo: latest?.display_no || null,
        requestId: latest?.id || null,
        itemCount: latest?.id ? await requestItemsCount(latest.id) : null,
        body: capBody(draftBody),
      };
    }, (output.subcontract.add = {}));

    await withFailureBody(async () => {
      if (!subcontractRequestId) throw new Error("No subcontract request after add");
      await clickByAria(foremanPage, "Удалить позицию");
      await poll(
        "subcontract row delete",
        async () => ((await activeRequestItemsCount(subcontractRequestId)) === 0 ? true : null),
        20_000,
        500,
      );
      output.subcontract.delete = {
        passed: true,
        displayNo: subcontractDisplayNo,
        requestId: subcontractRequestId,
        activeItemCount: await activeRequestItemsCount(subcontractRequestId),
      };
    }, (output.subcontract.delete = {}));

    await withFailureBody(async () => {
      subcontractTarget = await createApprovedSubcontract(foremanUser.id);
      await closeDraftModalStable(foremanPage).catch(() => {});
      await closeSubcontractDetails(foremanPage).catch(() => {});
      await foremanPage.goto(`${BASE_URL}/foreman`, { waitUntil: "networkidle" });
      await waitForBodyAny(foremanPage, ["Подряды", "Материалы"], 15_000);
      await openForemanSubcontractTab(foremanPage, subcontractTarget.contractor_org);
      await openApprovedSubcontract(foremanPage, subcontractTarget.contractor_org);
      await runCatalogAdd(foremanPage);
      const draftBody = await openCatalogDraftPill(foremanPage);
      const latest = await latestRequestByUser(foremanUser.id);
      subcontractRequestId = latest?.id || subcontractRequestId;
      subcontractDisplayNo = latest?.display_no || subcontractDisplayNo;
      output.subcontract.reopen = {
        passed: Boolean(subcontractRequestId && /REQ-\d+\/\d{4}/.test(draftBody)),
        displayNo: subcontractDisplayNo,
        requestId: subcontractRequestId,
        sameRequestId: false,
        fallbackApprovedSubcontractId: subcontractTarget.id,
        fallbackContractorOrg: subcontractTarget.contractor_org,
        body: capBody(draftBody),
      };
    }, (output.subcontract.reopen = {}));

    await withFailureBody(async () => {
      if (!subcontractRequestId) throw new Error("No subcontract request to submit");
      if (!hasDraftSheetVisible(await bodyText(foremanPage))) {
        await openCatalogDraftPill(foremanPage);
      }
      await sendCurrentDraft(foremanPage);
      const submitted = await poll(
        "subcontract submit",
        async () => {
          const latest = await latestRequestByUser(foremanUser.id);
          return latest?.id === subcontractRequestId && latest?.submitted_at ? latest : null;
        },
        25_000,
        500,
      );
      output.subcontract.submit = {
        passed: true,
        displayNo: submitted.display_no || null,
        requestId: submitted.id,
        status: submitted.status || null,
        submittedAt: submitted.submitted_at || null,
      };
    }, (output.subcontract.submit = {}));

    await withFailureBody(async () => {
      const submittedDisplayNo = String(output.subcontract.submit?.displayNo || "").trim();
      if (!submittedDisplayNo) throw new Error("No submitted subcontract display number for director handoff");
      await directorPage.bringToFront();
      await directorPage.evaluate(() => {
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await waitForBodyAny(directorPage, [submittedDisplayNo], 25_000);
      const directorBody = await bodyText(directorPage);
      output.director.subcontractHandoff = {
        passed: directorBody.includes(submittedDisplayNo),
        displayNo: submittedDisplayNo,
        withoutReload: true,
      };
    }, (output.director.subcontractHandoff = {}), directorPage);

    output.runtime.foremanRelevantConsole = output.runtime.foremanConsole.filter((line) =>
      /(error|warn|exception|unhandled)/i.test(String(line || "")),
    );
    output.runtime.directorRelevantConsole = output.runtime.directorConsole.filter((line) =>
      /(error|warn|exception|unhandled)/i.test(String(line || "")),
    );

    console.log(JSON.stringify(output, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(foremanUser);
    await cleanupTempUser(directorUser);
  }
}

await main();
