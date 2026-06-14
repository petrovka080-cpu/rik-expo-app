import { runSmartEstimatorOrchestrator } from "./smartEstimatorOrchestrator";
import type { SmartEstimatorInput, SmartEstimatorResult } from "./smartEstimatorTypes";

export function runSmartEstimatorProtocol(input: SmartEstimatorInput): SmartEstimatorResult {
  return runSmartEstimatorOrchestrator(input);
}

export function smartEstimatorResultIsTerminal(result: SmartEstimatorResult): boolean {
  return (
    result.status === "ESTIMATE_READY" ||
    result.status === "PARTIAL_PRICE_MISSING" ||
    result.status === "NEEDS_CLARIFICATION" ||
    result.status === "WORK_NOT_SUPPORTED"
  );
}
