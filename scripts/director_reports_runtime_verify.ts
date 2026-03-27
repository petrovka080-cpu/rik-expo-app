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
  global: { headers: { "x-client-info": "director-reports-runtime-verify" } },
});

const runtimeOutPath = path.join(projectRoot, "artifacts/director-reports-runtime.json");
const runtimeSummaryOutPath = path.join(projectRoot, "artifacts/director-reports-runtime.summary.json");
const webArtifactBase = "artifacts/director-reports-web-smoke";
const androidDevClientPort = Number(process.env.DIRECTOR_ANDROID_DEV_PORT ?? "8081");

const WEB_LABELS = {
  email: "Email",
  header: "Контроль",
  reportsTab: "Отчёты",
  cardTitle: "Факт выдачи (склад)",
  open: "Открыть",
  materialsTab: "Материалы",
  worksTab: "Работы",
  excel: "Excel",
  objectFilter: "Объекты ·",
  disciplineHeader: "Расход / Закупки",
  positionsLabel: "Позиции:",
  locationsLabel: "Локации:",
};

const ANDROID_LABELS = {
  reportsTab: ["Отчёты", "Отчеты", "РћС‚С‡С‘С‚С‹", "РћС‚С‡РµС‚С‹"],
  cardTitle: ["Факт выдачи (склад)", "Р¤Р°РєС‚ РІС‹РґР°С‡Рё (СЃРєР»Р°Рґ)"],
  open: ["Открыть", "РћС‚РєСЂС‹С‚СЊ"],
  materialsTab: ["Материалы", "РњР°С‚РµСЂРёР°Р»С‹"],
  worksTab: ["Работы", "Р Р°Р±РѕС‚С‹"],
  excel: ["Excel"],
  objectFilter: ["Объекты", "РћР±СЉРµРєС‚С‹"],
  disciplineHeader: ["Расход / Закупки", "Р Р°СЃС…РѕРґ / Р—Р°РєСѓРїРєРё"],
  positionsLabel: ["Позиции", "РџРѕР·РёС†РёРё"],
  locationsLabel: ["Локации", "Р›РѕРєР°С†РёРё"],
  close: ["Закрыть", "Р—Р°РєСЂС‹С‚СЊ"],
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

type TransportRequest = {
  method: string;
  url: string;
  postData: Record<string, unknown> | null;
};

type TransportResponse = {
  url: string;
  status: number;
  ok: boolean;
  includeDiscipline: boolean | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
});

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
  const email = `director.reports.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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

async function waitForBody(
  page: import("playwright").Page,
  needles: string | RegExp | (string | RegExp)[],
  timeoutMs = 30_000,
) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.map((item) => String(item)).join("|")}`,
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

async function loginDirector(page: import("playwright").Page, user: TempUser) {
  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" });
  const emailInput = page.locator(`input[placeholder="${WEB_LABELS.email}"]`).first();
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    const loginButton = page.getByText(/Войти|Login/i).first();
    if ((await loginButton.count()) > 0) {
      await loginButton.click();
    } else {
      await page.locator('button,[role="button"],div[tabindex="0"]').first().click();
    }
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30_000 }).catch(() => {});
  }
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

