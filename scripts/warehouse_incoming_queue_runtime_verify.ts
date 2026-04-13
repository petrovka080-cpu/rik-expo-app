import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { createAndroidHarness } from "./_shared/androidHarness";
import { buildRuntimeSummary, createFailurePlatformResult } from "./_shared/runtimeSummary";

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
  global: { headers: { "x-client-info": "warehouse-incoming-queue-runtime-verify" } },
});

const artifactBase = "artifacts/warehouse-incoming-queue-runtime";
const webArtifactBase = "artifacts/warehouse-incoming-queue-web-smoke";
const cutoverArtifactPath = path.join(projectRoot, "artifacts/warehouse-incoming-queue-cutover-v1.json");
const androidDevClientPort = Number(process.env.WAREHOUSE_ANDROID_DEV_PORT ?? "8081");
const shouldRunWebRuntime = process.env.WAREHOUSE_RUNTIME_WEB === "1";
const webWarehouseRoute = "/office/warehouse";
const androidWarehouseRoute = "rik:///office/warehouse";

const LABELS = {
  tabs: ["К приходу", "Склад факт", "Расход", "Отчёты"],
  fioPlaceholder: "Фамилия Имя Отчество",
  modalTitle: "Позиции прихода",
  submitReceive: "Оприходовать",
  issueModalTitle: "Р’С‹РґР°С‡Р° РїРѕ Р·Р°СЏРІРєРµ",
};

const ANDROID_LABELS = {
  incomingTab: ["Рљ РїСЂРёС…РѕРґСѓ", "К приходу"],
  submitReceive: ["РћРїСЂРёС…РѕРґРѕРІР°С‚СЊ", "Оприходовать"],
};

const INCOMING_EMPTY_TEXT = "Нет записей в очереди склада.";
const ANDROID_INCOMING_EMPTY_LABELS = [INCOMING_EMPTY_TEXT, "Нет записей", "очереди склада"] as const;

const INCOMING_EMPTY_STATE_RE = /\u041d\u0435\u0442\s+\u0437\u0430\u043f\u0438\u0441\u0435\u0439\s+\u0432\s*\u043e\u0447\u0435\u0440\u0435\u0434\u0438\s+\u0441\u043a\u043b\u0430\u0434\u0430\./i;

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  companyId: string | null;
  companyOwnerId: string | null;
};

type AndroidNode = {
  resourceId: string;
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = (fullPath: string): Record<string, unknown> | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
};

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
});

const detectAndroidPackage = () => androidHarness.detectAndroidPackage();

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

