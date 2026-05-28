import fs from "node:fs";
import path from "node:path";

import {
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

const WAVE = "S_ANDROID_API34_GLOBAL_LOCAL_ESTIMATE_SMOKE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_GLOBAL_LOCAL_ESTIMATE_PLATFORM");
const PORT = Number(process.env.GLOBAL_LOCAL_ANDROID_PORT ?? 8134);
const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";

type AndroidGlobalLocalCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  mode: "estimate" | "missing_location" | "ambiguous";
  workTokens: string[];
  localTokens: string[];
  minWorkMatches: number;
  minLocalMatches: number;
};

const CASES: AndroidGlobalLocalCase[] = [
  {
    id: "request_roof_waterproofing_bishkek",
    route: "/request",
    prompt: "смета на гидроизоляцию крыши 100 кв м в Бишкеке",
    mode: "estimate",
    workTokens: ["кров", "праймер", "гидроизоляц", "мембран", "примыкан"],
    localTokens: ["Бишкек", "KGS", "регион", "налог", "источник"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "request_hydro_turbine_kyrgyzstan",
    route: "/request",
    prompt: "смета на установку турбины на ГЭС 100 кВт в Кыргызстане",
    mode: "estimate",
    workTokens: ["турбин", "генератор", "шкаф", "кабель", "ПНР"],
    localTokens: ["Кыргызстан", "KGS", "НДС", "источник", "валюта"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "request_missing_location_brick",
    route: "/request",
    prompt: "смета на кладку кирпича 74 кв метров",
    mode: "missing_location",
    workTokens: ["кирпич", "раствор", "кладк", "армирован"],
    localTokens: ["регион", "уточните", "страна", "город", "ориентировоч"],
    minWorkMatches: 3,
    minLocalMatches: 2,
  },
  {
    id: "embedded_asphalt_almaty",
    route: "/ai?context=foreman",
    prompt: "смета на асфальтирование 10000 кв м в Алматы",
    mode: "estimate",
    workTokens: ["песок", "щеб", "битум", "асфальтобетон", "уплотн"],
    localTokens: ["Алматы", "KZT", "Казахстан", "VAT", "источник"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "embedded_drywall_austin",
    route: "/ai?context=foreman",
    prompt: "estimate for drywall installation on 1200 sq ft in Austin Texas",
    mode: "estimate",
    workTokens: ["drywall", "profile", "frame", "fastener", "joint"],
    localTokens: ["Austin", "Texas", "USD", "sales tax", "source"],
    minWorkMatches: 4,
    minLocalMatches: 3,
  },
  {
    id: "embedded_ambiguous_waterproofing",
    route: "/ai?context=foreman",
    prompt: "гидроизоляция 100 кв м",
    mode: "ambiguous",
    workTokens: ["уточ", "кров", "ванн", "фундамент"],
    localTokens: ["регион", "город", "страна", "уточните"],
    minWorkMatches: 3,
    minLocalMatches: 2,
  },
];

function ensureDir(): void {
  fs.mkdirSync(path.join(ARTIFACT_DIR, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(ARTIFACT_DIR, "ui"), { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalized(value: string): string {
  return value.toLocaleLowerCase("ru-RU");
}

function tokenMatches(text: string, tokens: string[]): number {
  const haystack = normalized(text);
  return tokens.filter((token) => haystack.includes(normalized(token))).length;
}

function hasGenericRows(text: string): boolean {
  return /(^|\n)\s*(Строительные работы|Осмотр|Ремонтные работы|Материалы по согласованию|Работы по согласованию|Construction work|Repair work)\s*(\n|$)/i.test(text);
}

function buildRouteUri(testCase: AndroidGlobalLocalCase): string {
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

function routeReady(testCase: AndroidGlobalLocalCase, screen: ReturnType<typeof captureScreenInDir>): boolean {
  if (testCase.route === "/request") {
    return requestRouteReady(screen) && screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY);
  }
  return embeddedAiRouteReady(screen) && screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY);
}

async function waitForScreen(
  id: string,
  ready: (screen: ReturnType<typeof captureScreenInDir>) => boolean,
  timeoutMs: number,
): Promise<ReturnType<typeof captureScreenInDir>> {
  const startedAt = Date.now();
  let last = captureScreenInDir(id, ARTIFACT_DIR);
  while (Date.now() - startedAt < timeoutMs) {
    if (ready(last)) return last;
    dismissBlockingAndroidSurface(last);
    await sleep(1500);
    last = captureScreenInDir(id, ARTIFACT_DIR);
  }
  return last;
}

async function captureScrollableText(id: string): Promise<ReturnType<typeof captureScreenInDir>[]> {
  const captures = [captureScreenInDir(`${id}_top`, ARTIFACT_DIR)];
  for (let index = 1; index <= 6; index += 1) {
    try {
      runAdb(["shell", "input", "swipe", "540", "1500", "540", "540", "450"], 8000);
    } catch {
      // The next UI dump records the actual Android state.
    }
    await sleep(650);
    captures.push(captureScreenInDir(`${id}_scroll_${index}`, ARTIFACT_DIR));
  }
  return captures;
}

async function runCase(testCase: AndroidGlobalLocalCase, device: Awaited<ReturnType<typeof ensureAndroidApi34DeviceReady>>) {
  setupAndroidRuntime(PORT, APP_PACKAGE);
  openDeepLink(buildDevClientUri(PORT));
  const root = await waitForScreen(`${testCase.id}_root`, (screen) => screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY), 90_000);
  const screenshots = [root.screenshot_path].filter((item): item is string => Boolean(item));
  const uiDumps = [root.ui_dump_path].filter((item): item is string => Boolean(item));

  if (!root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) {
    return {
      id: testCase.id,
      route: testCase.route,
      prompt: testCase.prompt,
      mode: testCase.mode,
      passed: false,
      route_marker_visible: false,
      response_visible: false,
      work_specific_rows_found: false,
      local_context_visible: false,
      source_confidence_visible: false,
      tax_or_warning_visible: false,
      pdf_action_visible: false,
      generic_known_work_rows_found: false,
      error: "ROUTE_PROOF_APP_ROOT_READY not visible",
      error_if_any: "ROUTE_PROOF_APP_ROOT_READY not visible",
      screenshots,
      uiDumps,
    };
  }

  openDeepLink(buildRouteUri(testCase));
  const loaded = await waitForScreen(`${testCase.id}_loaded`, (screen) => routeReady(testCase, screen), 60_000);
  if (loaded.screenshot_path) screenshots.push(loaded.screenshot_path);
  if (loaded.ui_dump_path) uiDumps.push(loaded.ui_dump_path);
  await sleep(9000);
  const captures = await captureScrollableText(`${testCase.id}_after_prompt`);
  screenshots.push(...captures.map((capture) => capture.screenshot_path).filter((item): item is string => Boolean(item)));
  uiDumps.push(...captures.map((capture) => capture.ui_dump_path).filter((item): item is string => Boolean(item)));
  const text = [loaded.visibleText, ...captures.map((capture) => capture.visibleText)].join("\n");
  const workMatches = tokenMatches(text, testCase.workTokens);
  const localMatches = tokenMatches(text, testCase.localTokens);
  const routeMarker =
    testCase.route === "/request" ? ROUTE_PROOF_REQUEST_ROUTE_READY : ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY;
  const pdfActionVisible = /PDF|Сделать PDF|Создать PDF/i.test(text);
  const result = {
    id: testCase.id,
    route: testCase.route,
    prompt: testCase.prompt,
    mode: testCase.mode,
    device_id: device.device_id,
    avd_name: device.avd_name,
    android_sdk: device.android_sdk,
    cpu_abi: device.cpu_abi,
    route_marker: routeMarker,
    route_marker_visible: loaded.visibleText.includes(routeMarker) || text.includes(routeMarker),
    prompt_submitted: true,
    response_visible: text.length > 200,
    work_specific_rows_found: workMatches >= testCase.minWorkMatches,
    local_context_visible: localMatches >= testCase.minLocalMatches,
    source_confidence_visible: /источник|source|confidence|уверенн/i.test(text),
    tax_or_warning_visible: /налог|НДС|VAT|GST|sales tax|tax|регион|уточните/i.test(text),
    pdf_action_visible: testCase.mode === "estimate" ? pdfActionVisible : true,
    generic_known_work_rows_found: hasGenericRows(text),
    screenshot_path: screenshots.find((item) => fileIsReal(item, 1000)) ?? null,
    ui_dump_path: uiDumps.find((item) => fileIsReal(item, 1000)) ?? null,
    visible_rows: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 80),
    screenshots,
    uiDumps,
    error_if_any: null as string | null,
  };
  const passed =
    result.route_marker_visible &&
    result.response_visible &&
    result.work_specific_rows_found &&
    result.local_context_visible &&
    result.source_confidence_visible &&
    result.tax_or_warning_visible &&
    result.pdf_action_visible &&
    !result.generic_known_work_rows_found &&
    Boolean(result.screenshot_path) &&
    Boolean(result.ui_dump_path);

  return {
    ...result,
    passed,
    error_if_any: passed ? null : "ANDROID_GLOBAL_LOCAL_ASSERTION_FAILED",
  };
}

async function main(): Promise<void> {
  ensureDir();
  const environment = await ensureAndroidApi34DeviceReady({ artifactDir: ARTIFACT_DIR });
  writeJson("android_api34_environment.json", environment);
  if (environment.final_status !== API34_DEVICE_READY) {
    const matrix = {
      wave: WAVE,
      final_status: environment.final_status,
      android_api34_tested: false,
      api36_rejected: true,
      fake_green_claimed: false,
    };
    writeJson("android_api34_results.json", matrix);
    writeJson("android_screenshots.json", []);
    writeJson("android_ui_dumps.json", []);
    console.error(matrix.final_status);
    process.exitCode = 1;
    return;
  }

  const metro = await ensureMetro(PORT);
  try {
    const results = [];
    for (const testCase of CASES) {
      results.push(await runCase(testCase, environment));
    }
    const failures = results.filter((item) => !item.passed);
    const screenshots = results.flatMap((item) => item.screenshots).filter((item) => fileIsReal(item, 1000));
    const uiDumps = results.flatMap((item) => item.uiDumps).filter((item) => fileIsReal(item, 1000));
    const matrix = {
      wave: WAVE,
      final_status: failures.length === 0
        ? "GREEN_ANDROID_API34_GLOBAL_LOCAL_ESTIMATE_SMOKE_READY"
        : "BLOCKED_ANDROID_API34_GLOBAL_LOCAL_ESTIMATE_SMOKE_FAILED",
      android_api34_tested: true,
      android_api34_smoke_passed: failures.length === 0,
      api36_rejected: true,
      avd_name: environment.avd_name,
      android_sdk: environment.android_sdk,
      cpu_abi: environment.cpu_abi,
      request_route_opened: results.some((item) => item.route === "/request" && item.route_marker_visible),
      embedded_ai_route_opened: results.some((item) => item.route === "/ai?context=foreman" && item.route_marker_visible),
      android_screenshots_real: screenshots.length >= CASES.length,
      android_ui_dumps_real: uiDumps.length >= CASES.length,
      generic_known_work_rows_found: results.some((item) => item.generic_known_work_rows_found),
      fake_green_claimed: false,
    };
    writeJson("android_api34_results.json", matrix);
    writeJson("android_route_results.json", results);
    writeJson("android_screenshots.json", screenshots);
    writeJson("android_ui_dumps.json", uiDumps);
    writeJson("android_failures.json", failures);
    console.log(matrix.final_status);
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    stopMetro(metro);
  }
}

main().catch((error) => {
  writeJson("android_api34_results.json", {
    wave: WAVE,
    final_status: "BLOCKED_ANDROID_API34_GLOBAL_LOCAL_ESTIMATE_SMOKE_EXCEPTION",
    error: error instanceof Error ? error.message : String(error),
    fake_green_claimed: false,
  });
  console.error(error);
  process.exitCode = 1;
});
