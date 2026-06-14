import { buildProfessionalEstimateSnapshot } from "./professionalEstimateSnapshot";
import type {
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateSnapshot,
  ProfessionalGovernedPrice,
  ProfessionalRegion,
} from "./professionalEstimateTypes";

export function compileProfessionalEstimate(input: {
  selected_work_key: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
  pricebook?: readonly ProfessionalGovernedPrice[];
}): ProfessionalEstimateSnapshot {
  return buildProfessionalEstimateSnapshot(input);
}
