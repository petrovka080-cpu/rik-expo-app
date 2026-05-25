import { resolveRoofingWorkType } from "./roofingWorkTypeResolver";
import { resolveWaterproofingWorkType } from "./waterproofingWorkTypeResolver";

export type WorkTypeDisambiguationConfidence = "high" | "medium";

export type WorkTypeDisambiguationResult = {
  workKey: string;
  confidence: WorkTypeDisambiguationConfidence;
  reason: string;
};

export function normalizeWorkTypeDisambiguationText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"']/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasAnyWorkTypeTerm(normalized: string, terms: readonly string[]): boolean {
  return terms.some((term) => normalized.includes(term));
}

export function resolveWorkTypeDisambiguation(text: string | undefined): WorkTypeDisambiguationResult | null {
  const normalized = normalizeWorkTypeDisambiguationText(text ?? "");
  if (!normalized) return null;

  return resolveWaterproofingWorkType(normalized) ?? resolveRoofingWorkType(normalized);
}
