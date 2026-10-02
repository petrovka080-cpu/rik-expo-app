import { calculateGlobalConstructionEstimate } from "../../estimate/backendPlatform/canonicalEstimateHistoricalGlobalProjection";
import type { GlobalEstimateInput } from "./globalEstimateTypes";

export async function calculateGlobalEstimateForAiTool(input: GlobalEstimateInput) {
  return calculateGlobalConstructionEstimate(input);
}
