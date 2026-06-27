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
import { currentGitHead, resolveCanonicalApi34Evidence } from "./canonicalApi34Evidence";
import { replaceMarkdownSection } from "./proofMarkdownSection";
import { resolveExplicitAiRoleAuthEnv } from "./resolveExplicitAiRoleAuthEnv";
import {
  createAndroidHarness,
  isAndroidEmbeddedAiRouteSurfaceXml,
  isAndroidAppRootSurfaceXml,
  isAndroidRequestRouteSurfaceXml,
} from "../_shared/androidHarness";
import {
  isNoHintWorkOntologyReleaseNeutralPath,
  NO_HINT_WORK_ONTOLOGY_ANDROID_REUSE_REASON,
} from "../release/noHintWorkOntologyReleaseReusePolicy";
import {
  isOperationObjectMatchingReleaseNeutralPath,
  OPERATION_OBJECT_MATCHING_ANDROID_REUSE_REASON,
} from "../release/operationObjectMatchingReleaseReusePolicy";
import {
  isProfessionalEstimateReleaseNeutralPath,
  PROFESSIONAL_ESTIMATE_ANDROID_REUSE_REASON,
} from "../release/professionalEstimateReleaseReusePolicy";
import {
  isSmartEstimatorReleaseNeutralPath,
  SMART_ESTIMATOR_ANDROID_REUSE_REASON,
} from "../release/smartEstimatorReleaseReusePolicy";
import {
  isMarketPricebookReleaseNeutralPath,
  MARKET_PRICEBOOK_ANDROID_REUSE_REASON,
} from "../release/marketPricebookReleaseReusePolicy";
import { verifyProofLineage } from "../release/proofLineageVerifier";

const GREEN = "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY";
const B2C_BINDING_GREEN = "GREEN_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING_READY";
const BINDING_FIX_DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");
const API34_CANONICAL_REPLAY_PROOF_HEADING = "## Android API34 Canonical Replay";
const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_CLIENT_PORT = Number(process.env.ANDROID_API34_REPLAY_PORT ?? 8130);
const MAX_CASE_ATTEMPTS = 4;
const ANDROID_CANONICAL_REPLAY_VERIFY_HARNESS_PATHS = new Set([
  relative(__filename),
  "scripts/e2e/proofMarkdownSection.ts",
  "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts",
  "scripts/e2e/runEstimateRevisionCloseout.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts",
  "scripts/release/proofLineageVerifier.ts",
  "tests/release/liveBoqProofNoShaLoop.contract.test.ts",
  "tests/release/proofLineageVerifier.contract.test.ts",
  "tests/release/proofMarkdownSection.contract.test.ts",
]);

type Api34ReplayStatus =
  | typeof GREEN
  | "BLOCKED_ANDROID_API34_ADB_TIMEOUT"
  | "BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE"
  | "BLOCKED_ANDROID_API34_AVD_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED"
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
  source_code_head: string | null;
  artifact_commit_head: string | null;
  current_head_at_write_time: string | null;
  proof_mode: "refresh";
  proof_valid_for_source_code_head: true;
  artifact_only_supersession_allowed: true;
  auth_session_required: boolean;
  e2e_auth_credentials_present: boolean;
  e2e_role_auth_source: string;
  e2e_role_mode: string;
  e2e_roles_resolved: readonly string[];
  e2e_missing_secret_keys: readonly string[];
  auth_login_screen_detected: boolean;
  auth_login_attempted: boolean;
  auth_login_completed: boolean;
  auth_login_blocked_status: string | null;
  role_isolation_e2e_claimed: boolean;
  full_access_runtime_claimed: boolean;
  fake_green_claimed: false;
};

type AndroidReplayAuthEvidence = {
  auth_session_required: boolean;
  e2e_auth_credentials_present: boolean;
  e2e_role_auth_source: string;
  e2e_role_mode: string;
  e2e_roles_resolved: readonly string[];
  e2e_missing_secret_keys: readonly string[];
  auth_login_screen_detected: boolean;
  auth_login_attempted: boolean;
  auth_login_completed: boolean;
  auth_login_blocked_status: string | null;
  auth_login_error_if_any: string | null;
  role_isolation_e2e_claimed: boolean;
  full_access_runtime_claimed: boolean;
  fake_green_claimed: false;
};

