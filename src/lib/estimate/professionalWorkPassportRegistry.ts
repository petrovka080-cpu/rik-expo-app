import {
  buildProfessionalWorkPassport,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import type { ProfessionalWorkPassport } from "./workPassportContract";

export const PROFESSIONAL_WORK_PASSPORT_TOTAL = 11610;

let cachedRegistry: Map<string, ProfessionalWorkPassport> | null = null;

export function loadProfessionalWorkPassportRegistry(): Map<string, ProfessionalWorkPassport> {
  if (cachedRegistry) return cachedRegistry;
  const registry = new Map<string, ProfessionalWorkPassport>();
  for (const templateId of listProfessionalWorkPassportTemplateIds()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (passport) registry.set(templateId, passport);
  }
  cachedRegistry = registry;
  return registry;
}

export function getProfessionalWorkPassport(templateId: string): ProfessionalWorkPassport | null {
  return loadProfessionalWorkPassportRegistry().get(templateId) ?? null;
}

export function professionalWorkPassportRegistryStats() {
  const registry = loadProfessionalWorkPassportRegistry();
  const passports = [...registry.values()];
  const basePassports = passports.filter((passport) => passport.templateKind === "base_10000");
  const expandedPassports = passports.filter((passport) => passport.templateKind === "expanded_complex_1610");
  return {
    expected_total: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    actual_total: registry.size,
    base_10000_total: basePassports.length,
    expanded_complex_1610_total: expandedPassports.length,
    family_count: new Set(passports.map((passport) => passport.familyId)).size,
    row_count: passports.reduce((sum, passport) => sum + passport.boqRecipe.rowCount, 0),
  };
}
