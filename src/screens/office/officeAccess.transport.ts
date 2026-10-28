import { runUntypedRpcTransport } from "../../lib/api/_core.transport";

export function createOfficeCompanyAtomically(payload: {
  company: Record<string, unknown>;
  profile: Record<string, unknown>;
}) {
  return runUntypedRpcTransport("office_company_bootstrap_v1", {
    p_company: payload.company,
    p_profile: payload.profile,
  });
}
