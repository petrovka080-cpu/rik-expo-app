import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { ASPHALT_INSTALL_KRER27_CATALOG_ID } from "../../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";
import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "../../e2e/androidDeepLinkLaunchContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "../../e2e/ensureAndroidApi34DeviceReady";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
} from "../../e2e/r4A6AndroidAcceptedUiRuntime";
import {
  buildDevClientUri,
  ensureMetro,
  isMetroReachable,
  runAdb,
  setupAndroidRuntime,
  sleep,
  stopMetro,
} from "../../e2e/androidRouteBootstrapHarness";

type Json = Record<string, any>;
type AuditRow = Readonly<{
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
}>;

const CONTRACT = "rik-expo-app.s26-4.asphalt-install-android-acceptance.v1";
const MASTER_SHA256 = "a83e58cabc738d0a9265cda2a3a1061891a0b6009836ccbab0bac7f1a086e2d6";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const METRO_PORT = 8_082;
const BACKEND_PORT = 8_766;
const BROKER_PORT = 54_329;
const API_ROOT = `http://127.0.0.1:${BACKEND_PORT}/canonical-estimate`;
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const CREDENTIALS_PATH = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/s26-4/asphalt-install-android");
const DEVICE_ROOT = resolve(OUTPUT_ROOT, "device");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(OUTPUT_ROOT, "failure.json");
const ENVIRONMENT = "s26-4-asphalt-install-android-local";
const PROMPT = "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 5000 \u043c\u00b2";
const APP_INTERACTION_TOP = 140;
const APP_INTERACTION_BOTTOM = 2_148;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S264_ASPHALT_ANDROID:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function readAudit(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

async function startChild(
  executable: string,
  args: string[],
  env: Json,
  readyMarker: string,
  timeoutMs: number,
): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(executable, args, {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((ready, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `S264_ASPHALT_ANDROID:CHILD_READY_TIMEOUT:${readyMarker}:${logs.join("").slice(-3_000)}`,
    )), timeoutMs);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes(readyMarker)) {
        clearTimeout(timer);
        ready();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`S264_ASPHALT_ANDROID:CHILD_EARLY_EXIT:${code}:${logs.join("").slice(-3_000)}`));
    });
  });
  return { child, logs };
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(5_000)]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function consumerAuthorization(credentials: Json): Promise<string> {
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "content-type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && typeof body.access_token === "string", `CONSUMER_LOGIN_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { accept: "application/json", authorization },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 1_000)}`);
  return body;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows as Json[] : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

function visibleNode(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(
    box
    && box.top >= APP_INTERACTION_TOP
    && box.bottom <= APP_INTERACTION_BOTTOM,
  );
}

function swipeOuterPage(adbPath: string, deviceId: string, direction: "forward" | "backward"): void {
  const [fromY, toY, duration] = direction === "forward"
    ? [1_650, 520, 550]
    : [500, 1_850, 120];
  execFileSync(adbPath, [
    "-s", deviceId, "shell", "input", "swipe", "540", String(fromY), "540", String(toY), String(duration),
  ], { encoding: "utf8", timeout: 10_000 });
}

async function seekNode(
  adbPath: string,
  deviceId: string,
  predicate: (node: UiNode) => boolean,
  maxSwipes = 36,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index <= maxSwipes; index += 1) {
    const node = snapshot.nodes.find((candidate) => predicate(candidate) && visibleNode(candidate));
    if (node) return { snapshot, node };
    if (index === maxSwipes) break;
    swipeOuterPage(adbPath, deviceId, "forward");
    await sleep(180);
    snapshot = dumpUi(adbPath, deviceId);
  }
  return { snapshot, node: null };
}

async function scrollOuterPageToStart(
  adbPath: string,
  deviceId: string,
  maxSwipes = 24,
): Promise<UiSnapshot> {
  let previousXml = "";
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index < maxSwipes; index += 1) {
    previousXml = snapshot.xml;
    swipeOuterPage(adbPath, deviceId, "backward");
    await sleep(180);
    snapshot = dumpUi(adbPath, deviceId);
    if (snapshot.xml === previousXml) break;
  }
  return snapshot;
}

