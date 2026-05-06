import type {
  BffClientConfig,
  BffFlow,
  BffResponseEnvelope,
  BffRuntimeEnvironment,
} from "./bffContracts";
import { buildBffError, isBffEnabled } from "./bffSafety";

export type BffRequestPlan = {
  flow: BffRequestTarget;
  enabled: boolean;
  baseUrlConfigured: boolean;
  networkExecutionAllowed: boolean;
};

export type BffReadonlyMobileOperation =
  | "request.proposal.list"
  | "marketplace.catalog.search"
  | "warehouse.ledger.list"
  | "accountant.invoice.list"
  | "director.pending.list"
  | "director.finance.rpc.scope"
  | "warehouse.api.read.scope"
  | "catalog.transport.read.scope"
  | "assistant.store.read.scope";

export type BffRequestTarget = BffFlow | BffReadonlyMobileOperation;

export type BffReadonlyRuntimeEnvNames = {
  enabled: string;
  trafficPercent: string;
  baseUrl: string;
  shadowOnly: string;
};

export const BFF_READONLY_STAGING_RUNTIME_ENV_NAMES = Object.freeze({
  enabled: "EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED",
  trafficPercent: "EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT",
  baseUrl: "EXPO_PUBLIC_BFF_STAGING_BASE_URL",
  shadowOnly: "EXPO_PUBLIC_BFF_SHADOW_ONLY_ENABLED",
} as const satisfies BffReadonlyRuntimeEnvNames);

export const BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES = Object.freeze({
  enabled: "EXPO_PUBLIC_BFF_READONLY_PRODUCTION_ENABLED",
  trafficPercent: "EXPO_PUBLIC_BFF_READONLY_PRODUCTION_TRAFFIC_PERCENT",
  baseUrl: "EXPO_PUBLIC_BFF_PRODUCTION_BASE_URL",
  shadowOnly: "EXPO_PUBLIC_BFF_PRODUCTION_SHADOW_ONLY_ENABLED",
} as const satisfies BffReadonlyRuntimeEnvNames);

export const BFF_READONLY_RUNTIME_ENV_NAMES_BY_ENVIRONMENT = Object.freeze({
  staging: BFF_READONLY_STAGING_RUNTIME_ENV_NAMES,
  production: BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES,
} as const satisfies Record<"staging" | "production", BffReadonlyRuntimeEnvNames>);

export const BFF_READONLY_RUNTIME_ENV_NAMES = BFF_READONLY_STAGING_RUNTIME_ENV_NAMES;

export const BFF_FORBIDDEN_PRODUCTION_BASE_URLS = Object.freeze([
  "https://gox-build-staging-bff.onrender.com",
] as const);

export const BFF_READONLY_MOBILE_ROUTE_PATHS = Object.freeze({
  "request.proposal.list": "/api/staging-bff/read/request-proposal-list",
  "marketplace.catalog.search": "/api/staging-bff/read/marketplace-catalog-search",
  "warehouse.ledger.list": "/api/staging-bff/read/warehouse-ledger-list",
  "accountant.invoice.list": "/api/staging-bff/read/accountant-invoice-list",
  "director.pending.list": "/api/staging-bff/read/director-pending-list",
  "director.finance.rpc.scope": "/api/staging-bff/read/director-finance-rpc-scope",
  "warehouse.api.read.scope": "/api/staging-bff/read/warehouse-api-read-scope",
  "catalog.transport.read.scope": "/api/staging-bff/read/catalog-transport-read-scope",
  "assistant.store.read.scope": "/api/staging-bff/read/assistant-store-read-scope",
} as const satisfies Record<BffReadonlyMobileOperation, string>);

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

export type BffReadonlyMobileAuthProvider = () => Promise<string | null | undefined>;

