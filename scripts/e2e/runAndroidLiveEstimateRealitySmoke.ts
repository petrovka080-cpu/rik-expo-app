import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const WAVE = "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "live-web-android-ai-estimate-reality", "android");
const ANDROID_ARTIFACT = path.join(ARTIFACT_DIR, `${WAVE}_android_screenshots.json`);
const FAILURE_ARTIFACT = path.join(ARTIFACT_DIR, `${WAVE}_failures.json`);
const RUNTIME_TRACE_ARTIFACT = path.join(ARTIFACT_DIR, `${WAVE}_runtime_trace.json`);
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const METRO_LOG_PATH = path.join(ARTIFACT_DIR, `${WAVE}_android_metro.log`);
const ANDROID_DEV_PORT = Number(process.env.LIVE_ANDROID_DEV_PORT ?? "8097");

type ExpectedGroup = readonly string[];

type AndroidRealityCase = {
  id: string;
  route: "/ai" | "/chat" | "/request";
  prompt: string;
  screenContext: "foreman" | "chat" | "request";
  expectedWorkKey: string;
  expectedRows: readonly ExpectedGroup[];
  deepLink: string;
  fallbackDeepLink?: string;
  expectPdfViewer?: boolean;
};

const FORBIDDEN_ROW_NAMES = new Set([
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
]);

const CASES: AndroidRealityCase[] = [
  {
    id: "android_foreman_asphalt_1000sqm",
    route: "/ai",
    screenContext: "foreman",
    prompt: "сделай мне смету на асфальтирование на 1000 кв м",
    expectedWorkKey: "asphalt_paving",
    expectedRows: [
      ["песок", "основание"],
      ["щебень", "щебен"],
      ["битум", "эмульсия", "праймер"],
      ["асфальтобетон"],
      ["техника", "техник"],
      ["укладка"],
      ["уплотнение"],
    ],
    deepLink: "rik://ai?context=foreman&autoSend=1",
    fallbackDeepLink: "rik://chat?context=foreman&autoSend=1",
  },
  {
    id: "android_request_carpet_100sqm",
    route: "/request",
    screenContext: "request",
    prompt: "Хочу уложить ковролин на 100 кв м",
    expectedWorkKey: "carpet_laying",
    expectedRows: [
      ["ковролин"],
      ["подложка", "клей", "лента"],
      ["подготовка основания"],
      ["укладка"],
      ["подрезка"],
    ],
    deepLink: "rik://request?autoPrepare=1",
  },
  {
    id: "android_chat_gkl_352sqm",
    route: "/chat",
    screenContext: "chat",
    prompt: "смету на установку ГКЛ на 352 кв м",
    expectedWorkKey: "drywall_partition",
    expectedRows: [
      ["листы ГКЛ", "ГКЛ"],
      ["направляющий профиль"],
      ["стоечный профиль"],
      ["крепёж", "крепеж"],
      ["лента"],
      ["шпаклёвка", "шпаклевка"],
      ["монтаж каркаса"],
      ["обшивка"],
    ],
    deepLink: "rik://chat?autoSend=1",
  },
  {
    id: "android_chat_gable_roof_100sqm",
    route: "/chat",
    screenContext: "chat",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedWorkKey: "gable_roof_installation",
    expectedRows: [
      ["стропила"],
      ["мауэрлат", "брус"],
      ["мембрана", "гидроизоляция"],
      ["обрешётка", "обрешетка"],
      ["кровельное покрытие"],
      ["добор"],
      ["монтаж"],
    ],
    deepLink: "rik://chat?autoSend=1",
  },
  {
    id: "android_chat_brick_masonry_74sqm",
    route: "/chat",
    screenContext: "chat",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    expectedRows: [
      ["кирпич"],
      ["раствор", "кладочная смесь"],
      ["кладочная сетка", "армирование"],
      ["кладка"],
      ["расшивка", "перевязка"],
    ],
    deepLink: "rik://chat?autoSend=1",
  },
  {
    id: "android_request_pdf_viewer_carpet",
    route: "/request",
    screenContext: "request",
    prompt: "Хочу уложить ковролин на 100 кв м",
    expectedWorkKey: "carpet_laying",
    expectedRows: [["PDF"], ["Document actions", "Back", "Открывается", "PDF"]],
    deepLink: "rik://request?autoPrepare=1&autoPdf=1",
    expectPdfViewer: true,
  },
];

