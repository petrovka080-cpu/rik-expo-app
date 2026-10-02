import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "./androidDeepLinkLaunchContract";
import {
  buildDevClientUri,
  setupAndroidRuntime,
  sleep,
} from "./androidRouteBootstrapHarness";
import {
  dumpUi,
  nodeHasId,
  replaceField,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
} from "./r4A6AndroidAcceptedUiRuntime";
import { loadOfficeMarketLiveEnv } from "./officeMarketLiveHarnessContracts";

const PROJECT_ROOT = process.cwd();
loadOfficeMarketLiveEnv(PROJECT_ROOT);
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = String(process.env.OFFICE_E2E_ANDROID_DEVICE_ID ?? "emulator-5554").trim();
const EXPECTED_PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const GREEN_STATUS = "GREEN_OFFICE_AI_MARKET_NATIVE_ROLE_GUARD_READ_SMOKE_NO_BUILD_NO_APP_DATA_CLEAR";
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/gu, "-");
const artifactDir = path.join(
  PROJECT_ROOT,
  ".release-runtime",
  "office-ai-market-live-native-android-e2e",
  runId,
);
const summaryPath = path.join(artifactDir, "summary.json");
const progressPath = path.join(artifactDir, "progress.log");

type RoleKey = "FOREMAN" | "DIRECTOR" | "BUYER" | "WAREHOUSE" | "CONTRACTOR" | "ACCOUNTANT";
type RoleName = "foreman" | "director" | "buyer" | "warehouse" | "contractor" | "accountant";

type RoleSpec = {
  key: RoleKey;
  role: RoleName;
  route: `/office/${RoleName}`;
  shellId: `office-role-auth-context-${RoleName}`;
  stableIds: string[];
  businessPrefixes: string[];
  deniedRoute: `/office/${RoleName}`;
};

const ROLE_SPECS: readonly RoleSpec[] = [
  {
    key: "FOREMAN",
    role: "foreman",
    route: "/office/foreman",
    shellId: "office-role-auth-context-foreman",
    stableIds: ["foreman-main-materials-open"],
    businessPrefixes: ["foreman-main-materials-open"],
    deniedRoute: "/office/director",
  },
  {
    key: "DIRECTOR",
    role: "director",
    route: "/office/director",
    shellId: "office-role-auth-context-director",
    stableIds: ["director-top-tab-requests"],
    businessPrefixes: ["director-request-open-", "director-finance-dashboard-debt-card", "director-reports-home-card"],
    deniedRoute: "/office/warehouse",
  },
  {
    key: "BUYER",
    role: "buyer",
    route: "/office/buyer",
    shellId: "office-role-auth-context-buyer",
    stableIds: ["buyer-tab-inbox"],
    businessPrefixes: ["buyer-group-open-"],
    deniedRoute: "/office/director",
  },
  {
    key: "WAREHOUSE",
    role: "warehouse",
    route: "/office/warehouse",
    shellId: "office-role-auth-context-warehouse",
    stableIds: ["warehouse-tab-incoming"],
    businessPrefixes: ["warehouse-req-row-", "warehouse-incoming-row-"],
    deniedRoute: "/office/accountant",
  },
  {
    key: "CONTRACTOR",
    role: "contractor",
    route: "/office/contractor",
    shellId: "office-role-auth-context-contractor",
    stableIds: ["contractor-subcontracts-list"],
    businessPrefixes: ["contractor-work-card-"],
    deniedRoute: "/office/buyer",
  },
  {
    key: "ACCOUNTANT",
    role: "accountant",
    route: "/office/accountant",
    shellId: "office-role-auth-context-accountant",
    stableIds: [],
    businessPrefixes: ["accountant-proposal-row-", "accountant-subcontract-row-"],
    deniedRoute: "/office/warehouse",
  },
] as const;

type LinkedWebSummary = {
  final_status?: string;
  source_sha?: string;
  branch?: string;
  role_auth?: { same_company_for_required_roles?: boolean };
  office?: { ai_request_id?: string; manual_request_id?: string };
  market?: { listing_id?: string; listing_published?: boolean; public_image_fetch_ok?: boolean };
};