async function attachRuntimeOfficeCompany(userId: string, role: string): Promise<{ companyId: string; companyOwnerId: string }> {
  const ownerEmail = `wi.owner.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const ownerResult = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Warehouse Runtime Company Owner" },
    app_metadata: { role: "director" },
  });
  if (ownerResult.error || !ownerResult.data.user) {
    throw ownerResult.error ?? new Error("Failed to create warehouse runtime company owner");
  }
  const ownerId = ownerResult.data.user.id;

  const ownerProfileResult = await admin
    .from("profiles")
    .upsert({ user_id: ownerId, role: "director", full_name: "Warehouse Runtime Company Owner" }, { onConflict: "user_id" });
  if (ownerProfileResult.error) throw ownerProfileResult.error;

  const ownerUserProfileResult = await admin
    .from("user_profiles")
    .upsert(
      { user_id: ownerId, full_name: "Warehouse Runtime Company Owner", usage_build: true },
      { onConflict: "user_id" },
    );
  if (ownerUserProfileResult.error) throw ownerUserProfileResult.error;

  const companyResult = await admin
    .from("companies")
    .insert({
      owner_user_id: ownerId,
      name: `Runtime Warehouse Company ${Date.now().toString(36).toUpperCase()}`,
    })
    .select("id")
    .single();
  if (companyResult.error || !companyResult.data) {
    throw companyResult.error ?? new Error("Failed to create warehouse runtime company");
  }

  const companyId = String(companyResult.data.id);
  const ownerMembershipResult = await admin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: ownerId,
      role: "director",
    },
    { onConflict: "company_id,user_id" },
  );
  if (ownerMembershipResult.error) throw ownerMembershipResult.error;

  const membershipResult = await admin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: userId,
      role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (membershipResult.error) throw membershipResult.error;

  return { companyId, companyOwnerId: ownerId };
}

async function createTempUser(role: string, fullName: string): Promise<TempUser> {
  const email = `wi${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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

  const company = await attachRuntimeOfficeCompany(user.id, role);
  return { id: user.id, email, password, role, companyId: company.companyId, companyOwnerId: company.companyOwnerId };
}

async function cleanupTempUser(user: TempUser | null) {
  if (!user) return;
  if (user.companyId) {
    try {
      await admin.from("company_members").delete().eq("company_id", user.companyId);
    } catch {}
    try {
      await admin.from("company_profiles").delete().eq("id", user.companyId);
    } catch {}
    try {
      await admin.from("companies").delete().eq("id", user.companyId);
    } catch {}
  }
  if (user.companyOwnerId) {
    try {
      await admin.from("user_profiles").delete().eq("user_id", user.companyOwnerId);
    } catch {}
    try {
      await admin.from("profiles").delete().eq("user_id", user.companyOwnerId);
    } catch {}
    try {
      await admin.auth.admin.deleteUser(user.companyOwnerId);
    } catch {}
  }
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

async function loadExpectedIncomingContext(): Promise<{ title: string | null; hasRows: boolean }> {
  const cutoverArtifact = readJson(cutoverArtifactPath);
  const rpc = cutoverArtifact?.rpc;
  const page0Rows =
    rpc && typeof rpc === "object" && Array.isArray((rpc as Record<string, unknown>).page0Rows)
      ? ((rpc as Record<string, unknown>).page0Rows as Record<string, unknown>[])
      : [];
  const firstArtifactRow = page0Rows[0] ?? null;
  if (firstArtifactRow) {
    const artifactPoNo = String(firstArtifactRow.po_no ?? "").trim();
    if (artifactPoNo) return { title: artifactPoNo, hasRows: true };
    const artifactPurchaseId = String(firstArtifactRow.purchase_id ?? "").trim();
    if (artifactPurchaseId) return { title: `PR-${artifactPurchaseId.slice(0, 8)}`, hasRows: true };
  }

  const { data, error } = await admin.rpc("warehouse_incoming_queue_scope_v1" as never, {
    p_offset: 0,
    p_limit: 30,
  } as never);
  if (error) throw error;

  const root = data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
  const rows = Array.isArray(root.rows) ? (root.rows as Record<string, unknown>[]) : [];
  const first = rows[0] ?? null;
  if (!first) return { title: null, hasRows: false };

  const poNo = String(first.po_no ?? "").trim();
  if (poNo) return { title: poNo, hasRows: true };

  const purchaseId = String(first.purchase_id ?? "").trim();
  return {
    title: purchaseId ? `PR-${purchaseId.slice(0, 8)}` : null,
    hasRows: true,
  };
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

async function bodyText(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function waitForBody(page: import("playwright").Page, needles: string | RegExp | (string | RegExp)[], timeoutMs = 30_000) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.map((item) => String(item)).join("|")}`,
    async () => {
      const body = await bodyText(page);
      return list.some((needle) => (typeof needle === "string" ? body.includes(needle) : needle.test(body))) ? body : null;
    },
    timeoutMs,
    250,
  );
}

async function loginWarehouse(page: import("playwright").Page, user: TempUser) {
  await page.goto(`${baseUrl}${webWarehouseRoute}`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
}

async function maybeConfirmFio(page: import("playwright").Page): Promise<boolean> {
  const fioInput = page.locator(`input[placeholder="${LABELS.fioPlaceholder}"]`).first();
  if ((await fioInput.count()) === 0) return false;
  await fioInput.fill("Warehouse Incoming Smoke");
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

async function clickIncomingTab(page: import("playwright").Page) {
  const incomingTab = page.getByText(/К приходу|Рљ РїСЂРёС…РѕРґСѓ/i).first();
  await incomingTab.click();
  await waitForBody(page, LABELS.tabs, 10_000).catch(() => null);
  await sleep(800);
}

async function runWebRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  let browser: import("playwright").Browser | null = null;

  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
    badResponses: [] as { url: string; status: number; method: string }[],
    screenshot: `${webArtifactBase}.png`,
  };

  try {
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Warehouse Incoming Smoke");
    const expected = await loadExpectedIncomingContext();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

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

    await loginWarehouse(page, user);
    await waitForBody(page, [...LABELS.tabs, "Пожалуйста", "Представьтесь"], 30_000);
    const fioConfirmed = await maybeConfirmFio(page);
    await waitForBody(page, LABELS.tabs, 30_000);

    await clickIncomingTab(page);
    const queueNeedle = expected.hasRows
      ? expected.title && expected.title.length > 0
        ? expected.title
        : /(PO|PR)-\d+\/\d{4}/
      : INCOMING_EMPTY_STATE_RE;
    const queueBody = await waitForBody(page, queueNeedle, 30_000);

    let modalBody = "";
    let modalOpened = false;
    if (expected.hasRows) {
      const firstRow = expected.title && expected.title.length > 0
        ? page.getByText(expected.title, { exact: false }).first()
        : page.getByText(/(PO|PR)-\d+\/\d{4}/).first();
      await firstRow.click();
      modalBody = await waitForBody(page, [LABELS.modalTitle, LABELS.submitReceive], 15_000);
      modalOpened = modalBody.includes(LABELS.modalTitle) || modalBody.includes(LABELS.submitReceive);
    }

    await page.screenshot({ path: runtime.screenshot, fullPage: true });
    const blockingConsoleErrors = runtime.console.filter(isBlockingWebConsoleError);
    const platformSpecificIssues = blockingConsoleErrors.map((entry) => entry.text);
    const incomingRowsVisible = expected.hasRows
      ? (typeof queueNeedle === "string" ? queueBody.includes(queueNeedle) : queueNeedle.test(queueBody))
      : false;
    const emptyStateVisible = !expected.hasRows && INCOMING_EMPTY_STATE_RE.test(queueBody);

    const result = {
      status:
        fioConfirmed &&
        (incomingRowsVisible || emptyStateVisible) &&
        (!expected.hasRows || modalOpened) &&
        blockingConsoleErrors.length === 0 &&
        runtime.pageErrors.length === 0 &&
        runtime.badResponses.length === 0
          ? "passed"
          : "failed",
      fioConfirmed,
      expectedTitle: expected.title,
      expectedHasRows: expected.hasRows,
      incomingRowsVisible,
      emptyStateVisible,
      modalOpened,
      consoleErrorsEmpty: blockingConsoleErrors.length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.length === 0,
      screenshot: runtime.screenshot,
      platformSpecificIssues,
    };

    writeArtifact(`${webArtifactBase}.json`, runtime);
    writeArtifact(`${webArtifactBase}.summary.json`, result);
    return { ...result, runtime };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupTempUser(user);
  }
}

const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: encoding === "buffer" ? undefined : encoding,
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "")}`.trim());
  }
  return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
};