export type BffReadonlyMobileCallOptions<TInput = Record<string, unknown>> = {
  config: BffClientConfig;
  operation: BffReadonlyMobileOperation;
  input?: TInput | null;
  getAccessToken: BffReadonlyMobileAuthProvider;
  fetchImpl?: typeof fetch;
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

const isForbiddenProductionBaseUrl = (baseUrl: string | null): boolean =>
  baseUrl !== null && BFF_FORBIDDEN_PRODUCTION_BASE_URLS.some((forbidden) => forbidden === baseUrl);

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

const getReadonlyRuntimeEnvNames = (runtimeEnvironment: BffRuntimeEnvironment): BffReadonlyRuntimeEnvNames =>
  runtimeEnvironment === "production"
    ? BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES
    : BFF_READONLY_STAGING_RUNTIME_ENV_NAMES;

const isNetworkExecutionAllowed = (config: BffClientConfig): boolean => {
  const trafficPercent = normalizeTrafficPercent(config.trafficPercent);
  const normalizedBaseUrl = normalizeHttpsBaseUrl(config.baseUrl);
  const stagingNetworkAllowed = config.runtimeEnvironment === "staging" && config.productionGuard === true;
  const productionNetworkAllowed =
    config.runtimeEnvironment === "production" &&
    config.productionGuard === false &&
    config.shadowOnly !== true &&
    !isForbiddenProductionBaseUrl(normalizedBaseUrl);

  return (
    isBffEnabled(config) &&
    normalizedBaseUrl !== null &&
    config.readOnly === true &&
    (stagingNetworkAllowed || productionNetworkAllowed) &&
    config.mutationRoutesEnabled !== true &&
    trafficPercent > 0
  );
};

export function buildBffRequestPlan(config: BffClientConfig, flow: BffRequestTarget): BffRequestPlan {
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
  const runtimeEnvironment = options.runtimeEnvironment ?? inferRuntimeEnvironment(env);
  const envNames = getReadonlyRuntimeEnvNames(runtimeEnvironment);
  const enabledValue = env[envNames.enabled];
  const baseUrlValue = env[envNames.baseUrl];
  const trafficPercentValue = env[envNames.trafficPercent];
  const shadowOnlyValue = env[envNames.shadowOnly];
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
  flow: BffRequestTarget,
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

const buildReadonlyMobileError = <T>(code: string, message: string): BffResponseEnvelope<T> => ({
  ok: false,
  error: buildBffError(code, message),
});

const normalizeAccessToken = (value: unknown): string | null => {
  const token = normalizeText(value);
  return token ? token : null;
};

const buildReadonlyMobileUrl = (
  baseUrl: string | null | undefined,
  operation: BffReadonlyMobileOperation,
): string | null => {
  const normalizedBaseUrl = normalizeHttpsBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return null;

  try {
    return new URL(BFF_READONLY_MOBILE_ROUTE_PATHS[operation], normalizedBaseUrl).toString();
  } catch {
    return null;
  }
};

const isBffResponseEnvelope = <T>(value: unknown): value is BffResponseEnvelope<T> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.ok === true) return Object.prototype.hasOwnProperty.call(record, "data");
  if (record.ok !== false || typeof record.error !== "object" || record.error === null) return false;
  const error = record.error as Record<string, unknown>;
  return typeof error.code === "string" && typeof error.message === "string";
};

const sanitizeBffResponseEnvelope = <T>(value: BffResponseEnvelope<T>): BffResponseEnvelope<T> => {
  if (value.ok) return value;
  return {
    ok: false,
    error: buildBffError(value.error.code, value.error.message),
  };
};

export async function callBffReadonlyMobile<TResponse, TInput = Record<string, unknown>>(
  options: BffReadonlyMobileCallOptions<TInput>,
): Promise<BffResponseEnvelope<TResponse>> {
  const plan = buildBffRequestPlan(options.config, options.operation);
  if (!plan.enabled) return callBffDisabled<TResponse>();
  if (!plan.networkExecutionAllowed) {
    return buildReadonlyMobileError(
      "BFF_CONTRACT_ONLY",
      "Server API boundary contract exists but traffic migration is disabled",
    );
  }

  const url = buildReadonlyMobileUrl(options.config.baseUrl, options.operation);
  if (!url) {
    return buildReadonlyMobileError("BFF_BASE_URL_INVALID", "Server API boundary base URL is invalid");
  }

  const accessToken = normalizeAccessToken(await options.getAccessToken());
  if (!accessToken) {
    return buildReadonlyMobileError(
      "BFF_MOBILE_AUTH_SESSION_REQUIRED",
      "Mobile auth session is required for read-only BFF access",
    );
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return buildReadonlyMobileError("BFF_FETCH_UNAVAILABLE", "Server API boundary fetch is unavailable");
  }

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        input: options.input ?? {},
        metadata: {
          mobileAuth: "supabase_user_jwt_present_redacted",
        },
      }),
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!isBffResponseEnvelope<TResponse>(body)) {
      return buildReadonlyMobileError("BFF_INVALID_RESPONSE_ENVELOPE", "Invalid response envelope");
    }
    return sanitizeBffResponseEnvelope(body);
  } catch {
    return buildReadonlyMobileError("BFF_NETWORK_ERROR", "Server API boundary request failed");
  }
}
