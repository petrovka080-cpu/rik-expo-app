import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildCanonicalSourceIdentityR56 } from "../estimate/r5/canonicalSourceIdentityR56";

type Json = Record<string, any>;

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
);
const CONTRACT_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const IS_BATCH004_R56 = process.env.BATCH004_R56_PROOF_MODE === "true";
const BATCH_TOKEN = IS_BATCH004_R56 ? "BATCH004" : "BATCH003";
const BATCH_SLUG = IS_BATCH004_R56 ? "batch004" : "batch003";
const ROOT = resolve(IS_BATCH004_R56
  ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56"
  : ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56");
const BACKEND = resolve(ROOT, `backend/${BATCH_TOKEN}_BACKEND_REVISION_PARITY_R56.json`);
const MATRIX = resolve(ROOT, `matrix/${BATCH_TOKEN}_R56_ANDROID_API34_MATRIX_50_MANIFEST.json`);
const OUTPUT_DIR = resolve(ROOT, "android");
const RUNTIME = resolve(OUTPUT_DIR, "runtime");
const SOURCE_ATTESTATION = resolve(RUNTIME, `${BATCH_TOKEN}_R56_POST_BUILD_SOURCE_ATTESTATION.json`);
const OUTPUT = resolve(OUTPUT_DIR, "ANDROID_PROOF_BUILD_MANIFEST.json");
const AUTH_PROOF = resolve(OUTPUT_DIR, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const JS_BUNDLE = resolve("android/app/build/generated/assets/createBundleWaterProofJsAndAssets/index.android.bundle");
const SOURCE_MAP = resolve("android/app/build/generated/sourcemaps/react/waterProof/index.android.bundle.map");
const BUILD_LOG = resolve(RUNTIME, `${BATCH_SLUG}_r56_assemble_waterproof.log`);
const PHASE = process.env.BATCH004_R56_PROOF_MANIFEST_PHASE
  ?? process.env.BATCH003_R56_PROOF_MANIFEST_PHASE ?? "final-auth";
const EXPECTED_BACKEND = IS_BATCH004_R56
  ? { status: "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE", definitions: 393,
    revisions: 1179, children: 786, artifacts: 786, jobs: 1965, distinctCatalogs: 50 }
  : { status: "GREEN_R56_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE", definitions: 36,
    revisions: 108, children: 72, artifacts: 72, jobs: 180, distinctCatalogs: 36 };
const EXPECTED_MATRIX_STATUS = `FROZEN_R56_${BATCH_TOKEN}_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE`;
const AUTH_ORIGIN = IS_BATCH004_R56 ? "http://10.0.2.2:8187" : "http://10.0.2.2:8185";
const BACKEND_ORIGIN = IS_BATCH004_R56
  ? "http://10.0.2.2:8769/canonical-estimate" : "http://10.0.2.2:8768/canonical-estimate";
const LOCAL_PROOF_KEY = `${BATCH_SLUG}-r56-local-proof-anon-key`;
const BUILD_INPUT_PATHS = [
  "app",
  "src",
  "assets",
  "android/app/src",
  "android/app/build.gradle",
  "android/build.gradle",
  "android/gradle.properties",
  "android/settings.gradle",
  "app.json",
  "babel.config.js",
  "metro.config.js",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
] as const;

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
  invariant(["attest-source", "pending-auth", "final-auth"].includes(PHASE),
    "BATCH003_R56_BUILD_PHASE_INVALID");
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "BATCH003_R56_BUILD_CONTRACT_DRIFT");
  const backendBytes = readFileSync(BACKEND);
  const backend = JSON.parse(backendBytes.toString("utf8")) as Json;
  const matrixBytes = readFileSync(MATRIX);
  const matrix = JSON.parse(matrixBytes.toString("utf8")) as Json;
  invariant(backend.status === EXPECTED_BACKEND.status
    && backend.counts?.definitions === EXPECTED_BACKEND.definitions
    && backend.counts?.revisions === EXPECTED_BACKEND.revisions
    && backend.counts?.child_revisions === EXPECTED_BACKEND.children
    && backend.counts?.artifacts === EXPECTED_BACKEND.artifacts
    && backend.counts?.succeeded_jobs === EXPECTED_BACKEND.jobs,
  "BATCH003_R56_BUILD_BACKEND_RED");
  invariant(matrix.contract_sha256 === CONTRACT_SHA256
    && matrix.status === EXPECTED_MATRIX_STATUS
    && matrix.accepted_backend_source_state_id === backend.sourceStateId
    && matrix.app_source_component_state_id === backend.sourceStateId
    && matrix.release_id === backend.releaseId
    && matrix.cases?.length === 50
    && matrix.distinct_catalog_ids === EXPECTED_BACKEND.distinctCatalogs,
  "BATCH003_R56_BUILD_MATRIX_RED");

  const acceptedSourcePaths = (backend.sourceIdentity?.entries as Json[]).map((entry) => String(entry.path));
  const acceptedSource = buildCanonicalSourceIdentityR56({
    contractSha256: CONTRACT_SHA256,
    paths: acceptedSourcePaths,
  });
  invariant(acceptedSource.source_state_id === backend.sourceStateId
    && canonical(acceptedSource.entries) === canonical(backend.sourceIdentity.entries),
  "BATCH003_R56_ACCEPTED_BACKEND_SOURCE_DRIFT");
  const buildInputSource = buildCanonicalSourceIdentityR56({
    contractSha256: CONTRACT_SHA256,
    paths: BUILD_INPUT_PATHS,
  });

  invariant(existsSync(APK) && existsSync(JS_BUNDLE) && existsSync(SOURCE_MAP) && existsSync(BUILD_LOG),
    "BATCH003_R56_BUILD_ARTIFACT_MISSING");
  const apk = readFileSync(APK);
  const bundle = readFileSync(JS_BUNDLE);
  const sourceMap = readFileSync(SOURCE_MAP);
  const buildLogBytes = readFileSync(BUILD_LOG);
  const buildLogUtf8 = buildLogBytes.toString("utf8");
  const buildLog = buildLogUtf8.includes("BUILD SUCCESSFUL") ? buildLogUtf8 : buildLogBytes.toString("utf16le");
  invariant(buildLog.includes(":app:assembleWaterProof --rerun-tasks --no-build-cache --console=plain")
    && buildLog.includes("BUILD SUCCESSFUL")
    && !buildLog.includes("BUILD FAILED"),
  "BATCH003_R56_BUILD_GRADLE_RED");
  const bundleWrittenAtMs = statSync(JS_BUNDLE).mtimeMs;
  const sourcesAfterBundle = buildInputSource.entries.filter((entry) => statSync(resolve(entry.path)).mtimeMs > bundleWrittenAtMs);
  invariant(sourcesAfterBundle.length === 0, "BATCH003_R56_BUILD_INPUT_CHANGED_AFTER_BUNDLE");
  const sourceAttestationBase = {
    schema_version: `real-professional-estimates-r5.6.${BATCH_SLUG}-post-build-source-attestation.v1`,
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    capture_mode: "POST_BUILD_IDENTITY_CAPTURE_WITH_FILE_MTIME_BOUND",
    accepted_backend_component_state_id: backend.sourceStateId,
    build_input_source_identity: buildInputSource,
    bundle_written_at: statSync(JS_BUNDLE).mtime.toISOString(),
    apk_written_at: statSync(APK).mtime.toISOString(),
    newest_build_input_written_at: new Date(Math.max(...buildInputSource.entries
      .map((entry) => statSync(resolve(entry.path)).mtimeMs))).toISOString(),
    build_inputs_written_after_bundle: sourcesAfterBundle.length,
    source_changed_after_bundle: false,
    status: `ATTESTED_${BATCH_TOKEN}_R56_BUILD_INPUTS_PRECEDE_BUNDLE_NO_RELEASE`,
    release_performed: false,
  };
  const sourceAttestation = contentAddressed(sourceAttestationBase);
  atomicJson(SOURCE_ATTESTATION, sourceAttestation);
  if (PHASE === "attest-source") {
    process.stdout.write(`${JSON.stringify({
      status: sourceAttestation.status,
      buildInputSourceStateId: buildInputSource.source_state_id,
      output: SOURCE_ATTESTATION,
    })}\n`);
    return;
  }

  const expectedMarkers = [AUTH_ORIGIN, BACKEND_ORIGIN, LOCAL_PROOF_KEY]
    .map((marker) => ({ marker, present_in_bundle: bundle.includes(Buffer.from(marker)) }));
  invariant(expectedMarkers.every((entry) => entry.present_in_bundle), "BATCH003_R56_BUILD_LOOPBACK_MARKER_MISSING");
  const forbiddenOrigins = [
    "https://nxrnjywzxxfdpqmzjorh.supabase.co",
    "https://nxrnjywzxxfdpqmzjorh.supabase.co/functions/v1/canonical-estimate",
  ].map((origin) => ({ origin, present_in_bundle: bundle.includes(Buffer.from(origin)) }));
  invariant(forbiddenOrigins.every((entry) => !entry.present_in_bundle),
    "BATCH003_R56_BUILD_PRODUCTION_ORIGIN_PRESENT");

  const pendingAuth = PHASE === "pending-auth";
  const pendingManifestSha256 = existsSync(OUTPUT) ? sha256(readFileSync(OUTPUT)) : null;
  const auth = pendingAuth ? null : JSON.parse(readFileSync(AUTH_PROOF, "utf8")) as Json;
  if (auth) {
    invariant(auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE"
      && auth.contract_sha256 === CONTRACT_SHA256
      && auth.app_source_state_id === backend.sourceStateId
      && auth.apk_sha256_full === sha256(apk)
      && auth.build_manifest?.sha256 === pendingManifestSha256,
    "BATCH003_R56_BUILD_AUTH_IDENTITY_RED");
  }
  const base = {
    schema_version: `real-professional-estimates-r5.6.${BATCH_SLUG}-android-build-provenance.v1`,
    generated_at: new Date().toISOString(),
    status: pendingAuth ? "AUTH_RUNTIME_PROOF_PENDING_NO_RELEASE" : "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE",
    contract_sha256: CONTRACT_SHA256,
    source_head: acceptedSource.source_head,
    source_head_tree: acceptedSource.source_head_tree,
    source_index_tree: acceptedSource.source_index_tree,
    source_state_id: backend.sourceStateId,
    app_source_state_id: backend.sourceStateId,
    accepted_backend_component_state_id: backend.sourceStateId,
    build_input_source_state_id: buildInputSource.source_state_id,
    build_input_component_manifest_sha256: buildInputSource.component_manifest_sha256,
    source_changed_during_build: false,
    source_attestation: {
      path: SOURCE_ATTESTATION,
      sha256: sha256(readFileSync(SOURCE_ATTESTATION)),
      status: sourceAttestation.status,
      capture_mode: sourceAttestation.capture_mode,
    },
    backend: { path: BACKEND, sha256: sha256(backendBytes), status: backend.status },
    matrix: { path: MATRIX, sha256: sha256(matrixBytes), status: matrix.status },
    gradle_task: ":app:assembleWaterProof --rerun-tasks --no-build-cache --console=plain",
    variant: "waterProof",
    package_name: "com.azisbek_dzhantaev.rikexpoapp",
    expected_auth_origin: AUTH_ORIGIN,
    expected_backend_origin: BACKEND_ORIGIN,
    environment_contract: [
      { name: "NODE_ENV", class: "PUBLIC_BUILD_MODE", value: "production" },
      { name: "EXPO_PUBLIC_SUPABASE_URL", class: "PUBLIC_LOOPBACK_AUTH_ORIGIN", value: AUTH_ORIGIN },
      { name: "EXPO_PUBLIC_SUPABASE_ANON_KEY", class: "LOCAL_PROOF_PUBLIC_KEY", value: "[redacted]" },
      { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", class: "PUBLIC_LOOPBACK_BACKEND_ORIGIN", value: BACKEND_ORIGIN },
      { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK", class: "LOOPBACK_ONLY_POLICY", value: "true" },
    ],
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
    acceptedBackendComponentStateId: backend.sourceStateId,
    buildInputSourceStateId: buildInputSource.source_state_id,
    apkSha256: sha256(apk),
    output: OUTPUT,
  })}\n`);
}

main();
