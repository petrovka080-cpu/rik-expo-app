import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantNoDangerousMutations(trace: AiContractTrace) {
  const passed = !trace.safety.changedData && !trace.safety.finalSubmit && !trace.safety.dangerousMutation;
  return createAiInvariantCheck(
    "NO_DANGEROUS_MUTATIONS",
    passed,
    passed ? undefined : "AI trace attempted to change data, final submit, or dangerous mutation.",
  );
}
