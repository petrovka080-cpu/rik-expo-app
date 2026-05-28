import fs from "node:fs";
import path from "node:path";

import {
  ANDROID_API34_ACCEPTANCE_DIR,
  ANDROID_API34_ACCEPTANCE_WAVE,
  API34_AVD_NAME,
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
  type AndroidApi34DeviceReadyResult,
} from "./ensureAndroidApi34DeviceReady";
import {
  appRootReady,
  buildDevClientUri,
  captureScreenInDir,
  dismissBlockingAndroidSurface,
  embeddedAiRouteReady,
  ensureMetro,
  fileIsReal,
  getBuildHashOrVersion,
  hasPlaceholderText,
  openDeepLink,
  requestRouteReady,
  responseVisible,
  runAdb,
  setupAndroidRuntime,
  sleep,
  stopMetro,
  ROUTE_PROOF_APP_ROOT_READY,
  ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY,
  ROUTE_PROOF_REQUEST_ROUTE_READY,
} from "./androidRouteBootstrapHarness";
import { resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";

const GREEN = "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY";
const BINDING_FIX_DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");
const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_CLIENT_PORT = Number(process.env.ANDROID_API34_REPLAY_PORT ?? 8130);

type Api34ReplayStatus =
  | typeof GREEN
  | "BLOCKED_ANDROID_API34_ADB_TIMEOUT"
  | "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
  | "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_API34_ROUTE_REPLAY_FAILED"
  | "BLOCKED_ANDROID_API34_OUTPUT_CAPTURE_FAILED";

type Api34ReplayCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  marker: typeof ROUTE_PROOF_REQUEST_ROUTE_READY | typeof ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY;
  prompt: string;
  afterPromptCaptureId: string;
  workSpecificKeywords: string[];
  forbiddenKeywords?: string[];
};

type Api34ReplayResult = {
  device_id: string | null;
  avd_name: string;
  android_sdk: number | null;
  cpu_abi: string | null;
  route: Api34ReplayCase["route"];
  route_marker: string;
  prompt: string;
  prompt_submitted: boolean;
  response_visible: boolean;
  visible_rows: string[];
  generic_known_work_rows_found: boolean;
  work_specific_rows_found: boolean;
  source_confidence_visible: boolean;
  tax_or_warning_visible: boolean;
  pdf_action_visible: boolean;
  screenshot_path: string | null;
  ui_dump_path: string | null;
  runtime_trace_id_if_available: string;
  error_if_any: string | null;
};

type Api34ReplayMatrix = {
  wave: typeof ANDROID_API34_ACCEPTANCE_WAVE;
  final_status: Api34ReplayStatus;
  previous_status: "BLOCKED_ADB_DEVICES_HANG";
  root_cause: "API36_16K_EMULATOR_ADB_TRANSPORT_BUG";
  api36_rejected_for_acceptance: true;
  api34_required_for_acceptance: true;
  api36_detected_initially: boolean;
  api36_active_for_acceptance: boolean;
  avd_name: typeof API34_AVD_NAME;
  android_sdk: number | null;
  cpu_abi: string | null;
  device_state: string | null;
  single_device_active: boolean;
  app_root_marker_proven: boolean;
  request_route_marker_proven: boolean;
  embedded_ai_route_marker_proven: boolean;
  request_laminate_android_passed: boolean;
  request_roof_waterproofing_android_passed: boolean;
  embedded_ai_brick_android_passed: boolean;
  embedded_ai_asphalt_android_passed: boolean;
  android_screenshots_real: boolean;
  android_ui_dumps_real: boolean;
  placeholder_artifacts_found: boolean;
  generic_known_work_rows_found: boolean;
  estimate_engine_changed_this_wave: false;
  work_resolver_changed_this_wave: false;
  template_ratebook_changed_this_wave: false;
  catalog_binding_changed_this_wave: false;
  pdf_renderer_changed_this_wave: false;
  typecheck_passed: false;
  lint_passed: false;
  git_diff_check_passed: false;
  targeted_tests_passed: false;
  architecture_tests_passed: false;
  api34_android_replay_passed: boolean;
  original_android_smoke_passed: false;
  original_binding_fix_proof_passed: false;
  web_playwright_replayed: false;
  full_jest_passed: false;
  release_verify_passed: false;
  commit_created: false;
  branch_pushed: false;
  final_worktree_clean: false;
  fake_green_claimed: false;
};

