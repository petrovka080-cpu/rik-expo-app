import {
  GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
  verifySupabaseRpcRateLimitRuntimeEnforcement,
} from "../../scripts/architecture/verifySupabaseRpcRateLimitRuntimeEnforcement";

describe("architecture: Supabase RPC runtime rate-limit enforcement", () => {
  it("enforces runtime RPC rate limits without direct bypasses", () => {
    const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(process.cwd());

    expect(verification.final_status).toBe(
      GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
    );
    expect(verification.findings).toEqual([]);
    expect(verification.metrics.runtimeEnforcementEnabled).toBe(true);
    expect(verification.metrics.directRpcBypassRemaining).toBe(0);
    expect(verification.metrics.listLikeRpcRuntimeLimited).toBe(true);
    expect(verification.metrics.dynamicRpcBoundariesClassified).toBe(true);
    expect(verification.metrics.mutationRpcApprovalSafe).toBe(true);
  });

  it("keeps adapter-routed literals classified in the runtime policy registry", () => {
    const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(process.cwd());

    expect(verification.adapterRpcCalls.length).toBeGreaterThan(0);
    expect(verification.metrics.adapterRpcCallsClassified).toBeGreaterThan(0);
    expect(
      verification.adapterRpcCalls
        .filter((entry) => entry.rpcName)
        .map((entry) => entry.rpcName),
    ).toEqual(
      expect.arrayContaining([
        "request_items_set_status",
        "wh_issue_free_atomic_v5",
        "warehouse_stock_scope_v2",
      ]),
    );
  });
});