const xcrunAvailable = (): boolean => {
  const result = spawnSync("xcrun", ["--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.status === 0;
};

const parseAndroidNodes = (xml: string): AndroidNode[] => {
  const nodes: AndroidNode[] = [];
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return attrMatch?.[1] ?? "";
    };
    nodes.push({
      resourceId: pick("resource-id"),
      text: pick("text"),
      contentDesc: pick("content-desc"),
      className: pick("class"),
      clickable: pick("clickable") === "true",
      enabled: pick("enabled") === "true",
      bounds: pick("bounds"),
      hint: pick("hint"),
    });
  }
  return nodes;
};

const parseBoundsCenter = (bounds: string): { x: number; y: number } | null => {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
};

const escapeAndroidInputText = (value: string) =>
  String(value ?? "").replace(/ /g, "%s");

async function typeAsciiLowercaseByKeyEvents(value: string) {
  const keyCodes: Record<string, number> = {
    a: 29,
    b: 30,
    c: 31,
    d: 32,
    e: 33,
    f: 34,
    g: 35,
    h: 36,
    i: 37,
    j: 38,
    k: 39,
    l: 40,
    m: 41,
    n: 42,
    o: 43,
    p: 44,
    q: 45,
    r: 46,
    s: 47,
    t: 48,
    u: 49,
    v: 50,
    w: 51,
    x: 52,
    y: 53,
    z: 54,
  };
  for (const char of value.toLowerCase()) {
    const code = keyCodes[char];
    if (!code) continue;
    execFileSync("adb", ["shell", "input", "keyevent", String(code)], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    await sleep(100);
  }
}

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidFioInputNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /Фамилия Имя Отчество|Р¤Р°РјРёР»РёСЏ РРјСЏ РћС‚С‡РµСЃС‚РІРѕ/i.test(`${node.text} ${node.hint}`),
  );

const findAndroidFioActionNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(nodes, (node) => node.clickable && node.enabled && node.contentDesc === "warehouse-fio-confirm") ??
  findAndroidNode(
    nodes,
    (node) => node.clickable && /Сохранить|Подтвердить/i.test(`${node.text} ${node.contentDesc}`),
  );

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Р’РѕР№С‚Рё|Войти|Login/i.test(xml);

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const isAndroidIncomingSurface = (xml: string) => /PR-\d+\/\d{4}/.test(xml);
const isAndroidIncomingEmptyState = (xml: string) =>
  INCOMING_EMPTY_STATE_RE.test(xml) ||
  matchesAndroidLabel(xml, ANDROID_INCOMING_EMPTY_LABELS) ||
  (xml.includes('resource-id="warehouse-tab-incoming"') &&
    xml.includes('resource-id="warehouse-tab-stock"') &&
    /\(0\)/.test(xml) &&
    !isAndroidIncomingSurface(xml));
const isAndroidIncomingHome = (xml: string) => isAndroidIncomingSurface(xml) || isAndroidIncomingEmptyState(xml);
const isAndroidOfficeHub = (xml: string) =>
  xml.includes('resource-id="office-direction-open-warehouse"') ||
  xml.includes('resource-id="office-card-warehouse"') ||
  (xml.includes('text="Office"') && xml.includes("office-summary"));
const isAndroidOfficeLoading = (xml: string) =>
  xml.includes('text="Office"') &&
  (xml.includes("android.widget.ProgressBar") || xml.includes("Office...") || xml.includes("Office flow"));

const isAndroidFioModal = (xml: string) =>
  /Фамилия Имя Отчество|Р¤Р°РјРёР»РёСЏ РРјСЏ РћС‚С‡РµСЃС‚РІРѕ/i.test(xml) && /Сохранить|Подтвердить/i.test(xml);

