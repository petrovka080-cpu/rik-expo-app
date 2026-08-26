import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildCanonicalSourceIdentityR56,
  CANONICAL_R56_DEFAULT_SOURCE_PATHS,
} from "../estimate/r5/canonicalSourceIdentityR56";

type Json = Record<string, any>;

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
);
const CONTRACT_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56");
const BACKEND = resolve(ROOT, "backend/BATCH001_BACKEND_REVISION_PARITY_R56.json");
const MATRIX = resolve(ROOT, "matrix/BATCH001_R56_ANDROID_API34_MATRIX_50_MANIFEST.json");
const OUTPUT_DIR = resolve(ROOT, "android");
const RUNTIME = resolve(OUTPUT_DIR, "runtime");
const FREEZE = resolve(RUNTIME, "BATCH001_R56_SOURCE_FREEZE.json");
const OUTPUT = resolve(OUTPUT_DIR, "ANDROID_PROOF_BUILD_MANIFEST.json");
const AUTH_PROOF = resolve(OUTPUT_DIR, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const JS_BUNDLE = resolve("android/app/build/generated/assets/createBundleWaterProofJsAndAssets/index.android.bundle");
const SOURCE_MAP = resolve("android/app/build/generated/sourcemaps/react/waterProof/index.android.bundle.map");
const BUILD_LOG = resolve(RUNTIME, "batch001_r56_assemble_waterproof_clean.log");
const PHASE = process.env.BATCH001_R56_PROOF_MANIFEST_PHASE ?? "final-auth";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
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

function contentAddressed(value: Json): Json {
  return { ...value, content_sha256: sha256(canonical(value)) };
}

function main(): void {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "BATCH001_R56_BUILD_CONTRACT_DRIFT");
  const source = buildCanonicalSourceIdentityR56({
    contractSha256: CONTRACT_SHA256,
    paths: CANONICAL_R56_DEFAULT_SOURCE_PATHS,
  });
  const backendBytes = readFileSync(BACKEND);
  const backend = JSON.parse(backendBytes.toString("utf8")) as Json;
  const matrixBytes = readFileSync(MATRIX);
  const matrix = JSON.parse(matrixBytes.toString("utf8")) as Json;
  invariant(backend.status === "GREEN_R56_BATCH001_ISOLATED_BACKEND_PARITY_NO_RELEASE"
    && backend.sourceStateId === source.source_state_id
    && backend.counts?.definitions === 16
    && backend.counts?.revisions === 48
    && backend.counts?.child_revisions === 32
    && backend.counts?.artifacts === 32
    && backend.counts?.succeeded_jobs === 80,
  "BATCH001_R56_BUILD_BACKEND_IDENTITY_RED");
  invariant(matrix.contract_sha256 === CONTRACT_SHA256
    && matrix.status === "FROZEN_R56_BATCH001_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
    && matrix.app_source_component_state_id === source.source_state_id
    && matrix.release_id === backend.releaseId
    && matrix.cases?.length === 50,
  "BATCH001_R56_BUILD_MATRIX_IDENTITY_RED");

  if (PHASE === "freeze-source") {
    const freeze = contentAddressed({
      schema_version: "real-professional-estimates-r5.6.batch001-source-freeze.v1",
      generated_at: new Date().toISOString(),
      contract_sha256: CONTRACT_SHA256,
      source_identity: source,
      source_state_id: source.source_state_id,
      backend: { path: BACKEND, sha256: sha256(backendBytes), release_id: backend.releaseId },
      matrix: { path: MATRIX, sha256: sha256(matrixBytes), cases: matrix.cases.length },
      connection_audit: matrix.connection_audit,
      clean_predelete_required: ["android/app/build", "android/.gradle"],
      status: "FROZEN_R56_BATCH001_SOURCE_BEFORE_WEB_AND_ANDROID_NO_RELEASE",
      release_performed: false,
    });
    atomicJson(FREEZE, freeze);
    process.stdout.write(`${JSON.stringify({ status: freeze.status, sourceStateId: source.source_state_id, output: FREEZE })}\n`);
    return;
  }

  invariant(existsSync(FREEZE), "BATCH001_R56_BUILD_SOURCE_FREEZE_MISSING");
  const freeze = JSON.parse(readFileSync(FREEZE, "utf8")) as Json;
  invariant(freeze.status === "FROZEN_R56_BATCH001_SOURCE_BEFORE_WEB_AND_ANDROID_NO_RELEASE"
    && freeze.source_state_id === source.source_state_id
    && canonical(freeze.source_identity) === canonical(source),
  "BATCH001_R56_BUILD_SOURCE_CHANGED_AFTER_FREEZE");
  invariant(existsSync(APK) && existsSync(JS_BUNDLE) && existsSync(SOURCE_MAP) && existsSync(BUILD_LOG),
    "BATCH001_R56_BUILD_ARTIFACT_MISSING");
  const apk = readFileSync(APK);
  const bundle = readFileSync(JS_BUNDLE);
  const sourceMap = readFileSync(SOURCE_MAP);
  const buildLogBytes = readFileSync(BUILD_LOG);
  const buildLogUtf8 = buildLogBytes.toString("utf8");
  const buildLog = buildLogUtf8.includes("BUILD SUCCESSFUL") ? buildLogUtf8 : buildLogBytes.toString("utf16le");
  invariant(buildLog.includes("BUILD SUCCESSFUL") && !buildLog.includes("BUILD FAILED"),
    "BATCH001_R56_BUILD_GRADLE_RED");
  invariant(buildLog.includes("CLEAN_PREDELETE android/app/build exists=false")
    && buildLog.includes("CLEAN_PREDELETE android/.gradle exists=false"),
  "BATCH001_R56_BUILD_CLEAN_PREDELETE_UNPROVEN");
  const expectedMarkers = [
    "http://10.0.2.2:8173",
    "http://10.0.2.2:8767/canonical-estimate",
  ].map((marker) => ({ marker, present_in_bundle: bundle.includes(Buffer.from(marker)) }));
  invariant(expectedMarkers.every((entry) => entry.present_in_bundle), "BATCH001_R56_BUILD_LOOPBACK_MARKER_MISSING");
  const forbiddenOrigins = [
    "https://nxrnjywzxxfdpqmzjorh.supabase.co",
    "https://nxrnjywzxxfdpqmzjorh.supabase.co/functions/v1/canonical-estimate",
  ].map((origin) => ({ origin, present_in_bundle: bundle.includes(Buffer.from(origin)) }));
  invariant(forbiddenOrigins.every((entry) => !entry.present_in_bundle), "BATCH001_R56_BUILD_PRODUCTION_ORIGIN_PRESENT");

  const pendingManifestSha256 = existsSync(OUTPUT) ? sha256(readFileSync(OUTPUT)) : null;
  const pendingAuth = PHASE === "pending-auth";
  const auth = pendingAuth ? null : JSON.parse(readFileSync(AUTH_PROOF, "utf8")) as Json;
  if (auth) {
    invariant(auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE"
      && auth.contract_sha256 === CONTRACT_SHA256
      && auth.app_source_state_id === source.source_state_id
      && auth.apk_sha256_full === sha256(apk)
      && auth.build_manifest?.sha256 === pendingManifestSha256,
    "BATCH001_R56_BUILD_AUTH_IDENTITY_RED");
  }
  const environmentContract = [
    { name: "NODE_ENV", class: "PUBLIC_BUILD_MODE", value: "production" },
    { name: "EXPO_PUBLIC_SUPABASE_URL", class: "PUBLIC_LOOPBACK_AUTH_ORIGIN", value: "http://10.0.2.2:8173" },
    { name: "EXPO_PUBLIC_SUPABASE_ANON_KEY", class: "LOCAL_PROOF_PUBLIC_KEY", value: "[redacted]" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", class: "PUBLIC_LOOPBACK_BACKEND_ORIGIN", value: "http://10.0.2.2:8767/canonical-estimate" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK", class: "LOOPBACK_ONLY_POLICY", value: "true" },
  ];
  const base = {
    schema_version: "real-professional-estimates-r5.6.batch001-android-build-provenance.v1",
    generated_at: new Date().toISOString(),
    status: pendingAuth ? "AUTH_RUNTIME_PROOF_PENDING_NO_RELEASE" : "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE",
    contract_sha256: CONTRACT_SHA256,
    source_head: source.source_head,
    source_head_tree: source.source_head_tree,
    source_index_tree: source.source_index_tree,
    source_state_id: source.source_state_id,
    app_source_state_id: source.source_state_id,
    component_manifest_sha256: source.component_manifest_sha256,
    source_changed_during_build: false,
    source_freeze: { path: FREEZE, sha256: sha256(readFileSync(FREEZE)), status: freeze.status },
    backend: { path: BACKEND, sha256: sha256(backendBytes), status: backend.status },
    matrix: { path: MATRIX, sha256: sha256(matrixBytes), status: matrix.status },
    gradle_task: ":app:assembleWaterProof --rerun-tasks --no-build-cache",
    clean_predelete: { targets: ["android/app/build", "android/.gradle"], verified_absent_before_build: true },
    variant: "waterProof",
    package_name: "com.azisbek_dzhantaev.rikexpoapp",
    expected_auth_origin: "http://10.0.2.2:8173",
    expected_backend_origin: "http://10.0.2.2:8767/canonical-estimate",
    environment_contract: environmentContract,
    expected_bundle_markers: expectedMarkers,
    forbidden_production_origins: forbiddenOrigins,
    apk_sha256_full: sha256(apk),
    apk_size_bytes: apk.length,
    js_bundle_sha256: sha256(bundle),
    js_bundle_size_bytes: bundle.length,
    source_map_sha256: sha256(sourceMap),
    source_map_size_bytes: sourceMap.length,
    build_log_sha256: sha256(buildLogBytes),
    build_log_success: true,
    release_identity: {
      release_id: backend.releaseId,
      search_release_id: backend.searchReleaseId,
      release_status: backend.releaseStatus,
      activated: false,
    },
    auth_runtime_proof_required: pendingAuth,
    auth_runtime_proof_completed: !pendingAuth,
    auth_runtime_proof: auth ? { path: AUTH_PROOF, sha256: sha256(readFileSync(AUTH_PROOF)), status: auth.status } : null,
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
  };
  const manifest = contentAddressed(base);
  atomicJson(OUTPUT, manifest);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    appSourceStateId: source.source_state_id,
    apkSha256: sha256(apk),
    output: OUTPUT,
  })}\n`);
}

main();