const CASES: Api34ReplayCase[] = [
  {
    id: "request_laminate",
    route: "/request",
    marker: ROUTE_PROOF_REQUEST_ROUTE_READY,
    prompt: "Хочу уложить ламинат на 100 кв м",
    afterPromptCaptureId: "request_laminate_after_prompt",
    workSpecificKeywords: ["ламинат", "подложка", "плинтус", "фурнитура", "порожки", "подготовка основания", "укладка ламината", "подрезка"],
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
      "гидроизоляция кровли",
      "гидроизоляционный материал",
      "рулонная гидроизоляция",
      "мембрана",
      "мастика",
      "армирующая лента",
      "примыкания",
      "примыканий",
      "воронки",
      "проходки",
      "проходок",
      "герметик",
      "водоприемные узлы",
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

function parseMode(argv: string[]): "refresh" | "verify" | "replay" {
  const modeArg = argv.find((value) => value.startsWith("--mode="));
  const mode = modeArg?.slice("--mode=".length) ?? "refresh";
  if (mode !== "refresh" && mode !== "verify" && mode !== "replay") {
    throw new Error("--mode must be refresh, verify, or replay");
  }
  return mode;
}

function currentHead(): string | null {
  const headPath = path.join(process.cwd(), ".git", "HEAD");
  if (!fs.existsSync(headPath)) return currentGitHead().headSha;
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (!head.startsWith("ref: ")) return head;
  const refPath = path.join(process.cwd(), ".git", head.slice("ref: ".length));
  return fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf8").trim() : currentGitHead().headSha;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isAndroidCanonicalReplayVerifyHarnessPath(filePath: string): boolean {
  return ANDROID_CANONICAL_REPLAY_VERIFY_HARNESS_PATHS.has(filePath.replace(/\\/g, "/"));
}

function verifyExistingCanonicalReplayReadOnly(): void {
  const head = currentHead();
  if (!head) {
    throw new Error("ANDROID_API34_CANONICAL_REPLAY_HEAD_MISSING");
  }
  const matrixPath = path.join(ANDROID_API34_ACCEPTANCE_DIR, "matrix.json");
  const matrix = readJson<Record<string, unknown>>(matrixPath);
  if (!matrix) {
    throw new Error("ANDROID_API34_CANONICAL_REPLAY_MATRIX_MISSING");
  }

  const sourceCodeHead =
    readString(matrix, "source_code_head") ??
    readString(matrix, "head_sha") ??
    readString(matrix, "evidence_commit");
  if (!sourceCodeHead) {
    throw new Error("ANDROID_API34_CANONICAL_REPLAY_LINEAGE_MISSING");
  }

  const lineage = verifyProofLineage({
    wave: ANDROID_API34_ACCEPTANCE_WAVE,
    sourceCodeHead,
    currentHead: head,
    artifactPaths: [
      "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/",
      "artifacts/S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX/",
    ],
    allowArtifactOnlySupersession: matrix.artifact_only_supersession_allowed !== false,
    allowSourceChangeFile: (filePath) =>
      isAndroidCanonicalReplayVerifyHarnessPath(filePath) ||
      isNoHintWorkOntologyReleaseNeutralPath(filePath) ||
      isOperationObjectMatchingReleaseNeutralPath(filePath) ||
      isProfessionalEstimateReleaseNeutralPath(filePath) ||
      isSmartEstimatorReleaseNeutralPath(filePath) ||
      isMarketPricebookReleaseNeutralPath(filePath),
  });
  if (!lineage.valid) {
    throw new Error(`ANDROID_API34_CANONICAL_REPLAY_LINEAGE_STALE:${lineage.reason ?? "unknown"}`);
  }

  const green =
    matrix.final_status === GREEN &&
    matrix.api36_rejected_for_acceptance === true &&
    matrix.api34_required_for_acceptance === true &&
    matrix.api36_active_for_acceptance === false &&
    matrix.avd_name === API34_AVD_NAME &&
    matrix.android_sdk === 34 &&
    matrix.api34_android_replay_passed === true &&
    matrix.android_screenshots_real === true &&
    matrix.android_ui_dumps_real === true &&
    matrix.fake_green_claimed === false;
  if (!green) {
    throw new Error("ANDROID_API34_CANONICAL_REPLAY_EXISTING_EVIDENCE_NOT_GREEN");
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

function buildUri(testCase: Api34ReplayCase): string {
  const query = new URLSearchParams();
  query.set("prompt", promptForApp(testCase));
  if (testCase.route === "/request") {
    query.set("autoPrepare", "1");
    return `rik:///request?${query.toString()}`;
  }
  query.set("context", "foreman");
  query.set("autoSend", "1");
  return `rik:///ai?${query.toString()}`;
}

function buildUriCandidates(testCase: Api34ReplayCase): string[] {
  return [buildUri(testCase)];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function tryOpenDeepLink(uri: string): string | null {
  try {
    openDeepLink(uri);
    return null;
  } catch (error) {
    return errorMessage(error);
  }
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
  return /источник|уверенн|confidence|source|каталог|rate|ставк|\u0446\u0435\u043d\u0430\s+\u0438\u0437\s+\u0440\u0430\u0441\u0447[\u0435\u0451]\u0442\u0430?/i.test(text);
}

function taxOrWarningVisible(text: string): boolean {
  return /ндс|налог|tax|предупрежд|уточн|без учета|без учёта|warning/i.test(text);
}

function pdfActionVisible(text: string): boolean {
  return /pdf|пдф|сделать pdf|скачать pdf|открыть pdf/i.test(text);
}

function blankAuthEvidence(): AndroidReplayAuthEvidence {
  return {
    auth_session_required: false,
    e2e_auth_credentials_present: false,
    e2e_role_auth_source: "not_checked",
    e2e_role_mode: "not_checked",
    e2e_roles_resolved: [],
    e2e_missing_secret_keys: [],
    auth_login_screen_detected: false,
    auth_login_attempted: false,
    auth_login_completed: false,
    auth_login_blocked_status: null,
    auth_login_error_if_any: null,
    role_isolation_e2e_claimed: false,
    full_access_runtime_claimed: false,
    fake_green_claimed: false,
  };
}

function isAuthLoginXml(xml: string): boolean {
  return (
    xml.includes("auth.login.screen") ||
    (xml.includes("auth.login.email") && xml.includes("auth.login.password")) ||
    (/Email/i.test(xml) && /auth\.login\.submit|Login|Р’РѕР№С‚Рё|Р’С…РѕРґ|РџР°СЂРѕР»СЊ/i.test(xml))
  );
}

function isAuthLoginText(text: string): boolean {
  return /Email/i.test(text) && /Login|Р’РѕР№С‚Рё|Р’С…РѕРґ|РџР°СЂРѕР»СЊ|auth\.login/i.test(text);
}

function isAuthLoginCapture(screen: ReturnType<typeof captureScreenInDir>): boolean {
  return isAuthLoginXml(screen.xml) || isAuthLoginText(screen.visibleText);
}

function isRenderableAuthOrAppXml(xml: string): boolean {
  return (
    isAuthLoginXml(xml) ||
    xml.includes(ROUTE_PROOF_APP_ROOT_READY) ||
    xml.includes(ROUTE_PROOF_REQUEST_ROUTE_READY) ||
    xml.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY) ||
    /consumer-repair-screen|AI|РЎРјРµС‚Р°|Р—Р°СЏРІРєР°/i.test(xml)
  );
}

function isProtectedAiRouteXml(xml: string): boolean {
  if (isAndroidEmbeddedAiRouteSurfaceXml(xml)) return true;
  return (
    !isAuthLoginXml(xml) &&
    (xml.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY) || /AI|foreman|РїСЂРѕСЂР°Р±|РќР°РїРёС€РёС‚Рµ/i.test(xml))
  );
}

function routeReadyXmlForCase(testCase: Api34ReplayCase, xml: string): boolean {
  if (isAuthLoginXml(xml)) return false;
  if (testCase.route === "/ai?context=foreman") {
    return isProtectedAiRouteXml(xml) && isAndroidEmbeddedAiRouteSurfaceXml(xml);
  }
  return testCase.route === "/request"
    ? xml.includes(ROUTE_PROOF_REQUEST_ROUTE_READY)
    : isProtectedAiRouteXml(xml) && xml.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY);
}

async function ensureReplayAuthSession(params: {
  auth: AndroidReplayAuthEvidence;
  protectedRoute: string;
  successPredicate: (xml: string) => boolean;
  artifactBase: string;
}): Promise<boolean> {
  params.auth.auth_session_required = true;
  params.auth.auth_login_screen_detected = true;
  params.auth.auth_login_error_if_any = null;

  const resolution = resolveExplicitAiRoleAuthEnv(process.env, process.cwd());
  params.auth.e2e_role_auth_source = resolution.source;
  params.auth.e2e_role_mode = resolution.roleMode;
  params.auth.e2e_roles_resolved = resolution.rolesResolved;
  params.auth.e2e_missing_secret_keys = resolution.missingKeys;
  params.auth.role_isolation_e2e_claimed = resolution.role_isolation_e2e_claimed;
  params.auth.full_access_runtime_claimed = resolution.full_access_runtime_claimed;

  const email = resolution.env?.E2E_FOREMAN_EMAIL || resolution.env?.E2E_CONTROL_EMAIL || resolution.env?.E2E_DIRECTOR_EMAIL || "";
  const password =
    resolution.env?.E2E_FOREMAN_PASSWORD || resolution.env?.E2E_CONTROL_PASSWORD || resolution.env?.E2E_DIRECTOR_PASSWORD || "";
  params.auth.e2e_auth_credentials_present = Boolean(email && password);
  if (!email || !password) {
    params.auth.auth_login_blocked_status = resolution.blockedStatus ?? "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    return false;
  }

  params.auth.auth_login_attempted = true;
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: DEV_CLIENT_PORT,
    devClientStdoutPath: path.join(
      "artifacts",
      "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
      "auth_dev_client.stdout.log",
    ),
    devClientStderrPath: path.join(
      "artifacts",
      "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
      "auth_dev_client.stderr.log",
    ),
  });

  try {
    const loggedIn = await harness.loginAndroidWithProtectedRoute({
      packageName: APP_PACKAGE,
      user: { email, password },
      protectedRoute: params.protectedRoute,
      artifactBase: [
        "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
        "auth",
        params.artifactBase,
      ].join("/"),
      successPredicate: params.successPredicate,
      renderablePredicate: isRenderableAuthOrAppXml,
      loginScreenPredicate: isAuthLoginXml,
    });
    params.auth.auth_login_completed = params.successPredicate(loggedIn.xml);
    if (!params.auth.auth_login_completed) {
      params.auth.auth_login_blocked_status = "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    }
    return params.auth.auth_login_completed;
  } catch (error) {
    params.auth.auth_login_error_if_any = errorMessage(error).slice(0, 1000);
    params.auth.auth_login_blocked_status = "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED";
    return false;
  }
}

type AndroidViewport = {
  width: number;
  height: number;
};

type AndroidBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

let cachedAndroidViewport: AndroidViewport | null = null;

function bestEffortAdb(args: string[], timeoutMs = 8000): void {
  try {
    runAdb(args, timeoutMs);
  } catch {
    // Android screenshot/XML evidence decides the final status for this proof.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveAndroidViewport(): AndroidViewport {
  if (cachedAndroidViewport) return cachedAndroidViewport;
  try {
    const output = String(runAdb(["shell", "wm", "size"], 5000));
    const match = output.match(/Override size:\s*(\d+)x(\d+)/i) ?? output.match(/Physical size:\s*(\d+)x(\d+)/i);
    const width = Number(match?.[1] ?? 0);
    const height = Number(match?.[2] ?? 0);
    if (Number.isFinite(width) && Number.isFinite(height) && width >= 200 && height >= 400) {
      cachedAndroidViewport = { width, height };
      return cachedAndroidViewport;
    }
  } catch {
    // The proof falls back to conservative coordinates if wm size is unavailable.
  }
  cachedAndroidViewport = { width: 1080, height: 2400 };
  return cachedAndroidViewport;
}

function viewportSwipeArgs(direction: "up" | "down", durationMs: number): string[] {
  const viewport = resolveAndroidViewport();
  const x = clamp(Math.round(viewport.width * 0.5), 1, viewport.width - 1);
  const top = clamp(Math.round(viewport.height * 0.32), 1, viewport.height - 1);
  const bottom = clamp(Math.round(viewport.height * 0.76), 1, viewport.height - 1);
  const [startY, endY] = direction === "up" ? [bottom, top] : [top, bottom];
  return [String(x), String(startY), String(x), String(endY), String(durationMs)];
}

function viewportTapArgs(xRatio: number, yRatio: number): string[] {
  const viewport = resolveAndroidViewport();
  const x = clamp(Math.round(viewport.width * xRatio), 1, viewport.width - 1);
  const y = clamp(Math.round(viewport.height * yRatio), 1, viewport.height - 1);
  return [String(x), String(y)];
}

function parseAndroidBounds(bounds: string | undefined): AndroidBounds | null {
  const match = bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const rect = {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
  };
  if (
    !Number.isFinite(rect.left) ||
    !Number.isFinite(rect.top) ||
    !Number.isFinite(rect.right) ||
    !Number.isFinite(rect.bottom) ||
    rect.right <= rect.left ||
    rect.bottom <= rect.top
  ) {
    return null;
  }
  return rect;
}

function nodeBoundsByResourceId(xml: string, resourceId: string): AndroidBounds | null {
  const escaped = resourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<node\\b(?=[^>]*\\bresource-id="${escaped}")[^>]*\\bbounds="([^"]+)"`, "i"));
  return parseAndroidBounds(match?.[1]);
}

