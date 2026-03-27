import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { createAndroidHarness } from "./_shared/androidHarness";

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

type RuntimeIssue = {
  platform: "web" | "android" | "ios";
  issue: string;
};

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type AndroidNode = {
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

  return { id: user.id, email, password, role };
}

async function cleanupTempUser(user: TempUser | null) {
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
  await page.goto(`${baseUrl}/warehouse`, { waitUntil: "networkidle" });
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
      : INCOMING_EMPTY_TEXT;
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
    const emptyStateVisible = !expected.hasRows && queueBody.includes(INCOMING_EMPTY_TEXT);

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
  findAndroidNode(
    nodes,
    (node) => node.clickable && /Сохранить|Подтвердить/i.test(`${node.text} ${node.contentDesc}`),
  );

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Р’РѕР№С‚Рё|Войти|Login/i.test(xml);

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const isAndroidIncomingSurface = (xml: string) => /PR-\d+\/\d{4}/.test(xml);
const isAndroidIncomingEmptyState = (xml: string) => matchesAndroidLabel(xml, ANDROID_INCOMING_EMPTY_LABELS);
const isAndroidIncomingHome = (xml: string) => isAndroidIncomingSurface(xml) || isAndroidIncomingEmptyState(xml);
const isAndroidFioModal = (xml: string) =>
  /Фамилия Имя Отчество|Р¤Р°РјРёР»РёСЏ РРјСЏ РћС‚С‡РµСЃС‚РІРѕ/i.test(xml) && /Сохранить|Подтвердить/i.test(xml);

const isAndroidIncomingModal = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.submitReceive) || (xml.includes("android.widget.EditText") && /PR-\d+\/\d{4}/.test(xml));

const dumpAndroidScreen = (name: string) => {
  const xmlDevicePath = `/sdcard/${name}.xml`;
  const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
  const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
  execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
  execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
  fs.writeFileSync(pngArtifactPath, screenshot);
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

async function ensureAndroidIncomingTab(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidIncomingHome(screen.xml)) {
    return { screen, switched: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.incomingTab);
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
        tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.incomingTab);
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
  writeArtifact("artifacts/android-warehouse-incoming-queue-user.json", user);
  if (process.env.RIK_ANDROID_SHARED_HARNESS !== "0") {
    const packageName = detectAndroidPackage();
    return androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: "rik://warehouse",
      artifactBase: "android-warehouse-incoming-queue",
      successPredicate: (xml) => isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
      renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidIncomingHome(xml) || isAndroidFioModal(xml) || isAndroidIncomingModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
    });
  }
  execFileSync(
    "adb",
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://warehouse", "com.azisbek_dzhantaev.rikexpoapp"],
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
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://warehouse", "com.azisbek_dzhantaev.rikexpoapp"],
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

  const inputNode = findAndroidFioInputNode(parseAndroidNodes(screen.xml));
  if (!inputNode) {
    throw new Error("Android warehouse FIO confirmation controls were not found");
  }

  tapAndroidBounds(inputNode.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText("Warehouse Incoming Android")], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);
  execFileSync("adb", ["shell", "input", "keyevent", "4"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);

  const confirmScreen = await poll(
    "android:warehouse_fio_confirm_button",
    async () => {
      const next = dumpAndroidScreen("android-warehouse-incoming-queue-fio-filled");
      return findAndroidFioActionNode(parseAndroidNodes(next.xml)) ? next : null;
    },
    10_000,
    750,
  ).catch(() => dumpAndroidScreen("android-warehouse-incoming-queue-fio-filled-timeout"));
  const confirmNode = findAndroidFioActionNode(parseAndroidNodes(confirmScreen.xml));
  if (!confirmNode) {
    throw new Error("Android warehouse FIO confirmation action did not become available after input");
  }

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
    const expected = await loadExpectedIncomingContext();
    const packageName = detectAndroidPackage();
    const preflight = androidHarness.runAndroidPreflight({ packageName });
    await androidHarness.warmAndroidDevClientBundle(androidDevClientPort);
    const current = await loginWarehouseAndroid(user);
    const fioState = await confirmAndroidWarehouseFio(current);
    let workingScreen = fioState.screen;
    let workingXml = fioState.screen.xml;
    const platformSpecificIssues: string[] = [];

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
    const emptyStateVisible = !expected.hasRows && isAndroidIncomingEmptyState(workingXml);
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
  const web = await runWebRuntime().catch((error) => ({
    status: "failed",
    incomingRowsVisible: false,
    emptyStateVisible: false,
    modalOpened: false,
    expectedHasRows: true,
    platformSpecificIssues: [error instanceof Error ? error.message : String(error ?? "unknown web error")],
  }));
  const android = await runAndroidRuntime().catch((error) => ({
    status: "failed",
    queueVisible: false,
    emptyStateVisible: false,
    modalOpened: false,
    ...androidHarness.getRecoverySummary(),
    platformSpecificIssues: [error instanceof Error ? error.message : String(error ?? "unknown android error")],
  }));
  const ios = runIosRuntime();
  const androidRecord = android as Record<string, unknown>;
  const iosRecord = ios as Record<string, unknown>;

  const platformSpecificIssues: RuntimeIssue[] = [];
  for (const issue of (Array.isArray(web.platformSpecificIssues) ? web.platformSpecificIssues : []) as string[]) {
    platformSpecificIssues.push({ platform: "web", issue });
  }
  for (const issue of (Array.isArray(android.platformSpecificIssues) ? android.platformSpecificIssues : []) as string[]) {
    platformSpecificIssues.push({ platform: "android", issue });
  }
  for (const issue of (Array.isArray(ios.platformSpecificIssues) ? ios.platformSpecificIssues : []) as string[]) {
    platformSpecificIssues.push({ platform: "ios", issue });
  }

  const summary = {
    status:
      web.status === "passed" &&
      android.status === "passed" &&
      (ios.status === "passed" || ios.status === "residual")
        ? "passed"
        : "failed",
    webPassed: web.status === "passed",
    androidPassed: android.status === "passed",
    iosPassed: ios.status === "passed",
    iosResidual: typeof iosRecord.iosResidual === "string" ? (iosRecord.iosResidual as string) : null,
    environmentRecoveryUsed: androidRecord.environmentRecoveryUsed === true,
    gmsRecoveryUsed: androidRecord.gmsRecoveryUsed === true,
    anrRecoveryUsed: androidRecord.anrRecoveryUsed === true,
    blankSurfaceRecovered: androidRecord.blankSurfaceRecovered === true,
    devClientBootstrapRecovered: androidRecord.devClientBootstrapRecovered === true,
    runtimeVerified: web.status === "passed" && android.status === "passed",
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
    platformSpecificIssues,
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
  };

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