type RoleResult = {
  role: RoleName;
  login_via_native_ui: boolean;
  expected_role_shell_visible: boolean;
  stable_surface_visible: boolean;
  business_data_visible: boolean;
  business_marker_hash: string | null;
  linked_request_visible: boolean | null;
  denied_cross_role_route_blocked: boolean;
  signed_out_via_native_ui: boolean;
};

type ResumeSummary = {
  final_status?: string;
  source_sha?: string | null;
  linked_web_summary?: string | null;
  device_id?: string;
  android_api?: number;
  roles?: RoleResult[];
  market?: Record<string, boolean>;
};

const result: Record<string, unknown> & {
  final_status: string;
  roles: RoleResult[];
  market: Record<string, boolean>;
  error_step: string | null;
  error_message: string | null;
} = {
  contract: "rik-expo-app.s27-6.office-market-live.native-android.role-read-smoke.v2",
  final_status: "STOP_OFFICE_AI_MARKET_LIVE_NATIVE_ANDROID_E2E_NOT_FINISHED",
  run_started_at: runStartedAt,
  artifact_dir: path.relative(PROJECT_ROOT, artifactDir).replace(/\\/gu, "/"),
  branch: null,
  source_sha: null,
  linked_web_summary: null,
  linked_web_source_sha: null,
  target_environment: null,
  project_ref: null,
  device_id: DEVICE_ID,
  android_api: null,
  installed_package_present: false,
  main_activity_resumed: false,
  native_app_used: true,
  chrome_used: false,
  app_data_cleared: false,
  apk_built: false,
  apk_installed: false,
  emulator_wiped: false,
  developer_role_override_used: false,
  service_role_used: false,
  production_touched: false,
  roles: [],
  market: {
    home_visible: false,
    linked_listing_visible_in_feed: false,
    linked_listing_detail_visible: false,
    linked_listing_owner_history_visible: false,
  },
  role_isolation: false,
  same_company_fixture_proven_by_linked_web_run: false,
  all_six_native_role_sessions_passed: false,
  error_step: null,
  error_message: null,
};

let currentStep = "bootstrap";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/gu, "")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeSummary(): void {
  writeJson(summaryPath, result);
}

function mark(step: string, details: Record<string, unknown> = {}): void {
  currentStep = step;
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.appendFileSync(progressPath, `${new Date().toISOString()} ${JSON.stringify({ step, ...details })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ step, ...details })}\n`);
}

function run(command: string, args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      }).trim(),
    };
  } catch (error) {
    const record = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
    };
  }
}

function git(args: string[]): string | null {
  const command = run("git", args, 20_000);
  return command.ok ? command.output : null;
}