function scrollableMessageBounds(screen: ReturnType<typeof captureScreenInDir>): AndroidBounds | null {
  return nodeBoundsByResourceId(screen.xml, "ai.assistant.messages");
}

function swipeWithinBoundsArgs(
  bounds: AndroidBounds | null,
  direction: "up" | "down",
  durationMs: number,
): string[] {
  if (!bounds) return viewportSwipeArgs(direction, durationMs);
  const viewport = resolveAndroidViewport();
  const height = bounds.bottom - bounds.top;
  const x = clamp(Math.round((bounds.left + bounds.right) / 2), 1, viewport.width - 1);
  const top = clamp(Math.round(bounds.top + height * 0.28), 1, viewport.height - 1);
  const bottom = clamp(Math.round(bounds.top + height * 0.78), 1, viewport.height - 1);
  const [startY, endY] = direction === "up" ? [bottom, top] : [top, bottom];
  return [String(x), String(startY), String(x), String(endY), String(durationMs)];
}

function focusAndroidBounds(bounds: AndroidBounds | null): void {
  if (!bounds) {
    return;
  }
  const viewport = resolveAndroidViewport();
  const x = clamp(Math.round((bounds.left + bounds.right) / 2), 1, viewport.width - 1);
  const y = clamp(Math.round((bounds.top + bounds.bottom) / 2), 1, viewport.height - 1);
  bestEffortAdb(["shell", "input", "tap", String(x), String(y)], 5000);
}

