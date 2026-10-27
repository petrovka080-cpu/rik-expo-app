import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantGatewayOnlyRetrieval(trace: AiContractTrace) {
  const passed = trace.gateway.used && trace.gateway.queries.length > 0;
  return createAiInvariantCheck(
    "GATEWAY_ONLY_INTERNAL_RETRIEVAL",
    passed,
    passed ? undefined : "Internal app answer has no Domain Data Gateway trace.",
  );
}
