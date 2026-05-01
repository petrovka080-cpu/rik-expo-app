import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(
    readProjectFile("artifacts/S_LIMITS_3_post_compute_upgrade_recheck_matrix.json"),
  ) as {
    status: string;
    compute_upgrade_completed: boolean;
    old_compute_size: string;
    new_compute_size: string;
    memory_gb: number;
    cpu: string;
    baseline_io_bandwidth_mbps: number;
    max_io_bandwidth_burst_mbps: number;
    daily_burst_time_limit_minutes: number;
    disk_used_gb: number;
    disk_size_gb: number;
    spend_cap_enabled: boolean;
    db_metadata_checks_attempted: boolean;
    statement_timeout: string;
    max_connections: string;
    idle_in_transaction_session_timeout: string;
    lock_timeout: string;
    server_version: string;
    s_load_11_can_be_reconsidered: boolean;
    s_load_11_allowed_now: boolean;
    missing_human_actions: string[];
    production_touched: boolean;
    secrets_printed: boolean;
    raw_payloads_printed: boolean;
    stagingReachability: {
      auth_health_with_apikey: string;
      rest_root_apikey_only: string;
      gateway_reachable: boolean;
    };
    dbMetadataChecks: {
      db_metadata_checks_attempted: boolean;
      db_metadata_checks_executed: boolean;
      business_tables_queried: boolean;
      rows_dumped: boolean;
      checks: Array<{ sql: string; status: string; value: string }>;
    };
    decision: {
      s_load_11_can_be_reconsidered: boolean;
      s_load_11_allowed_now: boolean;
      exact_safe_command_if_approved_later: string;
    };
    safety: Record<string, boolean>;
  };

describe("S-LIMITS-3 post-compute-upgrade recheck", () => {
  it("records the Medium compute upgrade and required budget inputs", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("PARTIAL_POST_COMPUTE_UPGRADE_RECHECK_DB_METADATA_UNAVAILABLE");
    expect(matrix.compute_upgrade_completed).toBe(true);
    expect(matrix.old_compute_size).toBe("Micro");
    expect(matrix.new_compute_size).toBe("Medium");
    expect(matrix.memory_gb).toBe(4);
    expect(matrix.cpu).toBe("2-core ARM CPU");
    expect(matrix.baseline_io_bandwidth_mbps).toBe(347);
    expect(matrix.max_io_bandwidth_burst_mbps).toBe(2085);
    expect(matrix.daily_burst_time_limit_minutes).toBe(30);
    expect(matrix.disk_used_gb).toBe(2.19);
    expect(matrix.disk_size_gb).toBe(8);
    expect(matrix.spend_cap_enabled).toBe(true);
  });

  it("records staging reachability without treating it as full DB metadata proof", () => {
    const matrix = readMatrix();

    expect(matrix.stagingReachability).toEqual(
      expect.objectContaining({
        auth_health_with_apikey: "pass_http_200",
        rest_root_apikey_only: "unauthorized_http_401",
        gateway_reachable: true,
      }),
    );
    expect(matrix.server_version).toBe("17.6.1.054");
  });

  it("keeps metadata values unknown when safe DB metadata checks cannot execute", () => {
    const matrix = readMatrix();

    expect(matrix.db_metadata_checks_attempted).toBe(true);
    expect(matrix.dbMetadataChecks.db_metadata_checks_attempted).toBe(true);
    expect(matrix.dbMetadataChecks.db_metadata_checks_executed).toBe(false);
    expect(matrix.dbMetadataChecks.business_tables_queried).toBe(false);
    expect(matrix.dbMetadataChecks.rows_dumped).toBe(false);
    expect(matrix.statement_timeout).toBe("unknown");
    expect(matrix.max_connections).toBe("unknown");
    expect(matrix.idle_in_transaction_session_timeout).toBe("unknown");
    expect(matrix.lock_timeout).toBe("unknown");
    expect(new Set(matrix.dbMetadataChecks.checks.map((check) => check.status))).toEqual(
      new Set(["not_checked_safely_unavailable"]),
    );
  });

  it("does not allow or recommend S-LOAD-11 reconsideration without metadata and operator approval", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_LIMITS_3_post_compute_upgrade_recheck_proof.md");

    expect(matrix.s_load_11_can_be_reconsidered).toBe(false);
    expect(matrix.s_load_11_allowed_now).toBe(false);
    expect(matrix.decision.s_load_11_can_be_reconsidered).toBe(false);
    expect(matrix.decision.s_load_11_allowed_now).toBe(false);
    expect(matrix.decision.exact_safe_command_if_approved_later).toContain("--profile bounded-1k --allow-live");
    expect(matrix.missing_human_actions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("safe DB metadata channel"),
        expect.stringContaining("post-Medium pooler"),
        expect.stringContaining("Operator must explicitly approve"),
        expect.stringContaining("spend-cap-on disk"),
      ]),
    );
    expect(proof).toContain("`s_load_11_can_be_reconsidered=false`");
    expect(proof).toContain("`s_load_11_allowed_now=false`");
  });

  it("records no production, live-load, provider, SQL, business-table, raw payload, or secret side effects", () => {
    const matrix = readMatrix();

    expect(matrix.production_touched).toBe(false);
    expect(matrix.secrets_printed).toBe(false);
    expect(matrix.raw_payloads_printed).toBe(false);
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