async function resetAndroidAppForReplay(): Promise<void> {
  bestEffortAdb(["logcat", "-c"], 10_000);
  bestEffortAdb(["shell", "am", "broadcast", "-a", "android.intent.action.CLOSE_SYSTEM_DIALOGS"], 5000);
  bestEffortAdb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"], 5000);
  bestEffortAdb(["shell", "wm", "dismiss-keyguard"], 5000);
  bestEffortAdb(["shell", "cmd", "statusbar", "collapse"], 5000);
  bestEffortAdb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5000);
  bestEffortAdb(["shell", "am", "force-stop", APP_PACKAGE], 10_000);
  setupAndroidRuntime(DEV_CLIENT_PORT, APP_PACKAGE);
  bestEffortAdb(["shell", "cmd", "statusbar", "collapse"], 5000);
  await sleep(2000);
}

function isRuntimeLoadError(screen: ReturnType<typeof captureScreenInDir>): boolean {
  return /There was a problem loading the project|SocketTimeoutException|isn't responding|keeps stopping|has stopped/i.test(
    screen.visibleText,
  );
}

function isAndroidSystemUiCapture(screen: ReturnType<typeof captureScreenInDir>): boolean {
  if (
    screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY) ||
    screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY) ||
    screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY)
  ) {
    return false;
  }
  return /Display brightness|Quick Settings|Open settings|Power menu|Clear all notifications|Set a screen lock|Signed in as Owner|Internet,\s*AndroidWifi|Flashlight/i.test(
    screen.visibleText,
  );
}