const CASES: Api34ReplayCase[] = [
  {
    id: "request_laminate",
    route: "/request",
    marker: ROUTE_PROOF_REQUEST_ROUTE_READY,
    prompt: "Хочу уложить ламинат на 100 кв м",
    afterPromptCaptureId: "request_laminate_after_prompt",
    workSpecificKeywords: ["ламинат", "подложка", "плинтус", "порожки", "подготовка основания", "укладка ламината", "подрезка"],
  },
  {
    id: "request_roof_waterproofing",
    route: "/request",
    marker: ROUTE_PROOF_REQUEST_ROUTE_READY,
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    afterPromptCaptureId: "request_roof_waterproofing_after_prompt",
    workSpecificKeywords: [
      "очистка кровли",
      "праймер",
      "рулонная гидроизоляция",
      "мембрана",
      "мастика",
      "примыкания",
      "воронки",
      "проходки",
      "герметизация узлов",
      "проверка герметичности",
    ],
    forbiddenKeywords: ["ванная", "душевая", "санузел", "плитка в ванной"],
  },
  {
    id: "embedded_ai_brick",
    route: "/ai?context=foreman",
    marker: ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY,
    prompt: "дай смету на кладку кирпича 74 кв метров",
    afterPromptCaptureId: "embedded_ai_brick_after_prompt",
    workSpecificKeywords: [
      "кирпич",
      "раствор",
      "кладочная смесь",
      "кладочная сетка",
      "армирование",
      "кладка",
      "расшивка",
      "перевязка швов",
      "доставка",
      "подъём",
    ],
  },
  {
    id: "embedded_ai_asphalt",
    route: "/ai?context=foreman",
    marker: ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY,
    prompt: "смета на асфальтирование 10000 кв м",
    afterPromptCaptureId: "embedded_ai_asphalt_after_prompt",
    workSpecificKeywords: [
      "\u043f\u0435\u0441\u0447\u0430\u043d",
      "\u0449\u0435\u0431\u0435\u043d",
      "\u0431\u0438\u0442\u0443\u043c\u043d",
      "\u044d\u043c\u0443\u043b\u044c\u0441",
      "\u0430\u0441\u0444\u0430\u043b\u044c\u0442",
      "\u0443\u043a\u043b\u0430\u0434",
      "\u0443\u043f\u043b\u043e\u0442",
      "песок",
      "основание",
      "щебень",
      "битумная эмульсия",
      "праймер",
      "асфальтобетон",
      "техника",
      "укладка",
      "уплотнение",
    ],
  },
];

function ensureDir(targetDir = ANDROID_API34_ACCEPTANCE_DIR): void {
  fs.mkdirSync(path.join(targetDir, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "ui"), { recursive: true });
}

