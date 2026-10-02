import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "../e2e/androidDeepLinkLaunchContract";
import {
  buildDevClientUri,
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";
import {
  capture,
  dumpUi,
  nodeHasId,
  seekNode,
  tapNode,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;
type AuditRow = {
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
};

const S2714_ANCHOR_MODE = process.argv.includes("--s27-14-anchor");
const CONTRACT = S2714_ANCHOR_MODE
  ? "rik-expo-app.s27-14.anchor-group-approved-revision.android-read-only.v1"
  : "rik-expo-app.s27-3.foundation-historical-revision.android-read-only.v1";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEVICE_ID = "emulator-5554";
const BACKEND = "http://127.0.0.1:8765";
const REVISION_ID = S2714_ANCHOR_MODE
  ? "2f635df2-5b2d-4965-9984-62c3fda1759b"
  : "cf6dc622-2a87-43a0-a8ca-6e7ca025ce2f";
const PARENT_REVISION_ID = "496a2e27-5004-4fe8-83ba-4d0c6a6c80c2";
const DEFINITION_RELEASE_ID = S2714_ANCHOR_MODE
  ? "43ff52c6-4dc2-575f-a429-c879b483f52e"
  : "969c4312-e2e3-5b51-ab08-d5e778c97d46";
const DEFINITION_VERSION_ID = "bfd003f6-721d-5e4f-94bc-62668d4cb28a";
const EXPECTED_ROW_COUNT = S2714_ANCHOR_MODE ? 36 : 24;
const ROOT = resolve(S2714_ANCHOR_MODE
  ? ".release-runtime/r568/s27-14/anchor-group-android-acceptance"
  : ".release-runtime/r568/s27-3/foundation-150/05_ANDROID_V14_READ_ONLY");
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");
const CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const BACKEND_RECEIPT = resolve(
  S2714_ANCHOR_MODE
    ? ".release-runtime/r568/runtime/whole-app-developer-current/backend.json"
    : ".release-runtime/r568/runtime/local-developer-current/backend.json",
);
const METRO_RECEIPT = resolve(
  S2714_ANCHOR_MODE
    ? ".release-runtime/r568/runtime/whole-app-developer-current/metro.json"
    : ".release-runtime/r568/runtime/local-developer-current/metro.json",
);
const S2714_WEB_ACCEPTANCE = resolve(
  ".release-runtime/r568/s27-14/anchor-group-web-acceptance/history-market-acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`${S2714_ANCHOR_MODE ? "S2714_ANCHOR_ANDROID" : "S273_ANDROID_READ_ONLY"}:${code}`);
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

function run(
  command: string,
  args: string[],
  timeoutMs = 30_000,
): { ok: boolean; output: string } {
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
    const record = error as {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
    };
  }
}

function adbPath(): string {
  const located = run("where.exe", ["adb"], 10_000);
  const candidate = located.output.split(/\r?\n/u).find(Boolean)?.trim();
  invariant(located.ok && candidate && existsSync(candidate), "ADB_MISSING");
  return candidate;
}

function auditRows(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function nativeRows(path: string, start: number): AuditRow[] {
  return auditRows(path).slice(start).filter((row) =>
    String(row.userAgent ?? "").startsWith("okhttp/"),
  );
}

async function authorization(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  const principal = (credentials.principals as Json[]).find(
    (entry) => entry.role === "consumer",
  );
  invariant(
    principal?.email && principal?.password && credentials.publishable_key,
    "CREDENTIALS_RED",
  );
  const response = await fetch(
    `${credentials.provider_url}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: credentials.publishable_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: principal.email,
        password: principal.password,
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const payload = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && payload.access_token, `LOGIN_${response.status}`);
  return `Bearer ${payload.access_token}`;
}

async function api(authorizationHeader: string, route: string): Promise<Json> {
  const response = await fetch(
    `${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`,
    {
      headers: { Authorization: authorizationHeader },
      signal: AbortSignal.timeout(120_000),
    },
  );
  const payload = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(payload)}`);
  return payload;
}

async function bootstrap(adb: string): Promise<void> {
  setupAndroidRuntime(8_081, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  const launch = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(
      DEVICE_ID,
      buildDevClientUri(8_081),
      PACKAGE_NAME,
    ),
    60_000,
  );
  invariant(launch.ok, `DEV_CLIENT_LAUNCH_RED:${launch.output}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adb, DEVICE_ID);
    invariant(
      !snapshot.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "CONFIG_RECOVERY_RED",
    );
    if (
      snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))
      && (S2714_ANCHOR_MODE || snapshot.text.includes("local-consumer-"))
    ) return;
    const localLogin = snapshot.nodes.find((node) =>
      (
        nodeHasId(node, "auth.login.local-consumer")
        || nodeHasId(node, "protected-identity-local-consumer-login")
      ) && node.enabled,
    );
    if (localLogin && !S2714_ANCHOR_MODE) {
      tapNode(adb, DEVICE_ID, localLogin);
      await sleep(1_000);
      continue;
    }
    const resume = snapshot.nodes.find((node) =>
      node.enabled && /^(?:Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (resume) tapNode(adb, DEVICE_ID, resume);
    await sleep(750);
  }
  throw new Error("S273_ANDROID_READ_ONLY:BOOTSTRAP_TIMEOUT");
}

async function openRevision(adb: string): Promise<void> {
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", REVISION_ID);
  uri.searchParams.set("launchId", `${S2714_ANCHOR_MODE ? "s2714-anchor" : "s273-v14-read"}-${Date.now().toString(36)}`);
  const launch = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(
      DEVICE_ID,
      uri.toString(),
      PACKAGE_NAME,
    ),
    60_000,
  );
  invariant(launch.ok, `REVISION_LAUNCH_RED:${launch.output}`);

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adb, DEVICE_ID);
    const previewVisible = snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-estimate-meaningful-preview"),
    );
    const open = snapshot.nodes.find((node) =>
      nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled,
    );
    if (previewVisible && open) {
      invariant(tapNode(adb, DEVICE_ID, open), "OPEN_FULL_ESTIMATE_RED");
      await sleep(750);
      continue;
    }
    if (
      !previewVisible
      && snapshot.nodes.some((node) =>
        nodeHasId(node, "request-estimate-summary-card"),
      )
    ) return;
    await sleep(500);
  }
  throw new Error("S273_ANDROID_READ_ONLY:REVISION_OPEN_TIMEOUT");
}

async function ensurePositionsExpanded(adb: string): Promise<void> {
  const toggle = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "request-estimate-items-editor") && node.enabled,
    32,
    "coarse",
  );
  invariant(toggle.node, "POSITIONS_TOGGLE_MISSING");
  if (/\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c/iu.test(toggle.node.contentDesc)) {
    invariant(tapNode(adb, DEVICE_ID, toggle.node), "POSITIONS_EXPAND_RED");
    await sleep(750);
  }
  const count = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "request-estimate-items-total-count"),
    16,
    "fine",
  );
  invariant(
    count.node && new RegExp(`\\b${EXPECTED_ROW_COUNT}\\b`, "u").test(count.node.text),
    `VISIBLE_ROW_COUNT_RED:${count.node?.text ?? "missing"}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  invariant(
    (!S2714_ANCHOR_MODE || existsSync(S2714_WEB_ACCEPTANCE))
      && (S2714_ANCHOR_MODE || existsSync(CREDENTIALS))
      && existsSync(BACKEND_RECEIPT)
      && existsSync(METRO_RECEIPT),
    "RUNTIME_RECEIPT_MISSING",
  );
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  const fingerprints = computeReleaseFingerprints();
  invariant(tuple.sourceTree === fingerprints.sourceTreeHash, "BACKEND_SOURCE_DRIFT");
  invariant(
    metroReceipt.source_tree_hash === fingerprints.sourceTreeHash,
    "METRO_SOURCE_DRIFT",
  );
  invariant(
    tuple.definitionReleaseId === DEFINITION_RELEASE_ID
      && metroReceipt.definition_release_id === DEFINITION_RELEASE_ID,
    "DEFINITION_RELEASE_RED",
  );
  const auditPath = resolve(
    `.release-runtime/r568/runtime/${S2714_ANCHOR_MODE ? "whole-app-developer-current" : "local-developer-current"}/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`,
  );
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);

  let rowCount = 0;
  let unknownPricesRemain: number | null = null;
  if (S2714_ANCHOR_MODE) {
    const webAcceptance = readJson(S2714_WEB_ACCEPTANCE);
    invariant(
      webAcceptance.status === "GREEN_S27_14_ANCHOR_GROUP_APPROVED_HISTORY_PDF_MARKET_36_OF_36"
        && webAcceptance.revisionId === REVISION_ID
        && webAcceptance.releaseId === DEFINITION_RELEASE_ID
        && webAcceptance.definitionVersionId === DEFINITION_VERSION_ID
        && Number(webAcceptance.backendRowCount) === EXPECTED_ROW_COUNT
        && Number(webAcceptance.approvedHistoryRowCount) === EXPECTED_ROW_COUNT
        && Number(webAcceptance.marketplaceExactRowParityCount) === EXPECTED_ROW_COUNT,
      "WEB_ACCEPTANCE_IDENTITY_RED",
    );
    rowCount = Number(webAcceptance.backendRowCount);
  } else {
    const authorizationHeader = await authorization();
    const revision = await api(authorizationHeader, `revisions/${REVISION_ID}`);
    const rowPayload = await api(
      authorizationHeader,
      `revisions/${REVISION_ID}/rows?limit=200`,
    );
    const rows = Array.isArray(rowPayload.rows) ? rowPayload.rows as Json[] : [];
    invariant(revision.parentRevisionId === PARENT_REVISION_ID, "PARENT_RED");
    invariant(revision.releaseId === DEFINITION_RELEASE_ID, "REVISION_RELEASE_RED");
    invariant((revision.preliminaryNeeds ?? []).length === 0, "PRELIMINARY_NEEDS_RED");
    invariant(rows.length === EXPECTED_ROW_COUNT, `ROW_COUNT_RED:${rows.length}`);
    invariant(rows.every((row) => Number(row.quantity) > 0), "QUANTITY_RED");
    invariant(rows.some((row) => row.unitPrice == null), "UNKNOWN_PRICES_WERE_FABRICATED");
    rowCount = rows.length;
    unknownPricesRemain = rows.filter((row) => row.unitPrice == null).length;
  }

  const adb = adbPath();
  await bootstrap(adb);
  const auditStart = auditRows(auditPath).length;
  await openRevision(adb);
  await ensurePositionsExpanded(adb);
  if (!S2714_ANCHOR_MODE) {
    const approve = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled,
      48,
      "coarse",
    );
    invariant(approve.node, "APPROVAL_NOT_ENABLED");
  }
  const evidence = capture(
    adb,
    DEVICE_ID,
    DEVICE_ROOT,
    S2714_ANCHOR_MODE
      ? "s27-14-anchor-group-approved-revision-36-rows"
      : "v14-historical-revision-24-rows-approval-ready",
  );
  const observedNativeRequests = nativeRows(auditPath, auditStart);
  const mutationRequests = observedNativeRequests.filter((row) => row.method === "POST");
  invariant(
    mutationRequests.length === 0,
    `UNEXPECTED_MUTATION:${JSON.stringify(mutationRequests)}`,
  );
  if (S2714_ANCHOR_MODE) {
    invariant(
      observedNativeRequests.some((row) =>
        row.method === "GET" && String(row.path ?? "").includes(REVISION_ID)
      ),
      "REVISION_NATIVE_GET_MISSING",
    );
  }

  writeJson(OUTPUT, {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: S2714_ANCHOR_MODE
      ? "GREEN_S27_14_ANCHOR_GROUP_APPROVED_REVISION_ANDROID_36_ROWS"
      : "GREEN_S27_3_FOUNDATION_HISTORICAL_REVISION_ANDROID_READ_ONLY",
    revisionId: REVISION_ID,
    ...(S2714_ANCHOR_MODE ? { definitionVersionId: DEFINITION_VERSION_ID } : {
      parentRevisionId: PARENT_REVISION_ID,
    }),
    definitionReleaseId: DEFINITION_RELEASE_ID,
    rowCount,
    preliminaryNeedCount: 0,
    allQuantitiesPositive: true,
    unknownPricesRemain,
    approvalEnabledWithoutAllPrices: !S2714_ANCHOR_MODE,
    noMutationRequests: true,
    runtime: {
      platform: "android_native",
      chromeUsed: false,
      deviceId: DEVICE_ID,
      apiLevel: 34,
      package: PACKAGE_NAME,
      transport: "okhttp",
      compatibilityTuple: tuple,
    },
    evidence: {
      ...evidence,
      screenshotSha256: evidence.screenshot
        ? sha256File(resolve(evidence.screenshot))
        : null,
      uiDumpSha256: evidence.uiDump
        ? sha256File(resolve(evidence.uiDump))
        : null,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/g, "/"),
      observed: observedNativeRequests,
    },
    destructiveActions: {
      appDataCleared: false,
      avdWiped: false,
      reinstallPerformed: false,
    },
    productionAccessed: false,
    deployPerformed: false,
  });
  process.stdout.write(`${OUTPUT}\n`);
}

main().catch((error) => {
  writeJson(FAILURE_OUTPUT, {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: S2714_ANCHOR_MODE
      ? "RED_S27_14_ANCHOR_GROUP_ANDROID"
      : "RED_S27_3_FOUNDATION_HISTORICAL_REVISION_ANDROID_READ_ONLY",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    appDataCleared: false,
    avdWiped: false,
    reinstallPerformed: false,
  });
  console.error(error);
  process.exitCode = 1;
});
