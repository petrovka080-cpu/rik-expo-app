import { calculateGlobalConstructionEstimate } from "./globalEstimateCalculator";
import type { GlobalEstimateInput } from "./globalEstimateTypes";

export async function calculateGlobalEstimateForAiTool(input: GlobalEstimateInput) {
  return calculateGlobalConstructionEstimate(input);
}