async function bootstrap(adbPath: string, deviceId: string): Promise<void> {
  setupAndroidRuntime(METRO_PORT, PACKAGE_NAME, {
    clearAppState: true,
    reversePorts: [BACKEND_PORT, BROKER_PORT, 54_321],
  });
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, buildDevClientUri(METRO_PORT), PACKAGE_NAME), 45_000);
  const deadline = Date.now() + 180_000;
  let last = dumpUi(adbPath, deviceId);
  while (Date.now() < deadline) {
    last = dumpUi(adbPath, deviceId);
    invariant(!last.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "DEV_CLIENT_CONFIG_RECOVERY_RED");
    if (last.nodes.some((node) =>
      nodeHasId(node, "consumer-repair-problem-input")
      || nodeHasId(node, "app-bottom-nav")
    )) {
      // The first React tree can become visible a moment before Expo Linking
      // finishes registering its native event emitter. Delivering a warm
      // Intent inside that gap crashes the dev client instead of exercising
      // the application route.
      await sleep(5_000);
      return;
    }
    const continueNode = last.nodes.find((node) => node.enabled && /^(Continue|Reload)$/iu.test(node.text.trim()));
    if (continueNode) {
      tapNode(adbPath, deviceId, continueNode);
      await sleep(1_000);
      continue;
    }
    const consumerLogin = last.nodes.find((node) => node.enabled && (
      nodeHasId(node, "auth.login.local-consumer")
      || nodeHasId(node, "protected-identity-local-consumer-login")
    ));
    if (consumerLogin) {
      tapNode(adbPath, deviceId, consumerLogin);
      await sleep(1_000);
      continue;
    }
    await sleep(500);
  }
  throw new Error(`S264_ASPHALT_ANDROID:DEV_CLIENT_BOOTSTRAP_RED:${last.text.slice(0, 1_500)}`);
}

