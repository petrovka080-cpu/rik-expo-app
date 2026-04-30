import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import {
  PROJECTION_HEALTH_BOUNDARY_CONTRACT,
  PROJECTION_HEALTH_POLICIES,
  buildProjectionHealthSupportSummary,
  evaluateProjectionHealth,
  evaluateProjectionHealthSnapshots,
  getProjectionHealthPolicy,
  type ProjectionHealthSnapshot,
  type ProjectionHealthSurface,
} from "../../src/lib/observability/queueBacklogMetrics";

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

const nowMs = Date.parse("2026-04-30T10:00:00.000Z");

const allSurfaces: readonly ProjectionHealthSurface[] = [
  "director_report_issue_facts_v1",
  "director_works_snapshot",
  "warehouse_stock_summary_v1",
  "buyer_inbox_search_projection",
  "finance_supplier_rollup_v1",
  "finance_object_rollup_v1",
  "finance_panel_spend_projection_v1",
];

describe("S-PROJECTION-HEALTH-1 projection freshness boundary", () => {
  it("defines disabled policies for every prepared projection and rollup surface", () => {
    expect(PROJECTION_HEALTH_BOUNDARY_CONTRACT).toEqual({
      defaultEnabled: false,
      liveDatabaseReadsEnabledByDefault: false,
      productionTouchedByDefault: false,
      externalTelemetryEnabledByDefault: false,
      surfaces: 7,
    });
    expect(PROJECTION_HEALTH_POLICIES.map((policy) => policy.surface)).toEqual(allSurfaces);

    for (const policy of PROJECTION_HEALTH_POLICIES) {
      expect(policy.preparedLayer).toBe(true);
      expect(policy.defaultEnabled).toBe(false);
      expect(policy.liveDatabaseReadsEnabledByDefault).toBe(false);
      expect(policy.piiSafe).toBe(true);
      expect(policy.requiresLastBuiltAt).toBe(true);
      expect(policy.staleAfterMs).toBeGreaterThanOrEqual(policy.freshnessSlaMs);
      expect(policy.criticalAfterMs).toBeGreaterThan(policy.staleAfterMs);
      expect(policy.supportAction).toMatch(/projection|rollup|snapshot|summary|facts/i);
      expect(getProjectionHealthPolicy(policy.surface)).toBe(policy);
    }
  });

  it("evaluates healthy, stale, critical, missing, building, failed, and fallback states without live reads", () => {
    const stockPolicy = getProjectionHealthPolicy("warehouse_stock_summary_v1");
    expect(stockPolicy).not.toBeNull();
    if (!stockPolicy) return;

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs - stockPolicy.freshnessSlaMs,
        rowCount: 500,
        buildStatus: "ready",
      }, nowMs),
    ).toEqual(
      expect.objectContaining({
        state: "healthy",
        reasonCode: "within_freshness_sla",
        rowCountKnown: true,
        productionTouched: false,
        liveDatabaseRead: false,
      }),
    );

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs - stockPolicy.staleAfterMs - 1,
        rowCount: 500,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "stale", reasonCode: "stale_age" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs - stockPolicy.criticalAfterMs - 1,
        rowCount: 500,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "critical", reasonCode: "critical_age" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAt: null,
        rowCount: 500,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "missing", reasonCode: "missing_last_built_at" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAt: "not-a-date",
        rowCount: 500,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "missing", reasonCode: "invalid_last_built_at" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs,
        rowCount: null,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "missing", reasonCode: "missing_row_count" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs,
        rowCount: 500,
        buildStatus: "building",
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "building", reasonCode: "build_in_progress" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs,
        rowCount: 500,
        buildStatus: "failed",
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "failed", reasonCode: "build_failed" }));

    expect(
      evaluateProjectionHealth(stockPolicy, {
        surface: "warehouse_stock_summary_v1",
        lastBuiltAtMs: nowMs,
        rowCount: 500,
        fallbackUsed: true,
      }, nowMs),
    ).toEqual(expect.objectContaining({ state: "stale", reasonCode: "fallback_used" }));
  });

  it("builds a redacted support summary from local snapshots only", () => {
    const snapshots: readonly ProjectionHealthSnapshot[] = PROJECTION_HEALTH_POLICIES.map((policy, index) => ({
      surface: policy.surface,
      lastBuiltAtMs: nowMs - index * 10_000,
      rowCount: 100 + index,
      buildStatus: "ready",
    }));
    const withAttention: readonly ProjectionHealthSnapshot[] = [
      ...snapshots.slice(0, 5),
      {
        surface: "finance_object_rollup_v1",
        lastBuiltAtMs: nowMs - 20_000_000,
        rowCount: 100,
        buildStatus: "ready",
      },
      {
        surface: "finance_panel_spend_projection_v1",
        lastBuiltAtMs: null,
        rowCount: null,
        buildStatus: "ready",
      },
    ];

    const results = evaluateProjectionHealthSnapshots(withAttention, nowMs);
    const summary = buildProjectionHealthSupportSummary(results);

    expect(summary.total).toBe(7);
    expect(summary.states.healthy).toBeGreaterThan(0);
    expect(summary.states.critical + summary.states.missing).toBeGreaterThanOrEqual(2);
    expect(summary.requiresAttention.map((entry) => entry.surface)).toEqual(
      expect.arrayContaining(["finance_object_rollup_v1", "finance_panel_spend_projection_v1"]),
    );
    expect(summary.redacted).toBe(true);
    expect(summary.rawRowsIncluded).toBe(false);
    expect(summary.piiIncluded).toBe(false);
    expect(summary.productionTouched).toBe(false);
    expect(JSON.stringify(summary)).not.toMatch(/email|phone|address|token|rawPayload|databaseUrl|supabaseKey/i);
  });

  it("keeps runtime, database, package, and native files untouched", () => {
    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
        expect.stringMatching(/^src\/screens\//),
        expect.stringMatching(/^src\/components\//),
      ]),
    );

    const source = readProjectFile("src/lib/observability/queueBacklogMetrics.ts");
    expect(source).not.toMatch(/process\.env|PROD_|STAGING_|SUPABASE_|SERVICE_ROLE|console\.(log|warn|error|info)/);
    expect(source).not.toMatch(/fetch\(|createClient|\.rpc\(|\.from\(/);
  });

  it("keeps S-PROJECTION-HEALTH-1 artifacts valid JSON", () => {
    const matrix = JSON.parse(readProjectFile("artifacts/S_PROJECTION_HEALTH_1_matrix.json"));
    expect(matrix.wave).toBe("S-PROJECTION-HEALTH-1");
    expect(matrix.status).toBe("GREEN_DISABLED_BY_DEFAULT");
    expect(matrix.projectionHealth.surfaces).toBe(7);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.sqlRpcChanged).toBe(false);
  });
});
