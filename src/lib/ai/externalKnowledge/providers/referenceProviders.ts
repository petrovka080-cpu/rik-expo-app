import type { AiExternalKnowledgeRequest } from "../aiExternalKnowledgeRequest";
import {
  makeAiExternalSourceRef,
  type AiExternalKnowledgeSourceRef,
} from "../aiExternalKnowledgeSourceTypes";

const CHECKED_AT = "2026-05-20T00:00:00.000Z";

export function getAiOfficialRegulationSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.includes("official_regulation")) return [];
  return [
    makeAiExternalSourceRef({
      id: "ext:official:kg-legal-db-construction",
      origin: "official_regulation",
      sourceType: "official_regulation",
      titleRu: "РћС„РёС†РёР°Р»СЊРЅР°СЏ РїСЂР°РІРѕРІР°СЏ Р±Р°Р·Р° РљС‹СЂРіС‹Р·СЃС‚Р°РЅР°: СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹Рµ С‚СЂРµР±РѕРІР°РЅРёСЏ",
      url: "https://cbd.minjust.gov.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      cityOrRegion: request.cityOrRegion,
      topic: request.intent === "construction_norm_reference" ? "construction_norm" : "construction_technology",
      confidence: "high",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "РќРѕСЂРјР°С‚РёРІРЅСѓСЋ РїСЂРёРјРµРЅРёРјРѕСЃС‚СЊ РЅСѓР¶РЅРѕ СЃРІРµСЂРёС‚СЊ СЃ РїСЂРѕРµРєС‚РѕРј Рё Р°РєС‚СѓР°Р»СЊРЅРѕР№ СЂРµРґР°РєС†РёРµР№.",
    }),
  ];
}

export function getAiManufacturerManualSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.some((sourceType) => sourceType === "manufacturer_manual" || sourceType === "technical_card")) {
    return [];
  }
  const material = request.materialNameRu?.toLowerCase() ?? request.normalizedQuestionRu;
  const drywall = material.includes("РіРєР»") || material.includes("РіРёРїСЃ");
  return [
    makeAiExternalSourceRef({
      id: drywall ? "ext:manufacturer:gypsum-manual" : "ext:manufacturer:technical-card",
      origin: "manufacturer_manual",
      sourceType: "manufacturer_manual",
      titleRu: drywall
        ? "РўРµС…РЅРёС‡РµСЃРєРёРµ РјР°С‚РµСЂРёР°Р»С‹ РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЏ РїРѕ РіРёРїСЃРѕРєР°СЂС‚РѕРЅРЅС‹Рј СЃРёСЃС‚РµРјР°Рј"
        : "РўРµС…РЅРёС‡РµСЃРєР°СЏ РєР°СЂС‚Р° РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЏ РїРѕ РјР°С‚РµСЂРёР°Р»Сѓ/СЂР°Р±РѕС‚Рµ",
      url: drywall
        ? "https://www.usg.com/content/usgcom/en/resource-center/technical-support.html"
        : "https://www.knauf.com/en-US/tools-and-resources/downloads/",
      checkedAt: CHECKED_AT,
      topic: request.intent === "construction_material_calculation" ? "material_consumption" : "construction_technology",
      confidence: "medium",
      canBePresentedAsFact: true,
      requiresReview: false,
      warningRu: "РўРѕС‡РЅС‹Р№ СЂР°СЃС…РѕРґ Р·Р°РІРёСЃРёС‚ РѕС‚ РІС‹Р±СЂР°РЅРЅРѕР№ СЃРёСЃС‚РµРјС‹ Рё РїР°СЃРїРѕСЂС‚Р° РјР°С‚РµСЂРёР°Р»Р°.",
    }),
  ];
}

export function getAiExternalMarketplaceSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.some((sourceType) => sourceType === "external_marketplace" || sourceType === "price_reference")) {
    return [];
  }
  const material = request.materialNameRu ?? (request.normalizedQuestionRu.includes("РіРєР»") ? "Р“РљР›" : "СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹Р№ РјР°С‚РµСЂРёР°Р»");
  return [
    makeAiExternalSourceRef({
      id: "ext:marketplace:lalafo-kg",
      origin: "external_marketplace",
      sourceType: "external_marketplace",
      titleRu: `Р С‹РЅРѕС‡РЅС‹Рµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РїРѕ Р·Р°РїСЂРѕСЃСѓ: ${material}`,
      url: "https://lalafo.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      cityOrRegion: request.cityOrRegion,
      topic: request.intent === "marketplace_supplier_search" ? "supplier_search" : "market_price",
      confidence: "medium",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "Р¦РµРЅР° Рё РЅР°Р»РёС‡РёРµ СЏРІР»СЏСЋС‚СЃСЏ СЂС‹РЅРѕС‡РЅРѕР№ РїРѕРґСЃРєР°Р·РєРѕР№ Рё С‚СЂРµР±СѓСЋС‚ РїСЂРѕРІРµСЂРєРё Сѓ РїРѕСЃС‚Р°РІС‰РёРєР°.",
    }),
  ];
}

export function getAiSupplierSiteSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.includes("supplier_site")) return [];
  return [
    makeAiExternalSourceRef({
      id: "ext:supplier:kg-building-supplier",
      origin: "supplier_site",
      sourceType: "supplier_site",
      titleRu: "РЎР°Р№С‚ РїРѕСЃС‚Р°РІС‰РёРєР° СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹С… РјР°С‚РµСЂРёР°Р»РѕРІ",
      url: "https://stroymarket.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      cityOrRegion: request.cityOrRegion,
      topic: "supplier_search",
      confidence: "medium",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "РќСѓР¶РЅРѕ РїРѕРґС‚РІРµСЂРґРёС‚СЊ С†РµРЅСѓ, РЅР°Р»РёС‡РёРµ Рё СЃСЂРѕРє РїРѕСЃС‚Р°РІРєРё РЅР°РїСЂСЏРјСѓСЋ.",
    }),
  ];
}

export function getAiConstructionReferenceSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  const sources: AiExternalKnowledgeSourceRef[] = [];
  if (request.sourcePreference.includes("trusted_construction_reference")) {
    sources.push(makeAiExternalSourceRef({
      id: "ext:construction:trusted-reference",
      origin: "trusted_reference",
      sourceType: "trusted_construction_reference",
      titleRu: "РЎРїСЂР°РІРѕС‡РЅРёРє СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹С… СЂР°Р±РѕС‚: С‚РµС…РЅРѕР»РѕРіРёСЏ, РєРѕРЅС‚СЂРѕР»СЊ, С‚РёРїРѕРІС‹Рµ СЂРёСЃРєРё",
      url: "https://www.wbdg.org/",
      checkedAt: CHECKED_AT,
      topic: request.intent === "construction_estimate" ? "construction_estimate" : "construction_technology",
      confidence: "medium",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "Р­С‚Рѕ СЃРїСЂР°РІРєР°, Р° РЅРµ РїСЂРѕРµРєС‚РЅРѕРµ СЂРµС€РµРЅРёРµ.",
    }));
  }
  if (request.sourcePreference.includes("general_knowledge")) {
    sources.push(makeAiExternalSourceRef({
      id: "ext:general:construction-draft",
      origin: "general_knowledge",
      sourceType: "general_knowledge",
      titleRu: "РћР±С‰РёРµ СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹Рµ Р·РЅР°РЅРёСЏ РґР»СЏ С‡РµСЂРЅРѕРІРѕРіРѕ СЂР°СЃС‡РµС‚Р°",
      checkedAt: CHECKED_AT,
      topic: request.intent === "construction_material_calculation" ? "material_consumption" : "construction_estimate",
      confidence: "low",
      canBePresentedAsFact: false,
      requiresReview: true,
      warningRu: "РћР±С‰РёРµ Р·РЅР°РЅРёСЏ РјРѕР¶РЅРѕ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ РєР°Рє С‡РµСЂРЅРѕРІРёРє, РЅРµ РєР°Рє РїСЂРѕРµРєС‚РЅС‹Р№ С„Р°РєС‚.",
    }));
  }
  return sources;
}

