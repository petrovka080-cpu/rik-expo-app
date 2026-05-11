import fs from "fs";
import path from "path";

import {
  CACHE_MARKETPLACE_SEARCH_NON_ALLOWED_ROUTE,
  CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS,
  CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES,
  CACHE_MARKETPLACE_SEARCH_PERMANENT_ROUTE,
  readCachePermanentEnablePrerequisites,
} from "../../scripts/runtime/cacheMarketplaceSearchPermanentEnable";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (relativePath: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readProjectFile(relativePath));
  if (isRecord(parsed)) {
    return parsed;
  }
  throw new Error(`artifact_json_not_object:${relativePath}`);
};

describe("S_CACHE_03 marketplace search permanent one-route cache enablement", () => {
  it("uses the exact discovered cache flags for marketplace.catalog.search only", () => {
    expect(CACHE_MARKETPLACE_SEARCH_PERMANENT_ROUTE).toBe("marketplace.catalog.search");
    expect(CACHE_MARKETPLACE_SEARCH_NON_ALLOWED_ROUTE).toBe("warehouse.ledger.list");
    expect(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES).toEqual({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "1",
    });
    expect(CACHE_MARKETPLACE_SEARCH_PERMANENT_ENV_VALUES).not.toEqual(
      expect.objectContaining({
        SCALE_RATE_ENFORCEMENT_MODE: expect.any(String),
      }),
    );
  });

  it("keeps prerequisite proofs green before runtime env mutation is allowed", () => {
    const prerequisites = readCachePermanentEnablePrerequisites();

    expect(Object.keys(prerequisites).sort()).toEqual([
      "S_CACHE_01",
      "S_CACHE_02",
      "S_CACHE_RATE_01",
      "S_NIGHT_CACHE_08",
    ]);
    for (const prerequisite of Object.values(prerequisites)) {
      expect(prerequisite.green).toBe(true);
      expect(prerequisite.status).toMatch(/^GREEN_/);
    }
  });

  it("contains health, cold-hit, non-allowed route, rollback, and retained-green proof paths", () => {
    const source = readProjectFile("scripts/runtime/cacheMarketplaceSearchPermanentEnable.ts");

    expect(source).toContain("BLOCKED_CACHE_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE");
    expect(source).toContain("BLOCKED_CACHE_SECOND_HIT_FAILED_ROLLED_BACK");
    expect(source).toContain("BLOCKED_CACHE_HEALTH_NOT_GREEN_ROLLED_BACK");
    expect(source).toContain("rollbackAndFinish");
    expect(source).toContain("restoreEnv");
    expect(source).toContain("putEnv");
    expect(source).toContain("deleteEnv");
    expect(source).toContain("triggerDeploy");
    expect(source).toContain("waitForLive");
    expect(source).toContain('fetchJson("/health")');
    expect(source).toContain('fetchJson("/ready")');
    expect(source).toContain("/api/staging-bff/diagnostics/cache-shadow-canary");
    expect(source).toContain("/api/staging-bff/monitor/cache-shadow");
    expect(source).toContain("/api/staging-bff/read/marketplace-catalog-search");
    expect(source).toContain("/api/staging-bff/read/warehouse-ledger-list");
    expect(source).toContain("firstRequestColdMiss");
    expect(source).toContain("cacheHitSecondCall");
    expect(source).toContain("nonAllowedCacheCommands === 0");
    expect(source).toContain("retained: true");
    expect(source).toContain("rollback_triggered: false");
  });

  it("writes the expected permanent enablement artifact names without storing secrets or payloads", () => {
    expect(CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS).toEqual({
      matrix: "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_matrix.json",
      metrics: "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_metrics.json",
      proof: "artifacts/S_CACHE_03_MARKETPLACE_SEARCH_PERMANENT_ENABLE_proof.md",
    });

    const source = readProjectFile("scripts/runtime/cacheMarketplaceSearchPermanentEnable.ts");
    expect(source).toContain("env_snapshot_redacted");
    expect(source).toContain("raw_cache_keys_stored: false");
    expect(source).toContain("raw_payloads_stored: false");
    expect(source).toContain("credentials_in_cli_args: false");
    expect(source).toContain("credentials_in_artifacts: false");
    expect(source).not.toContain(`as${" "}any`);
    expect(source).not.toContain(`@ts${"-"}ignore`);
    expect(source).not.toContain(`@ts${"-"}expect-error`);
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
    expect(source).not.toMatch(/service[_-]?role/i);
    expect(source).not.toMatch(/listUsers/i);
    expect(source).not.toMatch(/auth\.admin/i);
    expect(source).not.toMatch(/seed/i);
    expect(source).not.toMatch(/runMigration|applyMigration|migrate\(/i);
    expect(source).not.toMatch(/openai|gpt/i);
  });

  it("keeps the generated permanent enablement artifacts green and redacted", () => {
    const matrix = readJson(CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS.matrix);
    const metrics = readJson(CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS.metrics);
    const proof = readProjectFile(CACHE_MARKETPLACE_SEARCH_PERMANENT_ARTIFACTS.proof);

    expect(matrix).toEqual(
      expect.objectContaining({
        final_status: "GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
        route: "marketplace.catalog.search",
        route_count: 1,
        retained: true,
        cacheHit_second_call: true,
        non_allowed_route_cache_commands: 0,
        runtime_scoped_to_one_route: true,
        rollback_triggered: false,
        metrics_redacted: true,
        credentials_in_cli_args: false,
        credentials_in_artifacts: false,
      }),
    );
    expect(metrics).toEqual(
      expect.objectContaining({
        route: "marketplace.catalog.search",
        route_count: 1,
        retained: true,
        cacheHit_second_call: true,
        non_allowed_route_cache_commands: 0,
        diagnostic_green: true,
        metrics_redacted: true,
      }),
    );
    expect(proof).toContain("final_status: GREEN_CACHE_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED");
    expect(JSON.stringify({ matrix, metrics, proof })).not.toMatch(/rediss?:\/\/|bearer\s+|eyJ[A-Za-z0-9_-]{20,}/i);
  });
});
