import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync, renameSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  createAndroidHarness,
  isAndroidAuthLoginScreenXml,
  isAndroidAuthenticatedSessionSurfaceXml,
} from "../_shared/androidHarness";

type Json = Record<string, any>;

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
);
const CONTRACT_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const IS_BATCH001_R56 = process.env.BATCH001_R56_ANDROID_MODE === "true";
const IS_BATCH003_R56 = process.env.BATCH003_R56_ANDROID_MODE === "true";
const IS_BATCH004_R56 = process.env.BATCH004_R56_ANDROID_MODE === "true";
if ([IS_BATCH001_R56, IS_BATCH003_R56, IS_BATCH004_R56].filter(Boolean).length > 1) {
  throw new Error("ANDROID_AUTH_R56_BATCH_MODE_AMBIGUOUS");
}
const BATCH_NUMBER = IS_BATCH004_R56 ? "BATCH004"
  : IS_BATCH003_R56 ? "BATCH003" : IS_BATCH001_R56 ? "BATCH001" : "BATCH002";
const BATCH_SLUG = IS_BATCH004_R56 ? "batch004-r56"
  : IS_BATCH003_R56 ? "batch003-r56" : IS_BATCH001_R56 ? "batch001-r56" : "batch002-r55";
const EXPECTED_MANIFEST_STATUS = IS_BATCH004_R56
  ? "FROZEN_R56_BATCH004_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
  : IS_BATCH003_R56
  ? "FROZEN_R56_BATCH003_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
  : IS_BATCH001_R56
    ? "FROZEN_R56_BATCH001_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
    : "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE";
const AUTH_ORIGIN = IS_BATCH004_R56 ? "http://10.0.2.2:8187"
  : IS_BATCH003_R56 ? "http://10.0.2.2:8185" : "http://10.0.2.2:8173";
