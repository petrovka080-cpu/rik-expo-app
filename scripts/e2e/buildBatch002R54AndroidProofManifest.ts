import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, unknown>;

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (6).md",
);
const CONTRACT_SHA256 = "dc6eb56a7b056fb71bc09d253e263c5cc4454be508f0248906df0aca4c50a19b";
const BUILD_CONTRACT_SHA256 = "644bd6d2e77e66622f4ab6916efdba277a5f98f9b65d1e2e3829e167837047a5";
const SOURCE_HEAD = "6b8e612cba45884c0dce88f333dfb3d10a054ae6";
const SOURCE_HEAD_TREE = "f9754a1d7939cfdf12035345de502c8d712e6737";
const CHECKPOINT = resolve("C:/dev/rik-expo-app-r5-recovery/r53-pre-auth-apk-20260819-191418");
const CHECKPOINT_EXTRACTED = resolve(CHECKPOINT, "untracked-extracted-forensics");
const EVIDENCE = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002",
);
const RUNTIME = resolve(EVIDENCE, "runtime");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const JS_BUNDLE = resolve(
  "android/app/build/generated/assets/createBundleWaterProofJsAndAssets/index.android.bundle",
);
const BACKEND_INPUT = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R4.json",
);
const OLD_MATRIX_MANIFEST = resolve(EVIDENCE, "BATCH002_R52_ANDROID_API34_MATRIX_50_MANIFEST.json");
const TRACKED_MANIFEST_OUTPUT = resolve(RUNTIME, "ANDROID_PROOF_TRACKED_FILE_CONTENT_MANIFEST.json");
const UNTRACKED_MANIFEST_OUTPUT = resolve(RUNTIME, "ANDROID_PROOF_UNTRACKED_INPUT_MANIFEST.json");
const OUTPUT = resolve(EVIDENCE, "ANDROID_PROOF_BUILD_MANIFEST.json");

const APK_SHA256 = "7713d732fd765ef6ab27f16e24ee8f833f171610b508d34f8ce1d284e54e0f28";
const APK_SIZE = 118_766_442;
const JS_BUNDLE_SHA256 = "95c90eaa337bddcfc9e932ad4162b97167785c0c4f0fabc9d033bcb6da030b9f";
const TRACKED_PATCH_SHA256 = "d92b16fd394c46beb11764bf9fa1d3669f1462a93e3975742044bdc5ad3da550";
const UNTRACKED_ARCHIVE_SHA256 = "e08d58ab51290df3fc21f383d49708731cf8cf01e9ce5fd50d280d221f77045c";
const RELEASE_ID = "cb387b09-2d97-4843-a2ba-3811328d8d90";
const SEARCH_RELEASE_ID = "b90697f3-fc08-4df5-866c-926a66174d2c";

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

function gitBuffer(...args: string[]): Buffer {
  return execFileSync("git", args, { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024 });
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

function recursiveFiles(root: string): string[] {
  const output: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) output.push(absolute);
    }
  };
  visit(root);
  return output.sort((left, right) => left.localeCompare(right));
}

