import fs from "node:fs";
import path from "node:path";

import {
  API34_AVD_NAME,
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "./ensureAndroidApi34DeviceReady";
import {
  buildDevClientUri,
  captureScreenInDir,
  dismissBlockingAndroidSurface,
  embeddedAiRouteReady,
  ensureMetro,
  fileIsReal,
  openDeepLink,
  requestRouteReady,
  runAdb,
  setupAndroidRuntime,
  sleep,
  stopMetro,
  ROUTE_PROOF_APP_ROOT_READY,
  ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY,
  ROUTE_PROOF_REQUEST_ROUTE_READY,
} from "./androidRouteBootstrapHarness";

const WAVE = "S_ANDROID_API34_WORLD_CONSTRUCTION_ESTIMATE_SMOKE_POINT_OF_NO_RETURN";
const DIR = path.join(process.cwd(), "artifacts", "S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE");
const PORT = Number(process.env.WORLD_CONSTRUCTION_ANDROID_PORT ?? 8130);
const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";

type AndroidCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  expected: string[];
  minExpectedMatches?: number;
  forbidden?: string[];
};

const CASES: AndroidCase[] = [
  { id: "request_roof_waterproofing", route: "/request", prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м", expected: ["кров", "праймер", "гидроизоляц", "мембран", "примыкан", "герметич", "ворон"], minExpectedMatches: 4, forbidden: ["ванная", "санузел", "душевая"] },
  { id: "request_hydro_turbine", route: "/request", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["турбин", "генератор", "шкаф", "синхронизац", "щит", "кабел", "монтаж", "ПНР"], minExpectedMatches: 4 },
  { id: "request_ambiguous_waterproofing", route: "/request", prompt: "гидроизоляция 100 кв м", expected: ["уточ", "кров", "ванн", "фундамент"], minExpectedMatches: 3 },
  { id: "embedded_roof_waterproofing", route: "/ai?context=foreman", prompt: "смета на гидроизоляцию крыши 100 кв м", expected: ["кров", "праймер", "гидроизоляц", "мембран", "примыкан", "герметич", "ворон"], minExpectedMatches: 4, forbidden: ["ванная", "санузел", "душевая"] },
  { id: "embedded_hydro_turbine", route: "/ai?context=foreman", prompt: "смета на установку турбины на гэс мощностью 100 квт", expected: ["турбин", "генератор", "шкаф", "синхронизац", "щит", "кабел", "монтаж", "ПНР"], minExpectedMatches: 4 },
  { id: "embedded_asphalt", route: "/ai?context=foreman", prompt: "смета на асфальтирование 10000 кв м", expected: ["песчан", "щеб", "битум", "асфальтобетон", "уклад", "уплотн"], minExpectedMatches: 4 },
  { id: "embedded_gkl", route: "/ai?context=foreman", prompt: "смета на установку ГКЛ на стены 352 кв м", expected: ["ГКЛ", "профил", "каркас", "креп", "шпакл", "обшив"], minExpectedMatches: 4 },
  { id: "embedded_well", route: "/ai?context=foreman", prompt: "смета на бурение скважины 80 метров", expected: ["скваж", "обсад", "бурение", "насос", "оголов", "фильтр"], minExpectedMatches: 3 },
];

function ensureDir(): void {
  fs.mkdirSync(path.join(DIR, "android_api34_screenshots"), { recursive: true });
  fs.mkdirSync(path.join(DIR, "android_api34_ui"), { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  fs.writeFileSync(path.join(DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildUri(testCase: AndroidCase): string {
  const query = new URLSearchParams();
  query.set("prompt", testCase.prompt);
  if (testCase.route === "/request") {
    query.set("autoPrepare", "1");
    return `rik:///request?${query.toString()}`;
  }
  query.set("context", "foreman");
  query.set("autoSend", "1");
  return `rik:///ai?${query.toString()}`;
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("ru-RU");
}

function countMatches(text: string, tokens: string[]): number {
  const haystack = normalized(text);
  return tokens.filter((token) => haystack.includes(normalized(token))).length;
}

function expectedMatchThreshold(testCase: AndroidCase): number {
  return testCase.minExpectedMatches ?? testCase.expected.length;
}

function containsExpected(text: string, testCase: AndroidCase): boolean {
  return countMatches(text, testCase.expected) >= expectedMatchThreshold(testCase);
}

function containsForbidden(text: string, tokens: string[] = []): boolean {
  const haystack = normalized(text);
  return tokens.some((token) => haystack.includes(normalized(token)));
}

function hasGenericRows(text: string): boolean {
  return /(^|\n)\s*(Строительные работы|Осмотр|Ремонтные работы|Ремонтные работы после согласования)\s*(\n|$)/i.test(text);
}

function routeReady(testCase: AndroidCase, screen: ReturnType<typeof captureScreenInDir>): boolean {
  if (testCase.route === "/request") {
    return (
      requestRouteReady(screen) &&
      screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY) &&
      !screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY)
    );
  }
  return (
    embeddedAiRouteReady(screen) &&
    screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY) &&
    !screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY)
  );
}

async function waitForScreen(captureId: string, ready: (screen: ReturnType<typeof captureScreenInDir>) => boolean, timeoutMs: number) {
  const startedAt = Date.now();
  let last = captureScreenInDir(captureId, DIR);
  while (Date.now() - startedAt < timeoutMs) {
    if (ready(last)) return last;
    dismissBlockingAndroidSurface(last);
    await sleep(1500);
    last = captureScreenInDir(captureId, DIR);
  }
  return last;
}

async function captureWithScroll(id: string, testCase: AndroidCase): Promise<ReturnType<typeof captureScreenInDir>[]> {
  const captures: ReturnType<typeof captureScreenInDir>[] = [];
  captures.push(captureScreenInDir(`${id}_top`, DIR));
  if (containsExpected(captures.map((capture) => capture.visibleText).join("\n"), testCase)) {
    return captures;
  }

  for (let index = 1; index <= 8; index += 1) {
    try {
      runAdb(["shell", "input", "swipe", "540", "650", "540", "1600", "500"], 8000);
    } catch {
      // The next capture records the live Android state.
    }
    await sleep(700);
    captures.push(captureScreenInDir(`${id}_reverse_${index}`, DIR));
    if (containsExpected(captures.map((capture) => capture.visibleText).join("\n"), testCase)) {
      return captures;
    }
  }

  for (let index = 1; index <= 16; index += 1) {
    try {
      runAdb(["shell", "input", "swipe", "540", "1500", "540", "520", "500"], 8000);
    } catch {
      // The next capture records the live Android state.
    }
    await sleep(900);
    captures.push(captureScreenInDir(`${id}_scroll_${index}`, DIR));
    if (index >= 2 && containsExpected(captures.map((capture) => capture.visibleText).join("\n"), testCase)) {
      break;
    }
  }
  return captures;
}

async function openAppRootForCase(caseId: string): Promise<ReturnType<typeof captureScreenInDir>> {
  setupAndroidRuntime(PORT, APP_PACKAGE);
  openDeepLink(buildDevClientUri(PORT));
  return waitForScreen(`${caseId}_root`, (screen) => screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY), 90_000);
}

async function runCaseAttempt(
  testCase: AndroidCase,
  attempt: number,
  environment: Awaited<ReturnType<typeof ensureAndroidApi34DeviceReady>>,
): Promise<{
  result: Record<string, unknown> | null;
  failure: unknown | null;
  screenshots: string[];
  uiDumps: string[];
}> {
  const capturePrefix = attempt === 1 ? testCase.id : `${testCase.id}_retry_${attempt}`;
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const caseRoot = await openAppRootForCase(capturePrefix);
  if (caseRoot.screenshot_path) screenshots.push(caseRoot.screenshot_path);
  if (caseRoot.ui_dump_path) uiDumps.push(caseRoot.ui_dump_path);
  if (!caseRoot.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) {
    return {
      result: null,
      screenshots,
      uiDumps,
      failure: {
        id: `${testCase.id}_app_root`,
        attempt,
        error: "ROUTE_PROOF_APP_ROOT_READY not visible before route",
        screenshot_path: caseRoot.screenshot_path,
        ui_dump_path: caseRoot.ui_dump_path,
      },
    };
  }

  openDeepLink(buildUri(testCase));
  let loaded = await waitForScreen(`${capturePrefix}_loaded`, (screen) => routeReady(testCase, screen), 60_000);
  if (!routeReady(testCase, loaded)) {
    openDeepLink(buildUri(testCase));
    loaded = await waitForScreen(`${capturePrefix}_loaded_retry`, (screen) => routeReady(testCase, screen), 60_000);
  }
  await sleep(10_000);
  const captures = await captureWithScroll(`${capturePrefix}_after_prompt`, testCase);
  const outputText = captures.map((capture) => capture.visibleText).join("\n");
  const best = captures.reduce((currentBest, capture) => {
    return countMatches(capture.visibleText, testCase.expected) > countMatches(currentBest.visibleText, testCase.expected)
      ? capture
      : currentBest;
  }, captures[captures.length - 1]);
  screenshots.push(
    ...[loaded.screenshot_path, ...captures.map((capture) => capture.screenshot_path)].filter(
      (item): item is string => typeof item === "string",
    ),
  );
  uiDumps.push(
    ...[loaded.ui_dump_path, ...captures.map((capture) => capture.ui_dump_path)].filter(
      (item): item is string => typeof item === "string",
    ),
  );
  const result = {
    platform: "android",
    avd_name: environment.avd_name,
    android_sdk: environment.android_sdk,
    cpu_abi: environment.cpu_abi,
    route: testCase.route,
    prompt: testCase.prompt,
    attempt,
    route_loaded: routeReady(testCase, loaded),
    response_visible: containsExpected(outputText, testCase),
    visible_rows: outputText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 120),
    expected_rows_matched: countMatches(outputText, testCase.expected),
    expected_rows_required: expectedMatchThreshold(testCase),
    work_specific_rows_found: containsExpected(outputText, testCase),
    generic_known_work_rows_found: hasGenericRows(outputText) || containsForbidden(outputText, testCase.forbidden),
    catalog_binding_scan: /каталог|catalog|справочник|источник|уверенность/i.test(outputText),
    pdf_action_visible: /pdf|ПДФ|Сделать PDF|Создать PDF/i.test(outputText),
    screenshot_path: best.screenshot_path,
    ui_dump_path: best.ui_dump_path,
    runtime_trace_id_if_available: "not_available_from_android_ui",
  };
  const failed =
    !result.route_loaded ||
    !result.response_visible ||
    !result.work_specific_rows_found ||
    result.generic_known_work_rows_found ||
    !fileIsReal(result.screenshot_path, 1000) ||
    !fileIsReal(result.ui_dump_path, 100);
  return {
    result,
    screenshots,
    uiDumps,
    failure: failed ? { id: testCase.id, attempt, result } : null,
  };
}