function run(command: string, args: string[], encoding: BufferEncoding | "buffer" = "utf8"): { ok: boolean; output: string; buffer?: Buffer } {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (Buffer.isBuffer(output)) return { ok: true, output: `buffer:${output.length}`, buffer: output };
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMetro(): Promise<{ started: boolean; reachable: boolean }> {
  const statusUrl = `http://127.0.0.1:${ANDROID_DEV_PORT}/status`;
  try {
    const response = await fetch(statusUrl);
    const statusText = await response.text().catch(() => "");
    if (response.ok && statusText.includes("packager-status:running")) return { started: false, reachable: true };
  } catch {
    // start below
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const log = fs.openSync(METRO_LOG_PATH, "a");
  const child = spawn(process.platform === "win32" ? "cmd.exe" : "npx", process.platform === "win32"
    ? ["/c", "npx", "expo", "start", "--port", String(ANDROID_DEV_PORT), "--non-interactive"]
    : ["expo", "start", "--port", String(ANDROID_DEV_PORT), "--non-interactive"], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(statusUrl);
      if (response.ok) return { started: true, reachable: true };
    } catch {
      await wait(1_500);
    }
  }
  return { started: true, reachable: false };
}

function connectedEmulators(): string[] {
  const adb = run("adb", ["devices"]);
  if (!adb.ok) return [];
  return adb.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^emulator-\d+\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

function installApk(device: string): { ok: boolean; output: string } {
  let install = run("adb", ["-s", device, "install", "-r", APK_PATH]);
  if (!install.ok && install.output.includes("INSUFFICIENT_STORAGE")) {
    run("adb", ["-s", device, "uninstall", PACKAGE_NAME]);
    run("adb", ["-s", device, "uninstall", `${PACKAGE_NAME}.test`]);
    run("adb", ["-s", device, "shell", "pm", "trim-caches", "1024M"]);
    install = run("adb", ["-s", device, "install", APK_PATH]);
  }
  return install;
}

function buildDeepLink(testCase: AndroidRealityCase, useFallback = false): string {
  const promptParam = `prompt=${encodeURIComponent(testCase.prompt)}`;
  const base = useFallback && testCase.fallbackDeepLink ? testCase.fallbackDeepLink : testCase.deepLink;
  return base.includes("?")
    ? `${base}&${promptParam}`
    : `${base}?${promptParam}`;
}

function launchDeepLink(device: string, uri: string): { ok: boolean; output: string } {
  const quotedUri = `'${uri.replace(/'/g, "'\\''")}'`;
  return run("adb", [
    "-s",
    device,
    "shell",
    `am start -W -a android.intent.action.VIEW -d ${quotedUri} ${PACKAGE_NAME}`,
  ]);
}

function launchDevClientBundle(device: string): { ok: boolean; output: string } {
  run("adb", ["-s", device, "reverse", `tcp:${ANDROID_DEV_PORT}`, `tcp:${ANDROID_DEV_PORT}`]);
  const url = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://10.0.2.2:${ANDROID_DEV_PORT}`)}`;
  return launchDeepLink(device, url);
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function dumpUiText(device: string): { ok: boolean; text: string; rawXml: string } {
  const dump = run("adb", ["-s", device, "shell", "uiautomator", "dump", "/sdcard/window.xml"]);
  if (!dump.ok) return { ok: false, text: dump.output, rawXml: "" };
  const xml = run("adb", ["-s", device, "exec-out", "cat", "/sdcard/window.xml"]);
  if (!xml.ok) return { ok: false, text: xml.output, rawXml: "" };
  const values = Array.from(xml.output.matchAll(/\b(?:text|content-desc|resource-id)="([^"]*)"/g))
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean);
  return { ok: true, text: values.join("\n"), rawXml: xml.output };
}

function parseBoundsCenter(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2),
  };
}

function tapDevServerIfVisible(device: string): boolean {
  const dumped = dumpUiText(device);
  if (!dumped.ok) return false;
  const targetText = Array.from(dumped.rawXml.matchAll(/<node\b([^>]*?)\/?>/g))
    .map((match) => match[1] ?? "")
    .find((attrs) => attrs.includes(`http://10.0.2.2:${ANDROID_DEV_PORT}`) || attrs.includes(`http://127.0.0.1:${ANDROID_DEV_PORT}`));
  if (!targetText) return false;
  const bounds = targetText.match(/bounds="([^"]*)"/)?.[1] ?? "";
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  const tap = run("adb", ["-s", device, "shell", "input", "tap", "540", String(center.y)]);
  return tap.ok;
}