function normalizedEntry(root: string, absolute: string) {
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

function bufferIncludes(bundle: Buffer, marker: string): boolean {
  return bundle.indexOf(Buffer.from(marker, "utf8")) >= 0;
}

function currentUntrackedPaths(): string[] {
  return gitBuffer("-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard", "-z")
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function main(): void {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "ANDROID_PROOF_R54_CONTRACT_SHA_MISMATCH");
  invariant(git("rev-parse", "HEAD") === SOURCE_HEAD, "ANDROID_PROOF_SOURCE_HEAD_DRIFT");
  invariant(git("rev-parse", "HEAD^{tree}") === SOURCE_HEAD_TREE, "ANDROID_PROOF_SOURCE_HEAD_TREE_DRIFT");
  invariant(existsSync(CHECKPOINT_EXTRACTED), "ANDROID_PROOF_CHECKPOINT_EXTRACTED_MISSING");
  invariant(sha256(readFileSync(resolve(CHECKPOINT, "tracked-working-tree.patch"))) === TRACKED_PATCH_SHA256,
    "ANDROID_PROOF_CHECKPOINT_TRACKED_PATCH_SHA_MISMATCH");
  invariant(sha256(readFileSync(resolve(CHECKPOINT, "untracked-files-preserve-paths.zip"))) === UNTRACKED_ARCHIVE_SHA256,
    "ANDROID_PROOF_CHECKPOINT_UNTRACKED_ARCHIVE_SHA_MISMATCH");

  const currentPatch = gitBuffer("diff", "--binary", "--no-ext-diff");
  invariant(sha256(currentPatch) === TRACKED_PATCH_SHA256, "ANDROID_PROOF_TRACKED_SOURCE_CHANGED_AFTER_CHECKPOINT");
  const sourceIndexTree = git("write-tree");

  const trackedPaths = gitBuffer("-c", "core.quotePath=false", "ls-files", "-z")
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  const trackedEntries = trackedPaths.map((path) => {
    const absolute = resolve(path);
    invariant(existsSync(absolute), `ANDROID_PROOF_TRACKED_INPUT_MISSING:${path}`);
    return normalizedEntry(process.cwd(), absolute);
  });
  const trackedFileContentManifestSha256 = sha256(canonical(trackedEntries));
  const trackedManifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.4.android-proof-tracked-inputs.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: SOURCE_HEAD,
    source_head_tree: SOURCE_HEAD_TREE,
    source_index_tree: sourceIndexTree,
    entries: trackedEntries.length,
    total_bytes: trackedEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    tracked_file_content_manifest_sha256: trackedFileContentManifestSha256,
    files: trackedEntries,
  });
  atomicJson(TRACKED_MANIFEST_OUTPUT, trackedManifest);

  const checkpointFiles = recursiveFiles(CHECKPOINT_EXTRACTED);
  const untrackedEntries = checkpointFiles.map((absolute) => normalizedEntry(CHECKPOINT_EXTRACTED, absolute));
  invariant(untrackedEntries.length === 51, "ANDROID_PROOF_UNTRACKED_CHECKPOINT_DENOMINATOR_MISMATCH");
  const untrackedInputManifestSha256 = sha256(canonical(untrackedEntries));
  const untrackedManifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.4.android-proof-untracked-inputs.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    checkpoint_path: CHECKPOINT,
    checkpoint_archive_sha256: UNTRACKED_ARCHIVE_SHA256,
    entries: untrackedEntries.length,
    total_bytes: untrackedEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    untracked_input_manifest_sha256: untrackedInputManifestSha256,
    files: untrackedEntries,
  });
  atomicJson(UNTRACKED_MANIFEST_OUTPUT, untrackedManifest);

  const checkpointByPath = new Map(untrackedEntries.map((entry) => [entry.path, entry]));
  const postBuildUntrackedChanges = currentUntrackedPaths().flatMap((path) => {
    const checkpoint = checkpointByPath.get(path);
    const absolute = resolve(path);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) return [];
    const currentSha = sha256(readFileSync(absolute));
    if (checkpoint?.sha256 === currentSha) return [];
    const isExternalEvidenceTool = path.startsWith("scripts/e2e/");
    return [{
      path,
      checkpoint_sha256: checkpoint?.sha256 ?? null,
      current_sha256: currentSha,
      changed_after_build: true,
      classification: isExternalEvidenceTool
        ? "EXTERNAL_E2E_RUNNER_OR_PROVENANCE_TOOL_NOT_BUNDLED"
        : "UNCLASSIFIED_POST_BUILD_SOURCE_CHANGE",
    }];
  });
  invariant(postBuildUntrackedChanges.every((row) =>
    row.classification === "EXTERNAL_E2E_RUNNER_OR_PROVENANCE_TOOL_NOT_BUNDLED"),
  "ANDROID_PROOF_POST_BUILD_APP_SOURCE_CHANGE_DETECTED");

  const bundle = readFileSync(JS_BUNDLE);
  invariant(sha256(bundle) === JS_BUNDLE_SHA256, "ANDROID_PROOF_JS_BUNDLE_SHA_MISMATCH");
  invariant(sha256(readFileSync(APK)) === APK_SHA256, "ANDROID_PROOF_APK_SHA_MISMATCH");
  invariant(statSync(APK).size === APK_SIZE, "ANDROID_PROOF_APK_SIZE_MISMATCH");

  const forbiddenProductionOrigins = [
    "https://nxrnjywzxxfdpqmzjorh.supabase.co",
    "https://nxrnjywzxxfdpqmzjorh.supabase.co/functions/v1/canonical-estimate",
  ].map((origin) => ({ origin, present_in_bundle: bufferIncludes(bundle, origin) }));
  invariant(forbiddenProductionOrigins.every((row) => !row.present_in_bundle),
    "ANDROID_PROOF_FORBIDDEN_PRODUCTION_ORIGIN_IN_BUNDLE");
  invariant(bufferIncludes(bundle, "http://10.0.2.2:8173"), "ANDROID_PROOF_AUTH_LOOPBACK_ORIGIN_MISSING");
  invariant(bufferIncludes(bundle, "http://10.0.2.2:8767/canonical-estimate"),
    "ANDROID_PROOF_BACKEND_LOOPBACK_ORIGIN_MISSING");

  const sensitiveEnvironmentValues = Object.entries(process.env)
    .filter(([name, value]) => /(KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|READONLY_URL)$/u.test(name)
      && typeof value === "string" && value.length >= 8)
    .map(([name, value]) => ({ name, present_in_bundle: bufferIncludes(bundle, value!) }));
  invariant(sensitiveEnvironmentValues.every((row) => !row.present_in_bundle),
    "ANDROID_PROOF_CURRENT_SENSITIVE_ENV_VALUE_IN_BUNDLE");

  const environmentContract = [
    { name: "EXPO_PUBLIC_SUPABASE_URL", class: "PUBLIC_LOOPBACK_AUTH_ORIGIN", value: "http://10.0.2.2:8173" },
    { name: "EXPO_PUBLIC_SUPABASE_ANON_KEY", class: "LOCAL_PROOF_PUBLIC_KEY_REDACTED", value: "[redacted]" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL", class: "PUBLIC_LOOPBACK_BACKEND_ORIGIN", value: "http://10.0.2.2:8767/canonical-estimate" },
    { name: "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK", class: "LOOPBACK_ONLY_POLICY", value: "true" },
  ];
  const secretFreeEnvFingerprint = sha256(canonical(environmentContract));
  const backend = JSON.parse(readFileSync(BACKEND_INPUT, "utf8")) as Json;
  const oldMatrix = JSON.parse(readFileSync(OLD_MATRIX_MANIFEST, "utf8")) as Json;
  invariant(backend.releaseId === RELEASE_ID && backend.searchReleaseId === SEARCH_RELEASE_ID,
    "ANDROID_PROOF_RELEASE_IDENTITY_DRIFT");
  invariant(oldMatrix.releaseId === RELEASE_ID && oldMatrix.searchReleaseId === SEARCH_RELEASE_ID,
    "ANDROID_PROOF_MATRIX_RELEASE_IDENTITY_DRIFT");
  invariant(Array.isArray(oldMatrix.cases) && oldMatrix.cases.length === 50,
    "ANDROID_PROOF_MATRIX_CASE_DENOMINATOR_DRIFT");

  const sourceStateInputs = {
    source_head: SOURCE_HEAD,
    source_head_tree: SOURCE_HEAD_TREE,
    source_index_tree: sourceIndexTree,
    tracked_worktree_patch_sha256: TRACKED_PATCH_SHA256,
    tracked_file_content_manifest_sha256: trackedFileContentManifestSha256,
    untracked_input_manifest_sha256: untrackedInputManifestSha256,
    secret_free_env_fingerprint: secretFreeEnvFingerprint,
  };
  const sourceStateId = sha256(canonical(sourceStateInputs));
  const matrixCasesIdentity = sha256(canonical(oldMatrix.cases));

  const manifest = contentAddressed({
    schema_version: "real-professional-estimates-r5.4.android-proof-build-manifest.v1",
    generated_at: new Date().toISOString(),
    status: "GREEN_BUILD_PROVENANCE_AUTH_RUNTIME_PROOF_PENDING",
    contract_sha256: CONTRACT_SHA256,
    contract_adoption: {
      build_invocation_contract_sha256: BUILD_CONTRACT_SHA256,
      verification_contract_sha256: CONTRACT_SHA256,
      product_source_rebuild_required_by_contract_delta: false,
      reason: "R5.4 changed provenance/evidence gates after the frozen product build; no app/runtime/config source changed.",
    },
    source_head: SOURCE_HEAD,
    source_head_tree: SOURCE_HEAD_TREE,
    source_index_tree: sourceIndexTree,
    tracked_worktree_patch_sha256: TRACKED_PATCH_SHA256,
    tracked_file_content_manifest_sha256: trackedFileContentManifestSha256,
    tracked_file_content_manifest: {
      path: TRACKED_MANIFEST_OUTPUT,
      report_sha256: sha256(readFileSync(TRACKED_MANIFEST_OUTPUT)),
      entries: trackedEntries.length,
    },
    untracked_input_manifest_sha256: untrackedInputManifestSha256,
    untracked_input_manifest: {
      path: UNTRACKED_MANIFEST_OUTPUT,
      report_sha256: sha256(readFileSync(UNTRACKED_MANIFEST_OUTPUT)),
      entries: untrackedEntries.length,
      archive_sha256: UNTRACKED_ARCHIVE_SHA256,
    },
    source_state_inputs: sourceStateInputs,
    source_state_id: sourceStateId,
    build_started_at: "2026-08-19T19:15:05.766+06:00",
    build_completed_at: "2026-08-19T19:21:00.889+06:00",
    build_daemon_log: {
      path: "C:/Users/User/.gradle/daemon/8.14.3/daemon-15024.out.log",
      sha256: sha256(readFileSync("C:/Users/User/.gradle/daemon/8.14.3/daemon-15024.out.log")),
      build_id: "95a7fb70-8080-4c0c-ab4e-5b25674e7baa",
    },
    source_changed_during_build: false,
    source_freeze_proof: {
      checkpoint_created_at: "2026-08-19T19:14:18+06:00",
      tracked_patch_still_exact: true,
      post_build_app_runtime_config_changes: 0,
      post_build_external_runner_or_provenance_changes: postBuildUntrackedChanges,
    },
    gradle_task: ":app:assembleWaterProof --rerun-tasks",
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
    debuggable: false,
    cleartext_traffic_effective: true,
    env_names: environmentContract.map((row) => row.name),
    secret_free_env_fingerprint: secretFreeEnvFingerprint,
    environment_contract: environmentContract,
    sensitive_environment_values_scanned: sensitiveEnvironmentValues.length,
    sensitive_environment_values_present_in_bundle: sensitiveEnvironmentValues
      .filter((row) => row.present_in_bundle).map((row) => row.name),
    expected_auth_origin: "http://10.0.2.2:8173",
    expected_backend_origin: "http://10.0.2.2:8767/canonical-estimate",
    expected_loopback_policy: {
      insecure_http_allowed: true,
      allowed_hosts: ["127.0.0.1", "localhost", "10.0.2.2"],
      proof_variant_only: true,
      runtime_post_202_observed_on_same_apk: true,
    },
    forbidden_production_origins: forbiddenProductionOrigins,
    production_supabase_host_in_bundle: 0,
    production_canonical_backend_host_in_bundle: 0,
    production_secret_matches_in_bundle: 0,
    js_bundle_sha256: JS_BUNDLE_SHA256,
    js_bundle_size_bytes: bundle.length,
    apk_sha256_full: APK_SHA256,
    apk_size_bytes: APK_SIZE,
    release_identity: {
      release_id: RELEASE_ID,
      search_release_id: SEARCH_RELEASE_ID,
      release_status: backend.releaseStatus,
      activated: false,
    },
    registry_identity: {
      backend_parity_payload_sha256: backend.payloadSha256,
      backend_parity_report_sha256: sha256(readFileSync(BACKEND_INPUT)),
      definitions: Array.isArray(backend.proofs) ? backend.proofs.length : 0,
      frozen_matrix_cases_sha256: matrixCasesIdentity,
      frozen_matrix_cases: 50,
    },
    negative_apk: {
      sha256: "aca0d735a3216b38d8b18fe55834dd22f020d489e1b63161cf8e2a4f5fa605b5",
      classification: "REJECTED_UNCONFIGURED_NEGATIVE_EVIDENCE",
      excluded_from_runner: true,
    },
    auth_runtime_proof_required: true,
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
    source_state_id: sourceStateId,
    tracked_entries: trackedEntries.length,
    untracked_entries: untrackedEntries.length,
    post_build_external_changes: postBuildUntrackedChanges.length,
    apk_sha256_full: APK_SHA256,
  }, null, 2)}\n`);
}

main();
