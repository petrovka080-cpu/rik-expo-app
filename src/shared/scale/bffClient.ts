import type {
  BffClientConfig,
  BffFlow,
  BffResponseEnvelope,
  BffRuntimeEnvironment,
} from "./bffContracts";
import { buildBffError, isBffEnabled } from "./bffSafety";

export type BffRequestPlan = {
  flow: BffFlow;
  enabled: boolean;
  baseUrlConfigured: boolean;
  networkExecutionAllowed: boolean;
};

export const BFF_READONLY_RUNTIME_ENV_NAMES = Object.freeze({
  enabled: "EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED",
  trafficPercent: "EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT",
  baseUrl: "EXPO_PUBLIC_BFF_STAGING_BASE_URL",
  shadowOnly: "EXPO_PUBLIC_BFF_SHADOW_ONLY_ENABLED",
} as const);

type BffReadonlyRuntimeEnv = Record<string, string | undefined>;

export type BffReadonlyRuntimeConfig = {
  clientConfig: BffClientConfig;
  trafficPercent: number;
  mobileRuntimeBffEnabled: boolean;
  shadowOnlySupported: true;
  shadowOnly: boolean;
  networkExecutionAllowed: boolean;
  envStatus: {
    enabledFlag: "enabled" | "disabled" | "missing";
    baseUrl: "present_valid" | "present_invalid" | "missing";
    trafficPercent: "present_valid" | "present_invalid" | "missing";
    shadowOnly: "enabled" | "disabled" | "missing";
    runtimeEnvironment: BffRuntimeEnvironment;
  };
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseEnabledFlag = (value: unknown): boolean => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "1" || normalized === "true";
};

const getEnabledFlagStatus = (value: unknown): "enabled" | "disabled" | "missing" => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return "missing";
  return normalized === "1" || normalized === "true" ? "enabled" : "disabled";
};

const normalizeHttpsBaseUrl = (value: unknown): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
};

const getBaseUrlStatus = (value: unknown): "present_valid" | "present_invalid" | "missing" => {
  const raw = normalizeText(value);
  if (!raw) return "missing";
  return normalizeHttpsBaseUrl(raw) ? "present_valid" : "present_invalid";
};

const normalizeTrafficPercent = (value: unknown): number => {
  const raw = normalizeText(value);
  if (!raw) return 0;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), 100);
};

const getTrafficPercentStatus = (value: unknown): "present_valid" | "present_invalid" | "missing" => {
  const raw = normalizeText(value);
  if (!raw) return "missing";
  return Number.isFinite(Number(raw)) ? "present_valid" : "present_invalid";
};

const inferRuntimeEnvironment = (env: BffReadonlyRuntimeEnv): BffRuntimeEnvironment => {
  const raw = normalizeText(
    env.EXPO_PUBLIC_APP_ENV ??
      env.EXPO_PUBLIC_ENVIRONMENT ??
      env.EXPO_PUBLIC_RELEASE_CHANNEL ??
      env.APP_ENV ??
      env.NODE_ENV,
  ).toLowerCase();

  if (!raw) return "unknown";
  if (raw.includes("prod")) return "production";
  if (raw.includes("stag")) return "staging";
  if (raw.includes("test")) return "test";
  if (raw.includes("dev")) return "development";
  return "unknown";
};

const getRuntimeEnv = (): BffReadonlyRuntimeEnv => {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as BffReadonlyRuntimeEnv;
};

const isNetworkExecutionAllowed = (config: BffClientConfig): boolean => {
  const trafficPercent = normalizeTrafficPercent(config.trafficPercent);
  return (
    isBffEnabled(config) &&
    config.readOnly === true &&
    config.runtimeEnvironment === "staging" &&
    config.productionGuard === true &&
    config.mutationRoutesEnabled !== true &&
    trafficPercent > 0
  );
};

export function buildBffRequestPlan(config: BffClientConfig, flow: BffFlow): BffRequestPlan {
  return {
    flow,
    enabled: isBffEnabled(config),
    baseUrlConfigured: typeof config.baseUrl === "string" && config.baseUrl.trim().length > 0,
    networkExecutionAllowed: isNetworkExecutionAllowed(config),
  };
}

export function resolveBffReadonlyRuntimeConfig(
  env: BffReadonlyRuntimeEnv = getRuntimeEnv(),
  options: { runtimeEnvironment?: BffRuntimeEnvironment } = {},
): BffReadonlyRuntimeConfig {
  const enabledValue = env[BFF_READONLY_RUNTIME_ENV_NAMES.enabled];
  const baseUrlValue = env[BFF_READONLY_RUNTIME_ENV_NAMES.baseUrl];
  const trafficPercentValue = env[BFF_READONLY_RUNTIME_ENV_NAMES.trafficPercent];
  const shadowOnlyValue = env[BFF_READONLY_RUNTIME_ENV_NAMES.shadowOnly];
  const runtimeEnvironment = options.runtimeEnvironment ?? inferRuntimeEnvironment(env);
  const trafficPercent = normalizeTrafficPercent(trafficPercentValue);
  const shadowOnly = getEnabledFlagStatus(shadowOnlyValue) !== "disabled" || trafficPercent === 0;
  const clientConfig: BffClientConfig = {
    enabled: parseEnabledFlag(enabledValue),
    baseUrl: normalizeHttpsBaseUrl(baseUrlValue),
    readOnly: true,
    runtimeEnvironment,
    trafficPercent,
    shadowOnly,
    mutationRoutesEnabled: false,
    productionGuard: runtimeEnvironment !== "production",
  };

  return {
    clientConfig,
    trafficPercent,
    mobileRuntimeBffEnabled: isBffEnabled(clientConfig),
    shadowOnlySupported: true,
    shadowOnly,
    networkExecutionAllowed: buildBffRequestPlan(clientConfig, "proposal.list").networkExecutionAllowed,
    envStatus: {
      enabledFlag: getEnabledFlagStatus(enabledValue),
      baseUrl: getBaseUrlStatus(baseUrlValue),
      trafficPercent: getTrafficPercentStatus(trafficPercentValue),
      shadowOnly: getEnabledFlagStatus(shadowOnlyValue),
      runtimeEnvironment,
    },
  };
}

export async function callBffDisabled<T>(): Promise<BffResponseEnvelope<T>> {
  return {
    ok: false,
    error: buildBffError("BFF_DISABLED", "Server API boundary is disabled"),
  };
}

export async function callBffContractOnly<T>(
  config: BffClientConfig,
  flow: BffFlow,
): Promise<BffResponseEnvelope<T>> {
  const plan = buildBffRequestPlan(config, flow);
  if (!plan.enabled) {
    return callBffDisabled<T>();
  }

  return {
    ok: false,
    error: buildBffError(
      "BFF_CONTRACT_ONLY",
      "Server API boundary contract exists but traffic migration is disabled",
    ),
  };
}
