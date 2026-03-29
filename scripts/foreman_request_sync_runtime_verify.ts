import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { createAndroidHarness } from "./_shared/androidHarness";
import { buildRuntimeSummary, createFailurePlatformResult } from "./_shared/runtimeSummary";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const password = "Pass1234";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "foreman-request-sync-runtime-verify" } },
});

const runtimeOutPath = path.join(projectRoot, "artifacts/foreman-request-sync-runtime.json");
const runtimeSummaryOutPath = path.join(projectRoot, "artifacts/foreman-request-sync-runtime.summary.json");
const webArtifactOutPath = path.join(projectRoot, "artifacts/foreman-request-sync-web-smoke.json");
const androidDevClientPort = Number(process.env.FOREMAN_ANDROID_DEV_PORT ?? "8081");
const androidDevClientStdoutPath = path.join(projectRoot, `artifacts/expo-dev-client-${androidDevClientPort}.stdout.log`);
const androidDevClientStderrPath = path.join(projectRoot, `artifacts/expo-dev-client-${androidDevClientPort}.stderr.log`);

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

const ANDROID_LABELS = {
  title: ["Заявка", "Р—Р°СЏРІРєР°"],
  materials: ["Материалы", "РњР°С‚РµСЂРёР°Р»С‹"],
  subcontracts: ["Подряды", "РџРѕРґСЂСЏРґС‹"],
  foremanTab: ["Прораб", "РџСЂРѕСЂР°Р±"],
  ok: ["OK"],
  devLauncher: ["Development Build", "DEVELOPMENT SERVERS"],
};

ANDROID_LABELS.title.unshift("Заявка");
ANDROID_LABELS.materials.unshift("Материалы");
ANDROID_LABELS.subcontracts.unshift("Подряды");
ANDROID_LABELS.foremanTab.unshift("Прораб");

const ANDROID_LOGIN_LABEL_RE = /Войти|Р’РѕР№С‚Рё|Login|Ð’Ð¾Ð¹Ñ‚Ð¸/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const sanitizeRuntimeArtifact = (value: unknown, pathSegments: string[] = []): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeRuntimeArtifact(item, pathSegments.concat(String(index))));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sanitizeRuntimeArtifact(nestedValue, pathSegments.concat(key)),
      ]),
    );
  }
  if (typeof value !== "string") {
    return value;
  }

  const key = pathSegments[pathSegments.length - 1] ?? "";
  if (key === "body") {
    return `[redacted-body:${value.length}]`;
  }
  if (/phone/i.test(key)) {
    return "[redacted-phone]";
  }
  if (/password/i.test(key)) {
    return "[redacted-password]";
  }
  if (/email/i.test(key)) {
    return "[redacted-email]";
  }

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Smoke (Foreman|Director)(?:\s+[0-9A-Za-z._-]+)?/gi, "Smoke [redacted-user]")
    .replace(/Smoke Contractor(?:\s+\d+)?/gi, "Smoke [redacted-contractor]");
};

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
  devClientStdoutPath: androidDevClientStdoutPath,
  devClientStderrPath: androidDevClientStderrPath,
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
  const email = `foreman.runtime.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
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

const tailText = (fullPath: string, maxChars = 4000) => {
  if (!fs.existsSync(fullPath)) return "";
  const text = fs.readFileSync(fullPath, "utf8");
  return text.slice(Math.max(0, text.length - maxChars));
};

const buildAndroidDevClientUrl = (port: number) => `http://127.0.0.1:${port}`;

const buildAndroidDevClientDeepLink = (port: number) =>
  `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(buildAndroidDevClientUrl(port))}`;

async function isAndroidDevClientServerReachable(port: number) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

const ensureAndroidReverseProxy = (port: number) => {
  execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

async function warmAndroidDevClientBundle(port: number) {
  const candidates = [
    `http://127.0.0.1:${port}/status`,
    `http://127.0.0.1:${port}/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false`,
    `http://127.0.0.1:${port}/index.bundle?platform=android&dev=true&minify=false`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) continue;
      await response.text();
      return;
    } catch {
      continue;
    }
  }
}

