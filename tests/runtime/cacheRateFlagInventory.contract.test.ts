import fs from "fs";
import os from "os";
import path from "path";

import {
  buildCacheRateFlagInventory,
  buildCacheRateFlagMatrix,
  writeCacheRateFlagInventoryArtifacts,
} from "../../scripts/runtime/cacheRateFlagInventory";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readJson = (filePath: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;

describe("S_CACHE_RATE_01 runtime flag inventory", () => {
  it("discovers real cache/rate env keys and scopes the plan to marketplace.catalog.search only", () => {
    const inventory = buildCacheRateFlagInventory("2026-05-11T00:00:00.000Z");
    const matrix = buildCacheRateFlagMatrix(inventory);

    expect(matrix).toEqual(
      expect.objectContaining({
        final_status: "GREEN_CACHE_RATE_FLAG_INVENTORY_READY",
        actual_env_keys_discovered: true,
        invented_env_keys: 0,
        rollback_path_documented: true,
        env_mutated: false,
        cache_marketplace_catalog_search_only: true,
        rate_limit_marketplace_catalog_search_only: true,
        cache_policy_present: true,
        rate_limit_policy_present: true,
        cache_default_enabled: false,
        rate_limit_default_enabled: false,
        rate_limit_enforcement_enabled_by_default: false,
      }),
    );

    expect(inventory.enablePlan.cache.routeAllowlist).toEqual(["marketplace.catalog.search"]);
    expect(inventory.enablePlan.rateLimit.routeAllowlist).toEqual(["marketplace.catalog.search"]);
    expect(inventory.enablePlan.cache.envWriteValues).toEqual(
      expect.objectContaining({
        SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
        SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
        SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
        SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
        SCALE_REDIS_CACHE_SHADOW_PERCENT: "1",
      }),
    );
    expect(inventory.enablePlan.rateLimit.envWriteValues).toEqual(
      expect.objectContaining({
        SCALE_RATE_ENFORCEMENT_MODE: "enforce_production_real_user_route_canary_only",
        SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST: "marketplace.catalog.search",
        SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT: "1",
      }),
    );
    expect(inventory.enablePlan.healthReadyProbes).toEqual(
      expect.arrayContaining([
        "/health",
        "/ready",
        "/api/staging-bff/diagnostics/cache-shadow-canary",
        "/api/staging-bff/diagnostics/rate-limit-private-smoke",
        "/api/staging-bff/read/marketplace-catalog-search",
      ]),
    );
  });

  it("keeps every inventoried env key anchored in existing cache/rate runtime sources", () => {
    const inventory = buildCacheRateFlagInventory("2026-05-11T00:00:00.000Z");
    const realSource = inventory.source_files.map(readProjectFile).join("\n");

    for (const envKey of inventory.envKeys.all) {
      expect(realSource).toContain(envKey);
    }

    expect(inventory.envKeys.all).toContain("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED");
    expect(inventory.envKeys.all).toContain("SCALE_RATE_ENFORCEMENT_MODE");
    expect(inventory.envKeys.all).toContain("SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST");
    expect(inventory.envKeys.all).toContain("SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT");
    expect(inventory.envKeys.all).toContain("BFF_RATE_LIMIT_METADATA_ENABLED");
  });

  it("documents rollback without reading or mutating runtime env", () => {
    const source = readProjectFile("scripts/runtime/cacheRateFlagInventory.ts");
    const inventory = buildCacheRateFlagInventory("2026-05-11T00:00:00.000Z");

    expect(inventory.enablePlan.rollback.cache.envKeysToRestoreOrDelete).toEqual([
      "SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED",
      "SCALE_REDIS_CACHE_SHADOW_MODE",
      "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED",
      "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST",
      "SCALE_REDIS_CACHE_SHADOW_PERCENT",
    ]);
    expect(inventory.enablePlan.rollback.rateLimit.envKeysToRestoreOrDelete).toEqual([
      "SCALE_RATE_ENFORCEMENT_MODE",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
      "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
    ]);
    expect(inventory.enablePlan.rollback.postRollbackProbes).toEqual(["/health", "/ready"]);
    expect(inventory.safety).toEqual(
      expect.objectContaining({
        productionEnvMutationPerformed: false,
        dbWrites: false,
        migrations: false,
        supabaseProjectChanges: false,
        credentialsRead: false,
        credentialsPrinted: false,
        envValuesPrinted: false,
      }),
    );

    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("execFileSync");
    expect(source).not.toContain("putEnv(");
    expect(source).not.toContain("deleteEnv(");
    expect(source).not.toContain(`as${" "}any`);
    expect(source).not.toContain(`@ts${"-"}ignore`);
    expect(source).not.toContain(`@ts${"-"}expect-error`);
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
  });

  it("writes parseable redacted inventory artifacts", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cache-rate-flag-inventory-"));
    try {
      const inventory = buildCacheRateFlagInventory("2026-05-11T00:00:00.000Z");
      const artifacts = writeCacheRateFlagInventoryArtifacts(inventory, tempRoot);
      const inventoryJson = readJson(path.join(tempRoot, artifacts.inventory));
      const matrixJson = readJson(path.join(tempRoot, artifacts.matrix));
      const proof = fs.readFileSync(path.join(tempRoot, artifacts.proof), "utf8");

      expect(inventoryJson.final_status).toBe("GREEN_CACHE_RATE_FLAG_INVENTORY_READY");
      expect(matrixJson.final_status).toBe("GREEN_CACHE_RATE_FLAG_INVENTORY_READY");
      expect(matrixJson.actual_env_keys_discovered).toBe(true);
      expect(matrixJson.invented_env_keys).toBe(0);
      expect(matrixJson.rollback_path_documented).toBe(true);
      expect(proof).toContain("production env was not read or mutated");
      expect(proof).toContain("planned non-secret flag values are documented");
      expect(JSON.stringify({ inventoryJson, matrixJson, proof })).not.toMatch(/rediss?:\/\/|bearer\s+/i);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
