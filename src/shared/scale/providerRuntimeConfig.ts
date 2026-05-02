export type ScaleProviderKind =
  | "redis_cache"
  | "queue"
  | "idempotency_db"
  | "rate_limit"
  | "observability_export";

export type ScaleProviderRuntimeEnvironment = "production" | "staging" | "development" | "test" | "unknown";

export type ScaleProviderEnvNames = {
  enabled: string;
  required: readonly string[];
  optional: readonly string[];
};

export type ScaleProviderRuntimeStatus = {
  provider: ScaleProviderKind;
  enabledFlag: "enabled" | "disabled" | "missing";
  configured: boolean;
  missingEnvNames: string[];
  liveNetworkAllowed: boolean;
};

export type ScaleProviderRuntimeConfig = {
  runtimeEnvironment: ScaleProviderRuntimeEnvironment;
  productionGuard: boolean;
  providersEnabled: boolean;
  exactEnvNames: Record<ScaleProviderKind, ScaleProviderEnvNames>;
  providers: Record<ScaleProviderKind, ScaleProviderRuntimeStatus>;
};

type ProviderRuntimeEnv = Record<string, string | undefined>;

export const SCALE_PROVIDER_RUNTIME_ENV_NAMES: Record<ScaleProviderKind, ScaleProviderEnvNames> = Object.freeze({
  redis_cache: {
    enabled: "SCALE_REDIS_CACHE_STAGING_ENABLED",
    required: ["SCALE_REDIS_CACHE_NAMESPACE"],
    optional: ["SCALE_REDIS_CACHE_URL", "REDIS_URL"],
  },
  queue: {
    enabled: "SCALE_QUEUE_STAGING_ENABLED",
    required: ["SCALE_QUEUE_PROVIDER", "SCALE_QUEUE_URL", "SCALE_QUEUE_NAMESPACE"],
    optional: [],
  },
  idempotency_db: {
    enabled: "SCALE_IDEMPOTENCY_DB_STAGING_ENABLED",
    required: ["SCALE_IDEMPOTENCY_DB_URL", "SCALE_IDEMPOTENCY_TABLE"],
    optional: [],
  },
  rate_limit: {
    enabled: "SCALE_RATE_LIMIT_STAGING_ENABLED",
    required: ["SCALE_RATE_LIMIT_STORE_URL", "SCALE_RATE_LIMIT_NAMESPACE"],
    optional: ["SCALE_RATE_ENFORCEMENT_MODE", "SCALE_RATE_LIMIT_TEST_NAMESPACE"],
  },
  observability_export: {
    enabled: "SCALE_OBSERVABILITY_EXPORT_STAGING_ENABLED",
    required: ["SCALE_OBSERVABILITY_EXPORT_ENDPOINT", "SCALE_OBSERVABILITY_EXPORT_TOKEN"],
    optional: ["SCALE_OBSERVABILITY_EXPORT_NAMESPACE"],
  },
} as const);

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseEnabledFlagStatus = (value: unknown): "enabled" | "disabled" | "missing" => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return "missing";
  return normalized === "1" || normalized === "true" || normalized === "yes" ? "enabled" : "disabled";
};

const hasEnvValue = (env: ProviderRuntimeEnv, name: string): boolean => normalizeText(env[name]).length > 0;

const inferRuntimeEnvironment = (env: ProviderRuntimeEnv): ScaleProviderRuntimeEnvironment => {
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

const getRuntimeEnv = (): ProviderRuntimeEnv => {
  if (typeof process === "undefined" || !process.env) return {};
  return process.env as ProviderRuntimeEnv;
};

const resolveProviderStatus = (
  provider: ScaleProviderKind,
  env: ProviderRuntimeEnv,
  runtimeEnvironment: ScaleProviderRuntimeEnvironment,
): ScaleProviderRuntimeStatus => {
  const envNames = SCALE_PROVIDER_RUNTIME_ENV_NAMES[provider];
  const enabledFlag = parseEnabledFlagStatus(env[envNames.enabled]);
  const missingEnvNames = envNames.required.filter((name) => !hasEnvValue(env, name));
  if (provider === "redis_cache" && !hasEnvValue(env, "SCALE_REDIS_CACHE_URL") && !hasEnvValue(env, "REDIS_URL")) {
    missingEnvNames.push("SCALE_REDIS_CACHE_URL", "REDIS_URL");
  }
  const configured = missingEnvNames.length === 0;
  const productionGuard = runtimeEnvironment !== "production";

  return {
    provider,
    enabledFlag,
    configured,
    missingEnvNames,
    liveNetworkAllowed: enabledFlag === "enabled" && configured && runtimeEnvironment === "staging" && productionGuard,
  };
};

export function resolveScaleProviderRuntimeConfig(
  env: ProviderRuntimeEnv = getRuntimeEnv(),
  options: { runtimeEnvironment?: ScaleProviderRuntimeEnvironment } = {},
): ScaleProviderRuntimeConfig {
  const runtimeEnvironment = options.runtimeEnvironment ?? inferRuntimeEnvironment(env);
  const providers = Object.fromEntries(
    (Object.keys(SCALE_PROVIDER_RUNTIME_ENV_NAMES) as ScaleProviderKind[]).map((provider) => [
      provider,
      resolveProviderStatus(provider, env, runtimeEnvironment),
    ]),
  ) as Record<ScaleProviderKind, ScaleProviderRuntimeStatus>;

  return {
    runtimeEnvironment,
    productionGuard: runtimeEnvironment !== "production",
    providersEnabled: Object.values(providers).some((provider) => provider.liveNetworkAllowed),
    exactEnvNames: SCALE_PROVIDER_RUNTIME_ENV_NAMES,
    providers,
  };
}

export function getScaleProviderMissingEnvNames(config: ScaleProviderRuntimeConfig): string[] {
  return Array.from(
    new Set(
      Object.values(config.providers)
        .filter((provider) => provider.enabledFlag === "enabled" && !provider.configured)
        .flatMap((provider) => provider.missingEnvNames),
    ),
  ).sort();
}