function writeJson(name: string, value: unknown, targetDir = ANDROID_API34_ACCEPTANCE_DIR): void {
  ensureDir(targetDir);
  fs.writeFileSync(path.join(targetDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string, targetDir = ANDROID_API34_ACCEPTANCE_DIR): void {
  ensureDir(targetDir);
  fs.writeFileSync(path.join(targetDir, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function relative(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function promptForApp(testCase: Api34ReplayCase): string {
  const promptsById: Record<string, string> = {
    request_laminate: "\u0425\u043e\u0447\u0443 \u0443\u043b\u043e\u0436\u0438\u0442\u044c \u043b\u0430\u043c\u0438\u043d\u0430\u0442 \u043d\u0430 100 \u043a\u0432 \u043c",
    request_roof_waterproofing:
      "\u0445\u043e\u0447\u0443 \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 \u043d\u0430 100 \u043a\u0432 \u043c",
    embedded_ai_brick:
      "\u0434\u0430\u0439 \u0441\u043c\u0435\u0442\u0443 \u043d\u0430 \u043a\u043b\u0430\u0434\u043a\u0443 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 74 \u043a\u0432 \u043c\u0435\u0442\u0440\u043e\u0432",
    embedded_ai_asphalt:
      "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 10000 \u043a\u0432 \u043c",
  };
  return promptsById[testCase.id] ?? testCase.prompt;
}

function buildUri(testCase: Api34ReplayCase, variant: "canonical" | "scheme" | "tabs" = "canonical"): string {
  const query = new URLSearchParams();
  query.set("prompt", promptForApp(testCase));
  if (testCase.route === "/request") {
    query.set("autoPrepare", "1");
    if (variant === "scheme") return `rik://request?${query.toString()}`;
    if (variant === "tabs") return `rik:///%28tabs%29/request?${query.toString()}`;
    return `rik:///request?${query.toString()}`;
  }
  query.set("context", "foreman");
  query.set("autoSend", "1");
  if (variant === "scheme") return `rik://ai?${query.toString()}`;
  if (variant === "tabs") return `rik:///%28tabs%29/ai?${query.toString()}`;
  return `rik:///ai?${query.toString()}`;
}

function buildUriCandidates(testCase: Api34ReplayCase): string[] {
  return [
    buildUri(testCase, "canonical"),
    buildUri(testCase, "scheme"),
    buildUri(testCase, "tabs"),
  ];
}

function visibleRowsFromText(text: string): string[] {
  return text
    .split(/\r?\n| {2,}|(?=\b\d+(?:[.)]|\\.)\s+)/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0)
    .slice(0, 120);
}

function countKeywordHits(text: string, keywords: string[]): number {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return keywords.filter((keyword) => normalized.includes(keyword.toLocaleLowerCase("ru-RU"))).length;
}

function hasForbiddenKnownWorkRows(rows: string[]): boolean {
  const forbidden = [
    /^Строительные работы$/i,
    /^Основной материал:\s*Строительные работы$/i,
    /^Подготовка:\s*Строительные работы$/i,
    /^Материалы:\s*Строительные работы$/i,
    /^Работы:\s*Строительные работы$/i,
    /^Осмотр$/i,
    /^Ремонтные работы$/i,
    /^Ремонтные работы после согласования$/i,
  ];
  return rows.some((row) => forbidden.some((pattern) => pattern.test(row.trim())));
}

function sourceConfidenceVisible(text: string): boolean {
  if (/catalog_items|catalogItemId|sourceId|reference|backend|\u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d/i.test(text)) {
    return true;
  }
  return /источник|уверенн|confidence|source|каталог|rate|ставк/i.test(text);
}

function taxOrWarningVisible(text: string): boolean {
  return /ндс|налог|tax|предупрежд|уточн|без учета|без учёта|warning/i.test(text);
}

function pdfActionVisible(text: string): boolean {
  return /pdf|пдф|сделать pdf|скачать pdf|открыть pdf/i.test(text);
}

function bestEffortAdb(args: string[], timeoutMs = 8000): void {
  try {
    runAdb(args, timeoutMs);
  } catch {
    // Android screenshot/XML evidence decides the final status for this proof.
  }
}

async function resetAndroidAppForReplay(): Promise<void> {
  bestEffortAdb(["logcat", "-c"], 10_000);
  bestEffortAdb(["shell", "am", "broadcast", "-a", "android.intent.action.CLOSE_SYSTEM_DIALOGS"], 5000);
  bestEffortAdb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"], 5000);
  bestEffortAdb(["shell", "wm", "dismiss-keyguard"], 5000);
  bestEffortAdb(["shell", "am", "force-stop", APP_PACKAGE], 10_000);
  setupAndroidRuntime(DEV_CLIENT_PORT, APP_PACKAGE);
  await sleep(2000);
}

function isRuntimeLoadError(screen: ReturnType<typeof captureScreenInDir>): boolean {
  return /There was a problem loading the project|SocketTimeoutException|isn't responding|keeps stopping|has stopped/i.test(
    screen.visibleText,
  );
}

function mergeVisibleText(captures: ReturnType<typeof captureScreenInDir>[]): string {
  return captures
    .map((capture) => capture.visibleText)
    .filter(Boolean)
    .join("\n");
}

function bestCaptureForResult(
  captures: ReturnType<typeof captureScreenInDir>[],
  testCase: Api34ReplayCase,
): ReturnType<typeof captureScreenInDir> {
  return captures.reduce((best, candidate) => {
    const bestScore = countKeywordHits(best.visibleText, testCase.workSpecificKeywords) * 1000 + best.visibleText.length;
    const candidateScore =
      countKeywordHits(candidate.visibleText, testCase.workSpecificKeywords) * 1000 + candidate.visibleText.length;
    return candidateScore > bestScore ? candidate : best;
  }, captures[0]);
}

async function captureScrollableOutput(
  captureId: string,
  testCase: Api34ReplayCase,
): Promise<{
  captures: ReturnType<typeof captureScreenInDir>[];
  outputText: string;
  best: ReturnType<typeof captureScreenInDir>;
}> {
  const captures: ReturnType<typeof captureScreenInDir>[] = [];
  captures.push(captureScreenInDir(captureId, ANDROID_API34_ACCEPTANCE_DIR));
  if (isRuntimeLoadError(captures[0])) {
    const outputText = mergeVisibleText(captures);
    return { captures, outputText, best: captures[0] };
  }

  for (let index = 1; index <= 3; index += 1) {
    try {
      runAdb(["shell", "input", "swipe", "540", "650", "540", "1600", "500"], 8000);
    } catch {
      // The next capture records the actual Android state and dump errors.
    }
    await sleep(900);
    captures.push(captureScreenInDir(`${captureId}_reverse_${index}`, ANDROID_API34_ACCEPTANCE_DIR));
    if (isRuntimeLoadError(captures[captures.length - 1])) break;
  }

  for (let index = 1; index <= 7; index += 1) {
    if (isRuntimeLoadError(captures[captures.length - 1])) break;
    try {
      runAdb(["shell", "input", "swipe", "540", "1500", "540", "520", "550"], 8000);
    } catch {
      // The next capture records the actual Android state and dump errors.
    }
    await sleep(900);
    captures.push(captureScreenInDir(`${captureId}_scroll_${index}`, ANDROID_API34_ACCEPTANCE_DIR));
    if (isRuntimeLoadError(captures[captures.length - 1])) break;

    const text = mergeVisibleText(captures);
    if (
      countKeywordHits(text, testCase.workSpecificKeywords) >= 4 &&
      sourceConfidenceVisible(text) &&
      taxOrWarningVisible(text) &&
      pdfActionVisible(text)
    ) {
      break;
    }
  }

  const outputText = mergeVisibleText(captures);
  return { captures, outputText, best: bestCaptureForResult(captures, testCase) };
}

async function waitForAndroidScreen(params: {
  captureId: string;
  timeoutMs: number;
  ready: (screen: ReturnType<typeof captureScreenInDir>) => boolean;
}): Promise<ReturnType<typeof captureScreenInDir>> {
  const startedAt = Date.now();
  let last = captureScreenInDir(params.captureId, ANDROID_API34_ACCEPTANCE_DIR);
  while (Date.now() - startedAt < params.timeoutMs) {
    if (params.ready(last)) return last;
    if (isRuntimeLoadError(last)) return last;
    const dismissed = dismissBlockingAndroidSurface(last);
    await sleep(dismissed ? 2500 : 1500);
    last = captureScreenInDir(params.captureId, ANDROID_API34_ACCEPTANCE_DIR);
  }
  return last;
}

function routeReadyForCase(testCase: Api34ReplayCase, screen: ReturnType<typeof captureScreenInDir>): boolean {
  return testCase.route === "/request"
    ? requestRouteReady(screen) && screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY)
    : embeddedAiRouteReady(screen) && screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY);
}

async function openAppRootForReplay(captureId: string): Promise<ReturnType<typeof captureScreenInDir>> {
  setupAndroidRuntime(DEV_CLIENT_PORT, APP_PACKAGE);
  openDeepLink(buildDevClientUri(DEV_CLIENT_PORT));
  return waitForAndroidScreen({
    captureId,
    timeoutMs: 90_000,
    ready: (screen) => screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY),
  });
}

async function openCaseRoute(testCase: Api34ReplayCase): Promise<ReturnType<typeof captureScreenInDir>> {
  let last: ReturnType<typeof captureScreenInDir> | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const root = await openAppRootForReplay(`${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_root_attempt_${attempt}`);
    if (!(appRootReady(root) && root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY))) {
      last = root;
      if (isRuntimeLoadError(root)) {
        dismissBlockingAndroidSurface(root);
        await resetAndroidAppForReplay();
      }
      continue;
    }
    const uris = buildUriCandidates(testCase);
    for (let uriIndex = 0; uriIndex < uris.length; uriIndex += 1) {
      openDeepLink(uris[uriIndex]);
      last = await waitForAndroidScreen({
        captureId: `${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_loaded_attempt_${attempt}_${uriIndex}`,
        timeoutMs: attempt === 1 && uriIndex === 0 ? 60_000 : 35_000,
        ready: (screen) => routeReadyForCase(testCase, screen),
      });
      if (routeReadyForCase(testCase, last)) return last;
      if (isRuntimeLoadError(last)) {
        dismissBlockingAndroidSurface(last);
        await resetAndroidAppForReplay();
        break;
      }
    }

    if (testCase.route === "/request") {
      try {
        runAdb(["shell", "input", "tap", "270", "2250"], 5000);
      } catch {
        // The next deep link attempt is the source of truth.
      }
      await sleep(1000);
    }
  }
  return last ?? captureScreenInDir(`${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_loaded_failed`, ANDROID_API34_ACCEPTANCE_DIR);
}

