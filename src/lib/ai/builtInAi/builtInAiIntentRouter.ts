import {
  routeUniversalEstimateIntent,
} from "../estimateRouting";
import { classifyConstructionWorkOutcome, detectConstructionIntent } from "../worldConstructionInterpreter";
import { createBuiltInAiTraceId } from "./builtInAiRuntimeTrace";
import type { BuiltInAiInput, BuiltInAiIntent, BuiltInAiIntentRoute, BuiltInAiScreenContext } from "./builtInAiTypes";

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const STRONG_ESTIMATE_PATTERNS = [
  /смет/i,
  /стоим/i,
  /сколько\s+стоит/i,
  /посч/i,
  /рассч/i,
  /цена\s+работ/i,
  /под\s+ключ/i,
  /estimate|cost/i,
];

const PRODUCT_SEARCH_PATTERNS = [
  /найд/i,
  /найт/i,
  /подбер/i,
  /подобр/i,
  /запрос/i,
  /КП/i,
  /товар/i,
  /материал/i,
  /арматур/i,
  /купить/i,
  /закуп/i,
  /поставщик/i,
  /доставк/i,
  /pdf\s+по\s+смет/i,
  /Р·Р°РїСЂРѕСЃ/i,
  /РљРџ/i,
  /РїРѕСЃС‚Р°РІС‰РёРє/i,
  /РґРѕСЃС‚Р°РІРє/i,
  /pdf\s+РїРѕ\s+СЃРјРµС‚/i,
  /найд/i,
  /подбер/i,
  /товар/i,
  /материал/i,
  /арматур/i,
  /купить/i,
  /закуп/i,
  /product|material|supplier/i,
  /найд|найти|подбер|подобр|купить|закуп|поставщик|товар|материал/i,
];

const PRODUCT_SEARCH_ACTION_PATTERNS = [
  /find\s+(product|material|supplier)/i,
  /product\s+material/i,
  /material\s+supplier/i,
  /supplier\s+(quote|search|product)/i,
  /quote\s+search/i,
  /РЅР°Р№Рґ/i,
  /РЅР°Р№С‚/i,
  /РїРѕРґР±РµСЂ/i,
  /РїРѕРґРѕР±СЂ/i,
  /РєСѓРїРёС‚СЊ/i,
  /Р·Р°РєСѓРї/i,
  /РїРѕСЃС‚Р°РІС‰РёРє/i,
  /Р В·Р В°Р С—РЎР‚Р С•РЎРѓ/i,
  /Р С—Р С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С”/i,
];

const MARKETPLACE_PATTERNS = [
  /marketplace/i,
  /маркет/i,
  /поставщик/i,
  /продав/i,
];

const PDF_PATTERNS = [
  /pdf/i,
  /пдф/i,
  /сделать\s+pdf/i,
  /создай\s+pdf/i,
];

const ROLE_STATUS_PATTERNS = [
  /что\s+мне\s+сделать/i,
  /статус/i,
  /за\s+2026/i,
  /работы\s+за/i,
];

