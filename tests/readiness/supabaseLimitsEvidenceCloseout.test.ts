import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(
    readProjectFile("artifacts/S_LIMITS_2_supabase_limits_evidence_closeout_matrix.json"),
  ) as {
    status: string;
    project: {
      projectRef: string;
      projectName: string;
      stagingNotProduction: boolean;
      ownerAccessConfirmed: boolean;
      productionProjectSelected: boolean;
    };
    billingAccount: {
      accountProjectTier: string;
      spendCapEnabled: boolean;
      includedUsageLimitRisk: boolean;
      paymentMethodBillingPersonalDetailsRecorded: boolean;
      invoicesCardAddressPersonalBillingDataRecorded: boolean;
    };
    connectionPooling: {
      poolerMode: string;
      connectionPoolSizeBackendConnections: number;
      maxClientConnections: number;
      directDbMaxConnections: string;
      statementTimeout: string;
    };
    advisors: {
      securityAdvisorErrors: number;
      securityAdvisorWarnings: number;
      performanceAdvisorErrors: number;
      performanceAdvisorWarnings: number;
    };
    edgeFunctions: { count: number; functions: string[]; stagingBffBaseUrl: string };
    safeDbMetadataChecks: {
      possible: boolean;
      businessTablesQueried: boolean;
      rowsDumped: boolean;
      connectionStringPrinted: boolean;
      envValuesPrinted: boolean;
      checks: Array<{ sql: string; status: string }>;
    };
    sLoad11Decision: { status: string; allowed: boolean; blockers: string[] };
    safety: Record<string, boolean>;
  };

describe("S-LIMITS-2 Supabase limits evidence closeout", () => {
  it("records the final human-confirmed Supabase evidence without billing personal details", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("GREEN_LIMITS_EVIDENCE_RECORDED_S_LOAD_11_BLOCKED");
    expect(matrix.project).toEqual(
      expect.objectContaining({
        projectRef: "nxrnjywzxxfdpqmzjorh",
        projectName: "GOX BUILD",
        stagingNotProduction: true,
        ownerAccessConfirmed: true,
        productionProjectSelected: false,
      }),
    );
    expect(matrix.billingAccount).toEqual(
      expect.objectContaining({
        accountProjectTier: "Pro Plan",
        spendCapEnabled: true,
        includedUsageLimitRisk: true,
        paymentMethodBillingPersonalDetailsRecorded: false,
        invoicesCardAddressPersonalBillingDataRecorded: false,
      }),
    );
    expect(matrix.connectionPooling).toEqual(
      expect.objectContaining({
        poolerMode: "Session Pooler",
        connectionPoolSizeBackendConnections: 15,
        maxClientConnections: 200,
        directDbMaxConnections: "unknown",
        statementTimeout: "unknown",
      }),
    );
  });

  it("keeps DB metadata unknown when no safe direct metadata channel exists", () => {
    const matrix = readMatrix();

    expect(matrix.safeDbMetadataChecks.possible).toBe(false);
    expect(matrix.safeDbMetadataChecks.businessTablesQueried).toBe(false);
    expect(matrix.safeDbMetadataChecks.rowsDumped).toBe(false);
    expect(matrix.safeDbMetadataChecks.connectionStringPrinted).toBe(false);
    expect(matrix.safeDbMetadataChecks.envValuesPrinted).toBe(false);
    expect(matrix.safeDbMetadataChecks.checks.map((check) => check.sql)).toEqual([
      "show statement_timeout;",
      "show max_connections;",
      "show idle_in_transaction_session_timeout;",
      "show lock_timeout;",
      "select current_database();",
      "select current_setting('server_version', true);",
    ]);
    expect(new Set(matrix.safeDbMetadataChecks.checks.map((check) => check.status))).toEqual(
      new Set(["not_checked_safely_unavailable"]),
    );
  });

  it("keeps S-LOAD-11 blocked with the exact platform risk reasons", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_LIMITS_2_supabase_limits_evidence_closeout_proof.md");

    expect(matrix.advisors.securityAdvisorErrors).toBe(258);
    expect(matrix.advisors.securityAdvisorWarnings).toBe(1287);
    expect(matrix.edgeFunctions.count).toBe(8);
    expect(matrix.edgeFunctions.stagingBffBaseUrl).toBe("missing");
    expect(matrix.sLoad11Decision.allowed).toBe(false);
    expect(matrix.sLoad11Decision.blockers).toEqual(
      expect.arrayContaining([
        "operator_approval_no",
        "api_request_limits_unknown",
        "auth_realtime_limits_unknown",
        "enterprise_account_limits_not_confirmed",
        "api_status_warning_visible_errors",
        "spend_cap_enabled",
        "security_advisor_258_errors_1287_warnings",
        "staging_bff_base_url_missing",
      ]),
    );
    expect(proof).toContain("`S_LOAD_11_ALLOWED=false`.");
    expect(proof).not.toContain("S_LOAD_11_ALLOWED=true");
  });

  it("records no production, live-load, provider, SQL, raw payload, secret, or fake-confirmation side effects", () => {
    const matrix = readMatrix();

    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        live1kLoadRun: false,
        fiftyKLoadRun: false,
        bffDeployed: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
        businessTablesQueried: false,
        rowsDumped: false,
        migrationsApplied: false,
        sqlRpcRlsStorageChanged: false,
        secretsPrinted: false,
        envValuesPrinted: false,
        rawPayloadsPrinted: false,
        fakeConfirmation: false,
      }),
    );
  });
});
