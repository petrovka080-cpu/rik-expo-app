import {
  getSupabaseRpcRuntimePolicy,
  hasBoundedRpcArgs,
  isAdminForbiddenRpcName,
} from "../../src/lib/api/rpcRateLimitPolicy";

describe("api: RPC runtime rate-limit policy", () => {
  it("maps list-like RPCs to runtime window and concurrency limits", () => {
    const policy = getSupabaseRpcRuntimePolicy("marketplace_items_scope_page_v1", {
      p_offset: 0,
      p_limit: 20,
    });

    expect(policy.runtimeEnforcementEnabled).toBe(true);
    expect(policy.runtimeClass).toBe("list_like_read");
    expect(policy.blocked).toBe(false);
    expect(policy.limit.maxRequests).toBeGreaterThan(0);
    expect(policy.limit.concurrency).toBeGreaterThan(0);
  });

  it("requires bounded args for bounded list/search RPCs", () => {
    const policy = getSupabaseRpcRuntimePolicy("marketplace_items_scope_page_v1", {});

    expect(policy.runtimeClass).toBe("list_like_read");
    expect(policy.boundedArgsRequired).toBe(true);
    expect(policy.boundedArgsSatisfied).toBe(false);
    expect(policy.blocked).toBe(true);
  });

  it("keeps scalar/status RPCs lightweight without list classification", () => {
    const policy = getSupabaseRpcRuntimePolicy("get_my_role");

    expect(policy.runtimeClass).toBe("scalar_status");
    expect(policy.boundedArgsRequired).toBe(false);
    expect(policy.blocked).toBe(false);
  });

  it("maps mutation RPCs to approval-safe runtime operations", () => {
    const policy = getSupabaseRpcRuntimePolicy("accounting_pay_invoice_v1", {
      p_client_mutation_id: "client-mutation-id",
    });

    expect(policy.runtimeClass).toBe("mutation_requires_approval");
    expect(policy.rateEnforcementOperation).toBe("accountant.payment.apply");
    expect(policy.limit.concurrency).toBeGreaterThan(0);
  });

  it("blocks unclassified or admin-like RPC names", () => {
    expect(isAdminForbiddenRpcName("admin_list_users")).toBe(true);
    expect(getSupabaseRpcRuntimePolicy("admin_list_users").blocked).toBe(true);
    expect(getSupabaseRpcRuntimePolicy("new_unclassified_rpc").blocked).toBe(true);
  });

  it("recognizes bounded pagination and date-window args without inspecting values", () => {
    expect(hasBoundedRpcArgs({ p_limit: 10, p_offset: 0 })).toBe(true);
    expect(hasBoundedRpcArgs({ p_from: "2026-01-01", p_to: "2026-01-31" })).toBe(true);
    expect(hasBoundedRpcArgs({ p_request_id: "request-id" })).toBe(false);
  });
});
