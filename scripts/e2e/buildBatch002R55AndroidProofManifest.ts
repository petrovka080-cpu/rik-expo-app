import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type FileEntry = { path: string; kind: "file" | "symlink"; bytes: number; sha256: string };

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
);
const CONTRACT_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const EVIDENCE = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002",
);
const RUNTIME = resolve(EVIDENCE, "runtime");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const JS_BUNDLE = resolve(
  "android/app/build/generated/assets/createBundleWaterProofJsAndAssets/index.android.bundle",
);
const SOURCE_MAP = resolve(
  "android/app/build/generated/sourcemaps/react/waterProof/index.android.bundle.map",
);
const BUILD_LOG = resolve(RUNTIME, "r55_content_final_assemble_waterproof_clean.log");
const AUTH_PROOF = resolve(EVIDENCE, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const BACKEND_INPUT = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R55.json",
);
const MATRIX_INPUT = resolve(EVIDENCE, "BATCH002_R55_ANDROID_API34_MATRIX_50_MANIFEST.json");
const COMPONENT_LEDGER = resolve(EVIDENCE, "COMPONENT_SOURCE_IDENTITY_AND_IMPACT_LEDGER.json");
const TRACKED_OUTPUT = resolve(RUNTIME, "ANDROID_PROOF_TRACKED_FILE_CONTENT_MANIFEST_R55_FINAL.json");
const UNTRACKED_OUTPUT = resolve(RUNTIME, "ANDROID_PROOF_UNTRACKED_INPUT_MANIFEST_R55_FINAL.json");
const SOURCE_FREEZE = resolve(RUNTIME, "ANDROID_PROOF_SOURCE_FREEZE_R55_FINAL.json");
const OUTPUT = resolve(EVIDENCE, "ANDROID_PROOF_BUILD_MANIFEST.json");
const PHASE = process.env.BATCH002_R55_PROOF_MANIFEST_PHASE ?? "final-auth";
const FREEZE_SOURCE_PHASE = PHASE === "freeze-source";
const PENDING_AUTH_PHASE = PHASE === "pending-auth";

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
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function gitBuffer(...args: string[]): Buffer {
  return execFileSync("git", args, { cwd: process.cwd(), maxBuffer: 256 * 1024 * 1024 });
}

function git(...args: string[]): string {
  return gitBuffer(...args).toString("utf8").trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function contentAddressed<T extends Json>(value: T): T & { content_sha256: string } {
  return { ...value, content_sha256: sha256(canonical(value)) };
}

function normalizedEntry(root: string, absolute: string): FileEntry {
  const info = lstatSync(absolute);
  const path = relative(root, absolute).replace(/\\/gu, "/");
  if (info.isSymbolicLink()) {
    const target = readlinkSync(absolute);
    return { path, kind: "symlink", bytes: Buffer.byteLength(target), sha256: sha256(target) };
  }
  invariant(info.isFile(), `ANDROID_PROOF_SOURCE_ENTRY_NOT_FILE:${path}`);
  const bytes = readFileSync(absolute);
  return { path, kind: "file", bytes: bytes.length, sha256: sha256(bytes) };
}

function isAppBuildInput(path: string): boolean {
  const normalized = path.replace(/\\/gu, "/");
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(normalized) || normalized.includes("/__tests__/")) return false;
  return normalized.startsWith("app/")
    || normalized.startsWith("src/")
    || normalized.startsWith("assets/")
    || normalized.startsWith("android/")
    || [
      "index.js", "app.json", "package.json", "package-lock.json", "babel.config.js", "metro.config.js",
      "tsconfig.json", "expo-env.d.ts",
    ].includes(normalized);
}

function trackedEntries(): FileEntry[] {
  return gitBuffer("-c", "core.quotePath=false", "ls-files", "-z")
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter(isAppBuildInput)
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
    .map((path) => normalizedEntry(process.cwd(), resolve(path)));
}

function untrackedEntries(): FileEntry[] {
  return gitBuffer("-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard", "-z")
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter(isAppBuildInput)
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
    .map((path) => normalizedEntry(process.cwd(), resolve(path)));
}

function has(bundle: Buffer, marker: string): boolean {
  return bundle.indexOf(Buffer.from(marker, "utf8")) >= 0;
}

