import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "../../e2e/androidDeepLinkLaunchContract";
import {
  buildDevClientUri,
  setupAndroidRuntime,
  sleep,
} from "../../e2e/androidRouteBootstrapHarness";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
} from "../../e2e/r4A6AndroidAcceptedUiRuntime";
import { loadOfficeMarketLiveEnv } from "../../e2e/officeMarketLiveHarnessContracts";
import { computeReleaseFingerprints } from "../../release/computeReleaseFingerprints";

type Json = Record<string, any>;
type AuditRow = Readonly<{
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
}>;

const LIVE_ENV = loadOfficeMarketLiveEnv();
const ORDINARY_CREDENTIAL_MODE = process.env.S279_V15_ORDINARY_CREDENTIAL_MODE === "1";
const V15_NON_ERP_CONFIRMED = process.env.S279_V15_NON_ERP_CONFIRMED === "1";
const ROW_BATCH_ONLY = process.env.S279_NATIVE_ROW_BATCH_ONLY === "1";
const V15_ORDINARY_CONSUMER = ORDINARY_CREDENTIAL_MODE && V15_NON_ERP_CONFIRMED;
const CONTRACT = V15_ORDINARY_CONSUMER
  ? "rik-expo-app.s27-12.v15.ordinary-consumer.native-android.v1"
  : ORDINARY_CREDENTIAL_MODE
    ? "rik-expo-app.s27-9.developer-owner.native-android.v1"
  : "rik-expo-app.s27-8.substrate-crack-sealing-before-fireproof-restoration.native-android.v2";
const GREEN_STATUS = V15_ORDINARY_CONSUMER
  ? "GREEN_S2712_V15_ORDINARY_CONSUMER_NATIVE_ANDROID"
  : ORDINARY_CREDENTIAL_MODE
    ? "GREEN_S279_DEVELOPER_OWNER_NATIVE_ANDROID_USER_CYCLE"
  : "GREEN_S278_F09_SUBSTRATE_CRACK_SEALING_BEFORE_FIREPROOF_RESTORATION_NATIVE_ANDROID";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = String(process.env.S278_NATIVE_DEVICE_ID ?? "emulator-5554");
const DEV_PORT = Number(process.env.S278_NATIVE_METRO_PORT ?? 8_081);
const BACKEND = String(process.env.S278_NATIVE_BACKEND_URL ?? "http://127.0.0.1:8765")
  .replace(/\/$/u, "");
const currentRelease = JSON.parse(readFileSync(resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
), "utf8")) as Json;
const RELEASE_ID = String(process.env.S278_NATIVE_DEFINITION_RELEASE_ID
  ?? currentRelease.definitionReleaseId ?? "");
const SEARCH_RELEASE_ID = String(process.env.S278_NATIVE_SEARCH_RELEASE_ID
  ?? currentRelease.searchReleaseId ?? "");
const CATALOG_ID = "canonical-work:base:special_repair_interior_fireproof_inject_standard";
const MASTER = resolve(
  String(process.env.S278_NATIVE_MASTER_PATH ??
    "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (49).md"),
);
const EXPECTED_MASTER_SHA256 =
  String(process.env.S278_NATIVE_EXPECTED_MASTER_SHA256
    ?? "08b45e6be8274efb8470f7fe9b47474a6e088589794084811110f8769cded777");
const WEB_ACCEPTANCE = resolve(String(process.env.S278_NATIVE_WEB_ACCEPTANCE ??
  ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/web-acceptance-v5/acceptance.json"));
const BACKEND_RECEIPT = resolve(String(process.env.S278_NATIVE_BACKEND_RECEIPT ??
  ".release-runtime/r568/runtime/whole-app-developer-current/backend.json"));
const METRO_RECEIPT = resolve(String(process.env.S278_NATIVE_METRO_RECEIPT ??
  ".release-runtime/r568/runtime/whole-app-developer-current/metro.json"));
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const PROVIDER_URL = String(process.env.STAGING_SUPABASE_URL ?? "").replace(/\/$/u, "");
const PROVIDER_KEY = String(process.env.STAGING_SUPABASE_READONLY_KEY ?? "");
const ROOT = resolve(String(process.env.S278_NATIVE_OUTPUT_ROOT ??
  ".release-runtime/r568/s27-9/p6/f09-engineering-completion-v1/native-android-v3"));
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S278_INJECT_NATIVE:${code}`);
}

function run(command: string, args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      }),
    };
  } catch (error) {
    const record = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
    };
  }
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function progress(stage: string, details: Json = {}): void {
  const payload = { capturedAt: new Date().toISOString(), stage, ...details };
  writeJson(resolve(ROOT, "progress.json"), payload);
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function adbPath(): string {
  const located = run("where.exe", ["adb"], 10_000);
  const candidate = located.output.split(/\r?\n/u).find(Boolean)?.trim();
  if (located.ok && candidate && existsSync(candidate)) return candidate;
  const fallback = resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
  invariant(existsSync(fallback), "ADB_MISSING");
  return fallback;
}

function auditRows(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function nativeRows(path: string, start = 0): AuditRow[] {
  return auditRows(path).slice(start).filter((row) =>
    String(row.userAgent ?? "").startsWith("okhttp/"))
    .map((row) => ({
      ...row,
      path: row.path?.replace(
        /([?&](?:signature|token|access_token|refresh_token)=)[^&]*/giu,
        "$1[REDACTED]",
      ),
    }));
}

async function authorization(): Promise<string> {
  if (ORDINARY_CREDENTIAL_MODE) {
    const email = String(process.env.E2E_CONSUMER_EMAIL ?? "").trim();
    const password = String(process.env.E2E_CONSUMER_PASSWORD ?? "");
    invariant(email && password && PROVIDER_URL.startsWith("https://") && PROVIDER_KEY.length > 20,
      "GUARDED_STAGING_CREDENTIALS_RED");
    const response = await fetch(`${PROVIDER_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: PROVIDER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => ({})) as Json;
    invariant(response.ok && body.access_token, `LOGIN_HTTP_${response.status}`);
    return `Bearer ${body.access_token}`;
  }
  const credentials = readJson(CREDENTIALS);
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key, "CREDENTIALS_RED");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token, `LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

let ordinaryAccountAuthenticated =
  ORDINARY_CREDENTIAL_MODE && process.env.S279_NATIVE_TRUST_EXISTING_ACCOUNT_SESSION === "1";

async function openNativeRoute(adb: string, route: string): Promise<void> {
  const uri = new URL(`rik:///${route.replace(/^\/+/, "")}`);
  uri.searchParams.set("s279DeveloperOwner", Date.now().toString(36));
  const launched = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri.toString(), PACKAGE_NAME),
    60_000,
  );
  invariant(launched.ok, `ROUTE_LAUNCH_RED:${route}:${launched.output}`);
  await sleep(750);
}

