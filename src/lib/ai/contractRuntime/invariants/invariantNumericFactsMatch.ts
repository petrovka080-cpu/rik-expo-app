import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantNumericFactsMatch(
  trace: AiContractTrace,
  expectedFacts: readonly { key: string; value: number; tolerance?: number }[],
) {
  const failures = expectedFacts.filter((expected) => {
    const observed = trace.numericFacts.find((fact) => fact.key === expected.key);
    if (!observed) return true;
    const tolerance = expected.tolerance ?? 0;
    return Math.abs(observed.value - expected.value) > tolerance;
  });

  return createAiInvariantCheck(
    "NUMERIC_FACTS_MATCH_EXPECTED",
    failures.length === 0,
    failures.length === 0
      ? undefined
      : `Wrong or missing numeric facts: ${failures.map((failure) => failure.key).join(", ")}.`,
  );
}