function tapNodeMatchingText(device: string, matcher: RegExp): boolean {
  const dumped = dumpUiText(device);
  if (!dumped.ok) return false;
  const target = Array.from(dumped.rawXml.matchAll(/<node\b([^>]*?)\/?>/g))
    .map((match) => match[1] ?? "")
    .find((attrs) => matcher.test(decodeXml(attrs)));
  if (!target) return false;
  const bounds = target.match(/bounds="([^"]*)"/)?.[1] ?? "";
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  const tap = run("adb", ["-s", device, "shell", "input", "tap", String(center.x), String(center.y)]);
  return tap.ok;
}

function closeDevMenuIfVisible(device: string, text: string): boolean {
  if (text.includes("Reload") && text.includes("Go home") && text.includes("TOOLS")) {
    const back = run("adb", ["-s", device, "shell", "input", "keyevent", "4"]);
    return back.ok;
  }
  return false;
}

async function waitForDevClientBundle(device: string): Promise<{ ok: boolean; launch: { ok: boolean; output: string }; text: string }> {
  run("adb", ["-s", device, "shell", "am", "force-stop", PACKAGE_NAME]);
  await wait(1_000);
  const launch = launchDevClientBundle(device);
  let lastText = "";
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await wait(1_500);
    const dumped = dumpUiText(device);
    if (dumped.ok) {
      lastText = dumped.text;
      if (lastText.includes("Development Build") && lastText.includes("DEVELOPMENT SERVERS")) {
        tapDevServerIfVisible(device);
        continue;
      }
      if (lastText.includes("There was a problem loading the project") || lastText.includes("SocketTimeoutException")) {
        tapNodeMatchingText(device, /Reload/i);
        await wait(2_000);
        continue;
      }
      if (lastText.includes("This is the developer menu") || lastText.includes("Continue")) {
        tapNodeMatchingText(device, /Continue/i);
        continue;
      }
      if (closeDevMenuIfVisible(device, lastText)) {
        continue;
      }
      if (
        lastText.includes("ai.assistant") ||
        lastText.includes("Маркет") ||
        lastText.includes("Заявка") ||
        lastText.includes("Смета") ||
        lastText.includes("Войти")
      ) {
        return { ok: true, launch, text: lastText };
      }
      if (
        !lastText.includes("Development Build") &&
        !lastText.includes("DEVELOPMENT SERVERS") &&
        !lastText.includes("Pixel Launcher") &&
        !lastText.includes("There was a problem loading the project")
      ) {
        return { ok: true, launch, text: lastText };
      }
    }
  }
  return { ok: false, launch, text: lastText };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function expectedGroupPresent(text: string, group: ExpectedGroup): boolean {
  const haystack = normalize(text);
  return group.some((needle) => haystack.includes(normalize(needle)));
}

function expectedRowsPresent(text: string, groups: readonly ExpectedGroup[]): boolean {
  return groups.every((group) => expectedGroupPresent(text, group));
}

