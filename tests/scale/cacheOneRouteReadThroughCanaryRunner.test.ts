import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY runner", () => {
  it("locks the live canary to one readonly cache route with rollback and redacted artifacts", () => {
    const source = readProjectFile("scripts/cache_one_route_read_through_canary.ts");

    expect(source).toContain('"S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY"');
    expect(source).toContain('"GREEN_CACHE_ONE_ROUTE_PASS_AND_ROLLED_BACK"');
    expect(source).toContain('"BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK"');
    expect(source).toContain('"BLOCKED_CACHE_CANARY_FAILED_ROLLBACK_FAILED"');
    expect(source).toContain('const CANARY_ROUTE = "marketplace.catalog.search"');
    expect(source).toContain('const CANARY_PERCENT = "1"');
    expect(source).toContain("SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST");
    expect(source).toContain("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED");
    expect(source).toContain("CACHE_CANARY_APPROVED");
    expect(source).toContain("ROLLBACK_APPROVED");
    expect(source).toContain("findPercentSelectedCanaryInput");
    expect(source).toContain("redactedSnapshot");
    expect(source).toContain("restoreEnv");
    expect(source).toContain("canary_retained: false");
    expect(source).toContain("total_production_mutation_requests: 0");

    expect(source).not.toContain(`@ts${"-"}ignore`);
    expect(source).not.toContain(`as${" "}any`);
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
    expect(source).not.toMatch(/console\.(log|warn|error|info)\([^)]*(token|secret|auth\.secret|baseUrl)/);
    expect(source).not.toMatch(/console\.(log|warn|error|info)\([^)]*canarySelection\.input/);
    expect(source).not.toMatch(/writeArtifacts\([^)]*canarySelection\.input/);
  });
});
