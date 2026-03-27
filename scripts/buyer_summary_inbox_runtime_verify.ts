import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { createAndroidHarness } from "./_shared/androidHarness";
import { buildRuntimeSummary, createFailurePlatformResult } from "./_shared/runtimeSummary";
import {
  createTempUser as createRuntimeTempUser,
  cleanupTempUser as cleanupRuntimeTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";
import { baseUrl, launchWebRuntime } from "./_shared/webRuntimeHarness";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("buyer-summary-inbox-runtime-verify");

const artifactBase = "artifacts/buyer-summary-inbox-runtime";
const webArtifactBase = "artifacts/buyer-summary-inbox-web-smoke";
const androidDevClientPort = Number(process.env.BUYER_ANDROID_DEV_PORT ?? "8081");

const LABELS = {
  title: "Снабженец",
  inboxTab: "Вход",
  controlTab: "Контроль",
  readyTab: "Готово",
  reworkTab: "Правки",
  subcontractsTab: "Подряды",
  fioPlaceholder: "Фамилия Имя Отчество",
  saveFio: "Сохранить",
  confirmFio: "Подтвердить",
  collapse: "Свернуть",
  rfq: "ТОРГИ",
};

const DEV_LAUNCHER_LABELS = ["Development Build", "DEVELOPMENT SERVERS"];

type TempUser = RuntimeTestUser;

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

type ExpectedInboxGroup = {
  label: string;
  requestId: string;
  requestIdOld: number | null;
  firstItemName: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value as Record<string, unknown>[] : []);

const toText = (value: unknown) => String(value ?? "").trim();

const toMaybeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractCanonicalRequestLabel = (value: string): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";

  const reqMatch = normalized.match(/\bREQ-[A-Z0-9_-]+\/\d{4}\b/i);
  if (reqMatch?.[0]) return reqMatch[0].toUpperCase();

  const slashMatch = normalized.match(/\b\d{1,6}\/\d{4}\b/);
  if (slashMatch?.[0]) return slashMatch[0];

  const requestHashMatch = normalized.match(/\b#\d+\b/);
  if (requestHashMatch?.[0]) return requestHashMatch[0];

  return normalized;
};

async function createTempUser(role: string, fullName: string): Promise<TempUser> {
  return createRuntimeTempUser(admin, {
    role,
    fullName,
    emailPrefix: "buyer.inbox",
  });
}

async function cleanupTempUser(user: TempUser | null) {
  await cleanupRuntimeTempUser(admin, user);
}

async function loadExpectedInboxGroup(): Promise<ExpectedInboxGroup | null> {
  const { data, error } = await admin.rpc("buyer_summary_inbox_scope_v1" as never, {
    p_offset: 0,
    p_limit: 12,
    p_search: null,
    p_company_id: null,
  } as never);
  if (error) throw error;

  const root = asRecord(data);
  const rows = asArray(root.rows);
  const firstRow = rows[0];
  if (!firstRow) return null;

  const requestId = toText(firstRow.request_id);
  const requestIdOld = toMaybeNumber(firstRow.request_id_old);
  const firstItemName = toText(firstRow.name_human) || null;

  let label = "";
  if (requestId) {
    const requestResult = await admin
      .from("requests")
      .select("display_no")
      .eq("id", requestId)
      .maybeSingle();
    if (requestResult.error) throw requestResult.error;
    const displayNo = extractCanonicalRequestLabel(toText(requestResult.data?.display_no));
    if (displayNo) {
      label = displayNo;
    }
  }

  if (!label && requestIdOld != null) {
    label = `#${requestIdOld}`;
  }
  if (!label && requestId) {
    label = `Заявка #${requestId.slice(0, 8)}`;
  }

  return label
    ? {
        label,
        requestId,
        requestIdOld,
        firstItemName,
      }
    : null;
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
      return list.some((needle) => (typeof needle === "string" ? body.includes(needle) : needle.test(body))) ? body : null;
    },
    timeoutMs,
    250,
  );
}

