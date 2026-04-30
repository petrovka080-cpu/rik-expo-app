import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  EXTERNAL_SCALE_OBSERVABILITY_ADAPTER_CONTRACT,
  IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS,
  IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS,
  IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS,
  IN_MEMORY_SCALE_OBSERVABILITY_MAX_METRIC_TAGS,
  IN_MEMORY_SCALE_OBSERVABILITY_MAX_RECORDS,
  InMemoryScaleObservabilityAdapter,
  NoopScaleObservabilityAdapter,
  resolveInMemoryScaleObservabilityMaxRecords,
} from "../../src/shared/scale/scaleObservabilityAdapters";
import {
  ABUSE_OBSERVABILITY_METADATA,
  AI_WORKFLOW_OBSERVABILITY_METADATA,
  QUEUE_OBSERVABILITY_METADATA,
  REALTIME_OBSERVABILITY_METADATA,
  SCALE_OBSERVABILITY_EVENT_REGISTRY,
  buildScaleObservabilityEvent,
  validateScaleObservabilityEventContract,
} from "../../src/shared/scale/scaleObservabilityEvents";
import {
  SCALE_METRIC_POLICY_REGISTRY,
  getScaleMetricPoliciesByCategory,
  validateScaleMetricPolicy,
} from "../../src/shared/scale/scaleMetricsPolicies";
import {
  MAX_SCALE_OBSERVABILITY_EVENT_BYTES,
  assertScaleObservabilityTagIsBounded,
  sanitizeScaleObservabilityEvent,
  validateScaleObservabilityEvent,
} from "../../src/shared/scale/scaleObservabilitySafety";
import {
  type BffReadOperation,
  getBffReadHandlerMetadata,
} from "../../src/shared/scale/bffReadHandlers";
import {
  type BffMutationOperation,
  getBffMutationHandlerMetadata,
} from "../../src/shared/scale/bffMutationHandlers";
import { CACHE_POLICY_REGISTRY } from "../../src/shared/scale/cachePolicies";
import { JOB_POLICY_REGISTRY } from "../../src/shared/scale/jobPolicies";
import { IDEMPOTENCY_POLICY_REGISTRY } from "../../src/shared/scale/idempotencyPolicies";
import { RATE_ENFORCEMENT_POLICY_REGISTRY } from "../../src/shared/scale/rateLimitPolicies";
import { buildAbuseEnforcementDecision } from "../../src/shared/scale/abuseEnforcementBoundary";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_SERVER_BOUNDARY_CONTRACT,
} from "../../scripts/server/stagingBffServerBoundary";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

