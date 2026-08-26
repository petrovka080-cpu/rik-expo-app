import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const ROOT = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");
const ARCHIVE = join(ROOT, "source-owner-rebind-r4", "before-batch-005-public-language-fix");
const CURRENT_MANIFEST = join(ROOT, "12_CURRENT_PRODUCT_SOURCE_MANIFEST_R4.json");
const CURRENT_IDENTITY = join(ROOT, "13_CURRENT_SOURCE_IDENTITY_R4.json");
const CURRENT_WEB_BUILD = join(ROOT, "14_WEB_PRODUCTION_BUILD_R4.json");
const CURRENT_ANDROID_BUILD = join(ROOT, "15_ANDROID_NORMAL_APK_R4.json");
const OUTPUT = join(ROOT, "16_SOURCE_OWNER_REBIND_R4.json");
const SHA256_RE = /^[0-9a-f]{64}$/u;

function argument(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? "";
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  invariant(existsSync(path), `R4_SOURCE_REBIND_PARENT_MISSING:${path}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function proof(path: string): Json {
  const bytes = readFileSync(path);
  return { path: resolve(path).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function archivePath(name: string): string {
  return join(ARCHIVE, name);
}

function snapshot(): void {
  mkdirSync(ARCHIVE, { recursive: true });
  const sources = [
    [CURRENT_MANIFEST, "12_PRODUCT_SOURCE_MANIFEST_BEFORE_R4.json"],
    [CURRENT_IDENTITY, "13_SOURCE_IDENTITY_BEFORE_R4.json"],
    [CURRENT_WEB_BUILD, "14_WEB_BUILD_BEFORE_R4.json"],
    [CURRENT_ANDROID_BUILD, "15_ANDROID_BUILD_BEFORE_R4.json"],
  ] as const;
  for (const [source, name] of sources) {
    invariant(existsSync(source), `R4_SOURCE_REBIND_SNAPSHOT_PARENT_MISSING:${source}`);
    copyFileSync(source, archivePath(name));
  }
  const identity = readJson(archivePath("13_SOURCE_IDENTITY_BEFORE_R4.json"));
  const web = readJson(archivePath("14_WEB_BUILD_BEFORE_R4.json"));
  const android = readJson(archivePath("15_ANDROID_BUILD_BEFORE_R4.json"));
  invariant(SHA256_RE.test(String(identity.exact_product_source_sha256)), "R4_SOURCE_REBIND_OLD_SOURCE_RED");
  invariant(web.exact_product_source_sha256 === identity.exact_product_source_sha256
    && android.exact_product_source_sha256 === identity.exact_product_source_sha256,
  "R4_SOURCE_REBIND_OLD_BUILD_BINDING_RED");
  atomicJson(archivePath("00_SNAPSHOT_R4.json"), {
    contract: "rik-expo-app-r4.source-owner-rebind-snapshot.v1",
    status: "GREEN_SOURCE_OWNER_REBIND_SNAPSHOT",
    master_sha256: MASTER_SHA256,
    source_sha: identity.exact_product_source_sha256,
    web_build_sha: web.aggregate?.sha256,
    android_apk_sha: android.apk?.sha256,
    parents: sources.map(([, name]) => proof(archivePath(name))),
    production_accessed: false,
  });
  process.stdout.write(`${JSON.stringify({ status: "GREEN_SOURCE_OWNER_REBIND_SNAPSHOT",
    source_sha: identity.exact_product_source_sha256, archive: ARCHIVE.replaceAll("\\", "/") }, null, 2)}\n`);
}

function finalize(): void {
  const oldManifestPath = archivePath("12_PRODUCT_SOURCE_MANIFEST_BEFORE_R4.json");
  const oldIdentityPath = archivePath("13_SOURCE_IDENTITY_BEFORE_R4.json");
  const oldWebPath = archivePath("14_WEB_BUILD_BEFORE_R4.json");
  const oldAndroidPath = archivePath("15_ANDROID_BUILD_BEFORE_R4.json");
  const oldManifest = readJson(oldManifestPath);
  const oldIdentity = readJson(oldIdentityPath);
  const oldWeb = readJson(oldWebPath);
  const oldAndroid = readJson(oldAndroidPath);
  const currentManifest = readJson(CURRENT_MANIFEST);
  const currentIdentity = readJson(CURRENT_IDENTITY);
  const oldSourceSha = String(oldIdentity.exact_product_source_sha256);
  const currentSourceSha = String(currentIdentity.exact_product_source_sha256);
  invariant(SHA256_RE.test(oldSourceSha) && SHA256_RE.test(currentSourceSha) && oldSourceSha !== currentSourceSha,
    "R4_SOURCE_REBIND_SOURCE_PAIR_RED");
  const oldFiles = new Map((oldManifest.files as Json[]).map((row) => [String(row.path), row]));
  const currentFiles = new Map((currentManifest.files as Json[]).map((row) => [String(row.path), row]));
  const added = [...currentFiles.keys()].filter((path) => !oldFiles.has(path)).sort();
  const removed = [...oldFiles.keys()].filter((path) => !currentFiles.has(path)).sort();
  const changed = [...currentFiles.keys()].filter((path) => {
    const before = oldFiles.get(path);
    return before && before.sha256 !== currentFiles.get(path)?.sha256;
  }).sort();
  const expectedRuntimeImpact = [
    "src/lib/estimate/v4/domains/electricalComplete/maximumResourceScopeV2.ts",
  ];
  const runtimeImpact = changed.filter((path) => path.startsWith("app/") || path.startsWith("src/")
    || path.startsWith("supabase/functions/"));
  invariant(removed.length === 0, `R4_SOURCE_REBIND_UNEXPECTED_REMOVAL:${removed.join(",")}`);
  invariant(runtimeImpact.length === expectedRuntimeImpact.length
    && runtimeImpact.every((path, index) => path === expectedRuntimeImpact[index]),
  `R4_SOURCE_REBIND_RUNTIME_SCOPE_RED:${runtimeImpact.join(",")}`);
  const harnessOrTestOnly = [...added, ...changed].filter((path) => !runtimeImpact.includes(path));
  invariant(harnessOrTestOnly.every((path) => path.startsWith("scripts/") || path.startsWith("tests/")),
    `R4_SOURCE_REBIND_NON_HARNESS_DRIFT:${harnessOrTestOnly.join(",")}`);
  const oldBuildBinding = {
    source_sha: oldSourceSha,
    web_build_sha: String(oldWeb.aggregate?.sha256 ?? ""),
    android_apk_sha: String(oldAndroid.apk?.sha256 ?? ""),
  };
  invariant(Object.values(oldBuildBinding).every((value) => SHA256_RE.test(value)), "R4_SOURCE_REBIND_OLD_HASH_RED");
  const payload = {
    contract: "rik-expo-app-r4.source-owner-rebind.v1",
    status: "GREEN_SCOPED_SOURCE_OWNER_REBIND",
    master_sha256: MASTER_SHA256,
    rule: "R4 section 16: completed cases remain valid when exact hashes and evidence are retained and their owner is unchanged",
    before: oldBuildBinding,
    after: { source_sha: currentSourceSha },
    drift: {
      added_paths: added,
      changed_paths: changed,
      removed_paths: removed,
      runtime_owner_paths: runtimeImpact,
      harness_or_test_paths: harnessOrTestOnly,
    },
    owner_impact: {
      changed_content_owner: "BATCH-005/electricalComplete/maximumResourceScopeV2",
      changed_batches: ["BATCH-005"],
      unchanged_surface_case_batches_rebound: ["BATCH-001", "BATCH-002", "BATCH-003", "BATCH-004"],
      unchanged_backend_batches_rebound: ["BATCH-001", "BATCH-002", "BATCH-003", "BATCH-004", "BATCH-006", "BATCH-007", "BATCH-008"],
      rerun_required: ["BATCH-005_BACKEND", "BATCH-005_WEB", "BATCH-005_ANDROID_API34"],
    },
    invariants: {
      unchanged_owner_cases_not_repeated: true,
      changed_owner_cases_must_use_after_source_and_builds: true,
      exact_old_source_and_build_hashes_preserved: true,
      production_accessed: false,
    },
    parents: [oldManifestPath, oldIdentityPath, oldWebPath, oldAndroidPath, CURRENT_MANIFEST, CURRENT_IDENTITY]
      .map((path) => proof(path)),
    production_accessed: false,
  };
  atomicJson(OUTPUT, { ...payload, payload_sha256: sha256(JSON.stringify(payload)) });
  process.stdout.write(`${JSON.stringify({ status: payload.status, before: oldSourceSha, after: currentSourceSha,
    changed, added, removed, output: OUTPUT.replaceAll("\\", "/") }, null, 2)}\n`);
}

if (argument("phase") === "snapshot") snapshot();
else if (argument("phase") === "finalize") finalize();
else throw new Error("R4_SOURCE_REBIND_PHASE_REQUIRED:snapshot|finalize");
