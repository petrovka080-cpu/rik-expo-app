import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
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
  let actualTotal = 0;
  let baseTotal = 0;
  let expandedTotal = 0;
  let rowCount = 0;
  const familyIds = new Set<string>();

  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) continue;
    actualTotal += 1;
    if (passport.templateKind === "base_10000") baseTotal += 1;
    if (passport.templateKind === "expanded_complex_1610") expandedTotal += 1;
    rowCount += passport.boqRecipe.rowCount;
    familyIds.add(passport.familyId);
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  return {
    expected_total: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    actual_total: actualTotal,
    base_10000_total: baseTotal,
    expanded_complex_1610_total: expandedTotal,
    family_count: familyIds.size,
    row_count: rowCount,
  };
}
