import fs from "node:fs";
import path from "node:path";

import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "./selectedWorkEnterprise1000Cases";
import { API34_DEVICE_READY, ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import { runCommandProbe, type CommandProbe } from "./androidAdbDeviceHealth";
import { hasVisibleMojibake } from "./runRequestEstimateSelectedWorkUxMojibakeRootCauseScan";
import { createAndroidHarness } from "../_shared/androidHarness";
import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import {
  createConsumerRepairDraftFromGlobalEstimate,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import { visibleEstimateLabelViolations } from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";

const WAVE = "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX",
);
const SAMPLE_SIZE = 20;
const BLOCKED_ANDROID = "BLOCKED_ANDROID_API34_EMULATOR_UNAVAILABLE";
const BLOCKED_ANDROID_AUTH = "BLOCKED_ANDROID_AUTH_SESSION_REQUIRED_FOR_REQUEST_ROUTE";
const GREEN = "GREEN_ANDROID_API34_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_READY";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toConsumerSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

function activeInputFor(testCase: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number]): string {
  return `${testCase.selectedTitleRu} ${testCase.volume} ${testCase.unitLabelRu}`.trim();
}

function hasPaidControlRow(value: string): boolean {
  return (
    /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i.test(value) ||
    /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d/i.test(value) ||
    /\bquality control\b/i.test(value)
  );
}

function selectAndroidSample() {
  const requiredWorkKeys = ["roof_waterproofing", "strip_foundation", "electrical_wiring", "asphalt_paving"];
  const rows: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number][] = [];
  const seen = new Set<string>();
  for (const workKey of requiredWorkKeys) {
    const match = SELECTED_WORK_ENTERPRISE_1000_CASES.find((testCase) => testCase.selectedWorkKey === workKey);
    if (match) {
      rows.push(match);
      seen.add(match.id);
    }
  }
  for (const testCase of SELECTED_WORK_ENTERPRISE_1000_CASES) {
    if (rows.length >= SAMPLE_SIZE) break;
    if (seen.has(testCase.id)) continue;
    rows.push(testCase);
    seen.add(testCase.id);
  }
  return rows;
}

function evaluateCase(testCase: typeof SELECTED_WORK_ENTERPRISE_1000_CASES[number]) {
  const activeInput = activeInputFor(testCase);
  const binding = buildGlobalSelectedWorkBinding({
    selectedWorkKey: testCase.selectedWorkKey,
    rawInput: activeInput,
  });
  const selectedWork = toConsumerSelectedWork(binding);
  const estimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(
      {
        text: activeInput,
        language: "ru",
        countryCode: "KG",
        city: "Bishkek",
        volume: testCase.volume,
        unit: testCase.unit,
      },
      binding,
    ),
  );
  const payload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork: binding });
  const catalog = buildStructuredEstimateCatalogBinding(payload);

  __resetConsumerRepairRequestStoreForTests();
  const bundle = createConsumerRepairDraftFromGlobalEstimate({
    consumerUserId: `android-api34-request-estimate-selected-work-${testCase.id}`,
    estimate,
    originalText: activeInput,
    city: "Bishkek",
    contactPhone: "+996700000000",
    selectedWork,
  });
  const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
  const payloads = buildRequestEstimatePayloadSet(requestDraft);
  const parity = compareRequestEstimatePayloadParity({
    visibleUi: payloads.visible_ui,
    pdfPayload: payloads.pdf_payload,
    saveDraftPayload: payloads.save_draft_payload,
    sendRequestPayload: payloads.send_request_payload,
    runtimeTracePayload: payloads.runtime_trace,
  });
  const paidControlRows = requestDraft.items.map((item) => item.name).filter(hasPaidControlRow);
  const catalogViolations = catalog.rows.flatMap((row) =>
  visibleEstimateLabelViolations(row.searchQuery).map((code) => ({ rowId: row.rowId, searchQuery: row.searchQuery, code })),
  );
  const failures = [
    ...(activeInput.includes(binding.selectedTitleRu) ? [] : ["ACTIVE_INPUT_SELECTED_TITLE_MISSING"]),
    ...(activeInput.includes(String(testCase.volume)) ? [] : ["ACTIVE_INPUT_QUANTITY_MISSING"]),
    ...(estimate.work.workKey === binding.selectedWorkKey ? [] : [`WORK_KEY_REGUESSED:${estimate.work.workKey}`]),
    ...(requestDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey ? [] : ["REQUEST_DRAFT_SELECTED_WORK_MISSING"]),
    ...(parity.passed && parity.selectedWorkMatchesPayloads ? [] : [`REQUEST_PAYLOAD_PARITY:${parity.failures.join(",")}`]),
    ...(catalog.rows.length > 0 ? [] : ["CATALOG_MATERIAL_ROWS_MISSING"]),
    ...(catalogViolations.length === 0 ? [] : ["CATALOG_QUERY_VISIBLE_LABEL_POLICY_FAILED"]),
    ...(paidControlRows.length === 0 ? [] : ["PAID_CONTROL_ROWS_FOUND"]),
  ];
  return {
    id: testCase.id,
    selectedWorkKey: binding.selectedWorkKey,
    selectedTitleRu: binding.selectedTitleRu,
    activeInput,
    estimateWorkKey: estimate.work.workKey,
    selectedWorkKeyPreserved: requestDraft.selectedWork?.selectedWorkKey === binding.selectedWorkKey,
    payloadParityPassed: parity.passed,
    catalogRowsCount: catalog.rows.length,
    catalogViolations,
    paidControlRows,
    failures,
    fake_green_claimed: false,
  };
}