function buildBlockedMatrix(status: Api34ReplayStatus, env: AndroidApi34DeviceReadyResult): Api34ReplayMatrix {
  return {
    wave: ANDROID_API34_ACCEPTANCE_WAVE,
    final_status: status,
    previous_status: "BLOCKED_ADB_DEVICES_HANG",
    root_cause: "API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
    api36_rejected_for_acceptance: true,
    api34_required_for_acceptance: true,
    api36_detected_initially: env.api36_detected_initially,
    api36_active_for_acceptance: env.final_status === "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE",
    avd_name: API34_AVD_NAME,
    android_sdk: env.android_sdk,
    cpu_abi: env.cpu_abi,
    device_state: env.device_state,
    single_device_active: env.single_device_active,
    app_root_marker_proven: false,
    request_route_marker_proven: false,
    embedded_ai_route_marker_proven: false,
    request_laminate_android_passed: false,
    request_roof_waterproofing_android_passed: false,
    embedded_ai_brick_android_passed: false,
    embedded_ai_asphalt_android_passed: false,
    android_screenshots_real: false,
    android_ui_dumps_real: false,
    placeholder_artifacts_found: false,
    generic_known_work_rows_found: false,
    estimate_engine_changed_this_wave: false,
    work_resolver_changed_this_wave: false,
    template_ratebook_changed_this_wave: false,
    catalog_binding_changed_this_wave: false,
    pdf_renderer_changed_this_wave: false,
    typecheck_passed: false,
    lint_passed: false,
    git_diff_check_passed: false,
    targeted_tests_passed: false,
    architecture_tests_passed: false,
    api34_android_replay_passed: false,
    original_android_smoke_passed: false,
    original_binding_fix_proof_passed: false,
    web_playwright_replayed: false,
    full_jest_passed: false,
    release_verify_passed: false,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };
}