const tryReadRequestJson = (request: import("playwright").Request): Record<string, unknown> | null => {
  try {
    const json = request.postDataJSON();
    return json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

async function runWebRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  let browser: import("playwright").Browser | null = null;

  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as string[],
    badResponses: [] as { url: string; status: number; method: string }[],
    reportRequests: [] as TransportRequest[],
    reportResponses: [] as TransportResponse[],
    screenshot: `${webArtifactBase}.png`,
  };

  try {
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Director Reports Runtime");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push(String(error?.message ?? error));
    });
    page.on("request", (request) => {
      if (!request.url().includes("director_report_transport_scope_v1")) return;
      runtime.reportRequests.push({
        method: request.method(),
        url: request.url(),
        postData: tryReadRequestJson(request),
      });
    });
    page.on("response", (response) => {
      const request = response.request();
      if (response.status() >= 400) {
        runtime.badResponses.push({
          url: response.url(),
          status: response.status(),
          method: request.method(),
        });
      }
      if (!response.url().includes("director_report_transport_scope_v1")) return;
      const postData = tryReadRequestJson(request);
      const includeDiscipline =
        postData?.p_include_discipline === true ? true : postData?.p_include_discipline === false ? false : null;
      runtime.reportResponses.push({
        url: response.url(),
        status: response.status(),
        ok: response.ok(),
        includeDiscipline,
      });
    });

    await loginDirector(page, user);
    await waitForBody(page, [WEB_LABELS.header, WEB_LABELS.reportsTab], 45_000);

    await page.getByText(WEB_LABELS.reportsTab, { exact: false }).first().click();
    const reportsHomeBody = await waitForBody(page, [WEB_LABELS.cardTitle, WEB_LABELS.open], 30_000);

    await page.getByText(WEB_LABELS.open, { exact: false }).first().click();
    const modalBody = await waitForBody(
      page,
      [WEB_LABELS.materialsTab, WEB_LABELS.worksTab, WEB_LABELS.excel, WEB_LABELS.objectFilter],
      30_000,
    );

    const reportScopeResponse = await poll(
      "web:director_reports_scope_materials",
      async () =>
        runtime.reportResponses.find((entry) => entry.includeDiscipline === false && entry.ok) ?? null,
      30_000,
      250,
    );

    await page.getByText(WEB_LABELS.worksTab, { exact: false }).first().click();
    const worksBody = await waitForBody(
      page,
      [WEB_LABELS.disciplineHeader, WEB_LABELS.positionsLabel, WEB_LABELS.locationsLabel],
      30_000,
    );

    const disciplineScopeResponse = await poll(
      "web:director_reports_scope_discipline",
      async () =>
        runtime.reportResponses.find((entry) => entry.includeDiscipline === true && entry.ok) ?? null,
      30_000,
      250,
    );

    await page.screenshot({ path: runtime.screenshot, fullPage: true });

    const blockingConsoleErrors = runtime.console.filter(isBlockingWebConsoleError);
    const reportScopeRequested = runtime.reportRequests.some((entry) => entry.postData?.p_include_discipline === false);
    const disciplineScopeRequested = runtime.reportRequests.some((entry) => entry.postData?.p_include_discipline === true);
    const result = {
      status:
        reportsHomeBody.includes(WEB_LABELS.cardTitle) &&
        modalBody.includes(WEB_LABELS.materialsTab) &&
        reportScopeRequested &&
        disciplineScopeRequested &&
        reportScopeResponse.status === 200 &&
        disciplineScopeResponse.status === 200 &&
        (worksBody.includes(WEB_LABELS.disciplineHeader) ||
          worksBody.includes(WEB_LABELS.positionsLabel) ||
          worksBody.includes(WEB_LABELS.locationsLabel)) &&
        blockingConsoleErrors.length === 0 &&
        runtime.pageErrors.length === 0 &&
        runtime.badResponses.length === 0
          ? "passed"
          : "failed",
      reportsHomeOpened: reportsHomeBody.includes(WEB_LABELS.cardTitle),
      reportsModalOpened:
        modalBody.includes(WEB_LABELS.materialsTab) &&
        modalBody.includes(WEB_LABELS.worksTab) &&
        modalBody.includes(WEB_LABELS.excel),
      reportScopeRequested,
      disciplineScopeRequested,
      reportScope200: reportScopeResponse.status === 200,
      disciplineScope200: disciplineScopeResponse.status === 200,
      reportsControlsRendered:
        modalBody.includes(WEB_LABELS.materialsTab) &&
        modalBody.includes(WEB_LABELS.worksTab) &&
        modalBody.includes(WEB_LABELS.objectFilter),
      workTabRendered:
        worksBody.includes(WEB_LABELS.disciplineHeader) ||
        worksBody.includes(WEB_LABELS.positionsLabel) ||
        worksBody.includes(WEB_LABELS.locationsLabel),
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      consoleErrorsEmpty: blockingConsoleErrors.length === 0,
      badResponsesEmpty: runtime.badResponses.length === 0,
      screenshot: runtime.screenshot,
      platformSpecificIssues: blockingConsoleErrors.map((entry) => entry.text),
      bodySample: worksBody.slice(0, 2000),
    };

    writeJson(path.join(projectRoot, `${webArtifactBase}.json`), runtime);
    writeJson(path.join(projectRoot, `${webArtifactBase}.summary.json`), result);
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

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const pressAndroidKey = (keyCode: string | number) => {
  execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const swipeAndroid = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs = 250,
) => {
  execFileSync(
    "adb",
    ["shell", "input", "swipe", String(startX), String(startY), String(endX), String(endY), String(durationMs)],
    {
      cwd: projectRoot,
      stdio: "pipe",
    },
  );
};

const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

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