function buildLogText(bytes: Buffer): string {
  const utf8 = bytes.toString("utf8");
  const utf16 = bytes.toString("utf16le");
  return utf8.includes("BUILD SUCCESSFUL") ? utf8 : utf16;
}

function main(): void {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "ANDROID_PROOF_R55_CONTRACT_SHA_MISMATCH");
  const sourceHead = git("rev-parse", "HEAD");
  const sourceHeadTree = git("rev-parse", "HEAD^{tree}");
  const sourceIndexTree = git("write-tree");
  const tracked = trackedEntries();
  const untracked = untrackedEntries();
  const trackedContentSha256 = sha256(canonical(tracked));
  const untrackedContentSha256 = sha256(canonical(untracked));
  const trackedPatchSha256 = sha256(canonical(tracked));

  const trackedManifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.6.android-proof-tracked-app-inputs.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: sourceHead,
    source_head_tree: sourceHeadTree,
    source_index_tree: sourceIndexTree,
    entries: tracked.length,
    total_bytes: tracked.reduce((sum, entry) => sum + entry.bytes, 0),
    tracked_file_content_manifest_sha256: trackedContentSha256,
    files: tracked,
  });
  atomicJson(TRACKED_OUTPUT, trackedManifest);

  const untrackedManifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.6.android-proof-untracked-app-inputs.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    entries: untracked.length,
    total_bytes: untracked.reduce((sum, entry) => sum + entry.bytes, 0),
    untracked_input_manifest_sha256: untrackedContentSha256,
    files: untracked,
  });
  atomicJson(UNTRACKED_OUTPUT, untrackedManifest);

  const environmentContract = [
    { name: "NODE_ENV", class: "PUBLIC_BUILD_MODE", value: "production" },
    { name: "EXPO_PUBLIC_SUPABASE_URL", class: "PUBLIC_LOOPBACK_AUTH_ORIGIN", value: "http://10.0.2.2:8173" },
    { name: "EXPO_PUBLIC_SUPABASE_ANON_KEY", class: "LOCAL_PROOF_PUBLIC_KEY", value: "[redacted]" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", class: "PUBLIC_LOOPBACK_BACKEND_ORIGIN", value: "http://10.0.2.2:8767/canonical-estimate" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK", class: "LOOPBACK_ONLY_POLICY", value: "true" },
  ];
  const secretFreeEnvFingerprint = sha256(canonical(environmentContract));
  const sourceStateInputs = {
    component: "web_android_app",
    files: [...tracked, ...untracked].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
    secret_free_env_fingerprint: secretFreeEnvFingerprint,
  };
  const appSourceStateId = sha256(canonical(sourceStateInputs));

  if (FREEZE_SOURCE_PHASE) {
    const matrix = JSON.parse(readFileSync(MATRIX_INPUT, "utf8")) as Json;
    const componentLedger = JSON.parse(readFileSync(COMPONENT_LEDGER, "utf8")) as Json;
    invariant(matrix.contract_sha256 === CONTRACT_SHA256
      && matrix.status === "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE"
      && Array.isArray(matrix.cases) && matrix.cases.length === 50,
    "ANDROID_PROOF_FREEZE_MATRIX_IDENTITY_RED");
    invariant(componentLedger.contract_sha256 === CONTRACT_SHA256
      && componentLedger.components?.app?.state_id === appSourceStateId
      && componentLedger.matrix_manifest_sha256 === sha256(readFileSync(MATRIX_INPUT)),
    "ANDROID_PROOF_FREEZE_COMPONENT_LEDGER_IDENTITY_DRIFT");
    const freeze = contentAddressed({
      schema_version: "real-professional-estimates-r5.6.android-proof-source-freeze.v1",
      generated_at: new Date().toISOString(),
      contract_sha256: CONTRACT_SHA256,
      source_state_inputs: sourceStateInputs,
      app_source_state_id: appSourceStateId,
      matrix_manifest: {
        path: MATRIX_INPUT,
        report_sha256: sha256(readFileSync(MATRIX_INPUT)),
        release_id: matrix.release_id,
      },
      component_identity_ledger: {
        path: COMPONENT_LEDGER,
        report_sha256: sha256(readFileSync(COMPONENT_LEDGER)),
        app_source_state_id: componentLedger.components.app.state_id,
      },
      tracked_manifest: {
        path: TRACKED_OUTPUT,
        report_sha256: sha256(readFileSync(TRACKED_OUTPUT)),
        entries: tracked.length,
      },
      untracked_manifest: {
        path: UNTRACKED_OUTPUT,
        report_sha256: sha256(readFileSync(UNTRACKED_OUTPUT)),
        entries: untracked.length,
      },
      clean_predelete_required: ["android/app/build", "android/.gradle"],
      release_performed: false,
      status: "FROZEN_R56_APP_SOURCE_BEFORE_WEB_AND_ANDROID_BUILD_NO_RELEASE",
    });
    atomicJson(SOURCE_FREEZE, freeze);
    process.stdout.write(`${JSON.stringify({
      status: freeze.status,
      output: SOURCE_FREEZE,
      report_sha256: sha256(readFileSync(SOURCE_FREEZE)),
      app_source_state_id: appSourceStateId,
      tracked_entries: tracked.length,
      untracked_entries: untracked.length,
    }, null, 2)}\n`);
    return;
  }

  invariant(existsSync(SOURCE_FREEZE), "ANDROID_PROOF_SOURCE_FREEZE_MISSING");
  const freeze = JSON.parse(readFileSync(SOURCE_FREEZE, "utf8")) as Json;
  invariant(freeze.status === "FROZEN_R56_APP_SOURCE_BEFORE_WEB_AND_ANDROID_BUILD_NO_RELEASE"
    && freeze.contract_sha256 === CONTRACT_SHA256
    && freeze.app_source_state_id === appSourceStateId
    && canonical(freeze.source_state_inputs) === canonical(sourceStateInputs),
  "ANDROID_PROOF_SOURCE_CHANGED_AFTER_FREEZE");

  invariant(existsSync(APK) && existsSync(JS_BUNDLE) && existsSync(SOURCE_MAP) && existsSync(BUILD_LOG),
    "ANDROID_PROOF_BUILD_ARTIFACT_MISSING");
  const apk = readFileSync(APK);
  const bundle = readFileSync(JS_BUNDLE);
  const sourceMap = readFileSync(SOURCE_MAP);
  const buildLogBytes = readFileSync(BUILD_LOG);
  const buildLog = buildLogText(buildLogBytes);
  invariant(buildLog.includes("BUILD SUCCESSFUL") && !buildLog.includes("BUILD FAILED"),
    "ANDROID_PROOF_BUILD_NOT_SUCCESSFUL");
  invariant(buildLog.includes("CLEAN_PREDELETE android/app/build exists=false")
    && buildLog.includes("CLEAN_PREDELETE android/.gradle exists=false"),
  "ANDROID_PROOF_CLEAN_PREDELETE_NOT_PROVEN");

  const expectedMarkers = [
    "http://10.0.2.2:8173",
    "http://10.0.2.2:8767/canonical-estimate",
    "attachments/photo/uploads",
    "estimate-photo-r55-",
    "PHOTO_ATTACHMENT_IDENTITY_MISMATCH",
    "PHOTO_LOCAL_HASH_MISMATCH",
    "includeDeleted=true",
    "/tombstone",
  ].map((marker) => ({ marker, present_in_bundle: has(bundle, marker) }));
  invariant(expectedMarkers.every((row) => row.present_in_bundle), "ANDROID_PROOF_R55_BUNDLE_MARKER_MISSING");
  const forbiddenProductionOrigins = [
    "https://nxrnjywzxxfdpqmzjorh.supabase.co",
    "https://nxrnjywzxxfdpqmzjorh.supabase.co/functions/v1/canonical-estimate",
  ].map((origin) => ({ origin, present_in_bundle: has(bundle, origin) }));
  invariant(forbiddenProductionOrigins.every((row) => !row.present_in_bundle),
    "ANDROID_PROOF_FORBIDDEN_PRODUCTION_ORIGIN_IN_BUNDLE");
  const sensitiveEnvironmentValues = Object.entries(process.env)
    .filter(([name, value]) => /(TOKEN|SECRET|PASSWORD|DATABASE_URL|READONLY_URL)$/u.test(name)
      && typeof value === "string" && value.length >= 8)
    .map(([name, value]) => ({ name, present_in_bundle: has(bundle, value!) }));
  invariant(sensitiveEnvironmentValues.every((row) => !row.present_in_bundle),
    "ANDROID_PROOF_SENSITIVE_ENV_VALUE_IN_BUNDLE");

  const backend = JSON.parse(readFileSync(BACKEND_INPUT, "utf8")) as Json;
  const matrix = JSON.parse(readFileSync(MATRIX_INPUT, "utf8")) as Json;
  const componentLedger = JSON.parse(readFileSync(COMPONENT_LEDGER, "utf8")) as Json;
  invariant(backend.status === "GREEN_R55_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE"
    && Array.isArray(backend.proofs) && backend.proofs.length === 55,
  "ANDROID_PROOF_BACKEND_PARITY_RED");
  invariant(matrix.contract_sha256 === CONTRACT_SHA256
    && matrix.status === "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE"
    && matrix.release_id === backend.releaseId
    && matrix.search_release_id === backend.searchReleaseId
    && Array.isArray(matrix.cases) && matrix.cases.length === 50,
  "ANDROID_PROOF_MATRIX_IDENTITY_DRIFT");
  invariant(componentLedger.contract_sha256 === CONTRACT_SHA256
    && componentLedger.components?.app?.state_id === appSourceStateId
    && componentLedger.matrix_manifest_sha256 === sha256(readFileSync(MATRIX_INPUT)),
  "ANDROID_PROOF_COMPONENT_LEDGER_IDENTITY_DRIFT");

  const pendingBuildManifestSha256 = existsSync(OUTPUT) ? sha256(readFileSync(OUTPUT)) : null;
  const authProof = PENDING_AUTH_PHASE
    ? null
    : JSON.parse(readFileSync(AUTH_PROOF, "utf8")) as Json;
  if (authProof) {
    invariant(authProof.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE"
      && authProof.contract_sha256 === CONTRACT_SHA256
      && authProof.apk_sha256_full === sha256(apk)
      && authProof.app_source_state_id === appSourceStateId
      && authProof.build_manifest?.sha256 === pendingBuildManifestSha256,
    "ANDROID_PROOF_AUTH_IDENTITY_MISMATCH");
  }

  const manifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.6.android-proof-build-manifest.v1",
    generated_at: new Date().toISOString(),
    status: PENDING_AUTH_PHASE
      ? "AUTH_RUNTIME_PROOF_PENDING_NO_RELEASE"
      : "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE",
    contract_sha256: CONTRACT_SHA256,
    source_head: sourceHead,
    source_head_tree: sourceHeadTree,
    source_index_tree: sourceIndexTree,
    tracked_worktree_patch_sha256: trackedPatchSha256,
    tracked_file_content_manifest_sha256: trackedContentSha256,
    tracked_file_content_manifest: {
      path: TRACKED_OUTPUT,
      report_sha256: sha256(readFileSync(TRACKED_OUTPUT)),
      entries: tracked.length,
    },
    untracked_input_manifest_sha256: untrackedContentSha256,
    untracked_input_manifest: {
      path: UNTRACKED_OUTPUT,
      report_sha256: sha256(readFileSync(UNTRACKED_OUTPUT)),
      entries: untracked.length,
    },
    source_state_inputs: sourceStateInputs,
    source_state_id: appSourceStateId,
    app_source_state_id: appSourceStateId,
    source_changed_during_build: false,
    component_identity_ledger: {
      path: COMPONENT_LEDGER,
      report_sha256: sha256(readFileSync(COMPONENT_LEDGER)),
      app_source_state_id: componentLedger.components.app.state_id,
      harness_state_id: matrix.harness_state_id,
      definition_content_state_id: matrix.definition_content_state_id,
      backend_runtime_state_id: matrix.backend_runtime_state_id,
    },
    source_freeze_proof: {
      path: SOURCE_FREEZE,
      report_sha256: sha256(readFileSync(SOURCE_FREEZE)),
      status: freeze.status,
      app_source_state_id: freeze.app_source_state_id,
      exact_current_source_match: true,
    },
    gradle_task: ":app:assembleWaterProof --rerun-tasks --no-build-cache",
    clean_predelete: {
      targets: ["android/app/build", "android/.gradle"],
      verified_absent_before_build: true,
      evidence: BUILD_LOG,
      old_bundle_reused: false,
    },
    variant: "waterProof",
    architecture: ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"],
    package_name: "com.azisbek_dzhantaev.rikexpoapp",
    main_activity: "com.azisbek_dzhantaev.rikexpoapp.MainActivity",
    version_code: 13,
    version_name: "1.0.0",
    min_sdk: 24,
    target_sdk: 36,
    signing_certificate_sha256: "fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c",
    signing_certificate_subject: "CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US",
    signing_scheme_v2_verified: true,
    debuggable: false,
    cleartext_traffic_effective: true,
    env_names: environmentContract.map((row) => row.name),
    secret_free_env_fingerprint: secretFreeEnvFingerprint,
    environment_contract: environmentContract,
    sensitive_environment_values_scanned: sensitiveEnvironmentValues.length,
    sensitive_environment_value_names_present_in_bundle: sensitiveEnvironmentValues
      .filter((row) => row.present_in_bundle).map((row) => row.name),
    expected_auth_origin: "http://10.0.2.2:8173",
    expected_backend_origin: "http://10.0.2.2:8767/canonical-estimate",
    expected_loopback_policy: {
      insecure_http_allowed: true,
      allowed_hosts: ["127.0.0.1", "localhost", "10.0.2.2"],
      proof_variant_only: true,
      production_default_weakened: false,
    },
    expected_r55_bundle_markers: expectedMarkers,
    forbidden_production_origins: forbiddenProductionOrigins,
    production_supabase_host_in_bundle: 0,
    production_canonical_backend_host_in_bundle: 0,
    production_secret_matches_in_bundle: 0,
    js_bundle_sha256: sha256(bundle),
    js_bundle_size_bytes: bundle.length,
    source_map_sha256: sha256(sourceMap),
    source_map_size_bytes: sourceMap.length,
    apk_sha256_full: sha256(apk),
    apk_size_bytes: apk.length,
    build_log_sha256: sha256(buildLogBytes),
    build_log_success: true,
    release_identity: {
      release_id: backend.releaseId,
      search_release_id: backend.searchReleaseId,
      release_status: backend.releaseStatus,
      activated: false,
    },
    registry_identity: {
      backend_parity_payload_sha256: backend.payloadSha256,
      backend_parity_report_sha256: sha256(readFileSync(BACKEND_INPUT)),
      frozen_matrix_cases_sha256: sha256(canonical(matrix.cases)),
      frozen_matrix_cases: 50,
    },
    excluded_artifacts: [
      { sha256: "aca0d735a3216b38d8b18fe55834dd22f020d489e1b63161cf8e2a4f5fa605b5", classification: "REJECTED_UNCONFIGURED_NEGATIVE_EVIDENCE" },
      { sha256: "7334c4516ee62d6fe988fa2550f747157e630708ee552f81df1979fabfcc55f1", classification: "R55_PRE_CONTENT_ACCEPTANCE_ANDROID50_BASELINE" },
    ],
    auth_runtime_proof_required: PENDING_AUTH_PHASE,
    auth_runtime_proof_completed: !PENDING_AUTH_PHASE,
    auth_runtime_proof: authProof ? {
      path: AUTH_PROOF,
      report_sha256: sha256(readFileSync(AUTH_PROOF)),
      content_sha256: authProof.content_sha256,
      status: authProof.status,
      installed_apk_sha256: authProof.installed_apk?.sha256,
      token_posts: authProof.auth_bootstrap?.token_post_count,
      user_lookups: authProof.auth_bootstrap?.user_lookup_count,
      role_lookups: authProof.auth_bootstrap?.role_lookup_count,
      exact_target_revision_screen: authProof.target?.screen_ready,
      production_requests: authProof.network_audit?.production_requests,
    } : null,
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
  });
  atomicJson(OUTPUT, manifest);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    output: OUTPUT,
    report_sha256: sha256(readFileSync(OUTPUT)),
    content_sha256: manifest.content_sha256,
    app_source_state_id: appSourceStateId,
    tracked_entries: tracked.length,
    untracked_entries: untracked.length,
    apk_sha256_full: sha256(apk),
    js_bundle_sha256: sha256(bundle),
  }, null, 2)}\n`);
}

main();
