export type UniversalAccountingKnowledgeDraft = {
  countryCode: string;
  titleRu: string;
  guidanceRu: string[];
  missingDataRu: string[];
  requiresReview: true;
};

export function getUniversalAccountingKnowledgeDraft(countryCode = "KG"): UniversalAccountingKnowledgeDraft {
  return {
    countryCode,
    titleRu: `Справочная бухгалтерская рекомендация, страна учета: ${countryCode}`,
    guidanceRu: [
      "проверить счет, акт, договор и назначение платежа",
      "проводка является справкой, а не финальным бухгалтерским действием",
      "аванс и частичная оплата требуют проверки первичных документов",
    ],
    missingDataRu: ["договор", "акт", "назначение платежа", "налоговый режим компании"],
    requiresReview: true,
  };
}
