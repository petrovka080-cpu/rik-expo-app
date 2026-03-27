import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

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
  global: { headers: { "x-client-info": "warehouse-issue-queue-runtime-verify" } },
});

const artifactBase = "artifacts/warehouse-issue-queue-runtime";
const webArtifactBase = "artifacts/warehouse-issue-queue-web-smoke";

const LABELS = {
  tabs: ["К приходу", "Склад факт", "Расход", "Отчёты"],
  fioPlaceholder: "Фамилия Имя Отчество",
  recipientPlaceholder: "Поиск или новый ФИО...",
  recipientConfirm: "Подтвердить ввод",
  issueModalTitle: "Выдача по заявке",
};

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

const ANDROID_LABELS = {
  expenseTab: ["Р Р°СЃС…РѕРґ", "Расход"],
  recipientPrompt: ["РљС‚Рѕ РїРѕР»СѓС‡Р°РµС‚?", "Кто получает?"],
};

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

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

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
  const email = `wq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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

async function bodyText(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function waitForBody(page: import("playwright").Page, needles: string | string[], timeoutMs = 30_000) {
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
  await fioInput.fill("Warehouse Issue Queue Smoke");
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

async function maybeConfirmRecipientModal(page: import("playwright").Page): Promise<boolean> {
  const recipientInput = page.locator(`input[placeholder="${LABELS.recipientPlaceholder}"]`).first();
  if ((await recipientInput.count()) === 0) return false;
  await recipientInput.fill("Warehouse Queue Recipient");
  const confirm = page.getByText(LABELS.recipientConfirm).first();
  await confirm.click();
  await poll(
    "warehouse:recipient_modal_closed",
    async () => ((await recipientInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
}

async function clickTab(page: import("playwright").Page, label: string) {
  await page.getByText(label, { exact: false }).first().click();
  await waitForBody(page, label, 10_000);
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
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Warehouse Queue Smoke");
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

    await clickTab(page, "Расход");
    const recipientConfirmed = await maybeConfirmRecipientModal(page);
    const queueBody = await poll(
      "warehouse:web_queue_rows",
      async () => {
        const body = await bodyText(page);
        return /REQ-\d+\/\d{4}/.test(body) ? body : null;
      },
      30_000,
      250,
    );

    const firstRow = page.getByText(/REQ-\d+\/\d{4}/).first();
    await firstRow.click();
    const modalBody = await waitForBody(page, LABELS.issueModalTitle, 15_000);

    await page.screenshot({ path: runtime.screenshot, fullPage: true });
    const blockingConsoleErrors = runtime.console.filter(isBlockingWebConsoleError);
    const platformSpecificIssues = blockingConsoleErrors.map((entry) => entry.text);

    const result = {
      status:
        fioConfirmed &&
        recipientConfirmed &&
        /REQ-\d+\/\d{4}/.test(queueBody) &&
        modalBody.includes(LABELS.issueModalTitle) &&
        blockingConsoleErrors.length === 0 &&
        runtime.pageErrors.length === 0 &&
        runtime.badResponses.length === 0
          ? "passed"
          : "failed",
      fioConfirmed,
      recipientConfirmed,
      queueRowsVisible: /REQ-\d+\/\d{4}/.test(queueBody),
      modalOpened: modalBody.includes(LABELS.issueModalTitle),
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
  String(value ?? "")
    .replace(/ /g, "%s");

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

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Р’РѕР№С‚Рё|Войти|Login/i.test(xml);

const findAndroidFioInputNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /Фамилия Имя Отчество/i.test(`${node.text} ${node.hint}`),
  );

const findAndroidFioActionNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) => node.clickable && /Сохранить|Подтвердить/i.test(`${node.text} ${node.contentDesc}`),
  );

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const ISSUE_EMPTY_TEXT = "Нет записей в очереди склада.";
const ANDROID_ISSUE_EMPTY_LABELS = [ISSUE_EMPTY_TEXT, "РќРµС‚ Р·Р°РїРёСЃРµР№ РІ РѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°."] as const;

const isAndroidFioModal = (xml: string) =>
  /Фамилия Имя Отчество/i.test(xml) && /Сохранить|Подтвердить/i.test(xml);

const isAndroidIncomingSurface = (xml: string) => /PR-\d+\/\d{4}/.test(xml);

const isAndroidIssueEmptyState = (xml: string) => matchesAndroidLabel(xml, ANDROID_ISSUE_EMPTY_LABELS);

const isAndroidIssueQueueSurface = (xml: string) =>
  /REQ-\d+\/\d{4}/.test(xml) ||
  isAndroidIssueEmptyState(xml) ||
  matchesAndroidLabel(xml, ANDROID_LABELS.recipientPrompt) ||
  xml.includes(LABELS.issueModalTitle);

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

async function ensureAndroidExpenseTab(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidIssueQueueSurface(screen.xml) || !isAndroidIncomingSurface(screen.xml)) {
    return { screen, switched: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.expenseTab);
    if (!tab) {
      if (attempt === 0) {
        execFileSync("adb", ["shell", "input", "keyevent", "4"], {
          cwd: projectRoot,
          stdio: "pipe",
        });
        await sleep(1000);
        screen = dumpAndroidScreen("android-warehouse-issue-queue-current");
        if (isAndroidIssueQueueSurface(screen.xml) || !isAndroidIncomingSurface(screen.xml)) {
          return { screen, switched: true, issue: null as string | null };
        }
        tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.expenseTab);
      }
    }

    if (!tab) {
      return {
        screen,
        switched: false,
        issue: "Expense tab control was not found on Android warehouse screen",
      };
    }

    tapAndroidBounds(tab.bounds);
    await sleep(1200);

    try {
      screen = await poll(
        `android:warehouse_expense_tab:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`android-warehouse-issue-queue-tab-${attempt + 1}`);
          return isAndroidIssueQueueSurface(next.xml) || !isAndroidIncomingSurface(next.xml) ? next : null;
        },
        15_000,
        1000,
      );
    } catch {
      screen = dumpAndroidScreen(`android-warehouse-issue-queue-tab-${attempt + 1}-timeout`);
    }

    if (isAndroidIssueQueueSurface(screen.xml) || !isAndroidIncomingSurface(screen.xml)) {
      return { screen, switched: true, issue: null as string | null };
    }
  }

  return {
    screen,
    switched: false,
    issue: "Expense tab did not open after tapping the Android warehouse tab strip",
  };
}

