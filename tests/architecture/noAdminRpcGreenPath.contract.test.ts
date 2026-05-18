import {
  getSupabaseRpcRuntimePolicy,
  isAdminForbiddenRpcName,
} from "../../src/lib/api/rpcRateLimitPolicy";
import { verifySupabaseRpcRateLimitRuntimeEnforcement } from "../../scripts/architecture/verifySupabaseRpcRateLimitRuntimeEnforcement";

describe("architecture: no admin RPC green path", () => {
  it("blocks admin-like RPC names in runtime policy", () => {
    expect(isAdminForbiddenRpcName("admin_list_users")).toBe(true);
    expect(getSupabaseRpcRuntimePolicy("admin_list_users").blocked).toBe(true);
    expect(getSupabaseRpcRuntimePolicy("service_role_backdoor").blocked).toBe(true);
  });

  it("does not expose admin/service-role green paths in app runtime RPC source", () => {
    const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(process.cwd());

    expect(verification.metrics.adminGreenPathFound).toBe(false);
    expect(verification.metrics.serviceRoleGreenPathFound).toBe(false);
  });
});