async function ensureOrdinaryAccountLogin(adb: string): Promise<void> {
  let snapshot = dumpUi(adb, DEVICE_ID);
  if (ordinaryAccountAuthenticated
    && !snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-identity-invalid_session"))) return;
  if (snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-identity-invalid_session"))) {
    ordinaryAccountAuthenticated = false;
    invariant(await tapById(adb, DEVICE_ID, "consumer-estimate-identity-login", 8),
      "INVALID_SESSION_LOGIN_RED");
    snapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (candidate) => candidate.nodes.some((node) => nodeHasId(node, "auth.login.screen")),
      60_000,
    );
  }
  if (!snapshot.nodes.some((node) => nodeHasId(node, "auth.login.screen"))) {
    await openNativeRoute(adb, "/profile");
    snapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (candidate) => candidate.nodes.some((node) =>
        nodeHasId(node, "auth.login.screen")
          || nodeHasId(node, "profile.logout.button")
          || nodeHasId(node, "protected-identity-sign-out")
          || nodeHasId(node, "app-bottom-nav")),
      90_000,
    );
    if (snapshot.nodes.some((node) => nodeHasId(node, "protected-identity-sign-out"))) {
      invariant(await tapById(adb, DEVICE_ID, "protected-identity-sign-out", 8),
        "PROTECTED_SIGN_OUT_RED");
    } else {
      const logout = await seekNode(
        adb,
        DEVICE_ID,
        (node) => nodeHasId(node, "profile.logout.button") && node.enabled,
        55,
        "fine",
      );
      invariant(logout.node && tapNode(adb, DEVICE_ID, logout.node), "PROFILE_SIGN_OUT_RED");
      const confirmation = await waitForSnapshot(
        adb,
        DEVICE_ID,
        (candidate) => candidate.nodes.some((node) =>
          node.enabled && node.clickable && nodeHasId(node, "android:id/button1")),
        15_000,
      );
      const confirm = confirmation.nodes.find((node) =>
        node.enabled && node.clickable && nodeHasId(node, "android:id/button1"));
      invariant(confirm && tapNode(adb, DEVICE_ID, confirm), "SIGN_OUT_CONFIRM_RED");
    }
    snapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (candidate) => candidate.nodes.some((node) => nodeHasId(node, "auth.login.screen")),
      60_000,
    );
  }
  invariant(snapshot.nodes.some((node) => nodeHasId(node, "auth.login.screen")),
    "LOGIN_SCREEN_RED");
  const email = String(process.env.E2E_CONSUMER_EMAIL ?? "").trim();
  const password = String(process.env.E2E_CONSUMER_PASSWORD ?? "");
  invariant(email && password, "ORDINARY_LOGIN_CREDENTIALS_RED");
  await replaceGenericField(adb, "auth.login.email", email);
  await replaceGenericField(adb, "auth.login.password", password);
  invariant(await tapById(adb, DEVICE_ID, "auth.login.submit", 8), "LOGIN_SUBMIT_RED");
  const signedIn = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (candidate) => candidate.nodes.some((node) =>
      nodeHasId(node, "app-bottom-nav") || nodeHasId(node, "consumer-repair-screen")),
    120_000,
  );
  invariant(signedIn.nodes.some((node) =>
    nodeHasId(node, "app-bottom-nav") || nodeHasId(node, "consumer-repair-screen")),
  "ORDINARY_LOGIN_RED");
  ordinaryAccountAuthenticated = true;
}

async function api(authorizationHeader: string, route: string): Promise<Json> {
  const request = async (header: string) => {
    const response = await fetch(`${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
      headers: { Authorization: header },
      signal: AbortSignal.timeout(120_000),
    });
    return {
      response,
      body: await response.json().catch(() => ({})) as Json,
    };
  };
  let result = await request(authorizationHeader);
  if (result.response.status === 401) result = await request(await authorization());
  const { response, body } = result;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(body)}`);
  return body;
}

async function revisionRows(authorizationHeader: string, revisionId: string): Promise<Json[]> {
  const body = await api(authorizationHeader, `revisions/${revisionId}/rows?limit=100`);
  return Array.isArray(body.rows) ? body.rows : [];
}

function quantity(rows: Json[], rowId: string): number {
  const row = rows.find((entry) => entry.rowId === rowId);
  invariant(row, `ROW_MISSING:${rowId}`);
  return Number(row.quantity);
}

async function bootstrap(adb: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, Number(new URL(BACKEND).port), DEV_PORT],
  });
  const launch = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, buildDevClientUri(DEV_PORT), PACKAGE_NAME),
    60_000,
  );
  invariant(launch.ok, `DEV_CLIENT_LAUNCH_RED:${launch.output}`);
  const deadline = Date.now() + 240_000;
  let snapshot = dumpUi(adb, DEVICE_ID);
  let credentialLoginAttempted = false;
  while (Date.now() < deadline) {
    snapshot = dumpUi(adb, DEVICE_ID);
    invariant(!snapshot.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "CONFIG_RECOVERY_RED");
    if (snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))
      && (ORDINARY_CREDENTIAL_MODE
        || snapshot.text.includes("local-consumer-")
        || snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-screen")))) {
      if (ORDINARY_CREDENTIAL_MODE) await ensureOrdinaryAccountLogin(adb);
      return;
    }
    if (!credentialLoginAttempted
      && snapshot.nodes.some((node) => nodeHasId(node, "auth.login.screen"))) {
      const credentials = ORDINARY_CREDENTIAL_MODE
        ? { email: process.env.E2E_CONSUMER_EMAIL, password: process.env.E2E_CONSUMER_PASSWORD }
        : (readJson(CREDENTIALS).principals as Json[]).find((entry) => entry.role === "consumer");
      invariant(credentials?.email && credentials?.password, "CONSUMER_LOGIN_CREDENTIALS_RED");
      await replaceGenericField(adb, "auth.login.email", String(credentials.email));
      await replaceGenericField(adb, "auth.login.password", String(credentials.password));
      invariant(await tapById(adb, DEVICE_ID, "auth.login.submit", 8), "LOGIN_SUBMIT_RED");
      credentialLoginAttempted = true;
      if (ORDINARY_CREDENTIAL_MODE) ordinaryAccountAuthenticated = true;
    }
    const localConsumer = snapshot.nodes.find((node) =>
      (nodeHasId(node, "auth.login.local-consumer")
        || nodeHasId(node, "protected-identity-local-consumer-login")) && node.enabled);
    if (!ORDINARY_CREDENTIAL_MODE && localConsumer) tapNode(adb, DEVICE_ID, localConsumer);
    const resume = snapshot.nodes.find((node) =>
      node.enabled && /^(?:Continue|Reload)$/iu.test(node.text.trim()));
    if (resume) tapNode(adb, DEVICE_ID, resume);
    await sleep(750);
  }
  throw new Error(`S278_INJECT_NATIVE:BOOTSTRAP_RED:${snapshot.text.slice(0, 700)}`);
}

async function openRevision(adb: string, revisionId: string, auditPath: string): Promise<void> {
  const auditStart = auditRows(auditPath).length;
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", revisionId);
  uri.searchParams.set("launchId", `s278-inject-native-${Date.now().toString(36)}`);
  const launched = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri.toString(), PACKAGE_NAME),
    60_000,
  );
  invariant(launched.ok, `REVISION_LAUNCH_RED:${launched.output}`);
  const preview = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled),
    120_000,
  );
  const open = preview.nodes.find((node) =>
    nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled);
  if (open) tapNode(adb, DEVICE_ID, open);
  const snapshot = dumpUi(adb, DEVICE_ID);
  const accessibilityMarker = snapshot.nodes.some((node) =>
    node.resourceId.includes(`--revision-${revisionId}--`));
  const deadline = Date.now() + 45_000;
  let nativeExactRead = false;
  while (!accessibilityMarker && Date.now() < deadline) {
    nativeExactRead = nativeRows(auditPath, auditStart).some((row) =>
      row.method === "GET"
        && row.status === 200
        && (row.path === `/revisions/${revisionId}`
          || String(row.path ?? "").startsWith(`/revisions/${revisionId}/`)));
    if (nativeExactRead) break;
    await sleep(350);
  }
  invariant(accessibilityMarker || nativeExactRead,
    `EXACT_REVISION_BINDING_RED:${revisionId}`);
}

async function openParameters(adb: string): Promise<void> {
  let snapshot = dumpUi(adb, DEVICE_ID);
  if (snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-parameter-panel"))) return;
  const toggle = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "request-estimate-parameters-toggle") && node.enabled,
    45,
    "coarse",
  );
  invariant(toggle.node, "PARAMETER_TOGGLE_RED");
  const toggleLabel = `${toggle.node.text} ${toggle.node.contentDesc}`;
  const panelIsAlreadyOpen = /(?:Скрыть параметры|Hide parameters)/iu.test(toggleLabel);
  if (panelIsAlreadyOpen) return;
  invariant(tapNode(adb, DEVICE_ID, toggle.node), "PARAMETER_TOGGLE_TAP_RED");
  snapshot = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (candidate) => candidate.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameter-panel")
        || (nodeHasId(node, "request-estimate-parameters-toggle")
          && /(?:Скрыть параметры|Hide parameters)/iu.test(`${node.text} ${node.contentDesc}`))),
    30_000,
  );
  invariant(snapshot.nodes.some((node) =>
    nodeHasId(node, "request-estimate-parameter-panel")
      || (nodeHasId(node, "request-estimate-parameters-toggle")
        && /(?:Скрыть параметры|Hide parameters)/iu.test(`${node.text} ${node.contentDesc}`))),
    "PARAMETER_PANEL_RED");
}