export function getAiAccountingReferenceSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.some((sourceType) => sourceType === "official_accounting_source" || sourceType === "trusted_accounting_reference")) {
    return [];
  }
  return [
    makeAiExternalSourceRef({
      id: "ext:accounting:minfin-kg",
      origin: "official_accounting_source",
      sourceType: "official_accounting_source",
      titleRu: "РњРёРЅРёСЃС‚РµСЂСЃС‚РІРѕ С„РёРЅР°РЅСЃРѕРІ РљС‹СЂРіС‹Р·СЃС‚Р°РЅР°: СѓС‡РµС‚ Рё РѕС‚С‡РµС‚РЅРѕСЃС‚СЊ",
      url: "https://www.minfin.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      topic: "accounting",
      confidence: "high",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "РџСЂРѕРІРѕРґРєР° СЏРІР»СЏРµС‚СЃСЏ СЃРїСЂР°РІРѕС‡РЅРѕР№ СЂРµРєРѕРјРµРЅРґР°С†РёРµР№ Рё С‚СЂРµР±СѓРµС‚ РїСЂРѕРІРµСЂРєРё Р±СѓС…РіР°Р»С‚РµСЂРѕРј.",
    }),
  ];
}

export function getAiTaxReferenceSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.includes("official_tax_source")) return [];
  return [
    makeAiExternalSourceRef({
      id: "ext:tax:sti-kg",
      origin: "official_tax_source",
      sourceType: "official_tax_source",
      titleRu: "Р“РѕСЃСѓРґР°СЂСЃС‚РІРµРЅРЅР°СЏ РЅР°Р»РѕРіРѕРІР°СЏ СЃР»СѓР¶Р±Р° РљС‹СЂРіС‹Р·СЃС‚Р°РЅР°",
      url: "https://sti.gov.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      topic: "tax",
      confidence: "high",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "РќР°Р»РѕРіРѕРІС‹Р№ РІС‹РІРѕРґ С‚СЂРµР±СѓРµС‚ РїСЂРѕРІРµСЂРєРё РїРѕ Р°РєС‚СѓР°Р»СЊРЅРѕР№ РЅРѕСЂРјРµ Рё СѓС‡РµС‚РЅРѕР№ СЃРёС‚СѓР°С†РёРё.",
    }),
  ];
}

export function getAiFinanceReferenceSources(
  request: AiExternalKnowledgeRequest,
): AiExternalKnowledgeSourceRef[] {
  if (!request.sourcePreference.some((sourceType) => sourceType === "official_finance_source" || sourceType === "trusted_finance_reference")) {
    return [];
  }
  return [
    makeAiExternalSourceRef({
      id: "ext:finance:nbkr-kg",
      origin: "official_finance_source",
      sourceType: "official_finance_source",
      titleRu: "РќР°С†РёРѕРЅР°Р»СЊРЅС‹Р№ Р±Р°РЅРє РљС‹СЂРіС‹Р·СЃС‚Р°РЅР°: С„РёРЅР°РЅСЃРѕРІР°СЏ СЃРїСЂР°РІРѕС‡РЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ",
      url: "https://www.nbkr.kg/",
      checkedAt: CHECKED_AT,
      countryCode: request.countryCode ?? "KG",
      topic: "finance",
      confidence: "high",
      canBePresentedAsFact: true,
      requiresReview: true,
      warningRu: "Р¤РёРЅР°РЅСЃРѕРІР°СЏ СЃРїСЂР°РІРєР° РЅРµ СЏРІР»СЏРµС‚СЃСЏ С„РёРЅР°Р»СЊРЅС‹Рј СѓРїСЂР°РІР»РµРЅС‡РµСЃРєРёРј СЂРµС€РµРЅРёРµРј.",
    }),
  ];
}
