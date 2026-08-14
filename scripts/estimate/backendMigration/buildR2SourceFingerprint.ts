import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return String(process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sourceFiles(): string[] {
  const raw = execFileSync("git", [
    "ls-files", "--cached", "--others", "--exclude-standard", "--",
    "src", "supabase", "android", "App.tsx", "app.json", "app.config.ts",
    "babel.config.js", "metro.config.js", "package.json", "package-lock.json",
    "scripts/estimate/backendMigration",
  ], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(raw.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))]
    .filter((path) => !/(?:^|\/)(?:node_modules|\.release-runtime|artifacts)(?:\/|$)/.test(path.replace(/\\/g, "/")))
    .sort();
}

const label = argument("label", "current-nonterminal");
const output = argument("output", label === "final"
  ? "FINAL_R2_SOURCE_FINGERPRINT.json"
  : "CURRENT_R2_SOURCE_FINGERPRINT.json");
const files = sourceFiles().map((path) => {
  const absolute = resolve(ROOT, path);
  const bytes = readFileSync(absolute);
  return { path: relative(ROOT, absolute).replace(/\\/g, "/"), bytes: bytes.byteLength, sha256: sha256(bytes) };
});
const payload = {
  schemaVersion: "master11610-r2-source-fingerprint.r2",
  label,
  generatedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(),
  tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: ROOT, encoding: "utf8" }).trim(),
  fileCount: files.length,
  files,
  aggregateSha256: sha256(stableJson(files)),
  evidenceValidity: label === "final"
    ? "VALID_UNTIL_ANY_SOURCE_CHANGE"
    : "NONTERMINAL_BASELINE_INVALIDATED_BY_ANY_SUBSEQUENT_SOURCE_CHANGE",
};
writeFileSync(join(EVIDENCE_ROOT, output), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ output, fileCount: payload.fileCount, aggregateSha256: payload.aggregateSha256, evidenceValidity: payload.evidenceValidity })}\n`);