function sha256Short(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function roleCredentials(key: RoleKey): { email: string; password: string } {
  return {
    email: clean(process.env[`E2E_${key}_EMAIL`]),
    password: clean(process.env[`E2E_${key}_PASSWORD`]),
  };
}

function assertRuntimeConfig(): void {
  invariant(clean(process.env.LIVE_E2E) === "1", "STOP_LIVE_E2E_ENV_REQUIRED");
  const targetEnvironment = clean(process.env.OFFICE_E2E_TARGET_ENV || process.env.APP_ENV || "staging").toLowerCase();
  const projectRef = clean(process.env.STAGING_SUPABASE_PROJECT_REF || EXPECTED_PROJECT_REF);
  const supabaseUrl = clean(process.env.STAGING_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL);
  invariant(targetEnvironment !== "production", "STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  invariant(clean(process.env.APP_ENV).toLowerCase() !== "production", "STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  invariant(!/^(1|true|yes)$/iu.test(clean(process.env.ALLOW_PRODUCTION)), "STOP_PRODUCTION_DB_MUTATION_NOT_ALLOWED");
  invariant(projectRef === EXPECTED_PROJECT_REF && supabaseUrl.includes(EXPECTED_PROJECT_REF), "STOP_STAGING_PROJECT_REF_MISMATCH");
  invariant(Boolean(clean(process.env.OFFICE_E2E_COMPANY_ID)), "STOP_OFFICE_E2E_COMPANY_ID_MISSING");
  for (const spec of ROLE_SPECS) {
    const credentials = roleCredentials(spec.key);
    invariant(credentials.email && credentials.password, `STOP_${spec.key}_CREDENTIALS_MISSING`);
  }
  result.target_environment = targetEnvironment;
  result.project_ref = projectRef;
}

function resolveLinkedWebSummary(): { filePath: string; summary: LinkedWebSummary } {
  const configured = clean(process.env.OFFICE_E2E_SOURCE_WEB_SUMMARY);
  invariant(configured, "STOP_EXPLICIT_GREEN_WEB_SUMMARY_REQUIRED");
  const filePath = path.resolve(configured);
  invariant(fs.existsSync(filePath), "STOP_LINKED_WEB_SUMMARY_MISSING");
  const summary = readJson<LinkedWebSummary>(filePath);
  invariant(
    summary.final_status === "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS",
    "STOP_LINKED_WEB_SUMMARY_NOT_GREEN",
  );
  invariant(summary.role_auth?.same_company_for_required_roles === true, "STOP_LINKED_WEB_COMPANY_PROOF_MISSING");
  invariant(summary.office?.ai_request_id && summary.office?.manual_request_id, "STOP_LINKED_WEB_REQUEST_IDS_MISSING");
  invariant(
    summary.market?.listing_id && summary.market.listing_published === true && summary.market.public_image_fetch_ok === true,
    "STOP_LINKED_WEB_MARKET_PROOF_MISSING",
  );
  result.linked_web_summary = path.relative(PROJECT_ROOT, filePath).replace(/\\/gu, "/");
  result.linked_web_source_sha = summary.source_sha ?? null;
  result.same_company_fixture_proven_by_linked_web_run = true;
  return { filePath, summary };
}

function restoreValidatedResumePrefix(): void {
  const configured = clean(process.env.OFFICE_E2E_NATIVE_RESUME_SUMMARY);
  if (!configured) return;
  const filePath = path.resolve(configured);
  invariant(fs.existsSync(filePath), "STOP_NATIVE_RESUME_SUMMARY_MISSING");
  const previous = readJson<ResumeSummary>(filePath);
  const currentSourceSha = clean(result.source_sha);
  invariant(
    previous.final_status === "STOP_OFFICE_AI_MARKET_LIVE_NATIVE_ANDROID_E2E_FAILED",
    "STOP_NATIVE_RESUME_SOURCE_STATUS_INVALID",
  );
  invariant(clean(previous.source_sha) === currentSourceSha, "STOP_NATIVE_RESUME_SOURCE_SHA_MISMATCH");
  invariant(
    clean(previous.linked_web_summary) === clean(result.linked_web_summary),
    "STOP_NATIVE_RESUME_LINKED_WEB_MISMATCH",
  );
  invariant(previous.device_id === DEVICE_ID && previous.android_api === 34, "STOP_NATIVE_RESUME_DEVICE_MISMATCH");
  const roles = Array.isArray(previous.roles) ? previous.roles : [];
  invariant(roles.length > 0 && roles.length < ROLE_SPECS.length, "STOP_NATIVE_RESUME_ROLE_PREFIX_INVALID");
  for (const [index, role] of roles.entries()) {
    invariant(role.role === ROLE_SPECS[index]?.role, "STOP_NATIVE_RESUME_ROLE_ORDER_INVALID");
    invariant(
      role.login_via_native_ui &&
      role.expected_role_shell_visible &&
      role.stable_surface_visible &&
      role.business_data_visible &&
      role.denied_cross_role_route_blocked &&
      role.signed_out_via_native_ui &&
      role.linked_request_visible !== false,
      `STOP_NATIVE_RESUME_ROLE_NOT_GREEN:${role.role}`,
    );
  }
  const market = previous.market ?? {};
  if (roles.some((role) => role.role === "foreman")) {
    invariant(
      Object.keys(result.market).every((key) => market[key] === true),
      "STOP_NATIVE_RESUME_MARKET_NOT_GREEN",
    );
    result.market = { ...result.market, ...market };
  }
  result.roles = roles.map((role) => ({ ...role }));
  result.resumed_from = path.relative(PROJECT_ROOT, filePath).replace(/\\/gu, "/");
  mark("native_resume_prefix_restored", {
    roles: result.roles.map((role) => role.role),
    sourceArtifact: result.resumed_from,
  });
}

function adb(args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  return run("adb", ["-s", DEVICE_ID, ...args], timeoutMs);
}

function snapshotHas(snapshot: UiSnapshot, id: string): boolean {
  return snapshot.nodes.some((node) => nodeHasId(node, id));
}

function nodeId(node: UiNode): string {
  return node.resourceId || node.contentDesc;
}

function nodeIsOnScreen(node: UiNode): boolean {
  const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
  if (!match) return false;
  const top = Number(match[2]);
  const bottom = Number(match[4]);
  return top >= 120 && bottom > top && bottom <= 2_140;
}

async function tapVisibleIdWithBoundedSweep(id: string): Promise<boolean> {
  // Fine-grained seeking avoids jumping over the virtualized Session row in
  // the tall OTA diagnostics profile, while seekNode stops at scroll edges.
  const found = await seekNode(
    "adb",
    DEVICE_ID,
    (candidate) => nodeHasId(candidate, id) && candidate.enabled && nodeIsOnScreen(candidate),
    55,
    "fine",
  );
  return Boolean(found.node && tapNode("adb", DEVICE_ID, found.node));
}

async function waitForId(id: string, timeoutMs: number, code: string): Promise<UiSnapshot> {
  const snapshot = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) => snapshotHas(candidate, id),
    timeoutMs,
  );
  invariant(snapshotHas(snapshot, id), code);
  return snapshot;
}