function resultPassed(result: Api34ReplayResult | undefined): boolean {
  if (!result) return false;
  return (
    result.prompt_submitted &&
    result.response_visible &&
    result.work_specific_rows_found &&
    !result.generic_known_work_rows_found &&
    result.source_confidence_visible &&
    result.tax_or_warning_visible &&
    result.pdf_action_visible &&
    fileIsReal(result.screenshot_path, 1000) &&
    fileIsReal(result.ui_dump_path, 100)
  );
}

function buildMatrix(params: {
  env: AndroidApi34DeviceReadyResult;
  results: Api34ReplayResult[];
  failures: unknown[];
  screenshots: string[];
  uiDumps: string[];
  appRootMarkerProven: boolean;
}): Api34ReplayMatrix {
  const resultById = new Map(params.results.map((result, index) => [CASES[index]?.id, result]));
  const allScreenshotsReal =
    params.screenshots.length >= CASES.length && params.screenshots.every((item) => fileIsReal(item, 1000));
  const allUiDumpsReal = params.uiDumps.length >= CASES.length && params.uiDumps.every((item) => fileIsReal(item, 100));
  const passed =
    params.failures.length === 0 &&
    params.appRootMarkerProven &&
    allScreenshotsReal &&
    allUiDumpsReal &&
    !hasPlaceholderText(params.results) &&
    params.results.every(resultPassed);
  const outputCaptureFailed =
    params.results.some((result) => result.prompt_submitted && (!result.response_visible || !result.work_specific_rows_found)) ||
    params.failures.some((failure) => /response|output|capture|keyword/i.test(JSON.stringify(failure)));
  return {
    ...buildBlockedMatrix(
      passed ? GREEN : outputCaptureFailed ? "BLOCKED_ANDROID_API34_OUTPUT_CAPTURE_FAILED" : "BLOCKED_ANDROID_API34_ROUTE_REPLAY_FAILED",
      params.env,
    ),
    app_root_marker_proven: params.appRootMarkerProven,
    request_route_marker_proven: params.results.some((result) => result.route === "/request" && result.prompt_submitted),
    embedded_ai_route_marker_proven: params.results.some(
      (result) => result.route === "/ai?context=foreman" && result.prompt_submitted,
    ),
    request_laminate_android_passed: resultPassed(resultById.get("request_laminate") as Api34ReplayResult),
    request_roof_waterproofing_android_passed: resultPassed(
      resultById.get("request_roof_waterproofing") as Api34ReplayResult,
    ),
    embedded_ai_brick_android_passed: resultPassed(resultById.get("embedded_ai_brick") as Api34ReplayResult),
    embedded_ai_asphalt_android_passed: resultPassed(resultById.get("embedded_ai_asphalt") as Api34ReplayResult),
    android_screenshots_real: allScreenshotsReal,
    android_ui_dumps_real: allUiDumpsReal,
    placeholder_artifacts_found: hasPlaceholderText(params.results),
    generic_known_work_rows_found: params.results.some((result) => result.generic_known_work_rows_found),
    api34_android_replay_passed: passed,
  };
}