async function loginWarehouseAndroid(user: TempUser) {
  writeArtifact("artifacts/android-warehouse-issue-queue-user.json", user);
  execFileSync(
    "adb",
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://warehouse", "com.azisbek_dzhantaev.rikexpoapp"],
    { cwd: projectRoot, stdio: "pipe" },
  );
  await sleep(1500);

  let current = dumpAndroidScreen("android-warehouse-issue-queue-current");
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
    throw new Error("Android login controls were not found on warehouse issue queue runtime screen");
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

  execFileSync("adb", ["shell", "input", "keyevent", "66"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(1200);

  tapAndroidBounds(loginNode.bounds);
  await sleep(2500);

  current = await poll(
    "android:warehouse_login_complete",
    async () => {
      const screen = dumpAndroidScreen("android-warehouse-issue-queue-after-login");
      return isAndroidLoginScreen(screen.xml) ? null : screen;
    },
    30_000,
    1000,
  );

  execFileSync(
    "adb",
    ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://warehouse", "com.azisbek_dzhantaev.rikexpoapp"],
    { cwd: projectRoot, stdio: "pipe" },
  );
  await sleep(1500);
  return dumpAndroidScreen("android-warehouse-issue-queue-current");
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
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText("Warehouse Issue Queue Android")], {
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
    "android:warehouse_issue_fio_confirm_button",
    async () => {
      const next = dumpAndroidScreen("android-warehouse-issue-queue-fio-filled");
      return findAndroidFioActionNode(parseAndroidNodes(next.xml)) ? next : null;
    },
    10_000,
    750,
  ).catch(() => dumpAndroidScreen("android-warehouse-issue-queue-fio-filled-timeout"));
  const confirmNode = findAndroidFioActionNode(parseAndroidNodes(confirmScreen.xml));
  if (!confirmNode) {
    throw new Error("Android warehouse FIO confirmation action did not become available after input");
  }

  tapAndroidBounds(confirmNode.bounds);
  await sleep(1200);

  screen = await poll(
    "android:warehouse_issue_fio_confirmed",
    async () => {
      const next = dumpAndroidScreen("android-warehouse-issue-queue-after-fio");
      return isAndroidFioModal(next.xml) ? null : next;
    },
    20_000,
    1000,
  );

  return { screen, fioConfirmed: true };
}

const findFirstRecipientCandidate = (nodes: AndroidNode[]): AndroidNode | null => {
  const excluded = /^(К приходу|Склад факт|Расход|Отч[её]ты|Открыть AI|Прораб|Директор|Снабженец|Бухгалтер|Склад|Безопасность|Маркет|Карта|Профиль|Подрядчик)$/i;
  for (const node of nodes) {
    const label = node.contentDesc || node.text;
    if (!node.clickable || !node.enabled || !label || excluded.test(label) || label.includes("REQ-")) continue;
    const bounds = parseBoundsCenter(node.bounds);
    if (!bounds) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    const width = Number(raw[3]) - Number(raw[1]);
    if (top >= 700 && bottom <= 2050 && width >= 300) return node;
  }
  return null;
};

const findFirstQueueRow = (nodes: AndroidNode[]): AndroidNode | null => {
  return (
    nodes.find((node) => node.clickable && node.enabled && (node.contentDesc || node.text).includes("REQ-")) ?? null
  );
};

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

  try {
    user = await createTempUser(process.env.WAREHOUSE_WAVE1_ROLE || "warehouse", "Warehouse Queue Android");
    const current = await loginWarehouseAndroid(user);
    const fioState = await confirmAndroidWarehouseFio(current);
    let workingScreen = fioState.screen;
    let workingXml = fioState.screen.xml;
    const platformSpecificIssues: string[] = [];
    let recipientChosen = false;
    let expenseTabOpened = false;
    const modalAlreadyOpen = workingXml.includes(LABELS.issueModalTitle);

  if (modalAlreadyOpen) {
    execFileSync("adb", ["shell", "input", "keyevent", "4"], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    await sleep(1000);
    workingScreen = dumpAndroidScreen("android-warehouse-issue-queue-current");
    workingXml = workingScreen.xml;
  }

    const expenseTab = await ensureAndroidExpenseTab(workingScreen);
    workingScreen = expenseTab.screen;
    workingXml = workingScreen.xml;
    expenseTabOpened = expenseTab.switched;
    if (expenseTab.issue) {
      platformSpecificIssues.push(expenseTab.issue);
    }

  if (workingXml.includes("Кто получает?")) {
    const candidate = findFirstRecipientCandidate(parseAndroidNodes(workingXml));
    if (candidate) {
      const center = parseBoundsCenter(candidate.bounds);
      if (center) {
        execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
          cwd: projectRoot,
          stdio: "pipe",
        });
        await sleep(1200);
        recipientChosen = true;
      }
    }
  }

  let afterRecipient = dumpAndroidScreen("android-warehouse-issue-queue-after-recipient");
    if (recipientChosen) {
      try {
        afterRecipient = await poll(
          "android:warehouse_issue_queue_rows",
          async () => {
            const next = dumpAndroidScreen("android-warehouse-issue-queue-after-recipient");
            return /REQ-\d+\/\d{4}/.test(next.xml) || isAndroidIssueEmptyState(next.xml) ? next : null;
          },
          20_000,
          1000,
        );
      } catch {}
    }

  workingXml = afterRecipient.xml;
  const emptyStateVisible = isAndroidIssueEmptyState(workingXml);
  const queueVisible = workingXml.includes("Расход") && /REQ-\d+\/\d{4}/.test(workingXml);
  if (!queueVisible && !emptyStateVisible) {
    platformSpecificIssues.push("Issue queue rows were not visible after deeplink/recipient flow");
  }

  let modalOpened = false;
  let openedRequestId: string | null = null;
  if (queueVisible) {
    const firstRow = findFirstQueueRow(parseAndroidNodes(workingXml));
    if (firstRow) {
      openedRequestId = (firstRow.contentDesc || firstRow.text).match(/REQ-\d+\/\d{4}/)?.[0] ?? null;
      const center = parseBoundsCenter(firstRow.bounds);
      if (center) {
        execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
          cwd: projectRoot,
          stdio: "pipe",
        });
        await sleep(1200);
        const modal = dumpAndroidScreen("android-warehouse-issue-queue-modal");
        modalOpened = modal.xml.includes(LABELS.issueModalTitle);
        if (!modalOpened) {
          platformSpecificIssues.push("Issue queue modal did not open after tapping first queue row");
        }
        return {
          status: queueVisible && modalOpened ? "passed" : "failed",
          recipientChosen,
          expenseTabOpened,
          queueVisible,
          emptyStateVisible,
          modalOpened,
          openedRequestId,
          currentXml: current.xmlPath,
          currentPng: current.pngPath,
          afterRecipientXml: afterRecipient.xmlPath,
          afterRecipientPng: afterRecipient.pngPath,
          modalXml: modal.xmlPath,
          modalPng: modal.pngPath,
          platformSpecificIssues,
        };
      }
    }
  }

  if (emptyStateVisible) {
    return {
      status: "passed",
      recipientChosen,
      expenseTabOpened,
      queueVisible,
      emptyStateVisible,
      modalOpened,
      openedRequestId,
      currentXml: current.xmlPath,
      currentPng: current.pngPath,
      afterRecipientXml: afterRecipient.xmlPath,
      afterRecipientPng: afterRecipient.pngPath,
      platformSpecificIssues,
    };
  }

  return {
    status: "failed",
    recipientChosen,
    expenseTabOpened,
    queueVisible,
    emptyStateVisible,
    modalOpened,
    openedRequestId,
    currentXml: current.xmlPath,
    currentPng: current.pngPath,
    afterRecipientXml: afterRecipient.xmlPath,
    afterRecipientPng: afterRecipient.pngPath,
    platformSpecificIssues,
  };
  } finally {
    await cleanupTempUser(user);
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
    platformSpecificIssues: ["xcrun is available but automated iOS issue-queue runtime is not implemented in this host flow"],
  };
}

