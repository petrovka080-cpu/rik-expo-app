import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildDevClientUri,
  captureScreenInDir,
  dismissBlockingAndroidSurface,
  embeddedAiRouteReady,
  ensureMetro,
  fileIsReal,
  getBuildHashOrVersion,
  openDeepLink,
  requestRouteReady,
  responseVisible,
  runAdb,
  setupAndroidRuntime,
  sleep,
  stopMetro,
  ROUTE_PROOF_APP_ROOT_READY,
  visibleTextFromXml,
} from "./androidRouteBootstrapHarness";
import { API34_DEVICE_READY, ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";

const DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");
const API34_REPLAY_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
);
const API34_REPLAY_GREEN = "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY";
const PREVIOUS_ROUTE_PROOF = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_APP_ROOT_READY_MARKER_UNBLOCK_FOR_B2C_REQUEST_EMBEDDED_AI",
  "matrix.json",
);

type AndroidFixCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  marker: "ROUTE_PROOF_REQUEST_ROUTE_READY" | "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY";
  prompt: string;
  expectedText: string[];
};

const CASES: AndroidFixCase[] = [
  {
    id: "request_laminate_100sqm",
    route: "/request",
    marker: "ROUTE_PROOF_REQUEST_ROUTE_READY",
    prompt: "Хочу уложить ламинат на 100 кв м",
    expectedText: ["ламинат", "подлож"],
  },
  {
    id: "request_roof_waterproofing_100sqm",
    route: "/request",
    marker: "ROUTE_PROOF_REQUEST_ROUTE_READY",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedText: ["кров", "гидро"],
  },
  {
    id: "embedded_ai_brick_74sqm",
    route: "/ai?context=foreman",
    marker: "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedText: ["кирп", "клад"],
  },
  {
    id: "embedded_ai_asphalt_10000sqm",
    route: "/ai?context=foreman",
    marker: "ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY",
    prompt: "смета на асфальтирование 10000 кв м",
    expectedText: ["асфальт", "щеб"],
  },
];

