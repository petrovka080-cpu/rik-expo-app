import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type FileRow = {
  path: string;
  bytes: number;
  sha256: string;
  harness: boolean;
  audit_tool: boolean;
  sql_migration: boolean;
  lockfile: boolean;
};

const ROOT = resolve(".");
const OUTPUT = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU.md");
const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const PARENT_MANIFEST = resolve(
  ".release-runtime/real-useful-estimates-r3/evidence/r3-3-closeout/06_CURRENT_PRODUCT_SOURCE_MANIFEST_R33.json",
);

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: string[], buffer = false): string | Buffer {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: buffer ? "buffer" : "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  }) as string | Buffer;
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isProductSource(path: string): boolean {
  if (/^(?:\.release-runtime|artifacts)(?:\/|$)/u.test(path)) return false;
  if (/^(?:node_modules|\.expo|coverage|dist|web-build|build)(?:\/|$)/u.test(path)) return false;
  if (/(?:^|\/)(?:node_modules|\.gradle(?:-[^/]*)?|build(?:-[^/]*)?|\.cxx|coverage|dist|web-build)(?:\/|$)/u.test(path)) return false;
  if (/^(?:\.tmp|tmp)(?:_|\/|$)/u.test(path)) return false;
  return true;
}

function aggregate(rows: FileRow[]): Json {
  const sorted = [...rows].sort((left, right) => left.path.localeCompare(right.path));
  const serialized = `${sorted.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n")}\n`;
  return { files: sorted.length, bytes: sorted.reduce((sum, row) => sum + row.bytes, 0), sha256: sha256(serialized) };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fileProof(path: string): Json {
  const bytes = readFileSync(path);
  return { path: normalize(relative(ROOT, path)), bytes: bytes.length, sha256: sha256(bytes) };
}

function main(): void {
  if (!existsSync(MASTER) || sha256(readFileSync(MASTER)) !== MASTER_SHA256) throw new Error("R4_MASTER_IDENTITY_RED");
  const parent = JSON.parse(readFileSync(PARENT_MANIFEST, "utf8")) as Json;
  const trackedDeletions = String(git(["diff", "--name-only", "--diff-filter=D"]))
    .split(/\r?\n/u).map(normalize).filter(Boolean).sort();
  const deletionSet = new Set(trackedDeletions);
  const repositoryPaths = (git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"], true) as Buffer)
    .toString("utf8").split("\0").map(normalize).filter(Boolean).sort();
  const rows: FileRow[] = [];
  const missingPaths: string[] = [];
  for (const path of repositoryPaths) {
    if (!isProductSource(path)) continue;
    const absolute = resolve(ROOT, path);
    if (!existsSync(absolute)) {
      if (!deletionSet.has(path)) missingPaths.push(path);
      continue;
    }
    const bytes = readFileSync(absolute);
    rows.push({
      path,
      bytes: statSync(absolute).size,
      sha256: sha256(bytes),
      harness: /^(?:maestro|scripts\/e2e|scripts\/release|tests\/e2e|tests\/android|android\/app\/src\/androidTest)(?:\/|$)/u.test(path),
      audit_tool: /^(?:scripts\/architecture|scripts\/estimate|tests\/architecture|tests\/estimateBackend)(?:\/|$)/u.test(path),
      sql_migration: /^supabase\/(?:migrations|rollback)\/.*\.sql$/u.test(path),
      lockfile: /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|deno\.lock)$/u.test(path),
    });
  }
  const sorted = rows.sort((left, right) => left.path.localeCompare(right.path));
  const parentByPath = new Map((parent.files as Json[]).map((row) => [String(row.path), row]));
  const currentByPath = new Map(sorted.map((row) => [row.path, row]));
  const addedPaths = sorted.filter((row) => !parentByPath.has(row.path)).map((row) => row.path);
  const removedPaths = (parent.files as Json[]).filter((row) => !currentByPath.has(String(row.path))).map((row) => String(row.path));
  const changedPaths = sorted.filter((row) => {
    const previous = parentByPath.get(row.path);
    return previous && (previous.sha256 !== row.sha256 || Number(previous.bytes) !== row.bytes);
  }).map((row) => row.path);
  const product = aggregate(sorted);
  const manifest = {
    schema_version: "master-r4.current-product-source-manifest.v1",
    generated_at_utc: new Date().toISOString(),
    master_contract_sha256: MASTER_SHA256,
    source_root: normalize(ROOT),
    policy: {
      included: "tracked and non-ignored untracked product/config/script/test/sql/lock inputs",
      excluded: ["evidence", "generated outputs", "node_modules", "build caches", "coverage", "dist", "temporary files"],
      evidence_in_product_hash: false,
    },
    aggregates: {
      product_source: product,
      harness_source: aggregate(sorted.filter((row) => row.harness)),
      audit_tools: aggregate(sorted.filter((row) => row.audit_tool)),
      sql_migrations: aggregate(sorted.filter((row) => row.sql_migration)),
      lockfiles: aggregate(sorted.filter((row) => row.lockfile)),
    },
    predecessor: {
      path: normalize(relative(ROOT, PARENT_MANIFEST)),
      sha256: sha256(readFileSync(PARENT_MANIFEST)),
      product_source_sha256: parent.aggregates.product_source.sha256,
      added_paths: addedPaths,
      removed_paths: removedPaths,
      changed_paths: changedPaths,
    },
    tracked_deletions: trackedDeletions,
    missing_paths: missingPaths,
    files: sorted,
  };
  const manifestPath = resolve(OUTPUT, "12_CURRENT_PRODUCT_SOURCE_MANIFEST_R4.json");
  writeJson(manifestPath, manifest);
  const statusLines = String(git(["status", "--porcelain=v2", "--branch", "--untracked-files=all"]))
    .split(/\r?\n/u).filter(Boolean).sort();
  const identity = {
    schema_version: "master-r4.current-source-identity.v1",
    generated_at_utc: new Date().toISOString(),
    status: missingPaths.length === 0 ? "R4_CURRENT_SOURCE_IDENTITY_GREEN" : "R4_CURRENT_SOURCE_IDENTITY_RED",
    master_contract_sha256: MASTER_SHA256,
    exact_product_source_sha256: product.sha256,
    source_parent: {
      sealed_r3_source_sha256: parent.aggregates.product_source.sha256,
      changed_paths_since_r3: changedPaths.length,
      added_paths_since_r3: addedPaths.length,
      removed_paths_since_r3: removedPaths.length,
    },
    git: {
      worktree: normalize(ROOT),
      branch: String(git(["branch", "--show-current"])).trim(),
      head: String(git(["rev-parse", "HEAD"])).trim(),
      tree: String(git(["write-tree"])).trim(),
      dirty_worktree_preserved: true,
      sorted_status_sha256: sha256(`${statusLines.join("\n")}\n`),
    },
    current_revalidation: {
      algorithm: "sorted path NUL bytes NUL sha256 LF aggregate",
      files: product.files,
      bytes: product.bytes,
      missing_paths: missingPaths.length,
      source_drift_from_sealed_r3: addedPaths.length + removedPaths.length + changedPaths.length,
    },
    artifacts: { product_manifest: fileProof(manifestPath) },
    production_accessed: false,
    production_mutated: false,
    deploy_performed: false,
    release_performed: false,
    global_status: "R4_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    tool: fileProof(resolve("scripts/estimate/r4/captureR4CurrentSource.ts")),
  };
  const identityPath = resolve(OUTPUT, "13_CURRENT_SOURCE_IDENTITY_R4.json");
  writeJson(identityPath, identity);
  process.stdout.write(`${JSON.stringify({ status: identity.status, exact_product_source_sha256: product.sha256,
    product_files: product.files, product_bytes: product.bytes, changed: changedPaths.length,
    added: addedPaths.length, removed: removedPaths.length, missing: missingPaths.length,
    identity: fileProof(identityPath) }, null, 2)}\n`);
  if (missingPaths.length > 0) process.exitCode = 1;
}

main();
