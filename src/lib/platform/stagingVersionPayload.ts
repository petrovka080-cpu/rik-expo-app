export const STAGING_CATALOG_VERSION = "catalog:11610" as const;
export const AI_PLATFORM_KERNEL_VERSION = "ai-platform-runtime-kernel-v1" as const;
export const AI_PLATFORM_EVALOPS_MANIFEST_VERSION = "ai-platform-evalops-prompt-v1" as const;
export const STAGING_RUNTIME_NAME = "staging" as const;

type EnvLike = Record<string, string | undefined>;

export type StagingVersionPayload = {
  source_sha: string;
  branch: string;
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
  for (const name of names) {
    const value = envText(env, name);
    if (value) return value;
  }
  return "";
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
  return {
    source_sha: firstEnv(env, [
      "RENDER_GIT_COMMIT",
      "RENDER_COMMIT",
      "EXPO_PUBLIC_BUILD_COMMIT",
      "SOURCE_SHA",
      "GIT_COMMIT",
      "SOURCE_VERSION",
    ]) || "unknown",
    branch: firstEnv(env, [
      "RENDER_GIT_BRANCH",
      "RENDER_BRANCH",
      "EXPO_PUBLIC_BUILD_BRANCH",
      "BRANCH",
      "GIT_BRANCH",
    ]) || "unknown",
    runtime: runtimeName(env),
    catalog_version: STAGING_CATALOG_VERSION,
    ai_kernel_version: AI_PLATFORM_KERNEL_VERSION,
    evalops_manifest_version: AI_PLATFORM_EVALOPS_MANIFEST_VERSION,
    built_at: firstEnv(env, ["RENDER_BUILD_TIME", "BUILD_TIME", "EXPO_PUBLIC_BUILD_TIME"]) || generatedAt,
    provider: providerName(env),
    service: firstEnv(env, ["RENDER_SERVICE_NAME", "RENDER_APP_SERVICE_NAME"]) || "rik-expo-app-staging",
  };
}