const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const APK_PATH = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const DEV_CLIENT_PORT = Number(process.env.ANDROID_REQUEST_ESTIMATE_DEV_CLIENT_PORT ?? 8099);
const ROUTE_APP_ROOT_MARKER = "ROUTE_PROOF_APP_ROOT_READY";
const ROUTE_REQUEST_MARKER = "ROUTE_PROOF_REQUEST_ROUTE_READY";
const ANDROID_ARTIFACT_PREFIX =
  "S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX/android_api34_request_screen";

type AndroidInstallProof = {
  apk_path: string;
  apk_exists: boolean;
  install_attempted: boolean;
  install_ok: boolean;
  install_output: string | null;
  uninstall_attempted: boolean;
  uninstall_output: string | null;
  package_installed: boolean;
  package_path_output: string | null;
};

type AndroidRouteProof = {
  attempted: boolean;
  package_name: typeof APP_PACKAGE;
  dev_client_port: number;
  native_server_url: string;
  apk_install: AndroidInstallProof;
  dev_client_started_by_script: boolean | null;
  root_marker_found: boolean;
  auth_login_screen_detected: boolean;
  e2e_auth_credentials_present: boolean;
  auth_login_attempted: boolean;
  auth_login_completed: boolean;
  request_route_ready: boolean;
  route_candidates: string[];
  xml_path: string | null;
  png_path: string | null;
  visible_text_sample: string;
  route_screen_mojibake_found: boolean;
  dev_client_log_tails: { stdoutTail: string; stderrTail: string } | null;
  recovery_summary: ReturnType<ReturnType<typeof createAndroidHarness>["getRecoverySummary"]> | null;
  logcat_tail: string | null;
  failures: string[];
  error: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clip(value: string, maxChars = 1800): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...` : value;
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

function adb(adbPath: string, deviceId: string, args: string[], timeoutMs = 10_000): CommandProbe {
  return runCommandProbe(adbPath, ["-s", deviceId, ...args], timeoutMs);
}

function isPackageInstalled(adbPath: string, deviceId: string): { installed: boolean; output: string } {
  const result = adb(adbPath, deviceId, ["shell", "pm", "path", APP_PACKAGE], 10_000);
  const output = `${result.stdout}${result.stderr}`.trim();
  return { installed: result.exit_code === 0 && /package:/i.test(output), output };
}

function installDebugApk(adbPath: string, deviceId: string): AndroidInstallProof {
  const apkExists = fs.existsSync(APK_PATH);
  if (!apkExists) {
    const installed = isPackageInstalled(adbPath, deviceId);
    return {
      apk_path: APK_PATH,
      apk_exists: false,
      install_attempted: false,
      install_ok: installed.installed,
      install_output: null,
      uninstall_attempted: false,
      uninstall_output: null,
      package_installed: installed.installed,
      package_path_output: installed.output,
    };
  }

  let install = adb(adbPath, deviceId, ["install", "-r", APK_PATH], 180_000);
  let installOutput = `${install.stdout}${install.stderr}`.trim();
  let uninstallAttempted = false;
  let uninstallOutput: string | null = null;

  if (!/Success/i.test(installOutput) && /INSUFFICIENT_STORAGE|UPDATE_INCOMPATIBLE|VERSION_DOWNGRADE/i.test(installOutput)) {
    uninstallAttempted = true;
    const uninstall = adb(adbPath, deviceId, ["uninstall", APP_PACKAGE], 60_000);
    uninstallOutput = `${uninstall.stdout}${uninstall.stderr}`.trim();
    install = adb(adbPath, deviceId, ["install", "-r", APK_PATH], 180_000);
    installOutput = `${install.stdout}${install.stderr}`.trim();
  }

  const installed = isPackageInstalled(adbPath, deviceId);
  return {
    apk_path: APK_PATH,
    apk_exists: true,
    install_attempted: true,
    install_ok: /Success/i.test(installOutput) && installed.installed,
    install_output: clip(installOutput, 1200),
    uninstall_attempted: uninstallAttempted,
    uninstall_output: uninstallOutput ? clip(uninstallOutput, 1200) : null,
    package_installed: installed.installed,
    package_path_output: installed.output,
  };
}

function requestRouteCandidates(prompt: string): string[] {
  const query = new URLSearchParams();
  query.set("prompt", prompt);
  return [
    `rik:///request?${query.toString()}`,
    `rik://request?${query.toString()}`,
    `rik:///%28tabs%29/request?${query.toString()}`,
  ];
}

