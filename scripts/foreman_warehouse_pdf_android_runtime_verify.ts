import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { config as loadDotenv } from "dotenv";

import { createAndroidHarness } from "./_shared/androidHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const admin = createVerifierAdmin("foreman-warehouse-pdf-android-runtime-verify");
const appPackage = "com.azisbek_dzhantaev.rikexpoapp";
const androidDevClientPort = Number(process.env.FOREMAN_WAREHOUSE_ANDROID_DEV_PORT ?? "8081");
const FOREMAN_MATERIALS_LABEL = "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b";
const FOREMAN_SUBCONTRACTS_LABEL = "\u043f\u043e\u0434\u0440\u044f\u0434\u044b";
const WAREHOUSE_REPORTS_LABEL = "\u043e\u0442\u0447\u0451\u0442\u044b";
const WAREHOUSE_ISSUE_LABEL = "\u0432\u044b\u0434\u0430\u0447\u0430";
const WAREHOUSE_INCOMING_LABEL = "\u043f\u0440\u0438\u0445\u043e\u0434";
const WAREHOUSE_STOCK_FACT_LABEL = "\u0441\u043a\u043b\u0430\u0434 \u0444\u0430\u043a\u0442";
const WAREHOUSE_EXPENSE_LABEL = "\u0440\u0430\u0441\u0445\u043e\u0434";

const harness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
  devClientStdoutPath: `artifacts/expo-dev-client-${androidDevClientPort}.stdout.log`,
  devClientStderrPath: `artifacts/expo-dev-client-${androidDevClientPort}.stderr.log`,
});

type AndroidScreen = {
  xmlPath: string;
  pngPath: string;
  xml: string;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  bounds: string;
  hint: string;
  password: boolean;
};

