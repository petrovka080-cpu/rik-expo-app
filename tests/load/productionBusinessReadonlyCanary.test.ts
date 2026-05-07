import {
  PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES,
  buildProductionBusinessReadonlyCanaryWhitelist,
  classifyProductionBusinessReadonlyCanaryRoute,
  evaluateProductionBusinessReadonlyCanaryAbortCriteria,
  summarizeProductionBusinessReadonlyCanaryMetrics,
  validateProductionBusinessReadonlyCanaryMetricLog,
  validateProductionBusinessReadonlyCanaryRegistry,
  type ProductionBusinessReadonlyCanaryCandidate,
} from "../../scripts/load/productionBusinessReadonlyCanary";

describe("production business read-only canary registry", () => {
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

    expect(whitelist.map((route) => route.routeClass)).toContain("catalog_readonly_search_preview");
    expect(classifications.find((item) => item.routeClass === "catalog_readonly_search_preview")).toEqual(
      expect.objectContaining({
        method: "POST",
        postReadRpcAllowed: true,
        safeForCanary: true,
      }),
    );
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

  it("keeps non-identifying synthetic input as a canary requirement", () => {
    const { classifications } = buildProductionBusinessReadonlyCanaryWhitelist({
      postReadRpcApproved: true,
    });

    expect(classifications.find((item) => item.routeClass === "director_finance_readonly_rpc")).toEqual(
      expect.objectContaining({
        safeForCanary: false,
        reasonsIfFalse: expect.arrayContaining([
          "synthetic_non_identifying_input_missing",
          "requires_user_or_company_identifier",
        ]),
      }),
    );
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
        rawUrl: "https://example.invalid/api/staging-bff/read/catalog-transport-read-scope",
        responseBody: { rows: [{ id: "row-1" }] },
      }).passed,
    ).toBe(false);
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
});