describe("S-50K-OBS-INTEGRATION-1 disabled scale observability boundary", () => {
  it("keeps noop and external adapters disabled without external telemetry calls", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    try {
      const event = buildScaleObservabilityEvent({
        eventName: "bff.route.request",
        routeOrOperation: "request.proposal.list",
        safeActorScope: "present_redacted",
        safeCompanyScope: "present_redacted",
        durationMs: 25,
      });
      const noop = new NoopScaleObservabilityAdapter();
      await expect(noop.recordEvent(event)).resolves.toEqual({
        ok: false,
        reason: "disabled",
        externalTelemetrySent: false,
      });
      await expect(
        noop.recordMetric({ metricName: "bff.route.latency", value: 25 }),
      ).resolves.toEqual({
        ok: false,
        reason: "disabled",
        externalTelemetrySent: false,
      });
      await expect(
        noop.recordSpanStart("bff.route.request"),
      ).resolves.toBeNull();
      expect(noop.getHealth()).toEqual({
        kind: "noop",
        enabled: false,
        externalNetworkEnabled: false,
        externalExportEnabledByDefault: false,
        events: 0,
        metrics: 0,
        spans: 0,
      });
      expect(EXTERNAL_SCALE_OBSERVABILITY_ADAPTER_CONTRACT).toEqual(
        expect.objectContaining({
          kind: "external_contract",
          recordEvent: "contract_only",
          externalTelemetryCallsInTests: false,
          externalExportEnabledByDefault: false,
        }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", {
          configurable: true,
          writable: true,
          value: originalFetch,
        });
      } else {
        delete (globalThis as { fetch?: typeof fetch }).fetch;
      }
    }
  });

  it("uses the in-memory adapter for deterministic local proof only", async () => {
    let now = 1_000;
    const adapter = new InMemoryScaleObservabilityAdapter(() => now);
    const event = buildScaleObservabilityEvent({
      eventName: "cache.hit",
      routeOrOperation: "marketplace.catalog.search",
      safeActorScope: "missing",
      safeCompanyScope: "present_redacted",
      result: "success",
    });

    await expect(adapter.recordEvent(event)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    await expect(
      adapter.recordMetric({ metricName: "cache.hit_rate", value: 0.8 }),
    ).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    const span = await adapter.recordSpanStart("cache.hit", now);
    expect(span).toBeTruthy();
    if (!span) return;
    now += 10;
    await expect(adapter.recordSpanEnd(span, now)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    await expect(adapter.flush()).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });

    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        kind: "in_memory",
        enabled: true,
        externalNetworkEnabled: false,
        externalExportEnabledByDefault: false,
        events: 1,
        metrics: 1,
        spans: 1,
        maxEvents: IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS,
        maxMetrics: IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS,
        maxSpans: IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS,
        evictedEvents: 0,
        evictedMetrics: 0,
        evictedSpans: 0,
        invalidRecords: 0,
        flushes: 1,
      }),
    );
  });

  it("keeps the in-memory observability adapter bounded for future runtime use", async () => {
    let now = 10_000;
    expect(resolveInMemoryScaleObservabilityMaxRecords(2, 100)).toBe(2);
    expect(resolveInMemoryScaleObservabilityMaxRecords(500_000, 100)).toBe(
      IN_MEMORY_SCALE_OBSERVABILITY_MAX_RECORDS,
    );
    expect(resolveInMemoryScaleObservabilityMaxRecords(0, 100)).toBe(100);

    const adapter = new InMemoryScaleObservabilityAdapter({
      nowMs: () => now,
      maxEvents: 2,
      maxMetrics: 2,
      maxSpans: 2,
    });
    const firstEvent = buildScaleObservabilityEvent({
      eventName: "cache.hit",
      routeOrOperation: "request.proposal.list",
      safeActorScope: "missing",
      safeCompanyScope: "present_redacted",
      result: "success",
    });
    const secondEvent = buildScaleObservabilityEvent({
      eventName: "cache.miss",
      routeOrOperation: "marketplace.catalog.search",
      safeActorScope: "missing",
      safeCompanyScope: "present_redacted",
      result: "success",
    });
    const thirdEvent = buildScaleObservabilityEvent({
      eventName: "cache.invalidation.planned",
      routeOrOperation: "warehouse.ledger.list",
      safeActorScope: "missing",
      safeCompanyScope: "present_redacted",
      result: "success",
    });

    await expect(adapter.recordEvent(firstEvent)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    await expect(adapter.recordEvent(secondEvent)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    await expect(adapter.recordEvent(thirdEvent)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    expect(adapter.events.map((event) => event.routeOrOperation)).toEqual([
      "marketplace.catalog.search",
      "warehouse.ledger.list",
    ]);

    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: 0.7,
        tags: { route: "request.proposal.list" },
      }),
    ).resolves.toEqual({ ok: true, externalTelemetrySent: false });
    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: 0.8,
        tags: { route: "marketplace.catalog.search" },
      }),
    ).resolves.toEqual({ ok: true, externalTelemetrySent: false });
    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: 0.9,
        tags: { route: "warehouse.ledger.list" },
      }),
    ).resolves.toEqual({ ok: true, externalTelemetrySent: false });
    expect(adapter.metrics.map((metric) => metric.tags?.route)).toEqual([
      "marketplace.catalog.search",
      "warehouse.ledger.list",
    ]);

    const firstSpan = await adapter.recordSpanStart("cache.hit", now);
    const secondSpan = await adapter.recordSpanStart(
      "job.enqueue.planned",
      now + 1,
    );
    const thirdSpan = await adapter.recordSpanStart(
      "realtime.channel_budget.warning",
      now + 2,
    );
    expect(firstSpan).toBeTruthy();
    expect(secondSpan).toBeTruthy();
    expect(thirdSpan).toBeTruthy();
    if (!firstSpan || !secondSpan || !thirdSpan) return;
    expect(adapter.spans.map((span) => span.name)).toEqual([
      "job.enqueue.planned",
      "realtime.channel_budget.warning",
    ]);

    now += 20;
    await expect(adapter.recordSpanEnd(firstSpan, now)).resolves.toEqual({
      ok: false,
      reason: "unsafe_event",
      externalTelemetrySent: false,
    });
    await expect(adapter.recordSpanEnd(thirdSpan, now)).resolves.toEqual({
      ok: true,
      externalTelemetrySent: false,
    });
    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: Number.NaN,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "unsafe_event",
      externalTelemetrySent: false,
    });
    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: 1,
        tags: { route: "person@example.test" },
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "invalid_tag",
      externalTelemetrySent: false,
    });
    await expect(
      adapter.recordMetric({
        metricName: "cache.hit_rate",
        value: 1,
        tags: Object.fromEntries(
          Array.from(
            { length: IN_MEMORY_SCALE_OBSERVABILITY_MAX_METRIC_TAGS + 1 },
            (_, index) => [`tag_${index}`, `value_${index}`],
          ),
        ),
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "invalid_tag",
      externalTelemetrySent: false,
    });
    await expect(
      adapter.recordSpanStart("https://example.test/a?token=signed", now),
    ).resolves.toBeNull();

    expect(adapter.getHealth()).toEqual(
      expect.objectContaining({
        events: 2,
        metrics: 2,
        spans: 2,
        maxEvents: 2,
        maxMetrics: 2,
        maxSpans: 2,
        evictedEvents: 1,
        evictedMetrics: 1,
        evictedSpans: 1,
        invalidRecords: 5,
      }),
    );
  });

  it("defines safe disabled event contracts and metric policies", () => {
    expect(SCALE_OBSERVABILITY_EVENT_REGISTRY).toHaveLength(22);
    for (const eventContract of SCALE_OBSERVABILITY_EVENT_REGISTRY) {
      expect(validateScaleObservabilityEventContract(eventContract)).toBe(true);
      expect(eventContract.redacted).toBe(true);
      expect(eventContract.externalExportEnabledByDefault).toBe(false);
    }

    expect(SCALE_METRIC_POLICY_REGISTRY).toHaveLength(17);
    expect(getScaleMetricPoliciesByCategory("bff")).toHaveLength(2);
    expect(getScaleMetricPoliciesByCategory("cache")).toHaveLength(3);
    expect(getScaleMetricPoliciesByCategory("job")).toHaveLength(3);
    expect(getScaleMetricPoliciesByCategory("idempotency")).toHaveLength(2);
    expect(getScaleMetricPoliciesByCategory("rate_limit")).toHaveLength(2);
    expect(getScaleMetricPoliciesByCategory("realtime")).toHaveLength(2);
    for (const metricPolicy of SCALE_METRIC_POLICY_REGISTRY) {
      expect(validateScaleMetricPolicy(metricPolicy)).toBe(true);
      expect(metricPolicy.defaultEnabled).toBe(false);
      expect(metricPolicy.piiSafe).toBe(true);
      expect(metricPolicy.aggregateSafe).toBe(true);
    }
  });

  it("rejects raw payloads, prompts, secrets, signed URLs, and PII in events", () => {
    const safe = buildScaleObservabilityEvent({
      eventName: "rate_limit.soft_limited",
      routeOrOperation: "proposal.submit",
      reasonCode: "burst_exceeded",
      safeActorScope: "present_redacted",
      safeCompanyScope: "present_redacted",
    });
    expect(validateScaleObservabilityEvent(safe)).toBe(true);
    expect(assertScaleObservabilityTagIsBounded(safe.routeOrOperation)).toBe(
      true,
    );
    expect(JSON.stringify(safe).length).toBeLessThanOrEqual(
      MAX_SCALE_OBSERVABILITY_EVENT_BYTES,
    );

    expect(
      sanitizeScaleObservabilityEvent({ ...safe, rawPayload: { amount: 1 } }),
    ).toEqual({
      ok: false,
      reason: "forbidden_field",
    });
    expect(
      sanitizeScaleObservabilityEvent({ ...safe, rawPrompt: "summarize this" }),
    ).toEqual({
      ok: false,
      reason: "forbidden_field",
    });
    expect(
      sanitizeScaleObservabilityEvent({
        ...safe,
        routeOrOperation: "person@example.test",
      }),
    ).toEqual({
      ok: false,
      reason: "sensitive_value",
    });
    expect(
      sanitizeScaleObservabilityEvent({
        ...safe,
        routeOrOperation: "https://x.test/a?token=signed",
      }),
    ).toEqual({
      ok: false,
      reason: "sensitive_value",
    });
    const capped = sanitizeScaleObservabilityEvent({
      ...safe,
      routeOrOperation: "x".repeat(5_000),
    });
    expect(capped.ok).toBe(true);
    if (capped.ok) {
      expect(capped.event.routeOrOperation).toHaveLength(80);
      expect(JSON.stringify(capped.event).length).toBeLessThanOrEqual(
        MAX_SCALE_OBSERVABILITY_EVENT_BYTES,
      );
    }
  });

  it("attaches observability metadata to BFF, cache, jobs, idempotency, rate, queue, AI, and realtime boundaries", () => {
    for (const route of BFF_STAGING_READ_ROUTES) {
      expect(route.observability).toEqual(
        expect.objectContaining({
          requestEvent: "bff.route.request",
          externalExportEnabledByDefault: false,
        }),
      );
      expect(
        getBffReadHandlerMetadata(route.operation as BffReadOperation)
          .observability,
      ).toEqual(route.observability);
    }
    for (const route of BFF_STAGING_MUTATION_ROUTES) {
      expect(route.observability).toEqual(
        expect.objectContaining({
          errorEvent: "bff.route.error",
          externalExportEnabledByDefault: false,
        }),
      );
      expect(
        getBffMutationHandlerMetadata(route.operation as BffMutationOperation)
          .observability,
      ).toEqual(route.observability);
    }
    expect(BFF_STAGING_SERVER_BOUNDARY_CONTRACT).toEqual(
      expect.objectContaining({
        readRoutesWithObservabilityMetadata: 5,
        mutationRoutesWithObservabilityMetadata: 5,
        observabilityExternalExportEnabledByDefault: false,
      }),
    );

    expect(
      CACHE_POLICY_REGISTRY.every(
        (policy) => policy.observability.hitEvent === "cache.hit",
      ),
    ).toBe(true);
    expect(
      JOB_POLICY_REGISTRY.every(
        (policy) =>
          policy.observability.enqueuePlannedEvent === "job.enqueue.planned",
      ),
    ).toBe(true);
    expect(
      IDEMPOTENCY_POLICY_REGISTRY.every(
        (policy) =>
          policy.observability.reservedEvent === "idempotency.reserved",
      ),
    ).toBe(true);
    expect(
      IDEMPOTENCY_POLICY_REGISTRY.every(
        (policy) =>
          policy.observability.failedFinalEvent === "idempotency.failed_final",
      ),
    ).toBe(true);
    expect(
      RATE_ENFORCEMENT_POLICY_REGISTRY.every(
        (policy) => policy.observability.allowedEvent === "rate_limit.allowed",
      ),
    ).toBe(true);
    expect(
      buildAbuseEnforcementDecision({ duplicateMutationAttempt: true })
        .observability,
    ).toEqual(ABUSE_OBSERVABILITY_METADATA);
    expect(QUEUE_OBSERVABILITY_METADATA.backpressureWarningEvent).toBe(
      "queue.backpressure.warning",
    );
    expect(AI_WORKFLOW_OBSERVABILITY_METADATA.actionPlannedEvent).toBe(
      "ai.workflow.action.planned",
    );
    expect(REALTIME_OBSERVABILITY_METADATA.channelBudgetWarningEvent).toBe(
      "realtime.channel_budget.warning",
    );
    expect(REALTIME_OBSERVABILITY_METADATA.limitProjectionWarningEvent).toBe(
      "realtime.limit_projection.warning",
    );
  });

  it("does not replace app flows, send telemetry, or touch forbidden platform files", () => {
    const roots = [
      "app",
      "src/screens",
      "src/components",
      "src/features",
      "src/lib/api",
    ];
    const activeImports: string[] = [];

    const walk = (relativeDir: string) => {
      const fullDir = path.join(PROJECT_ROOT, relativeDir);
      if (!fs.existsSync(fullDir)) return;
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const relativePath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (
          !/\.(ts|tsx)$/.test(entry.name) ||
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".test.tsx")
        ) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (
          source.includes("shared/scale/scaleObservabilityAdapters") ||
          source.includes("shared/scale/scaleObservabilityEvents") ||
          source.includes("shared/scale/scaleMetricsPolicies") ||
          source.includes("shared/scale/scaleObservabilitySafety")
        ) {
          activeImports.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(activeImports).toEqual([]);
    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^(package\.json|package-lock\.json|app\.json|eas\.json)$/,
        ),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );

    const changedSource = [
      "src/shared/scale/scaleObservabilityAdapters.ts",
      "src/shared/scale/scaleObservabilityEvents.ts",
      "src/shared/scale/scaleMetricsPolicies.ts",
      "src/shared/scale/scaleObservabilitySafety.ts",
    ]
      .map(readProjectFile)
      .join("\n");
    expect(changedSource).not.toMatch(/console\.(log|warn|error|info)/);
    expect(changedSource).not.toMatch(
      /rawPayloadLogged:\s*true|piiLogged:\s*true/,
    );
    expect(changedSource).not.toMatch(
      /SENTRY_AUTH_TOKEN|DATADOG|OTEL_EXPORTER|PROD_|STAGING_/,
    );
  });

  it("keeps artifacts valid JSON", () => {
    const matrix = JSON.parse(
      readProjectFile("artifacts/S_50K_OBS_INTEGRATION_1_matrix.json"),
    );
    expect(matrix.wave).toBe("S-50K-OBS-INTEGRATION-1");
    expect(matrix.observabilityBoundary.externalExportEnabledByDefault).toBe(
      false,
    );
    expect(matrix.events.totalEventTypes).toBe(22);
    expect(matrix.metrics.totalPolicies).toBe(17);
    expect(matrix.integration.bffMetadata).toBe("present");
    expect(matrix.integration.rateLimitMetadata).toBe("present");
    expect(matrix.safety.externalTelemetrySent).toBe(false);
    expect(matrix.safety.packageNativeChanged).toBe(false);

    const runtimeMatrix = JSON.parse(
      readProjectFile("artifacts/S_50K_OBS_RUNTIME_ADAPTER_2_matrix.json"),
    );
    expect(runtimeMatrix.wave).toBe("S-50K-OBS-RUNTIME-ADAPTER-2");
    expect(runtimeMatrix.status).toBe("GREEN_OBS_RUNTIME_GUARDRAIL_READY");
    expect(runtimeMatrix.runtimeGuardrails.maxEventsDefault).toBe(
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS,
    );
    expect(runtimeMatrix.runtimeGuardrails.maxMetricsDefault).toBe(
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS,
    );
    expect(runtimeMatrix.runtimeGuardrails.maxSpansDefault).toBe(
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS,
    );
    expect(runtimeMatrix.runtimeGuardrails.maxMetricTags).toBe(
      IN_MEMORY_SCALE_OBSERVABILITY_MAX_METRIC_TAGS,
    );
    expect(runtimeMatrix.safety.productionTouched).toBe(false);
    expect(runtimeMatrix.safety.stagingTouched).toBe(false);
    expect(runtimeMatrix.safety.externalTelemetryEnabled).toBe(false);
  });
});