function isBlankAppCapture(screen: ReturnType<typeof captureScreenInDir>): boolean {
  if (screen.visibleText.trim()) return false;
  if (!screen.xml.includes(`package="${APP_PACKAGE}"`)) return false;
  return /RelativeLayout|ComposeView|android\.view\.View/.test(screen.xml);
}

async function captureReplayScreen(captureId: string): Promise<ReturnType<typeof captureScreenInDir>> {
  bestEffortAdb(["shell", "cmd", "statusbar", "collapse"], 5000);
  await sleep(300);
  let screen = captureScreenInDir(captureId, ANDROID_API34_ACCEPTANCE_DIR);
  if (!isAndroidSystemUiCapture(screen)) return screen;

  bestEffortAdb(["shell", "cmd", "statusbar", "collapse"], 5000);
  bestEffortAdb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5000);
  await sleep(700);
  screen = captureScreenInDir(`${captureId}_app`, ANDROID_API34_ACCEPTANCE_DIR);
  return screen;
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

function outputEvidenceComplete(text: string, testCase: Api34ReplayCase): boolean {
  return (
    countKeywordHits(text, testCase.workSpecificKeywords) >= 4 &&
    sourceConfidenceVisible(text) &&
    taxOrWarningVisible(text) &&
    pdfActionVisible(text)
  );
}

