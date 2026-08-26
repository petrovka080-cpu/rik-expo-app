import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const CONTRACT = resolve(
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (6).md",
);
const CONTRACT_SHA256 = "dc6eb56a7b056fb71bc09d253e263c5cc4454be508f0248906df0aca4c50a19b";
const EVIDENCE = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002",
);
const PREDECESSOR = resolve(EVIDENCE, "BATCH002_R52_ANDROID_API34_MATRIX_50_MANIFEST.json");
const BUILD = resolve(EVIDENCE, "ANDROID_PROOF_BUILD_MANIFEST.json");
const AUTH = resolve(EVIDENCE, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const OUTPUT = resolve(EVIDENCE, "BATCH002_R54_ANDROID_API34_MATRIX_50_MANIFEST.json");

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

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function main(): void {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "BATCH002_R54_MATRIX_CONTRACT_SHA_MISMATCH");
  const predecessor = JSON.parse(readFileSync(PREDECESSOR, "utf8")) as Json;
  const build = JSON.parse(readFileSync(BUILD, "utf8")) as Json;
  const auth = JSON.parse(readFileSync(AUTH, "utf8")) as Json;
  const head = git("rev-parse", "HEAD");
  const headTree = git("rev-parse", "HEAD^{tree}");

  invariant(build.contract_sha256 === CONTRACT_SHA256, "BATCH002_R54_MATRIX_BUILD_CONTRACT_MISMATCH");
  invariant(build.source_head === head && build.source_head_tree === headTree,
    "BATCH002_R54_MATRIX_BUILD_SOURCE_MISMATCH");
  invariant(auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE",
    "BATCH002_R54_MATRIX_AUTH_PROOF_RED");
  invariant(auth.contract_sha256 === CONTRACT_SHA256, "BATCH002_R54_MATRIX_AUTH_CONTRACT_MISMATCH");
  invariant(auth.source_state_id === build.source_state_id, "BATCH002_R54_MATRIX_AUTH_SOURCE_STATE_MISMATCH");
  invariant(auth.apk_sha256_full === build.apk_sha256_full
    && auth.installed_apk?.sha256 === build.apk_sha256_full,
  "BATCH002_R54_MATRIX_AUTH_APK_MISMATCH");
  invariant(Array.isArray(predecessor.cases) && predecessor.cases.length === 50,
    "BATCH002_R54_MATRIX_CASE_DENOMINATOR_MISMATCH");
  invariant(new Set(predecessor.cases.map((entry: Json) => Number(entry.case))).size === 50,
    "BATCH002_R54_MATRIX_DUPLICATE_CASE_NUMBER");
  invariant(new Set(predecessor.cases.map((entry: Json) => String(entry.catalogId))).size === 50,
    "BATCH002_R54_MATRIX_DUPLICATE_CATALOG_ID");
  const casesContentSha256 = sha256(canonical(predecessor.cases));
  invariant(casesContentSha256 === build.registry_identity?.frozen_matrix_cases_sha256,
    "BATCH002_R54_MATRIX_FROZEN_CASES_IDENTITY_MISMATCH");
  invariant(predecessor.releaseId === build.release_identity?.release_id,
    "BATCH002_R54_MATRIX_RELEASE_MISMATCH");
  invariant(predecessor.searchReleaseId === build.release_identity?.search_release_id,
    "BATCH002_R54_MATRIX_SEARCH_RELEASE_MISMATCH");

  const base = {
    schema_version: "real-professional-estimates-r5.4.batch002-android-api34-matrix50-manifest.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: CONTRACT_SHA256,
    source_head: head,
    source_head_tree: headTree,
    source_state_id: build.source_state_id,
    apk_sha256_full: build.apk_sha256_full,
    js_bundle_sha256: build.js_bundle_sha256,
    build_manifest: { path: BUILD, sha256: sha256(readFileSync(BUILD)), status: build.status },
    auth_proof: { path: AUTH, sha256: sha256(readFileSync(AUTH)), status: auth.status },
    predecessor_manifest: {
      path: PREDECESSOR,
      sha256: sha256(readFileSync(PREDECESSOR)),
      contract_sha256: predecessor.masterSha256,
      use: "FROZEN_CASE_DEFINITIONS_ONLY",
    },
    release_id: predecessor.releaseId,
    search_release_id: predecessor.searchReleaseId,
    expected: 50,
    distinct_catalog_ids: 50,
    android_api_level: 34,
    sample_frozen_before_execution: true,
    cases_content_sha256: casesContentSha256,
    required_coverage: predecessor.requiredCoverage,
    cases: predecessor.cases,
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "GREEN_R54_BATCH002_ANDROID_MATRIX_50_MANIFEST_FROZEN_NO_RELEASE",
  };
  const result = { ...base, content_sha256: sha256(canonical(base)) };
  atomicJson(OUTPUT, result);
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    output: OUTPUT,
    report_sha256: sha256(readFileSync(OUTPUT)),
    content_sha256: result.content_sha256,
    cases_content_sha256: casesContentSha256,
    expected: result.expected,
    distinct_catalog_ids: result.distinct_catalog_ids,
  }, null, 2)}\n`);
}

main();
