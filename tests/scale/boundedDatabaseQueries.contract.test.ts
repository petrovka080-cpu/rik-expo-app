import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_DASHBOARD_LIMIT,
  DEFAULT_LIST_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  MAX_LIST_LIMIT,
  clampQueryLimit,
} from "../../src/lib/api/queryLimits";
import {
  GREEN_SCALE_BOUNDED_DATABASE_QUERIES_READY,
  verifyBoundedDatabaseQueries,
} from "../../scripts/scale/verifyBoundedDatabaseQueries";

describe("S_SCALE_01 bounded database query policy", () => {
  it("defines conservative shared query limits and clamps caller input", () => {
    expect(DEFAULT_LIST_LIMIT).toBe(100);
    expect(DEFAULT_DASHBOARD_LIMIT).toBe(50);
    expect(DEFAULT_SEARCH_LIMIT).toBe(25);
    expect(MAX_LIST_LIMIT).toBe(250);
    expect(clampQueryLimit(undefined)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampQueryLimit(0)).toBe(1);
    expect(clampQueryLimit(37.9)).toBe(37);
    expect(clampQueryLimit(10_000)).toBe(MAX_LIST_LIMIT);
  });

  it("produces a green closeout verification with no broad whitelist", () => {
    const verification = verifyBoundedDatabaseQueries(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_BOUNDED_DATABASE_QUERIES_READY);
    expect(verification.metrics.remainingUnboundedSelectFindings).toBe(0);
    expect(verification.metrics.remainingUnboundedRpcListFindings).toBe(0);
    expect(verification.metrics.queryLimitPolicyAdded).toBe(true);
    expect(verification.metrics.noBroadWhitelist).toBe(true);
  });

  it("keeps the verifier source free of whole-folder allowlist shortcuts", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/scale/verifyBoundedDatabaseQueries.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/ignoreEntireFile|ignoreFile|allowlistFile|src\/lib\/api\/\*\*/);
    expect(source).not.toContain("RPC_BOUND_ARG_RE.test(context)");
    expect(source).toContain("SCALE_BOUND_");
    expect(source).toContain("remainingUnboundedSelectFindings");
  });
});