async function openRoute(route: string, label: string): Promise<void> {
  const uri = new URL(`rik:///${route.replace(/^\//u, "")}`);
  uri.searchParams.set("nativeE2ERun", runId);
  mark("native_route_open", { label, route });
  const launched = run(
    "adb",
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri.toString(), PACKAGE_NAME),
    60_000,
  );
  invariant(launched.ok, `STOP_NATIVE_ROUTE_LAUNCH_FAILED:${label}`);
  await sleep(750);
}

async function ensureLoginScreen(): Promise<void> {
  let snapshot = dumpUi("adb", DEVICE_ID);
  if (snapshotHas(snapshot, "auth.login.screen")) return;

  await openRoute("/profile", "profile_for_logout");
  snapshot = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) =>
      snapshotHas(candidate, "auth.login.screen") ||
      snapshotHas(candidate, "profile.logout.button") ||
      snapshotHas(candidate, "protected-identity-sign-out") ||
      snapshotHas(candidate, "app-bottom-nav"),
    90_000,
  );
  if (snapshotHas(snapshot, "auth.login.screen")) return;

  if (snapshotHas(snapshot, "protected-identity-sign-out")) {
    invariant(await tapById("adb", DEVICE_ID, "protected-identity-sign-out", 8), "STOP_PROTECTED_SIGN_OUT_TAP_FAILED");
  } else {
    invariant(await tapVisibleIdWithBoundedSweep("profile.logout.button"), "STOP_PROFILE_SIGN_OUT_TAP_FAILED");
    const confirmation = await waitForSnapshot(
      "adb",
      DEVICE_ID,
      (candidate) => candidate.nodes.some((node) =>
        node.enabled &&
        node.clickable &&
        (nodeHasId(node, "android:id/button1") || node.text.trim().toLocaleLowerCase("ru-RU") === "выйти"),
      ),
      15_000,
    );
    const confirmNode = confirmation.nodes.find((node) =>
      node.enabled &&
      node.clickable &&
      (nodeHasId(node, "android:id/button1") || node.text.trim().toLocaleLowerCase("ru-RU") === "выйти"),
    );
    invariant(confirmNode && tapNode("adb", DEVICE_ID, confirmNode), "STOP_NATIVE_SIGN_OUT_CONFIRM_FAILED");
  }

  await waitForId("auth.login.screen", 60_000, "STOP_NATIVE_LOGIN_SCREEN_NOT_RESTORED");
}