async function ensureNativePositionsVisible(adb: string): Promise<UiNode> {
  const visibleNode = (snapshot: UiSnapshot, id: string): UiNode | null =>
    snapshot.nodes.find((node) => {
      if (!nodeHasId(node, id)) return false;
      const nodeBounds = bounds(node);
      return Boolean(nodeBounds && nodeBounds.bottom > 140 && nodeBounds.top < 2_150);
    }) ?? null;
  const findByFixedSwipes = async (
    id: string,
    direction: "top" | "bottom",
    maxSwipes = 22,
  ): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> => {
    let candidate = dumpUi(adb, DEVICE_ID);
    for (let attempt = 0; attempt <= maxSwipes; attempt += 1) {
      const node = visibleNode(candidate, id);
      if (node) return { snapshot: candidate, node };
      run(adb, [
        "-s", DEVICE_ID, "shell", "input", "swipe", "540",
        direction === "top" ? "650" : "1900",
        "540",
        direction === "top" ? "1900" : "650",
        "260",
      ], 10_000);
      await sleep(350);
      candidate = dumpUi(adb, DEVICE_ID);
    }
    return { snapshot: candidate, node: null };
  };

  let snapshot = dumpUi(adb, DEVICE_ID);
  if (snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-parameter-panel"))) {
    const parameterToggle = await findByFixedSwipes("request-estimate-parameters-toggle", "top");
    invariant(parameterToggle.node && tapNode(adb, DEVICE_ID, parameterToggle.node),
      "PARAMETER_PANEL_CLOSE_RED");
    await sleep(650);
  }
  const visibleCount = await findByFixedSwipes("request-estimate-items-total-count", "bottom", 10);
  if (visibleCount.node && /41/u.test(visibleCount.node.text)) return visibleCount.node;
  const positionsToggle = await findByFixedSwipes("request-estimate-positions-toggle", "bottom");
  invariant(positionsToggle.node && tapNode(adb, DEVICE_ID, positionsToggle.node),
    "POSITIONS_TOGGLE_RED");
  snapshot = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (candidate) => candidate.nodes.some((node) =>
      nodeHasId(node, "request-estimate-items-total-count") && /41/u.test(node.text)),
    60_000,
  );
  const count = snapshot.nodes.find((node) =>
    nodeHasId(node, "request-estimate-items-total-count") && /41/u.test(node.text)) ?? null;
  invariant(count, "POSITIONS_COUNT_RED");
  return count;
}

function nodeWithin(parent: UiNode, child: UiNode): boolean {
  const outer = bounds(parent);
  const inner = bounds(child);
  return Boolean(outer && inner
    && inner.left >= outer.left - 8
    && inner.right <= outer.right + 8
    && inner.top >= outer.top - 8
    && inner.bottom <= outer.bottom + 8);
}

async function parameterNodes(adb: string, parameterId: string): Promise<{
  snapshot: UiSnapshot;
  card: UiNode;
  input: UiNode;
  guide: UiNode | null;
}> {
  await openParameters(adb);
  let found = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, `editable-param-chip-${parameterId}`),
    64,
    "fine",
  );
  if (!found.node) {
    const filledToggle = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "request-estimate-filled-parameters-toggle") && node.enabled,
      40,
      "fine",
    );
    if (filledToggle.node) tapNode(adb, DEVICE_ID, filledToggle.node);
    found = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, `editable-param-chip-${parameterId}`),
      64,
      "fine",
    );
  }
  if (!found.node) {
    for (const [startY, endY] of [[1700, 500], [500, 1700]] as const) {
      for (let attempt = 0; attempt < 6 && !found.node; attempt += 1) {
        run(adb, [
          "-s", DEVICE_ID, "shell", "input", "swipe", "540",
          String(startY), "540", String(endY), "500",
        ], 10_000);
        await sleep(650);
        const snapshot = dumpUi(adb, DEVICE_ID);
        const node = snapshot.nodes.find((candidate) =>
          nodeHasId(candidate, `editable-param-chip-${parameterId}`)) ?? null;
        found = { snapshot, node };
      }
      if (found.node) break;
    }
  }
  invariant(found.node, `PARAMETER_CARD_RED:${parameterId}`);
  const locateInput = (snapshot: UiSnapshot, card: UiNode): UiNode | undefined => {
    const editor = snapshot.nodes.find((node) =>
      nodeHasId(node, `editable-param-inline-editor-${parameterId}`));
    return snapshot.nodes.find((node) =>
      nodeHasId(node, "editable-param-popover-input")
        && (editor ? nodeWithin(editor, node) : nodeWithin(card, node)));
  };
  let card = found.node;
  let snapshot = found.snapshot;
  let input = locateInput(snapshot, card);
  if (!input) {
    for (let attempt = 0; attempt < 3 && !input; attempt += 1) {
      run(adb, [
        "-s", DEVICE_ID, "shell", "input", "swipe",
        "540", "1450", "540", "900", "300",
      ], 10_000);
      await sleep(650);
      snapshot = dumpUi(adb, DEVICE_ID);
      card = snapshot.nodes.find((node) =>
        nodeHasId(node, `editable-param-chip-${parameterId}`)) ?? card;
      input = locateInput(snapshot, card);
    }
  }
  if (!input) {
    snapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (candidate) => {
        const candidateCard = candidate.nodes.find((node) =>
          nodeHasId(node, `editable-param-chip-${parameterId}`));
        return Boolean(candidateCard && locateInput(candidate, candidateCard));
      },
      15_000,
    );
    card = snapshot.nodes.find((node) =>
      nodeHasId(node, `editable-param-chip-${parameterId}`)) ?? card;
    input = locateInput(snapshot, card);
  }
  let guide = snapshot.nodes.find((node) =>
    nodeHasId(node, `editable-param-inline-guide-${parameterId}`) && nodeWithin(card, node)) ?? null;
  if (!guide) {
    for (let attempt = 0; attempt < 3 && !guide; attempt += 1) {
      run(adb, [
        "-s", DEVICE_ID, "shell", "input", "swipe",
        "540", "1450", "540", "900", "300",
      ], 10_000);
      await sleep(650);
      snapshot = dumpUi(adb, DEVICE_ID);
      guide = snapshot.nodes.find((node) =>
        nodeHasId(node, `editable-param-inline-guide-${parameterId}`)) ?? null;
    }
  }
  if (!guide) {
    const guideFound = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, `editable-param-inline-guide-${parameterId}`),
      8,
      "fine",
    );
    guide = guideFound.node;
  }
  invariant(input, `PARAMETER_INPUT_RED:${parameterId}`);
  return { snapshot, card, input, guide };
}

async function replaceNodeValue(adb: string, node: UiNode, value: string): Promise<void> {
  let current = node;
  let focused = false;
  for (let attempt = 0; attempt < 3 && !focused; attempt += 1) {
    invariant(tapNode(adb, DEVICE_ID, current), `FIELD_TAP_RED:${current.resourceId}`);
    await sleep(800);
    const inputMethod = run(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "input_method"], 15_000);
    focused = /mInputShown=true/iu.test(inputMethod.output)
      && /mServedView=.*ReactEditText/iu.test(inputMethod.output);
    if (!focused) {
      const snapshot = dumpUi(adb, DEVICE_ID);
      current = snapshot.nodes.find((candidate) =>
        nodeHasId(candidate, "editable-param-popover-input")
          && candidate.contentDesc === node.contentDesc)
        ?? snapshot.nodes.find((candidate) =>
          Boolean(node.resourceId) && candidate.resourceId === node.resourceId)
        ?? current;
    }
  }
  invariant(focused, `FIELD_FOCUS_RED:${node.resourceId}:${node.contentDesc}`);
  invariant(run(adb, ["-s", DEVICE_ID, "shell", "input", "keycombination", "113", "29"], 10_000).ok,
    "FIELD_SELECT_ALL_RED");
  run(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
  if (value.length > 0) {
    invariant(run(adb, ["-s", DEVICE_ID, "shell", "input", "text", value.replace(/ /gu, "%s")], 20_000).ok,
      `FIELD_TYPE_RED:${value}`);
  }
  const inputMethod = run(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "input_method"], 15_000);
  if (/mInputShown=true/iu.test(inputMethod.output)) {
    run(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  }
  await sleep(650);
}

async function replaceParameter(adb: string, parameterId: string, value: string): Promise<void> {
  const before = await parameterNodes(adb, parameterId);
  await replaceNodeValue(adb, before.input, value);
  const after = await parameterNodes(adb, parameterId);
  invariant(Number(after.input.text) === Number(value),
    `PARAMETER_VALUE_RED:${parameterId}:${after.input.text}`);
}