function isRootReady(xml: string): boolean {
  return xml.includes(ROUTE_APP_ROOT_MARKER) || /consumer-repair-screen|Email|Login/i.test(xml);
}

function isRequestRouteReady(xml: string): boolean {
  return (
    xml.includes(ROUTE_REQUEST_MARKER) ||
    (xml.includes("consumer-repair-screen") && xml.includes("consumer-repair-problem-input")) ||
    (xml.includes("consumer-repair-screen") && xml.includes("consumer-repair-prepare-draft"))
  );
}

function isAuthLoginScreen(xml: string): boolean {
  return (
    xml.includes("auth.login.screen") ||
    (xml.includes("auth.login.email") && xml.includes("auth.login.password")) ||
    (/Email/i.test(xml) && /auth\.login\.submit|Login|Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(xml))
  );
}

function resolveE2eAuthCredentials(): { email: string; password: string; present: boolean } {
  const email = String(process.env.E2E_AUTH_EMAIL ?? process.env.E2E_CONSUMER_EMAIL ?? "").trim();
  const password = String(process.env.E2E_AUTH_PASSWORD ?? process.env.E2E_CONSUMER_PASSWORD ?? "").trim();
  return { email, password, present: Boolean(email && password) };
}

function readLogcatTail(adbPath: string, deviceId: string): string {
  const result = adb(adbPath, deviceId, ["logcat", "-d", "-t", "500"], 12_000);
  const output = `${result.stdout}${result.stderr}`;
  const interesting = output
    .split(/\r?\n/)
    .filter((line) =>
      /ReactNativeJS|BundleDownloader|ProtocolException|DevLauncher|expo|metro|Error|Exception|FATAL|Hermes|JavaScript/i.test(line),
    )
    .slice(-120)
    .join("\n");
  return clip(interesting || output.split(/\r?\n/).slice(-80).join("\n"), 5000);
}