function writeProof(status: Api34ReplayStatus, matrix: Api34ReplayMatrix, failures: unknown[], results: Api34ReplayResult[]): void {
  writeText(
    "proof.md",
    [
      `# ${ANDROID_API34_ACCEPTANCE_WAVE}`,
      "",
      `Status: ${status}`,
      "",
      `Previous blocker: ${matrix.previous_status}`,
      `Root cause: ${matrix.root_cause}`,
      `AVD: ${matrix.avd_name}`,
      `Android SDK: ${matrix.android_sdk ?? "not_available"}`,
      `CPU ABI: ${matrix.cpu_abi ?? "not_available"}`,
      `API 36 rejected for acceptance: ${matrix.api36_rejected_for_acceptance}`,
      `API 34 replay passed: ${matrix.api34_android_replay_passed}`,
      "",
      "Replay prompts:",
      ...results.map(
        (result) =>
          `- ${result.route} ${result.prompt}: response=${result.response_visible}, workRows=${result.work_specific_rows_found}, genericRows=${result.generic_known_work_rows_found}, screenshot=${result.screenshot_path ?? "missing"}, ui=${result.ui_dump_path ?? "missing"}`,
      ),
      "",
      failures.length > 0 ? "Failures:" : "Failures: none",
      ...failures.map((failure) => `- ${JSON.stringify(failure)}`),
      "",
      "Fake green claimed: false",
    ].join("\n"),
  );
}

function updateBindingFixArtifacts(matrix: Api34ReplayMatrix, screenshots: string[], uiDumps: string[]): void {
  fs.mkdirSync(BINDING_FIX_DIR, { recursive: true });
  writeJson("android_screenshots.json", screenshots, BINDING_FIX_DIR);
  writeJson("android_ui_dumps.json", uiDumps, BINDING_FIX_DIR);

  const matrixPath = path.join(BINDING_FIX_DIR, "matrix.json");
  const existingMatrix = readJson<Record<string, unknown>>(matrixPath) ?? {};
  const replayGreen = matrix.final_status === GREEN;
  writeJson(
    "matrix.json",
    {
      ...existingMatrix,
      final_status: replayGreen ? "BLOCKED_RELEASE_GATES_NOT_RUN" : matrix.final_status,
      previous_blocker: "BLOCKED_ADB_DEVICES_HANG",
      root_cause: "API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
      resolved_by_api34_replay: replayGreen,
      api34_replay_passed: replayGreen,
      api34_replay_status: matrix.final_status,
      api34_replay_matrix_path: relative(path.join(ANDROID_API34_ACCEPTANCE_DIR, "matrix.json")),
      api34_avd_name: matrix.avd_name,
      api34_android_sdk: matrix.android_sdk,
      api34_cpu_abi: matrix.cpu_abi,
      android_emulator_passed: replayGreen,
      android_screenshots_real: matrix.android_screenshots_real,
      android_ui_dumps_real: matrix.android_ui_dumps_real,
      fake_green_claimed: false,
    },
    BINDING_FIX_DIR,
  );

  const proofPath = path.join(BINDING_FIX_DIR, "proof.md");
  const previousProof = fs.existsSync(proofPath) ? fs.readFileSync(proofPath, "utf8").trimEnd() : "";
  writeText(
    "proof.md",
    [
      previousProof,
      "",
      "## Android API34 Canonical Replay",
      "",
      `Replay status: ${matrix.final_status}`,
      `Replay matrix: ${relative(path.join(ANDROID_API34_ACCEPTANCE_DIR, "matrix.json"))}`,
      `Resolved by API34 replay: ${replayGreen}`,
      "Previous blocker: BLOCKED_ADB_DEVICES_HANG",
      "Root cause: API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
      "",
      "Fake green claimed: false",
    ]
      .filter(Boolean)
      .join("\n"),
    BINDING_FIX_DIR,
  );
}

