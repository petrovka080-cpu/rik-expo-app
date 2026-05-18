import { verifySupabaseRpcRateLimitRuntimeEnforcement } from "../../scripts/architecture/verifySupabaseRpcRateLimitRuntimeEnforcement";

describe("architecture: no direct Supabase RPC bypass", () => {
  it("proves every production direct .rpc call reaches the runtime adapter", () => {
    const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(process.cwd());

    expect(verification.metrics.directRpcBypassRemaining).toBe(0);
    expect(verification.directRpcCoverage.length).toBeGreaterThan(0);
    expect(verification.directRpcCoverage.every((entry) => entry.coveredBy)).toBe(true);
  });
});