async function ensureAndroidDevClientServer() {
  if (await isAndroidDevClientServerReachable(androidDevClientPort)) {
    return {
      port: androidDevClientPort,
      startedByScript: false,
      cleanup: () => undefined,
    };
  }

  fs.writeFileSync(androidDevClientStdoutPath, "");
  fs.writeFileSync(androidDevClientStderrPath, "");

  const child = spawn(
    process.execPath,
    [
      path.join(projectRoot, "node_modules", "expo", "bin", "cli"),
      "start",
      "--dev-client",
      "--host",
      "localhost",
      "--non-interactive",
      "--port",
      String(androidDevClientPort),
      "--clear",
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        BROWSER: "none",
        EXPO_NO_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(androidDevClientStdoutPath, chunk);
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(androidDevClientStderrPath, chunk);
  });

  try {
    await poll(
      "android:dev_client_manifest_ready",
      async () => ((await isAndroidDevClientServerReachable(androidDevClientPort)) ? true : null),
      180_000,
      1500,
    );
  } catch (error) {
    const stdoutTail = tailText(androidDevClientStdoutPath);
    const stderrTail = tailText(androidDevClientStderrPath);
    if (child.pid) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 15_000,
      });
    }
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        stdoutTail ? `dev-client stdout tail:\n${stdoutTail}` : null,
        stderrTail ? `dev-client stderr tail:\n${stderrTail}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return {
    port: androidDevClientPort,
    startedByScript: true,
    cleanup: () => {
      if (!child.pid) return;
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        cwd: projectRoot,
        encoding: "utf8",
        timeout: 15_000,
      });
    },
  };
}

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
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
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

const pressAndroidKey = (keyCode: number) => {
  execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

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

const startAndroidForemanRoute = (packageName: string | null) => {
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "rik://foreman"];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
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

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidLabelNode = (nodes: AndroidNode[], labels: readonly string[]): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const label = `${node.contentDesc} ${node.text}`.trim();
    return node.clickable && node.enabled && label.length > 0 && matchesAndroidLabel(label, labels);
  });

const findAndroidLoginNodeSafe = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) => node.clickable && node.enabled && ANDROID_LOGIN_LABEL_RE.test(`${node.text} ${node.contentDesc}`),
  );

const isAndroidLoginScreenSafe = (xml: string) => xml.includes("Email") && ANDROID_LOGIN_LABEL_RE.test(xml);

const isAndroidForemanHome = (xml: string) =>
  matchesAndroidLabel(xml, ANDROID_LABELS.title) ||
  (matchesAndroidLabel(xml, ANDROID_LABELS.materials) && matchesAndroidLabel(xml, ANDROID_LABELS.subcontracts));

const isAndroidDevLauncherHome = (xml: string) =>
  ANDROID_LABELS.devLauncher.every((label) => xml.includes(label));

const isAndroidDevLauncherErrorScreen = (xml: string) =>
  xml.includes("There was a problem loading the project.") ||
  xml.includes("This development build encountered the following error.");

const isAndroidDevMenuIntroScreen = (xml: string) =>
  xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");

const isAndroidForemanRenderableScreen = (xml: string) =>
  isAndroidLoginScreenSafe(xml) || isAndroidForemanHome(xml);

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

  pressAndroidKey(4);
  return true;
};

async function ensureAndroidDevClientLoaded(
  packageName: string | null,
  port: number,
) {
  ensureAndroidReverseProxy(port);
  startAndroidDevClientProject(packageName, port);

  let screen = await poll(
    "android:dev_client_loaded",
    async () => {
      await sleep(2500);
      const next = dumpAndroidScreen("android-foreman-request-sync-dev-client-loading");
      if (isAndroidDevMenuIntroScreen(next.xml)) {
        dismissAndroidDevMenuIntro(next.xml);
        return null;
      }
      if (isAndroidForemanRenderableScreen(next.xml)) return next;
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
      "android:dev_client_reloaded",
      async () => {
        await sleep(2500);
        const next = dumpAndroidScreen(`android-foreman-request-sync-dev-client-${attempt + 1}`);
        if (isAndroidDevMenuIntroScreen(next.xml)) {
          dismissAndroidDevMenuIntro(next.xml);
          return null;
        }
        if (isAndroidForemanRenderableScreen(next.xml)) return next;
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

async function loginForemanAndroid(user: TempUser, packageName: string | null, devClientPort: number) {
  writeJson(path.join(projectRoot, "artifacts/android-foreman-request-sync-user.json"), {
    role: user.role,
    user: "[redacted]",
    password: "[redacted]",
  });
  void devClientPort;
  return androidHarness.loginAndroidWithProtectedRoute({
    packageName,
    user,
    protectedRoute: "rik://foreman",
    artifactBase: "android-foreman-request-sync",
    successPredicate: isAndroidForemanHome,
    renderablePredicate: isAndroidForemanRenderableScreen,
    loginScreenPredicate: isAndroidLoginScreenSafe,
  });
}

async function settleAndroidForemanRoute(
  packageName: string | null,
  current: ReturnType<typeof dumpAndroidScreen>,
  devClientPort: number,
) {
  let screen = current;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (isAndroidDevLauncherHome(screen.xml)) {
      screen = await ensureAndroidDevClientLoaded(packageName, devClientPort);
    }
    if (isAndroidForemanHome(screen.xml)) return screen;

    const okNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), ANDROID_LABELS.ok);
    if (okNode) {
      tapAndroidBounds(okNode.bounds);
      await sleep(800);
    }

    const foremanTab = findAndroidLabelNode(parseAndroidNodes(screen.xml), ANDROID_LABELS.foremanTab);
    if (foremanTab) {
      tapAndroidBounds(foremanTab.bounds);
      await sleep(1200);
    }

    const routed = await androidHarness.openAndroidRoute({
      packageName,
      routes: ["rik://foreman", "rik:///foreman", "rik:///%28tabs%29/foreman"],
      artifactBase: "android-foreman-request-sync-route",
      predicate: isAndroidForemanHome,
      timeoutMs: 20_000,
      delayMs: 1200,
    }).catch(() => null);
    if (routed) {
      screen = routed;
      continue;
    }
    startAndroidForemanRoute(packageName);
    await sleep(1200);
    screen = dumpAndroidScreen(`android-foreman-request-sync-route-${attempt + 1}`);
  }

  return screen;
}

async function runWebRuntime() {
  const result = spawnSync("node", ["scripts/foreman_request_sync_web_smoke.mjs"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 900_000,
  });

  if (result.status !== 0) {
    throw new Error(`foreman live smoke failed: ${String(result.stderr ?? result.stdout ?? "").trim()}`);
  }

  const stdout = String(result.stdout ?? "").trim();
  const payload = JSON.parse(stdout) as Record<string, unknown>;
  writeJson(webArtifactOutPath, sanitizeRuntimeArtifact(payload));

  const materials = (payload.materials ?? {}) as Record<string, { passed?: boolean }>;
  const director = (payload.director ?? {}) as Record<string, { passed?: boolean }>;
  const subcontract = (payload.subcontract ?? {}) as Record<string, unknown>;
  const runtime = (payload.runtime ?? {}) as Record<string, unknown>;

  const foremanConsole = Array.isArray(runtime.foremanConsole) ? runtime.foremanConsole.map(String) : [];
  const foremanPageErrors = Array.isArray(runtime.foremanPageErrors) ? runtime.foremanPageErrors : [];
  const foremanHttpErrors = Array.isArray(runtime.foremanHttpErrors) ? runtime.foremanHttpErrors : [];

  const materialsCrudOk =
    materials.catalog_add?.passed === true &&
    materials.row_delete?.passed === true &&
    materials.cancel?.passed === true &&
    materials.reopen?.passed === true;

  const materialsSubmitAfterReopenOk = materials.submit_after_reopen?.passed === true;
  const directorMaterialsHandoffOk = director.handoff?.passed === true;
  const submitPathOk =
    materialsSubmitAfterReopenOk &&
    (subcontract.submit as { passed?: boolean } | undefined)?.passed === true;

  const directorHandoffOk =
    directorMaterialsHandoffOk &&
    director.subcontractHandoff?.passed === true;

  const subcontractAtomicObserved = foremanConsole.some(
    (line) => line.includes("phase: result") && line.includes("sourcePath: foreman_subcontract"),
  );
  const subcontractDraftBody =
    typeof subcontract.add === "object" && subcontract.add != null
      ? String((subcontract.add as Record<string, unknown>).body ?? "")
      : "";
  const subcontractDraftVisibleOk =
    /REQ-\d+\/\d{4}/.test(subcontractDraftBody) &&
    /Черновик|Р§РµСЂРЅРѕРІРёРє/i.test(subcontractDraftBody) &&
    /PDF/i.test(subcontractDraftBody) &&
    /Excel/i.test(subcontractDraftBody);
  const subcontractDraftVisible =
    typeof subcontract.add === "object" &&
    subcontract.add != null &&
    /REQ-\d+\/\d{4}/.test(String((subcontract.add as Record<string, unknown>).body ?? ""));
  void subcontractDraftVisible;
  const noLegacyConsolePath = foremanConsole.every(
    (line) =>
      !line.includes("source=rpc_v1") &&
      !line.includes("sourceBranch: rpc_v1") &&
      !line.includes("legacy_fallback") &&
      !line.includes("legacySubmit"),
  );

  return {
    status:
      materialsCrudOk &&
      submitPathOk &&
      directorHandoffOk &&
      subcontractAtomicObserved &&
      subcontractDraftVisibleOk &&
      noLegacyConsolePath &&
      foremanPageErrors.length === 0 &&
      foremanHttpErrors.length === 0
        ? "passed"
        : "failed",
    materialsCrudOk,
    materialsSubmitAfterReopenOk,
    submitPathOk,
    directorMaterialsHandoffOk,
    directorHandoffOk,
    subcontractCreateOk: (subcontract.create as { passed?: boolean } | undefined)?.passed === true,
    subcontractAtomicObserved,
    subcontractDraftVisible: subcontractDraftVisibleOk,
    noLegacyConsolePath,
    pageErrorsEmpty: foremanPageErrors.length === 0,
    httpErrorsEmpty: foremanHttpErrors.length === 0,
    payload: sanitizeRuntimeArtifact(payload),
  };
}

async function runAndroidRuntime() {
  let user: TempUser | null = null;
  const devClient = await ensureAndroidDevClientServer();
  try {
    const packageName = detectAndroidPackage();
    const preflight = androidHarness.runAndroidPreflight({ packageName });
    await warmAndroidDevClientBundle(devClient.port);
    user = await createTempUser(process.env.FOREMAN_ANDROID_ROLE || "foreman", "Foreman Android Runtime");
    const current = await loginForemanAndroid(user, packageName, devClient.port);
    const settled = await settleAndroidForemanRoute(packageName, current, devClient.port);
    const passed = isAndroidForemanHome(settled.xml);
    const recovery = androidHarness.getRecoverySummary();
    return {
      status: passed ? "passed" : "failed",
      routeOpen: passed,
      androidPreflight: preflight,
      ...recovery,
      currentXml: settled.xmlPath,
      currentPng: settled.pngPath,
    };
  } finally {
    await cleanupTempUser(user);
    devClient.cleanup();
  }
}

async function run() {
  const web = await runWebRuntime().catch((error) => createFailurePlatformResult("web", error));
  const android = await runAndroidRuntime().catch((error) => {
    const artifacts = androidHarness.captureFailureArtifacts("android-foreman-request-sync-failure");
    return createFailurePlatformResult("android", error, {
      ...androidHarness.getRecoverySummary(),
      ...artifacts,
    });
  });
  const ios = xcrunAvailable()
    ? ({
        status: "failed",
        platformSpecificIssues: [
          "xcrun is available but automated foreman iOS runtime is not implemented in this host flow",
        ],
      } as const)
    : ({
        status: "residual",
        iosResidual: "xcrun is unavailable on this host; iOS simulator cannot be started from Windows",
        platformSpecificIssues: ["xcrun is unavailable on this host; iOS simulator cannot be started from Windows"],
      } as const);

  const runtimePayload = {
    generatedAt: new Date().toISOString(),
    batch: "foreman_request_sync_runtime_verify",
    web,
    android,
    ios,
  };

  const summaryPayload = buildRuntimeSummary({
    web,
    android,
    ios,
    scenariosPassed: {
      web: {
        materialsCrud: web.status === "passed" ? (web as { materialsCrudOk?: boolean }).materialsCrudOk === true : false,
        submitPath:
          web.status === "passed"
            ? (web as { materialsSubmitAfterReopenOk?: boolean; submitPathOk?: boolean }).materialsSubmitAfterReopenOk ===
                true &&
              (web as { submitPathOk?: boolean }).submitPathOk === true
            : false,
        subcontractAtomic:
          web.status === "passed" ? (web as { subcontractAtomicObserved?: boolean }).subcontractAtomicObserved === true : false,
        directorHandoff:
          web.status === "passed"
            ? (web as { directorMaterialsHandoffOk?: boolean; directorHandoffOk?: boolean }).directorMaterialsHandoffOk ===
                true &&
              (web as { directorHandoffOk?: boolean }).directorHandoffOk === true
            : false,
      },
      android: {
        routeOpen: android.status === "passed",
      },
      ios: {
        routeOpen: false,
      },
    },
    artifacts: {
      web: path.relative(projectRoot, webArtifactOutPath).replace(/\\/g, "/"),
      android:
        android.status === "passed"
          ? {
              currentXml: (android as { currentXml: string }).currentXml,
              currentPng: (android as { currentPng: string }).currentPng,
            }
          : null,
    },
    extra: {
      gate: "foreman_request_sync_runtime_verify",
    },
  });

  writeJson(runtimeOutPath, sanitizeRuntimeArtifact(runtimePayload));
  writeJson(runtimeSummaryOutPath, summaryPayload);
  console.log(JSON.stringify(summaryPayload, null, 2));

  if (summaryPayload.status !== "passed") {
    process.exitCode = 1;
  }
}

void run();
