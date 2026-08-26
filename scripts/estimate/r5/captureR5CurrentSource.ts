import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type FileRow = {
  path: string;
  bytes: number;
  sha256: string;
  class: "product" | "native" | "script" | "test" | "migration" | "configuration";
  tracked: boolean;
};

const ROOT = resolve(".");
const OUTPUT = resolve(".release-runtime/r5/evidence");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R5_PRODUCTION_GRADE_CONTINUOUS_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_BATCH001_008_RU.md");
const MASTER_SHA256 = "45352facf763cd0c628a3e0c8b8bc882821928da5b8eeb9caa386b76e07a3c43";

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

function includedSource(path: string): boolean {
  if (/^(?:\.release-runtime|artifacts|diagnostics|coverage|dist|web-build|build|tmp)(?:\/|$)/u.test(path)) return false;
  if (/^\.tmp(?:_|\/|$)/u.test(path)) return false;
  if (/(?:^|\/)(?:node_modules|\.gradle(?:-[^/]*)?|build(?:-[^/]*)?|\.cxx|coverage|dist|web-build|generated\/sourcemaps)(?:\/|$)/u.test(path)) return false;
  if (/\.(?:apk|aab|class|dex|so|png\.tmp)$/iu.test(path)) return false;
  return /^(?:app|src|components|assets|android|scripts|tests|supabase|types|verification|docs)(?:\/|$)/u.test(path)
    || /^(?:package(?:-lock)?\.json|app\.json|app\.config\.(?:js|ts)|babel\.config\.(?:js|ts)|metro\.config\.(?:js|ts)|tsconfig[^/]*\.json|expo-env\.d\.ts|index\.js|App\.tsx)$/u.test(path);
}

function fileClass(path: string): FileRow["class"] {
  if (path.startsWith("tests/")) return "test";
  if (path.startsWith("scripts/")) return "script";
  if (path.startsWith("supabase/migrations/")) return "migration";
  if (path.startsWith("android/")) return "native";
  if (/^(?:package|app\.|babel\.|metro\.|tsconfig|expo-env|index\.)/u.test(path)) return "configuration";
  return "product";
}

function stableRowsHash(rows: FileRow[]): string {
  return sha256(`${rows.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}`).join("\n")}\n`);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fileProof(path: string) {
  const bytes = readFileSync(path);
  return { path: normalize(relative(ROOT, path)), bytes: bytes.length, sha256: sha256(bytes) };
}

function main(): void {
  if (!existsSync(MASTER) || sha256(readFileSync(MASTER)) !== MASTER_SHA256) {
    throw new Error("R5_MASTER_IDENTITY_RED");
  }
  const stageArg = process.argv.find((value) => value.startsWith("--stage="))?.slice(8) ?? "before";
  if (stageArg !== "before" && stageArg !== "after") throw new Error("R5_SOURCE_STAGE_INVALID");
  const tracked = new Set(
    (git(["ls-files", "-z"], true) as Buffer).toString("utf8").split("\0").map(normalize).filter(Boolean),
  );
  const paths = (git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"], true) as Buffer)
    .toString("utf8").split("\0").map(normalize).filter(Boolean).filter(includedSource).sort();
  const trackedDeletions = String(git(["diff", "--name-only", "--diff-filter=D"]))
    .split(/\r?\n/u).map(normalize).filter(Boolean).sort();
  const deletionSet = new Set(trackedDeletions);
  const missingPaths: string[] = [];
  const rows: FileRow[] = [];
  for (const path of paths) {
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
      class: fileClass(path),
      tracked: tracked.has(path),
    });
  }
  rows.sort((left, right) => left.path.localeCompare(right.path));
  const statusLines = String(git(["status", "--porcelain=v2", "--branch", "--untracked-files=all"]))
    .split(/\r?\n/u).filter(Boolean).sort();
  const aggregate = {
    files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    sha256: stableRowsHash(rows),
    trackedFiles: rows.filter((row) => row.tracked).length,
    untrackedFiles: rows.filter((row) => !row.tracked).length,
  };
  const manifest = {
    schemaVersion: "r5-source-manifest.v1",
    generatedUtc: new Date().toISOString(),
    stage: stageArg,
    masterSha256: MASTER_SHA256,
    commandIdentity: `tsx scripts/estimate/r5/captureR5CurrentSource.ts --stage=${stageArg}`,
    sourceRoot: normalize(ROOT),
    sourceHead: String(git(["rev-parse", "HEAD"])).trim(),
    sourceBranch: String(git(["branch", "--show-current"])).trim(),
    gitIndexTree: String(git(["write-tree"])).trim(),
    dirtyWorktreePreserved: true,
    sortedStatusSha256: sha256(`${statusLines.join("\n")}\n`),
    aggregate,
    classes: Object.fromEntries(
      (["product", "native", "script", "test", "migration", "configuration"] as const).map((kind) => {
        const selected = rows.filter((row) => row.class === kind);
        return [kind, { files: selected.length, bytes: selected.reduce((sum, row) => sum + row.bytes, 0), sha256: stableRowsHash(selected) }];
      }),
    ),
    exclusions: [
      "evidence and artifacts",
      "node_modules",
      "Android/Gradle build and .cxx outputs",
      "coverage/dist/web-build",
      "temporary paths",
    ],
    trackedDeletions,
    missingPaths,
    files: rows,
    denominator: rows.length,
    passed: missingPaths.length === 0 ? rows.length : rows.length - missingPaths.length,
    failed: missingPaths.length,
    skipped: 0,
    failures: missingPaths,
    blockers: [],
    fakeGreenClaimed: false,
    productionAccessed: false,
    productionDeployed: false,
    productionReleased: false,
  };
  const manifestPath = resolve(OUTPUT, stageArg === "before" ? "01_R5_SOURCE_MANIFEST_BEFORE.json" : "02_R5_SOURCE_MANIFEST_AFTER.json");
  writeJson(manifestPath, manifest);
  if (stageArg === "before") {
    const statePath = resolve(OUTPUT, "00_R5_EXECUTION_STATE.json");
    writeJson(statePath, {
      schemaVersion: "r5-execution-state.v1",
      generatedUtc: new Date().toISOString(),
      masterSha256: MASTER_SHA256,
      status: "R5_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
      currentPhase: "PHASE_3_OFFICIAL_ANDROID_4_OF_4",
      sourceManifestSha256: aggregate.sha256,
      sourceManifestArtifact: fileProof(manifestPath),
      backendCurrentFour: "GREEN_4_OF_4",
      androidCurrentFour: "RED_1_OF_4_STALE_APK",
      release: false,
      deploy: false,
      production: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify({
    status: missingPaths.length === 0 ? "R5_SOURCE_MANIFEST_GREEN" : "R5_SOURCE_MANIFEST_RED",
    stage: stageArg,
    files: aggregate.files,
    tracked: aggregate.trackedFiles,
    untracked: aggregate.untrackedFiles,
    bytes: aggregate.bytes,
    sha256: aggregate.sha256,
    artifact: fileProof(manifestPath),
  }, null, 2)}\n`);
  if (missingPaths.length > 0) process.exitCode = 1;
}

main();