async function replaceGenericField(adb: string, id: string, value: string): Promise<void> {
  const found = await seekNode(adb, DEVICE_ID, (node) => {
    const nodeBounds = bounds(node);
    return nodeHasId(node, id)
      && Boolean(nodeBounds && nodeBounds.bottom > 140 && nodeBounds.top < 2_140);
  }, 60, "fine");
  invariant(found.node, `GENERIC_FIELD_RED:${id}`);
  await replaceNodeValue(adb, found.node, value);
}

const EMPTY_GENERIC_FIELD_HINTS: Readonly<Record<string, string>> = Object.freeze({
  "consumer-repair-address-input": "\u0410\u0434\u0440\u0435\u0441",
  "consumer-repair-phone-input": "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
});

function genericFieldIsEmpty(node: UiNode, id: string): boolean {
  const text = node.text.trim();
  return nodeHasId(node, id) && (text === "" || text === EMPTY_GENERIC_FIELD_HINTS[id]);
}

async function clearGenericField(adb: string, id: string): Promise<void> {
  const found = await seekNode(adb, DEVICE_ID, (node) => {
    const nodeBounds = bounds(node);
    return nodeHasId(node, id)
      && Boolean(nodeBounds && nodeBounds.bottom > 140 && nodeBounds.top < 2_140);
  }, 60, "fine");
  invariant(found.node, `GENERIC_FIELD_RED:${id}`);
  await replaceNodeValue(adb, found.node, "");
  const cleared = await seekNode(
    adb,
    DEVICE_ID,
    (node) => genericFieldIsEmpty(node, id),
    20,
    "fine",
  );
  invariant(cleared.node, `GENERIC_FIELD_NOT_EMPTY:${id}`);
}

async function waitForRecalculatedRevision(input: {
  auditPath: string;
  start: number;
  previousRevisionId: string;
}): Promise<{ revisionId: string; audit: AuditRow[] }> {
  const deadline = Date.now() + 180_000;
  let observed: AuditRow[] = [];
  while (Date.now() < deadline) {
    observed = nativeRows(input.auditPath, input.start);
    const mutation = observed.findIndex((row) =>
      row.method === "POST" && row.path === "/jobs/recalculate" && row.status === 202);
    if (mutation >= 0) {
      const revisionId = observed.slice(mutation + 1)
        .filter((row) => row.method === "GET" && row.status === 200)
        .map((row) => String(row.path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null)
        .find((value): value is string => Boolean(value && value !== input.previousRevisionId));
      if (revisionId) return { revisionId, audit: observed };
    }
    await sleep(350);
  }
  throw new Error("S278_INJECT_NATIVE:RECALCULATED_REVISION_NOT_OBSERVED");
}

function captureEvidence(adb: string, name: string): Json {
  const evidence = capture(adb, DEVICE_ID, DEVICE_ROOT, name);
  return {
    ...evidence,
    screenshotSha256: evidence.screenshot ? sha256File(resolve(evidence.screenshot)) : null,
    uiDumpSha256: evidence.uiDump ? sha256File(resolve(evidence.uiDump)) : null,
  };
}

function existingEvidence(name: string): Json | null {
  const screenshotPath = resolve(DEVICE_ROOT, `${name}.png`);
  const uiDumpPath = resolve(DEVICE_ROOT, `${name}.xml`);
  if (!existsSync(screenshotPath) || !existsSync(uiDumpPath)) return null;
  return {
    screenshot: relative(process.cwd(), screenshotPath).replace(/\\/gu, "/"),
    uiDump: relative(process.cwd(), uiDumpPath).replace(/\\/gu, "/"),
    screenshotSha256: sha256File(screenshotPath),
    uiDumpSha256: sha256File(uiDumpPath),
  };
}

function mainActivityResumed(adb: string): boolean {
  const activity = run(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "activity", "activities"], 20_000);
  return activity.ok && activity.output.split(/\r?\n/u).some((line) =>
    /topResumedActivity|mResumedActivity/u.test(line) && line.includes(MAIN_ACTIVITY));
}

async function waitForPdf(adb: string): Promise<"in_app" | "external"> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adb, DEVICE_ID);
    if (snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))) return "in_app";
    if (!mainActivityResumed(adb)) return "external";
    await sleep(650);
  }
  throw new Error("S278_INJECT_NATIVE:PDF_VIEWER_RED");
}

function clearedProblemInput(node: UiNode): boolean {
  return nodeHasId(node, "consumer-repair-problem-input")
    && (node.text === "" || /Введите тип или вид работ/iu.test(node.text));
}

function uiNumber(value: string): number {
  return Number(value.trim().replace(/\s+/gu, "").replace(",", "."));
}

async function visibleEditableRowPairs(adb: string): Promise<{
  suffix: string;
  quantity: UiNode;
  price: UiNode;
}[]> {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const snapshot = dumpUi(adb, DEVICE_ID);
    const pairs = snapshot.nodes
      .filter((node) => {
        const nodeBounds = bounds(node);
        return node.resourceId.startsWith("consumer-repair-item-quantity-input-")
          && Boolean(nodeBounds && nodeBounds.bottom > 300 && nodeBounds.top < 2_100);
      })
      .map((quantityNode) => {
        const suffix = quantityNode.resourceId.replace(
          "consumer-repair-item-quantity-input-",
          "",
        );
        const price = snapshot.nodes.find((node) => {
          const nodeBounds = bounds(node);
          return nodeHasId(node, `consumer-repair-item-unit-price-input-${suffix}`)
            && Boolean(nodeBounds && nodeBounds.bottom > 300 && nodeBounds.top < 2_100);
        }) ?? null;
        return price ? { suffix, quantity: quantityNode, price } : null;
      })
      .filter((entry): entry is { suffix: string; quantity: UiNode; price: UiNode } => Boolean(entry));
    if (pairs.length >= 2) return pairs.slice(0, 2);
    run(adb, [
      "-s", DEVICE_ID, "shell", "input", "swipe", "540", "1900", "540", "650", "300",
    ], 10_000);
    await sleep(450);
  }
  return [];
}