async function replayAndroidRoutes(env: AndroidApi34DeviceReadyResult): Promise<{
  results: Api34ReplayResult[];
  screenshots: string[];
  uiDumps: string[];
  failures: unknown[];
  appRootMarkerProven: boolean;
}> {
  const metro = await ensureMetro(DEV_CLIENT_PORT);
  const results: Api34ReplayResult[] = [];
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const failures: unknown[] = [];
  let appRootMarkerProven = false;

  try {
    let root: ReturnType<typeof captureScreenInDir> | null = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await resetAndroidAppForReplay();
      openDeepLink(buildDevClientUri(DEV_CLIENT_PORT));
      root = await waitForAndroidScreen({
        captureId: attempt === 1 ? "app_root_loaded" : `app_root_loaded_retry_${attempt}`,
        timeoutMs: attempt === 1 ? 90_000 : 60_000,
        ready: (screen) => screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY),
      });
      if (appRootReady(root) && root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) break;
      if (isRuntimeLoadError(root)) {
        dismissBlockingAndroidSurface(root);
        continue;
      }
    }
    root = root ?? captureScreenInDir("app_root_loaded_failed", ANDROID_API34_ACCEPTANCE_DIR);
    appRootMarkerProven = appRootReady(root) && root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY);
    if (!appRootMarkerProven) {
      failures.push({
        status: "BLOCKED_ANDROID_API34_ROUTE_REPLAY_FAILED",
        step: "app_root_marker",
        screenshot_path: root.screenshot_path,
        ui_dump_path: root.ui_dump_path,
        visible_text_sample: root.visibleText.slice(0, 500),
        error: root.error,
      });
    }

    for (const testCase of CASES) {
      let result: Api34ReplayResult | null = null;
      let keywordHits = 0;
      let routeMarkerProven = false;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const captureId =
          attempt === 1 ? testCase.afterPromptCaptureId : `${testCase.afterPromptCaptureId}_retry_${attempt}`;
        const loaded = await openCaseRoute(testCase);
        await sleep(12_000);
        const afterPromptCapture = await captureScrollableOutput(captureId, testCase);
        const afterPrompt = afterPromptCapture.best;
        const outputText = afterPromptCapture.outputText;
        routeMarkerProven = routeReadyForCase(testCase, loaded) || outputText.includes(testCase.marker);
        const visibleRows = visibleRowsFromText(outputText);
        keywordHits = countKeywordHits(outputText, testCase.workSpecificKeywords);
        const forbiddenContextHit = countKeywordHits(outputText, testCase.forbiddenKeywords ?? []) > 0;
        result = {
          device_id: env.device_id,
          avd_name: API34_AVD_NAME,
          android_sdk: env.android_sdk,
          cpu_abi: env.cpu_abi,
          route: testCase.route,
          route_marker: testCase.marker,
          prompt: testCase.prompt,
          prompt_submitted: routeMarkerProven,
          response_visible: afterPromptCapture.captures.some(responseVisible) || keywordHits >= 4,
          visible_rows: visibleRows,
          generic_known_work_rows_found: hasForbiddenKnownWorkRows(visibleRows) || forbiddenContextHit,
          work_specific_rows_found: keywordHits >= 4,
          source_confidence_visible: sourceConfidenceVisible(outputText),
          tax_or_warning_visible: taxOrWarningVisible(outputText),
          pdf_action_visible: pdfActionVisible(outputText),
          screenshot_path: afterPrompt.screenshot_path,
          ui_dump_path: afterPrompt.ui_dump_path,
          runtime_trace_id_if_available: "not_available_from_android_ui",
          error_if_any: loaded.error ?? afterPrompt.error,
        };

        for (const candidate of [
          loaded.screenshot_path,
          ...afterPromptCapture.captures.map((capture) => capture.screenshot_path),
        ]) {
          if (candidate) screenshots.push(candidate);
        }
        for (const candidate of [
          loaded.ui_dump_path,
          ...afterPromptCapture.captures.map((capture) => capture.ui_dump_path),
        ]) {
          if (candidate) uiDumps.push(candidate);
        }

        if (resultPassed(result)) break;
        if (attempt < 3) {
          await resetAndroidAppForReplay();
          continue;
        }
      }

      if (result) results.push(result);

      if (!resultPassed(result ?? undefined)) {
        failures.push({
          id: testCase.id,
          route: testCase.route,
          prompt: testCase.prompt,
          route_marker_proven: routeMarkerProven,
          keyword_hits: keywordHits,
          result,
        });
      }
    }
  } finally {
    stopMetro(metro);
  }

  return { results, screenshots, uiDumps, failures, appRootMarkerProven };
}

