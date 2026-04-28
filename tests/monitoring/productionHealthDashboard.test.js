"use strict";

const {
  buildDashboardMetrics,
  buildProductionHealthSnapshot,
  normalizeAppErrorRow,
  redactSensitive,
} = require("../../scripts/monitoring/production-health-format");
const { resolveProductionHealthEnv } = require("../../scripts/monitoring/production-health-queries");
const {
  assertJsonDoesNotContainSecrets,
  buildHealthCheckResult,
} = require("../../scripts/monitoring/checkProductionHealthCore");

const NOW = "2026-04-28T12:00:00.000Z";

function row(overrides) {
  return {
    created_at: "2026-04-28T11:30:00.000Z",
    context: "buyer.proposals",
    message: "RpcValidationError",
    platform: "ios",
    extra: {
      updateGroupId: "group-a",
      runtimeVersion: "runtime-a",
    },
    ...overrides,
  };
}

describe("production health dashboard aggregation", () => {
  it("groups app errors by updateGroupId, runtimeVersion, and domain", () => {
    const metrics = buildDashboardMetrics(
      [
        row({ context: "buyer.proposals" }),
        row({ context: "buyer.proposals" }),
        row({
          context: "warehouse.queue",
          extra: { updateGroupId: "group-b", runtimeVersion: "runtime-b" },
        }),
      ],
      { generatedAt: NOW },
    );

    expect(metrics.windows.last1h.topUpdateGroupIds[0]).toEqual({
      value: "group-a",
      count: 2,
    });
    expect(metrics.windows.last1h.topRuntimeVersions[0]).toEqual({
      value: "runtime-a",
      count: 2,
    });
    expect(metrics.windows.last1h.topDomains[0]).toEqual({
      value: "buyer.proposals",
      count: 2,
    });
  });

  it("classifies severity using OK/WARN/CRITICAL thresholds", () => {
    const warnMetrics = buildDashboardMetrics([row(), row(), row()], {
      generatedAt: NOW,
      thresholds: {
        totalErrors: {
          last1h: { warn: 3, critical: 10 },
          last24h: { warn: 3, critical: 10 },
          last7d: { warn: 3, critical: 10 },
        },
        domainErrors: {
          last1h: { warn: 99, critical: 999 },
          last24h: { warn: 99, critical: 999 },
          last7d: { warn: 99, critical: 999 },
        },
        signalCounts: { warn: 99, critical: 999 },
      },
    });
    const criticalMetrics = buildDashboardMetrics(Array.from({ length: 10 }, () => row()), {
      generatedAt: NOW,
      thresholds: {
        totalErrors: {
          last1h: { warn: 3, critical: 10 },
          last24h: { warn: 3, critical: 10 },
          last7d: { warn: 3, critical: 10 },
        },
        domainErrors: {
          last1h: { warn: 99, critical: 999 },
          last24h: { warn: 99, critical: 999 },
          last7d: { warn: 99, critical: 999 },
        },
        signalCounts: { warn: 99, critical: 999 },
      },
    });

    expect(warnMetrics.severity).toBe("WARN");
    expect(criticalMetrics.severity).toBe("CRITICAL");
  });

  it("redacts signed URLs, tokens, email, and phone-like PII", () => {
    const redacted = redactSensitive(
      "https://example.com/file.pdf?token=secret&expires=999 Authorization: Bearer abc user@test.com +996 555 123 456",
    );

    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("abc");
    expect(redacted).not.toContain("user@test.com");
    expect(redacted).not.toContain("+996 555 123 456");
    expect(redacted).toContain("[redacted]");
  });

  it("reports missing env without exposing secret values", () => {
    const env = resolveProductionHealthEnv({
      PROD_SUPABASE_URL: "",
      PROD_SUPABASE_READONLY_KEY: "",
      PROD_SUPABASE_SERVICE_ROLE_KEY: "super-secret-service-role",
    });
    const snapshot = buildProductionHealthSnapshot({
      generatedAt: NOW,
      rows: [],
      liveSnapshotStatus: "env_missing",
      environment: {
        prodEnvPresent: env.prodEnvPresent,
        productionTouched: false,
        missingKeys: env.missingKeys,
      },
    });

    expect(env.prodEnvPresent).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain("super-secret-service-role");
    expect(snapshot.environment.missingKeys).toEqual([
      "PROD_SUPABASE_URL",
      "PROD_SUPABASE_READONLY_KEY",
    ]);
  });

  it("does not crash on malformed app_errors rows", () => {
    expect(() =>
      buildDashboardMetrics(
        [
          null,
          undefined,
          "bad-row",
          { created_at: "not-a-date", extra: "not-object" },
          row({ message: "safe_json_parse_failed bad-json" }),
        ],
        { generatedAt: NOW },
      ),
    ).not.toThrow();
  });

  it("normalizes malformed rows to safe fallback fields", () => {
    const normalized = normalizeAppErrorRow({
      message: "pdf_webview_error token=abc",
      created_at: "2026-04-28T11:00:00.000Z",
    });

    expect(normalized.name).toBe("pdf_webview_error token=[redacted]");
    expect(normalized.domain).toBe("unknown");
    expect(normalized.createdAtMs).toBe(Date.parse("2026-04-28T11:00:00.000Z"));
  });
});

describe("checkProductionHealth dry-run safety", () => {
  it("returns env_missing for production without readonly env", () => {
    const { result, exitCode } = buildHealthCheckResult({
      target: "production",
      dryRun: true,
      env: {},
    });

    expect(exitCode).toBe(0);
    expect(result).toMatchObject({
      target: "production",
      status: "env_missing",
      productionTouched: false,
      writes: false,
      secretsPrinted: false,
    });
  });

  it("returns env_missing for staging without readonly env", () => {
    const { result } = buildHealthCheckResult({
      target: "staging",
      dryRun: true,
      env: {},
    });

    expect(result.status).toBe("env_missing");
    expect(result.productionTouched).toBe(false);
    expect(result.writes).toBe(false);
  });

  it("rejects unknown targets without external access", () => {
    const { result, exitCode } = buildHealthCheckResult({
      target: "qa",
      dryRun: true,
      env: {},
    });

    expect(exitCode).toBe(2);
    expect(result.status).toBe("invalid_target");
    expect(result.productionTouched).toBe(false);
  });

  it("does not include service-role-like secret values in output", () => {
    const env = {
      PROD_SUPABASE_URL: "https://prod.example.supabase.co",
      PROD_SUPABASE_READONLY_KEY: "readonly-prod-secret",
      PROD_SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      SENTRY_AUTH_TOKEN: "sentry-token-secret",
    };
    const { result } = buildHealthCheckResult({
      target: "production",
      dryRun: true,
      env,
    });
    const output = JSON.stringify(result);

    expect(result.status).toBe("dry_run_ready");
    expect(assertJsonDoesNotContainSecrets(output, env)).toBe(true);
    expect(output).not.toContain("readonly-prod-secret");
    expect(output).not.toContain("service-role-secret");
    expect(output).not.toContain("sentry-token-secret");
  });
});