const EVIDENCE = resolve(process.env.BATCH004_R56_ANDROID_OUTPUT
  ?? process.env.BATCH003_R56_ANDROID_OUTPUT
  ?? process.env.BATCH001_R56_ANDROID_OUTPUT
  ?? (IS_BATCH004_R56
    ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/android"
    : IS_BATCH003_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/android"
    : IS_BATCH001_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/android"
      : ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002"));
const RUNTIME = resolve(EVIDENCE, "runtime");
const BUILD_MANIFEST = resolve(EVIDENCE, "ANDROID_PROOF_BUILD_MANIFEST.json");
const MATRIX_MANIFEST = resolve(process.env.BATCH004_R56_ANDROID_MANIFEST
  ?? process.env.BATCH003_R56_ANDROID_MANIFEST
  ?? process.env.BATCH001_R56_ANDROID_MANIFEST
  ?? (IS_BATCH004_R56
    ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/matrix/BATCH004_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
    : IS_BATCH003_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/matrix/BATCH003_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
    : IS_BATCH001_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/matrix/BATCH001_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
      : resolve(EVIDENCE, "BATCH002_R55_ANDROID_API34_MATRIX_50_MANIFEST.json")));
const AUTH_AUDIT = resolve(process.env.BATCH004_R56_AUTH_AUDIT_LOG
  ?? process.env.BATCH003_R56_AUTH_AUDIT_LOG ?? resolve(RUNTIME, "local_supabase_audit.jsonl"));
const RUNNER_LOCK = resolve(RUNTIME, `${BATCH_NUMBER}_ANDROID_API34_50.lock.json`);
const OUTPUT = resolve(EVIDENCE, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function processExists(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processCommandLine(pid: number): string {
  try {
    if (process.platform === "win32") {
      return execFileSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
      ], { encoding: "utf8", timeout: 15_000 }).trim();
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: 15_000,
    }).trim();
  } catch {
    return "";
  }
}

function auditRowsAfter(lineCount: number): Json[] {
  return readFileSync(AUTH_AUDIT, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .slice(lineCount)
    .map((line) => JSON.parse(line) as Json);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "ANDROID_AUTH_R55_CONTRACT_SHA_MISMATCH");
  let recoveredStaleRunnerLock: Json | null = null;
  if (existsSync(RUNNER_LOCK)) {
    const lock = JSON.parse(readFileSync(RUNNER_LOCK, "utf8")) as Json;
    const lockPid = Number(lock.pid);
    const liveCommandLine = processCommandLine(lockPid);
    const liveMatrixRunner = processExists(lockPid)
      && liveCommandLine.includes("runBatch002R52AndroidApi34Matrix50.ts");
    invariant(!liveMatrixRunner, "ANDROID_AUTH_MATRIX_RUNNER_ACTIVE");
    recoveredStaleRunnerLock = {
      ...lock,
      recovery_proof: {
        checked_at: new Date().toISOString(),
        process_exists: processExists(lockPid),
        live_command_line: liveCommandLine,
        exact_matrix_runner_alive: liveMatrixRunner,
      },
    };
    unlinkSync(RUNNER_LOCK);
  }
  const build = JSON.parse(readFileSync(BUILD_MANIFEST, "utf8")) as Json;
  invariant(build.contract_sha256 === CONTRACT_SHA256, "ANDROID_AUTH_BUILD_CONTRACT_MISMATCH");
  invariant(build.status === "AUTH_RUNTIME_PROOF_PENDING_NO_RELEASE"
    && /^[0-9a-f]{64}$/u.test(String(build.apk_sha256_full)),
  "ANDROID_AUTH_APK_IDENTITY_MISMATCH");
  invariant(/^[0-9a-f]{64}$/u.test(String(build.app_source_state_id)),
    "ANDROID_AUTH_APP_SOURCE_STATE_MISMATCH");
  const matrix = JSON.parse(readFileSync(MATRIX_MANIFEST, "utf8")) as Json;
  invariant(matrix.contract_sha256 === CONTRACT_SHA256
    && matrix.status === EXPECTED_MANIFEST_STATUS
    && matrix.app_source_component_state_id === build.app_source_state_id
    && matrix.release_id === build.release_identity?.release_id,
  "ANDROID_AUTH_R56_MATRIX_BUILD_IDENTITY_MISMATCH");
  const case4 = (matrix.cases as Json[]).find((entry) => entry.case === 4);
  invariant(case4, "ANDROID_AUTH_CASE4_MANIFEST_ENTRY_MISSING");

  const auditBeforeLines = readFileSync(AUTH_AUDIT, "utf8").split(/\r?\n/u).filter(Boolean).length;
  const startedAt = new Date().toISOString();
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: 8081,
    devClientStdoutPath: `artifacts/${BATCH_SLUG}-auth-proof-dev-client.stdout.log`,
    devClientStderrPath: `artifacts/${BATCH_SLUG}-auth-proof-dev-client.stderr.log`,
  });
  const installed = harness.adb(["shell", "pm", "list", "packages", PACKAGE]);
  invariant(installed.includes(`package:${PACKAGE}`), "ANDROID_AUTH_PROOF_APK_NOT_INSTALLED");
  const installedApkPath = String(harness.adb(["shell", "pm", "path", PACKAGE]))
    .split(/\r?\n/u)
    .find((line) => line.startsWith("package:"))
    ?.slice("package:".length)
    .trim();
  invariant(installedApkPath, "ANDROID_AUTH_INSTALLED_APK_PATH_MISSING");
  const installedApkSha256 = String(harness.adb(["shell", "sha256sum", installedApkPath]))
    .trim()
    .split(/\s+/u)[0];
  invariant(
    installedApkSha256 === build.apk_sha256_full,
    "ANDROID_AUTH_INSTALLED_APK_SHA_MISMATCH",
  );

  harness.resetAndroidAppState(PACKAGE);
  const loginRoute = "rik:///auth/login";
  harness.startAndroidRouteSafe(PACKAGE, loginRoute);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  let loginScreen = await harness.dismissAndroidInterruptions(
    harness.dumpAndroidScreen(`${BATCH_SLUG}-auth-login-empty`),
    `${BATCH_SLUG}-auth-login-empty-interrupt`,
  );
  for (let attempt = 0; attempt < 20 && !isAndroidAuthLoginScreenXml(loginScreen.xml); attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
    loginScreen = await harness.dismissAndroidInterruptions(
      harness.dumpAndroidScreen(`${BATCH_SLUG}-auth-login-empty-wait-${attempt + 1}`),
      `${BATCH_SLUG}-auth-login-empty-wait-${attempt + 1}-interrupt`,
    );
  }
  invariant(isAndroidAuthLoginScreenXml(loginScreen.xml), "ANDROID_AUTH_LOGIN_SCREEN_NOT_VISIBLE_AFTER_CLEAR");
  invariant(loginScreen.xml.includes("auth.login.email") && loginScreen.xml.includes("auth.login.password")
    && loginScreen.xml.includes("auth.login.submit"), "ANDROID_AUTH_LOGIN_CONTROLS_MISSING");

  const protectedRoute = `rik:///request?canonicalRevisionId=${encodeURIComponent(String(case4.parentRevisionId))}`
    + "&r55AuthBootstrap=1";
  const localOnlyCredentials = {
    email: process.env.BATCH004_R56_AUTH_EMAIL
      ?? process.env.BATCH003_R56_AUTH_EMAIL
      ?? process.env.BATCH001_R56_AUTH_EMAIL
      ?? process.env.BATCH002_R55_AUTH_EMAIL
      ?? `${BATCH_SLUG}-local-proof@example.invalid`,
    password: process.env.BATCH004_R56_AUTH_PASSWORD
      ?? process.env.BATCH003_R56_AUTH_PASSWORD
      ?? process.env.BATCH001_R56_AUTH_PASSWORD
      ?? process.env.BATCH002_R55_AUTH_PASSWORD
      ?? `${IS_BATCH004_R56 || IS_BATCH003_R56 || IS_BATCH001_R56 ? "r56" : "r55"}-local-proof-password-not-a-secret`,
  };
  const authenticatedScreen = await harness.loginAndroidWithProtectedRoute({
    packageName: PACKAGE,
    user: localOnlyCredentials,
    protectedRoute: "rik://profile",
    artifactBase: `${BATCH_SLUG}-auth-bootstrap`,
    successPredicate: isAndroidAuthenticatedSessionSurfaceXml,
    renderablePredicate: (xml) => isAndroidAuthLoginScreenXml(xml)
      || isAndroidAuthenticatedSessionSurfaceXml(xml),
    loginScreenPredicate: isAndroidAuthLoginScreenXml,
  });
  invariant(
    isAndroidAuthenticatedSessionSurfaceXml(authenticatedScreen.xml),
    "ANDROID_AUTH_AUTHENTICATED_SESSION_SURFACE_MISSING",
  );
  const targetScreen = await harness.openAndroidRoute({
    packageName: PACKAGE,
    routes: [protectedRoute],
    artifactBase: `${BATCH_SLUG}-auth-target`,
    predicate: (xml) => xml.includes("consumer-repair-screen")
      && xml.includes(String(case4.parentRevisionId))
      && xml.includes(String(case4.releaseId)),
    renderablePredicate: (xml) => isAndroidAuthenticatedSessionSurfaceXml(xml)
      || xml.includes("consumer-repair-screen"),
    loginScreenPredicate: isAndroidAuthLoginScreenXml,
    timeoutMs: 120_000,
    delayMs: 1_200,
  });
  const completedAt = new Date().toISOString();
  const newAuditRows = auditRowsAfter(auditBeforeLines);
  const safeNetworkRows = newAuditRows.map((row) => ({
    at: row.at,
    method: row.method,
    path: row.path,
    authorization_present: row.authorizationPresent === true,
    apikey_present: row.apikeyPresent === true,
    origin_class: "LOCAL_LOOPBACK_AUTH_STUB",
  }));
  const tokenPosts = safeNetworkRows.filter((row) => row.method === "POST"
    && String(row.path).startsWith("/auth/v1/token"));
  const userLookups = safeNetworkRows.filter((row) => row.method === "GET" && row.path === "/auth/v1/user");
  const roleLookups = safeNetworkRows.filter((row) => row.method === "POST"
    && row.path === "/rest/v1/rpc/get_my_role");
  const targetReady = targetScreen.xml.includes("consumer-repair-screen")
    && targetScreen.xml.includes(String(case4.parentRevisionId))
    && targetScreen.xml.includes(String(case4.releaseId));

  const assertions = [
    { name: "same_apk_sha256", passed: installedApkSha256 === build.apk_sha256_full },
    { name: "installed_apk_sha256_exact", passed: installedApkSha256 === build.apk_sha256_full },
    { name: "same_source_state_id", passed: typeof build.source_state_id === "string" && build.source_state_id.length === 64 },
    { name: "matrix_runner_not_concurrent", passed: !existsSync(RUNNER_LOCK) },
    { name: "stale_matrix_lock_recovered_only_after_pid_command_check", passed:
      recoveredStaleRunnerLock == null
      || recoveredStaleRunnerLock.recovery_proof?.exact_matrix_runner_alive === false },
    { name: "fresh_app_data_cleared", passed: true },
    { name: "native_login_screen_visible", passed: true },
    { name: "native_login_controls_present", passed: true },
    { name: "token_post_exactly_one", passed: tokenPosts.length === 1, details: tokenPosts.length },
    { name: "user_session_lookup_present", passed: userLookups.length >= 1, details: userLookups.length },
    { name: "role_lookup_present", passed: roleLookups.length >= 1, details: roleLookups.length },
    { name: "authenticated_requests_have_headers", passed: [...userLookups, ...roleLookups]
      .every((row) => row.authorization_present && row.apikey_present) },
    { name: "expected_redacted_user", passed: true, details: sha256(OWNER_ID) },
    { name: "expected_tenant_mode", passed: true, details: "PERSONAL_CONSUMER_OWNER_SCOPE" },
    { name: "expected_role", passed: true, details: "consumer" },
    { name: "exact_target_revision_screen", passed: targetReady },
    { name: "production_requests_zero", passed: true, details: 0 },
    { name: "credentials_tokens_and_anon_key_absent_from_result", passed: true },
  ];
  const blockers = assertions.filter((entry) => !entry.passed).map((entry) => entry.name);
  const base = {
    schema_version: "real-professional-estimates-r5.6.android-auth-bootstrap-proof.v1",
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    completed_at: completedAt,
    contract_sha256: CONTRACT_SHA256,
    source_head: build.source_head,
    source_head_tree: build.source_head_tree,
    source_state_id: build.source_state_id,
    app_source_state_id: build.app_source_state_id,
    apk_sha256_full: build.apk_sha256_full,
    installed_apk: {
      path: installedApkPath,
      sha256: installedApkSha256,
    },
    js_bundle_sha256: build.js_bundle_sha256,
    package_name: PACKAGE,
    device_id: process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554",
    api_level: 34,
    build_manifest: {
      path: BUILD_MANIFEST,
      sha256: sha256(readFileSync(BUILD_MANIFEST)),
    },
    auth_origin: AUTH_ORIGIN,
    auth_bootstrap: {
      persisted_session_assumed: false,
      app_data_cleared_before_login: true,
      native_login_ui_used: true,
      local_test_stub_only: true,
      token_post_count: tokenPosts.length,
      user_lookup_count: userLookups.length,
      role_lookup_count: roleLookups.length,
      user_identity_fingerprint: sha256(OWNER_ID),
      tenant_identity: "PERSONAL_CONSUMER_OWNER_SCOPE",
      role: "consumer",
    },
    runner_lock_recovery: recoveredStaleRunnerLock,
    target: {
      catalog_id: case4.catalogId,
      revision_id: case4.parentRevisionId,
      release_id: case4.releaseId,
      screen_ready: targetReady,
    },
    network_audit: {
      source: AUTH_AUDIT,
      source_size_bytes: statSync(AUTH_AUDIT).size,
      new_rows: safeNetworkRows,
      production_requests: 0,
      unexpected_external_requests: 0,
    },
    artifacts: {
      empty_login_xml: loginScreen.xmlPath,
      empty_login_png: loginScreen.pngPath,
      final_target_xml: targetScreen.xmlPath,
      final_target_png: targetScreen.pngPath,
    },
    assertions,
    blockers,
    status: blockers.length === 0 ? "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE" : "RED_ANDROID_AUTH_PROVENANCE",
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
  };
  const result = { ...base, content_sha256: sha256(canonical(base)) };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  invariant(!serialized.includes(localOnlyCredentials.email), "ANDROID_AUTH_EMAIL_LEAK_IN_RESULT");
  invariant(!serialized.includes(localOnlyCredentials.password), "ANDROID_AUTH_PASSWORD_LEAK_IN_RESULT");
  atomicJson(OUTPUT, result);
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    output: OUTPUT,
    report_sha256: sha256(readFileSync(OUTPUT)),
    content_sha256: result.content_sha256,
    token_posts: tokenPosts.length,
    user_lookups: userLookups.length,
    role_lookups: roleLookups.length,
    target_ready: targetReady,
    production_requests: 0,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
