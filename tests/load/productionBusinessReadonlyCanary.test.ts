import {
  BFF_STAGING_MUTATION_ROUTES,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES,
  PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS,
  buildProductionBusinessReadonlyCanaryWhitelist,
  classifyProductionBusinessReadonlyCanaryErrorCode,
  classifyProductionBusinessReadonlyCanaryRoute,
  evaluateProductionBusinessReadonlyCanaryAbortCriteria,
  resolveProductionBusinessReadonlyCanaryServerAuthSecret,
  summarizeProductionBusinessReadonlyCanaryMetrics,
  validateProductionBusinessReadonlyCanaryMetricLog,
  validateProductionBusinessReadonlyCanaryRegistry,
  type ProductionBusinessReadonlyCanaryCandidate,
} from "../../scripts/load/productionBusinessReadonlyCanary";

describe("production business read-only canary registry", () => {
  const expectedReadonlyRouteClasses = [
    "catalog_readonly_search_preview",
    "director_finance_readonly_rpc",
    "warehouse_readonly_rpc",
    "assistant_store_readonly",
  ];

  it("allows POST read-RPC when readonly semantics are proven", () => {
    const catalog = PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES.find(
      (candidate) => candidate.routeClass === "catalog_readonly_search_preview",
    );

    expect(catalog).toBeDefined();
    const classification = classifyProductionBusinessReadonlyCanaryRoute(catalog!, {
      postReadRpcApproved: true,
    });

    expect(classification).toMatchObject({
      method: "POST",
      readonlyContractProven: true,
      clientContractExists: true,
      serverHandlerPresent: true,
      readonlyDbPortUsed: true,
      mutationKey: false,
      dbWritePossible: false,
      postReadRpcAllowed: true,
      safeForCanary: true,
    });
  });

  it("does not treat HTTP method alone as a blocker for approved read-RPC", () => {
    const { whitelist, classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });
    const routeClasses = whitelist.map((route) => route.routeClass);

    expect(routeClasses).toEqual(expectedReadonlyRouteClasses);
    expect(classifications.find((item) => item.routeClass === "catalog_readonly_search_preview")).toEqual(
      expect.objectContaining({
        method: "POST",
        postReadRpcAllowed: true,
        safeForCanary: true,
      }),
    );
  });

  it("locks all four canary domains to readonly, non-writing BFF contracts", () => {
    const { whitelist, classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });

    expect(PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES).toHaveLength(4);
    expect(whitelist).toHaveLength(4);
    expect(whitelist.map((route) => route.routeClass)).toEqual(expectedReadonlyRouteClasses);

    for (const candidate of PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES) {
      expect(candidate).toEqual(
        expect.objectContaining({
          method: "POST",
          semanticKind: "read_rpc",
          typedBffContractExists: true,
          clientContractExists: true,
          serverHandlerPresent: true,
          readonlyDbPortUsed: true,
          readonlyOperationContractProven: true,
          mutationKey: false,
          dbWritePossible: false,
          writeAdapterPresent: false,
          rawPayloadLogging: false,
          rawRowsLogging: false,
          metricsStatusLatencyCountOnly: true,
          syntheticInputApproved: true,
          requiresUserCompanyIdentifiersInInput: false,
        }),
      );
    }

    for (const classification of classifications) {
      expect(classification).toEqual(
        expect.objectContaining({
          readonlyContractProven: true,
          clientContractExists: true,
          serverHandlerPresent: true,
          readonlyDbPortUsed: true,
          mutationKey: false,
          dbWritePossible: false,
          rawPayloadLogging: false,
          rawRowsLogging: false,
          postReadRpcAllowed: true,
          safeForCanary: true,
          reasonsIfFalse: [],
        }),
      );
    }
  });

  it("keeps the director finance canary on the bounded paginated panel scope", () => {
    const director = PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES.find(
      (candidate) => candidate.routeClass === "director_finance_readonly_rpc",
    );

    expect(director).toBeDefined();
    expect(director).toEqual(
      expect.objectContaining({
        routeOperation: "director.finance.rpc.scope",
        readonlyOperationContractProven: true,
        dbWritePossible: false,
      }),
    );
    expect(director?.canaryRequestEnvelope).toEqual({
      input: {
        operation: "director.finance.panel_scope.v4",
        args: {
          p_date_from: "2026-01-01",
          p_date_to: "2026-01-02",
          p_due_days: 30,
          p_critical_days: 7,
          p_limit: 1,
          p_offset: 0,
        },
      },
      metadata: { canary: "present_redacted" },
    });
  });

  it("rejects POST routes when read-RPC approval is absent", () => {
    const { whitelist, classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: false,
    });

    expect(whitelist).toHaveLength(0);
    expect(classifications.find((item) => item.routeClass === "catalog_readonly_search_preview")).toEqual(
      expect.objectContaining({
        postReadRpcAllowed: false,
        safeForCanary: false,
        reasonsIfFalse: expect.arrayContaining(["post_read_rpc_not_approved"]),
      }),
    );
  });

  it("rejects mutation or write semantics even when method is POST read-RPC approved", () => {
    const mutationCandidate: ProductionBusinessReadonlyCanaryCandidate = {
      ...PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES[0]!,
      id: "proposal_submit_mutation",
      routeOperation: "proposal.submit",
      semanticKind: "mutation",
      mutationKey: true,
      dbWritePossible: true,
      writeAdapterPresent: true,
    };

    const classification = classifyProductionBusinessReadonlyCanaryRoute(mutationCandidate, {
      postReadRpcApproved: true,
    });

    expect(classification.safeForCanary).toBe(false);
    expect(classification.reasonsIfFalse).toEqual(
      expect.arrayContaining([
        "readonly_contract_not_proven",
        "mutation_route_key_present",
        "write_semantics_detected",
      ]),
    );
  });

  it("rejects isolated mutation keys and write-capable candidates", () => {
    const baseCandidate = PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES[0]!;
    const unsafeCases: readonly [
      string,
      Partial<ProductionBusinessReadonlyCanaryCandidate>,
      string,
    ][] = [
      ["mutation_key_only", { mutationKey: true }, "mutation_route_key_present"],
      ["db_write_possible_only", { dbWritePossible: true }, "write_semantics_detected"],
      ["write_adapter_present_only", { writeAdapterPresent: true }, "write_semantics_detected"],
    ];

    for (const [id, overrides, expectedReason] of unsafeCases) {
      const classification = classifyProductionBusinessReadonlyCanaryRoute(
        {
          ...baseCandidate,
          ...overrides,
          id,
        },
        { postReadRpcApproved: true },
      );

      expect(classification.safeForCanary).toBe(false);
      expect(classification.reasonsIfFalse).toContain(expectedReason);
    }
  });

  it("blacklists every staging mutation operation outside the readonly canary whitelist", () => {
    const mutationOperations = BFF_STAGING_MUTATION_ROUTES.map((route) => route.operation);
    const forbiddenOperations = [...PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS];
    const { whitelist, classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });
    const readonlyRouteOperations = PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES.map(
      (candidate) => candidate.routeOperation,
    );

    expect(mutationOperations).toHaveLength(7);
    expect(new Set(forbiddenOperations).size).toBe(forbiddenOperations.length);
    expect(forbiddenOperations).toEqual(expect.arrayContaining(mutationOperations));
    expect(validateProductionBusinessReadonlyCanaryRegistry({ classifications })).toEqual({
      passed: true,
      errors: [],
    });

    for (const route of whitelist) {
      expect(mutationOperations).not.toContain(route.routeClass);
    }
    for (const operation of readonlyRouteOperations) {
      expect(mutationOperations).not.toContain(operation);
      expect(forbiddenOperations).not.toContain(operation);
    }
  });

  it("keeps non-identifying synthetic input as a canary requirement", () => {
    const identifyingInputCandidate: ProductionBusinessReadonlyCanaryCandidate = {
      ...PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES[0]!,
      id: "assistant_actor_context_identifying_input",
      routeClass: "assistant_store_readonly",
      syntheticInputApproved: false,
      requiresUserCompanyIdentifiersInInput: true,
      canaryRequestEnvelope: null,
    };

    const classification = classifyProductionBusinessReadonlyCanaryRoute(identifyingInputCandidate, {
      postReadRpcApproved: true,
    });

    expect(classification.safeForCanary).toBe(false);
    expect(classification.reasonsIfFalse).toEqual(
      expect.arrayContaining([
        "synthetic_non_identifying_input_missing",
        "requires_user_or_company_identifier",
        "canary_request_not_defined",
      ]),
    );
  });

  it("defines expanded canary envelopes without user, company, request, token, or prompt keys", () => {
    const { whitelist } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });

    expect(whitelist).toHaveLength(4);
    for (const route of whitelist) {
      expect(JSON.stringify(route.canaryRequestEnvelope)).not.toMatch(
        /"[^"]*(user|company|request|token|secret|prompt|body|row|url)[^"]*"\s*:/i,
      );
    }
  });

  it("validates registry mutation rejection and redacted metric-only output", () => {
    const { classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });
    expect(validateProductionBusinessReadonlyCanaryRegistry({ classifications })).toEqual({
      passed: true,
      errors: [],
    });

    expect(
      validateProductionBusinessReadonlyCanaryMetricLog({
        routeClass: "catalog_readonly_search_preview",
        statusClass: "2xx",
        latencyP50: 120,
        latencyP95: 180,
        latencyP99: 180,
        errorCategory: null,
        requestCount: 1,
        successCount: 1,
        failureCount: 0,
      }).passed,
    ).toBe(true);

    expect(
      validateProductionBusinessReadonlyCanaryMetricLog({
        routeClass: "catalog_readonly_search_preview",
        rawUrl: "redacted",
        responseBody: { rows: [{ id: "row-1" }] },
      }).passed,
    ).toBe(false);
  });

  it("blocks all redaction forbidden metric keys and secret-like metric values", () => {
    const forbiddenKeys = [
      "url",
      "uri",
      "token",
      "secret",
      "authorization",
      "cookie",
      "env",
      "payload",
      "body",
      "response",
      "requestBody",
      "responseBody",
      "row",
      "rows",
      "db",
      "redis",
      "user",
      "company",
      "identifier",
      "id",
    ];

    for (const key of forbiddenKeys) {
      const result = validateProductionBusinessReadonlyCanaryMetricLog({ [key]: "redacted" });

      expect(result.passed).toBe(false);
      expect(result.errors).toContain(`forbidden_metric_key:${key}`);
    }

    expect(
      validateProductionBusinessReadonlyCanaryMetricLog({
        routeClass: "catalog_readonly_search_preview",
        statusClass: "error",
        latencyP50: null,
        latencyP95: null,
        latencyP99: null,
        errorCategory: "other_safe_error_category",
        requestCount: 1,
        successCount: 0,
        failureCount: 1,
        extra: "Bearer live-token",
      }).errors,
    ).toEqual(expect.arrayContaining(["forbidden_metric_key:extra", "forbidden_metric_value:extra"]));
  });

  it("summarizes redacted metrics and triggers abort criteria", () => {
    expect(
      summarizeProductionBusinessReadonlyCanaryMetrics([
        {
          routeClass: "catalog_readonly_search_preview",
          statusClass: "2xx",
          latencyMs: 100,
          errorCategory: null,
        },
      ]),
    ).toEqual({
      totalRequestsAttempted: 1,
      totalRequestsCompleted: 1,
      statusClassCounts: { "2xx": 1 },
      latencyP50: 100,
      latencyP95: 100,
      latencyP99: 100,
      observedErrorRate: 0,
      errorCategoryCounts: {},
    });

    expect(
      evaluateProductionBusinessReadonlyCanaryAbortCriteria({
        healthStatus: 200,
        readyStatus: 503,
        observedErrorRate: 0,
        maxErrorRate: 0,
        unexpectedWriteRouteDetected: false,
        redactionUnsafe: false,
      }),
    ).toEqual({ abort: true, reasons: ["ready_failure"] });
  });

  it("keeps abort criteria sensitive to write detection and redaction safety", () => {
    expect(
      evaluateProductionBusinessReadonlyCanaryAbortCriteria({
        healthStatus: 503,
        readyStatus: 503,
        observedErrorRate: 0.5,
        maxErrorRate: 0,
        unexpectedWriteRouteDetected: true,
        redactionUnsafe: true,
      }),
    ).toEqual({
      abort: true,
      reasons: [
        "health_failure",
        "ready_failure",
        "error_rate_exceeded",
        "unexpected_write_route",
        "redaction_unsafe",
      ],
    });
  });

  it("classifies redacted 4xx root-cause categories without raw payloads", () => {
    expect(classifyProductionBusinessReadonlyCanaryErrorCode("BFF_AUTH_REQUIRED")).toBe("auth_category");
    expect(classifyProductionBusinessReadonlyCanaryErrorCode("BFF_ROUTE_NOT_FOUND")).toBe(
      "route_not_live_category",
    );
    expect(classifyProductionBusinessReadonlyCanaryErrorCode("CATALOG_TRANSPORT_BFF_INVALID_OPERATION")).toBe(
      "dto_validation_category",
    );
    expect(classifyProductionBusinessReadonlyCanaryErrorCode("BFF_CATALOG_TRANSPORT_READ_PORT_UNAVAILABLE")).toBe(
      "readonly_route_disabled_category",
    );
    expect(classifyProductionBusinessReadonlyCanaryErrorCode(null)).toBe("error_code_unavailable");
  });

  it("prefers the live Render server auth secret in memory without printing or writing it", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => [
        {
          envVar: {
            key: "BFF_SERVER_AUTH_SECRET",
            value: "live-render-secret",
          },
        },
      ],
    })) as unknown as typeof fetch;

    await expect(
      resolveProductionBusinessReadonlyCanaryServerAuthSecret({
        env: {
          BFF_SERVER_AUTH_SECRET: "stale-local-secret",
          RENDER_API_TOKEN: "render-token",
          RENDER_PRODUCTION_BFF_SERVICE_ID: "srv-production",
        },
        fetchImpl,
      }),
    ).resolves.toEqual({
      source: "render_api_in_memory",
      status: "present",
      secret: "live-render-secret",
      secretPrinted: false,
      secretWritten: false,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/env-vars?limit=100"),
      expect.any(Object),
    );
  });

  it("falls back to local server auth when Render env cannot be read", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 403,
    })) as unknown as typeof fetch;

    await expect(
      resolveProductionBusinessReadonlyCanaryServerAuthSecret({
        env: {
          BFF_SERVER_AUTH_SECRET: "local-secret",
          RENDER_API_TOKEN: "render-token",
          RENDER_PRODUCTION_BFF_SERVICE_ID: "srv-production",
        },
        fetchImpl,
      }),
    ).resolves.toEqual({
      source: "local_env",
      status: "render_api_unreadable",
      secret: "local-secret",
      secretPrinted: false,
      secretWritten: false,
    });
  });
});
