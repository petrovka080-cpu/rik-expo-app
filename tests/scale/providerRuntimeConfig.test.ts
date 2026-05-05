import {
  SCALE_PROVIDER_RUNTIME_ENV_NAMES,
  getScaleProviderMissingEnvNames,
  resolveScaleProviderRuntimeConfig,
} from "../../src/shared/scale/providerRuntimeConfig";

describe("S-50K provider runtime env conventions", () => {
  it("keeps all providers disabled by default with exact server-only env names", () => {
    const config = resolveScaleProviderRuntimeConfig({}, { runtimeEnvironment: "staging" });

    expect(config.providersEnabled).toBe(false);
    expect(Object.keys(config.providers)).toEqual([
      "redis_cache",
      "queue",
      "idempotency_db",
      "rate_limit",
      "observability_export",
    ]);
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache).toEqual({
      enabled: "SCALE_REDIS_CACHE_STAGING_ENABLED",
      required: ["SCALE_REDIS_CACHE_NAMESPACE"],
      optional: ["SCALE_REDIS_CACHE_URL", "REDIS_URL"],
    });
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.queue).toEqual({
      enabled: "SCALE_QUEUE_STAGING_ENABLED",
      required: ["SCALE_QUEUE_PROVIDER", "SCALE_QUEUE_URL", "SCALE_QUEUE_NAMESPACE"],
      optional: [],
    });
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.idempotency_db).toEqual({
      enabled: "SCALE_IDEMPOTENCY_DB_STAGING_ENABLED",
      required: ["SCALE_IDEMPOTENCY_DB_URL", "SCALE_IDEMPOTENCY_TABLE"],
      optional: [],
    });
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.rate_limit).toEqual({
      enabled: "SCALE_RATE_LIMIT_STAGING_ENABLED",
      productionEnabled: "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
      required: ["SCALE_RATE_LIMIT_STORE_URL", "SCALE_RATE_LIMIT_NAMESPACE"],
      optional: ["SCALE_RATE_ENFORCEMENT_MODE", "SCALE_RATE_LIMIT_TEST_NAMESPACE"],
    });
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.observability_export).toEqual({
      enabled: "SCALE_OBSERVABILITY_EXPORT_STAGING_ENABLED",
      productionEnabled: "SCALE_OBSERVABILITY_EXPORT_PRODUCTION_ENABLED",
      required: ["SCALE_OBSERVABILITY_EXPORT_ENDPOINT", "SCALE_OBSERVABILITY_EXPORT_TOKEN"],
      optional: ["SCALE_OBSERVABILITY_EXPORT_NAMESPACE"],
    });
  });

  it("reports exact missing env names when a provider flag is enabled without provider values", () => {
    const config = resolveScaleProviderRuntimeConfig(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        SCALE_QUEUE_STAGING_ENABLED: "true",
      },
      { runtimeEnvironment: "staging" },
    );

    expect(config.providers.redis_cache).toEqual(
      expect.objectContaining({
        enabledFlag: "enabled",
        configured: false,
        liveNetworkAllowed: false,
        missingEnvNames: ["SCALE_REDIS_CACHE_NAMESPACE", "SCALE_REDIS_CACHE_URL", "REDIS_URL"],
      }),
    );
    expect(config.providers.queue.missingEnvNames).toEqual([
      "SCALE_QUEUE_PROVIDER",
      "SCALE_QUEUE_URL",
      "SCALE_QUEUE_NAMESPACE",
    ]);
    expect(getScaleProviderMissingEnvNames(config)).toEqual([
      "REDIS_URL",
      "SCALE_QUEUE_NAMESPACE",
      "SCALE_QUEUE_PROVIDER",
      "SCALE_QUEUE_URL",
      "SCALE_REDIS_CACHE_NAMESPACE",
      "SCALE_REDIS_CACHE_URL",
    ]);
  });

  it("allows provider network only when explicitly enabled, configured, and staging guarded", () => {
    const staging = resolveScaleProviderRuntimeConfig(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        REDIS_URL: "rediss://cache.example.invalid",
        SCALE_REDIS_CACHE_NAMESPACE: "rik-staging",
      },
      { runtimeEnvironment: "staging" },
    );
    const production = resolveScaleProviderRuntimeConfig(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        REDIS_URL: "rediss://cache.example.invalid",
        SCALE_REDIS_CACHE_NAMESPACE: "rik-staging",
      },
      { runtimeEnvironment: "production" },
    );

    expect(staging.providers.redis_cache).toEqual(
      expect.objectContaining({
        configured: true,
        liveNetworkAllowed: true,
      }),
    );
    expect(staging.providersEnabled).toBe(true);
    expect(production.productionGuard).toBe(false);
    expect(production.providers.redis_cache.liveNetworkAllowed).toBe(false);
    expect(production.providersEnabled).toBe(false);
  });

  it("allows only approved provider types to opt in to production network explicitly", () => {
    const production = resolveScaleProviderRuntimeConfig(
      {
        SCALE_REDIS_CACHE_STAGING_ENABLED: "true",
        REDIS_URL: "rediss://cache.example.invalid",
        SCALE_REDIS_CACHE_NAMESPACE: "rik-production",
        SCALE_RATE_LIMIT_PRODUCTION_ENABLED: "true",
        SCALE_RATE_LIMIT_STORE_URL: "rediss://rate-limit.example.invalid",
        SCALE_RATE_LIMIT_NAMESPACE: "rik-production",
        SCALE_OBSERVABILITY_EXPORT_PRODUCTION_ENABLED: "true",
        SCALE_OBSERVABILITY_EXPORT_ENDPOINT: "https://observability.example.invalid/v1/export",
        SCALE_OBSERVABILITY_EXPORT_TOKEN: "server-only-token",
      },
      { runtimeEnvironment: "production" },
    );

    expect(production.productionGuard).toBe(false);
    expect(production.providers.redis_cache).toEqual(
      expect.objectContaining({
        configured: true,
        liveNetworkAllowed: false,
      }),
    );
    expect(production.providers.observability_export).toEqual(
      expect.objectContaining({
        enabledFlag: "missing",
        productionEnabledFlag: "enabled",
        configured: true,
        liveNetworkAllowed: true,
      }),
    );
    expect(production.providers.queue.liveNetworkAllowed).toBe(false);
    expect(production.providers.rate_limit).toEqual(
      expect.objectContaining({
        enabledFlag: "missing",
        productionEnabledFlag: "enabled",
        configured: true,
        liveNetworkAllowed: true,
      }),
    );
    expect(production.providers.idempotency_db.liveNetworkAllowed).toBe(false);
    expect(production.providersEnabled).toBe(true);

    const missingConfig = resolveScaleProviderRuntimeConfig(
      {
        SCALE_OBSERVABILITY_EXPORT_PRODUCTION_ENABLED: "true",
        SCALE_RATE_LIMIT_PRODUCTION_ENABLED: "true",
      },
      { runtimeEnvironment: "production" },
    );
    expect(missingConfig.providers.observability_export).toEqual(
      expect.objectContaining({
        productionEnabledFlag: "enabled",
        configured: false,
        liveNetworkAllowed: false,
        missingEnvNames: ["SCALE_OBSERVABILITY_EXPORT_ENDPOINT", "SCALE_OBSERVABILITY_EXPORT_TOKEN"],
      }),
    );
    expect(getScaleProviderMissingEnvNames(missingConfig)).toEqual([
      "SCALE_OBSERVABILITY_EXPORT_ENDPOINT",
      "SCALE_OBSERVABILITY_EXPORT_TOKEN",
      "SCALE_RATE_LIMIT_NAMESPACE",
      "SCALE_RATE_LIMIT_STORE_URL",
    ]);
  });

  it("does not expose server/provider secrets through public mobile env names", () => {
    const names = Object.values(SCALE_PROVIDER_RUNTIME_ENV_NAMES).flatMap((entry) => [
      entry.enabled,
      entry.productionEnabled,
      ...entry.required,
      ...entry.optional,
    ]).filter((name): name is string => typeof name === "string");

    expect(names.every((name) => !name.startsWith("EXPO_PUBLIC_"))).toBe(true);
    expect(names).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(names).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
  });
});
