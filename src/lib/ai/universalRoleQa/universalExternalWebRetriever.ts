import type {
  UniversalExternalWebRequest,
  UniversalExternalWebResult,
  UniversalRoleQaSourcePlan,
} from "./universalSourcePlanner";
import { normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalExternalWebRetrievalInput = {
  sourcePlan: UniversalRoleQaSourcePlan;
  connected: boolean;
  providedResults?: UniversalExternalWebResult[];
  countryCode?: string;
  cityOrRegion?: string;
};

export type UniversalExternalWebRetrievalResult = {
  source: "public_web";
  connected: boolean;
  used: boolean;
  notAllowed: boolean;
  request?: UniversalExternalWebRequest;
  results: UniversalExternalWebResult[];
};

function mapIntent(intent: UniversalRoleQaSourcePlan["intent"]): UniversalExternalWebRequest["intent"] {
  if (intent === "marketplace_supplier_search") return "supplier_search";
  if (intent === "accounting_entry_help") return "accounting_reference";
  if (intent === "construction_material_calculation") return "construction_material_calculation";
  if (intent === "construction_technology") return "construction_technology";
  if (intent === "construction_norm_reference") return "construction_norm_reference";
  return "construction_estimate";
}

export function retrieveUniversalExternalWeb(
  input: UniversalExternalWebRetrievalInput,
): UniversalExternalWebRetrievalResult {
  if (!input.sourcePlan.internetAllowed) {
    return {
      source: "public_web",
      connected: input.connected,
      used: false,
      notAllowed: true,
      results: [],
    };
  }

  const request: UniversalExternalWebRequest = {
    queryRu: input.sourcePlan.questionRu,
    role: input.sourcePlan.role,
    intent: mapIntent(input.sourcePlan.intent),
    countryCode: input.countryCode,
    cityOrRegion: input.cityOrRegion,
    preferredSourceTypes: input.sourcePlan.intent === "accounting_entry_help"
      ? ["accounting_reference", "tax_reference", "official_regulation"]
      : input.sourcePlan.intent === "marketplace_supplier_search"
        ? ["external_marketplace", "supplier_site", "trusted_article"]
        : ["official_regulation", "manufacturer_manual", "trusted_article", "external_marketplace"],
    maxResults: 5,
  };

  if (!input.connected) {
    return {
      source: "public_web",
      connected: false,
      used: false,
      notAllowed: false,
      request,
      results: [],
    };
  }

  const normalizedQuestion = input.sourcePlan.normalizedQuestionRu;
  const topicNeedle = normalizedQuestion.includes("асфальт")
    ? "асфальт"
    : normalizedQuestion.includes("гкл")
      ? "гкл"
      : normalizedQuestion.includes("проводк") || normalizedQuestion.includes("аванс")
        ? "учет"
        : null;
  const results = (input.providedResults ?? [])
    .filter((result) => Boolean(result.url && result.domain && result.checkedAt))
    .filter((result) => {
      if (!topicNeedle) return true;
      return normalizeUniversalRoleQaQuestion(`${result.titleRu} ${result.snippetRu}`).includes(topicNeedle);
    })
    .slice(0, 5);

  return {
    source: "public_web",
    connected: true,
    used: results.length > 0,
    notAllowed: false,
    request,
    results,
  };
}
