import type { ProductionCompiledExpandedEstimate } from "../../../lib/ai/estimateTemplate10000";

export function estimateHasSavedCalculationTrace(estimate: ProductionCompiledExpandedEstimate): boolean {
  return estimate.rows.every((row) =>
    row.calculationTrace.includes(`template=${estimate.templateKey}`) &&
    row.calculationTrace.includes("normSource=") &&
    row.calculationTrace.includes("result=")
  );
}