const detectAndroidPackage = (): string | null => {
  const packages = adb(["shell", "pm", "list", "packages"]);
  if (packages.includes("package:com.azisbek_dzhantaev.rikexpoapp")) {
    return "com.azisbek_dzhantaev.rikexpoapp";
  }
  if (packages.includes("package:host.exp.exponent")) {
    return "host.exp.exponent";
  }
  return null;
};

const startAndroidDirectorRoute = (packageName: string | null) => {
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://director"];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidTopTab = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null => {
  for (const node of nodes) {
    const label = `${node.contentDesc} ${node.text}`.trim();
    if (!node.clickable || !node.enabled || !label || !matchesAndroidLabel(label, labels)) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    if (top >= 150 && bottom <= 420) return node;
  }
  return null;
};

const findAndroidLabelNode = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const label = `${node.contentDesc} ${node.text}`.trim();
    return node.clickable && node.enabled && label.length > 0 && matchesAndroidLabel(label, labels);
  });

const findAndroidLoginNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      /Войти|Login|Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(`${node.text} ${node.contentDesc}`),
  );

const findAndroidOpenReportsNode = (nodes: AndroidNode[]): AndroidNode | null => {
  for (const node of nodes) {
    const label = `${node.contentDesc} ${node.text}`.trim();
    if (!node.clickable || !node.enabled || !label || !matchesAndroidLabel(label, ANDROID_LABELS.open)) continue;
    const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!raw) continue;
    const top = Number(raw[2]);
    const bottom = Number(raw[4]);
    if (top >= 450 && bottom <= 1900) return node;
  }
  return null;
};

const isAndroidLoginScreen = (xml: string) =>
  xml.includes("Email") && /Войти|Login|Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(xml);

const isAndroidReportsHome = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.cardTitle) && matchesAndroidLabel(xml, ANDROID_LABELS.open);

const isAndroidDirectorControlHome = (xml: string) =>
  /Контроль|РљРѕРЅС‚СЂРѕР»СЊ/i.test(xml) && matchesAndroidLabel(xml, ANDROID_LABELS.reportsTab);

const isAndroidReportsModal = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.materialsTab) &&
  matchesAndroidLabel(xml, ANDROID_LABELS.worksTab) &&
  matchesAndroidLabel(xml, ANDROID_LABELS.excel);

const isAndroidReportsDisciplineView = (xml: string) =>
  isAndroidReportsModal(xml) &&
  (matchesAndroidLabel(xml, ANDROID_LABELS.disciplineHeader) ||
    matchesAndroidLabel(xml, ANDROID_LABELS.positionsLabel) ||
    matchesAndroidLabel(xml, ANDROID_LABELS.locationsLabel));

async function dismissAndroidClosableOverlays(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (isAndroidReportsHome(screen.xml) || isAndroidReportsModal(screen.xml)) return screen;

    const closeNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), ANDROID_LABELS.close);
    if (!closeNode) return screen;

    tapAndroidBounds(closeNode.bounds);
    await sleep(1200);
    screen = dumpAndroidScreen(`android-director-reports-close-${attempt + 1}`);
  }

  return screen;
}