async function loginBuyer(page: import("playwright").Page, user: TempUser) {
  await page.goto(`${baseUrl}/buyer`, { waitUntil: "networkidle" });
  const emailInput = page.locator('input[placeholder="Email"]').first();
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

async function maybeConfirmFio(page: import("playwright").Page): Promise<boolean> {
  const fioInput = page.locator(`input[placeholder="${LABELS.fioPlaceholder}"]`).first();
  const hasVisibleInput = (await fioInput.count()) > 0 && (await fioInput.isVisible().catch(() => false));
  if (!hasVisibleInput) return false;
  await fioInput.fill("Buyer Summary Inbox Smoke");
  const confirm = page.getByText(new RegExp(`${LABELS.saveFio}|${LABELS.confirmFio}`)).first();
  if ((await confirm.count()) > 0) {
    await confirm.click();
  } else {
    await page.locator('button,[role="button"],div[tabindex="0"]').last().click();
  }
  await poll(
    "buyer:fio_modal_closed",
    async () => ((await fioInput.count()) === 0 ? true : null),
    15_000,
    250,
  );
  return true;
}

async function ensureWebInboxSurface(page: import("playwright").Page, expectedLabel: string) {
  const visible = await waitForBody(page, [expectedLabel, /REQ-[A-Z0-9_-]+\/\d{4}/i, /#\d+/], 8_000).catch(() => null);
  if (visible) return visible;

  await page.getByText(LABELS.inboxTab, { exact: false }).first().dispatchEvent("click");
  await sleep(500);
  return await waitForBody(page, [expectedLabel, /REQ-[A-Z0-9_-]+\/\d{4}/i, /#\d+/], 30_000);
}

async function clickWebInboxGroup(page: import("playwright").Page, expectedLabel: string) {
  const clicked = await page.evaluate((label) => {
    const nodes = Array.from(document.querySelectorAll("*"));
    for (const node of nodes) {
      const text = (node.textContent || "").trim();
      if (!text || !text.includes(label)) continue;
      const clickable = node.closest('[tabindex="0"]') as HTMLElement | null;
      if (!clickable) continue;
      clickable.click();
      return true;
    }

    const fallbackPattern = /REQ-[A-Z0-9_-]+\/\d{4}|#\d+/i;
    for (const node of nodes) {
      const text = (node.textContent || "").trim();
      if (!text || !fallbackPattern.test(text)) continue;
      const clickable = node.closest('[tabindex="0"]') as HTMLElement | null;
      if (!clickable) continue;
      clickable.click();
      return true;
    }

    return false;
  }, expectedLabel);

  if (!clicked) {
    throw new Error(`Web buyer inbox group '${expectedLabel}' was not found for click`);
  }
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

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
    const expected = await loadExpectedInboxGroup();
    if (!expected) throw new Error("Buyer inbox scope returned no rows for runtime verification");

    user = await createTempUser(process.env.BUYER_WEB_ROLE || "buyer", "Buyer Summary Inbox Smoke");
    const session = await launchWebRuntime();
    browser = session.browser;
    const page = session.page;
    runtime.console = session.runtime.console;
    runtime.pageErrors = session.runtime.pageErrors;
    runtime.badResponses = session.runtime.badResponses;

    await loginBuyer(page, user);
    await waitForBody(
      page,
      [LABELS.title, LABELS.inboxTab, LABELS.controlTab, LABELS.readyTab, LABELS.reworkTab, LABELS.subcontractsTab, "Представьтесь"],
      45_000,
    );
    const fioConfirmed = await maybeConfirmFio(page);
    await waitForBody(page, [LABELS.title, LABELS.inboxTab, LABELS.controlTab, LABELS.readyTab, LABELS.reworkTab], 30_000);

    const inboxBody = await ensureWebInboxSurface(page, expected.label);

    await clickWebInboxGroup(page, expected.label);
    const sheetBody = await waitForBody(
      page,
      [LABELS.collapse, LABELS.rfq, expected.firstItemName ?? expected.label],
      20_000,
    );

    await page.screenshot({ path: runtime.screenshot, fullPage: true });
    const blockingConsoleErrors = runtime.console.filter(isBlockingWebConsoleError);
    const badResponses = runtime.badResponses.filter((entry) => !entry.url.includes("/favicon"));

    const inboxVisible = inboxBody.includes(expected.label) || /REQ-[A-Z0-9_-]+\/\d{4}/i.test(inboxBody) || /#\d+/.test(inboxBody);

    const result = {
      status:
        inboxVisible &&
        sheetBody.includes(LABELS.collapse) &&
        (sheetBody.includes(LABELS.rfq) || (expected.firstItemName ? sheetBody.includes(expected.firstItemName) : true)) &&
        blockingConsoleErrors.length === 0 &&
        runtime.pageErrors.length === 0 &&
        badResponses.length === 0
          ? "passed"
          : "failed",
      fioConfirmed,
      expectedGroupLabel: expected.label,
      inboxVisible,
      sheetOpened: sheetBody.includes(LABELS.collapse),
      firstItemVisible: expected.firstItemName ? sheetBody.includes(expected.firstItemName) : true,
      consoleErrorsEmpty: blockingConsoleErrors.length === 0,
      pageErrorsEmpty: runtime.pageErrors.length === 0,
      badResponsesEmpty: badResponses.length === 0,
      screenshot: runtime.screenshot,
      platformSpecificIssues: blockingConsoleErrors.map((entry) => entry.text),
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

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

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

const startAndroidBuyerRoute = (packageName: string | null) => {
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://buyer"];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const buildAndroidDevClientDeepLink = (port: number) =>
  `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;

const ensureAndroidReverseProxy = (port: number) => {
  execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const resetAndroidAppState = (packageName: string | null) => {
  if (!packageName) return;
  execFileSync("adb", ["shell", "am", "force-stop", packageName], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  execFileSync("adb", ["shell", "pm", "clear", packageName], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const startAndroidDevClientProject = (packageName: string | null, port: number) => {
  const args = [
    "shell",
    "am",
    "start",
    "-S",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    buildAndroidDevClientDeepLink(port),
  ];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidFioInputNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className),
  );

const findAndroidFioActionNode = (nodes: AndroidNode[]): AndroidNode | null => {
  const labeled = findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      /Сохранить|Подтвердить/i.test(`${node.text} ${node.contentDesc}`),
  );
  if (labeled) return labeled;

  return (
    findAndroidNode(nodes, (node) => {
      if (!node.clickable || !node.enabled) return false;
      const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!raw) return false;
      const top = Number(raw[2]);
      const width = Number(raw[3]) - Number(raw[1]);
      return top >= 1200 && width >= 500;
    }) ?? null
  );
};

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Войти|Login/i.test(xml);

const isAndroidBuyerHome = (xml: string) =>
  matchesAndroidLabel(xml, [LABELS.inboxTab, LABELS.controlTab, LABELS.readyTab, LABELS.reworkTab]);

const isAndroidDevLauncherHome = (xml: string) =>
  DEV_LAUNCHER_LABELS.every((label) => xml.includes(label));

const isAndroidDevLauncherErrorScreen = (xml: string) =>
  xml.includes("There was a problem loading the project.") ||
  xml.includes("This development build encountered the following error.");

const isAndroidDevMenuIntroScreen = (xml: string) =>
  xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");

const isAndroidFioModal = (xml: string) =>
  xml.includes(LABELS.fioPlaceholder) || xml.includes("Представьтесь") || xml.includes("Подтвердите ФИО");

const isAndroidInboxSurface = (xml: string, expectedLabel: string) =>
  (expectedLabel.trim().length > 0 && xml.includes(expectedLabel)) || /REQ-[A-Z0-9_-]+\/\d{4}/i.test(xml) || /#\d+/.test(xml);

const isAndroidBuyerRenderableScreen = (xml: string) =>
  isAndroidLoginScreen(xml) || isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "");

const isAndroidInboxSheet = (xml: string, expected: ExpectedInboxGroup) =>
  xml.includes(LABELS.collapse) &&
  (xml.includes(LABELS.rfq) || (expected.firstItemName ? xml.includes(expected.firstItemName) : xml.includes(expected.label)));

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

const findAndroidInboxGroupNode = (nodes: AndroidNode[], expectedLabel: string): AndroidNode | null => {
  const exact = findAndroidNode(nodes, (node) => {
    const label = `${node.contentDesc} ${node.text}`.trim();
    return node.clickable && node.enabled && label.includes(expectedLabel);
  });
  if (exact) return exact;

  return (
    findAndroidNode(nodes, (node) => {
      const label = `${node.contentDesc} ${node.text}`.trim();
      if (!node.clickable || !node.enabled || !label) return false;
      if (!/REQ-[A-Z0-9_-]+\/\d{4}/i.test(label) && !/#\d+/.test(label) && !/Заявка #/i.test(label)) return false;
      const raw = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!raw) return false;
      const top = Number(raw[2]);
      const bottom = Number(raw[4]);
      return top >= 500 && bottom <= 2200;
    }) ?? null
  );
};

const findAndroidDevServerNode = (nodes: AndroidNode[], preferredPort: number): AndroidNode | null => {
  const candidates = nodes
    .filter((node) => node.enabled && /http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):\d+/i.test(node.text))
    .sort((left, right) => {
      const leftPort = Number(left.text.match(/:(\d+)/)?.[1] ?? 0);
      const rightPort = Number(right.text.match(/:(\d+)/)?.[1] ?? 0);
      if (leftPort === preferredPort && rightPort !== preferredPort) return -1;
      if (rightPort === preferredPort && leftPort !== preferredPort) return 1;
      return rightPort - leftPort;
    });
  return candidates[0] ?? null;
};

const dismissAndroidDevMenuIntro = (xml: string) => {
  const nodes = parseAndroidNodes(xml);
  const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close/i.test(`${node.text} ${node.contentDesc}`));
  if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;

  const continueNode = findAndroidNode(
    nodes,
    (node) => node.enabled && /Continue/i.test(`${node.text} ${node.contentDesc}`),
  );
  if (continueNode && tapAndroidBounds(continueNode.bounds)) return true;

  execFileSync("adb", ["shell", "input", "keyevent", "4"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

async function ensureAndroidDevClientLoaded(packageName: string | null, port: number) {
  ensureAndroidReverseProxy(port);
  startAndroidDevClientProject(packageName, port);

  let screen = await poll(
    "android:buyer_dev_client_loaded",
    async () => {
      await sleep(2500);
      const next = dumpAndroidScreen("android-buyer-summary-inbox-dev-client-loading");
      if (isAndroidDevMenuIntroScreen(next.xml)) {
        dismissAndroidDevMenuIntro(next.xml);
        return null;
      }
      if (isAndroidBuyerRenderableScreen(next.xml)) return next;
      if (isAndroidDevLauncherHome(next.xml)) return next;
      if (isAndroidDevLauncherErrorScreen(next.xml)) {
        const compactError = next.xml.replace(/\s+/g, " ").slice(0, 2000);
        throw new Error(`android dev client error screen: ${compactError}`);
      }
      return null;
    },
    180_000,
    2500,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!isAndroidDevLauncherHome(screen.xml)) return screen;
    const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml), port);
    if (!serverNode) return screen;
    tapAndroidBounds(serverNode.bounds);
    screen = await poll(
      "android:buyer_dev_client_reloaded",
      async () => {
        await sleep(2500);
        const next = dumpAndroidScreen(`android-buyer-summary-inbox-dev-client-${attempt + 1}`);
        if (isAndroidDevMenuIntroScreen(next.xml)) {
          dismissAndroidDevMenuIntro(next.xml);
          return null;
        }
        if (isAndroidBuyerRenderableScreen(next.xml)) return next;
        if (isAndroidDevLauncherErrorScreen(next.xml)) {
          const compactError = next.xml.replace(/\s+/g, " ").slice(0, 2000);
          throw new Error(`android dev client error screen: ${compactError}`);
        }
        return isAndroidDevLauncherHome(next.xml) ? next : null;
      },
      180_000,
      2500,
    );
  }

  return screen;
}

async function dismissAndroidDevMenuIfPresent(
  current: ReturnType<typeof dumpAndroidScreen>,
  artifactBase: string,
) {
  if (!isAndroidDevMenuIntroScreen(current.xml) && !androidHarness.isAndroidFullDevMenuScreen(current.xml)) {
    return current;
  }
  if (isAndroidDevMenuIntroScreen(current.xml)) {
    dismissAndroidDevMenuIntro(current.xml);
  } else {
    androidHarness.pressAndroidKey(4);
  }
  return await poll(
    `android:${artifactBase}:dev_menu_closed`,
    async () => {
      const next = dumpAndroidScreen(`${artifactBase}-dev-menu-closed`);
      if (isAndroidDevMenuIntroScreen(next.xml) || androidHarness.isAndroidFullDevMenuScreen(next.xml)) return null;
      return next;
    },
    15_000,
    1000,
  ).catch(() => dumpAndroidScreen(`${artifactBase}-dev-menu-timeout`));
}

async function settleAndroidBuyerRoute(
  packageName: string | null,
  current: ReturnType<typeof dumpAndroidScreen>,
  artifactBase: string,
) {
  let screen = await androidHarness.dismissAndroidInterruptions(current, `${artifactBase}-interrupt`);
  screen = await dismissAndroidDevMenuIfPresent(screen, artifactBase);
  if (
    isAndroidDevLauncherHome(screen.xml) ||
    androidHarness.isAndroidLauncherHome(screen.xml) ||
    androidHarness.isAndroidBlankAppSurface(screen.xml)
  ) {
    screen = await androidHarness.openAndroidRoute({
      packageName,
      routes: ["rik://buyer", "rik:///buyer", "rik:///%28tabs%29/buyer"],
      artifactBase,
      predicate: (xml) => isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
      renderablePredicate: (xml) =>
        isAndroidLoginScreen(xml) || isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
      timeoutMs: 30_000,
      delayMs: 1200,
    });
    screen = await androidHarness.dismissAndroidInterruptions(screen, `${artifactBase}-settled-interrupt`);
    screen = await dismissAndroidDevMenuIfPresent(screen, `${artifactBase}-settled`);
  }
  return screen;
}

async function confirmAndroidBuyerFio(current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  if (!isAndroidFioModal(screen.xml)) {
    return { screen, fioConfirmed: false };
  }

  const inputNode = findAndroidFioInputNode(parseAndroidNodes(screen.xml));
  if (!inputNode) {
    throw new Error("Android buyer FIO confirmation controls were not found");
  }

  tapAndroidBounds(inputNode.bounds);
  await sleep(400);
  androidHarness.typeAndroidText("Buyer Inbox Android");
  await sleep(500);
  execFileSync("adb", ["shell", "input", "keyevent", "4"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(500);

  const confirmScreen = await poll(
    "android:buyer_fio_confirm_button",
    async () => {
      const next = dumpAndroidScreen("android-buyer-summary-inbox-fio-filled");
      return findAndroidFioActionNode(parseAndroidNodes(next.xml)) ? next : null;
    },
    10_000,
    750,
  ).catch(() => dumpAndroidScreen("android-buyer-summary-inbox-fio-filled-timeout"));
  const confirmNode = findAndroidFioActionNode(parseAndroidNodes(confirmScreen.xml));
  if (!confirmNode) {
    throw new Error("Android buyer FIO confirmation action did not become available after input");
  }

  tapAndroidBounds(confirmNode.bounds);
  await sleep(1200);

  screen = await poll(
    "android:buyer_fio_confirmed",
    async () => {
      const next = dumpAndroidScreen("android-buyer-summary-inbox-after-fio");
      return isAndroidFioModal(next.xml) ? null : next;
    },
    20_000,
    1000,
  );

  return { screen, fioConfirmed: true };
}

async function loginBuyerAndroid(user: TempUser, packageName: string | null) {
  writeArtifact("artifacts/android-buyer-summary-inbox-user.json", user);
  let current = await androidHarness.loginAndroidWithProtectedRoute({
    packageName,
    user,
    protectedRoute: "rik://buyer",
    artifactBase: "android-buyer-summary-inbox",
    successPredicate: (xml) => isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
    renderablePredicate: (xml) =>
      isAndroidLoginScreen(xml) || isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
    loginScreenPredicate: isAndroidLoginScreen,
  });
  current = await dismissAndroidDevMenuIfPresent(current, "android-buyer-summary-inbox");
  if (false) {
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
        /Пароль|password/i.test(`${node.text} ${node.hint}`),
    );
    const loginNode = findAndroidNode(
      nodes,
      (node) => node.clickable && node.enabled && /Войти|Login/i.test(`${node.text} ${node.contentDesc}`),
    );

    if (!emailNode || !passwordNode || !loginNode) {
      throw new Error("Android buyer login controls were not found");
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

    execFileSync("adb", ["shell", "input", "keyevent", "4"], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    await sleep(400);
    tapAndroidBounds(loginNode.bounds);
    await sleep(300);
    execFileSync("adb", ["shell", "input", "keyevent", "66"], {
      cwd: projectRoot,
      stdio: "pipe",
    });

    current = await poll(
      "android:buyer_login_complete",
      async () => {
        await sleep(1400);
        const screen = dumpAndroidScreen("android-buyer-summary-inbox-after-login");
        if (isAndroidLoginScreen(screen.xml)) {
          const retryLoginNode = findAndroidNode(
            parseAndroidNodes(screen.xml),
            (node) => node.clickable && node.enabled && /Р’РѕР№С‚Рё|Login/i.test(`${node.text} ${node.contentDesc}`),
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
      60_000,
      1200,
    );
  }

  if (isAndroidBuyerHome(current.xml) || isAndroidInboxSurface(current.xml, "") || isAndroidFioModal(current.xml)) {
    return dismissAndroidDevMenuIfPresent(current, "android-buyer-summary-inbox");
  }

  current = await androidHarness
    .openAndroidRoute({
      packageName,
      routes: ["rik://buyer", "rik:///buyer", "rik:///%28tabs%29/buyer"],
      artifactBase: "android-buyer-summary-inbox-route",
      predicate: (xml) => isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
      renderablePredicate: (xml) =>
        isAndroidLoginScreen(xml) || isAndroidBuyerHome(xml) || isAndroidInboxSurface(xml, "") || isAndroidFioModal(xml),
      loginScreenPredicate: isAndroidLoginScreen,
      timeoutMs: 30_000,
      delayMs: 1200,
    })
    .catch(() => dumpAndroidScreen("android-buyer-summary-inbox-route-timeout"));
  return dismissAndroidDevMenuIfPresent(current, "android-buyer-summary-inbox");
}

async function ensureAndroidInboxTab(current: ReturnType<typeof dumpAndroidScreen>, expected: ExpectedInboxGroup) {
  let screen = await dismissAndroidDevMenuIfPresent(current, "android-buyer-summary-inbox-tab");
  if (isAndroidInboxSurface(screen.xml, expected.label)) {
    return { screen, inboxTabOpened: true, issue: null as string | null };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    screen = await dismissAndroidDevMenuIfPresent(screen, `android-buyer-summary-inbox-tab-${attempt + 1}`);
    const tab = findAndroidTopTab(parseAndroidNodes(screen.xml), [LABELS.inboxTab]);
    if (!tab) {
      return {
        screen,
        inboxTabOpened: false,
        issue: "Inbox top tab was not found on Android buyer screen",
      };
    }

    tapAndroidBounds(tab.bounds);
    await sleep(1200);

    try {
      screen = await poll(
        `android:buyer_inbox_tab:${attempt + 1}`,
        async () => {
          const next = dumpAndroidScreen(`android-buyer-summary-inbox-tab-${attempt + 1}`);
          return isAndroidInboxSurface(next.xml, expected.label) ? next : null;
        },
        20_000,
        1000,
      );
    } catch {
      screen = dumpAndroidScreen(`android-buyer-summary-inbox-tab-${attempt + 1}-timeout`);
    }

    if (isAndroidInboxSurface(screen.xml, expected.label)) {
      return { screen, inboxTabOpened: true, issue: null as string | null };
    }
  }

  return {
    screen,
    inboxTabOpened: false,
    issue: "Inbox tab did not show buyer request groups on Android",
  };
}

async function runAndroidRuntime(): Promise<Record<string, unknown>> {
  let user: TempUser | null = null;
  let devClient: { cleanup: () => void } | null = null;
  try {
    const expected = await loadExpectedInboxGroup();
    if (!expected) throw new Error("Buyer inbox scope returned no rows for Android runtime verification");

    const prepared = await androidHarness.prepareAndroidRuntime();
    devClient = prepared.devClient;
    const packageName = prepared.packageName;
    const preflight = prepared.preflight;
    user = await createTempUser(process.env.BUYER_WEB_ROLE || "buyer", "Buyer Summary Inbox Android");
    let current = await loginBuyerAndroid(user, packageName);
    const platformSpecificIssues: string[] = [];

    const fioResult = await confirmAndroidBuyerFio(current);
    current = await dismissAndroidDevMenuIfPresent(fioResult.screen, "android-buyer-summary-inbox-post-fio");

    if (!isAndroidBuyerHome(current.xml) && !isAndroidInboxSurface(current.xml, expected.label)) {
      current = await poll(
        "android:buyer_home_visible",
        async () => {
          const next = await settleAndroidBuyerRoute(
            packageName,
            dumpAndroidScreen("android-buyer-summary-inbox-home"),
            "android-buyer-summary-inbox-home",
          );
          return isAndroidBuyerHome(next.xml) || isAndroidInboxSurface(next.xml, expected.label) ? next : null;
        },
        20_000,
        1000,
      ).catch(() => dumpAndroidScreen("android-buyer-summary-inbox-home-timeout"));
    }

    const inbox = await ensureAndroidInboxTab(current, expected);
    let workingScreen = inbox.screen;
    if (inbox.issue) {
      platformSpecificIssues.push(inbox.issue);
    }

    const inboxVisible = isAndroidInboxSurface(workingScreen.xml, expected.label);
    if (!inboxVisible) {
      platformSpecificIssues.push("Buyer inbox request groups were not visible after Android route/tab flow");
    }

    let sheetOpened = false;
    let openedGroupLabel: string | null = null;
    let modal = workingScreen;
    if (inboxVisible && isAndroidInboxSheet(workingScreen.xml, expected)) {
      sheetOpened = true;
      openedGroupLabel = expected.label;
    } else if (inboxVisible) {
      const groupNode = findAndroidInboxGroupNode(parseAndroidNodes(workingScreen.xml), expected.label);
      if (groupNode) {
        openedGroupLabel = `${groupNode.contentDesc} ${groupNode.text}`.trim() || expected.label;
        tapAndroidBounds(groupNode.bounds);
        await sleep(1200);
        modal = await poll(
          "android:buyer_inbox_sheet",
          async () => {
            const next = dumpAndroidScreen("android-buyer-summary-inbox-sheet");
            return isAndroidInboxSheet(next.xml, expected) ? next : null;
          },
          20_000,
          1000,
        ).catch(() => dumpAndroidScreen("android-buyer-summary-inbox-sheet-timeout"));
        sheetOpened = isAndroidInboxSheet(modal.xml, expected);
      }
    }

    if (!sheetOpened) {
      platformSpecificIssues.push("Buyer inbox sheet did not open on Android after tapping the first request group");
    }

    const recovery = androidHarness.getRecoverySummary();
    return {
      status: inboxVisible && sheetOpened ? "passed" : "failed",
      androidPreflight: preflight,
      ...recovery,
      fioConfirmed: fioResult.fioConfirmed,
      inboxTabOpened: inbox.inboxTabOpened,
      expectedGroupLabel: expected.label,
      inboxVisible,
      sheetOpened,
      openedGroupLabel,
      currentXml: current.xmlPath,
      currentPng: current.pngPath,
      inboxXml: workingScreen.xmlPath,
      inboxPng: workingScreen.pngPath,
      sheetXml: modal.xmlPath,
      sheetPng: modal.pngPath,
      platformSpecificIssues,
    };
  } finally {
    await cleanupTempUser(user);
    devClient?.cleanup();
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
    platformSpecificIssues: ["xcrun is available but automated Buyer Summary Inbox iOS runtime is not implemented in this host flow"],
  };
}

async function main() {
  const web = await runWebRuntime().catch((error) =>
    createFailurePlatformResult("web", error, {
      inboxVisible: false,
      sheetOpened: false,
    }),
  );
  const android = await runAndroidRuntime().catch((error) => {
    const artifacts = androidHarness.captureFailureArtifacts("android-buyer-summary-inbox-failure");
    return createFailurePlatformResult("android", error, {
      inboxVisible: false,
      sheetOpened: false,
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
        initialOpen: web.inboxVisible === true,
        inboxSurface: web.inboxVisible === true,
        sheetInteraction: web.sheetOpened === true,
      },
      android: {
        initialOpen: android.inboxVisible === true,
        inboxSurface: android.inboxVisible === true,
        sheetInteraction: android.sheetOpened === true,
      },
      ios: {
        initialOpen: ios.status === "passed",
        inboxSurface: ios.status === "passed",
        sheetInteraction: ios.status === "passed",
      },
    },
    artifacts: {
      webSummary: `${webArtifactBase}.summary.json`,
      webRuntime: `${webArtifactBase}.json`,
      androidCurrentXml: typeof androidRecord.currentXml === "string" ? androidRecord.currentXml : null,
      androidCurrentPng: typeof androidRecord.currentPng === "string" ? androidRecord.currentPng : null,
      androidInboxXml: typeof androidRecord.inboxXml === "string" ? androidRecord.inboxXml : null,
      androidInboxPng: typeof androidRecord.inboxPng === "string" ? androidRecord.inboxPng : null,
      androidSheetXml: typeof androidRecord.sheetXml === "string" ? androidRecord.sheetXml : null,
      androidSheetPng: typeof androidRecord.sheetPng === "string" ? androidRecord.sheetPng : null,
    },
    extra: {
      gate: "buyer_summary_inbox_runtime_verify",
      subscriptionStarted: null,
      eventReceived: null,
      refreshTriggered: null,
      doubleFetchDetected: null,
      inflightGuardWorked: null,
      recentGuardWorked: null,
      backendOwnerPreserved: null,
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
