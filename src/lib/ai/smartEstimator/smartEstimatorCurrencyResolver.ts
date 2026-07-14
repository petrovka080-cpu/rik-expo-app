import {
  currencyForProfessionalRegion,
} from "../professionalEstimateTemplates";
import type {
  ProfessionalCurrency,
  ProfessionalRegion,
} from "../professionalEstimateTemplates";

export function resolveSmartEstimatorCurrency(region: ProfessionalRegion | null): ProfessionalCurrency | null {
  return region ? currencyForProfessionalRegion(region) : null;
}
