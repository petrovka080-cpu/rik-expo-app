import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

import { createAndroidHarness } from "../_shared/androidHarness";

const PROJECT_ROOT = process.cwd();
const ARTIFACT_DIR = path.join(PROJECT_ROOT, "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "b2c-request-embedded-ai-entrypoint-audit");
const PREFIX = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT";
const WAVE = "S_B2C_REQUEST_EMBEDDED_AI_ENTRYPOINT_AUDIT_CLOSEOUT_EXACT_REPRO_ANDROID_POINT_OF_NO_RETURN";
const DEV_CLIENT_PORT = Number(process.env.ANDROID_AUDIT_DEV_CLIENT_PORT ?? 8098);
const APP_PACKAGE = process.env.ANDROID_AUDIT_APP_ID ?? "com.azisbek_dzhantaev.rikexpoapp";

type AndroidAuditCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  screen: string;
  source: string;
  prompt: string;
};

type RouteAttempt = {
  id: string;
  route: AndroidAuditCase["route"];
  screen: string;
  source: string;
  prompt: string;
  uri_candidates: string[];
  route_loaded: boolean;
  route_ready_marker_found: boolean;
  visible_text_sample: string;
  screenshot_path: string | null;
  xml_path: string | null;
  failure_reason: string | null;
};

type DumpResult = {
  xml: string;
  xmlPath: string | null;
  pngPath: string | null;
  error: string | null;
};

type AndroidAuditArtifact = {
  wave: string;
  android_audit_attempted: boolean;
  android_visual_audit_completed: boolean;
  android_emulator_passed: boolean;
  android_entrypoints_reached: boolean;
  final_status: string;
  exact_reason: string;
  package_name: string | null;
  devices: string[];
  dev_client_port: number;
  native_server_url: string;
  root_ready_marker_found: boolean;
  route_attempts: RouteAttempt[];
  screenshots: Record<string, string>;
  native_dumps: Record<string, string>;
  logcat_tail: string;
  dev_client_log_tails: {
    stdoutTail: string;
    stderrTail: string;
  };
  fake_green_claimed: false;
};

