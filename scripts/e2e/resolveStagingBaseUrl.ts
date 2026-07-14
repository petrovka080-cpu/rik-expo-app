import { readFileSync } from "node:fs";
import { URL } from "node:url";

import {
  SHARED_RENDER_BASE_URL_ENV_KEYS,
  isLocalhostBaseUrl,
  normalizeBaseUrl,
} from "./renderStagingAcceptanceCore";

export const DEFAULT_RENDER_STAGING_SERVICE_NAME = "rik-expo-app-staging" as const;
export const DEFAULT_RENDER_STAGING_URL = `https://${DEFAULT_RENDER_STAGING_SERVICE_NAME}.onrender.com` as const;

export const STAGING_BASE_URL_ENV_KEYS = [
  "ESTIMATE_E2E_BASE_URL",
  "E2E_BASE_URL",
  "PUBLIC_BASE_URL",
  "STAGING_URL",
  "EXPO_PUBLIC_API_URL",
] as const;

type EnvLike = Record<string, string | undefined>;

export type StagingBaseUrlResolution = {
  baseUrl: string | null;
  source: "explicit" | "env" | "render.yaml" | "missing";
  provider: "render" | "unknown";
  staging_url_detected: boolean;
  staging_config_detected: boolean;
  staging_provider_detected: boolean;
  staging_url_is_external: boolean;
  staging_url_is_not_localhost: boolean;
  blockers: string[];
};

function firstEnvUrl(env: EnvLike): string | null {
  for (const key of STAGING_BASE_URL_ENV_KEYS) {
    const value = normalizeBaseUrl(env[key]);
    if (value) return value;
  }
  for (const key of SHARED_RENDER_BASE_URL_ENV_KEYS) {
    const value = normalizeBaseUrl(env[key]);
    if (value) return value;
  }
  return null;
}

function renderYamlServiceName(renderYamlPath: string): string | null {
  try {
    const source = readFileSync(renderYamlPath, "utf8");
    const serviceName = source.match(/name:\s*([A-Za-z0-9-]+)/)?.[1] ?? null;
    const branch = source.match(/branch:\s*([^\s]+)/)?.[1] ?? null;
    const healthPath = source.match(/healthCheckPath:\s*([^\s]+)/)?.[1] ?? null;
    if (serviceName === DEFAULT_RENDER_STAGING_SERVICE_NAME && branch && healthPath === "/health") return serviceName;
  } catch {
    return null;
  }
  return null;
}

function providerFor(baseUrl: string | null): StagingBaseUrlResolution["provider"] {
  if (!baseUrl) return "unknown";
  return new URL(baseUrl).hostname.toLowerCase().endsWith(".onrender.com") ? "render" : "unknown";
}

export function resolveStagingBaseUrl(input: {
  explicit?: string | null;
  env?: EnvLike;
  renderYamlPath?: string;
  allowRenderYamlDefault?: boolean;
} = {}): StagingBaseUrlResolution {
  const explicit = normalizeBaseUrl(input.explicit);
  const env = firstEnvUrl(input.env ?? process.env);
  const serviceName = input.allowRenderYamlDefault === false
    ? null
    : renderYamlServiceName(input.renderYamlPath ?? "render.yaml");
  const fromRenderYaml = serviceName ? `https://${serviceName}.onrender.com` : null;
  const baseUrl = explicit ?? env ?? fromRenderYaml;
  const source = explicit ? "explicit" : env ? "env" : fromRenderYaml ? "render.yaml" : "missing";
  const provider = providerFor(baseUrl);
  const isExternal = baseUrl != null && /^https?:\/\//.test(baseUrl);
  const isNotLocalhost = baseUrl != null && !isLocalhostBaseUrl(baseUrl);
  const blockers = [
    baseUrl ? "" : "STAGING_URL_NOT_CONFIGURED",
    baseUrl && !isExternal ? "STAGING_URL_NOT_HTTP" : "",
    baseUrl && !isNotLocalhost ? "STAGING_URL_IS_LOCALHOST" : "",
    baseUrl && provider === "unknown" ? "STAGING_PROVIDER_NOT_DETECTED" : "",
  ].filter(Boolean);

  return {
    baseUrl,
    source,
    provider,
    staging_url_detected: baseUrl != null,
    staging_config_detected: source !== "missing",
    staging_provider_detected: provider !== "unknown",
    staging_url_is_external: isExternal,
    staging_url_is_not_localhost: isNotLocalhost,
    blockers,
  };
}
