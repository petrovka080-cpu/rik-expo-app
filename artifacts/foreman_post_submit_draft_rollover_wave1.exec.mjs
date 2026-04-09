import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });
const projectRoot = process.cwd();
const baseUrl = String(process.env.FOREMAN_WEB_BASE_URL ?? "http://localhost:8081").trim();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const password = "Pass1234";
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;
if (!supabaseUrl || !anonKey || !serviceRoleKey || !supabaseProjectRef) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
}
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "foreman-post-submit-draft-rollover-wave1" } }
});
const artifactOutPath = path.join(projectRoot, "artifacts/foreman-post-submit-draft-rollover-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/foreman-post-submit-draft-rollover-wave1.summary.json");
const webSuccessPng = path.join(projectRoot, "artifacts/foreman-post-submit-draft-rollover-wave1.web-success.png");
const webFailurePng = path.join(projectRoot, "artifacts/foreman-post-submit-draft-rollover-wave1.web-failure.png");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quoteWindowsArg = (value) => /[\s"]/u.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
const delegatedRunFlag = "FOREMAN_POST_SUBMIT_PROOF_COMPILED";
const delegatedScriptPath = path.join(projectRoot, "artifacts/foreman_post_submit_draft_rollover_wave1.exec.mjs");
if (process.env[delegatedRunFlag] !== "1") {
  const compileArgs = [
    "esbuild",
    "scripts/foreman_post_submit_draft_rollover_wave1.ts",
    "--platform=node",
    "--format=esm",
    `--outfile=${delegatedScriptPath}`
  ];
  const compileResult = process.platform === "win32" ? spawnSync(
    process.env.ComSpec || "cmd.exe",
    ["/d", "/s", "/c", `npx ${compileArgs.map(quoteWindowsArg).join(" ")}`],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 12e4
    }
  ) : spawnSync("npx", compileArgs, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 12e4
  });
  if (compileResult.status !== 0) {
    throw new Error(
      `Failed to compile delegated proof runner: ${String(compileResult.stderr ?? compileResult.stdout ?? "").trim()}`
    );
  }
  const delegatedResult = spawnSync(process.execPath, [delegatedScriptPath], {
    cwd: projectRoot,
    env: { ...process.env, [delegatedRunFlag]: "1" },
    stdio: "inherit",
    timeout: 18e5
  });
  process.exit(delegatedResult.status ?? 1);
}
const writeJson = (fullPath, payload) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}
`);
};
async function poll(label, fn, timeoutMs = 3e4, delayMs = 300) {
  const startedAt = Date.now();
  let lastError = null;
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
function capText(value, maxChars = 2500) {
  return String(value ?? "").slice(0, maxChars);
}
const runNodeCommand = (args, timeoutMs) => {
  const result = process.platform === "win32" ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npx ${args.map(quoteWindowsArg).join(" ")}`], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs
  }) : spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs
  });
  return {
    passed: result.status === 0,
    status: result.status,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim()
  };
};
async function ensureBaseUrlReady() {
  await poll(
    "web_base_url_ready",
    async () => {
      try {
        const response = await fetch(baseUrl, { signal: AbortSignal.timeout(4e3) });
        return response.status > 0 ? true : null;
      } catch {
        return null;
      }
    },
    6e4,
    750
  );
}
async function bodyText(page) {
  return await page.evaluate(() => document.body.innerText || "");
}
async function waitForBodyAny(page, needles, timeoutMs = 3e4) {
  return await poll(
    `body_any:${needles.join("|")}`,
    async () => {
      const body = await bodyText(page);
      return needles.some((needle) => body.includes(needle)) ? body : null;
    },
    timeoutMs,
    250
  );
}
async function clickText(page, needle, opts) {
  const ok = await page.evaluate(
    ({ needle: needle2, last }) => {
      const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
      const elements = Array.from(
        document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"],input[type="button"],input[type="submit"]')
      ).filter((element) => norm(element.textContent).includes(needle2));
      const target = last ? elements[elements.length - 1] : elements[0];
      if (!target) return false;
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    },
    { needle, last: opts?.last === true }
  );
  if (!ok) throw new Error(`clickText not found: ${needle}`);
}
async function clickAnyText(page, needles, opts) {
  let lastError = null;
  for (const needle of needles) {
    try {
      await clickText(page, needle, opts);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`clickAnyText not found: ${needles.join("|")}`);
}
async function clickVisibleMatcher(page, matcherSource) {
  const ok = await page.evaluate(({ matcherSource: matcherSource2 }) => {
    const match = new Function("text", matcherSource2);
    const norm = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const elements = Array.from(
      document.querySelectorAll('div[tabindex],button,[role="button"],a[role="link"],input[type="button"],input[type="submit"]')
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      return Boolean(match(norm(element.textContent)));
    });
    const target = elements[0];
    if (!target) return false;
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }, { matcherSource });
  if (!ok) throw new Error("clickVisibleMatcher not found");
}
async function clickByAria(page, aria, opts) {
  const ok = await page.evaluate(
    ({ aria: aria2, nth }) => {
      const elements = Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]')).filter(
        (element) => {
          if ((element.getAttribute("aria-label") || "") !== aria2) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }
      );
      const target = elements[nth];
      if (!target) return false;
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    },
    { aria, nth: opts?.nth ?? 0 }
  );
  if (!ok) throw new Error(`clickByAria not found: ${aria}`);
}
async function hasVisibleAria(page, aria) {
  return await page.evaluate((needle) => {
    return Array.from(document.querySelectorAll('[aria-label],button,[role="button"],div[tabindex]')).some((element) => {
      if ((element.getAttribute("aria-label") || "") !== needle) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
  }, aria);
}
async function waitForAria(page, aria, timeoutMs = 12e3) {
  await poll(`aria:${aria}`, async () => await hasVisibleAria(page, aria) ? true : null, timeoutMs, 250);
}
async function setInputByPlaceholderAny(page, placeholderNeedles, value) {
  const ok = await page.evaluate(
    ({ placeholderNeedles: placeholderNeedles2, value: value2 }) => {
      const norm = (input) => String(input ?? "").replace(/\s+/g, " ").trim();
      const element = Array.from(document.querySelectorAll("input,textarea")).find((node) => {
        const placeholder = norm(node.getAttribute("placeholder"));
        return placeholderNeedles2.some((needle) => placeholder.includes(needle));
      });
      if (!element) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
      if (descriptor?.set) descriptor.set.call(element, value2);
      else element.value = value2;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { placeholderNeedles, value }
  );
  if (!ok) throw new Error(`setInputByPlaceholderAny not found: ${placeholderNeedles.join("|")}`);
}
async function getVisibleInputs(page) {
  return await page.evaluate(
    () => Array.from(document.querySelectorAll("input,textarea")).filter((element) => {
      const styles = getComputedStyle(element);
      return styles.display !== "none" && styles.visibility !== "hidden";
    }).map((element, index) => ({
      index,
      placeholder: element.getAttribute("placeholder") || "",
      value: element.value || "",
      type: element.getAttribute("type") || element.tagName.toLowerCase()
    }))
  );
}
async function setVisibleInputByIndex(page, visibleIndex, value) {
  const ok = await page.evaluate(
    ({ visibleIndex: visibleIndex2, value: value2 }) => {
      const inputs = Array.from(document.querySelectorAll("input,textarea")).filter((element2) => {
        const styles = getComputedStyle(element2);
        return styles.display !== "none" && styles.visibility !== "hidden";
      });
      const element = inputs[visibleIndex2];
      if (!element) return false;
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value");
      if (descriptor?.set) descriptor.set.call(element, value2);
      else element.value = value2;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { visibleIndex, value }
  );
  if (!ok) throw new Error(`setVisibleInputByIndex not found: ${visibleIndex}`);
}
async function createTempUser(role, fullName) {
  const email = `foreman.postsubmit.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role }
  });
  if (userResult.error) throw userResult.error;
  const user = userResult.data.user;
  const profileResult = await admin.from("profiles").upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;
  const userProfileResult = await admin.from("user_profiles").upsert({ user_id: user.id, full_name: fullName }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;
  return { id: user.id, email, password, role };
}
async function cleanupTempUser(user) {
  if (!user) return;
  try {
    const requests = await admin.from("requests").select("id").eq("created_by", user.id);
    const requestIds = (requests.data ?? []).map((row) => String(row.id ?? "").trim()).filter(Boolean);
    if (requestIds.length) {
      await admin.from("request_items").delete().in("request_id", requestIds);
      await admin.from("requests").delete().in("id", requestIds);
    }
  } catch {
  }
  try {
    const subcontracts = await admin.from("subcontracts").select("id").eq("created_by", user.id);
    const subcontractIds = (subcontracts.data ?? []).map((row) => String(row.id ?? "").trim()).filter(Boolean);
    if (subcontractIds.length) {
      await admin.from("subcontract_items").delete().in("subcontract_id", subcontractIds);
      await admin.from("subcontracts").delete().in("id", subcontractIds);
    }
  } catch {
  }
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {
  }
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {
  }
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {
  }
}
async function latestRequestsByUser(userId) {
  const result = await admin.from("requests").select("id, display_no, status, submitted_at, created_at").eq("created_by", userId).order("created_at", { ascending: false }).limit(10);
  if (result.error) throw result.error;
  return result.data ?? [];
}
async function latestRequestByUser(userId) {
  return (await latestRequestsByUser(userId))[0] ?? null;
}
async function findRequestById(requestId) {
  const result = await admin.from("requests").select("id, display_no, status, submitted_at, created_at").eq("id", requestId).maybeSingle();
  if (result.error) throw result.error;
  return result.data ?? null;
}
async function requestItemsDebug(requestId) {
  const result = await admin.from("request_items").select("id, request_id, rik_code, qty, status").eq("request_id", requestId).order("created_at", { ascending: true });
  if (result.error) throw result.error;
  return result.data ?? [];
}
async function requestItemsCount(requestId) {
  const result = await admin.from("request_items").select("*", { count: "exact", head: true }).eq("request_id", requestId);
  if (result.error) throw result.error;
  return result.count ?? 0;
}
async function readDraftStorageState(page) {
  return await page.evaluate(() => {
    const durableRaw = globalThis.localStorage?.getItem("foreman_durable_draft_store_v2") ?? null;
    const draftRequestId = globalThis.localStorage?.getItem("foreman_draft_request_id") ?? null;
    let durable = null;
    if (durableRaw) {
      try {
        const parsed = JSON.parse(durableRaw);
        durable = {
          syncStatus: typeof parsed.syncStatus === "string" ? parsed.syncStatus : null,
          conflictType: typeof parsed.conflictType === "string" ? parsed.conflictType : null,
          pendingOperationsCount: Number.isFinite(Number(parsed.pendingOperationsCount)) ? Number(parsed.pendingOperationsCount) : null,
          snapshotRequestId: typeof parsed.snapshot?.requestId === "string" && parsed.snapshot.requestId.trim().length > 0 ? parsed.snapshot.requestId : null,
          snapshotItemCount: Array.isArray(parsed.snapshot?.items) ? parsed.snapshot.items.length : 0,
          requestIdKnown: parsed.requestIdKnown === true,
          attentionNeeded: parsed.attentionNeeded === true,
          availableRecoveryActions: Array.isArray(parsed.availableRecoveryActions) ? parsed.availableRecoveryActions.map((entry) => String(entry)) : [],
          lastError: typeof parsed.lastError === "string" ? parsed.lastError : null
        };
      } catch {
        durable = null;
      }
    }
    return { durableRaw, draftRequestId, durable };
  });
}
async function waitForStorage(page, label, predicate, timeoutMs = 2e4) {
  return await poll(
    label,
    async () => {
      const state = await readDraftStorageState(page);
      return predicate(state) ? state : null;
    },
    timeoutMs,
    250
  );
}
function isCleanPostSubmitStorageState(state) {
  if (!state.durable) {
    return !state.draftRequestId;
  }
  return !state.draftRequestId && !state.durable.snapshotRequestId && state.durable.snapshotItemCount === 0 && (state.durable.syncStatus ?? "idle") === "idle" && (state.durable.pendingOperationsCount ?? 0) === 0 && state.durable.attentionNeeded === false && (state.durable.conflictType ?? "none") === "none" && state.durable.availableRecoveryActions.length === 0;
}
async function waitForBodyExcludes(page, needles, timeoutMs = 2e4) {
  await poll(
    `body_excludes:${needles.join("|")}`,
    async () => {
      const body = await bodyText(page);
      return needles.every((needle) => !body.includes(needle)) ? body : null;
    },
    timeoutMs,
    300
  );
}
async function confirmFioIfNeeded(page) {
  await poll(
    "fio_modal_settle",
    async () => {
      const body = await bodyText(page);
      if (!body.includes("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0424\u0418\u041E")) return true;
      await clickAnyText(page, ["\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C"]).catch(async () => {
        await clickVisibleMatcher(page, "return /\u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C/i.test(text);");
      });
      return null;
    },
    8e3,
    400
  );
}
async function signInSession(email, userPassword) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        "x-client-info": "foreman-post-submit-draft-rollover-wave1-signin"
      }
    }
  });
  const result = await client.auth.signInWithPassword({ email, password: userPassword });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}
async function loginForeman(page, user) {
  const session = await signInSession(user.email, user.password);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session)
    }
  );
  await page.goto(`${baseUrl}/foreman`, { waitUntil: "networkidle", timeout: 6e4 });
  await waitForBodyAny(page, ["\u0417\u0430\u044F\u0432\u043A\u0430", "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B"], 45e3);
  await sleep(1e3);
  const afterLoginBody = await bodyText(page);
  if (!afterLoginBody.includes("\u041A\u0430\u0442\u0430\u043B\u043E\u0433")) {
    await clickAnyText(page, ["\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B"]).catch(async () => {
      await clickVisibleMatcher(page, "return /\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B/i.test(text);");
    });
    await waitForBodyAny(page, ["\u041A\u0430\u0442\u0430\u043B\u043E\u0433"], 15e3);
  }
}
async function loginDirector(page, user) {
  const session = await signInSession(user.email, user.password);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session)
    }
  );
  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle", timeout: 6e4 });
  await waitForBodyAny(page, ["\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C", "\u0417\u0430\u044F\u0432\u043A\u0438"], 45e3);
}
async function ensureMaterialsTab(page) {
  const currentBody = await bodyText(page);
  if (currentBody.includes("\u041A\u0430\u0442\u0430\u043B\u043E\u0433")) return;
  await clickAnyText(page, ["\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B"]).catch(async () => {
    await clickVisibleMatcher(page, "return /\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B/i.test(text);");
  });
  await waitForBodyAny(page, ["\u041A\u0430\u0442\u0430\u043B\u043E\u0433", "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A"], 15e3);
}
async function ensureForemanContext(page) {
  const visibleInputs = await getVisibleInputs(page);
  if (visibleInputs.length) {
    await page.locator("input").last().fill("Foreman Wave1");
    await clickAnyText(page, ["\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"]);
    await sleep(800);
  }
  const body = await bodyText(page);
  if (!body.includes("\u0410\u043D\u0433\u0430\u0440")) {
    await clickAnyText(page, ["\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442..."]);
    await sleep(500);
    await clickAnyText(page, ["\u0410\u043D\u0433\u0430\u0440"]);
    await sleep(700);
  }
  const afterObjectBody = await bodyText(page);
  if (!afterObjectBody.includes("\u041C\u0435\u0437\u043E\u043D\u0438\u043D")) {
    await clickAnyText(page, ["\u0412\u0435\u0441\u044C \u043A\u043E\u0440\u043F\u0443\u0441"], { last: true }).catch(async () => {
      await clickAnyText(page, ["\u0412\u0435\u0441\u044C \u043A\u043E\u0440\u043F\u0443\u0441"]);
    });
    await sleep(500);
    await clickAnyText(page, ["\u041C\u0435\u0437\u043E\u043D\u0438\u043D"]);
    await sleep(700);
  }
}
async function openDraftModal(page) {
  await confirmFioIfNeeded(page).catch(() => {
  });
  await clickAnyText(page, ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F"], { last: true }).catch(async () => {
    await clickAnyText(page, ["\u041F\u043E\u0437\u0438\u0446\u0438\u0438"]);
  });
  await waitForAria(page, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A");
}
async function closeDraftModal(page) {
  await confirmFioIfNeeded(page).catch(() => {
  });
  if (await hasVisibleAria(page, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A")) {
    await clickByAria(page, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A");
    await sleep(600);
  }
}
async function runCatalogAdd(page, searchTerm, qtyValue) {
  await confirmFioIfNeeded(page).catch(() => {
  });
  await closeDraftModal(page);
  await clickAnyText(page, ["\u041A\u0430\u0442\u0430\u043B\u043E\u0433"]);
  await confirmFioIfNeeded(page).catch(() => {
  });
  await setInputByPlaceholderAny(page, ["\u0427\u0442\u043E \u0438\u0449\u0435\u043C?"], searchTerm);
  await sleep(1200);
  let qtyInputIndex = -1;
  await poll(
    `catalog_qty_input:${searchTerm}`,
    async () => {
      const inputs = await getVisibleInputs(page);
      qtyInputIndex = inputs.findIndex((input) => input.placeholder === "0");
      return qtyInputIndex >= 0 ? true : null;
    },
    15e3,
    300
  );
  await setVisibleInputByIndex(page, qtyInputIndex, qtyValue);
  await sleep(250);
  await page.evaluate(() => {
    const addButton = Array.from(document.querySelectorAll("button")).find(
      (element) => !(element.getAttribute("aria-label") || "") && !(element.textContent || "").trim()
    );
    addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  });
  await sleep(1200);
}
async function sendCurrentDraft(page) {
  if (await hasVisibleAria(page, "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C")) {
    await clickByAria(page, "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C");
  } else {
    await clickAnyText(page, ["\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C"]);
  }
  await poll(
    "fio confirm or submit settle",
    async () => {
      const body = await bodyText(page);
      if (body.includes("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0424\u0418\u041E")) {
        await clickAnyText(page, ["\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C"]);
        return null;
      }
      return body.includes("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0424\u0418\u041E") ? null : true;
    },
    12e3,
    500
  );
  await sleep(2e3);
}
function createPageRuntimeCapture() {
  return {
    consoleMessages: [],
    pageErrors: [],
    httpErrors: []
  };
}
function attachPageRuntime(page, capture) {
  page.on("console", (message) => capture.consoleMessages.push(message.text()));
  page.on("pageerror", (error) => capture.pageErrors.push(String(error?.message || error)));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      capture.httpErrors.push({ status: response.status(), url: response.url() });
    }
  });
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });
}
const STALE_NEEDLES = [
  "Local draft stale",
  "Use server",
  "Clear failed",
  "Discard local",
  "\u0415\u0441\u0442\u044C \u043D\u0435\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F"
];
async function createAndSubmitDraft(page, user, searchTerm, qtyValue) {
  await runCatalogAdd(page, searchTerm, qtyValue);
  const draft = await poll(
    `draft_created:${searchTerm}`,
    async () => {
      const latest = await latestRequestByUser(user.id);
      if (!latest?.id || latest.submitted_at) return null;
      return await requestItemsCount(latest.id) > 0 ? latest : null;
    },
    25e3,
    500
  );
  await openDraftModal(page);
  const beforeSubmitBody = await bodyText(page);
  const beforeSubmitStorage = await waitForStorage(
    page,
    `storage_before_submit:${draft.id}`,
    (state) => (state.durable?.snapshotItemCount ?? 0) > 0,
    15e3
  );
  await sendCurrentDraft(page);
  const submitted = await poll(
    `submitted_request:${draft.id}`,
    async () => {
      const current = await findRequestById(draft.id);
      return current?.submitted_at ? current : null;
    },
    25e3,
    500
  );
  const afterSubmitStorage = await waitForStorage(
    page,
    `storage_cleared:${draft.id}`,
    (state) => isCleanPostSubmitStorageState(state),
    2e4
  );
  return {
    initialDraft: draft,
    beforeSubmitBody,
    beforeSubmitStorage,
    submitted,
    afterSubmitStorage,
    requestItems: await requestItemsDebug(draft.id)
  };
}
async function verifyCleanStateAfterSubmit(page, submission, screenshotPath, runtime) {
  const submittedDisplayNo = String(submission.submitted.display_no ?? "").trim();
  await waitForBodyExcludes(page, [...STALE_NEEDLES, submittedDisplayNo].filter(Boolean), 2e4);
  await openDraftModal(page);
  const cleanModalBody = await bodyText(page);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const storageAfter = await readDraftStorageState(page);
  const observabilityHit = runtime.consoleMessages.some((line) => line.includes("[foreman.post-submit]"));
  return {
    passed: !submittedDisplayNo || !cleanModalBody.includes(submittedDisplayNo) && cleanModalBody.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B") && STALE_NEEDLES.every((needle) => !cleanModalBody.includes(needle)) && isCleanPostSubmitStorageState(storageAfter) && observabilityHit,
    submittedRequestId: submission.submitted.id,
    submittedDisplayNo,
    cleanModalHasNoItems: cleanModalBody.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B"),
    staleNeedlesAbsent: STALE_NEEDLES.every((needle) => !cleanModalBody.includes(needle)),
    submittedDisplayHidden: submittedDisplayNo ? !cleanModalBody.includes(submittedDisplayNo) : true,
    storageAfter,
    observabilityHit,
    requestItems: submission.requestItems,
    cleanModalBody: capText(cleanModalBody)
  };
}
async function runNoDuplicateResurrectionScenario(page, user, previousRequestId, previousDisplayNo, searchTerm, qtyValue) {
  await closeDraftModal(page);
  const cleanStorageBefore = await readDraftStorageState(page);
  await runCatalogAdd(page, searchTerm, qtyValue);
  const newDraft = await poll(
    `new_draft_after_submit:${searchTerm}`,
    async () => {
      const latest = await latestRequestByUser(user.id);
      if (!latest?.id || latest.id === previousRequestId || latest.submitted_at) return null;
      return await requestItemsCount(latest.id) > 0 ? latest : null;
    },
    25e3,
    500
  );
  const storageAfter = await waitForStorage(
    page,
    `storage_new_draft:${newDraft.id}`,
    (state) => state.draftRequestId === newDraft.id && (state.durable?.snapshotItemCount ?? 0) > 0 && (state.durable?.snapshotRequestId == null || state.durable.snapshotRequestId === newDraft.id),
    2e4
  );
  await openDraftModal(page);
  const draftBody = await bodyText(page);
  const previousDisplayHidden = previousDisplayNo ? !draftBody.includes(previousDisplayNo) : true;
  return {
    passed: isCleanPostSubmitStorageState(cleanStorageBefore) && newDraft.id !== previousRequestId && previousDisplayHidden && !draftBody.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B") && STALE_NEEDLES.every((needle) => !draftBody.includes(needle)),
    previousRequestId,
    newDraftRequestId: newDraft.id,
    previousDisplayNo,
    newDraftDisplayNo: newDraft.display_no ?? null,
    cleanStorageBefore,
    storageAfter,
    previousDisplayHidden,
    staleNeedlesAbsent: STALE_NEEDLES.every((needle) => !draftBody.includes(needle)),
    draftBody: capText(draftBody)
  };
}
async function runHistoryReopenScenario(page, submission) {
  const displayNo = String(submission.submitted.display_no ?? "").trim();
  if (!displayNo) {
    throw new Error("Submitted display number is empty");
  }
  await closeDraftModal(page);
  await clickAnyText(page, ["\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u044F\u0432\u043E\u043A", "\u0417\u0430\u044F\u0432\u043A\u0438"]);
  await waitForBodyAny(page, ["\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u044F\u0432\u043E\u043A"], 12e3);
  const historyListBody = await waitForBodyAny(page, [displayNo], 2e4);
  await page.getByText(displayNo, { exact: false }).last().click({ force: true });
  await waitForAria(page, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A", 12e3);
  const openedBody = await poll(
    `history_request_loaded:${displayNo}`,
    async () => {
      const body = await bodyText(page);
      return body.includes(displayNo) && !body.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B") ? body : null;
    },
    2e4,
    500
  ).catch(async () => await bodyText(page));
  return {
    passed: historyListBody.includes(displayNo) && openedBody.includes(displayNo) && !openedBody.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B"),
    submittedRequestId: submission.submitted.id,
    displayNo,
    historyListVisible: historyListBody.includes(displayNo),
    openedBody: capText(openedBody)
  };
}
async function runFailedSubmitPreserveLocalScenario(page, user) {
  let submitAbortCount = 0;
  const routeMatcher = "**/rest/v1/rpc/request_sync_draft_v2";
  const routeHandler = async (route) => {
    const request = route.request();
    const body = request.postData() || "";
    if (/"p_submit"\s*:\s*true/u.test(body)) {
      submitAbortCount += 1;
      await route.abort("failed");
      return;
    }
    await route.continue();
  };
  await page.route(routeMatcher, routeHandler);
  try {
    await runCatalogAdd(page, "BRICK", "4");
    const draft = await poll(
      "failed_submit_draft_created",
      async () => {
        const latest = await latestRequestByUser(user.id);
        if (!latest?.id || latest.submitted_at) return null;
        return await requestItemsCount(latest.id) > 0 ? latest : null;
      },
      25e3,
      500
    );
    await openDraftModal(page);
    const beforeFailureStorage = await waitForStorage(
      page,
      `storage_before_failed_submit:${draft.id}`,
      (state) => (state.durable?.snapshotItemCount ?? 0) > 0,
      15e3
    );
    await sendCurrentDraft(page);
    await poll("submit_abort_observed", () => submitAbortCount > 0 ? true : null, 1e4, 200);
    const failedStorage = await waitForStorage(
      page,
      `storage_after_failed_submit:${draft.id}`,
      (state) => state.draftRequestId === draft.id && (state.durable?.snapshotItemCount ?? 0) > 0 && state.durable?.syncStatus !== "idle",
      2e4
    );
    const bodyAfterFailure = await poll(
      "failed_submit_banner",
      async () => {
        const body = await bodyText(page);
        return body.includes("\u0415\u0441\u0442\u044C \u043D\u0435\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F") || body.includes("Retry now") ? body : null;
      },
      15e3,
      500
    ).catch(async () => await bodyText(page)) || "";
    const requestAfterFailure = await findRequestById(draft.id);
    await page.reload({ waitUntil: "networkidle" });
    await waitForBodyAny(page, ["\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B", "\u041A\u0430\u0442\u0430\u043B\u043E\u0433", "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A"], 45e3);
    await confirmFioIfNeeded(page).catch(() => {
    });
    await ensureMaterialsTab(page);
    const reloadedStorage = await waitForStorage(
      page,
      `storage_reload_failed_submit:${draft.id}`,
      (state) => state.draftRequestId === draft.id && (state.durable?.snapshotItemCount ?? 0) > 0,
      2e4
    );
    await openDraftModal(page);
    const reloadedBody = await bodyText(page);
    await page.screenshot({ path: webFailurePng, fullPage: true });
    return {
      passed: submitAbortCount > 0 && requestAfterFailure?.submitted_at == null && (failedStorage.durable?.snapshotItemCount ?? 0) > 0 && (reloadedStorage.durable?.snapshotItemCount ?? 0) > 0 && !reloadedBody.includes("\u041F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B"),
      draftRequestId: draft.id,
      submitAbortCount,
      beforeFailureStorage,
      failedStorage,
      reloadedStorage,
      requestAfterFailure,
      unsyncedIndicatorVisible: bodyAfterFailure.includes("\u0415\u0441\u0442\u044C \u043D\u0435\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F") || bodyAfterFailure.includes("Retry now"),
      reloadedBody: capText(reloadedBody),
      bodyAfterFailure: capText(bodyAfterFailure)
    };
  } finally {
    await page.unroute(routeMatcher, routeHandler).catch(() => {
    });
  }
}
async function runWebProof() {
  let browser = null;
  let successUser = null;
  let historyUser = null;
  let failureUser = null;
  let directorUser = null;
  const runtime = {
    successForeman: createPageRuntimeCapture(),
    historyForeman: createPageRuntimeCapture(),
    failureForeman: createPageRuntimeCapture(),
    director: createPageRuntimeCapture()
  };
  try {
    await ensureBaseUrlReady();
    successUser = await createTempUser("foreman", "Foreman Post Submit Success");
    historyUser = await createTempUser("foreman", "Foreman Post Submit History");
    failureUser = await createTempUser("foreman", "Foreman Post Submit Failure");
    directorUser = await createTempUser("director", "Foreman Post Submit Director Handoff");
    browser = await chromium.launch({ headless: true });
    const successContext = await browser.newContext();
    const historyContext = await browser.newContext();
    const failureContext = await browser.newContext();
    const directorContext = await browser.newContext();
    const successPage = await successContext.newPage();
    const historyPage = await historyContext.newPage();
    const failurePage = await failureContext.newPage();
    const directorPage = await directorContext.newPage();
    attachPageRuntime(successPage, runtime.successForeman);
    attachPageRuntime(historyPage, runtime.historyForeman);
    attachPageRuntime(failurePage, runtime.failureForeman);
    attachPageRuntime(directorPage, runtime.director);
    const runScenario = async (page, fn) => {
      try {
        return await fn();
      } catch (error) {
        let body = "";
        try {
          body = capText(await bodyText(page));
        } catch {
        }
        return {
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          body
        };
      }
    };
    await loginForeman(successPage, successUser);
    await loginDirector(directorPage, directorUser);
    await ensureForemanContext(successPage);
    await closeDraftModal(successPage);
    let successSubmission = null;
    const successCleanState = await runScenario(successPage, async () => {
      successSubmission = await createAndSubmitDraft(successPage, successUser, "BOLT", "2");
      return await verifyCleanStateAfterSubmit(
        successPage,
        successSubmission,
        webSuccessPng,
        runtime.successForeman
      );
    });
    const noDuplicateResurrection = successSubmission != null ? await runScenario(successPage, async () => {
      return await runNoDuplicateResurrectionScenario(
        successPage,
        successUser,
        successSubmission.submitted.id,
        successSubmission.submitted.display_no ?? null,
        "BETON",
        "1"
      );
    }) : { passed: false, error: "success submission unavailable", body: "" };
    const directorHandoff = successSubmission != null ? await runScenario(directorPage, async () => {
      const submittedDisplayNo = String(successSubmission.submitted.display_no ?? "").trim();
      const directorBody = await poll(
        `director_handoff:${submittedDisplayNo}`,
        async () => {
          const body = await bodyText(directorPage);
          return body.includes(submittedDisplayNo) ? body : null;
        },
        3e4,
        500
      );
      return {
        passed: directorBody.includes(submittedDisplayNo),
        submittedDisplayNo,
        body: capText(directorBody)
      };
    }) : { passed: false, error: "success submission unavailable", body: "" };
    await loginForeman(historyPage, historyUser);
    await ensureForemanContext(historyPage);
    await closeDraftModal(historyPage);
    const historyIntact = await runScenario(historyPage, async () => {
      const historySubmission = await createAndSubmitDraft(historyPage, historyUser, "BRICK", "2");
      return await runHistoryReopenScenario(historyPage, historySubmission);
    });
    await loginForeman(failurePage, failureUser);
    await ensureForemanContext(failurePage);
    await closeDraftModal(failurePage);
    const failedSubmitPreservesLocal = await runScenario(failurePage, async () => {
      return await runFailedSubmitPreserveLocalScenario(failurePage, failureUser);
    });
    const pageErrorsEmpty = runtime.successForeman.pageErrors.length === 0 && runtime.historyForeman.pageErrors.length === 0 && runtime.failureForeman.pageErrors.length === 0 && runtime.director.pageErrors.length === 0;
    const httpErrorsEmpty = runtime.successForeman.httpErrors.length === 0 && runtime.historyForeman.httpErrors.length === 0 && runtime.failureForeman.httpErrors.length === 0 && runtime.director.httpErrors.length === 0;
    const passed = successCleanState.passed && failedSubmitPreservesLocal.passed && historyIntact.passed && directorHandoff.passed && noDuplicateResurrection.passed && pageErrorsEmpty && httpErrorsEmpty;
    return {
      status: passed ? "passed" : "failed",
      scenarios: {
        submitSuccessCleanState: successCleanState,
        failedSubmitPreservesLocal,
        historyIntact,
        directorHandoff,
        noDuplicateResurrection
      },
      runtime: {
        successForeman: runtime.successForeman,
        historyForeman: runtime.historyForeman,
        failureForeman: runtime.failureForeman,
        director: runtime.director,
        pageErrorsEmpty,
        httpErrorsEmpty
      },
      artifacts: {
        webSuccessPng: path.relative(projectRoot, webSuccessPng).replace(/\\/g, "/"),
        webFailurePng: path.relative(projectRoot, webFailurePng).replace(/\\/g, "/")
      }
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {
      });
    }
    await cleanupTempUser(directorUser);
    await cleanupTempUser(failureUser);
    await cleanupTempUser(historyUser);
    await cleanupTempUser(successUser);
  }
}
function readJsonFile(fullPath) {
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch {
    return null;
  }
}
async function runAndroidRuntimeSupport() {
  const supportSummaryPath = path.join(projectRoot, "artifacts/foreman-request-sync-runtime.summary.json");
  const supportPayloadPath = path.join(projectRoot, "artifacts/foreman-request-sync-runtime.json");
  let lastResult = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const commandResult = runNodeCommand(["tsx", "scripts/foreman_request_sync_runtime_verify.ts"], 12e5);
    const summary = readJsonFile(supportSummaryPath);
    const androidPassed = summary?.androidPassed === true;
    const iosResidual = summary?.iosResidual ?? null;
    lastResult = {
      status: androidPassed ? "passed" : "failed",
      source: "scripts/foreman_request_sync_runtime_verify.ts",
      commandPassed: commandResult.passed,
      commandStatus: commandResult.status,
      stdout: capText(commandResult.stdout),
      stderr: capText(commandResult.stderr),
      androidPassed,
      webDirectorHandoffPassed: summary?.scenariosPassed?.web?.directorHandoff === true,
      iosPassed: summary?.iosPassed === true,
      iosResidual,
      artifacts: {
        supportSummary: path.relative(projectRoot, supportSummaryPath).replace(/\\/g, "/"),
        supportPayload: path.relative(projectRoot, supportPayloadPath).replace(/\\/g, "/"),
        android: summary?.artifacts?.android ?? null
      },
      platformSpecificIssues: summary?.platformSpecificIssues ?? [],
      attempts: attempt
    };
    if (androidPassed) {
      return lastResult;
    }
    if (attempt < 3) {
      await sleep(2e3);
    }
  }
  if (!lastResult) {
    throw new Error("Android runtime support did not produce a result");
  }
  return lastResult;
}
async function run() {
  const skipWeb = process.env.FOREMAN_POST_SUBMIT_SKIP_WEB === "1";
  const skipAndroid = process.env.FOREMAN_POST_SUBMIT_SKIP_ANDROID === "1";
  let web = skipWeb ? {
    status: "skipped",
    error: "skipped by FOREMAN_POST_SUBMIT_SKIP_WEB"
  } : await runWebProof().catch((error) => {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  });
  let androidSupport = skipAndroid ? {
    status: "skipped",
    error: "skipped by FOREMAN_POST_SUBMIT_SKIP_ANDROID",
    androidPassed: false,
    webDirectorHandoffPassed: false,
    iosPassed: false,
    iosResidual: null,
    artifacts: {
      supportSummary: null,
      supportPayload: null,
      android: null
    },
    platformSpecificIssues: []
  } : await runAndroidRuntimeSupport().catch((error) => {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      androidPassed: false,
      webDirectorHandoffPassed: false,
      iosPassed: false,
      iosResidual: null,
      artifacts: {
        supportSummary: null,
        supportPayload: null,
        android: null
      },
      platformSpecificIssues: []
    };
  });
  const iosResidual = androidSupport.iosResidual || (process.platform === "win32" ? "xcrun is unavailable on Windows host; iOS simulator cannot be started here" : null);
  const fullPayload = {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    batch: "foreman_post_submit_draft_rollover_wave1",
    postSubmitRule: "entered_empty_state",
    web,
    android: androidSupport,
    directorHandoffSupport: {
      passed: androidSupport.webDirectorHandoffPassed === true
    },
    ios: {
      status: androidSupport.iosPassed ? "passed" : iosResidual ? "residual" : "not_run",
      residual: iosResidual
    }
  };
  const summaryPayload = {
    status: web.status === "passed" && androidSupport.androidPassed && androidSupport.webDirectorHandoffPassed ? "passed" : "failed",
    webPassed: web.status === "passed",
    androidPassed: androidSupport.androidPassed,
    iosPassed: androidSupport.iosPassed,
    iosResidual,
    proofPassed: web.status === "passed" && androidSupport.androidPassed && androidSupport.webDirectorHandoffPassed,
    scenariosPassed: web.status === "passed" ? {
      submitSuccessCleanState: web.scenarios.submitSuccessCleanState.passed === true,
      failedSubmitPreservesLocal: web.scenarios.failedSubmitPreservesLocal.passed === true,
      historyIntact: web.scenarios.historyIntact.passed === true,
      noDuplicateResurrection: web.scenarios.noDuplicateResurrection.passed === true,
      directorHandoff: androidSupport.webDirectorHandoffPassed === true
    } : {
      submitSuccessCleanState: false,
      failedSubmitPreservesLocal: false,
      historyIntact: false,
      noDuplicateResurrection: false,
      directorHandoff: false
    },
    artifacts: {
      proof: path.relative(projectRoot, artifactOutPath).replace(/\\/g, "/"),
      summary: path.relative(projectRoot, summaryOutPath).replace(/\\/g, "/"),
      web: web.status === "passed" ? web.artifacts : {
        webSuccessPng: null,
        webFailurePng: null
      },
      android: androidSupport.artifacts
    }
  };
  writeJson(artifactOutPath, fullPayload);
  writeJson(summaryOutPath, summaryPayload);
  console.log(JSON.stringify(summaryPayload, null, 2));
  if (summaryPayload.status !== "passed") {
    process.exitCode = 1;
  }
}
void run();