type RoleProof = {
  status: "GREEN" | "NOT_GREEN";
  role: "foreman" | "warehouse";
  documentPath: string;
  checkedAt: string;
  preflight: unknown;
  finalXml: string | null;
  finalPng: string | null;
  finalScreenPackage: string | null;
  topActivity: string;
  processAlive: boolean;
  fatalExceptionLogged: boolean;
  sourceKindRemoteUrl: boolean;
  signedUrlSeen: boolean;
  eventCounts: Record<string, number>;
  metroExcerpt: string[];
  logcatExcerpt: string[];
  extra: Record<string, unknown>;
  error?: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 45_000,
  delayMs = 700,
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

function writeJson(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function adb(args: string[], encoding: BufferEncoding | "buffer" = "utf8") {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: encoding === "buffer" ? undefined : encoding,
    timeout: 45_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "").trim()}`);
  }
  return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
}

function tryAdb(args: string[]) {
  try {
    return String(adb(args));
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message?: unknown }).message ?? "");
    }
    return "";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "unknown error");
}

function readRelativeText(relativePath: string) {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function readCombinedDevLogs() {
  const logPaths = harness.getDevClientLogPaths();
  return {
    stdoutPath: logPaths.stdoutPath,
    stderrPath: logPaths.stderrPath,
    text: [readRelativeText(logPaths.stdoutPath), readRelativeText(logPaths.stderrPath)].filter(Boolean).join("\n"),
  };
}

function readLogDelta(baselineLength: number) {
  const combined = readCombinedDevLogs();
  const text = combined.text;
  return text.length <= baselineLength ? "" : text.slice(baselineLength);
}

function countToken(source: string, token: string) {
  if (!token) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const found = source.indexOf(token, index);
    if (found < 0) return count;
    count += 1;
    index = found + token.length;
  }
}

function buildRelevantLogExcerpt(source: string) {
  return String(source || "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        /payload_ready|backend_invoke_start|backend_invoke_success|signed_url_received|viewer_open_start|about_to_navigate_to_viewer|\[pdf-viewer\]|\[pdf-document-actions\]/i.test(
          line,
        ),
    )
    .slice(-80);
}

function buildRelevantLogcatExcerpt(source: string) {
  return String(source || "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        /FATAL EXCEPTION|AndroidRuntime|pdf-viewer|pdf-document-actions|pdf-runner|payload_ready|backend_invoke_start|backend_invoke_success|signed_url_received|viewer_open_start|mobile_native_handoff|foreman|warehouse/i.test(
          line,
        ),
    )
    .slice(-80);
}

function hasAllTokens(source: string, tokens: string[]) {
  return tokens.every((token) => source.includes(token));
}

function getTopActivity() {
  return tryAdb(["shell", "dumpsys", "activity", "top"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /ResumedActivity|topResumedActivity|PdfViewerActivity|chrome|docs|browser/i.test(line))
    ?? "";
}

function getProcessAlive() {
  return Boolean(tryAdb(["shell", "pidof", appPackage]).trim());
}

function getScreenPackage(xml: string) {
  const match = xml.match(/package="([^"]+)"/);
  return match ? match[1] : null;
}

function findNode(nodes: AndroidNode[], predicate: (node: AndroidNode) => boolean) {
  return (
    nodes.find((node) => predicate(node) && node.enabled && node.clickable)
    ?? nodes.find((node) => predicate(node) && node.enabled)
    ?? null
  );
}

function parseBounds(bounds: string) {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
  };
}

function hasUsableBounds(bounds: string, minSize = 24) {
  const parsed = parseBounds(bounds);
  if (!parsed) return false;
  return parsed.right > parsed.left + minSize && parsed.bottom > parsed.top + minSize;
}

function labelOf(node: AndroidNode) {
  return `${String(node.text || "")} ${String(node.contentDesc || "")} ${String(node.hint || "")} ${String(node.resourceId || "")}`.trim();
}

function normalizeUiText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function containsUiText(source: unknown, ...needles: string[]) {
  const normalizedSource = normalizeUiText(source);
  return needles.some((needle) => {
    const normalizedNeedle = normalizeUiText(needle);
    return normalizedNeedle ? normalizedSource.includes(normalizedNeedle) : false;
  });
}

function matchesNodeText(node: AndroidNode, ...needles: string[]) {
  return containsUiText(labelOf(node), ...needles);
}

function dumpScreen(name: string): AndroidScreen {
  return harness.dumpAndroidScreen(name);
}

function isLoginScreen(xml: string) {
  return /Email/i.test(xml) && /(Войти|Login)/i.test(xml);
}

function isFioModal(xml: string) {
  return /(Представьтесь|Подтвердите ФИО|Фамилия Имя Отчество)/i.test(xml);
}

function isForemanHome(xml: string) {
  return containsUiText(xml, "\u0437\u0430\u044f\u0432\u043a\u0430", FOREMAN_MATERIALS_LABEL, FOREMAN_SUBCONTRACTS_LABEL);
}

function isWarehouseHome(xml: string) {
  return containsUiText(
    xml,
    "\u043a \u043f\u0440\u0438\u0445\u043e\u0434\u0443",
    WAREHOUSE_STOCK_FACT_LABEL,
    WAREHOUSE_EXPENSE_LABEL,
    WAREHOUSE_REPORTS_LABEL,
  );
}

function isWarehouseReportsChoice(xml: string) {
  return (
    containsUiText(xml, "warehouse-reports-mode-issue", "warehouse-reports-mode-incoming")
    || (
      containsUiText(xml, "\u043e\u0442\u0447\u0451\u0442\u044b", WAREHOUSE_ISSUE_LABEL, WAREHOUSE_INCOMING_LABEL)
      && !containsUiText(xml, "warehouse-tab-incoming", "warehouse-tab-stock", "warehouse-tab-issue", "warehouse-tab-reports")
    )
  );
}

function isWarehouseDayList(xml: string) {
  return /\d{2}\.\d{2}\.\d{4}/.test(xml) || containsUiText(xml, "\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432:");
}

function isWarehouseRecipientModal(xml: string) {
  return containsUiText(
    xml,
    "\u043a\u0442\u043e \u043f\u043e\u043b\u0443\u0447\u0430\u0435\u0442",
    "\u043f\u043e\u0438\u0441\u043a \u0438\u043b\u0438 \u043d\u043e\u0432\u044b\u0439 \u0444\u0438\u043e",
    "\u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437 \u0441\u043f\u0438\u0441\u043a\u0430 \u0438\u043b\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u0432\u043e\u0435",
  );
}

function isProfileScreen(xml: string) {
  return containsUiText(xml, "profile-edit-open", "\u043f\u0440\u043e\u0444\u0438\u043b\u044c", "identity", "access summary");
}

function isExternalPdfSurface(xml: string, topActivity: string) {
  return (
    /package="com\.google\.android\.apps\.docs"|package="com\.android\.chrome"|package="com\.google\.android\.apps\.chrome"/i.test(
      xml,
    )
    || /PdfViewerActivity|chrome|docs/i.test(topActivity)
  );
}

function tapMatching(screen: AndroidScreen, label: string, matcher: (node: AndroidNode) => boolean) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  const node = findNode(nodes, matcher);
  if (!node) {
    throw new Error(`${label} node not found`);
  }
  harness.tapAndroidBounds(node.bounds);
  return node;
}

function findFirstDayNode(screen: AndroidScreen) {
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  return findNode(
    nodes,
    (node) =>
      /\d{2}\.\d{2}\.\d{4}/.test(labelOf(node))
      || matchesNodeText(node, "\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432:"),
  );
}

function findWarehouseRecipientCandidate(nodes: AndroidNode[], preferredLabel?: string | null) {
  const preferred = normalizeUiText(preferredLabel);
  if (preferred) {
    const directMatch = findNode(
      nodes,
      (node) =>
        node.clickable
        && node.enabled
        && containsUiText(labelOf(node), preferred),
    );
    if (directMatch) return directMatch;
  }

  const excluded = /^(warehouse-fio-|assistant_fab|warehouse-tab-|warehouse-reports-mode-|warehouse-day-|warehouse-report-day:|warehouse-report-pdf:|mainactivity|back|find|more options)$/i;
  return (
    findNode(
      nodes,
      (node) => {
        if (!node.clickable || !node.enabled) return false;
        const label = labelOf(node);
        if (!label || excluded.test(label)) return false;
        const bounds = parseBounds(node.bounds);
        if (!bounds) return false;
        const width = bounds.right - bounds.left;
        return bounds.top >= 760 && bounds.bottom <= 2050 && width >= 320;
      },
    ) ?? null
  );
}

async function confirmWarehouseRecipientIfPresent(
  current: AndroidScreen,
  artifactBase: string,
  preferredLabel?: string | null,
): Promise<AndroidScreen> {
  if (!isWarehouseRecipientModal(current.xml)) return current;

  const candidate = await poll(
    `${artifactBase}:recipient-option`,
    async () => {
      const next = dumpScreen(`${artifactBase}-recipient-ready`);
      const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
      const optionNode = findWarehouseRecipientCandidate(nextNodes, preferredLabel);
      return optionNode ? { next, optionNode } : null;
    },
    20_000,
    800,
  );

  harness.tapAndroidBounds(candidate.optionNode.bounds);
  await sleep(1200);

  return await poll(
    `${artifactBase}:recipient-closed`,
    async () => {
      const next = dumpScreen(`${artifactBase}-recipient-after-confirm`);
      return isWarehouseRecipientModal(next.xml) ? null : next;
    },
    30_000,
    1000,
  );
}

function hasAndroidPdfSuccessChain(logSource: string) {
  const requiredBaseTokens = [
    "payload_ready",
    "backend_invoke_start",
    "backend_invoke_success",
    "signed_url_received",
    "[pdf-viewer] viewer_route_mounted",
    "[pdf-viewer] native_handoff_start",
  ];
  if (!hasAllTokens(logSource, requiredBaseTokens)) return false;
  return (
    logSource.includes("[pdf-viewer] native_handoff_ready")
    || logSource.includes("[pdf-runner] android_view_intent_start")
    || logSource.includes("[pdf-runner] android_remote_pdf_open_start")
  );
}

function extractAndroidPdfEventCounts(logSource: string) {
  return {
    payload_ready: countToken(logSource, "payload_ready"),
    backend_invoke_start: countToken(logSource, "backend_invoke_start"),
    backend_invoke_success: countToken(logSource, "backend_invoke_success"),
    signed_url_received: countToken(logSource, "signed_url_received"),
    viewer_route_mounted: countToken(logSource, "[pdf-viewer] viewer_route_mounted"),
    native_handoff_start: countToken(logSource, "[pdf-viewer] native_handoff_start"),
    native_handoff_ready: countToken(logSource, "[pdf-viewer] native_handoff_ready"),
    android_remote_pdf_open_start: countToken(logSource, "[pdf-runner] android_remote_pdf_open_start"),
    android_view_intent_start: countToken(logSource, "[pdf-runner] android_view_intent_start"),
  };
}

function hasRemoteUrlProof(logSource: string) {
  return (
    /sourceKind["': ]+remote-url/i.test(logSource)
    || (
      /https:\/\/[^\s'"]+/i.test(logSource)
      && (
        logSource.includes("signed_url_received")
        || logSource.includes("history_descriptor_ready")
        || logSource.includes("[pdf-document-actions] prepare_ready")
      )
    )
  );
}

function hasSignedUrlProof(logSource: string) {
  return (
    /https:\/\/[^\s'"]+/i.test(logSource)
    && (
      logSource.includes("signed_url_received")
      || logSource.includes("history_descriptor_ready")
      || logSource.includes("[pdf-document-actions] prepare_ready")
    )
  );
}

function hasAppFatalException(logSource: string) {
  return /FATAL EXCEPTION[\s\S]{0,1200}Process:\s*com\.azisbek_dzhantaev\.rikexpoapp/i.test(logSource);
}

function matchesWarehouseDayTopAction(node: AndroidNode, kind: "register" | "materials") {
  if (!node.clickable || !node.enabled) return false;
  const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return false;

  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);

  if (top < 360 || top > 620 || bottom < 420 || bottom > 640) return false;

  if (kind === "register") {
    return left >= 760 && left <= 840 && right >= 860 && right <= 930;
  }

  return left >= 880 && left <= 960 && right >= 980 && right <= 1045;
}

async function confirmFioIfPresent(
  current: AndroidScreen,
  artifactBase: string,
  expectedFio: string,
): Promise<AndroidScreen> {
  if (!isFioModal(current.xml)) return current;

  let screen = current;
  const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
  const inputNode =
    findNode(
      nodes,
      (node) =>
        node.resourceId === "warehouse-fio-input"
        || /android\.widget\.EditText/i.test(node.className),
    )
    ?? null;

  if (inputNode) {
    await harness.replaceAndroidFieldText(inputNode, expectedFio);
    adb(["shell", "input", "keyevent", "4"]);
    await sleep(700);
    screen = dumpScreen(`${artifactBase}-fio-filled`);
  }

  const readyToConfirm = await poll(
    `${artifactBase}:fio-confirm`,
    async () => {
      const next = dumpScreen(`${artifactBase}-fio-confirm-ready`);
      const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
      const nextConfirm = findNode(
        nextNodes,
        (node) =>
          node.resourceId === "warehouse-fio-confirm"
          || /confirm|save/i.test(labelOf(node)),
      ) ?? findNode(
        nextNodes,
        (node) => {
          const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
          if (!match || !node.clickable || !node.enabled) return false;
          const left = Number(match[1]);
          const top = Number(match[2]);
          const right = Number(match[3]);
          const bottom = Number(match[4]);
          return left <= 140 && top >= 1300 && right >= 900 && bottom <= 1600;
        },
      );
      return nextConfirm ? next : null;
    },
    20_000,
    800,
  );

  const readyNodes = harness.parseAndroidNodes(readyToConfirm.xml) as AndroidNode[];
  const confirmNode =
    findNode(
      readyNodes,
      (node) =>
        node.resourceId === "warehouse-fio-confirm"
        || /confirm|save/i.test(labelOf(node)),
    ) ?? findNode(
      readyNodes,
      (node) => {
        const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (!match || !node.clickable || !node.enabled) return false;
        const left = Number(match[1]);
        const top = Number(match[2]);
        const right = Number(match[3]);
        const bottom = Number(match[4]);
        return left <= 140 && top >= 1300 && right >= 900 && bottom <= 1600;
      },
    );
  if (!confirmNode) {
    throw new Error("fio_confirm node not found");
  }
  harness.tapAndroidBounds(confirmNode.bounds);
  await sleep(1200);

  return await poll(
    `${artifactBase}:fio-closed`,
    async () => {
      const next = dumpScreen(`${artifactBase}-fio-after-confirm`);
      return isFioModal(next.xml) ? null : next;
    },
    30_000,
    1000,
  );
}

async function waitForForemanHome(current: AndroidScreen, artifactBase: string) {
  if (isForemanHome(current.xml)) return current;
  return await poll(
    `${artifactBase}:foreman-home`,
    async () => {
      const next = dumpScreen(`${artifactBase}-home`);
      return isForemanHome(next.xml) ? next : null;
    },
    30_000,
    1000,
  );
}

async function waitForWarehouseHome(current: AndroidScreen, artifactBase: string) {
  if (isWarehouseHome(current.xml)) return current;
  return await poll(
    `${artifactBase}:warehouse-home`,
    async () => {
      const next = dumpScreen(`${artifactBase}-home`);
      return isWarehouseHome(next.xml) ? next : null;
    },
    30_000,
    1000,
  );
}

async function recoverForemanFromProfileIfNeeded(
  current: AndroidScreen,
  packageName: string | null,
  artifactBase: string,
) {
  if (!isProfileScreen(current.xml)) return current;
  harness.startAndroidRouteSafe(packageName, "rik://foreman");
  return await poll(
    `${artifactBase}:foreman-route-recover`,
    async () => {
      const next = dumpScreen(`${artifactBase}-route-recover`);
      return isForemanHome(next.xml) || isFioModal(next.xml) || isProfileScreen(next.xml) ? next : null;
    },
    30_000,
    1000,
  );
}

async function openWarehouseReportsFromHome(
  current: AndroidScreen,
  artifactBase: string,
  recipientLabel?: string | null,
) {
  if (isWarehouseRecipientModal(current.xml)) {
    current = await confirmWarehouseRecipientIfPresent(current, `${artifactBase}-recipient-open`, recipientLabel);
  }
  if (isWarehouseReportsChoice(current.xml) || isWarehouseDayList(current.xml)) return current;

  let screen = current;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
    const reportsNode = findNode(
      nodes,
      (node) =>
        node.resourceId === "warehouse-tab-reports"
        || node.contentDesc === "warehouse-tab-reports"
        || matchesNodeText(node, "warehouse-tab-reports", WAREHOUSE_REPORTS_LABEL),
    );

    if (reportsNode && hasUsableBounds(reportsNode.bounds)) {
      harness.tapAndroidBounds(reportsNode.bounds);
    } else {
      adb(["shell", "input", "swipe", "900", "340", "180", "340", "360"]);
    }

    await sleep(1600);
    const opened = await poll(
      `${artifactBase}:reports-open-attempt-${attempt + 1}`,
      async () => {
        const next = dumpScreen(`${artifactBase}-reports-attempt-${attempt + 1}`);
        if (isWarehouseRecipientModal(next.xml)) return next;
        if (isWarehouseReportsChoice(next.xml) || isWarehouseDayList(next.xml)) return next;
        if (isWarehouseHome(next.xml)) return next;
        return null;
      },
      10_000,
      800,
    );

    if (isWarehouseRecipientModal(opened.xml)) {
      screen = await confirmWarehouseRecipientIfPresent(opened, `${artifactBase}-reports-attempt-${attempt + 1}`, recipientLabel);
      continue;
    }

    if (isWarehouseReportsChoice(opened.xml) || isWarehouseDayList(opened.xml)) {
      return opened;
    }
    screen = opened;
  }

  throw new Error("warehouse reports tab did not open");
}

async function runForemanProof(): Promise<RoleProof> {
  let runtime:
    | Awaited<ReturnType<typeof harness.prepareAndroidRuntime>>
    | null = null;
  let user: RuntimeTestUser | null = null;
  let requestId: string | null = null;

  try {
    runtime = await harness.prepareAndroidRuntime({ clearApp: true });
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Foreman Android PDF Proof",
      emailPrefix: "foreman-android-pdf-proof",
    });

    const requestDisplayNo = `REQ-AND-${Date.now().toString(36).toUpperCase()}`;
    const requestInsert = await admin
      .from("requests")
      .insert({
        created_by: user.id,
        foreman_name: user.displayLabel,
        display_no: requestDisplayNo,
        status: "pending",
      })
      .select("id, display_no")
      .single();
    if (requestInsert.error || !requestInsert.data) {
      throw requestInsert.error ?? new Error("Unable to insert Foreman Android PDF proof request");
    }
    requestId = String(requestInsert.data.id);

    let current = await harness.loginAndroidWithProtectedRoute({
      packageName: runtime.packageName,
      user,
      protectedRoute: "rik://foreman",
      artifactBase: "android-foreman-pdf-proof",
      successPredicate: (xml) => isForemanHome(xml) || isFioModal(xml) || isProfileScreen(xml),
      renderablePredicate: (xml) => isLoginScreen(xml) || isForemanHome(xml) || isFioModal(xml) || isProfileScreen(xml),
      loginScreenPredicate: isLoginScreen,
    });

    current = await recoverForemanFromProfileIfNeeded(current, runtime.packageName, "android-foreman-pdf-proof");
    current = await confirmFioIfPresent(current, "android-foreman-pdf-proof", user.displayLabel);
    current = await waitForForemanHome(current, "android-foreman-pdf-proof");

    tapMatching(
      current,
      "foreman_materials_open",
      (node) =>
        node.resourceId === "foreman-main-materials-open"
        || matchesNodeText(node, "foreman-main-materials-open", FOREMAN_MATERIALS_LABEL),
    );
    await sleep(1500);

    let materialsTapRetries = 0;
    const materialsScreen = await poll(
      "android-foreman-pdf-proof:materials-open",
      async () => {
        let next = dumpScreen("android-foreman-pdf-proof-materials");
        if (isFioModal(next.xml)) {
          next = await confirmFioIfPresent(next, "android-foreman-pdf-proof-materials", user.displayLabel);
        }
        const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
        const closeNode = findNode(
          nextNodes,
          (node) =>
            node.resourceId === "foreman-main-tab-close"
            || matchesNodeText(node, "foreman-main-tab-close"),
        );
        const historyNode = findNode(
          nextNodes,
          (node) =>
            node.resourceId === "foreman-request-history-open"
            || matchesNodeText(node, "foreman-request-history-open", "\u0437\u0430\u044f\u0432\u043a\u0438", "\u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u044f\u0432\u043e\u043a"),
        );
        if (historyNode || closeNode) return next;
        if (isForemanHome(next.xml) && materialsTapRetries < 2) {
          materialsTapRetries += 1;
          tapMatching(
            next,
            `foreman_materials_open_retry_${materialsTapRetries}`,
            (node) =>
              node.resourceId === "foreman-main-materials-open"
              || matchesNodeText(node, "foreman-main-materials-open", FOREMAN_MATERIALS_LABEL),
          );
        }
        return null;
      },
      30_000,
      1000,
    );

    tapMatching(
      materialsScreen,
      "foreman_history_bar",
      (node) =>
        node.resourceId === "foreman-request-history-open"
        || matchesNodeText(node, "foreman-request-history-open", "\u0437\u0430\u044f\u0432\u043a\u0438", "\u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0437\u0430\u044f\u0432\u043e\u043a"),
    );
    await sleep(1200);

    const historyScreen = await poll(
      "android-foreman-pdf-proof:history-modal",
      async () => {
        const next = dumpScreen("android-foreman-pdf-proof-history");
        return next.xml.includes(requestDisplayNo) && /foreman-history-pdf:|PDF/i.test(next.xml) ? next : null;
      },
      30_000,
      1000,
    );

    adb(["logcat", "-c"]);
    const logBaseline = readCombinedDevLogs().text.length;
    tapMatching(
      historyScreen,
      "foreman_history_pdf",
      (node) =>
        node.resourceId.startsWith("foreman-history-pdf:")
        || /^PDF$/i.test(String(node.text || "").trim()),
    );

    const requiredTokens = [
      "payload_ready",
      "backend_invoke_start",
      "backend_invoke_success",
      "signed_url_received",
      "[pdf-viewer] viewer_route_mounted",
      "[pdf-viewer] native_handoff_start",
      "[pdf-viewer] native_handoff_ready",
    ];

    let metroLog = "";
    try {
      metroLog = await poll(
        "android-foreman-pdf-proof:metro-proof",
        async () => {
          const delta = readLogDelta(logBaseline);
          return hasAllTokens(delta, requiredTokens) ? delta : null;
        },
        90_000,
        1000,
      );
    } catch {
      metroLog = readLogDelta(logBaseline);
    }

    await sleep(2000);
    const finalScreen = dumpScreen("android-foreman-pdf-proof-opened");
    const logcat = tryAdb(["logcat", "-d"]);
    const proofLog = [metroLog, logcat].filter(Boolean).join("\n");
    const topActivity = getTopActivity();
    const processAlive = getProcessAlive();
    const fatalExceptionLogged = hasAppFatalException(logcat);
    const successChain = hasAndroidPdfSuccessChain(proofLog);
    const remoteUrlProof = hasRemoteUrlProof(proofLog);
    const signedUrlProof = hasSignedUrlProof(proofLog);
    const eventCounts = extractAndroidPdfEventCounts(proofLog);

    return {
      status:
        successChain
        && remoteUrlProof
        && signedUrlProof
        && processAlive
        && !fatalExceptionLogged
        && isExternalPdfSurface(finalScreen.xml, topActivity)
          ? "GREEN"
          : "NOT_GREEN",
      role: "foreman",
      documentPath: "history_request_pdf",
      checkedAt: new Date().toISOString(),
      preflight: runtime.preflight,
      finalXml: finalScreen.xmlPath,
      finalPng: finalScreen.pngPath,
      finalScreenPackage: getScreenPackage(finalScreen.xml),
      topActivity,
      processAlive,
      fatalExceptionLogged,
      sourceKindRemoteUrl: remoteUrlProof,
      signedUrlSeen: signedUrlProof,
      eventCounts,
      metroExcerpt: buildRelevantLogExcerpt(metroLog),
      logcatExcerpt: buildRelevantLogcatExcerpt(logcat),
      extra: {
        requestId,
        requestDisplayNo,
        proofSource: metroLog ? "metro+logcat" : "logcat",
      },
      error: null,
    };
  } catch (error) {
    const failureScreen = harness.captureFailureArtifacts("android-foreman-pdf-proof-failure");
    return {
      status: "NOT_GREEN",
      role: "foreman",
      documentPath: "history_request_pdf",
      checkedAt: new Date().toISOString(),
      preflight: runtime?.preflight ?? null,
      finalXml: failureScreen.xmlPath,
      finalPng: failureScreen.pngPath,
      finalScreenPackage: null,
      topActivity: getTopActivity(),
      processAlive: getProcessAlive(),
      fatalExceptionLogged: false,
      sourceKindRemoteUrl: false,
      signedUrlSeen: false,
      eventCounts: {},
      metroExcerpt: buildRelevantLogExcerpt(readLogDelta(0)),
      logcatExcerpt: buildRelevantLogcatExcerpt(tryAdb(["logcat", "-d"])),
      extra: {
        requestId,
      },
      error: getErrorMessage(error),
    };
  } finally {
    if (requestId) {
      try {
        await admin.from("requests").delete().eq("id", requestId);
      } catch {
        // best effort cleanup
      }
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
    runtime?.devClient.cleanup();
  }
}

async function runWarehouseProof(): Promise<RoleProof> {
  let runtime:
    | Awaited<ReturnType<typeof harness.prepareAndroidRuntime>>
    | null = null;
  let user: RuntimeTestUser | null = null;

  try {
    runtime = await harness.prepareAndroidRuntime({ clearApp: true });
    user = await createTempUser(admin, {
      role: "warehouse",
      fullName: "Warehouse Android PDF Proof",
      emailPrefix: "warehouse-android-pdf-proof",
    });

    let current = await harness.loginAndroidWithProtectedRoute({
      packageName: runtime.packageName,
      user,
      protectedRoute: "rik://warehouse",
      artifactBase: "android-warehouse-pdf-proof",
      successPredicate: (xml) => isWarehouseHome(xml) || isFioModal(xml),
      renderablePredicate: (xml) => isLoginScreen(xml) || isWarehouseHome(xml) || isFioModal(xml),
      loginScreenPredicate: isLoginScreen,
    });

    if (isProfileScreen(current.xml)) {
      harness.startAndroidRouteSafe(runtime.packageName, "rik://warehouse");
      current = await poll(
        "android-warehouse-pdf-proof:route-recover",
        async () => {
          const next = dumpScreen("android-warehouse-pdf-proof-route-recover");
          return isWarehouseHome(next.xml) || isFioModal(next.xml) ? next : null;
        },
        30_000,
        1000,
      );
    }

    current = await confirmFioIfPresent(current, "android-warehouse-pdf-proof", user.displayLabel);
    if (!isWarehouseHome(current.xml) && !isFioModal(current.xml)) {
      harness.startAndroidRouteSafe(runtime.packageName, "rik://warehouse");
      current = await poll(
        "android-warehouse-pdf-proof:warehouse-route-reopen",
        async () => {
          const next = dumpScreen("android-warehouse-pdf-proof-route-reopen");
          return isWarehouseHome(next.xml) || isFioModal(next.xml) ? next : null;
        },
        30_000,
        1000,
      );
      current = await confirmFioIfPresent(current, "android-warehouse-pdf-proof", user.displayLabel);
    }

    current = await waitForWarehouseHome(current, "android-warehouse-pdf-proof");

    current = await confirmWarehouseRecipientIfPresent(current, "android-warehouse-pdf-proof", user.displayLabel);

    let reportsScreen = await openWarehouseReportsFromHome(current, "android-warehouse-pdf-proof", user.displayLabel);

    if (isWarehouseReportsChoice(reportsScreen.xml) && !isWarehouseDayList(reportsScreen.xml)) {
      let dayListScreen: AndroidScreen | null = null;
      for (let attempt = 0; attempt < 3 && !dayListScreen; attempt += 1) {
        tapMatching(
          reportsScreen,
          `warehouse_reports_issue_mode_${attempt + 1}`,
          (node) =>
            node.resourceId === "warehouse-reports-mode-issue"
            || node.contentDesc === "warehouse-reports-mode-issue"
            || matchesNodeText(node, "warehouse-reports-mode-issue", WAREHOUSE_ISSUE_LABEL),
        );
        await sleep(1500);

        let next = await poll(
          `android-warehouse-pdf-proof:reports-day-list-${attempt + 1}`,
          async () => {
            const raw = dumpScreen("android-warehouse-pdf-proof-day-list");
            if (isFioModal(raw.xml)) {
              return await confirmFioIfPresent(
                raw,
                `android-warehouse-pdf-proof-day-list-${attempt + 1}`,
                user.displayLabel,
              );
            }
            if (isWarehouseRecipientModal(raw.xml)) {
              return await confirmWarehouseRecipientIfPresent(
                raw,
                `android-warehouse-pdf-proof-day-list-${attempt + 1}`,
                user.displayLabel,
              );
            }
            if (isWarehouseDayList(raw.xml) || isWarehouseReportsChoice(raw.xml) || isWarehouseHome(raw.xml) || isProfileScreen(raw.xml)) {
              return raw;
            }
            return null;
          },
          30_000,
          1000,
        );

        if (isProfileScreen(next.xml)) {
          harness.startAndroidRouteSafe(runtime.packageName, "rik://warehouse");
          next = await poll(
            `android-warehouse-pdf-proof:reports-profile-recover-${attempt + 1}`,
            async () => {
              const recovered = dumpScreen(`android-warehouse-pdf-proof-reports-profile-recover-${attempt + 1}`);
              return isWarehouseHome(recovered.xml) || isFioModal(recovered.xml) ? recovered : null;
            },
            30_000,
            1000,
          );
          next = await confirmFioIfPresent(next, `android-warehouse-pdf-proof-reports-profile-recover-${attempt + 1}`, user.displayLabel);
        }

        if (isWarehouseDayList(next.xml)) {
          dayListScreen = next;
          break;
        }

        reportsScreen = isWarehouseHome(next.xml)
          ? await openWarehouseReportsFromHome(next, "android-warehouse-pdf-proof", user.displayLabel)
          : next;
      }

      if (!dayListScreen) {
        throw new Error("Warehouse reports day list did not open");
      }
      reportsScreen = dayListScreen;
    }

    const dayNode = findFirstDayNode(reportsScreen);
    if (!dayNode) {
      throw new Error("Warehouse reports day row not found");
    }
    harness.tapAndroidBounds(dayNode.bounds);
    await sleep(1500);

    const dayScreen = await poll(
      "android-warehouse-pdf-proof:day-open",
      async () => {
        const next = dumpScreen("android-warehouse-pdf-proof-day-open");
        const nodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
        const pdfNode =
          findNode(nodes, (node) => node.resourceId === "warehouse-day-register-pdf")
          ?? findNode(
            nodes,
            (node) =>
              node.clickable
              && node.enabled
              && matchesNodeText(node, "warehouse-day-register-pdf", "pdf", "\u0440\u0435\u0435\u0441\u0442\u0440")
              && matchesWarehouseDayTopAction(node, "register"),
           );
        return pdfNode || findNode(nodes, (node) => matchesWarehouseDayTopAction(node, "register"))
          ? next
          : null;
      },
      30_000,
      1000,
    );

    const dayNodes = harness.parseAndroidNodes(dayScreen.xml) as AndroidNode[];
    const registerPdfNode =
      findNode(dayNodes, (node) => node.resourceId === "warehouse-day-register-pdf")
      ?? findNode(
        dayNodes,
        (node) => {
          return matchesWarehouseDayTopAction(node, "register")
            && matchesNodeText(node, "warehouse-day-register-pdf", "pdf", "\u0440\u0435\u0435\u0441\u0442\u0440");
        },
      )
      ?? findNode(dayNodes, (node) => matchesWarehouseDayTopAction(node, "register"));
    if (!registerPdfNode) {
      throw new Error("Warehouse day register PDF button not found");
    }

    adb(["logcat", "-c"]);
    const logBaseline = readCombinedDevLogs().text.length;
    harness.tapAndroidBounds(registerPdfNode.bounds);

    const requiredTokens = [
      "payload_ready",
      "backend_invoke_start",
      "backend_invoke_success",
      "signed_url_received",
      "[pdf-viewer] viewer_route_mounted",
      "[pdf-viewer] native_handoff_start",
      "[pdf-viewer] native_handoff_ready",
    ];

    let metroLog = "";
    try {
      metroLog = await poll(
        "android-warehouse-pdf-proof:metro-proof",
        async () => {
          const delta = readLogDelta(logBaseline);
          return hasAllTokens(delta, requiredTokens) ? delta : null;
        },
        90_000,
        1000,
      );
    } catch {
      metroLog = readLogDelta(logBaseline);
    }

    await sleep(2000);
    const finalScreen = dumpScreen("android-warehouse-pdf-proof-opened");
    const logcat = tryAdb(["logcat", "-d"]);
    const proofLog = [metroLog, logcat].filter(Boolean).join("\n");
    const topActivity = getTopActivity();
    const processAlive = getProcessAlive();
    const fatalExceptionLogged = hasAppFatalException(logcat);
    const successChain = hasAndroidPdfSuccessChain(proofLog);
    const remoteUrlProof = hasRemoteUrlProof(proofLog);
    const signedUrlProof = hasSignedUrlProof(proofLog);
    const eventCounts = extractAndroidPdfEventCounts(proofLog);

    return {
      status:
        successChain
        && remoteUrlProof
        && signedUrlProof
        && processAlive
        && !fatalExceptionLogged
        && isExternalPdfSurface(finalScreen.xml, topActivity)
          ? "GREEN"
          : "NOT_GREEN",
      role: "warehouse",
      documentPath: "issue_day_register_pdf",
      checkedAt: new Date().toISOString(),
      preflight: runtime.preflight,
      finalXml: finalScreen.xmlPath,
      finalPng: finalScreen.pngPath,
      finalScreenPackage: getScreenPackage(finalScreen.xml),
      topActivity,
      processAlive,
      fatalExceptionLogged,
      sourceKindRemoteUrl: remoteUrlProof,
      signedUrlSeen: signedUrlProof,
      eventCounts,
      metroExcerpt: buildRelevantLogExcerpt(metroLog),
      logcatExcerpt: buildRelevantLogcatExcerpt(logcat),
      extra: {
        dayNodeLabel: labelOf(dayNode),
        proofSource: metroLog ? "metro+logcat" : "logcat",
      },
      error: null,
    };
  } catch (error) {
    const failureScreen = harness.captureFailureArtifacts("android-warehouse-pdf-proof-failure");
    return {
      status: "NOT_GREEN",
      role: "warehouse",
      documentPath: "issue_day_register_pdf",
      checkedAt: new Date().toISOString(),
      preflight: runtime?.preflight ?? null,
      finalXml: failureScreen.xmlPath,
      finalPng: failureScreen.pngPath,
      finalScreenPackage: null,
      topActivity: getTopActivity(),
      processAlive: getProcessAlive(),
      fatalExceptionLogged: false,
      sourceKindRemoteUrl: false,
      signedUrlSeen: false,
      eventCounts: {},
      metroExcerpt: buildRelevantLogExcerpt(readLogDelta(0)),
      logcatExcerpt: buildRelevantLogcatExcerpt(tryAdb(["logcat", "-d"])),
      extra: {},
      error: getErrorMessage(error),
    };
  } finally {
    await cleanupTempUser(admin, user).catch(() => undefined);
    runtime?.devClient.cleanup();
  }
}

async function main() {
  const devices = adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    throw new Error("No Android emulator/device detected");
  }

  const foreman = await runForemanProof();
  const warehouse = await runWarehouseProof();

  writeJson("artifacts/foreman-warehouse-android-pdf-runtime-summary.json", {
    status: foreman.status === "GREEN" && warehouse.status === "GREEN" ? "GREEN" : "NOT_GREEN",
    checkedAt: new Date().toISOString(),
    devClientPort: androidDevClientPort,
    logPaths: harness.getDevClientLogPaths(),
    foreman,
    warehouse,
  });
}

void main();