function intentFor(input: BuiltInAiInput, screenContext: BuiltInAiScreenContext): {
  intent: BuiltInAiIntent;
  confidence: "high" | "medium" | "low";
  workKey?: string;
  category?: string;
  volume?: number;
  unit?: string;
} {
  const text = input.text.trim();
  const route = input.route?.toLowerCase() ?? "";
  const estimateRoute = routeUniversalEstimateIntent(text);
  const worldIntent = detectConstructionIntent(text);
  const worldRoute = worldIntent.isConstruction || worldIntent.isEstimate
    ? classifyConstructionWorkOutcome({ text })
    : null;
  const strongEstimate = hasAny(text, STRONG_ESTIMATE_PATTERNS);
  const productSearch = hasAny(text, PRODUCT_SEARCH_PATTERNS);
  const productSearchSurface = screenContext === "marketplace" && route.includes("/product/search");
  const estimateProcurementList = /смета\s+на\s+закупочн/i.test(text) || /СЃРјРµС‚Р°\s+РЅР°\s+Р·Р°РєСѓРїРѕС‡РЅ/i.test(text);
  const procurementOverride = productSearch && strongEstimate && !estimateProcurementList && hasAny(text, [
    /смета\s+в\s+закуп/i,
    /смета\s+и\s+закуп/i,
    /pdf\s+по\s+смет/i,
    /СЃРјРµС‚Р°\s+РІ\s+Р·Р°РєСѓРї/i,
    /СЃРјРµС‚Р°\s+Рё\s+Р·Р°РєСѓРї/i,
    /pdf\s+РїРѕ\s+СЃРјРµС‚/i,
  ]);

  if (productSearchSurface && text.length > 0) {
    return {
      intent: "product_search",
      confidence: estimateRoute.resolvedWorkKey && estimateRoute.resolvedWorkKey !== "other_construction_work" ? "high" : "medium",
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (procurementOverride) {
    return {
      intent: hasAny(text, MARKETPLACE_PATTERNS) ? "marketplace_lookup" : "product_search",
      confidence: estimateRoute.resolvedWorkKey && estimateRoute.resolvedWorkKey !== "other_construction_work" ? "high" : "medium",
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (
    productSearch &&
    (hasAny(text, PRODUCT_SEARCH_ACTION_PATTERNS) || /найд|найти|подбер|подобр|купить|закуп|поставщик/i.test(text)) &&
    (!strongEstimate || /find|найд|найти|подбер|подобр|купить|поставщик|supplier/i.test(text)) &&
    !estimateProcurementList
  ) {
    return {
      intent: hasAny(text, MARKETPLACE_PATTERNS) ? "marketplace_lookup" : "product_search",
      confidence: estimateRoute.resolvedWorkKey && estimateRoute.resolvedWorkKey !== "other_construction_work" ? "high" : "medium",
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (estimateRoute.shouldCallEstimateTool && (strongEstimate || !productSearch)) {
    return {
      intent: "estimate",
      confidence: estimateRoute.confidence,
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (worldRoute && (worldIntent.isEstimate || screenContext === "request" || screenContext === "foreman")) {
    return {
      intent: "estimate",
      confidence: worldIntent.confidence,
      workKey: worldRoute.primitive.workKey ?? undefined,
      category: worldRoute.primitive.workFamily,
      volume: worldRoute.primitive.volume,
      unit: worldRoute.primitive.unit,
    };
  }

  if (productSearch) {
    return {
      intent: hasAny(text, MARKETPLACE_PATTERNS) ? "marketplace_lookup" : "product_search",
      confidence: estimateRoute.resolvedWorkKey && estimateRoute.resolvedWorkKey !== "other_construction_work" ? "high" : "medium",
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (estimateRoute.shouldCallEstimateTool) {
    return {
      intent: "estimate",
      confidence: estimateRoute.confidence,
      workKey: estimateRoute.resolvedWorkKey,
      category: estimateRoute.resolvedCategory,
      volume: estimateRoute.volume,
      unit: estimateRoute.unit,
    };
  }

  if (hasAny(text, PDF_PATTERNS)) return { intent: "pdf_action", confidence: "medium" };
  if (screenContext === "request") return { intent: "request_draft", confidence: "medium" };
  if (hasAny(text, ROLE_STATUS_PATTERNS)) return { intent: "role_status_qa", confidence: "medium" };
  return { intent: "general_chat", confidence: "low" };
}

export function routeBuiltInAiIntent(input: BuiltInAiInput & { resolvedScreenContext: BuiltInAiScreenContext }): BuiltInAiIntentRoute {
  const resolved = intentFor(input, input.resolvedScreenContext);
  const traceId = createBuiltInAiTraceId(input.text, input.resolvedScreenContext);
  return {
    originalText: input.text,
    screenContext: input.resolvedScreenContext,
    intent: resolved.intent,
    confidence: resolved.confidence,
    mustUseBackendTool: resolved.intent !== "general_chat" && resolved.intent !== "role_status_qa",
    allowedTools: [],
    forbiddenFallbacks: [],
    traceId,
    workKey: resolved.workKey,
    category: resolved.category,
    volume: resolved.volume,
    unit: resolved.unit,
  };
}
