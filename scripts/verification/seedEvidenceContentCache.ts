import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  contentAddressedCachePath,
  loadRequiredArtifactManifest,
  sha256File,
} from "./requiredArtifactPreflight";

function values(name: string): string[] {
  const prefix = `--${name}=`;
  return process.argv
    .filter((item) => item.startsWith(prefix))
    .map((item) => path.resolve(item.slice(prefix.length)));
}

function value(name: string): string {
  const result = values(name)[0];
  if (!result) throw new Error(`missing_argument:${name}`);
  return result;
}

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
  } catch {
    return "unknown";
  }
}

const manifestPath = value("manifest");
const cacheRoot = value("cache-root");
const reportPath = value("report");
const sourceRoots = values("source-root");
if (sourceRoots.length === 0) throw new Error("at_least_one_source_root_required");
const manifest = loadRequiredArtifactManifest(manifestPath);
const sources = sourceRoots.map((root) => ({
  root,
  head_sha: git(root, ["rev-parse", "HEAD"]),
  dirty_paths: git(root, ["status", "--porcelain"]).split(/\r?\n/).filter(Boolean),
}));
const files: Array<Record<string, unknown>> = [];
const failures: string[] = [];

for (const entry of manifest.entries) {
  const cachePath = contentAddressedCachePath(cacheRoot, entry.content_sha256);
  if (
    fs.existsSync(cachePath) &&
    fs.statSync(cachePath).size === entry.bytes &&
    sha256File(cachePath) === entry.content_sha256
  ) {
    files.push({ path: entry.path, content_sha256: entry.content_sha256, source: "existing-cache" });
    continue;
  }
  const matches = sourceRoots.filter((root) => {
    const sourcePath = path.resolve(root, entry.path);
    return (
      fs.existsSync(sourcePath) &&
      fs.statSync(sourcePath).isFile() &&
      fs.statSync(sourcePath).size === entry.bytes &&
      sha256File(sourcePath) === entry.content_sha256
    );
  });
  if (matches.length === 0) {
    failures.push(`no_exact_source:${entry.path}:${entry.content_sha256}`);
    continue;
  }
  const sourceRoot = matches[0];
  const sourcePath = path.resolve(sourceRoot, entry.path);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const temporaryPath = `${cachePath}.seed.tmp`;
  fs.copyFileSync(sourcePath, temporaryPath);
  if (sha256File(temporaryPath) !== entry.content_sha256) {
    fs.rmSync(temporaryPath);
    failures.push(`copy_hash_mismatch:${entry.path}`);
    continue;
  }
  fs.renameSync(temporaryPath, cachePath);
  fs.chmodSync(cachePath, 0o444);
  files.push({
    path: entry.path,
    content_sha256: entry.content_sha256,
    bytes: entry.bytes,
    source_root: sourceRoot,
    source_head_sha: sources.find((source) => source.root === sourceRoot)?.head_sha ?? "unknown",
    matching_source_roots: matches,
  });
}

const report = {
  schema: "verification-evidence-cache-seed:v1",
  manifest_path: manifestPath,
  manifest_content_sha256: manifest.content_sha256,
  cache_root: cacheRoot,
  sources,
  required_files: manifest.entries.length,
  seeded_or_present_files: files.length,
  failures,
  files,
  final_status:
    failures.length === 0 && files.length === manifest.entries.length
      ? "GREEN_CONTENT_ADDRESSED_EVIDENCE_CACHE_SEEDED"
      : "STOP_CONTENT_ADDRESSED_EVIDENCE_CACHE_INCOMPLETE",
  fake_green_claimed: false,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ...report, files: undefined }, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
