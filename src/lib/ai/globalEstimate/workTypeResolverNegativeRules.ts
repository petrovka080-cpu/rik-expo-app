import { normalizeWorkTypeDisambiguationText } from "./workTypeDisambiguation";
import { BATHROOM_WATERPROOFING_TERMS, FOUNDATION_WATERPROOFING_TERMS, PLINTH_WATERPROOFING_TERMS, WATERPROOFING_TERMS } from "./waterproofingWorkTypeResolver";
import { ROOF_SURFACE_TERMS } from "./roofingWorkTypeResolver";

export type WorkTypeResolverNegativeRule = {
  id: string;
  requiredTerms: readonly string[];
  forbiddenWorkKeys: readonly string[];
};

export const WORK_TYPE_RESOLVER_NEGATIVE_RULES: readonly WorkTypeResolverNegativeRule[] = [
  {
    id: "roof_waterproofing_must_not_map_to_bathroom",
    requiredTerms: [...WATERPROOFING_TERMS, ...ROOF_SURFACE_TERMS],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
  },
  {
    id: "bathroom_waterproofing_must_not_map_to_roof",
    requiredTerms: [...WATERPROOFING_TERMS, ...BATHROOM_WATERPROOFING_TERMS],
    forbiddenWorkKeys: ["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane"],
  },
  {
    id: "foundation_waterproofing_must_not_map_to_bathroom",
    requiredTerms: [...WATERPROOFING_TERMS, ...FOUNDATION_WATERPROOFING_TERMS, ...PLINTH_WATERPROOFING_TERMS],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
  },
];

function hasAnyTerm(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => term === "roof" ? /\broof\b/.test(normalized) : normalized.includes(term));
}

export function findForbiddenWorkTypeMappings(prompt: string, workKey: string): string[] {
  const normalized = normalizeWorkTypeDisambiguationText(prompt);
  return WORK_TYPE_RESOLVER_NEGATIVE_RULES
    .filter((rule) => {
      const hasRequiredIntent = hasAnyTerm(normalized, WATERPROOFING_TERMS);
      const hasRequiredSurface = hasAnyTerm(
        normalized,
        rule.requiredTerms.filter((term) => !WATERPROOFING_TERMS.includes(term)),
      );
      return hasRequiredIntent && hasRequiredSurface && rule.forbiddenWorkKeys.includes(workKey);
    })
    .map((rule) => rule.id);
}
