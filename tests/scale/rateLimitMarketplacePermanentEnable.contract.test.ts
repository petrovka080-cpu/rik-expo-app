import fs from "fs";
import path from "path";

import {
  RATE_LIMIT_MARKETPLACE_PERMANENT_ARTIFACTS,
  RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES,
  RATE_LIMIT_MARKETPLACE_PERMANENT_PERCENT,
  RATE_LIMIT_MARKETPLACE_PERMANENT_ROUTE,
  readRateLimitPermanentEnablePrerequisites,
} from "../../scripts/runtime/rateLimitMarketplacePermanentEnable";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = (relativePath: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readProjectFile(relativePath));
  if (isRecord(parsed)) return parsed;
  throw new Error(`artifact_json_not_object:${relativePath}`);
};

describe("S_RATE_03 marketplace search permanent one-route rate-limit enablement", () => {
  it("uses the exact discovered one-route rate-limit flags and keeps percent at 1", () => {
    expect(RATE_LIMIT_MARKETPLACE_PERMANENT_ROUTE).toBe("marketplace.catalog.search");
    expect(RATE_LIMIT_MARKETPLACE_PERMANENT_PERCENT).toBe("1");
    expect(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).toEqual({
      SCALE_RATE_ENFORCEMENT_MODE: "enforce_production_real_user_route_canary_only",
      SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT: "1",
    });
    expect(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).not.toEqual(
      expect.objectContaining({
        SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT: "5",
      }),
    );
    expect(RATE_LIMIT_MARKETPLACE_PERMANENT_ENV_VALUES).not.toEqual(
      expect.objectContaining({
        SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT: "10",
      }),
    );
  });

  it("keeps prerequisite rate-limit proofs green before runtime env mutation is allowed", () => {
    const prerequisites = readRateLimitPermanentEnablePrerequisites();

    expect(Object.keys(prerequisites).sort()).toEqual(["S_CACHE_RATE_01", "S_RATE_01", "S_RATE_02"]);
    for (const prerequisite of Object.values(prerequisites)) {
      expect(prerequisite.green).toBe(true);
      expect(prerequisite.status).toMatch(/^GREEN_/);
    }
  });

  it("contains health, selected, non-selected, private smoke, no-second-route, and rollback paths", () => {
    const source = readProjectFile("scripts/runtime/rateLimitMarketplacePermanentEnable.ts");

    expect(source).toContain("BLOCKED_RATE_LIMIT_RUNTIME_NOT_SCOPED_TO_ONE_ROUTE");
    expect(source).toContain("BLOCKED_RATE_LIMIT_HEALTH_NOT_GREEN_ROLLED_BACK");
    expect(source).toContain("BLOCKED_RATE_LIMIT_PROOF_FAILED_ROLLED_BACK");
    expect(source).toContain("rollbackAndFinish");
    expect(source).toContain("restoreEnv");
    expect(source).toContain("putEnv");
    expect(source).toContain("deleteEnv");
    expect(source).toContain("triggerDeploy");
    expect(source).toContain("waitForLive");
    expect(source).toContain('fetchJson("/health")');
    expect(source).toContain('fetchJson("/ready")');
    expect(source).toContain("/api/staging-bff/read/marketplace-catalog-search");
    expect(source).toContain("/api/staging-bff/read/warehouse-ledger-list");
    expect(source).toContain("/api/staging-bff/diagnostics/rate-limit-private-smoke");
    expect(source).toContain("selected_subject_proof");
    expect(source).toContain("non_selected_subject_proof");
    expect(source).toContain("private_smoke");
    expect(source).toContain("second_route_enabled: secondRouteEnabled");
    expect(source).toContain("no_5_percent_expansion: true");
    expect(source).toContain("no_10_percent_expansion: true");
    expect(source).toContain("retained: true");
    expect(source).toContain("rollback_triggered: false");
  });

  it("does not introduce forbidden auth, DB, provider, cache, or secret behavior", () => {
    const source = readProjectFile("scripts/runtime/rateLimitMarketplacePermanentEnable.ts");

    expect(source).toContain("env_snapshot_redacted");
    expect(source).toContain("raw_subjects_stored: false");
    expect(source).toContain("raw_keys_stored: false");
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
    expect(source).not.toMatch(/runMigration|applyMigration|migrate\(/i);
    expect(source).not.toMatch(/openai|gpt/i);
  });

  it("keeps generated permanent enablement artifacts green and redacted when present", () => {
    if (!fs.existsSync(path.join(PROJECT_ROOT, RATE_LIMIT_MARKETPLACE_PERMANENT_ARTIFACTS.matrix))) {
      return;
    }

    const matrix = readJson(RATE_LIMIT_MARKETPLACE_PERMANENT_ARTIFACTS.matrix);
    const proof = readProjectFile(RATE_LIMIT_MARKETPLACE_PERMANENT_ARTIFACTS.proof);

    expect(matrix).toEqual(
      expect.objectContaining({
        final_status: "GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED",
        route: "marketplace.catalog.search",
        route_count: 1,
        rate_limit_percent: 1,
        retained: true,
        selected_subject_proof: true,
        non_selected_subject_proof: true,
        private_smoke: true,
        second_route_enabled: false,
        artifacts_redacted: true,
        credentials_in_cli_args: false,
        credentials_in_artifacts: false,
      }),
    );
    expect(proof).toContain("final_status: GREEN_RATE_LIMIT_MARKETPLACE_SEARCH_PERMANENTLY_ENABLED");
    expect(JSON.stringify({ matrix, proof })).not.toMatch(/rediss?:\/\/|bearer\s+|eyJ[A-Za-z0-9_-]{20,}|rlp(?:s|n)[a-z0-9-]+/i);
  });
});