async function runNativeRowBatchContinuation(input: {
  adb: string;
  auditPath: string;
  authorizationHeader: string;
  baseRevisionId: string;
  baseRows: Json[];
  tuple: Json;
  fingerprints: ReturnType<typeof computeReleaseFingerprints>;
  currentProductSourceMatchesRuntime: boolean;
  currentJsSourceMatchesRuntime: boolean;
  evidence: Json[];
}): Promise<void> {
  const {
    adb,
    auditPath,
    authorizationHeader,
    baseRevisionId,
    baseRows,
    tuple,
    fingerprints,
    currentProductSourceMatchesRuntime,
    currentJsSourceMatchesRuntime,
    evidence,
  } = input;
  const resumeRevisionId = String(process.env.S279_NATIVE_ROW_BATCH_RESUME_REVISION_ID ?? "").trim();
  let stagedRows: Json[] = [];
  let typingAuditStart = auditRows(auditPath).length;
  let applyAuditStart = typingAuditStart;
  let mutation: { revisionId: string; audit: AuditRow[] };
  let rowRevision: Json;
  let rowRows: Json[];
  let changedRows: Json[];
  if (!resumeRevisionId) {
    progress("ROW_BATCH_BOOTSTRAP", { baseRevisionId });
    await bootstrap(adb);
    await openRevision(adb, baseRevisionId, auditPath);
    await ensureNativePositionsVisible(adb);
    const pairs = await visibleEditableRowPairs(adb);
    invariant(pairs.length === 2, "ROW_BATCH_VISIBLE_PAIRS_RED");
    typingAuditStart = auditRows(auditPath).length;
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      const originalQuantity = uiNumber(pair.quantity.text);
      invariant(Number.isFinite(originalQuantity) && originalQuantity > 0,
        `ROW_BATCH_ORIGINAL_QUANTITY_RED:${pair.suffix}`);
      const nextQuantity = Number((originalQuantity + index + 1).toFixed(6));
      const nextPrice = 111.25 * (index + 1);
      await replaceGenericField(
        adb,
        `consumer-repair-item-quantity-input-${pair.suffix}`,
        String(nextQuantity),
      );
      await replaceGenericField(
        adb,
        `consumer-repair-item-unit-price-input-${pair.suffix}`,
        String(nextPrice),
      );
      stagedRows.push({ suffix: pair.suffix, originalQuantity, nextQuantity, nextPrice });
    }
    const postsDuringTyping = nativeRows(auditPath, typingAuditStart)
      .filter((row) => row.method === "POST" && row.path === "/jobs/recalculate");
    invariant(postsDuringTyping.length === 0,
      `ROW_BATCH_RECALCULATED_DURING_TYPING:${postsDuringTyping.length}`);
    const batchBar = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "request-estimate-row-batch-bar"),
      30,
      "fine",
    );
    invariant(batchBar.node, "ROW_BATCH_BAR_RED");
    evidence.push(captureEvidence(adb, "08-native-two-row-quantity-price-staged"));
    applyAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "request-estimate-row-batch-apply", 20),
      "ROW_BATCH_APPLY_TAP_RED");
    mutation = await waitForRecalculatedRevision({
      auditPath,
      start: applyAuditStart,
      previousRevisionId: baseRevisionId,
    });
    rowRevision = await api(authorizationHeader, `revisions/${mutation.revisionId}`);
    rowRows = await revisionRows(authorizationHeader, mutation.revisionId);
  } else {
    invariant(/^[0-9a-f-]{36}$/iu.test(resumeRevisionId), "ROW_BATCH_RESUME_REVISION_ID_RED");
    const existingAudit = auditRows(auditPath);
    const childReadIndex = existingAudit.findIndex((row) =>
      row.method === "GET" && row.path === `/revisions/${resumeRevisionId}/rows?limit=200`);
    invariant(childReadIndex >= 0, "ROW_BATCH_RESUME_CHILD_AUDIT_RED");
    applyAuditStart = -1;
    for (let index = 0; index < childReadIndex; index += 1) {
      const row = existingAudit[index];
      if (row.method === "POST" && row.path === "/jobs/recalculate" && row.status === 202
        && String(row.userAgent ?? "").startsWith("okhttp/")) applyAuditStart = index;
    }
    invariant(applyAuditStart >= 0, "ROW_BATCH_RESUME_APPLY_AUDIT_RED");
    typingAuditStart = applyAuditStart;
    mutation = {
      revisionId: resumeRevisionId,
      audit: nativeRows(auditPath, applyAuditStart).slice(0, childReadIndex - applyAuditStart + 1),
    };
    rowRevision = await api(authorizationHeader, `revisions/${resumeRevisionId}`);
    rowRows = await revisionRows(authorizationHeader, resumeRevisionId);
    progress("ROW_BATCH_READBACK_RESUME", { revisionId: resumeRevisionId });
  }
  invariant(rowRevision.parentRevisionId === baseRevisionId && rowRows.length === 41,
    "ROW_BATCH_CHILD_RED");
  const baseById = new Map(baseRows.map((row) => [String(row.rowId), row]));
  changedRows = rowRows.filter((row) => {
    const before = baseById.get(String(row.rowId));
    return before && (
      Number(before.quantity) !== Number(row.quantity)
      || Number(before.unitPrice) !== Number(row.unitPrice)
      || (before.unitPrice == null) !== (row.unitPrice == null)
    );
  });
  invariant(changedRows.length === 2, `ROW_BATCH_CHANGED_ROWS_RED:${changedRows.length}`);
  if (resumeRevisionId) {
    stagedRows = changedRows.map((row) => ({
      rowId: row.rowId,
      originalQuantity: Number(baseById.get(String(row.rowId))?.quantity),
      nextQuantity: Number(row.quantity),
      nextPrice: Number(row.unitPrice),
      source: "POST_APPLY_READBACK",
    }));
  }
  const expectedQuantities = stagedRows.map((row) => Number(row.nextQuantity)).sort((a, b) => a - b);
  const persistedQuantities = changedRows.map((row) => Number(row.quantity)).sort((a, b) => a - b);
  const persistedPrices = changedRows.map((row) => Number(row.unitPrice)).sort((a, b) => a - b);
  invariant(
    persistedQuantities.every((value, index) => value === expectedQuantities[index])
      && persistedPrices.every((value) => Number.isFinite(value) && value > 0)
      && new Set(persistedPrices).size === 2,
    "ROW_BATCH_PERSISTED_VALUES_RED",
  );
  const applyPosts = nativeRows(auditPath, applyAuditStart)
    .filter((row) => row.method === "POST" && row.path === "/jobs/recalculate");
  invariant(applyPosts.length === 1, `ROW_BATCH_ONE_APPLY_RED:${applyPosts.length}`);
  progress("ROW_BATCH_ONE_APPLY_ONE_CHILD_GREEN", {
    revisionId: mutation.revisionId,
    changedRowIds: changedRows.map((row) => row.rowId),
  });

  const resumeAfterPdf = process.env.S279_NATIVE_ROW_BATCH_RESUME_AFTER_PDF === "1";
  let pdfViewer: "in_app" | "external" = "external";
  if (resumeAfterPdf) {
    const priorColdReopen = existingEvidence("09-native-row-batch-cold-reopen");
    const priorPdf = existingEvidence("10-native-row-batch-pdf");
    invariant(priorColdReopen && priorPdf, "ROW_BATCH_RESUME_EVIDENCE_RED");
    invariant(nativeRows(auditPath, applyAuditStart).some((row) =>
      row.path === `/revisions/${mutation.revisionId}/artifacts/pdf`),
    "ROW_BATCH_RESUME_PDF_AUDIT_RED");
    evidence.push(priorColdReopen, priorPdf);
    progress("ROW_BATCH_RESUME_AFTER_PDF", { revisionId: mutation.revisionId });
    await bootstrap(adb);
    await openRevision(adb, mutation.revisionId, auditPath);
  } else {
    invariant(run(adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000).ok,
      "ROW_BATCH_FORCE_STOP_RED");
    await bootstrap(adb);
    await openRevision(adb, mutation.revisionId, auditPath);
    await ensureNativePositionsVisible(adb);
    const expectedPrices = new Set(stagedRows.map((row) => Number(row.nextPrice)));
    const observedPrices = new Set<number>();
    const highestExpectedPrice = Math.max(...expectedPrices);
    const highestPrice = await seekNode(
      adb,
      DEVICE_ID,
      (node) => node.resourceId.startsWith("consumer-repair-item-unit-price-input-")
        && uiNumber(node.text) === highestExpectedPrice,
      45,
      "fine",
    );
    invariant(highestPrice.node, `ROW_BATCH_REOPEN_PRICE_RED:${highestExpectedPrice}`);
    observedPrices.add(highestExpectedPrice);
    evidence.push(captureEvidence(adb, "09-native-row-batch-cold-reopen-highest-price"));
    for (let attempt = 0; attempt < 12; attempt += 1) {
      run(adb, ["-s", DEVICE_ID, "shell", "input", "swipe", "540", "650", "540", "1900", "260"], 10_000);
      await sleep(250);
    }
    for (let attempt = 0; attempt < 55 && observedPrices.size < expectedPrices.size; attempt += 1) {
      const snapshot = dumpUi(adb, DEVICE_ID);
      for (const node of snapshot.nodes.filter((candidate) =>
        candidate.resourceId.startsWith("consumer-repair-item-unit-price-input-"))) {
        const value = uiNumber(node.text);
        if (expectedPrices.has(value)) observedPrices.add(value);
      }
      if (observedPrices.size === expectedPrices.size) break;
      run(adb, ["-s", DEVICE_ID, "shell", "input", "swipe", "540", "1900", "540", "650", "260"], 10_000);
      await sleep(300);
    }
    invariant(observedPrices.size === expectedPrices.size,
      `ROW_BATCH_REOPEN_PRICE_RED:${[...expectedPrices].filter((value) => !observedPrices.has(value)).join(",")}`);
    evidence.push(captureEvidence(adb, "09-native-row-batch-cold-reopen"));
    progress("ROW_BATCH_COLD_REOPEN_GREEN", { revisionId: mutation.revisionId });

    const pdfAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "consumer-estimate-make-pdf", 60),
      "ROW_BATCH_PDF_TAP_RED");
    pdfViewer = await waitForPdf(adb);
    evidence.push(captureEvidence(adb, "10-native-row-batch-pdf"));
    const pdfDeadline = Date.now() + 120_000;
    while (Date.now() < pdfDeadline && !nativeRows(auditPath, pdfAuditStart).some((row) =>
      row.path === `/revisions/${mutation.revisionId}/artifacts/pdf`)) await sleep(500);
    invariant(nativeRows(auditPath, pdfAuditStart).some((row) =>
      row.path === `/revisions/${mutation.revisionId}/artifacts/pdf`),
    "ROW_BATCH_PDF_AUDIT_RED");
    if (pdfViewer === "in_app") {
      invariant(await tapById(adb, DEVICE_ID, "pdf-viewer-back", 4), "ROW_BATCH_PDF_BACK_RED");
    } else {
      run(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
    }
    await sleep(1_000);
    if (!mainActivityResumed(adb)
      || !dumpUi(adb, DEVICE_ID).nodes.some((node) => nodeHasId(node, "consumer-repair-screen"))) {
      await bootstrap(adb);
      await openRevision(adb, mutation.revisionId, auditPath);
    }
  }
  if (resumeAfterPdf) {
    for (const id of ["consumer-repair-address-input", "consumer-repair-phone-input"]) {
      const empty = await seekNode(
        adb,
        DEVICE_ID,
        (node) => genericFieldIsEmpty(node, id),
        60,
        "fine",
      );
      invariant(empty.node, `ROW_BATCH_EMPTY_FIELD_RED:${id}`);
    }
  } else {
    await replaceGenericField(adb, "consumer-repair-city-input", "Bishkek");
    await replaceGenericField(adb, "consumer-repair-time-input", "Tomorrow");
    await clearGenericField(adb, "consumer-repair-address-input");
    await clearGenericField(adb, "consumer-repair-phone-input");
  }
  const approve = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled,
    60,
    "coarse",
  );
  invariant(approve.node && tapNode(adb, DEVICE_ID, approve.node), "ROW_BATCH_APPROVE_RED");
  const approvedWorkspace = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some(clearedProblemInput),
    240_000,
  );
  invariant(approvedWorkspace.nodes.some(clearedProblemInput), "ROW_BATCH_APPROVED_WORKSPACE_RED");
  invariant(await tapById(adb, DEVICE_ID, "consumer-repair-history-button", 55),
    "ROW_BATCH_HISTORY_OPEN_RED");
  const history = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, `consumer-repair-history-revision-${mutation.revisionId}`),
    65,
    "fine",
  );
  invariant(history.node, "ROW_BATCH_HISTORY_EXACT_REVISION_RED");
  evidence.push(captureEvidence(adb, "11-native-row-batch-approved-history"));

  const nativeAudit = nativeRows(auditPath, typingAuditStart);
  const auditOutput = resolve(ROOT, "native-row-batch-request-audit.jsonl");
  writeFileSync(auditOutput, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const payload = {
    schemaVersion: `${CONTRACT}.row-batch.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: V15_ORDINARY_CONSUMER
      ? "GREEN_S2712_V15_ORDINARY_CONSUMER_NATIVE_ANDROID_ROW_BATCH_FINAL"
      : "GREEN_S279_DEVELOPER_OWNER_NATIVE_ANDROID_ROW_BATCH_FINAL",
    actor: {
      v15NonErpConfirmed: V15_NON_ERP_CONFIRMED,
      ordinaryNonErpConsumerAccount: V15_ORDINARY_CONSUMER,
      developerOwnerAccount: !V15_ORDINARY_CONSUMER,
      guardedEnvFilesLoaded: LIVE_ENV.loadedFiles,
      credentialsPrinted: false,
      tokensPrinted: false,
    },
    runtime: {
      deviceId: DEVICE_ID,
      apiLevel: 34,
      package: PACKAGE_NAME,
      compatibilityTuple: tuple,
      currentProductSourceMatchesRuntime,
      currentJsSourceMatchesRuntime,
      dynamicDevMetroSourceDrift: !currentJsSourceMatchesRuntime,
    },
    journey: {
      baseRevisionId,
      rowEditedRevisionId: mutation.revisionId,
      parentRevisionId: rowRevision.parentRevisionId,
      rowCount: rowRows.length,
      stagedRows,
      changedRows: changedRows.map((row) => ({
        rowId: row.rowId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
      })),
      recalculationsDuringTyping: 0,
      applyRecalculationCount: 1,
      coldReopenValuesRestored: true,
      pdfViewer,
      approvalWithoutAddressAndPhone: true,
      historyBindsExactRevision: true,
    },
    source: {
      head: run("git", ["rev-parse", "HEAD"]).output.trim(),
      sourceTreeHash: fingerprints.sourceTreeHash,
      jsBundleFingerprint: fingerprints.jsBundleFingerprint,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/gu, "/"),
      subsetPath: auditOutput.replace(/\\/gu, "/"),
      subsetSha256: sha256File(auditOutput),
      rows: nativeAudit.length,
    },
    evidence,
    destructiveActions: { appDataCleared: false, avdWiped: false, reinstallPerformed: false },
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
  };
  const rowOutput = resolve(ROOT, "row-batch-acceptance.json");
  writeJson(rowOutput, payload);
  progress("ROW_BATCH_ACCEPTANCE_GREEN", {
    output: rowOutput.replace(/\\/gu, "/"),
    revisionId: mutation.revisionId,
  });
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  invariant(existsSync(MASTER) && sha256File(MASTER) === EXPECTED_MASTER_SHA256, "MASTER_RED");
  invariant(existsSync(WEB_ACCEPTANCE), "WEB_ACCEPTANCE_RED");
  const web = readJson(WEB_ACCEPTANCE);
  invariant([
    "GREEN_S278_F09_SUBSTRATE_CRACK_SEALING_BEFORE_FIREPROOF_RESTORATION_WEB",
    "GREEN_S279_F09_CURRENT_AFFECTED_ACTIONS_WEB",
    "GREEN_S279_DEVELOPER_OWNER_WEB_USER_CYCLE",
    "GREEN_S279_V15_ORDINARY_CONSUMER_WEB",
  ].includes(String(web.status)), "WEB_STATUS_RED");
  const sourceRevisionId = String(web.initial?.revisionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(sourceRevisionId), "SOURCE_REVISION_RED");

  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  const fingerprints = computeReleaseFingerprints();
  invariant(tuple.definitionReleaseId === RELEASE_ID && tuple.searchReleaseId === SEARCH_RELEASE_ID,
    "BACKEND_TUPLE_RED");
  invariant(metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
  "METRO_TUPLE_RED");
  invariant(tuple.sourceTree === metroReceipt.source_tree_hash
    && tuple.frontendProductSourceHash === metroReceipt.product_source_hash
    && tuple.frontendJsBundleFingerprint === metroReceipt.js_bundle_fingerprint,
  "RUNTIME_RECEIPT_SOURCE_DRIFT");
  const currentJsSourceMatchesRuntime =
    tuple.frontendJsBundleFingerprint === fingerprints.jsBundleFingerprint;
  invariant(currentJsSourceMatchesRuntime || ORDINARY_CREDENTIAL_MODE,
    "EXECUTABLE_JS_SOURCE_DRIFT");
  const currentProductSourceMatchesRuntime =
    tuple.sourceTree === fingerprints.sourceTreeHash
    && tuple.frontendProductSourceHash === fingerprints.productSourceHash;
  invariant(currentProductSourceMatchesRuntime || ORDINARY_CREDENTIAL_MODE,
    "BACKEND_SOURCE_DRIFT");
  const auditPath = resolve(String(process.env.S278_NATIVE_AUDIT_PATH ??
    `.release-runtime/r568/runtime/whole-app-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`));
  invariant(existsSync(auditPath), `AUDIT_RED:${auditPath}`);
  const deviceHealthPath = resolve("artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/device_health.json");
  const deviceHealth = readJson(deviceHealthPath);
  invariant(deviceHealth.final_status === "GREEN_ANDROID_API34_DEVICE_READY"
    && deviceHealth.android_sdk === 34
    && deviceHealth.device_id === DEVICE_ID,
  "DEVICE_HEALTH_RED");

  const authorizationHeader = await authorization();
  const manifest = await api(authorizationHeader, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RUNTIME_TUPLE_RED");
  const sourceRevision = await api(authorizationHeader, `revisions/${sourceRevisionId}`);
  const sourceRows = await revisionRows(authorizationHeader, sourceRevisionId);
  invariant(sourceRevision.catalogId === CATALOG_ID
    && sourceRows.length === 41
    && (sourceRevision.preliminaryNeeds ?? []).length === 0,
  "SOURCE_COMPOSITION_RED");

  const adb = adbPath();
  const evidence: Json[] = [];
  const resumeRevisionId = String(process.env.S278_NATIVE_RESUME_REVISION_ID ?? "").trim();
  if (resumeRevisionId) {
    for (const name of [
      "01-native-profile-guide-inside-field",
      "02-native-two-parameters-staged",
      "03-native-one-apply-one-child",
      "04-native-cold-reopen-exact-child",
      "05-native-pdf-viewer",
    ]) {
      const prior = existingEvidence(name);
      if (prior) evidence.push(prior);
    }
  }
  let stageAuditStart: number;
  let mutation: { revisionId: string; audit: AuditRow[] };
  let editedRevision: Json;
  let editedRows: Json[];
  if (resumeRevisionId) {
    invariant(/^[0-9a-f-]{36}$/iu.test(resumeRevisionId), "RESUME_REVISION_ID_RED");
    const allAudit = auditRows(auditPath);
    const childRead = allAudit.findIndex((row) => row.path === `/revisions/${resumeRevisionId}`);
    invariant(childRead >= 0, "RESUME_CHILD_AUDIT_RED");
    stageAuditStart = childRead;
    while (stageAuditStart > 0 && !(
      allAudit[stageAuditStart]?.method === "POST"
      && allAudit[stageAuditStart]?.path === "/jobs/recalculate"
    )) stageAuditStart -= 1;
    invariant(allAudit[stageAuditStart]?.path === "/jobs/recalculate", "RESUME_MUTATION_AUDIT_RED");
    mutation = { revisionId: resumeRevisionId, audit: allAudit.slice(stageAuditStart) };
    editedRevision = await api(authorizationHeader, `revisions/${mutation.revisionId}`);
    editedRows = await revisionRows(authorizationHeader, mutation.revisionId);
    if (!existingEvidence("03-native-one-apply-one-child")) {
      await bootstrap(adb);
      await openRevision(adb, mutation.revisionId, auditPath);
      await openParameters(adb);
      const applied = await waitForSnapshot(
        adb,
        DEVICE_ID,
        (snapshot) => snapshot.nodes.some((node) =>
          nodeHasId(node, "request-estimate-parameter-apply-success")
            || nodeHasId(node, "request-estimate-parameter-apply-status")
            || (node.resourceId.includes(`--revision-${mutation.revisionId}--`)
              && snapshot.nodes.some((candidate) => nodeHasId(candidate, "estimate-revision-diff")))),
        30_000,
      );
      invariant(applied.nodes.some((node) =>
        nodeHasId(node, "request-estimate-parameter-apply-success")
          || nodeHasId(node, "request-estimate-parameter-apply-status")
          || (node.resourceId.includes(`--revision-${mutation.revisionId}--`)
            && applied.nodes.some((candidate) => nodeHasId(candidate, "estimate-revision-diff")))),
      "RESUME_APPLY_SUCCESS_UI_RED");
      evidence.push(captureEvidence(adb, "03-native-one-apply-one-child"));
    }
    progress("RESUME_EXACT_CHILD", { revisionId: mutation.revisionId, stageAuditStart });
  } else {
    progress("BOOTSTRAP", { sourceRevisionId });
    await bootstrap(adb);
    await openRevision(adb, sourceRevisionId, auditPath);
    await openParameters(adb);

    const assumed = await parameterNodes(adb, "material_volume_factor");
    invariant(Number(assumed.input.text) === 1 && /^принято\s+1$/iu.test(assumed.guide?.text ?? ""),
      `ASSUMED_GUIDE_RED:${assumed.input.text}:${assumed.guide?.text ?? ""}`);
    const normative = await parameterNodes(adb, "packer_spacing_thickness_ratio");
    invariant(Number(normative.input.text) === 0.5 && /^норма\s+0[.,]5$/iu.test(normative.guide?.text ?? ""),
      `NORMATIVE_GUIDE_RED:${normative.input.text}:${normative.guide?.text ?? ""}`);
    evidence.push(captureEvidence(adb, "01-native-profile-guide-inside-field"));
    progress("PROFILE_GUIDES_GREEN", {
      assumed: { value: assumed.input.text, guide: assumed.guide?.text },
      normative: { value: normative.input.text, guide: normative.guide?.text },
    });

    stageAuditStart = auditRows(auditPath).length;
    await replaceParameter(adb, "defect_mean_opening_mm", "0.6");
    await replaceParameter(adb, "workfront_count", "3");
    const dirty = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "editable-param-batch-dirty-count") && /2/u.test(node.text),
      55,
      "fine",
    );
    invariant(dirty.node, `TWO_DIRTY_RED:${dirty.snapshot.text.slice(-700)}`);
    const postsDuringTyping = nativeRows(auditPath, stageAuditStart)
      .filter((row) => row.method === "POST" && row.path === "/jobs/recalculate");
    invariant(postsDuringTyping.length === 0, `RECALCULATED_DURING_TYPING:${postsDuringTyping.length}`);
    evidence.push(captureEvidence(adb, "02-native-two-parameters-staged"));

    const applyAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "editable-param-batch-apply", 55), "APPLY_RED");
    mutation = await waitForRecalculatedRevision({
      auditPath,
      start: applyAuditStart,
      previousRevisionId: sourceRevisionId,
    });
    editedRevision = await api(authorizationHeader, `revisions/${mutation.revisionId}`);
    editedRows = await revisionRows(authorizationHeader, mutation.revisionId);
    const applyPosts = nativeRows(auditPath, applyAuditStart)
      .filter((row) => row.method === "POST" && row.path === "/jobs/recalculate");
    invariant(applyPosts.length === 1, `ONE_APPLY_RED:${applyPosts.length}`);
    const success = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (snapshot) => snapshot.nodes.some((node) =>
        nodeHasId(node, "request-estimate-parameter-apply-success")
          || nodeHasId(node, "request-estimate-parameter-apply-status")),
      120_000,
    );
    invariant(success.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameter-apply-success")
        || nodeHasId(node, "request-estimate-parameter-apply-status")),
      "APPLY_SUCCESS_UI_RED");
    evidence.push(captureEvidence(adb, "03-native-one-apply-one-child"));
    progress("ONE_APPLY_ONE_CHILD_GREEN", { revisionId: mutation.revisionId });
  }
  invariant(editedRevision.parentRevisionId === sourceRevisionId
    && Number(editedRevision.parameters?.defect_mean_opening_mm) === 0.6
    && Number(editedRevision.parameters?.workfront_count) === 3,
  "EDITED_REVISION_RED");
  invariant(editedRows.length === 41 && (editedRevision.preliminaryNeeds ?? []).length === 0,
    "EDITED_COMPOSITION_RED");
  invariant(quantity(editedRows, "f09:fireproof_zone_injection_material_volume") === 3.24,
    "EDITED_VOLUME_RED");
  for (const rowId of [
    "f09:fireproof_zone_injection_pump",
    "f09:fireproof_zone_injection_oil_free_compressed_air",
    "f09:fireproof_zone_injection_impact_drill",
  ]) invariant(quantity(editedRows, rowId) === 3, `EDITED_WORKFRONT_RED:${rowId}`);

  if (ROW_BATCH_ONLY) {
    await runNativeRowBatchContinuation({
      adb,
      auditPath,
      authorizationHeader,
      baseRevisionId: mutation.revisionId,
      baseRows: editedRows,
      tuple,
      fingerprints,
      currentProductSourceMatchesRuntime,
      currentJsSourceMatchesRuntime,
      evidence,
    });
    return;
  }

  const resumeReadyToApprove = process.env.S278_NATIVE_RESUME_READY_TO_APPROVE === "1";
  const resumeAfterApproval = process.env.S278_NATIVE_RESUME_AFTER_APPROVAL === "1";
  let pdfViewer: "in_app" | "external" = "in_app";
  if (resumeAfterApproval) {
    progress("RESUME_AFTER_APPROVAL", { revisionId: mutation.revisionId });
  } else if (resumeReadyToApprove) {
    await replaceGenericField(adb, "consumer-repair-city-input", "Bishkek");
    await replaceGenericField(adb, "consumer-repair-time-input", "Tomorrow");
    await clearGenericField(adb, "consumer-repair-address-input");
    await clearGenericField(adb, "consumer-repair-phone-input");
    progress("RESUME_APPROVAL_READY", { revisionId: mutation.revisionId });
  } else {
    invariant(run(adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000).ok,
      "FORCE_STOP_RED");
    await bootstrap(adb);
    await openRevision(adb, mutation.revisionId, auditPath);
    await openParameters(adb);
    const reopenedOpening = await parameterNodes(adb, "defect_mean_opening_mm");
    const reopenedFronts = await parameterNodes(adb, "workfront_count");
    invariant(Number(reopenedOpening.input.text) === 0.6 && Number(reopenedFronts.input.text) === 3,
      "COLD_REOPEN_VALUES_RED");
    invariant(run(adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000).ok,
      "POSITIONS_REOPEN_FORCE_STOP_RED");
    await bootstrap(adb);
    await openRevision(adb, mutation.revisionId, auditPath);
    await ensureNativePositionsVisible(adb);
    evidence.push(captureEvidence(adb, "04-native-cold-reopen-exact-child"));
    progress("COLD_REOPEN_GREEN", { revisionId: mutation.revisionId });

    const pdfAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "consumer-estimate-make-pdf", 60), "PDF_TAP_RED");
    pdfViewer = await waitForPdf(adb);
    evidence.push(captureEvidence(adb, "05-native-pdf-viewer"));
    const pdfDeadline = Date.now() + 120_000;
    let pdfRows = nativeRows(auditPath, pdfAuditStart);
    while (Date.now() < pdfDeadline && !pdfRows.some((row) =>
      row.path === `/revisions/${mutation.revisionId}/artifacts/pdf`)) {
      await sleep(500);
      pdfRows = nativeRows(auditPath, pdfAuditStart);
    }
    invariant(pdfRows.some((row) => row.path === `/revisions/${mutation.revisionId}/artifacts/pdf`),
      "PDF_AUDIT_RED");
    if (pdfViewer === "in_app") {
      invariant(await tapById(adb, DEVICE_ID, "pdf-viewer-back", 4), "PDF_BACK_RED");
    } else {
      run(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
    }
    await sleep(1_000);
    const returned = dumpUi(adb, DEVICE_ID);
    if (!mainActivityResumed(adb)
      || !returned.nodes.some((node) => nodeHasId(node, "consumer-repair-screen"))) {
      await bootstrap(adb);
      await openRevision(adb, mutation.revisionId, auditPath);
    }

    await replaceGenericField(adb, "consumer-repair-city-input", "Bishkek");
    await replaceGenericField(adb, "consumer-repair-time-input", "Tomorrow");
    await clearGenericField(adb, "consumer-repair-address-input");
    await clearGenericField(adb, "consumer-repair-phone-input");
  }
  if (!resumeAfterApproval) {
    let approveSnapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-approve") && node.enabled),
      30_000,
    );
    let approveNode = approveSnapshot.nodes.find((node) =>
      nodeHasId(node, "consumer-repair-approve") && node.enabled) ?? null;
    if (!approveNode) {
      const approve = await seekNode(
        adb,
        DEVICE_ID,
        (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled,
        60,
        "coarse",
      );
      approveSnapshot = approve.snapshot;
      approveNode = approve.node;
    }
    invariant(approveNode, `APPROVE_RED:${approveSnapshot.text.slice(-1_200)}`);
    evidence.push(captureEvidence(adb, "06-native-approve-enabled-null-prices"));
    const approvalAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "consumer-repair-approve", 12), "APPROVE_TAP_RED");
    const approvedWorkspace = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (snapshot) => snapshot.nodes.some(clearedProblemInput),
      240_000,
    );
    invariant(approvedWorkspace.nodes.some(clearedProblemInput), "APPROVED_WORKSPACE_RED");
    const approvalRows = nativeRows(auditPath, approvalAuditStart);
    invariant(!approvalRows.some((row) => row.method === "POST" && row.path === "/jobs/recalculate"),
      "APPROVAL_UNEXPECTED_RECALCULATE");
  }
  let historySnapshot = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-history-modal")),
    20_000,
  );
  if (!historySnapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-history-modal"))) {
    invariant(await tapById(adb, DEVICE_ID, "consumer-repair-history-button", 55), "HISTORY_OPEN_RED");
    historySnapshot = await waitForSnapshot(
      adb,
      DEVICE_ID,
      (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-history-modal")),
      30_000,
    );
  }
  invariant(historySnapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-history-modal")),
    "HISTORY_MODAL_RED");
  const history = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, `consumer-repair-history-revision-${mutation.revisionId}`),
    65,
    "fine",
  );
  invariant(history.node, "HISTORY_EXACT_REVISION_RED");
  evidence.push(captureEvidence(adb, "07-native-approved-exact-history"));

  const nativeAudit = nativeRows(auditPath, stageAuditStart);
  const auditOutput = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(auditOutput, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const payload = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN_STATUS,
    master: { path: MASTER.replace(/\\/gu, "/"), sha256: sha256File(MASTER) },
    source: {
      head: run("git", ["rev-parse", "HEAD"]).output.trim(),
      sourceTreeHash: fingerprints.sourceTreeHash,
      productSourceHash: fingerprints.productSourceHash,
      jsBundleFingerprint: fingerprints.jsBundleFingerprint,
    },
    runtime: {
      platform: "android_native",
      browserUsed: false,
      deviceId: DEVICE_ID,
      apiLevel: 34,
      package: PACKAGE_NAME,
      activity: MAIN_ACTIVITY,
      transport: "okhttp",
      compatibilityTuple: tuple,
      currentProductSourceMatchesRuntime,
      currentJsSourceMatchesRuntime,
      dynamicDevMetroSourceDrift: ORDINARY_CREDENTIAL_MODE && !currentJsSourceMatchesRuntime,
      unappliedDatabaseChangePresent: ORDINARY_CREDENTIAL_MODE && !currentProductSourceMatchesRuntime,
    },
    actor: {
      ordinaryCredentialMode: ORDINARY_CREDENTIAL_MODE,
      v15NonErpConfirmed: V15_NON_ERP_CONFIRMED,
      ordinaryNonErpConsumerAccount: V15_ORDINARY_CONSUMER,
      developerOwnerAccount: ORDINARY_CREDENTIAL_MODE && !V15_NON_ERP_CONFIRMED,
      guardedEnvFilesLoaded: LIVE_ENV.loadedFiles,
      credentialsPrinted: false,
      tokensPrinted: false,
    },
    journey: {
      catalogId: CATALOG_ID,
      sourceRevisionId,
      sourceRows: sourceRows.length,
      preliminaryNeeds: sourceRevision.preliminaryNeeds?.length ?? 0,
      visibleAssumedGuide: { parameterId: "material_volume_factor", value: 1, guide: "принято 1" },
      visibleNormativeGuide: { parameterId: "packer_spacing_thickness_ratio", value: 0.5, guide: "норма 0,5" },
      stagedParameters: { defect_mean_opening_mm: 0.6, workfront_count: 3 },
      recalculationsDuringTyping: 0,
      applyRecalculationCount: 1,
      editedRevisionId: mutation.revisionId,
      editedParentRevisionId: editedRevision.parentRevisionId,
      editedRows: editedRows.length,
      editedMaterialVolumeL: quantity(editedRows, "f09:fireproof_zone_injection_material_volume"),
      coldReopenValuesRestored: true,
      pdfViewer,
      approvalAllowedWithNullPrices: editedRows.some((row) => row.unitPrice == null),
      approvalWithoutAddressAndPhone: true,
      historyBindsExactRevision: true,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/gu, "/"),
      subsetPath: auditOutput.replace(/\\/gu, "/"),
      subsetSha256: sha256File(auditOutput),
      rows: nativeAudit.length,
      posts: nativeAudit.filter((row) => row.method === "POST"),
    },
    evidence,
    destructiveActions: { appDataCleared: false, avdWiped: false, reinstallPerformed: false },
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
  };
  writeJson(OUTPUT, payload);
  progress("ACCEPTANCE_GREEN", { output: OUTPUT.replace(/\\/gu, "/"), revisionId: mutation.revisionId });
}

main().catch((error) => {
  const payload = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN_STATUS.replace(/^GREEN_/u, "RED_"),
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    destructiveActions: { appDataCleared: false, avdWiped: false, reinstallPerformed: false },
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
  };
  writeJson(FAILURE_OUTPUT, payload);
  console.error(payload.error);
  process.exitCode = 1;
});
