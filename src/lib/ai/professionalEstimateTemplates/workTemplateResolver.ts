import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_BY_KEY,
  getProfessionalWorkSpecificTemplate,
} from "./workSpecificTemplateCatalog";
import type {
  ProfessionalWorkSpecificTemplate,
} from "./professionalEstimateTypes";

export function resolveProfessionalWorkTemplate(
  selectedWorkKey: string,
): ProfessionalWorkSpecificTemplate | null {
  return getProfessionalWorkSpecificTemplate(selectedWorkKey);
}

export function hasProfessionalWorkTemplate(selectedWorkKey: string): boolean {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_BY_KEY.has(selectedWorkKey);
}
