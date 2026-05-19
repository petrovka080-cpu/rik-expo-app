import type {
  ConstructionCountryProfile,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export function resolveConstructionCountryProfile(params: {
  countryCode?: string | null;
  sources: ConstructionKnowledgeSource[];
}): {
  profile: ConstructionCountryProfile | null;
  missingData: string[];
  blockedReason?: "BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED";
} {
  const countryCode = params.countryCode?.trim().toUpperCase();
  if (!countryCode) {
    return {
      profile: null,
      missingData: ["Не настроен country profile проекта."],
      blockedReason: "BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED",
    };
  }

  const source = params.sources.find((item) =>
    item.type === "country_profile" &&
    (!item.countryCode || item.countryCode.toUpperCase() === countryCode)
  );
  if (!source) {
    return {
      profile: null,
      missingData: [`Не найден country profile с источником для ${countryCode}.`],
      blockedReason: "BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED",
    };
  }

  return {
    profile: {
      countryCode,
      countryNameRu: source.labelRu,
      currency: countryCode === "KG" || countryCode === "KGZ" ? "KGS" : "configured",
      unitSystem: "metric",
      sourceRef: source.id,
    },
    missingData: [],
  };
}

export const aiCountryProfileProvider = resolveConstructionCountryProfile;
export const constructionCountryProfileResolver = resolveConstructionCountryProfile;