async function bootstrapDevClient(): Promise<void> {
  mark("native_dev_client_bootstrap_start", { metroPort: 8_081 });
  const launched = run(
    "adb",
    buildAndroidDeepLinkLaunchArgs(
      DEVICE_ID,
      buildDevClientUri(8_081),
      PACKAGE_NAME,
    ),
    60_000,
  );
  invariant(launched.ok, "STOP_NATIVE_DEV_CLIENT_LAUNCH_FAILED");

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi("adb", DEVICE_ID);
    invariant(!snapshotHas(snapshot, "config-recovery-state"), "STOP_NATIVE_CONFIG_RECOVERY_VISIBLE");
    if (
      snapshotHas(snapshot, "auth.login.screen") ||
      snapshotHas(snapshot, "app-bottom-nav") ||
      snapshotHas(snapshot, "profile.logout.button")
    ) {
      mark("native_dev_client_bootstrap_done");
      return;
    }

    const developmentServer = snapshot.nodes.find((node) =>
      node.enabled &&
      (node.text.includes("10.0.2.2:8081") ||
        node.text.includes("127.0.0.1:8081") ||
        node.contentDesc.includes("10.0.2.2:8081") ||
        node.contentDesc.includes("127.0.0.1:8081")),
    );
    if (developmentServer) {
      tapNode("adb", DEVICE_ID, developmentServer);
      await sleep(1_000);
      continue;
    }

    const resume = snapshot.nodes.find((node) =>
      node.enabled && /^(?:Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (resume) tapNode("adb", DEVICE_ID, resume);
    await sleep(750);
  }
  throw new Error("STOP_NATIVE_DEV_CLIENT_BOOTSTRAP_TIMEOUT");
}

async function loginRole(spec: RoleSpec): Promise<void> {
  await ensureLoginScreen();
  const credentials = roleCredentials(spec.key);
  mark("native_role_login_start", { role: spec.role });
  invariant(await replaceField("adb", DEVICE_ID, "auth.login.email", credentials.email), `STOP_${spec.key}_EMAIL_INPUT_FAILED`);
  invariant(await replaceField("adb", DEVICE_ID, "auth.login.password", credentials.password), `STOP_${spec.key}_PASSWORD_INPUT_FAILED`);
  invariant(await tapById("adb", DEVICE_ID, "auth.login.submit", 8), `STOP_${spec.key}_LOGIN_SUBMIT_FAILED`);
  const signedIn = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) => snapshotHas(candidate, "app-bottom-nav") || snapshotHas(candidate, "profile.logout.button"),
    90_000,
  );
  invariant(
    snapshotHas(signedIn, "app-bottom-nav") || snapshotHas(signedIn, "profile.logout.button"),
    `STOP_${spec.key}_NATIVE_LOGIN_FAILED`,
  );
  mark("native_role_login_done", { role: spec.role });
}

async function seekByIds(ids: readonly string[], maxSwipes = 24): Promise<UiNode | null> {
  if (ids.length === 0) return null;
  const found = await seekNode(
    "adb",
    DEVICE_ID,
    (node) => ids.some((id) => nodeHasId(node, id)),
    maxSwipes,
    "coarse",
  );
  return found.node;
}

async function seekByPrefixes(prefixes: readonly string[], maxSwipes = 28): Promise<UiNode | null> {
  const found = await seekNode(
    "adb",
    DEVICE_ID,
    (node) => prefixes.some((prefix) => nodeId(node).startsWith(prefix)),
    maxSwipes,
    "coarse",
  );
  return found.node;
}

async function verifyLinkedRequest(spec: RoleSpec, webSummary: LinkedWebSummary): Promise<boolean | null> {
  const aiRequestId = clean(webSummary.office?.ai_request_id);
  const manualRequestId = clean(webSummary.office?.manual_request_id);
  const ids = spec.role === "buyer"
    ? [`buyer-group-open-${aiRequestId}`, `buyer-group-open-${manualRequestId}`]
    : [];
  if (ids.length === 0) return null;
  return Boolean(await seekByIds(ids, 32));
}

