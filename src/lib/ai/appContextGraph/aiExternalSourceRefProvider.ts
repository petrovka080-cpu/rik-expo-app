import type { AiExternalSourceRef, AiSourceRef } from "./aiSourceRef";

export type AiExternalSourceRefValidation = {
  valid: boolean;
  blockers: string[];
};

export function validateAiExternalSourceRef(source: AiExternalSourceRef): AiExternalSourceRefValidation {
  const blockers = [
    ...(source.url.trim().length > 0 ? [] : ["External source URL is required."]),
    ...(source.domain.trim().length > 0 ? [] : ["External source domain is required."]),
    ...(source.checkedAt.trim().length > 0 ? [] : ["External source checkedAt is required."]),
  ];
  return { valid: blockers.length === 0, blockers };
}

export function externalSourceCanProveInternalFact(): false {
  return false;
}

export function convertExternalSourceToAiSourceRef(source: AiExternalSourceRef, index = 0): AiSourceRef {
  return {
    id: `external:${source.origin}:${source.domain}:${index}`,
    origin: "external_web",
    entityType: "document",
    entityId: source.url,
    labelRu: source.titleRu,
    descriptionRu: `${source.domain} · ${source.checkedAt}`,
    permission: {
      canOpen: false,
      reasonRu: "Внешний источник не является внутренним объектом приложения.",
    },
    evidence: {
      field: source.topic,
      valuePreviewRu: source.url,
      confidence: source.confidence,
    },
    canBePresentedAsFact: source.canBePresentedAsFact,
    requiresReview: source.requiresReview,
  };
}

export function buildAiExternalSourceRefs(sources: readonly AiExternalSourceRef[] | undefined): AiExternalSourceRef[] {
  return (sources ?? []).filter((source) => validateAiExternalSourceRef(source).valid);
}