const CASES: AndroidAuditCase[] = [
  {
    id: "request_laminate_100sqm",
    route: "/request",
    screen: "B2C bottom-bar request estimate",
    source: "bottom tab Смета / Заявка -> prepare draft button",
    prompt: "Хочу уложить ламинат на 100 кв м",
  },
  {
    id: "request_hydro_turbine_100kw",
    route: "/request",
    screen: "B2C bottom-bar request estimate",
    source: "bottom tab Смета / Заявка -> prepare draft button",
    prompt: "смета на установку турбины на гэс мощностью 100 квт",
  },
  {
    id: "foreman_windows",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай мне смету на установки окон",
  },
  {
    id: "foreman_brick_74sqm",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай смету на кладку кирпича 74 кв метров",
  },
  {
    id: "foreman_gable_roof_100sqm",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
  },
  {
    id: "foreman_gkl_wall_352sqm",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "смета на установку ГКЛ на стены 352 кв м",
  },
  {
    id: "foreman_asphalt_10000sqm",
    route: "/ai?context=foreman",
    screen: "embedded AI assistant foreman context",
    source: "embedded AI assistant /ai?context=foreman autoSend",
    prompt: "смета на асфальтирование 10000 кв м",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runAdb(args: string[], options: { encoding?: BufferEncoding | "buffer"; timeoutMs?: number } = {}): string | Buffer {
  return execFileSync("adb", args, {
    cwd: PROJECT_ROOT,
    encoding: options.encoding === "buffer" ? undefined : options.encoding ?? "utf8",
    stdio: "pipe",
    timeout: options.timeoutMs ?? 8000,
  }) as string | Buffer;
}

function dumpScreen(name: string): DumpResult {
  const xmlDevicePath = `/sdcard/${name.replace(/[\\/]/g, "_")}.xml`;
  const xmlPath = path.join(ARTIFACT_DIR, `${name}.xml`);
  const pngPath = path.join(ARTIFACT_DIR, `${name}.png`);
  fs.mkdirSync(path.dirname(xmlPath), { recursive: true });

  let xml = "";
  let error: string | null = null;
  try {
    runAdb(["shell", "uiautomator", "dump", xmlDevicePath], { timeoutMs: 6000 });
    runAdb(["pull", xmlDevicePath, xmlPath], { timeoutMs: 6000 });
    xml = fs.readFileSync(xmlPath, "utf8");
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : String(nextError);
  }

  try {
    const png = runAdb(["exec-out", "screencap", "-p"], { encoding: "buffer", timeoutMs: 8000 }) as Buffer;
    fs.writeFileSync(pngPath, png);
  } catch (nextError) {
    error = [error, nextError instanceof Error ? nextError.message : String(nextError)].filter(Boolean).join(" | ");
  }

  return {
    xml,
    xmlPath: xml ? path.relative(PROJECT_ROOT, xmlPath).replace(/\\/g, "/") : null,
    pngPath: fs.existsSync(pngPath) ? path.relative(PROJECT_ROOT, pngPath).replace(/\\/g, "/") : null,
    error,
  };
}

function normalizeXmlText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getDevices(harness: ReturnType<typeof createAndroidHarness>): string[] {
  try {
    return String(runAdb(["devices", "-l"], { timeoutMs: 8000 }))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^emulator-\d+\s+device\b/.test(line));
  } catch {
    return [];
  }
}

function getLogcatTail(harness: ReturnType<typeof createAndroidHarness>): string {
  try {
    const raw = String(runAdb(["logcat", "-d", "-t", "700"], { timeoutMs: 8000 }));
    const interesting = raw
      .split(/\r?\n/)
      .filter((line) =>
        /ReactNativeJS|BundleDownloader|ProtocolException|DevLauncher|expo|metro|Error|Exception|FATAL|Hermes|JavaScript/i.test(
          line,
        ),
      )
      .slice(-140)
      .join("\n");
    return interesting || raw.split(/\r?\n/).slice(-80).join("\n");
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function detectPackageName(harness: ReturnType<typeof createAndroidHarness>, devices: string[]): string | null {
  if (devices.length === 0) return null;
  try {
    return harness.detectAndroidPackage() ?? APP_PACKAGE;
  } catch {
    return APP_PACKAGE;
  }
}

function buildRouteCandidates(testCase: AndroidAuditCase): string[] {
  const query = new URLSearchParams();
  query.set("prompt", testCase.prompt);
  if (testCase.route === "/request") {
    query.set("autoPrepare", "1");
    return [`rik://request?${query.toString()}`, `rik:///%28tabs%29/request?${query.toString()}`];
  }

  query.set("context", "foreman");
  query.set("autoSend", "1");
  return [`rik://ai?${query.toString()}`, `rik:///%28tabs%29/ai?${query.toString()}`];
}

function quoteAndroidShell(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function startAndroidDeepLink(
  _harness: ReturnType<typeof createAndroidHarness>,
  packageName: string | null,
  route: string,
): void {
  const packageArg = packageName ? ` ${quoteAndroidShell(packageName)}` : "";
  runAdb([
    "shell",
    `am start -a android.intent.action.VIEW -d ${quoteAndroidShell(route)}${packageArg}`,
  ], { timeoutMs: 8000 });
}

function isRootReady(xml: string): boolean {
  return /Смета|Черновик|Офис|Профиль|AI|Email|Войти|Login|Напишите|Заявка/i.test(xml);
}

function isRouteReady(testCase: AndroidAuditCase, xml: string): boolean {
  if (!isRootReady(xml)) return false;
  const normalized = normalizeXmlText(xml);
  const firstPromptWords = testCase.prompt.split(/\s+/).slice(0, 3).join(" ");
  if (normalized.includes(firstPromptWords)) return true;

  if (testCase.route === "/request") {
    return /Описание проблемы|Черновик заявки|Сделать PDF|Позиции/i.test(normalized);
  }

  return /AI|ассистент|Смета|Наименование|Итого|Сделать PDF|Напишите/i.test(normalized) && /foreman|прораб|смет/i.test(normalized);
}

function isBootBlocked(harness: ReturnType<typeof createAndroidHarness>, xml: string): boolean {
  return (
    harness.isAndroidBlankAppSurface(xml) ||
    harness.isAndroidLauncherHome(xml) ||
    harness.isAndroidDevLauncherHome(xml) ||
    harness.isAndroidDevClientErrorScreen(xml) ||
    harness.isAndroidSystemAnrDialog(xml) ||
    harness.isAndroidGoogleServicesScreen(xml)
  );
}

function skippedRouteAttempt(testCase: AndroidAuditCase, reason: string): RouteAttempt {
  return {
    id: testCase.id,
    route: testCase.route,
    screen: testCase.screen,
    source: testCase.source,
    prompt: testCase.prompt,
    uri_candidates: buildRouteCandidates(testCase),
    route_loaded: false,
    route_ready_marker_found: false,
    visible_text_sample: "",
    screenshot_path: null,
    xml_path: null,
    failure_reason: reason,
  };
}

async function waitForRoot(
  harness: ReturnType<typeof createAndroidHarness>,
  packageName: string | null,
): Promise<{ ready: boolean; xml: string; xmlPath: string | null; pngPath: string | null }> {
  const devClientUrl = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${DEV_CLIENT_PORT}`)}`;
  startAndroidDeepLink(harness, packageName, devClientUrl);

  let lastXml = "";
  let lastXmlPath: string | null = null;
  let lastPngPath: string | null = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await sleep(3000);
    const screen = dumpScreen(`screenshots/b2c-request-embedded-ai-entrypoint-audit/android_root_${attempt}`);
    lastXml = screen.xml;
    lastXmlPath = screen.xmlPath;
    lastPngPath = screen.pngPath;
    if (isRootReady(screen.xml)) {
      return { ready: true, xml: screen.xml, xmlPath: screen.xmlPath, pngPath: screen.pngPath };
    }
    if (harness.isAndroidDevClientErrorScreen(screen.xml)) break;
  }
  return { ready: false, xml: lastXml, xmlPath: lastXmlPath, pngPath: lastPngPath };
}

async function runRouteAttempt(
  harness: ReturnType<typeof createAndroidHarness>,
  packageName: string | null,
  testCase: AndroidAuditCase,
): Promise<RouteAttempt> {
  const candidates = buildRouteCandidates(testCase);
  let lastXml = "";
  let lastXmlPath: string | null = null;
  let lastPngPath: string | null = null;
  let failureReason: string | null = null;

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const candidate = candidates[candidateIndex];
    try {
      startAndroidDeepLink(harness, packageName, candidate);
    } catch (error) {
      failureReason = error instanceof Error ? error.message : String(error);
      continue;
    }

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await sleep(2200);
      const screen = dumpScreen(
        `screenshots/b2c-request-embedded-ai-entrypoint-audit/android_${testCase.id}_${candidateIndex + 1}_${attempt}`,
      );
      lastXml = screen.xml;
      lastXmlPath = screen.xmlPath;
      lastPngPath = screen.pngPath;
      if (screen.error) {
        failureReason = screen.error;
      }
      if (isRouteReady(testCase, screen.xml)) {
        return {
          id: testCase.id,
          route: testCase.route,
          screen: testCase.screen,
          source: testCase.source,
          prompt: testCase.prompt,
          uri_candidates: candidates,
          route_loaded: true,
          route_ready_marker_found: true,
          visible_text_sample: normalizeXmlText(screen.xml).slice(0, 1800),
          screenshot_path: screen.pngPath,
          xml_path: screen.xmlPath,
          failure_reason: null,
        };
      }
      if (isBootBlocked(harness, screen.xml)) {
        failureReason = "Android route stayed on a blank/dev-client/system surface instead of the requested route.";
        return {
          id: testCase.id,
          route: testCase.route,
          screen: testCase.screen,
          source: testCase.source,
          prompt: testCase.prompt,
          uri_candidates: candidates,
          route_loaded: false,
          route_ready_marker_found: false,
          visible_text_sample: normalizeXmlText(screen.xml).slice(0, 1800),
          screenshot_path: screen.pngPath,
          xml_path: screen.xmlPath,
          failure_reason: failureReason,
        };
      }
    }
  }

  return {
    id: testCase.id,
    route: testCase.route,
    screen: testCase.screen,
    source: testCase.source,
    prompt: testCase.prompt,
    uri_candidates: candidates,
    route_loaded: false,
    route_ready_marker_found: false,
    visible_text_sample: normalizeXmlText(lastXml).slice(0, 1800),
    screenshot_path: lastPngPath,
    xml_path: lastXmlPath,
    failure_reason: failureReason ?? "Android route ready marker was not found.",
  };
}

function evidenceMap(routeAttempts: RouteAttempt[], kind: "screenshot_path" | "xml_path"): Record<string, string> {
  return Object.fromEntries(
    routeAttempts
      .filter((attempt) => typeof attempt[kind] === "string" && attempt[kind])
      .map((attempt) => [attempt.id, attempt[kind] as string]),
  );
}

async function main(): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const harness = createAndroidHarness({
    projectRoot: PROJECT_ROOT,
    devClientPort: DEV_CLIENT_PORT,
    devClientStdoutPath: `artifacts/${PREFIX}_android_native_metro_${DEV_CLIENT_PORT}.out.log`,
    devClientStderrPath: `artifacts/${PREFIX}_android_native_metro_${DEV_CLIENT_PORT}.err.log`,
  });
  const devices = getDevices(harness);
  const packageName = devices.length > 0 ? APP_PACKAGE : detectPackageName(harness, devices);

  const baseBlocked: Omit<AndroidAuditArtifact, "route_attempts" | "screenshots" | "native_dumps" | "logcat_tail" | "dev_client_log_tails"> = {
    wave: WAVE,
    android_audit_attempted: true,
    android_visual_audit_completed: false,
    android_emulator_passed: devices.length > 0,
    android_entrypoints_reached: false,
    final_status: devices.length > 0 ? "BLOCKED_ANDROID_ROUTE_BOOTSTRAP_FAILED" : "BLOCKED_ANDROID_ENTRYPOINT_AUDIT_NOT_RUN",
    exact_reason: devices.length > 0
      ? "Android emulator was available, but route proof did not complete."
      : "No adb-visible Android emulator was available for /request and /ai?context=foreman route proof.",
    package_name: packageName,
    devices,
    dev_client_port: DEV_CLIENT_PORT,
    native_server_url: `http://127.0.0.1:${DEV_CLIENT_PORT}`,
    root_ready_marker_found: false,
    fake_green_claimed: false,
  };
  writeJson("android_screenshots.json", {
    ...baseBlocked,
    exact_reason: "Android smoke started; route proof is not complete yet.",
    route_attempts: [],
    screenshots: {},
    native_dumps: {},
    logcat_tail: "",
    dev_client_log_tails: harness.getDevClientLogTails(),
  } satisfies AndroidAuditArtifact);

  if (devices.length === 0) {
    const blocked = {
      ...baseBlocked,
      route_attempts: [],
      screenshots: {},
      native_dumps: {},
      logcat_tail: "",
      dev_client_log_tails: harness.getDevClientLogTails(),
    } satisfies AndroidAuditArtifact;
    writeJson("android_screenshots.json", blocked);
    console.error(blocked.final_status);
    process.exitCode = 1;
    return;
  }

  let cleanup: (() => void) | undefined;
  const routeAttempts: RouteAttempt[] = [];
  let rootReady = false;
  let rootFailureReason: string | null = null;
  let rootXmlPath: string | null = null;
  let rootPngPath: string | null = null;

  try {
    const devClient = await harness.ensureAndroidDevClientServer();
    cleanup = devClient.cleanup;
    harness.ensureAndroidReverseProxy(DEV_CLIENT_PORT);
    const root = await waitForRoot(harness, packageName);
    rootReady = root.ready;
    rootXmlPath = root.xmlPath;
    rootPngPath = root.pngPath;
    if (!rootReady) {
      rootFailureReason = "Expo dev-client did not expose an app root ready marker after opening the dev-client URL.";
    }

    if (!rootReady) {
      for (const testCase of CASES) {
        routeAttempts.push(skippedRouteAttempt(testCase, rootFailureReason ?? "Android root ready marker was not found."));
      }
    } else {
      for (let index = 0; index < CASES.length; index += 1) {
        const routeAttempt = await runRouteAttempt(harness, packageName, CASES[index]);
        routeAttempts.push(routeAttempt);
        if (!routeAttempt.route_loaded) {
          const reason = `Skipped after Android route bootstrap failed on ${routeAttempt.id}.`;
          for (const skipped of CASES.slice(index + 1)) {
            routeAttempts.push(skippedRouteAttempt(skipped, reason));
          }
          break;
        }
      }
    }
  } catch (error) {
    rootFailureReason = error instanceof Error ? error.message : String(error);
  } finally {
    cleanup?.();
  }

  const allRoutesLoaded = routeAttempts.length === CASES.length && routeAttempts.every((attempt) => attempt.route_loaded);
  const logcatTail = getLogcatTail(harness);
  const protocolErrorFound = /ProtocolException|BundleDownloader\.processMultipartResponse|Expected leading/i.test(logcatTail);
  const finalStatus = allRoutesLoaded ? "GREEN_ANDROID_ENTRYPOINT_AUDIT_ROUTES_LOADED" : "BLOCKED_ANDROID_ROUTE_BOOTSTRAP_FAILED";
  const exactReason = allRoutesLoaded
    ? "Android loaded both audited entrypoints for all exact prompts."
    : [
        rootFailureReason,
        protocolErrorFound
          ? "logcat contains BundleDownloader/ProtocolException evidence while loading the Expo dev-client bundle."
          : null,
        "At least one Android exact prompt did not reach /request or /ai?context=foreman route ready markers.",
      ]
        .filter(Boolean)
        .join(" ");

  const artifact = {
    ...baseBlocked,
    android_visual_audit_completed: allRoutesLoaded,
    android_entrypoints_reached: allRoutesLoaded,
    final_status: finalStatus,
    exact_reason: exactReason,
    root_ready_marker_found: rootReady,
    route_attempts: routeAttempts,
    screenshots: {
      ...(rootPngPath ? { android_root: rootPngPath } : {}),
      ...evidenceMap(routeAttempts, "screenshot_path"),
    },
    native_dumps: {
      ...(rootXmlPath ? { android_root: rootXmlPath } : {}),
      ...evidenceMap(routeAttempts, "xml_path"),
    },
    logcat_tail: logcatTail,
    dev_client_log_tails: harness.getDevClientLogTails(),
    fake_green_claimed: false,
  } satisfies AndroidAuditArtifact;

  writeJson("android_screenshots.json", artifact);
  console.log(finalStatus);
  if (!allRoutesLoaded) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  const blocked = {
    wave: WAVE,
    android_audit_attempted: true,
    android_visual_audit_completed: false,
    android_emulator_passed: false,
    android_entrypoints_reached: false,
    final_status: "BLOCKED_ANDROID_ROUTE_BOOTSTRAP_FAILED",
    exact_reason: message,
    package_name: null,
    devices: [],
    dev_client_port: DEV_CLIENT_PORT,
    native_server_url: `http://127.0.0.1:${DEV_CLIENT_PORT}`,
    root_ready_marker_found: false,
    route_attempts: [],
    screenshots: {},
    native_dumps: {},
    logcat_tail: "",
    dev_client_log_tails: { stdoutTail: "", stderrTail: "" },
    fake_green_claimed: false,
  } satisfies AndroidAuditArtifact;
  writeJson("android_screenshots.json", blocked);
  console.error(message);
  process.exitCode = 1;
});