function backendRowsFor(testCase: AndroidRealityCase): string[] {
  const builtInAi = answerBuiltInAi({
    text: testCase.prompt,
    screenContext: testCase.screenContext,
    route: testCase.route,
    role: testCase.screenContext === "foreman" ? "foreman" : testCase.screenContext === "request" ? "consumer" : "unknown",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const rows = builtInAi.toolResult.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
  return rows;
}

function validateBackend(testCase: AndroidRealityCase) {
  if (testCase.expectPdfViewer) return { ok: true, failures: [], rows: [] as string[] };
  const builtInAi = answerBuiltInAi({
    text: testCase.prompt,
    screenContext: testCase.screenContext,
    route: testCase.route,
    role: testCase.screenContext === "foreman" ? "foreman" : testCase.screenContext === "request" ? "consumer" : "unknown",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const rows = builtInAi.toolResult.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
  const rowText = rows.join("\n");
  const failures: string[] = [];
  if (builtInAi.runtimeTrace.selectedTool !== "calculate_global_estimate") {
    failures.push(`selectedTool=${builtInAi.runtimeTrace.selectedTool ?? "missing"}`);
  }
  if (builtInAi.runtimeTrace.workKey !== testCase.expectedWorkKey) {
    failures.push(`workKey=${builtInAi.runtimeTrace.workKey ?? "missing"}`);
  }
  for (const group of testCase.expectedRows) {
    if (!expectedGroupPresent(rowText, group)) failures.push(`missing_backend_row:${group.join("/")}`);
  }
  for (const row of rows) {
    if (FORBIDDEN_ROW_NAMES.has(row.trim())) failures.push(`generic_backend_row:${row}`);
  }
  return { ok: failures.length === 0, failures, rows };
}

function captureScreenshot(device: string, testCase: AndroidRealityCase, attempt: number): string | null {
  const shot = run("adb", ["-s", device, "exec-out", "screencap", "-p"], "buffer");
  if (!shot.ok || !shot.buffer) return null;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filePath = path.join(SCREENSHOT_DIR, `${testCase.id}_${attempt}.png`);
  fs.writeFileSync(filePath, shot.buffer);
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

async function collectScreenText(device: string, testCase: AndroidRealityCase): Promise<{
  ok: boolean;
  text: string;
  screenshots: string[];
  rawXmlTail: string;
}> {
  let text = "";
  let rawXmlTail = "";
  const screenshots: string[] = [];
  const deadline = Date.now() + (testCase.expectPdfViewer ? 45_000 : 55_000);
  let attempt = 0;
  const gestures = [
    ["540", "520", "540", "1900", "900"],
    ["540", "520", "540", "1900", "900"],
    ["540", "520", "540", "1720", "700"],
    ["540", "1540", "540", "360", "600"],
    ["540", "1540", "540", "360", "600"],
    ["540", "1360", "540", "760", "350"],
  ] as const;

  while (Date.now() < deadline) {
    attempt += 1;
    const dumped = dumpUiText(device);
    if (dumped.ok) {
      text += `\n${dumped.text}`;
      rawXmlTail = dumped.rawXml.slice(-4000);
      if (dumped.text.includes("This is the developer menu") || dumped.text.includes("Continue")) {
        tapNodeMatchingText(device, /Continue/i);
        await wait(1_000);
        continue;
      }
      if (closeDevMenuIfVisible(device, dumped.text)) {
        await wait(1_000);
        continue;
      }
    }
    const screenshot = captureScreenshot(device, testCase, attempt);
    if (screenshot) screenshots.push(screenshot);
    if (expectedRowsPresent(text, testCase.expectedRows)) {
      return { ok: true, text, screenshots, rawXmlTail };
    }
    const gesture = gestures[(attempt - 1) % gestures.length];
    run("adb", ["-s", device, "shell", "input", "swipe", ...gesture]);
    await wait(1_500);
  }

  return { ok: false, text, screenshots, rawXmlTail };
}

async function runCase(device: string, testCase: AndroidRealityCase) {
  const backend = validateBackend(testCase);
  const uri = buildDeepLink(testCase);
  let launch = launchDeepLink(device, uri);
  await wait(5_000);
  let effectiveUri = uri;
  let fallbackUsed = false;
  const firstScreen = dumpUiText(device);
  if (
    firstScreen.ok &&
    (firstScreen.text.includes("Development Build") ||
      firstScreen.text.includes("DEVELOPMENT SERVERS") ||
      firstScreen.text.includes("There was a problem loading the project") ||
      firstScreen.text.includes("SocketTimeoutException"))
  ) {
    await waitForDevClientBundle(device);
    launch = launchDeepLink(device, uri);
    await wait(5_000);
  }
  if (
    firstScreen.ok &&
    testCase.fallbackDeepLink &&
    (firstScreen.text.includes("auth.login.screen") || firstScreen.text.includes("Email"))
  ) {
    fallbackUsed = true;
    effectiveUri = buildDeepLink(testCase, true);
    launch = launchDeepLink(device, effectiveUri);
    await wait(5_000);
  }
  let screen = await collectScreenText(device, testCase);
  if (
    !screen.ok &&
    !fallbackUsed &&
    testCase.fallbackDeepLink &&
    (screen.text.includes("auth.login.screen") || screen.text.includes("Email"))
  ) {
    fallbackUsed = true;
    effectiveUri = buildDeepLink(testCase, true);
    launch = launchDeepLink(device, effectiveUri);
    await wait(5_000);
    screen = await collectScreenText(device, testCase);
  }
  const uiRowsPresent = screen.ok;
  const forbiddenUiPhrase = Array.from(FORBIDDEN_ROW_NAMES).filter((row) => normalize(screen.text).includes(normalize(row)));
  const failures = [
    ...backend.failures.map((failure) => `backend:${failure}`),
    ...(launch.ok ? [] : [`launch:${launch.output.slice(0, 200)}`]),
    ...(uiRowsPresent ? [] : ["ui_expected_rows_missing"]),
    ...forbiddenUiPhrase.map((row) => `ui_forbidden_phrase:${row}`),
  ];
  return {
    id: testCase.id,
    route: testCase.route,
    prompt: testCase.prompt,
    expectedWorkKey: testCase.expectedWorkKey,
    deepLink: effectiveUri,
    primary_deepLink: uri,
    fallback_deepLink_used: fallbackUsed,
    launch_ok: launch.ok,
    backend_ok: backend.ok,
    backend_rows: backendRowsFor(testCase),
    ui_rows_present: uiRowsPresent,
    forbidden_ui_phrases: forbiddenUiPhrase,
    screenshots: screen.screenshots,
    text_sample: screen.text.slice(-2500),
    raw_xml_tail: screen.rawXmlTail,
    failures,
  };
}

async function main(): Promise<void> {
  const failures: string[] = [];
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const metro = await ensureMetro();
  if (!metro.reachable) failures.push("metro_not_reachable");

  const devices = connectedEmulators();
  if (devices.length === 0) failures.push("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
  if (!fs.existsSync(APK_PATH)) failures.push(`apk_missing:${APK_PATH}`);

  let install: { ok: boolean; output: string } | null = null;
  const results: Awaited<ReturnType<typeof runCase>>[] = [];
  if (devices.length > 0 && fs.existsSync(APK_PATH) && metro.reachable) {
    const device = devices[0];
    install = installApk(device);
    if (!install.ok) {
      failures.push(`apk_install_failed:${install.output.slice(0, 300)}`);
    } else {
      run("adb", ["-s", device, "shell", "pm", "grant", PACKAGE_NAME, "android.permission.POST_NOTIFICATIONS"]);
      const devClient = await waitForDevClientBundle(device);
      if (!devClient.ok) {
        failures.push(`dev_client_bundle_not_loaded:${devClient.launch.output.slice(0, 300)}:${devClient.text.slice(0, 300)}`);
      }
      for (const testCase of CASES) {
        const result = await runCase(device, testCase);
        results.push(result);
        failures.push(...result.failures.map((failure) => `${testCase.id}:${failure}`));
      }
    }
  }

  const androidPassed = failures.length === 0;
  const artifact = {
    wave: "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_GATE_POINT_OF_NO_RETURN",
    final_status:
      devices.length === 0
        ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
        : androidPassed
          ? "GREEN_ANDROID_LIVE_ESTIMATE_REALITY_SMOKE_READY"
          : "BLOCKED_ANDROID_EMULATOR_FAILED",
    android_emulator_tested: devices.length > 0,
    android_emulator_passed: androidPassed,
    devices,
    metro,
    android_dev_port: ANDROID_DEV_PORT,
    apk_path: APK_PATH,
    apk_exists: fs.existsSync(APK_PATH),
    apk_install_ok: install?.ok ?? false,
    install_output: install?.output.slice(0, 500) ?? null,
    cases: results,
    fake_green_claimed: false,
  };

  writeJson(ANDROID_ARTIFACT, artifact);
  writeJson(FAILURE_ARTIFACT, failures);
  writeJson(RUNTIME_TRACE_ARTIFACT, {
    android_backend_traces: CASES
      .filter((testCase) => !testCase.expectPdfViewer)
      .map((testCase) => ({
        id: testCase.id,
        route: testCase.route,
        prompt: testCase.prompt,
        trace: answerBuiltInAi({
          text: testCase.prompt,
          screenContext: testCase.screenContext,
          route: testCase.route,
          role: testCase.screenContext === "foreman" ? "foreman" : testCase.screenContext === "request" ? "consumer" : "unknown",
          countryCode: "KG",
          cityOrRegion: "Bishkek",
        }).runtimeTrace,
      })),
  });

  if (!androidPassed) {
    throw new Error(artifact.final_status);
  }
  console.log(artifact.final_status);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