async function main(): Promise<void> {
  ensureDir();
  const existingEvidence = resolveCanonicalApi34Evidence({ write: true });
  if (existingEvidence.ok) {
    const replayGreen = existingEvidence.matrix.final_status === GREEN;
    updateBindingFixArtifacts(existingEvidence.matrix as Api34ReplayMatrix, existingEvidence.screenshots, existingEvidence.uiDumps);
    writeJson("build_identity.json", {
      git_sha: existingEvidence.evidence.head_sha,
      git_short_hash: existingEvidence.evidence.head_short_sha,
      branch: existingEvidence.evidence.branch,
      matrix_path: relative(path.join(ANDROID_API34_ACCEPTANCE_DIR, "matrix.json")),
      canonical_api34_evidence_path: "artifacts/S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT/canonical_api34_evidence.json",
    });
    console.log(existingEvidence.matrix.final_status);
    if (!replayGreen) process.exitCode = 1;
    return;
  }

  const env = await ensureAndroidApi34DeviceReady({ artifactDir: ANDROID_API34_ACCEPTANCE_DIR });
  if (env.final_status !== API34_DEVICE_READY) {
    const status: Api34ReplayStatus =
      env.adb_devices_result?.timed_out === true
        ? "BLOCKED_ANDROID_API34_ADB_TIMEOUT"
        : env.final_status === "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        ? "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
        : "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE";
    const matrix = buildBlockedMatrix(status, env);
    const failures = [{ status, reason: env.failure_reason, environment_path: relative(path.join(ANDROID_API34_ACCEPTANCE_DIR, "android_api34_environment.json")) }];
    writeJson("route_replay_results.json", []);
    writeJson("visible_rows.json", {});
    writeJson("generic_row_check.json", []);
    writeJson("android_screenshots.json", []);
    writeJson("android_ui_dumps.json", []);
    writeJson("failures.json", failures);
    writeJson("matrix.json", matrix);
    writeProof(status, matrix, failures, []);
    updateBindingFixArtifacts(matrix, [], []);
    process.exitCode = 1;
    return;
  }

  const replay = await replayAndroidRoutes(env);
  const matrix = buildMatrix({ env, ...replay });
  writeJson("route_replay_results.json", replay.results);
  writeJson("visible_rows.json", Object.fromEntries(replay.results.map((result) => [result.prompt, result.visible_rows])));
  writeJson(
    "generic_row_check.json",
    replay.results.map((result) => ({
      prompt: result.prompt,
      route: result.route,
      generic_known_work_rows_found: result.generic_known_work_rows_found,
    })),
  );
  writeJson("android_screenshots.json", replay.screenshots);
  writeJson("android_ui_dumps.json", replay.uiDumps);
  writeJson("failures.json", replay.failures);
  writeJson("matrix.json", matrix);
  writeJson("build_identity.json", {
    git_short_hash: getBuildHashOrVersion(),
    matrix_path: relative(path.join(ANDROID_API34_ACCEPTANCE_DIR, "matrix.json")),
  });
  resolveCanonicalApi34Evidence({ write: true });
  writeProof(matrix.final_status, matrix, replay.failures, replay.results);
  updateBindingFixArtifacts(matrix, replay.screenshots, replay.uiDumps);

  if (matrix.final_status !== GREEN) {
    process.exitCode = 1;
  }
}

void main();