async function loginDirectorAndroid(user: TempUser, packageName: string | null) {
  writeJson(path.join(projectRoot, "artifacts/android-director-reports-user.json"), user);
  {
    const current = await androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: "rik://director",
      artifactBase: "android-director-reports",
      successPredicate: (xml) => isAndroidDirectorControlHome(xml) || isAndroidReportsModal(xml),
      renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidDirectorControlHome(xml) || isAndroidReportsModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
    });
    return dismissAndroidClosableOverlays(current);
  }
  startAndroidDirectorRoute(packageName);
  await sleep(1500);

  let current = dumpAndroidScreen("android-director-reports-current");
  if (!isAndroidLoginScreen(current.xml)) return dismissAndroidClosableOverlays(current);

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
      /Пароль|password|РџР°СЂРѕР»СЊ|Р СџР В°РЎР‚Р С•Р В»РЎРЉ/i.test(`${node.text} ${node.hint}`),
  );
  const stableLoginNode = findAndroidLoginNode(nodes);

  if (!emailNode || !passwordNode || !stableLoginNode) {
    throw new Error("Android director login controls were not found");
  }

  tapAndroidBounds(emailNode.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  tapAndroidBounds(passwordNode.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  pressAndroidKey(4);
  await sleep(500);
  tapAndroidBounds(stableLoginNode.bounds);
  await sleep(1200);
  pressAndroidKey(66);
  await sleep(1500);

  await poll(
    "android:director_reports_login_complete",
    async () => {
      const screen = dumpAndroidScreen("android-director-reports-after-login");
      if (isAndroidLoginScreen(screen.xml)) {
        const retryLoginNode = findAndroidLoginNode(parseAndroidNodes(screen.xml));
        if (retryLoginNode) {
          pressAndroidKey(4);
          await sleep(300);
          tapAndroidBounds(retryLoginNode.bounds);
        }
      }
      return isAndroidLoginScreen(screen.xml) ? null : screen;
    },
    45_000,
    1500,
  );

  startAndroidDirectorRoute(packageName);
  await sleep(1500);
  const routeScreen = dumpAndroidScreen("android-director-reports-route");
  return dismissAndroidClosableOverlays(routeScreen);
}

async function ensureAndroidReportsTab(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (isAndroidReportsHome(screen.xml) || isAndroidReportsModal(screen.xml)) {
    return { screen, switched: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tab = findAndroidTopTab(parseAndroidNodes(screen.xml), ANDROID_LABELS.reportsTab);
    if (!tab) {
      swipeAndroid(980, 240, 180, 240);
      await sleep(1200);
      screen = dumpAndroidScreen(`android-director-reports-tab-scroll-${attempt + 1}`);
      continue;
    }

    tapAndroidBounds(tab.bounds);
    await sleep(1200);

    try {
      screen = await poll(
        `android:director_reports_tab:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`android-director-reports-tab-${attempt + 1}`);
          return isAndroidReportsHome(next.xml) ? next : null;
        },
        15_000,
        1000,
      );
    } catch {
      screen = dumpAndroidScreen(`android-director-reports-tab-${attempt + 1}-timeout`);
    }

    if (isAndroidReportsHome(screen.xml)) {
      return { screen, switched: true, issue: null as string | null };
    }
  }

  return {
    screen,
    switched: false,
    issue: "Reports tab did not open after swiping/tapping the Android director tab strip",
  };
}

async function runAndroidRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  const devices = adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    return {
      status: "failed",
      reportsHomeVisible: false,
      reportsModalOpened: false,
      workTabRendered: false,
      platformSpecificIssues: ["No Android emulator/device detected"],
    };
  }

  const devClient = await androidHarness.ensureAndroidDevClientServer();
  try {
    const packageName = detectAndroidPackage();
    const preflight = androidHarness.runAndroidPreflight({ packageName });
    await androidHarness.warmAndroidDevClientBundle(androidDevClientPort);
    user = await createTempUser(process.env.DIRECTOR_WEB_ROLE || "director", "Director Reports Android");
    const current = await loginDirectorAndroid(user, packageName);
    const platformSpecificIssues: string[] = [];

    const reportsTab = await ensureAndroidReportsTab(current);
    const reportsHome = reportsTab.screen;
    const reportsSurfaceVisible =
      isAndroidReportsHome(reportsHome.xml) || isAndroidReportsModal(reportsHome.xml);
    if (reportsTab.issue) {
      platformSpecificIssues.push(reportsTab.issue);
    }
    if (!reportsSurfaceVisible) {
      return {
        status: "failed",
        reportsHomeVisible: false,
        reportsModalOpened: false,
        workTabRendered: false,
        currentXml: current.xmlPath,
        currentPng: current.pngPath,
        reportsXml: reportsHome.xmlPath,
        reportsPng: reportsHome.pngPath,
        platformSpecificIssues: [...platformSpecificIssues, "Reports home surface was not visible before tapping Open on Android"],
      };
    }

    let reportsModal = reportsHome;
    if (!isAndroidReportsModal(reportsHome.xml)) {
      const openNode = findAndroidOpenReportsNode(parseAndroidNodes(reportsHome.xml));
      if (!openNode) {
        return {
          status: "failed",
          reportsHomeVisible: isAndroidReportsHome(reportsHome.xml),
          reportsModalOpened: false,
          workTabRendered: false,
          currentXml: current.xmlPath,
          currentPng: current.pngPath,
          reportsXml: reportsHome.xmlPath,
          reportsPng: reportsHome.pngPath,
          platformSpecificIssues: [...platformSpecificIssues, "Open button was not found on Android reports surface"],
        };
      }

      tapAndroidBounds(openNode.bounds);
      await sleep(1200);

      reportsModal = await poll(
        "android:director_reports_modal",
        async () => {
          const next = dumpAndroidScreen("android-director-reports-modal");
          return isAndroidReportsModal(next.xml) ? next : null;
        },
        20_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-director-reports-modal-timeout"));
    }

    const worksTabNode = findAndroidLabelNode(parseAndroidNodes(reportsModal.xml), ANDROID_LABELS.worksTab);
    let worksScreen = reportsModal;
    let workTabRendered = isAndroidReportsDisciplineView(reportsModal.xml);
    if (worksTabNode && !workTabRendered) {
      tapAndroidBounds(worksTabNode.bounds);
      await sleep(1200);
      worksScreen = await poll(
        "android:director_reports_works",
        async () => {
          const next = dumpAndroidScreen("android-director-reports-works");
          return isAndroidReportsDisciplineView(next.xml) ? next : null;
        },
        25_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-director-reports-works-timeout"));
      workTabRendered = isAndroidReportsDisciplineView(worksScreen.xml);
    }

    if (!worksTabNode) {
      platformSpecificIssues.push("Works tab was not found inside Android reports modal");
    }
    if (!workTabRendered) {
      platformSpecificIssues.push("Works tab content did not render on Android reports modal");
    }

    const recovery = androidHarness.getRecoverySummary();
    return {
      status:
        reportsSurfaceVisible && isAndroidReportsModal(reportsModal.xml) && workTabRendered
          ? "passed"
          : "failed",
      packageName,
      androidPreflight: preflight,
      ...recovery,
      reportsTabOpened: reportsTab.switched,
      reportsHomeVisible: reportsSurfaceVisible,
      reportsModalOpened: isAndroidReportsModal(reportsModal.xml),
      workTabRendered,
      currentXml: current.xmlPath,
      currentPng: current.pngPath,
      reportsXml: reportsHome.xmlPath,
      reportsPng: reportsHome.pngPath,
      modalXml: reportsModal.xmlPath,
      modalPng: reportsModal.pngPath,
      worksXml: worksScreen.xmlPath,
      worksPng: worksScreen.pngPath,
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
    platformSpecificIssues: ["xcrun is available but automated Director Reports iOS runtime is not implemented in this host flow"],
  };
}

async function main() {
  const web = await runWebRuntime().catch((error) =>
    createFailurePlatformResult("web", error, {
      reportsHomeOpened: false,
      reportsModalOpened: false,
      reportScopeRequested: false,
      disciplineScopeRequested: false,
      reportScope200: false,
      disciplineScope200: false,
      reportsControlsRendered: false,
      workTabRendered: false,
    }),
  );
  const android = await runAndroidRuntime().catch((error) => {
    const artifacts = androidHarness.captureFailureArtifacts("android-director-reports-failure");
    return createFailurePlatformResult("android", error, {
      reportsHomeVisible: false,
      reportsModalOpened: false,
      workTabRendered: false,
      ...androidHarness.getRecoverySummary(),
      ...artifacts,
    });
  });
  const ios = runIosRuntime();
  const webRecord = web as Record<string, unknown>;
  const androidRecord = android as Record<string, unknown>;
  const summary = buildRuntimeSummary({
    web,
    android,
    ios,
    scenariosPassed: {
      web: {
        initialOpen: web.reportsHomeOpened === true,
        reportsModal: web.reportsModalOpened === true,
        materialsScope: web.reportScope200 === true,
        disciplineScope: web.disciplineScope200 === true,
        workTab: web.workTabRendered === true,
      },
      android: {
        initialOpen: android.reportsHomeVisible === true,
        reportsModal: android.reportsModalOpened === true,
        workTab: android.workTabRendered === true,
      },
      ios: {
        initialOpen: ios.status === "passed",
        reportsModal: ios.status === "passed",
        workTab: ios.status === "passed",
      },
    },
    artifacts: {
      web: typeof webRecord.screenshot === "string" ? webRecord.screenshot : `${webArtifactBase}.png`,
      android: {
        currentXml: typeof androidRecord.currentXml === "string" ? androidRecord.currentXml : null,
        currentPng: typeof androidRecord.currentPng === "string" ? androidRecord.currentPng : null,
        reportsXml: typeof androidRecord.reportsXml === "string" ? androidRecord.reportsXml : null,
        reportsPng: typeof androidRecord.reportsPng === "string" ? androidRecord.reportsPng : null,
        modalXml: typeof androidRecord.modalXml === "string" ? androidRecord.modalXml : null,
        modalPng: typeof androidRecord.modalPng === "string" ? androidRecord.modalPng : null,
        worksXml: typeof androidRecord.worksXml === "string" ? androidRecord.worksXml : null,
        worksPng: typeof androidRecord.worksPng === "string" ? androidRecord.worksPng : null,
      },
    },
    extra: {
      gate: "director_reports_runtime_verify",
    },
  });

  writeJson(runtimeOutPath, { web, android, ios, summary });
  writeJson(runtimeSummaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
