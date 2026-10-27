import type { AiExternalKnowledgeSourceRef } from "./aiExternalKnowledgeSourceTypes";

export type AiExternalSourceSanitizerResult = {
  passed: boolean;
  allowedSources: AiExternalKnowledgeSourceRef[];
  blockedSources: {
    source: AiExternalKnowledgeSourceRef;
    reasonRu: string;
  }[];
  warningsRu: string[];
};

function blockReason(source: AiExternalKnowledgeSourceRef): string | null {
  if (source.origin === "public_web" && !source.url) return "public web источник без URL";
  if (source.origin === "public_web" && !source.checkedAt) return "public web источник без checkedAt";
  if (source.origin === "public_web" && source.sourceType === "controlled_external_source") {
    return "controlled_external_source нельзя показывать как live public_web";
  }
  if (source.sourceType === "unknown" && source.canBePresentedAsFact) {
    return "unknown source нельзя использовать как факт";
  }
  if (source.canBeUsedAsProjectFact) return "внешний источник нельзя использовать как проектный факт";
  if ((source.topic === "tax" || source.topic === "accounting") && source.sourceType === "trusted_construction_reference") {
    return "строительный справочник не является бухгалтерским/налоговым источником";
  }
  if (source.sourceType === "official_tax_source" && source.domain && /blog|medium|forum/i.test(source.domain)) {
    return "случайный блог не может быть official tax source";
  }
  return null;
}

export function sanitizeAiExternalSources(
  sources: AiExternalKnowledgeSourceRef[],
): AiExternalSourceSanitizerResult {
  const allowedSources: AiExternalKnowledgeSourceRef[] = [];
  const blockedSources: AiExternalSourceSanitizerResult["blockedSources"] = [];
  const warningsRu: string[] = [];

  for (const source of sources) {
    const reasonRu = blockReason(source);
    if (reasonRu) {
      blockedSources.push({ source, reasonRu });
      continue;
    }
    if (source.sourceType === "general_knowledge") {
      warningsRu.push("общие знания отмечены как черновик, не проектный факт");
    }
    if (source.requiresReview) {
      warningsRu.push(`${source.titleRu}: требуется проверка человеком`);
    }
    allowedSources.push(source);
  }

  return {
    passed: blockedSources.length === 0,
    allowedSources,
    blockedSources,
    warningsRu: [...new Set(warningsRu)],
  };
}