async function passExistingFioConfirmationIfRequired(spec: RoleSpec): Promise<void> {
  const gate = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) =>
      snapshotHas(candidate, spec.shellId) ||
      snapshotHas(candidate, "warehouse-fio-confirm"),
    90_000,
  );
  if (snapshotHas(gate, spec.shellId)) return;
  invariant(snapshotHas(gate, "warehouse-fio-confirm"), `STOP_${spec.key}_ROLE_SHELL_MISSING`);
  const fioInput = gate.nodes.find((node) => nodeHasId(node, "warehouse-fio-input"));
  const fioText = fioInput?.text.trim() ?? "";
  if (!fioText || fioText === "Фамилия Имя Отчество") {
    invariant(
      await replaceField("adb", DEVICE_ID, "warehouse-fio-input", `Office E2E ${spec.role}`),
      `STOP_${spec.key}_FIO_INPUT_FAILED`,
    );
  }
  const enabledConfirmation = await waitForSnapshot(
    "adb",
    DEVICE_ID,
    (candidate) => candidate.nodes.some((node) =>
      nodeHasId(node, "warehouse-fio-confirm") && node.enabled,
    ),
    15_000,
  );
  invariant(
    enabledConfirmation.nodes.some((node) =>
      nodeHasId(node, "warehouse-fio-confirm") && node.enabled,
    ),
    `STOP_${spec.key}_FIO_CONFIRM_NOT_ENABLED`,
  );
  invariant(
    await tapById("adb", DEVICE_ID, "warehouse-fio-confirm", 8),
    `STOP_${spec.key}_FIO_CONFIRM_FAILED`,
  );
  await waitForId(spec.shellId, 60_000, `STOP_${spec.key}_ROLE_SHELL_AFTER_FIO_MISSING`);
  mark("native_role_fio_confirmation_done", { role: spec.role });
}

async function verifyRoleSurface(spec: RoleSpec, webSummary: LinkedWebSummary): Promise<RoleResult> {
  await loginRole(spec);
  await openRoute(spec.route, `${spec.role}_allowed`);
  await passExistingFioConfirmationIfRequired(spec);

  const stableNode = spec.stableIds.length > 0
    ? await seekByIds(spec.stableIds, 20)
    : await seekByPrefixes(spec.businessPrefixes, 20);
  invariant(stableNode, `STOP_${spec.key}_STABLE_SURFACE_MISSING`);
  const businessNode = await seekByPrefixes(spec.businessPrefixes, 32);
  invariant(businessNode, `DO_NOT_GREEN_ROUTE_ONLY:${spec.role}:business_data_missing`);
  const linkedRequestVisible = await verifyLinkedRequest(spec, webSummary);
  if (linkedRequestVisible != null) {
    invariant(linkedRequestVisible, `STOP_${spec.key}_LINKED_WEB_REQUEST_NOT_VISIBLE_NATIVE`);
  }

  await openRoute(spec.deniedRoute, `${spec.role}_denied_cross_role`);
  await waitForId("office-role-guard-blocked", 60_000, `STOP_${spec.key}_CROSS_ROLE_GUARD_MISSING`);

  const roleResult: RoleResult = {
    role: spec.role,
    login_via_native_ui: true,
    expected_role_shell_visible: true,
    stable_surface_visible: true,
    business_data_visible: true,
    business_marker_hash: sha256Short(nodeId(businessNode)),
    linked_request_visible: linkedRequestVisible,
    denied_cross_role_route_blocked: true,
    signed_out_via_native_ui: false,
  };
  mark("native_role_surface_done", {
    role: spec.role,
    linkedRequestVisible,
    businessMarkerHash: roleResult.business_marker_hash,
  });
  return roleResult;
}

async function verifyMarket(webSummary: LinkedWebSummary): Promise<void> {
  const listingId = clean(webSummary.market?.listing_id);
  invariant(listingId, "STOP_LINKED_WEB_LISTING_ID_MISSING");

  await openRoute("/market", "market_home");
  await waitForId("market-home-title", 60_000, "STOP_NATIVE_MARKET_HOME_MISSING");
  result.market.home_visible = true;
  result.market.linked_listing_visible_in_feed = Boolean(
    await seekByIds([`market_feed_card_${listingId}`], 36),
  );
  invariant(result.market.linked_listing_visible_in_feed, "STOP_NATIVE_MARKET_LINKED_LISTING_FEED_MISSING");

  await openRoute(`/product/${listingId}`, "market_linked_listing_detail");
  await waitForId("market_product_card", 60_000, "STOP_NATIVE_MARKET_PRODUCT_DETAIL_MISSING");
  await waitForId("market_product_contact_panel", 30_000, "STOP_NATIVE_MARKET_CONTACT_PANEL_MISSING");
  result.market.linked_listing_detail_visible = true;

  await openRoute("/market/my-listings", "market_owner_history");
  await waitForId("market-my-listings-screen", 60_000, "STOP_NATIVE_MARKET_MY_LISTINGS_MISSING");
  result.market.linked_listing_owner_history_visible = Boolean(
    await seekByIds([`market-my-listings-card_${listingId}`], 36),
  );
  invariant(
    result.market.linked_listing_owner_history_visible,
    "STOP_NATIVE_MARKET_LINKED_OWNER_LISTING_MISSING",
  );
  mark("native_market_done", { listingIdHash: sha256Short(listingId) });
}

