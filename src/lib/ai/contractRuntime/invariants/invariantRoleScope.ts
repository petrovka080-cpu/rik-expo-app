import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantRoleScope(trace: AiContractTrace) {
  const passed = trace.gateway.queries.every((query) => query.orgScoped && query.roleScoped);
  return createAiInvariantCheck(
    "ROLE_ORG_SCOPE_REQUIRED",
    passed,
    passed ? undefined : "Gateway trace contains query without role/org scope.",
  );
}
