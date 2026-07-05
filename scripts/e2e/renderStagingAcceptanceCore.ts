import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";

export { timestampForPath };

export const RENDER_ACCEPTANCE_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-render-staging-production-grade",
);

export const GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;

export const STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN" as const;

export const STOP_RENDER_CONFIGURATION_NOT_FOUND_NO_GREEN =
  "STOP_RENDER_CONFIGURATION_NOT_FOUND_NO_GREEN" as const;

export const SHARED_RENDER_BASE_URL_ENV_KEYS = [
  "ESTIMATE_E2E_BASE_URL",
  "E2E_BASE_URL",
  "PUBLIC_BASE_URL",
  "STAGING_URL",
] as const;

type EnvLike = Record<string, string | undefined>;

export function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function normalizeBaseUrl(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const url = new URL(text);
  if (!/^https?:$/.test(url.protocol)) throw new Error(`UNSUPPORTED_BASE_URL_PROTOCOL:${url.protocol}`);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}

export function readFirstEnv(keys: readonly string[], env: EnvLike = process.env): string | null {
  for (const key of keys) {
    const value = normalizeBaseUrl(env[key]);
    if (value) return value;
  }
  return null;
}

export function resolveE2eBaseUrl(input: {
  explicit?: string | null;
  scriptEnvKeys?: readonly string[];
  defaultBaseUrl: string;
  env?: EnvLike;
}): string {
  const env = input.env ?? process.env;
  return (
    normalizeBaseUrl(input.explicit) ??
    readFirstEnv(SHARED_RENDER_BASE_URL_ENV_KEYS, env) ??
    readFirstEnv(input.scriptEnvKeys ?? [], env) ??
    normalizeBaseUrl(env.RIK_WEB_BASE_URL) ??
    normalizeBaseUrl(input.defaultBaseUrl) ??
    input.defaultBaseUrl
  );
}

export function isLocalhostBaseUrl(baseUrl: string): boolean {
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function assertLocalServerMayStart(baseUrl: string): void {
  if (!isLocalhostBaseUrl(baseUrl)) {
    throw new Error(`EXTERNAL_BASE_URL_NOT_READY_LOCALHOST_FALLBACK_DISABLED:${baseUrl}/request`);
  }
}

export function isRenderBaseUrl(baseUrl: string): boolean {
  return new URL(baseUrl).hostname.toLowerCase().endsWith(".onrender.com");
}

export function resolveRequiredRenderBaseUrl(input: { explicit?: string | null; env?: EnvLike } = {}): {
  baseUrl: string | null;
  blockers: string[];
} {
  const baseUrl =
    normalizeBaseUrl(input.explicit) ??
    readFirstEnv(SHARED_RENDER_BASE_URL_ENV_KEYS, input.env ?? process.env);
  const blockers = [
    baseUrl ? "" : STOP_RENDER_CONFIGURATION_NOT_FOUND_NO_GREEN,
    baseUrl && isLocalhostBaseUrl(baseUrl) ? "render_base_url_is_localhost" : "",
    baseUrl && !isRenderBaseUrl(baseUrl) ? "render_base_url_not_onrender_com" : "",
  ].filter(Boolean);
  return { baseUrl, blockers };
}

export function currentSourceSha(): string {
  return gitOutput(["rev-parse", "HEAD"]);
}

export function currentBranch(): string {
  return gitOutput(["branch", "--show-current"]);
}

export function currentUpstreamSync(): string {
  return gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " ");
}

export function writeRuntimeJson<T>(root: string, summary: T): { artifactPath: string; artifact: T } {
  const outDir = path.join(root, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

export function walkSummaryJson(root: string): string[] {
  try {
    return readdirSync(root).flatMap((entry) => {
      const fullPath = path.join(root, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) return walkSummaryJson(fullPath);
      return stats.isFile() && entry === "summary.json" ? [fullPath] : [];
    });
  } catch {
    return [];
  }
}

export function newestSummary<T>(root: string, predicate: (summary: T) => boolean): { path: string; summary: T } | null {
  const candidates = walkSummaryJson(root)
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const summary = JSON.parse(readFileSync(candidate.filePath, "utf8")) as T;
    if (predicate(summary)) return { path: candidate.filePath, summary };
  }
  return null;
}
