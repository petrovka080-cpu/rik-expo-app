import type { MarketplaceIntakeIntentContract } from "./marketplaceIntakeTypes";

export const MARKETPLACE_INTAKE_INTENT_CONTRACTS: readonly MarketplaceIntakeIntentContract[] = [
  {
    intent: "add_product_draft",
    examplesRu: ["добавить товар", "+ добавить товар", "создай карточку товара", "товар в marketplace"],
    requiredContext: "offer_draft",
    allowedSources: ["supplier_profile", "marketplace_draft", "price_list", "certificate", "specification", "pdf_chunk"],
    answerMode: "draft",
  },
  {
    intent: "add_service_draft",
    examplesRu: ["добавить услугу", "+ добавить услугу", "услуга подрядчика", "создай карточку услуги"],
    requiredContext: "offer_draft",
    allowedSources: ["contractor_profile", "marketplace_draft", "license", "portfolio", "specification", "work"],
    answerMode: "draft",
  },
  {
    intent: "check_cards",
    examplesRu: ["проверить карточки", "что не хватает в карточках", "проверь карточку"],
    requiredContext: "offer_draft",
    allowedSources: ["marketplace_draft", "price_list", "certificate", "license", "specification"],
    answerMode: "read",
  },
  {
    intent: "show_request_matches",
    examplesRu: ["подходящие к заявкам", "к каким заявкам подходит", "найди совпадения с заявками"],
    requiredContext: "buyer_request",
    allowedSources: ["marketplace_draft", "approved_marketplace_offer", "buyer_request", "specification"],
    answerMode: "read",
  },
  {
    intent: "send_to_moderation",
    examplesRu: ["отправить на модерацию", "на проверку", "готово к модерации"],
    requiredContext: "offer_draft",
    allowedSources: ["marketplace_draft", "price_list", "certificate", "license", "approval"],
    answerMode: "approval_route",
  },
  {
    intent: "compare_with_request",
    examplesRu: ["сравнить с заявкой", "подходит ли заявке", "проверь по заявке"],
    requiredContext: "buyer_request",
    allowedSources: ["approved_marketplace_offer", "buyer_request", "specification", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "request_rfq_draft",
    examplesRu: ["запросить кп", "подготовь кп", "ответить на rfq"],
    requiredContext: "approved_offer",
    allowedSources: ["approved_marketplace_offer", "buyer_request", "document"],
    answerMode: "draft",
  },
  {
    intent: "add_to_shortlist_draft",
    examplesRu: ["добавить в shortlist", "shortlist", "в список вариантов"],
    requiredContext: "approved_offer",
    allowedSources: ["approved_marketplace_offer", "buyer_request", "approval"],
    answerMode: "draft",
  },
  {
    intent: "show_risks",
    examplesRu: ["показать риски", "почему риск", "риски карточки"],
    requiredContext: "offer_draft",
    allowedSources: ["marketplace_draft", "price_list", "certificate", "license", "buyer_request"],
    answerMode: "read",
  },
  {
    intent: "contractor_acceptance_blockers",
    examplesRu: ["что мешает приемке", "что нужно сдать", "замечания подрядчику"],
    requiredContext: "contractor_work",
    allowedSources: ["work", "document", "pdf_chunk"],
    answerMode: "read",
  },
  {
    intent: "contractor_response_draft",
    examplesRu: ["подготовить ответ", "ответ прорабу", "что написать прорабу"],
    requiredContext: "contractor_work",
    allowedSources: ["work", "document", "contractor_profile"],
    answerMode: "draft",
  },
  {
    intent: "marketplace_source_check",
    examplesRu: ["станет ли source для buyer", "источник для снабженца", "buyer sourcing source"],
    requiredContext: "approved_offer",
    allowedSources: ["approved_marketplace_offer", "buyer_request", "approval"],
    answerMode: "read",
  },
] as const;

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

export function routeMarketplaceIntakeIntent(questionRu: string): MarketplaceIntakeIntentContract {
  const normalized = questionRu.toLowerCase().replace(/ё/g, "е");
  const matched = MARKETPLACE_INTAKE_INTENT_CONTRACTS.find((contract) =>
    contract.examplesRu.some((example) => normalized.includes(example.toLowerCase().replace(/ё/g, "е"))),
  );
  if (matched) return matched;
  if (includesAny(normalized, ["товар", "product", "прайс"])) {
    return MARKETPLACE_INTAKE_INTENT_CONTRACTS[0];
  }
  if (includesAny(normalized, ["услуг", "подряд", "service"])) {
    return MARKETPLACE_INTAKE_INTENT_CONTRACTS[1];
  }
  if (includesAny(normalized, ["заявк", "совпад", "buyer", "снабжен"])) {
    return MARKETPLACE_INTAKE_INTENT_CONTRACTS[3];
  }
  return MARKETPLACE_INTAKE_INTENT_CONTRACTS[2];
}