const isAndroidIncomingModal = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.submitReceive) || (xml.includes("android.widget.EditText") && /PR-\d+\/\d{4}/.test(xml));

function seedAndroidWarehouseFioStorage(packageName: string | null): Record<string, unknown> {
  const targetPackage = packageName || "com.azisbek_dzhantaev.rikexpoapp";
  const script = String.raw`
import datetime
import json
import pathlib
import sqlite3
import subprocess
import sys
import time

package_name = sys.argv[1]
project_root = pathlib.Path(sys.argv[2])
out_path = project_root / "artifacts" / "RKStorage.warehouse-fio-runtime.sqlite"
out_path.parent.mkdir(parents=True, exist_ok=True)

current_db = subprocess.run(
    ["adb", "exec-out", "run-as", package_name, "cat", "databases/RKStorage"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
if current_db.returncode == 0 and current_db.stdout.startswith(b"SQLite format 3"):
    out_path.write_bytes(current_db.stdout)
elif out_path.exists():
    out_path.unlink()

con = sqlite3.connect(str(out_path))
con.execute("CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT)")
con.execute("CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
now_ms = int(time.time() * 1000)
confirm_iso = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

def envelope(value, ttl_ms):
    return json.dumps(
        {
            "__rikPersisted": True,
            "value": value,
            "updatedAt": now_ms,
            "expiresAt": now_ms + ttl_ms,
        },
        separators=(",", ":"),
    )

con.execute(
    "INSERT OR REPLACE INTO catalystLocalStorage(key,value) VALUES(?,?)",
    ("wh_warehouseman_confirm_ts", envelope(confirm_iso, 14 * 24 * 60 * 60 * 1000)),
)
con.execute(
    "INSERT OR REPLACE INTO catalystLocalStorage(key,value) VALUES(?,?)",
    ("wh_warehouseman_history_v1", envelope(["Warehouse Runtime Android"], 30 * 24 * 60 * 60 * 1000)),
)
con.commit()
con.close()

subprocess.run(["adb", "push", str(out_path), "/data/local/tmp/RKStorage.warehouse-fio-runtime"], check=True)
subprocess.run(["adb", "shell", "run-as", package_name, "mkdir", "-p", "databases"], check=True)
subprocess.run(
    ["adb", "shell", "run-as", package_name, "cp", "/data/local/tmp/RKStorage.warehouse-fio-runtime", "databases/RKStorage"],
    check=True,
)
subprocess.run(["adb", "shell", "run-as", package_name, "chmod", "600", "databases/RKStorage"], check=True)
print(json.dumps({"path": str(out_path), "confirmIso": confirm_iso}))
`;
  const result = spawnSync("python", ["-c", script, targetPackage, projectRoot], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(
      [
        "Failed to seed Android warehouse FIO storage",
        String(result.stdout ?? "").trim(),
        String(result.stderr ?? "").trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const raw = String(result.stdout ?? "").trim();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

const dumpAndroidScreen = (name: string) => {
  const xmlDevicePath = `/sdcard/${name}.xml`;
  const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
  const pngDevicePath = `/sdcard/${name}.png`;
  const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
  execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
  execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  try {
    const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
    fs.writeFileSync(pngArtifactPath, screenshot);
  } catch {
    try {
      execFileSync("adb", ["shell", "screencap", "-p", pngDevicePath], { cwd: projectRoot, stdio: "pipe" });
      execFileSync("adb", ["pull", pngDevicePath, pngArtifactPath], { cwd: projectRoot, stdio: "pipe" });
    } catch {
      fs.writeFileSync(pngArtifactPath, "");
    }
  }
  return {
    xmlPath: `artifacts/${name}.xml`,
    pngPath: `artifacts/${name}.png`,
    xml: fs.readFileSync(xmlArtifactPath, "utf8"),
  };
};

const findAndroidTopTab = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null => {
  for (const node of nodes) {
    const label = `${node.contentDesc} ${node.text}`.trim();
    if (!node.clickable || !node.enabled || !label || !matchesAndroidLabel(label, labels)) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    if (top >= 200 && bottom <= 420) return node;
  }
  return null;
};

const findAndroidOfficeWarehouseNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) => node.clickable && node.enabled && node.resourceId === "office-direction-open-warehouse",
  ) ??
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      node.resourceId === "office-card-warehouse" &&
      /warehouse|Склад|РЎРєР»Р°Рґ/i.test(`${node.contentDesc} ${node.text}`),
  );

async function openAndroidWarehouseFromOffice(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidIncomingHome(screen.xml) || isAndroidFioModal(screen.xml) || isAndroidIncomingModal(screen.xml)) {
    return { screen, openedFromOffice: false, issue: null as string | null };
  }
  if (!isAndroidOfficeHub(screen.xml) && !isAndroidOfficeLoading(screen.xml)) {
    return { screen, openedFromOffice: false, issue: null as string | null };
  }

  screen = await poll(
    "android:office_warehouse_direction_ready",
    async () => {
      const next = dumpAndroidScreen("android-warehouse-incoming-queue-office-ready");
      if (isAndroidIncomingHome(next.xml) || isAndroidFioModal(next.xml) || isAndroidIncomingModal(next.xml)) {
        return next;
      }
      return isAndroidOfficeHub(next.xml) ? next : null;
    },
    45_000,
    1_500,
  ).catch(() => dumpAndroidScreen("android-warehouse-incoming-queue-office-ready-timeout"));

  if (isAndroidIncomingHome(screen.xml) || isAndroidFioModal(screen.xml) || isAndroidIncomingModal(screen.xml)) {
    return { screen, openedFromOffice: true, issue: null as string | null };
  }

  const warehouseNode = findAndroidOfficeWarehouseNode(parseAndroidNodes(screen.xml));
  if (!warehouseNode) {
    return {
      screen,
      openedFromOffice: false,
      issue: "Office warehouse direction control was not found before Android warehouse proof",
    };
  }

  tapAndroidBounds(warehouseNode.bounds);
  screen = await poll(
    "android:office_warehouse_direction_opened",
    async () => {
      await sleep(1_000);
      const next = dumpAndroidScreen("android-warehouse-incoming-queue-office-warehouse-opened");
      return isAndroidIncomingHome(next.xml) || isAndroidFioModal(next.xml) || isAndroidIncomingModal(next.xml)
        ? next
        : null;
    },
    45_000,
    1_500,
  ).catch(() => dumpAndroidScreen("android-warehouse-incoming-queue-office-warehouse-timeout"));

  const opened =
    isAndroidIncomingHome(screen.xml) || isAndroidFioModal(screen.xml) || isAndroidIncomingModal(screen.xml);
  return {
    screen,
    openedFromOffice: opened,
    issue: opened ? null : "Warehouse direction did not open after tapping Office warehouse card",
  };
}

