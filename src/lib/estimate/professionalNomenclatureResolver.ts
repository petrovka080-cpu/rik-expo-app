import { normalizeRuText } from "../text/encoding";
import { PROFESSIONAL_BOQ_NOMENCLATURE_REGISTRY, type ProfessionalBoqNomenclatureEntry } from "./professionalBoqNomenclatureRegistry";
import type { ProfessionalBoqLineItemRowType } from "./professionalBoqLineItemQualityContract";

export type ProfessionalNomenclatureResolveInput = {
  rowType: ProfessionalBoqLineItemRowType;
  titleRu: string;
  normId?: string | null;
  normSourceId?: string | null;
  materialKey?: string | null;
  sourceBacked?: boolean;
};

export type ProfessionalNomenclatureResolution = {
  resolved: boolean;
  inferredFromSource: boolean;
  nomenclatureId: string | null;
  nomenclatureName: string;
  entry: ProfessionalBoqNomenclatureEntry | null;
};

export function normalizeProfessionalBoqText(value: string | null | undefined): string {
  return String(normalizeRuText(value ?? ""))
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[_:;,.()[\]{}"'`]+/g, " ")
    .replace(/[/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function typeForRow(rowType: ProfessionalBoqLineItemRowType): ProfessionalBoqNomenclatureEntry["type"] | null {
  if (rowType === "material") return "material";
  if (rowType === "equipment") return "equipment";
  if (rowType === "service" || rowType === "transport" || rowType === "mobilization" || rowType === "document") return "service";
  if (rowType === "work" || rowType === "labor") return "work";
  return null;
}

function entryMatches(entry: ProfessionalBoqNomenclatureEntry, normalizedTitle: string, normalizedContext: string): boolean {
  const names = [entry.nameRu, ...entry.synonyms].map(normalizeProfessionalBoqText);
  return names.some((name) => name && (normalizedTitle.includes(name) || normalizedContext.includes(name)));
}

function sourceBackedFallbackName(input: ProfessionalNomenclatureResolveInput): string {
  return String(normalizeRuText(input.titleRu)).replace(/\s+/g, " ").trim();
}

export function resolveProfessionalNomenclature(
  input: ProfessionalNomenclatureResolveInput,
): ProfessionalNomenclatureResolution {
  const normalizedTitle = normalizeProfessionalBoqText(input.titleRu);
  const normalizedContext = normalizeProfessionalBoqText([
    input.titleRu,
    input.normId,
    input.normSourceId,
    input.materialKey,
  ].filter(Boolean).join(" "));
  const expectedType = typeForRow(input.rowType);
  const entries = expectedType
    ? PROFESSIONAL_BOQ_NOMENCLATURE_REGISTRY.filter((entry) => entry.type === expectedType)
    : PROFESSIONAL_BOQ_NOMENCLATURE_REGISTRY;
  const matched = entries.find((entry) => entryMatches(entry, normalizedTitle, normalizedContext)) ?? null;
  if (matched) {
    return {
      resolved: true,
      inferredFromSource: false,
      nomenclatureId: matched.nomenclatureId,
      nomenclatureName: matched.nameRu,
      entry: matched,
    };
  }

  if (input.sourceBacked && normalizedTitle.length >= 4 && input.normId && input.normSourceId) {
    return {
      resolved: true,
      inferredFromSource: true,
      nomenclatureId: input.normId,
      nomenclatureName: sourceBackedFallbackName(input),
      entry: null,
    };
  }

  return {
    resolved: false,
    inferredFromSource: false,
    nomenclatureId: null,
    nomenclatureName: sourceBackedFallbackName(input),
    entry: null,
  };
}