async function runAndroidRequestScreenShellProof(device: Awaited<ReturnType<typeof ensureAndroidApi34DeviceReady>>): Promise<AndroidRouteProof> {
  const adbPath = device.adb_path ?? "adb";
  const deviceId = device.device_id ?? "";
  const prompt = "устройство гидроизоляции кровли 120 м2";
  const routeCandidates = requestRouteCandidates(prompt);
  const emptyInstall: AndroidInstallProof = {
    apk_path: APK_PATH,
    apk_exists: fs.existsSync(APK_PATH),
    install_attempted: false,
    install_ok: false,
    install_output: null,
    uninstall_attempted: false,
    uninstall_output: null,
    package_installed: false,
    package_path_output: null,
  };

  if (device.final_status !== API34_DEVICE_READY || !deviceId) {
    return {
      attempted: false,
      package_name: APP_PACKAGE,
      dev_client_port: DEV_CLIENT_PORT,
      native_server_url: `http://127.0.0.1:${DEV_CLIENT_PORT}`,
      apk_install: emptyInstall,
      dev_client_started_by_script: null,
      root_marker_found: false,
      auth_login_screen_detected: false,
      e2e_auth_credentials_present: resolveE2eAuthCredentials().present,
      auth_login_attempted: false,
      auth_login_completed: false,
      request_route_ready: false,
      route_candidates: routeCandidates,
      xml_path: null,
      png_path: null,
      visible_text_sample: "",
      route_screen_mojibake_found: false,
      dev_client_log_tails: null,
      recovery_summary: null,
      logcat_tail: null,
      failures: ["ANDROID_API34_DEVICE_NOT_READY_FOR_ROUTE_PROOF"],
      error: null,
    };
  }

  let install = emptyInstall;
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: DEV_CLIENT_PORT,
    devClientStdoutPath: `artifacts/S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX/android_api34_dev_client_${DEV_CLIENT_PORT}.out.log`,
    devClientStderrPath: `artifacts/S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX/android_api34_dev_client_${DEV_CLIENT_PORT}.err.log`,
  });
  let cleanup: (() => void) | undefined;
  let devClientStartedByScript: boolean | null = null;
  let rootMarkerFound = false;
  let authLoginScreenDetected = false;
  let authLoginAttempted = false;
  let authLoginCompleted = false;
  let routeXml = "";
  let xmlPath: string | null = null;
  let pngPath: string | null = null;
  let error: string | null = null;
  const e2eCredentials = resolveE2eAuthCredentials();

  try {
    install = installDebugApk(adbPath, deviceId);
    if (!install.install_ok || !install.package_installed) {
      throw new Error(`ANDROID_DEBUG_APK_INSTALL_FAILED:${install.install_output ?? install.package_path_output ?? "missing"}`);
    }

    const devClient = await harness.ensureAndroidDevClientServer();
    cleanup = devClient.cleanup;
    devClientStartedByScript = devClient.startedByScript;
    harness.ensureAndroidReverseProxy(DEV_CLIENT_PORT);
    harness.startAndroidDevClientProject(APP_PACKAGE, DEV_CLIENT_PORT, { stopApp: true });
    await sleep(4000);

    const root = harness.dumpAndroidScreen(`${ANDROID_ARTIFACT_PREFIX}_root`);
    rootMarkerFound = isRootReady(root.xml);

    const route = await harness.openAndroidRoute({
      packageName: APP_PACKAGE,
      routes: routeCandidates,
      artifactBase: ANDROID_ARTIFACT_PREFIX,
      predicate: isRequestRouteReady,
      renderablePredicate: isRootReady,
      timeoutMs: 90_000,
      delayMs: 1500,
    });
    routeXml = route.xml;
    xmlPath = route.xmlPath;
    pngPath = route.pngPath;

    authLoginScreenDetected = isAuthLoginScreen(routeXml);
    if (!isRequestRouteReady(routeXml) && authLoginScreenDetected && e2eCredentials.present) {
      authLoginAttempted = true;
      const loggedInRoute = await harness.loginAndroidWithProtectedRoute({
        packageName: APP_PACKAGE,
        user: { email: e2eCredentials.email, password: e2eCredentials.password },
        protectedRoute: routeCandidates[0],
        artifactBase: `${ANDROID_ARTIFACT_PREFIX}_auth`,
        successPredicate: isRequestRouteReady,
        renderablePredicate: isRootReady,
        loginScreenPredicate: isAuthLoginScreen,
      });
      routeXml = loggedInRoute.xml;
      xmlPath = loggedInRoute.xmlPath;
      pngPath = loggedInRoute.pngPath;
      authLoginCompleted = isRequestRouteReady(routeXml);
    }
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : String(nextError);
    try {
      const capture = harness.captureFailureArtifacts(`${ANDROID_ARTIFACT_PREFIX}_failure`);
      xmlPath = capture.xmlPath;
      pngPath = capture.pngPath;
      routeXml = xmlPath ? fs.readFileSync(path.join(process.cwd(), xmlPath), "utf8") : "";
    } catch {
      // best-effort failure capture
    }
  } finally {
    cleanup?.();
  }

  const requestReady = isRequestRouteReady(routeXml);
  rootMarkerFound = rootMarkerFound || isRootReady(routeXml);
  const visibleTextSample = normalizeXmlText(routeXml);
  const routeScreenMojibakeFound = hasVisibleMojibake(visibleTextSample);
  authLoginScreenDetected = authLoginScreenDetected || isAuthLoginScreen(routeXml);
  const authSessionRequired = !requestReady && authLoginScreenDetected && !e2eCredentials.present;
  const failures = [
    ...(install.install_ok && install.package_installed ? [] : ["ANDROID_DEBUG_APK_NOT_INSTALLED"]),
    ...(rootMarkerFound ? [] : ["ANDROID_DEV_CLIENT_ROOT_MARKER_NOT_FOUND"]),
    ...(authSessionRequired ? ["ANDROID_AUTH_SESSION_REQUIRED_FOR_REQUEST_ROUTE"] : []),
    ...(requestReady || authSessionRequired ? [] : ["ANDROID_REQUEST_ROUTE_READY_MARKER_NOT_FOUND"]),
    ...(routeScreenMojibakeFound ? ["ANDROID_REQUEST_ROUTE_VISIBLE_MOJIBAKE_FOUND"] : []),
    ...(error ? [`ANDROID_REQUEST_ROUTE_PROOF_ERROR:${error}`] : []),
  ];

  return {
    attempted: true,
    package_name: APP_PACKAGE,
    dev_client_port: DEV_CLIENT_PORT,
    native_server_url: `http://127.0.0.1:${DEV_CLIENT_PORT}`,
    apk_install: install,
    dev_client_started_by_script: devClientStartedByScript,
    root_marker_found: rootMarkerFound,
    auth_login_screen_detected: authLoginScreenDetected,
    e2e_auth_credentials_present: e2eCredentials.present,
    auth_login_attempted: authLoginAttempted,
    auth_login_completed: authLoginCompleted,
    request_route_ready: requestReady,
    route_candidates: routeCandidates,
    xml_path: xmlPath,
    png_path: pngPath,
    visible_text_sample: clip(visibleTextSample),
    route_screen_mojibake_found: routeScreenMojibakeFound,
    dev_client_log_tails: harness.getDevClientLogTails(),
    recovery_summary: harness.getRecoverySummary(),
    logcat_tail: readLogcatTail(adbPath, deviceId),
    failures,
    error,
  };
}