async function waitForNativeRevision(auditPath: string, start: number): Promise<{
  revisionId: string;
  audit: AuditRow[];
}> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const audit = readAudit(auditPath).slice(start);
    const compileIndex = audit.findIndex((row) => row.method === "POST"
      && String(row.path ?? "").endsWith("/jobs/compile")
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"));
    if (compileIndex >= 0) {
      const revisionId = audit.slice(compileIndex + 1).map((row) =>
        String(row.path ?? "").match(/\/revisions\/([0-9a-f-]{36})(?:$|\?)/iu)?.[1] ?? null
      ).find((candidate): candidate is string => Boolean(candidate));
      if (revisionId) return { revisionId, audit };
    }
    await sleep(300);
  }
  throw new Error("S264_ASPHALT_ANDROID:NATIVE_COMPILE_OR_REVISION_NOT_OBSERVED");
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId ?? "");
  const searchReleaseId = String(current.searchReleaseId ?? "");
  invariant(current.owner === "S26_4_ASPHALT_INSTALL_KRER27_SUCCESSOR", "CURRENT_OWNER_DRIFT");
  invariant(current.productionAccessed === false, "PRODUCTION_ACCESS_FLAG_RED");
  invariant(credentials.provider_url === "http://127.0.0.1:54321", "LOCAL_PROVIDER_RED");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "s26-4-asphalt-install-android" });
  await client.connect();
  let backend: { child: ChildProcess; logs: string[] } | null = null;
  let broker: { child: ChildProcess; logs: string[] } | null = null;
  let metro: Awaited<ReturnType<typeof ensureMetro>> | null = null;
  try {
    const release = (await client.query(`select source_commit,source_tree,status,metadata
      from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.metadata?.masterSha256 === MASTER_SHA256,
      "RELEASE_PROVENANCE_RED");
    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1_000).toISOString();
    await client.query(`update public.estimate_candidate_capability_r3 set revoked_at=now()
      where environment=$1 and tenant_id=$2 and release_id=$3 and search_release_id=$4
        and purpose='estimate_candidate_admission_r3' and revoked_at is null`, [
      ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
    ]);
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,
      source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
      expiresAt, release.source_commit, release.source_tree,
      "runS264AsphaltInstallAndroidAcceptance",
    ]);

    const frontendSourceTreeHash = String(release.source_tree);
    const frontendProductSourceHash = sha256(`${CONTRACT}:product:${release.source_tree}`);
    const frontendJsBundleFingerprint = sha256(`${CONTRACT}:android:${release.source_commit}`);
    const backendRuntimeSourceSha256 = sha256(`${CONTRACT}:backend:${release.source_commit}`);
    const auditPath = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    backend = await startChild(process.execPath, [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
    ], {
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING: "request-principal",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "STRICT_SESSION_INTROSPECTION",
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: credentials.provider_url,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: credentials.publishable_key,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_MODE: "CANONICAL_RPC",
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_LOCAL_PORT: String(BACKEND_PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditPath,
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: sha256(`${CONTRACT}:${runId}:artifact`),
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      R568_FRONTEND_SOURCE_TREE_HASH: frontendSourceTreeHash,
      R568_FRONTEND_PRODUCT_SOURCE_HASH: frontendProductSourceHash,
      R568_FRONTEND_JS_BUNDLE_FINGERPRINT: frontendJsBundleFingerprint,
      R568_FRONTEND_BUILD_COMMIT: release.source_commit,
      CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256: backendRuntimeSourceSha256,
    }, '"status":"READY"', 45_000);
    broker = await startChild(process.execPath, [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("scripts/dev/serveLocalDeveloperAuthBroker.ts"),
    ], {}, "LOCAL_DEVELOPER_AUTH_BROKER_READY", 30_000);

    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = API_ROOT;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true";
    process.env.LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_APP_ENV = "local_developer";
    process.env.EXPO_PUBLIC_RELEASE_LABEL = "LOCAL_DEVELOPMENT";
    process.env.EXPO_PUBLIC_SUPABASE_URL = credentials.provider_url;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = credentials.publishable_key;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID = releaseId;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID = searchReleaseId;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID = capabilityId;
    process.env.EXPO_PUBLIC_BUILD_COMMIT = String(release.source_commit);
    process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = frontendSourceTreeHash;
    process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = frontendProductSourceHash;
    process.env.EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = frontendJsBundleFingerprint;

    metro = await ensureMetro(METRO_PORT);
    invariant(await isMetroReachable(METRO_PORT) && metro.configurationValidated, "METRO_RED");
    const device = await ensureAndroidApi34DeviceReady({
      artifactDir: DEVICE_ROOT,
      bootTimeoutMs: 240_000,
      allowCreateAvd: false,
    });
    invariant(device.final_status === API34_DEVICE_READY
      && device.android_sdk === 34
      && device.single_device_active === true
      && device.device_id
      && device.adb_path,
    `DEVICE_RED:${device.final_status}:${device.failure_reason ?? ""}`);
    const adbPath = String(device.adb_path);
    const deviceId = String(device.device_id);
    invariant(String(runAdb(["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000))
      .includes("package:"), "PACKAGE_NOT_INSTALLED");
    await bootstrap(adbPath, deviceId);

    const auditStart = readAudit(auditPath).length;
    const route = buildAndroidRouteDeepLink({
      route: "/request",
      prompt: PROMPT,
      catalogWorkId: ASPHALT_INSTALL_KRER27_CATALOG_ID,
      launchId: `s26-4-asphalt-native:${runId}`,
      automaticParam: "autoPrepare",
    });
    runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, route, PACKAGE_NAME), 45_000);
    const native = await waitForNativeRevision(auditPath, auditStart);

    const preview = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => snapshot.nodes.some((node) =>
        nodeHasId(node, "request-estimate-row-count") && /56/iu.test(node.text))
        && snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-open-full-estimate")),
      180_000,
    );
    const previewCount = preview.nodes.find((node) => nodeHasId(node, "request-estimate-row-count"));
    invariant(previewCount && /56/iu.test(previewCount.text),
      `MEANINGFUL_PREVIEW_ROW_COUNT_RED:${previewCount?.text ?? "missing"}`);
    const previewEvidence = capture(adbPath, deviceId, OUTPUT_ROOT, "01_native_preview_56_rows");
    const savedPreview = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => snapshot.nodes.some((node) =>
        nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled),
      120_000,
    );
    const openFull = savedPreview.nodes.find((node) =>
      nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled && visibleNode(node));
    invariant(openFull && tapNode(adbPath, deviceId, openFull), "OPEN_FULL_ESTIMATE_RED");
    const full = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) =>
        !snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-meaningful-preview"))
        && snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-screen")),
      120_000,
    );
    invariant(
      !full.nodes.some((node) => nodeHasId(node, "consumer-estimate-meaningful-preview"))
      && full.nodes.some((node) => nodeHasId(node, "consumer-repair-screen")),
      "FULL_ESTIMATE_PROJECTION_RED");

    const authorization = await consumerAuthorization(credentials);
    const revision = await api(authorization, `revisions/${native.revisionId}`);
    const rows = await allRows(authorization, native.revisionId);
    invariant(revision.releaseId === releaseId
      && revision.catalogId === ASPHALT_INSTALL_KRER27_CATALOG_ID
      && Number(revision.parameters?.area_m2) === 5_000
      && (revision.preliminaryNeeds ?? []).length === 0,
    "REVISION_IDENTITY_OR_PARAMS_RED");
    invariant(rows.length === 56 && rows.every((row) => row.unitPrice == null && row.amount == null),
      `REVISION_COMPOSITION_OR_PRICE_RED:${rows.length}`);

    await scrollOuterPageToStart(adbPath, deviceId);
    const positionsToggle = await seekNode(adbPath, deviceId,
      (node) => nodeHasId(node, "request-estimate-items-editor") && node.enabled, 48);
    invariant(positionsToggle.node, "POSITIONS_TOGGLE_RED");
    let positionsToggleNode: UiNode | null = positionsToggle.node;
    let positionsOpen = /\u0421\u043a\u0440\u044b\u0442\u044c\s+\u043f\u043e\u0437\u0438\u0446\u0438\u0438/iu.test(
      `${positionsToggleNode.text} ${positionsToggleNode.contentDesc}`,
    );
    for (let attempt = 0; attempt < 3 && positionsToggleNode; attempt += 1) {
      if (positionsOpen) break;
      invariant(tapNode(adbPath, deviceId, positionsToggleNode),
        `POSITIONS_TOGGLE_TAP_RED:${attempt + 1}`);
      await sleep(1_000);
      const state = dumpUi(adbPath, deviceId);
      const currentToggle = state.nodes.find((node) =>
        nodeHasId(node, "request-estimate-items-editor"));
      positionsOpen = Boolean(currentToggle
        && /\u0421\u043a\u0440\u044b\u0442\u044c\s+\u043f\u043e\u0437\u0438\u0446\u0438\u0438/iu.test(`${currentToggle.text} ${currentToggle.contentDesc}`));
      if (positionsOpen) {
        capture(adbPath, deviceId, OUTPUT_ROOT, "02a_native_positions_open");
        break;
      }
      positionsToggleNode = currentToggle && visibleNode(currentToggle)
        ? currentToggle
        : (await seekNode(adbPath, deviceId,
          (node) => nodeHasId(node, "request-estimate-items-editor") && node.enabled, 12)).node;
    }
    invariant(positionsOpen, "POSITIONS_TOGGLE_STATE_RED");
    // Expanding a 56-row editor changes the outer ScrollView height after the
    // press has returned. Scrolling during that layout pass can jump beyond
    // the row-count header, so settle and restart the viewport traversal.
    await sleep(1_000);
    await scrollOuterPageToStart(adbPath, deviceId, 80);
    const positions = await seekNode(adbPath, deviceId,
      (node) => nodeHasId(node, "request-estimate-items-total-count"), 48);
    const totalCount = positions.node;
    invariant(totalCount && /56/iu.test(totalCount.text),
      `FULL_COMPOSITION_COUNT_RED:${totalCount?.text ?? "missing"}`);
    const materialRow = await seekNode(adbPath, deviceId,
      (node) => /\u0421\u043c\u0435\u0441\u044c \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u043e\u0431\u0435\u0442\u043e\u043d\u043d\u0430\u044f \u0433\u043e\u0440\u044f\u0447\u0430\u044f/iu.test(node.text), 30);
    invariant(materialRow.node, "ASPHALT_MIX_ROW_NOT_VISIBLE");
    const rowsEvidence = capture(adbPath, deviceId, OUTPUT_ROOT, "02_native_full_composition_56_rows");

    const approve = await seekNode(adbPath, deviceId,
      (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled, 80);
    invariant(approve.node && tapNode(adbPath, deviceId, approve.node),
      "APPROVAL_WITHOUT_PRICES_ACTION_RED");
    const approvalDeadline = Date.now() + 180_000;
    let approvalAudit: AuditRow[] = [];
    while (Date.now() < approvalDeadline) {
      approvalAudit = readAudit(auditPath).slice(auditStart);
      if (approvalAudit.some((row) => row.method === "POST"
        && String(row.path ?? "").includes(`/revisions/${native.revisionId}/artifacts/pdf`)
        && row.status === 202
        && String(row.userAgent ?? "").startsWith("okhttp/"))) break;
      await sleep(300);
    }
    invariant(approvalAudit.some((row) => row.method === "POST"
      && String(row.path ?? "").includes(`/revisions/${native.revisionId}/artifacts/pdf`)
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/")),
    "ANDROID_APPROVAL_PDF_POST_NOT_OBSERVED");
    const approvalEvidence = capture(adbPath, deviceId, OUTPUT_ROOT, "03_native_approved_without_prices");
    const artifact = await api(authorization, `revisions/${native.revisionId}/artifacts/pdf`);
    invariant(artifact.status === "ready" && artifact.revisionId === native.revisionId,
      "ANDROID_APPROVAL_PDF_RED");

    const dbAudit = (await client.query(`select revision.id,revision.owner_user_id,
        revision.organization_id,revision.release_id,revision.catalog_id,revision.row_count,
        count(row.row_id)::int persisted_rows,
        count(*) filter(where row.unit_price is null)::int unknown_price_rows
      from public.estimate_revision revision join public.estimate_revision_row row on row.revision_id=revision.id
      where revision.id=$1 group by revision.id`, [native.revisionId])).rows[0] as Json;
    const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
    invariant(consumer, "ANDROID_CONSUMER_PRINCIPAL_MISSING");
    invariant(dbAudit.owner_user_id === consumer.user_id
      && dbAudit.organization_id === credentials.test_tenant_id
      && Number(dbAudit.persisted_rows) === 56
      && Number(dbAudit.unknown_price_rows) === 56,
    `DATABASE_AUDIT_RED:${JSON.stringify(dbAudit)}`);
    const nativeRequests = readAudit(auditPath).slice(auditStart);
    invariant(nativeRequests.some((row) => row.method === "POST"
      && String(row.path ?? "").endsWith("/jobs/compile")
      && String(row.userAgent ?? "").startsWith("okhttp/")),
    "ANDROID_OKHTTP_COMPILE_RED");

    const reportUnsigned = {
      contract: CONTRACT,
      generatedAt: new Date().toISOString(),
      runId,
      status: "GREEN_S26_4_ASPHALT_INSTALL_ANDROID_NATIVE_56_ROWS_APPROVAL_WITHOUT_PRICES",
      masterSha256: MASTER_SHA256,
      productionAccessed: false,
      definitionReleaseId: releaseId,
      searchReleaseId,
      device: { id: deviceId, apiLevel: device.android_sdk, avd: device.avd_name },
      transport: { nativeOkHttpCompile: true, nativeRequestCount: nativeRequests.length },
      estimate: {
        revisionId: native.revisionId,
        catalogId: revision.catalogId,
        areaM2: revision.parameters?.area_m2,
        backendRowCount: rows.length,
        previewRowCountText: previewCount.text,
        fullCompositionCountText: totalCount.text,
        unknownPriceRows: rows.filter((row) => row.unitPrice == null).length,
        blockingNeeds: (revision.preliminaryNeeds ?? []).length,
        asphaltMixT: rows.find((row) => row.rowId === "asphalt:material:hot-dense-fine-mix")?.quantity,
      },
      approval: {
        approvedWithoutPrices: true,
        artifactId: artifact.artifactId,
        pdfSha256: artifact.sha256,
      },
      databaseAudit: dbAudit,
      evidence: [previewEvidence, rowsEvidence, approvalEvidence],
      requestAuditPath: auditPath.replace(/\\/gu, "/"),
      deployPerformed: false,
      activationPerformed: false,
    };
    const report = { ...reportUnsigned, sha256: sha256(JSON.stringify(stable(reportUnsigned))) };
    atomicJson(OUTPUT, report);
    rmSync(FAILURE_OUTPUT, { force: true });
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      output: OUTPUT,
      revisionId: native.revisionId,
      rowCount: rows.length,
      approvedWithoutPrices: true,
    }, null, 2)}\n`);
  } finally {
    if (metro) stopMetro(metro);
    if (broker) await stopChild(broker.child);
    if (backend) await stopChild(backend.child);
    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  const failure = {
    contract: `${CONTRACT}.failure.v1`,
    generatedAt: new Date().toISOString(),
    status: "RED_S26_4_ASPHALT_INSTALL_ANDROID",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  };
  atomicJson(FAILURE_OUTPUT, failure);
  process.stderr.write(`${failure.error}\n`);
  process.exitCode = 1;
});
