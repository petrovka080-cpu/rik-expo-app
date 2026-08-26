import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

export type CanonicalSourceIdentityEntryR56 = {
  path: string;
  bytes: number;
  sha256: string;
};

export const CANONICAL_R56_DEFAULT_SOURCE_PATHS = [
  "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
  "app",
  "src",
  "supabase/functions",
  "supabase/migrations",
  "scripts/_shared",
  "scripts/e2e",
  "scripts/estimate/backendMigration",
  "scripts/estimate/batch001008R3",
  "scripts/estimate/r5",
  "tests",
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

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { maxBuffer: 16 * 1024 * 1024 }).toString("utf8").trim();
}

export function buildCanonicalSourceIdentityR56(input: {
  contractSha256: string;
  paths: readonly string[];
}): {
  contract_sha256: string;
  source_head: string;
  source_head_tree: string;
  source_index_tree: string;
  component_manifest_sha256: string;
  source_state_id: string;
  entries: readonly CanonicalSourceIdentityEntryR56[];
} {
  if (!/^[0-9a-f]{64}$/u.test(input.contractSha256)) {
    throw new Error("CANONICAL_SOURCE_IDENTITY_CONTRACT_SHA256_INVALID");
  }
  const requestedPaths = [...new Set(input.paths.map((path) => path.replace(/\\/gu, "/")))].sort();
  if (requestedPaths.length === 0) throw new Error("CANONICAL_SOURCE_IDENTITY_PATHS_EMPTY");
  const ignoredDirectories = new Set([".git", ".gradle", ".release-runtime", "artifacts", "build", "dist", "node_modules"]);
  const expanded = new Map<string, string>();
  const visit = (absolute: string): void => {
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(absolute, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        visit(resolve(absolute, entry.name));
      }
      return;
    }
    if (!stats.isFile()) return;
    const workspaceRelative = relative(resolve("."), absolute).replace(/\\/gu, "/");
    expanded.set(absolute, workspaceRelative.startsWith("../") ? absolute.replace(/\\/gu, "/") : workspaceRelative);
  };
  for (const path of requestedPaths) visit(resolve(path));
  const entries = [...expanded.entries()].sort(([, left], [, right]) => left.localeCompare(right)).map(([absolute, path]): CanonicalSourceIdentityEntryR56 => {
    const bytes = readFileSync(absolute);
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const componentManifestSha256 = sha256(stableJson(entries));
  const state = {
    contract_sha256: input.contractSha256,
    component_manifest_sha256: componentManifestSha256,
  };
  return {
    ...state,
    source_head: git("rev-parse", "HEAD"),
    source_head_tree: git("rev-parse", "HEAD^{tree}"),
    source_index_tree: git("write-tree"),
    source_state_id: sha256(stableJson(state)),
    entries,
  };
}
