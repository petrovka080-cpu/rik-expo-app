export const STAGING_CATALOG_VERSION = "catalog:11610" as const;
export const AI_PLATFORM_KERNEL_VERSION = "ai-platform-runtime-kernel-v1" as const;
export const AI_PLATFORM_EVALOPS_MANIFEST_VERSION = "ai-platform-evalops-prompt-v1" as const;
export const STAGING_RUNTIME_NAME = "staging" as const;

type EnvLike = Record<string, string | undefined>;
type SourceShaFormat = "git_sha" | "missing" | "invalid";

export type StagingVersionPayload = {
  source_sha: string;
  source_sha_env_key: string | null;
  source_sha_format: SourceShaFormat;
  source_sha_format_valid: boolean;
  branch: string;
  branch_env_key: string | null;
  runtime: typeof STAGING_RUNTIME_NAME | "unknown";
  catalog_version: typeof STAGING_CATALOG_VERSION;
  ai_kernel_version: typeof AI_PLATFORM_KERNEL_VERSION;
  evalops_manifest_version: typeof AI_PLATFORM_EVALOPS_MANIFEST_VERSION;
  built_at: string;
  provider: "render" | "unknown";
  service: string;
};

function envText(env: EnvLike, name: string): string {
  return String(env[name] ?? "").trim();
}

function firstEnv(env: EnvLike, names: readonly string[]): string {
  return firstEnvMatch(env, names).value;
}

function firstEnvMatch(env: EnvLike, names: readonly string[]): { key: string | null; value: string } {
  for (const name of names) {
    const value = envText(env, name);
    if (value) return { key: name, value };
  }
  return { key: null, value: "" };
}

export function sourceShaFormat(value: string): SourceShaFormat {
  if (!value || value === "unknown") return "missing";
  return /^[0-9a-f]{40}$/i.test(value) ? "git_sha" : "invalid";
}

function providerName(env: EnvLike): StagingVersionPayload["provider"] {
  return envText(env, "RENDER") || envText(env, "RENDER_SERVICE_ID") ? "render" : "unknown";
}

function runtimeName(env: EnvLike): StagingVersionPayload["runtime"] {
  const explicit = firstEnv(env, [
    "AI_ESTIMATE_RUNTIME",
    "APP_RUNTIME",
    "EXPO_PUBLIC_APP_RUNTIME",
    "RUNTIME_ENVIRONMENT",
  ]).toLowerCase();
  if (explicit === STAGING_RUNTIME_NAME) return STAGING_RUNTIME_NAME;

  const service = firstEnv(env, ["RENDER_SERVICE_NAME", "RENDER_APP_SERVICE_NAME"]).toLowerCase();
  if (providerName(env) === "render" && service.includes("staging")) return STAGING_RUNTIME_NAME;

  return "unknown";
}

export function buildStagingVersionPayload(
  env: EnvLike = process.env,
  generatedAt = new Date().toISOString(),
): StagingVersionPayload {
  const sourceSha = firstEnvMatch(env, [
    "RENDER_GIT_COMMIT",
    "RENDER_COMMIT",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "EXPO_PUBLIC_BUILD_COMMIT",
    "SOURCE_SHA",
    "GIT_COMMIT",
    "SOURCE_VERSION",
  ]);
  const branch = firstEnvMatch(env, [
    "RENDER_GIT_BRANCH",
    "RENDER_BRANCH",
    "GITHUB_HEAD_REF",
    "GITHUB_REF_NAME",
    "CI_COMMIT_BRANCH",
    "EXPO_PUBLIC_BUILD_BRANCH",
    "BRANCH",
    "GIT_BRANCH",
  ]);
  const sourceShaValue = sourceSha.value || "unknown";
  const sourceFormat = sourceShaFormat(sourceShaValue);
  return {
    source_sha: sourceShaValue,
    source_sha_env_key: sourceSha.key,
    source_sha_format: sourceFormat,
    source_sha_format_valid: sourceFormat === "git_sha",
    branch: branch.value || "unknown",
    branch_env_key: branch.key,
    runtime: runtimeName(env),
    catalog_version: STAGING_CATALOG_VERSION,
    ai_kernel_version: AI_PLATFORM_KERNEL_VERSION,
    evalops_manifest_version: AI_PLATFORM_EVALOPS_MANIFEST_VERSION,
    built_at: firstEnv(env, ["RENDER_BUILD_TIME", "BUILD_TIME", "EXPO_PUBLIC_BUILD_TIME"]) || generatedAt,
    provider: providerName(env),
    service: firstEnv(env, ["RENDER_SERVICE_NAME", "RENDER_APP_SERVICE_NAME"]) || "rik-expo-app-staging",
  };
}
