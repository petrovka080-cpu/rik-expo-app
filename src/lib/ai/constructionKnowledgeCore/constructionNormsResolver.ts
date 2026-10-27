import type {
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export type ConstructionNormResolution = {
  allowedToMakeCountrySpecificClaim: boolean;
  allowedToMakeNormClaim: boolean;
  sources: ConstructionKnowledgeSource[];
  missingData: string[];
  generalBasisRu: string;
};

export function resolveConstructionNorms(params: {
  countryCode?: string | null;
  sources: ConstructionKnowledgeSource[];
}): ConstructionNormResolution {
  const normSources = params.sources.filter((source) =>
    source.type === "normative_pdf" ||
    source.type === "company_standard" ||
    source.type === "country_profile"
  );
  const countryCode = params.countryCode?.trim();
  const hasCountryProfile = normSources.some((source) => source.type === "country_profile");
  const hasNormDocument = normSources.some((source) => source.type === "normative_pdf");
  const hasCompanyStandard = normSources.some((source) => source.type === "company_standard");

  const missingData: string[] = [];
  if (!hasNormDocument && !hasCompanyStandard) {
    missingData.push("Не найден нормативный PDF или стандарт компании для нормативного вывода.");
  }
  if (countryCode && !hasCountryProfile) {
    missingData.push("Для утверждения по стране нужен country profile с источником.");
  }

  return {
    allowedToMakeCountrySpecificClaim: Boolean(countryCode && hasCountryProfile && (hasNormDocument || hasCompanyStandard)),
    allowedToMakeNormClaim: hasNormDocument || hasCompanyStandard,
    sources: normSources,
    missingData,
    generalBasisRu:
      "Общее строительное правило: для закрытия работ обычно нужны подтверждающие документы, фотофиксация, акт и ответственная проверка; это не является нормой конкретной страны без источника.",
  };
}

export const aiConstructionNormsProvider = resolveConstructionNorms;
export const constructionNormsResolver = resolveConstructionNorms;
