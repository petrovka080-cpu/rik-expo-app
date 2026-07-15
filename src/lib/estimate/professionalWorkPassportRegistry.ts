import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import type { ProfessionalWorkPassport } from "./workPassportContract";

export const PROFESSIONAL_WORK_PASSPORT_TOTAL = 11610;

let cachedRegistry: Map<string, ProfessionalWorkPassport> | null = null;
const SINGLE_PASSPORT_CACHE_LIMIT = 128;
const cachedSinglePassports = new Map<string, ProfessionalWorkPassport>();

function rememberSinglePassport(templateId: string, passport: ProfessionalWorkPassport): ProfessionalWorkPassport {
  cachedSinglePassports.delete(templateId);
  cachedSinglePassports.set(templateId, passport);
  while (cachedSinglePassports.size > SINGLE_PASSPORT_CACHE_LIMIT) {
    const oldest = cachedSinglePassports.keys().next().value;
    if (!oldest) break;
    cachedSinglePassports.delete(oldest);
  }
  return passport;
}

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
  if (cachedRegistry) return cachedRegistry.get(templateId) ?? null;
  const cached = cachedSinglePassports.get(templateId);
  if (cached) return rememberSinglePassport(templateId, cached);
  const passport = buildProfessionalWorkPassport(templateId);
  return passport ? rememberSinglePassport(templateId, passport) : null;
}

export function clearProfessionalWorkPassportRuntimeCaches(): void {
  cachedRegistry = null;
  cachedSinglePassports.clear();
  clearProfessionalWorkPassportBuildCaches();
}

export function getProfessionalWorkPassportRuntimeCacheStats() {
  return {
    fullRegistryLoaded: cachedRegistry !== null,
    singlePassportCacheSize: cachedSinglePassports.size,
    singlePassportCacheLimit: SINGLE_PASSPORT_CACHE_LIMIT,
  };
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