async function ensureAndroidIncomingTab(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidIncomingHome(screen.xml)) {
    return { screen, switched: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let nodes = parseAndroidNodes(screen.xml);
    let tab =
      findAndroidNode(
        nodes,
        (node) => node.clickable && node.enabled && node.resourceId === "warehouse-tab-incoming",
      ) ?? findAndroidTopTab(nodes, ANDROID_LABELS.incomingTab);
    if (!tab) {
      if (attempt === 0) {
        execFileSync("adb", ["shell", "input", "keyevent", "4"], {
          cwd: projectRoot,
          stdio: "pipe",
        });
        await sleep(1000);
        screen = dumpAndroidScreen("android-warehouse-incoming-queue-current");
        if (isAndroidIncomingHome(screen.xml)) {
          return { screen, switched: true, issue: null as string | null };
        }
        nodes = parseAndroidNodes(screen.xml);
        tab =
          findAndroidNode(
            nodes,
            (node) => node.clickable && node.enabled && node.resourceId === "warehouse-tab-incoming",
          ) ?? findAndroidTopTab(nodes, ANDROID_LABELS.incomingTab);
      }
    }

    if (!tab) {
      return {
        screen,
        switched: false,
        issue: "Incoming tab control was not found on Android warehouse screen",
      };
    }

    tapAndroidBounds(tab.bounds);
    await sleep(1200);

    try {
      screen = await poll(
        `android:warehouse_incoming_tab:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`android-warehouse-incoming-queue-tab-${attempt + 1}`);
          return isAndroidIncomingHome(next.xml) ? next : null;
        },
        15_000,
        1000,
      );
    } catch {
      screen = dumpAndroidScreen(`android-warehouse-incoming-queue-tab-${attempt + 1}-timeout`);
    }

    if (isAndroidIncomingHome(screen.xml)) {
      return { screen, switched: true, issue: null as string | null };
    }
  }

  return {
    screen,
    switched: false,
    issue: "Incoming tab did not open after tapping the Android warehouse tab strip",
  };
}

async function loginWarehouseAndroid(user: TempUser) {
  writeArtifact("artifacts/android-warehouse-incoming-queue-user.json", {
    ...user,
    email: "[redacted-temp-user]",
    password: "[redacted]",
  });
  const packageName = detectAndroidPackage();
  try {
    const harnessScreen = await androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: androidWarehouseRoute,
      artifactBase: "android-warehouse-incoming-queue",
      successPredicate: (xml) => isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
      renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
    });
    if (!isAndroidLoginScreen(harnessScreen.xml)) {
      return harnessScreen;
    }
  } catch {
    // Fall through to the local manual login flow when the shared harness stalls on auth.
  }
  execFileSync(
    "adb",
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", androidWarehouseRoute, "com.azisbek_dzhantaev.rikexpoapp"],
    { cwd: projectRoot, stdio: "pipe" },
  );
  await sleep(1500);

  let current = dumpAndroidScreen("android-warehouse-incoming-queue-current");
  if (!isAndroidLoginScreen(current.xml)) return current;

  const nodes = parseAndroidNodes(current.xml);
  const emailNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /email/i.test(`${node.text} ${node.hint}`),
  );
  const passwordNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /РџР°СЂРѕР»СЊ|Пароль|password/i.test(`${node.text} ${node.hint}`),
  );
  const loginNode = findAndroidNode(
    nodes,
    (node) => node.clickable && node.enabled && /Р’РѕР№С‚Рё|Войти|login/i.test(`${node.text} ${node.contentDesc}`),
  );

  if (!emailNode || !passwordNode || !loginNode) {
    throw new Error("Android login controls were not found on warehouse incoming runtime screen");
  }

  tapAndroidBounds(emailNode.bounds);
  await sleep(500);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);

  tapAndroidBounds(passwordNode.bounds);
  await sleep(500);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);

  execFileSync("adb", ["shell", "input", "keyevent", "4"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(350);

  tapAndroidBounds(loginNode.bounds);
  await sleep(350);
  execFileSync("adb", ["shell", "input", "keyevent", "66"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(1600);

  current = await poll(
    "android:warehouse_login_complete",
    async () => {
      const screen = dumpAndroidScreen("android-warehouse-incoming-queue-after-login");
      if (isAndroidLoginScreen(screen.xml)) {
        const retryLoginNode = findAndroidNode(
          parseAndroidNodes(screen.xml),
          (node) => node.clickable && node.enabled && /Р вЂ™Р С•Р в„–РЎвЂљР С‘|Р’РѕР№С‚Рё|login/i.test(`${node.text} ${node.contentDesc}`),
        );
        if (retryLoginNode) {
          execFileSync("adb", ["shell", "input", "keyevent", "4"], {
            cwd: projectRoot,
            stdio: "pipe",
          });
          await sleep(250);
          tapAndroidBounds(retryLoginNode.bounds);
          await sleep(250);
          execFileSync("adb", ["shell", "input", "keyevent", "66"], {
            cwd: projectRoot,
            stdio: "pipe",
          });
        }
        return null;
      }
      return screen;
    },
    30_000,
    1000,
  );

  const authenticatedScreen = current;

  execFileSync(
    "adb",
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", androidWarehouseRoute, "com.azisbek_dzhantaev.rikexpoapp"],
    { cwd: projectRoot, stdio: "pipe" },
  );
  await sleep(1500);
  const routedScreen = dumpAndroidScreen("android-warehouse-incoming-queue-current");
  return isAndroidLoginScreen(routedScreen.xml) ? authenticatedScreen : routedScreen;
}

async function confirmAndroidWarehouseFio(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (!isAndroidFioModal(screen.xml)) {
    return { screen, fioConfirmed: false };
  }

  const fioValue = "ff";
  const inputNode = () =>
    androidHarness.parseAndroidNodes(screen.xml).find((node) => node.resourceId.includes("warehouse-fio-input")) ??
    null;
  const fillStrategies = [
    async () => {
      const node = inputNode();
      if (!node) throw new Error("Android warehouse FIO confirmation controls were not found");
      androidHarness.tapAndroidBounds(node.bounds);
      await sleep(1500);
      await typeAsciiLowercaseByKeyEvents(fioValue);
    },
    async () => {
      const node = inputNode();
      if (!node) throw new Error("Android warehouse FIO confirmation controls were not found");
      await androidHarness.replaceAndroidFieldText(node, fioValue);
    },
    async () => {
      const node = inputNode();
      if (!node) throw new Error("Android warehouse FIO confirmation controls were not found");
      androidHarness.tapAndroidBounds(node.bounds);
      await sleep(900);
      androidHarness.typeAndroidText(fioValue);
    },
  ];

  let confirmScreen: ReturnType<typeof dumpAndroidScreen> | null = null;
  let confirmNode: AndroidNode | null = null;
  for (let strategyIndex = 0; strategyIndex < fillStrategies.length && !confirmNode; strategyIndex += 1) {
    await fillStrategies[strategyIndex]();
    await sleep(1000);

    confirmScreen = await poll(
      `android:warehouse_fio_confirm_button:${strategyIndex + 1}`,
      async () => {
        const next = dumpAndroidScreen(`android-warehouse-incoming-queue-fio-filled-${strategyIndex + 1}`);
        return findAndroidFioActionNode(parseAndroidNodes(next.xml)) ? next : null;
      },
      8_000,
      750,
    ).catch(() => dumpAndroidScreen(`android-warehouse-incoming-queue-fio-filled-timeout-${strategyIndex + 1}`));
    confirmNode = findAndroidFioActionNode(parseAndroidNodes(confirmScreen.xml));
    screen = confirmScreen;
  }
  if (!confirmNode) {
    throw new Error("Android warehouse FIO confirmation action did not become available after input");
  }

  execFileSync("adb", ["shell", "input", "keyevent", "4"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);

  tapAndroidBounds(confirmNode.bounds);
  await sleep(1200);

  screen = await poll(
    "android:warehouse_fio_confirmed",
    async () => {
      const next = dumpAndroidScreen("android-warehouse-incoming-queue-after-fio");
      return isAndroidFioModal(next.xml) ? null : next;
    },
    20_000,
    1000,
  );

  return { screen, fioConfirmed: true };
}

const findFirstIncomingRow = (nodes: AndroidNode[]): AndroidNode | null =>
  nodes.find((node) => node.clickable && node.enabled && /PR-\d+\/\d{4}/.test(node.contentDesc || node.text)) ?? null;

async function runAndroidRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  const devices = adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    return {
      status: "failed",
      queueVisible: false,
      modalOpened: false,
      platformSpecificIssues: ["No Android emulator/device detected"],
    };
  }

  const devClient = await androidHarness.ensureAndroidDevClientServer();
  try {
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Warehouse Incoming Android");
    const packageName = detectAndroidPackage();
    const preflight = androidHarness.runAndroidPreflight({ packageName, clearApp: true });
    await androidHarness.warmAndroidDevClientBundle(androidDevClientPort);
    let seededFioStorage: Record<string, unknown> | null = null;
    let current = await loginWarehouseAndroid(user);
    if (isAndroidFioModal(current.xml)) {
      seededFioStorage = seedAndroidWarehouseFioStorage(packageName);
      androidHarness.startAndroidDevClientProject(packageName, androidDevClientPort, { stopApp: true });
      await sleep(2500);
      current = await androidHarness.openAndroidRoute({
        packageName,
        routes: [androidWarehouseRoute, "rik://office/warehouse", "rik:///%28tabs%29/office/warehouse"],
        artifactBase: "android-warehouse-incoming-queue-after-fio-storage-seed",
        predicate: (xml) => isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
        renderablePredicate: (xml) =>
          isAndroidLoginScreen(xml) || isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
        loginScreenPredicate: isAndroidLoginScreen,
        timeoutMs: 60_000,
        delayMs: 1_500,
      });
    }
    const fioState = await confirmAndroidWarehouseFio(current);
    let workingScreen = fioState.screen;
    let workingXml = fioState.screen.xml;
    const platformSpecificIssues: string[] = [];
    const officeHop = await openAndroidWarehouseFromOffice(workingScreen);
    workingScreen = officeHop.screen;
    workingXml = workingScreen.xml;
    if (officeHop.issue) {
      platformSpecificIssues.push(officeHop.issue);
    }
    if (isAndroidFioModal(workingXml)) {
      const nextFioState = await confirmAndroidWarehouseFio(workingScreen);
      workingScreen = nextFioState.screen;
      workingXml = workingScreen.xml;
      const nextOfficeHop = await openAndroidWarehouseFromOffice(workingScreen);
      workingScreen = nextOfficeHop.screen;
      workingXml = workingScreen.xml;
      if (nextOfficeHop.issue) {
        platformSpecificIssues.push(nextOfficeHop.issue);
      }
    }

    if (workingXml.includes(LABELS.issueModalTitle)) {
      execFileSync("adb", ["shell", "input", "keyevent", "4"], {
        cwd: projectRoot,
        stdio: "pipe",
      });
      await sleep(1000);
      workingScreen = dumpAndroidScreen("android-warehouse-incoming-queue-current");
      workingXml = workingScreen.xml;
    }

    if (isAndroidIncomingModal(workingXml)) {
      execFileSync("adb", ["shell", "input", "keyevent", "4"], {
        cwd: projectRoot,
        stdio: "pipe",
      });
      await sleep(1000);
      workingScreen = dumpAndroidScreen("android-warehouse-incoming-queue-current");
      workingXml = workingScreen.xml;
    }

    const incomingTab = await ensureAndroidIncomingTab(workingScreen);
    workingScreen = incomingTab.screen;
    workingXml = workingScreen.xml;
    if (incomingTab.issue) {
      platformSpecificIssues.push(incomingTab.issue);
    }

    const queueVisible = /PR-\d+\/\d{4}/.test(workingXml);
    const emptyStateVisible = isAndroidIncomingEmptyState(workingXml);
    if (!queueVisible && !emptyStateVisible) {
      platformSpecificIssues.push("Incoming queue rows were not visible after deeplink/tab flow");
    }

    let modalOpened = false;
    let openedRowId: string | null = null;
    if (queueVisible) {
      const firstRow = findFirstIncomingRow(parseAndroidNodes(workingXml));
      if (firstRow) {
        openedRowId = (firstRow.contentDesc || firstRow.text).match(/PR-\d+\/\d{4}/)?.[0] ?? null;
        const center = parseBoundsCenter(firstRow.bounds);
        if (center) {
          execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
            cwd: projectRoot,
            stdio: "pipe",
          });
          await sleep(1200);
          const modal = await poll(
            "android:warehouse_incoming_modal",
            async () => {
              const next = dumpAndroidScreen("android-warehouse-incoming-queue-modal");
              return isAndroidIncomingModal(next.xml) ? next : null;
            },
            20_000,
            1000,
          ).catch(() => dumpAndroidScreen("android-warehouse-incoming-queue-modal-timeout"));
          modalOpened = isAndroidIncomingModal(modal.xml);
          if (!modalOpened) {
            platformSpecificIssues.push("Incoming items modal did not open after tapping first incoming row");
          }
          const recovery = androidHarness.getRecoverySummary();
          return {
            status: queueVisible && modalOpened ? "passed" : "failed",
            androidPreflight: preflight,
            seededFioStorage,
            ...recovery,
            incomingTabOpened: incomingTab.switched,
            queueVisible,
            emptyStateVisible: false,
            modalOpened,
            openedRowId,
            currentXml: current.xmlPath,
            currentPng: current.pngPath,
            queueXml: workingScreen.xmlPath,
            queuePng: workingScreen.pngPath,
            modalXml: modal.xmlPath,
            modalPng: modal.pngPath,
            platformSpecificIssues,
          };
        }
      }
    }

    const recovery = androidHarness.getRecoverySummary();
    return {
      status: incomingTab.switched && emptyStateVisible ? "passed" : "failed",
      androidPreflight: preflight,
      seededFioStorage,
      ...recovery,
      incomingTabOpened: incomingTab.switched,
      queueVisible,
      emptyStateVisible,
      modalOpened,
      openedRowId,
      currentXml: current.xmlPath,
      currentPng: current.pngPath,
      queueXml: workingScreen.xmlPath,
      queuePng: workingScreen.pngPath,
      platformSpecificIssues,
    };
  } finally {
    await cleanupTempUser(user);
    devClient.cleanup();
  }
}

function runIosRuntime(): Record<string, unknown> {
  if (!xcrunAvailable()) {
    return {
      status: "residual",
      iosResidual: "xcrun is unavailable on this host; iOS simulator cannot be started from Windows",
      platformSpecificIssues: ["xcrun is unavailable on this host; iOS simulator cannot be started from Windows"],
    };
  }
  return {
    status: "failed",
    platformSpecificIssues: ["xcrun is available but automated warehouse incoming iOS runtime is not implemented in this host flow"],
  };
}

async function main() {
  const web = shouldRunWebRuntime
    ? await runWebRuntime().catch((error) =>
        createFailurePlatformResult("web", error, {
          incomingRowsVisible: false,
          emptyStateVisible: false,
          modalOpened: false,
          expectedHasRows: true,
        }),
      )
    : {
        status: "skipped",
        incomingRowsVisible: false,
        emptyStateVisible: false,
        modalOpened: false,
        expectedHasRows: true,
        platformSpecificIssues: [],
        skipReason: "web smoke is not part of this Android WAVE 1-FINAL proof",
      };
  const android = await runAndroidRuntime().catch((error) => {
    const artifacts = androidHarness.captureFailureArtifacts("android-warehouse-incoming-queue-failure");
    return createFailurePlatformResult("android", error, {
      queueVisible: false,
      emptyStateVisible: false,
      modalOpened: false,
      ...androidHarness.getRecoverySummary(),
      ...artifacts,
    });
  });
  const ios = runIosRuntime();
  const androidRecord = android as Record<string, unknown>;
  const summary = buildRuntimeSummary({
    web,
    android,
    ios,
    scenariosPassed: {
      web: {
        initialOpen: web.incomingRowsVisible === true || web.emptyStateVisible === true,
        queueCorrectness: web.incomingRowsVisible === true || web.emptyStateVisible === true,
        interactionSanity: web.expectedHasRows === true ? web.modalOpened === true : web.emptyStateVisible === true,
      },
      android: {
        initialOpen: android.queueVisible === true || android.emptyStateVisible === true,
        queueCorrectness: android.queueVisible === true || android.emptyStateVisible === true,
        interactionSanity:
          android.queueVisible === true ? android.modalOpened === true : android.emptyStateVisible === true,
      },
      ios: {
        initialOpen: ios.status === "passed",
        queueCorrectness: ios.status === "passed",
        interactionSanity: ios.status === "passed",
      },
    },
    artifacts: {
      webSummary: `${webArtifactBase}.summary.json`,
      webRuntime: `${webArtifactBase}.json`,
      androidCurrentXml: typeof androidRecord.currentXml === "string" ? androidRecord.currentXml : null,
      androidCurrentPng: typeof androidRecord.currentPng === "string" ? androidRecord.currentPng : null,
      androidQueueXml: typeof androidRecord.queueXml === "string" ? androidRecord.queueXml : null,
      androidQueuePng: typeof androidRecord.queuePng === "string" ? androidRecord.queuePng : null,
      androidModalXml: typeof androidRecord.modalXml === "string" ? androidRecord.modalXml : null,
      androidModalPng: typeof androidRecord.modalPng === "string" ? androidRecord.modalPng : null,
    },
    requiredPlatforms: {
      web: shouldRunWebRuntime,
      android: true,
      ios: true,
    },
    extra: {
      gate: "warehouse_incoming_queue_runtime_verify",
      webSkipped: !shouldRunWebRuntime,
    },
  });

  writeArtifact(`${artifactBase}.json`, { web, android, ios, summary });
  writeArtifact(`${artifactBase}.summary.json`, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