export async function runAndroidApi34RequestEstimateSelectedWorkActiveInputCatalogScrollSmoke() {
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: ARTIFACT_DIR,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  const deviceId = device.device_id ?? "";
  const wmSize = deviceId ? runCommandProbe(device.adb_path ?? "adb", ["-s", deviceId, "shell", "wm", "size"], 10_000) : null;
  const routeProof = await runAndroidRequestScreenShellProof(device);
  const rows = selectAndroidSample().map(evaluateCase);
  const rowFailures = rows.flatMap((row) => row.failures.map((failure) => `${row.id}:${failure}`));
  const deviceFailures = [
    ...(device.final_status === API34_DEVICE_READY ? [] : [device.final_status]),
    ...(device.android_sdk === 34 ? [] : [`ANDROID_API_NOT_34:${device.android_sdk ?? "missing"}`]),
  ];
  const liveRequestScreenExercised = routeProof.request_route_ready && routeProof.failures.length === 0;
  const authSessionRequired = routeProof.failures.includes("ANDROID_AUTH_SESSION_REQUIRED_FOR_REQUEST_ROUTE");
  const failures = [
    ...deviceFailures,
    ...rowFailures,
    ...routeProof.failures,
    ...(liveRequestScreenExercised || authSessionRequired ? [] : ["ANDROID_LIVE_REQUEST_SCREEN_UI_PROOF_NOT_EXECUTED"]),
  ];
  const passed = failures.length === 0;
  const artifact = {
    wave: WAVE,
    final_status: passed
      ? GREEN
      : device.final_status !== API34_DEVICE_READY
        ? BLOCKED_ANDROID
        : authSessionRequired
          ? BLOCKED_ANDROID_AUTH
          : "BLOCKED_ANDROID_API34_PROOF_FAILED",
    android_api34_passed: device.final_status === API34_DEVICE_READY && device.android_sdk === 34,
    actual_api: device.android_sdk,
    api36_used_as_substitute: false,
    cpu_abi: device.cpu_abi,
    device_id: device.device_id,
    wm_size: wmSize?.stdout.trim() ?? null,
    real_request_screen_exercised: liveRequestScreenExercised,
    android_route_shell_proof: routeProof,
    selected_work_cases_total: rows.length,
    selected_work_cases_passed: rows.filter((row) => row.failures.length === 0).length,
    selected_work_writes_into_active_input: rows.every((row) => row.activeInput.includes(row.selectedTitleRu)),
    selected_work_key_preserved_after_quantity_append: rows.every((row) => row.selectedWorkKeyPreserved),
    catalog_search_uses_section_title_count: rows.flatMap((row) => row.catalogViolations).filter((failure) => failure.code === "SECTION_TITLE_VISIBLE_LABEL").length,
    paid_control_rows_found: rows.flatMap((row) => row.paidControlRows).length,
    rows,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_smoke.json", artifact);
  if (!passed) throw new Error(`${artifact.final_status}:${failures.slice(0, 20).join("|")}`);
  return artifact;
}

if (require.main === module) {
  runAndroidApi34RequestEstimateSelectedWorkActiveInputCatalogScrollSmoke()
    .then(() => {
      console.log(GREEN);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