async function main(): Promise<void> {
  ensureDir();
  const environment = await ensureAndroidApi34DeviceReady({ artifactDir: DIR });
  writeJson("android_api34_environment.json", environment);
  if (environment.final_status !== API34_DEVICE_READY || environment.android_sdk !== 34 || environment.avd_name !== API34_AVD_NAME) {
    const matrix = {
      wave: WAVE,
      final_status: environment.final_status === "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        ? "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        : "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE",
      avd_name: environment.avd_name,
      android_sdk: environment.android_sdk,
      cpu_abi: environment.cpu_abi,
      api36_rejected: true,
      android_api34_smoke_passed: false,
      fake_green_claimed: false,
    };
    writeJson("android_screenshots.json", []);
    writeJson("android_ui_dumps.json", []);
    writeJson("failures.json", [{ step: "ensureAndroidApi34DeviceReady", environment }]);
    writeJson("matrix.json", matrix);
    process.exitCode = 1;
    return;
  }

  const metro = await ensureMetro(PORT);
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const results: unknown[] = [];
  const failures: unknown[] = [];

  try {
    const root = await openAppRootForCase("world_android_api34");
    if (root.screenshot_path) screenshots.push(root.screenshot_path);
    if (root.ui_dump_path) uiDumps.push(root.ui_dump_path);
    if (!root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) {
      failures.push({ id: "app_root", error: "ROUTE_PROOF_APP_ROOT_READY not visible", screenshot_path: root.screenshot_path, ui_dump_path: root.ui_dump_path });
    }

    for (const testCase of CASES) {
      let lastFailure: unknown | null = null;
      let accepted = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const attemptResult = await runCaseAttempt(testCase, attempt, environment);
        screenshots.push(...attemptResult.screenshots);
        uiDumps.push(...attemptResult.uiDumps);
        if (attemptResult.result && !attemptResult.failure) {
          results.push(attemptResult.result);
          accepted = true;
          break;
        }
        lastFailure = attemptResult.failure;
      }
      if (!accepted) {
        if (lastFailure) failures.push(lastFailure);
      }
    }
  } finally {
    stopMetro(metro);
  }

  const screenshotsReal = screenshots.length > 0 && screenshots.every((item) => fileIsReal(item, 1000));
  const uiDumpsReal = uiDumps.length > 0 && uiDumps.every((item) => fileIsReal(item, 100));
  const passed = failures.length === 0 && screenshotsReal && uiDumpsReal;
  const matrix = {
    wave: WAVE,
    final_status: passed ? "GREEN_ANDROID_API34_WORLD_CONSTRUCTION_ESTIMATE_SMOKE_READY" : "BLOCKED_ANDROID_API34_WORLD_CONSTRUCTION_ESTIMATE_SMOKE",
    avd_name: environment.avd_name,
    android_sdk: environment.android_sdk,
    cpu_abi: environment.cpu_abi,
    api36_rejected: true,
    android_api34_smoke_passed: passed,
    screenshots_real: screenshotsReal,
    ui_dumps_real: uiDumpsReal,
    generic_known_work_rows_found: results.some((item) => (item as { generic_known_work_rows_found?: boolean }).generic_known_work_rows_found),
    fake_green_claimed: false,
  };
  writeJson("android_screenshots.json", screenshots);
  writeJson("android_ui_dumps.json", uiDumps);
  writeJson("android_world_smoke_results.json", results);
  writeJson("failures.json", failures);
  writeJson("matrix.json", matrix);

  if (!passed) process.exitCode = 1;
}

void main();
