import { buildProfessionalEstimateSnapshot } from "../professionalEstimateTemplates";
import type {
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateSnapshot,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";

export function executeSmartEstimatorTemplate(input: {
  selected_work_key: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
}): ProfessionalEstimateSnapshot {
  return buildProfessionalEstimateSnapshot({
    selected_work_key: input.selected_work_key,
    quantity: input.quantity,
    unit: input.unit,
    region: input.region,
  });
}