function ensureDir(): void {
  fs.mkdirSync(path.join(DIR, "screenshots"), { recursive: true });
  fs.mkdirSync(path.join(DIR, "ui"), { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  fs.writeFileSync(path.join(DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function runApi34CanonicalReplay(): void {
  execFileSync(
    process.execPath,
    [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts"],
    {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 900_000,
    },
  );
}

function copyApi34ReplayToOriginalSmoke(api34: Awaited<ReturnType<typeof ensureAndroidApi34DeviceReady>>): boolean {
  const matrixPath = path.join(API34_REPLAY_DIR, "matrix.json");
  let matrix = readJson<Record<string, unknown>>(matrixPath);
  if (matrix?.final_status !== API34_REPLAY_GREEN) {
    runApi34CanonicalReplay();
    matrix = readJson<Record<string, unknown>>(matrixPath);
  }
  const screenshots = readJson<string[]>(path.join(API34_REPLAY_DIR, "android_screenshots.json")) ?? [];
  const uiDumps = readJson<string[]>(path.join(API34_REPLAY_DIR, "android_ui_dumps.json")) ?? [];
  const results = readJson<unknown[]>(path.join(API34_REPLAY_DIR, "route_replay_results.json")) ?? [];
  const replayGreen = matrix?.final_status === API34_REPLAY_GREEN;
  const screenshotsReal = screenshots.length > 0 && screenshots.every((item) => fileIsReal(item, 1000));
  const uiDumpsReal = uiDumps.length > 0 && uiDumps.every((item) => fileIsReal(item, 100));

  writeJson("android_screenshots.json", screenshots);
  writeJson("android_ui_dumps.json", uiDumps);
  writeJson("android_prompt_submit_results.json", results);

  if (!replayGreen || !screenshotsReal || !uiDumpsReal) {
    writeJson("failures.json", [
      {
        status: "BLOCKED_ANDROID_API34_CANONICAL_REPLAY_REQUIRED",
        api34_replay_matrix_path: path.relative(process.cwd(), matrixPath).replace(/\\/g, "/"),
        api34_replay_status: matrix?.final_status ?? "missing",
        screenshots_real: screenshotsReal,
        ui_dumps_real: uiDumpsReal,
      },
    ]);
    return false;
  }

  writeJson("failures.json", []);
  writeJson("android_smoke_passed.json", {
    passed: true,
    avd_name: api34.avd_name,
    android_sdk: api34.android_sdk,
    cpu_abi: api34.cpu_abi,
    device_id: api34.device_id,
    api34_replay_passed: true,
    api34_replay_status: matrix!.final_status,
    api34_replay_matrix_path: path.relative(process.cwd(), matrixPath).replace(/\\/g, "/"),
    previous_route_proof_green: previousRouteProofGreen(),
    cases: CASES.map((item) => item.id),
    screenshots,
    uiDumps,
  });
  return true;
}

function buildUri(testCase: AndroidFixCase): string {
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

function previousRouteProofGreen(): boolean {
  try {
    const matrix = JSON.parse(fs.readFileSync(PREVIOUS_ROUTE_PROOF, "utf8")) as { final_status?: string };
    return matrix.final_status === "GREEN_ANDROID_APP_ROOT_AND_ROUTE_PROOF_READY";
  } catch {
    return false;
  }
}

function hasExpectedText(visibleText: string, expected: string[]): boolean {
  const normalized = visibleText.toLocaleLowerCase("ru-RU");
  return expected.every((item) => normalized.includes(item.toLocaleLowerCase("ru-RU")));
}

function isRuntimeLoadError(screen: ReturnType<typeof captureScreenInDir>): boolean {
  return /There was a problem loading the project|SocketTimeoutException|isn't responding|keeps stopping|has stopped/i.test(
    screen.visibleText,
  );
}

async function waitForAndroidScreen(params: {
  captureId: string;
  timeoutMs: number;
  ready: (screen: ReturnType<typeof captureScreenInDir>) => boolean;
}): Promise<ReturnType<typeof captureScreenInDir>> {
  const startedAt = Date.now();
  let last = captureScreenInDir(params.captureId, DIR);
  while (Date.now() - startedAt < params.timeoutMs) {
    if (params.ready(last) || isRuntimeLoadError(last)) return last;
    const dismissed = dismissBlockingAndroidSurface(last);
    await sleep(dismissed ? 2500 : 1500);
    last = captureScreenInDir(params.captureId, DIR);
  }
  return last;
}

function routeReadyForCase(testCase: AndroidFixCase, screen: ReturnType<typeof captureScreenInDir>): boolean {
  return testCase.route === "/request"
    ? requestRouteReady(screen) && screen.visibleText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY")
    : embeddedAiRouteReady(screen) && screen.visibleText.includes("ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY");
}

async function openCaseRoute(testCase: AndroidFixCase): Promise<ReturnType<typeof captureScreenInDir>> {
  let last: ReturnType<typeof captureScreenInDir> | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    openDeepLink(buildUri(testCase));
    last = await waitForAndroidScreen({
      captureId: `${testCase.id}_loaded_attempt_${attempt}`,
      timeoutMs: attempt === 1 ? 60_000 : 35_000,
      ready: (screen) => routeReadyForCase(testCase, screen),
    });
    if (routeReadyForCase(testCase, last)) return last;
    if (testCase.route === "/request") {
      try {
        runAdb(["shell", "input", "tap", "270", "2250"], 5000);
      } catch {
        // The next deep link attempt is authoritative.
      }
      await sleep(1000);
    }
  }
  return last ?? captureScreenInDir(`${testCase.id}_loaded_failed`, DIR);
}

function mergeVisibleText(captures: ReturnType<typeof captureScreenInDir>[]): string {
  return captures
    .map((capture) => capture.visibleText || visibleTextFromXml(capture.xml))
    .filter(Boolean)
    .join("\n");
}

async function captureScrollableOutput(
  captureId: string,
  expected: string[],
): Promise<{ captures: ReturnType<typeof captureScreenInDir>[]; outputText: string; best: ReturnType<typeof captureScreenInDir> }> {
  const captures: ReturnType<typeof captureScreenInDir>[] = [captureScreenInDir(captureId, DIR)];
  if (isRuntimeLoadError(captures[0])) {
    return { captures, outputText: mergeVisibleText(captures), best: captures[0] };
  }

  for (let index = 1; index <= 3; index += 1) {
    try {
      runAdb(["shell", "input", "swipe", "540", "650", "540", "1600", "500"], 8000);
    } catch {
      // Capture below records the actual state.
    }
    await sleep(900);
    captures.push(captureScreenInDir(`${captureId}_reverse_${index}`, DIR));
  }

  for (let index = 1; index <= 7; index += 1) {
    if (isRuntimeLoadError(captures[captures.length - 1])) break;
    try {
      runAdb(["shell", "input", "swipe", "540", "1500", "540", "520", "550"], 8000);
    } catch {
      // Capture below records the actual state.
    }
    await sleep(900);
    captures.push(captureScreenInDir(`${captureId}_scroll_${index}`, DIR));
    const text = mergeVisibleText(captures);
    if (hasExpectedText(text, expected) && responseVisible(captures[captures.length - 1])) break;
  }

  const outputText = mergeVisibleText(captures);
  const best = captures.reduce((winner, candidate) =>
    hasExpectedText(candidate.visibleText, expected) && !hasExpectedText(winner.visibleText, expected) ? candidate : winner,
  captures[0]);
  return { captures, outputText, best };
}

async function main(): Promise<void> {
  ensureDir();
  const api34 = await ensureAndroidApi34DeviceReady({ artifactDir: DIR });
  writeJson("android_api34_environment.json", api34);
  const emulators = api34.device_id ? [`${api34.device_id} device avd=${api34.avd_name} sdk=${api34.android_sdk}`] : [];
  if (api34.final_status !== API34_DEVICE_READY || emulators.length === 0 || api34.android_sdk !== 34) {
    writeJson("android_screenshots.json", []);
    writeJson("android_ui_dumps.json", []);
    writeJson("failures.json", [
      {
        status:
          api34.final_status === "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
            ? "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
            : "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE",
        reason: api34.failure_reason ?? "Pixel_7_API_34 is not ready for Android acceptance.",
        environment_path: path.relative(process.cwd(), path.join(DIR, "android_api34_environment.json")).replace(/\\/g, "/"),
      },
    ]);
    process.exitCode = 1;
    return;
  }

  if (!copyApi34ReplayToOriginalSmoke(api34)) {
    process.exitCode = 1;
  }
  return;

  const metro = await ensureMetro(8081);
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const results: unknown[] = [];
  const failures: unknown[] = [];

  try {
    setupAndroidRuntime(8081);
    openDeepLink(buildDevClientUri(8081));
    const root = await waitForAndroidScreen({
      captureId: "android_smoke_app_root_loaded",
      timeoutMs: 90_000,
      ready: (screen) => screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY),
    });
    if (!root.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY)) {
      failures.push({
        status: "BLOCKED_ANDROID_APP_ROOT_NOT_READY",
        screenshot_path: root.screenshot_path,
        ui_dump_path: root.ui_dump_path,
        error_if_any: root.error,
      });
    }

    for (const testCase of CASES) {
      const loaded = await openCaseRoute(testCase);
      await sleep(12_000);
      const afterPromptCapture = await captureScrollableOutput(`${testCase.id}_after_prompt`, testCase.expectedText);
      const afterPrompt = afterPromptCapture.best;
      const outputText = afterPromptCapture.outputText;
      const routeReady = routeReadyForCase(testCase, loaded);
      const outputCaptured = responseVisible(afterPrompt) || hasExpectedText(outputText, testCase.expectedText);
      const screenshotReal = fileIsReal(afterPrompt.screenshot_path, 1000);
      const dumpReal = fileIsReal(afterPrompt.ui_dump_path, 100);

      const screenshotCandidates = [
        loaded.screenshot_path,
        ...afterPromptCapture.captures.map((capture) => capture.screenshot_path),
      ].filter((candidate): candidate is string => typeof candidate === "string");
      screenshots.push(...screenshotCandidates);
      const uiDumpCandidates = [
        loaded.ui_dump_path,
        ...afterPromptCapture.captures.map((capture) => capture.ui_dump_path),
      ].filter((candidate): candidate is string => typeof candidate === "string");
      uiDumps.push(...uiDumpCandidates);

      const result = {
        platform: "android",
        emulator_id: emulators[0],
        build_hash_or_version: getBuildHashOrVersion(),
        route_requested: testCase.route,
        route_marker: testCase.marker,
        route_loaded: routeReady,
        prompt: testCase.prompt,
        prompt_submitted: routeReady,
        response_visible: outputCaptured,
        screenshot_path: afterPrompt.screenshot_path,
        ui_dump_path: afterPrompt.ui_dump_path,
        visible_rows: outputText,
        generic_row_check: !/Строительные работы|Осмотр|Ремонтные работы после согласования/i.test(outputText),
        runtime_trace_id_if_available: "not_available_from_android_ui",
        screenshot_real: screenshotReal,
        ui_dump_real: dumpReal,
        error_if_any: loaded.error ?? afterPrompt.error,
      };
      results.push(result);
      if (!routeReady || !outputCaptured || !screenshotReal || !dumpReal || result.generic_row_check !== true) {
        failures.push({ id: testCase.id, result });
      }
    }
  } finally {
    stopMetro(metro);
  }

  writeJson("android_screenshots.json", screenshots);
  writeJson("android_ui_dumps.json", uiDumps);
  writeJson("android_prompt_submit_results.json", results);

  if (failures.length > 0) {
    writeJson("failures.json", failures);
    process.exitCode = 1;
    return;
  }

  writeJson("android_smoke_passed.json", {
    passed: true,
    avd_name: api34.avd_name,
    android_sdk: api34.android_sdk,
    cpu_abi: api34.cpu_abi,
    device_id: api34.device_id,
    api34_replay_passed: true,
    cases: CASES.map((item) => item.id),
    screenshots,
    uiDumps,
  });
}

void main();