async function recoverBlankCapture(
  captures: ReturnType<typeof captureScreenInDir>[],
  captureId: string,
): Promise<ReturnType<typeof captureScreenInDir>> {
  if (!isBlankAppCapture(captures[captures.length - 1])) {
    return captures[captures.length - 1];
  }
  await sleep(2200);
  const recovered = await captureReplayScreen(captureId);
  captures.push(recovered);
  return recovered;
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
  captures.push(await captureReplayScreen(captureId));
  if (isRuntimeLoadError(captures[0])) {
    const outputText = mergeVisibleText(captures);
    return { captures, outputText, best: captures[0] };
  }

  await sleep(1200);
  captures.push(await captureReplayScreen(`${captureId}_settled`));
  if (isRuntimeLoadError(captures[captures.length - 1])) {
    const outputText = mergeVisibleText(captures);
    return { captures, outputText, best: bestCaptureForResult(captures, testCase) };
  }

  for (let index = 1; index <= 6; index += 1) {
    if (outputEvidenceComplete(mergeVisibleText(captures), testCase)) break;
    const bounds = scrollableMessageBounds(captures[captures.length - 1]);
    focusAndroidBounds(bounds);
    try {
      runAdb(["shell", "input", "swipe", ...swipeWithinBoundsArgs(bounds, "down", 850)], 8000);
    } catch {
      // The next capture records the actual Android state and dump errors.
    }
    await sleep(1500);
    captures.push(await captureReplayScreen(`${captureId}_reverse_${index}`));
    await recoverBlankCapture(captures, `${captureId}_reverse_${index}_recovered`);
    if (isRuntimeLoadError(captures[captures.length - 1])) break;
  }

  for (let index = 1; index <= 8; index += 1) {
    if (outputEvidenceComplete(mergeVisibleText(captures), testCase)) break;
    if (isRuntimeLoadError(captures[captures.length - 1])) break;
    const bounds = scrollableMessageBounds(captures[captures.length - 1]);
    focusAndroidBounds(bounds);
    try {
      runAdb(["shell", "input", "swipe", ...swipeWithinBoundsArgs(bounds, "up", 650)], 8000);
    } catch {
      // The next capture records the actual Android state and dump errors.
    }
    await sleep(1400);
    captures.push(await captureReplayScreen(`${captureId}_scroll_${index}`));
    await recoverBlankCapture(captures, `${captureId}_scroll_${index}_recovered`);
    if (isRuntimeLoadError(captures[captures.length - 1])) break;

    const text = mergeVisibleText(captures);
    if (outputEvidenceComplete(text, testCase)) {
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
  let last = await captureReplayScreen(params.captureId);
  let blankSurfaceStreak = 0;
  while (Date.now() - startedAt < params.timeoutMs) {
    if (params.ready(last)) return last;
    if (isRuntimeLoadError(last)) return last;
    if (isBlankAppCapture(last)) {
      blankSurfaceStreak += 1;
      if (blankSurfaceStreak >= 6) {
        bestEffortAdb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"], 5000);
      }
    } else {
      blankSurfaceStreak = 0;
    }
    const dismissed = dismissBlockingAndroidSurface(last);
    await sleep(dismissed ? 2500 : 1500);
    last = await captureReplayScreen(params.captureId);
  }
  return last;
}

type ReplayScreen = ReturnType<typeof captureScreenInDir>;

function appRootProofReady(screen: ReplayScreen): boolean {
  return (
    appRootReady(screen) &&
    (screen.visibleText.includes(ROUTE_PROOF_APP_ROOT_READY) || isAndroidAppRootSurfaceXml(screen.xml))
  );
}

function requestRouteProofReady(screen: ReplayScreen): boolean {
  return (
    requestRouteReady(screen) &&
    (screen.visibleText.includes(ROUTE_PROOF_REQUEST_ROUTE_READY) || isAndroidRequestRouteSurfaceXml(screen.xml))
  );
}

function embeddedAiRouteProofReady(screen: ReplayScreen): boolean {
  return screen.visibleText.includes(ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY) || isAndroidEmbeddedAiRouteSurfaceXml(screen.xml);
}

function routeReadyForCase(testCase: Api34ReplayCase, screen: ReplayScreen): boolean {
  return testCase.route === "/request"
    ? requestRouteProofReady(screen)
    : embeddedAiRouteProofReady(screen);
}

function aiOutputProofSubmitted(params: {
  testCase: Api34ReplayCase;
  loaded: ReplayScreen;
  afterPrompt: ReplayScreen;
  outputText: string;
  responseVisible: boolean;
  workSpecificRowsFound: boolean;
}): boolean {
  return (
    params.testCase.route === "/ai?context=foreman" &&
    (isAndroidEmbeddedAiRouteSurfaceXml(params.loaded.xml) ||
      isAndroidEmbeddedAiRouteSurfaceXml(params.afterPrompt.xml)) &&
    params.responseVisible &&
    params.workSpecificRowsFound &&
    outputEvidenceComplete(params.outputText, params.testCase)
  );
}

async function openAppRootForReplay(captureId: string): Promise<ReturnType<typeof captureScreenInDir>> {
  setupAndroidRuntime(DEV_CLIENT_PORT, APP_PACKAGE);
  const openError = tryOpenDeepLink(buildDevClientUri(DEV_CLIENT_PORT));
  const screen = await waitForAndroidScreen({
    captureId,
    timeoutMs: 90_000,
    ready: appRootProofReady,
  });
  if (openError && !appRootProofReady(screen)) {
    return { ...screen, error: screen.error ?? openError };
  }
  return screen;
}

type OpenCaseRouteResult = {
  screen: ReturnType<typeof captureScreenInDir>;
  appRootMarkerProven: boolean;
};

async function openCaseRoute(testCase: Api34ReplayCase): Promise<OpenCaseRouteResult> {
  let last: ReturnType<typeof captureScreenInDir> | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const root = await openAppRootForReplay(`${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_root_attempt_${attempt}`);
    const rootMarkerProven = appRootProofReady(root);
    if (!rootMarkerProven) {
      last = root;
      if (isRuntimeLoadError(root)) {
        dismissBlockingAndroidSurface(root);
        await resetAndroidAppForReplay();
      }
      continue;
    }
    const uris = buildUriCandidates(testCase);
    for (let uriIndex = 0; uriIndex < uris.length; uriIndex += 1) {
      bestEffortAdb(["shell", "cmd", "statusbar", "collapse"], 5000);
      const openError = tryOpenDeepLink(uris[uriIndex]);
      last = await waitForAndroidScreen({
        captureId: `${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_loaded_attempt_${attempt}_${uriIndex}`,
        timeoutMs: attempt === 1 && uriIndex === 0 ? 60_000 : 35_000,
        ready: (screen) => routeReadyForCase(testCase, screen),
      });
      if (openError && !routeReadyForCase(testCase, last)) {
        last = { ...last, error: last.error ?? openError };
      }
      if (routeReadyForCase(testCase, last)) return { screen: last, appRootMarkerProven: rootMarkerProven };
      if (isRuntimeLoadError(last)) {
        dismissBlockingAndroidSurface(last);
        await resetAndroidAppForReplay();
        break;
      }
      if (isBlankAppCapture(last)) {
        await resetAndroidAppForReplay();
        break;
      }
    }

    if (testCase.route === "/request") {
      try {
        runAdb(["shell", "input", "tap", ...viewportTapArgs(0.25, 0.93)], 5000);
      } catch {
        // The next deep link attempt is the source of truth.
      }
      await sleep(1000);
    }
  }
  return {
    screen:
      last ??
      captureScreenInDir(
        `${testCase.afterPromptCaptureId.replace("_after_prompt", "")}_loaded_failed`,
        ANDROID_API34_ACCEPTANCE_DIR,
      ),
    appRootMarkerProven: false,
  };
}

function buildBlockedMatrix(status: Api34ReplayStatus, env: AndroidApi34DeviceReadyResult): Api34ReplayMatrix {
  const head = currentHead();
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
    source_code_head: head,
    artifact_commit_head: null,
    current_head_at_write_time: head,
    proof_mode: "refresh",
    proof_valid_for_source_code_head: true,
    artifact_only_supersession_allowed: true,
    auth_session_required: false,
    e2e_auth_credentials_present: false,
    e2e_role_auth_source: "not_checked",
    e2e_role_mode: "not_checked",
    e2e_roles_resolved: [],
    e2e_missing_secret_keys: [],
    auth_login_screen_detected: false,
    auth_login_attempted: false,
    auth_login_completed: false,
    auth_login_blocked_status: null,
    role_isolation_e2e_claimed: false,
    full_access_runtime_claimed: false,
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
  auth: AndroidReplayAuthEvidence;
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
  const authBlocked =
    params.auth.auth_login_screen_detected === true &&
    params.auth.auth_login_completed !== true &&
    params.auth.auth_session_required === true;
  return {
    ...buildBlockedMatrix(
      passed
        ? GREEN
        : authBlocked
        ? "BLOCKED_ANDROID_API34_AUTH_SESSION_REQUIRED"
        : outputCaptureFailed
        ? "BLOCKED_ANDROID_API34_OUTPUT_CAPTURE_FAILED"
        : "BLOCKED_ANDROID_API34_ROUTE_REPLAY_FAILED",
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
    auth_session_required: params.auth.auth_session_required,
    e2e_auth_credentials_present: params.auth.e2e_auth_credentials_present,
    e2e_role_auth_source: params.auth.e2e_role_auth_source,
    e2e_role_mode: params.auth.e2e_role_mode,
    e2e_roles_resolved: params.auth.e2e_roles_resolved,
    e2e_missing_secret_keys: params.auth.e2e_missing_secret_keys,
    auth_login_screen_detected: params.auth.auth_login_screen_detected,
    auth_login_attempted: params.auth.auth_login_attempted,
    auth_login_completed: params.auth.auth_login_completed,
    auth_login_blocked_status: params.auth.auth_login_blocked_status,
    role_isolation_e2e_claimed: params.auth.role_isolation_e2e_claimed,
    full_access_runtime_claimed: params.auth.full_access_runtime_claimed,
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
      `Auth session required: ${matrix.auth_session_required}`,
      `Auth login attempted: ${matrix.auth_login_attempted}`,
      `Auth login completed: ${matrix.auth_login_completed}`,
      `E2E auth source: ${matrix.e2e_role_auth_source}`,
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
  const b2cProofReady = existingMatrix.final_status === B2C_BINDING_GREEN && existingMatrix.fake_green_claimed === false;
  writeJson(
    "matrix.json",
    {
      ...existingMatrix,
      final_status: replayGreen && b2cProofReady ? B2C_BINDING_GREEN : replayGreen ? "BLOCKED_RELEASE_GATES_NOT_RUN" : matrix.final_status,
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
  const api34ReplayProof = [
    API34_CANONICAL_REPLAY_PROOF_HEADING,
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
    .join("\n");
  writeText(
    "proof.md",
    replaceMarkdownSection(previousProof, API34_CANONICAL_REPLAY_PROOF_HEADING, api34ReplayProof),
    BINDING_FIX_DIR,
  );
}

async function replayAndroidRoutes(env: AndroidApi34DeviceReadyResult): Promise<{
  results: Api34ReplayResult[];
  screenshots: string[];
  uiDumps: string[];
  failures: unknown[];
  appRootMarkerProven: boolean;
  auth: AndroidReplayAuthEvidence;
}> {
  const metro = await ensureMetro(DEV_CLIENT_PORT);
  const results: Api34ReplayResult[] = [];
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const failures: unknown[] = [];
  const auth = blankAuthEvidence();
  let appRootMarkerProven = false;
  let initialRootFailure: unknown | null = null;

  try {
    let root: ReturnType<typeof captureScreenInDir> | null = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await resetAndroidAppForReplay();
      const openError = tryOpenDeepLink(buildDevClientUri(DEV_CLIENT_PORT));
      root = await waitForAndroidScreen({
        captureId: attempt === 1 ? "app_root_loaded" : `app_root_loaded_retry_${attempt}`,
        timeoutMs: attempt === 1 ? 90_000 : 60_000,
        ready: appRootProofReady,
      });
      if (openError && !appRootProofReady(root)) {
        root = { ...root, error: root.error ?? openError };
      }
      if (appRootProofReady(root)) break;
      if (isRuntimeLoadError(root)) {
        dismissBlockingAndroidSurface(root);
        continue;
      }
    }
    root = root ?? captureScreenInDir("app_root_loaded_failed", ANDROID_API34_ACCEPTANCE_DIR);
    appRootMarkerProven = appRootProofReady(root);
    if (!appRootMarkerProven) {
      initialRootFailure = {
        status: "BLOCKED_ANDROID_API34_ROUTE_REPLAY_FAILED",
        step: "app_root_marker",
        screenshot_path: root.screenshot_path,
        ui_dump_path: root.ui_dump_path,
        visible_text_sample: root.visibleText.slice(0, 500),
        error: root.error,
      };
    }

    for (const testCase of CASES) {
      let result: Api34ReplayResult | null = null;
      let bestObservedResult: Api34ReplayResult | null = null;
      let bestObservedScore = -1;
      let keywordHits = 0;
      let routeMarkerProven = false;
      await resetAndroidAppForReplay();

      for (let attempt = 1; attempt <= MAX_CASE_ATTEMPTS; attempt += 1) {
        const captureId =
          attempt === 1 ? testCase.afterPromptCaptureId : `${testCase.afterPromptCaptureId}_retry_${attempt}`;
        const opened = await openCaseRoute(testCase);
        const loaded = opened.screen;
        appRootMarkerProven = appRootMarkerProven || opened.appRootMarkerProven;
        await sleep(12_000);
        const afterPromptCapture = await captureScrollableOutput(captureId, testCase);
        const afterPrompt = afterPromptCapture.best;
        const outputText = afterPromptCapture.outputText;
        routeMarkerProven = routeReadyForCase(testCase, loaded) || outputText.includes(testCase.marker);
        const visibleRows = visibleRowsFromText(outputText);
        keywordHits = countKeywordHits(outputText, testCase.workSpecificKeywords);
        const forbiddenContextHit = countKeywordHits(outputText, testCase.forbiddenKeywords ?? []) > 0;
        const responseProven = afterPromptCapture.captures.some(responseVisible) || keywordHits >= 4;
        const workSpecificRowsFound = keywordHits >= 4;
        const promptSubmitted =
          routeMarkerProven ||
          aiOutputProofSubmitted({
            testCase,
            loaded,
            afterPrompt,
            outputText,
            responseVisible: responseProven,
            workSpecificRowsFound,
          });
        result = {
          device_id: env.device_id,
          avd_name: API34_AVD_NAME,
          android_sdk: env.android_sdk,
          cpu_abi: env.cpu_abi,
          route: testCase.route,
          route_marker: testCase.marker,
          prompt: testCase.prompt,
          prompt_submitted: promptSubmitted,
          response_visible: responseProven,
          visible_rows: visibleRows,
          generic_known_work_rows_found: hasForbiddenKnownWorkRows(visibleRows) || forbiddenContextHit,
          work_specific_rows_found: workSpecificRowsFound,
          source_confidence_visible: sourceConfidenceVisible(outputText),
          tax_or_warning_visible: taxOrWarningVisible(outputText),
          pdf_action_visible: pdfActionVisible(outputText),
          screenshot_path: afterPrompt.screenshot_path,
          ui_dump_path: afterPrompt.ui_dump_path,
          runtime_trace_id_if_available: "not_available_from_android_ui",
          error_if_any: loaded.error ?? afterPrompt.error,
        };

        const observedScore =
          (result.prompt_submitted ? 10_000 : 0) +
          (result.response_visible ? 5_000 : 0) +
          (result.work_specific_rows_found ? 3_000 : 0) +
          (result.source_confidence_visible ? 1_000 : 0) +
          (result.tax_or_warning_visible ? 1_000 : 0) +
          (result.pdf_action_visible ? 1_000 : 0) +
          keywordHits * 100 +
          outputText.length;
        if (observedScore > bestObservedScore) {
          bestObservedScore = observedScore;
          bestObservedResult = result;
        }

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

        const authLoginVisible =
          isAuthLoginCapture(loaded) ||
          afterPromptCapture.captures.some(isAuthLoginCapture) ||
          isAuthLoginText(outputText);
        if (authLoginVisible && !resultPassed(result)) {
          const loggedIn = await ensureReplayAuthSession({
            auth,
            protectedRoute: buildUri(testCase),
            successPredicate: (xml) => routeReadyXmlForCase(testCase, xml),
            artifactBase: `${testCase.id}_attempt_${attempt}`,
          });
          if (loggedIn && attempt < MAX_CASE_ATTEMPTS) {
            await sleep(1500);
            continue;
          }
        }

        if (resultPassed(result)) {
          if (auth.auth_session_required && auth.auth_login_attempted) {
            auth.auth_login_completed = true;
            auth.auth_login_blocked_status = null;
            auth.auth_login_error_if_any = null;
          }
          break;
        }
        if (attempt < MAX_CASE_ATTEMPTS) {
          await resetAndroidAppForReplay();
          continue;
        }
      }

      if (!resultPassed(result ?? undefined) && bestObservedResult) {
        result = bestObservedResult;
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

    if (!appRootMarkerProven && initialRootFailure) {
      failures.push(initialRootFailure);
    }
  } finally {
    stopMetro(metro);
  }

  return { results, screenshots, uiDumps, failures, appRootMarkerProven, auth };
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "verify") {
    verifyExistingCanonicalReplayReadOnly();
    console.log(GREEN);
    return;
  }

  ensureDir();
  let existingEvidence: ReturnType<typeof resolveCanonicalApi34Evidence> | null = null;
  if (mode !== "replay") {
    existingEvidence = resolveCanonicalApi34Evidence({
      write: true,
      allowChangedFile: (filePath) =>
        isNoHintWorkOntologyReleaseNeutralPath(filePath) ||
        isOperationObjectMatchingReleaseNeutralPath(filePath) ||
        isProfessionalEstimateReleaseNeutralPath(filePath) ||
        isSmartEstimatorReleaseNeutralPath(filePath) ||
        isMarketPricebookReleaseNeutralPath(filePath),
      allowedRuntimeReuseReason: [
        NO_HINT_WORK_ONTOLOGY_ANDROID_REUSE_REASON,
        OPERATION_OBJECT_MATCHING_ANDROID_REUSE_REASON,
        PROFESSIONAL_ESTIMATE_ANDROID_REUSE_REASON,
        SMART_ESTIMATOR_ANDROID_REUSE_REASON,
        MARKET_PRICEBOOK_ANDROID_REUSE_REASON,
      ].join(";"),
    });
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
  }
  if (process.env.RELEASE_GUARD_IN_PROGRESS === "1") {
    const status = "BLOCKED_CANONICAL_API34_EVIDENCE_NOT_REUSABLE_IN_RELEASE_VERIFY";
    const failure = {
      status,
      reason: existingEvidence?.ok === false ? existingEvidence.reason : "CANONICAL_API34_REPLAY_FORBIDDEN_DURING_RELEASE_VERIFY",
      details: existingEvidence?.ok === false ? existingEvidence.details : null,
      message: "Release verify refuses to start a long Android replay when canonical API34 evidence is stale.",
      fake_green_claimed: false,
    };
    writeJson("failures.json", [failure]);
    console.error(`${status}: Release verify refuses to start a long Android replay`);
    process.exitCode = 1;
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
    writeJson("auth_session.json", blankAuthEvidence());
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
  writeJson("auth_session.json", replay.auth);
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