async function signOutRole(roleResult: RoleResult): Promise<void> {
  await ensureLoginScreen();
  roleResult.signed_out_via_native_ui = true;
  mark("native_role_logout_done", { role: roleResult.role });
}

function assertDeviceReady(): void {
  const devices = run("adb", ["devices"], 15_000);
  invariant(devices.ok && devices.output.split(/\r?\n/gu).some((line) => line.startsWith(`${DEVICE_ID}\tdevice`)), "STOP_ANDROID_DEVICE_NOT_READY");
  const api = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000);
  invariant(api.ok && api.output === "34", `STOP_ANDROID_API_34_REQUIRED:${api.output || "missing"}`);
  const installed = adb(["shell", "pm", "path", PACKAGE_NAME], 20_000);
  invariant(installed.ok && installed.output.startsWith("package:"), "STOP_NATIVE_APP_NOT_INSTALLED");
  result.android_api = Number(api.output);
  result.installed_package_present = true;
}

function assertMainActivityResumed(): void {
  const activities = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  const resumed = activities.ok && activities.output.split(/\r?\n/gu).some(
    (line) => /mResumedActivity|topResumedActivity/u.test(line) && line.includes(MAIN_ACTIVITY),
  );
  invariant(resumed, "STOP_NATIVE_MAIN_ACTIVITY_NOT_RESUMED");
  result.main_activity_resumed = true;
}

async function main(): Promise<void> {
  fs.mkdirSync(artifactDir, { recursive: true });
  assertRuntimeConfig();
  const linked = resolveLinkedWebSummary();
  result.branch = git(["branch", "--show-current"]);
  result.source_sha = git(["rev-parse", "HEAD"]);
  restoreValidatedResumePrefix();
  assertDeviceReady();

  setupAndroidRuntime(8_081, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [8_081, 8_765],
  });
  mark("native_matrix_start", {
    device: DEVICE_ID,
    linkedWebSummary: path.relative(PROJECT_ROOT, linked.filePath).replace(/\\/gu, "/"),
  });

  await bootstrapDevClient();
  await ensureLoginScreen();
  for (const spec of ROLE_SPECS.slice(result.roles.length)) {
    const roleResult = await verifyRoleSurface(spec, linked.summary);
    result.roles.push(roleResult);
    if (spec.role === "foreman" && !Object.values(result.market).every(Boolean)) {
      await verifyMarket(linked.summary);
    }
    await signOutRole(roleResult);
    writeSummary();
  }

  assertMainActivityResumed();
  const allRolesGreen = result.roles.length === ROLE_SPECS.length && result.roles.every((role) =>
    role.login_via_native_ui &&
    role.expected_role_shell_visible &&
    role.stable_surface_visible &&
    role.business_data_visible &&
    role.denied_cross_role_route_blocked &&
    role.signed_out_via_native_ui &&
    role.linked_request_visible !== false,
  );
  const marketGreen = Object.values(result.market).every(Boolean);
  result.role_isolation = result.roles.every((role) => role.denied_cross_role_route_blocked);
  result.all_six_native_role_sessions_passed = allRolesGreen;
  invariant(allRolesGreen && marketGreen, "STOP_NATIVE_MATRIX_BOOLEAN_AGGREGATE_RED");
  result.final_status = GREEN_STATUS;
  result.error_step = null;
  result.error_message = null;
  writeSummary();
  process.stdout.write(`${JSON.stringify({
    final_status: result.final_status,
    artifact: result.artifact_dir,
    roles_passed: result.roles.length,
    role_isolation: result.role_isolation,
    market: result.market,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  result.final_status = "STOP_OFFICE_AI_MARKET_LIVE_NATIVE_ANDROID_E2E_FAILED";
  result.error_step = currentStep;
  result.error_message = error instanceof Error ? error.message : String(error);
  writeSummary();
  process.stderr.write(`${JSON.stringify({
    final_status: result.final_status,
    error_step: result.error_step,
    error_message: result.error_message,
    artifact: result.artifact_dir,
  }, null, 2)}\n`);
  process.exitCode = 1;
});