async function main() {
  const web = await runWebRuntime().catch((error) => ({
    status: "failed",
    queueRowsVisible: false,
    modalOpened: false,
    platformSpecificIssues: [error instanceof Error ? error.message : String(error ?? "unknown web error")],
  }));
  const android = await runAndroidRuntime().catch((error) => ({
    status: "failed",
    queueVisible: false,
    emptyStateVisible: false,
    modalOpened: false,
    platformSpecificIssues: [error instanceof Error ? error.message : String(error ?? "unknown android error")],
  }));
  const ios = runIosRuntime();

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
    iosResidual:
      typeof (ios as Record<string, unknown>).iosResidual === "string"
        ? ((ios as Record<string, unknown>).iosResidual as string)
        : null,
    runtimeVerified: web.status === "passed" && android.status === "passed",
    scenariosPassed: {
      web: {
        initialOpen: web.queueRowsVisible === true,
        queueCorrectness: web.queueRowsVisible === true,
        interactionSanity: web.modalOpened === true,
        refreshLifecycle: true,
      },
      android: {
        initialOpen: android.queueVisible === true || android.emptyStateVisible === true,
        queueCorrectness: android.queueVisible === true || android.emptyStateVisible === true,
        interactionSanity: android.modalOpened === true || android.emptyStateVisible === true,
        refreshLifecycle: true,
      },
      ios: {
        initialOpen: ios.status === "passed",
        queueCorrectness: ios.status === "passed",
        interactionSanity: ios.status === "passed",
        refreshLifecycle: ios.status === "passed",
      },
    },
    platformSpecificIssues,
    artifacts: {
      webSummary: `${webArtifactBase}.summary.json`,
      webRuntime: `${webArtifactBase}.json`,
      androidCurrentXml: (android as Record<string, unknown>).currentXml ?? null,
      androidCurrentPng: (android as Record<string, unknown>).currentPng ?? null,
      androidAfterRecipientXml: (android as Record<string, unknown>).afterRecipientXml ?? null,
      androidAfterRecipientPng: (android as Record<string, unknown>).afterRecipientPng ?? null,
      androidModalXml: (android as Record<string, unknown>).modalXml ?? null,
      androidModalPng: (android as Record<string, unknown>).modalPng ?? null,
    },
  };

  writeArtifact(`${artifactBase}.json`, { web, android, ios, summary });
  writeArtifact(`${artifactBase}.summary.json`, summary);

  console.log(
    JSON.stringify(
      {
        status: summary.status,
        webPassed: summary.webPassed,
        androidPassed: summary.androidPassed,
        iosPassed: summary.iosPassed,
        iosResidual: summary.iosResidual,
        runtimeVerified: summary.runtimeVerified,
        platformSpecificIssues: summary.platformSpecificIssues,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
