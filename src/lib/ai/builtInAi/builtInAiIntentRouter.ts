import {
  routeUniversalEstimateIntent,
} from "../estimateRouting";
import { buildEstimatorReasoningPlan, estimateIntentTokenDetected, isParsableConstructionWork } from "../estimatorKernel";
import { classifyConstructionWorkOutcome, detectConstructionIntent } from "../worldConstructionInterpreter";
import { createBuiltInAiTraceId } from "./builtInAiRuntimeTrace";
import type { BuiltInAiAnswer, BuiltInAiInput, BuiltInAiIntent, BuiltInAiIntentRoute, BuiltInAiScreenContext } from "./builtInAiTypes";

type EstimateIntentPriorityDecision = {
  estimateIntentDetected: boolean;
  estimateIntentWins: boolean;
  reason: string;
};

function hasAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const PRIORITY_ESTIMATE_WORDS = /смет|расчет|расчёт|рассчит|посчита|стоимост|сколько стоит|цена|boq|estimate|cost|quote/i;
const PRIORITY_CONSTRUCTION_WITH_VOLUME = /(кв\.?\s*м|м2|м²|sqm|пог\.?\s*м|м3|шт|кг|тонн?)/i;
const PRIORITY_CONSTRUCTION_OBJECTS = /линолеум|брусчат|тротуарн[а-яё]*\s+плит|навес|дву(?:х)?скат|крыш|кровл|гидроизоляц|капитальн[а-яё]*\s+ремонт|капремонт|квартир|кирпич|плитк|кафел|сануз|ванн/i;
const PRIORITY_CONSTRUCTION_ACTIONS = /улож|постел|уклад|мощен|клад|установ|монтаж|устройств|ремонт|гидроизоляц/i;

function resolveEstimateIntentPriority(input: {
  text: string;
  screenContext: BuiltInAiScreenContext;
}): EstimateIntentPriorityDecision {
  const estimateWord = PRIORITY_ESTIMATE_WORDS.test(input.text);
  const constructionQuantity = PRIORITY_CONSTRUCTION_WITH_VOLUME.test(input.text) && PRIORITY_CONSTRUCTION_OBJECTS.test(input.text);
  const constructionAction = PRIORITY_CONSTRUCTION_ACTIONS.test(input.text) && PRIORITY_CONSTRUCTION_OBJECTS.test(input.text);
  const namedCanopySystem = /навес/i.test(input.text) && /металл|каркас|профнастил/i.test(input.text);
  const estimateIntentDetected = estimateWord || constructionQuantity || constructionAction || namedCanopySystem;
  return {
    estimateIntentDetected,
    estimateIntentWins: estimateIntentDetected && (input.screenContext === "foreman" || input.screenContext === "request"),
    reason: estimateWord ? "explicit_estimate_word" : constructionQuantity ? "construction_object_with_quantity" : constructionAction ? "construction_object_with_action" : namedCanopySystem ? "named_canopy_system" : "not_estimate",
  };
}

function resolveEstimateIntentBeforeRoleContext(
  input: BuiltInAiInput & { resolvedScreenContext: BuiltInAiScreenContext },
): BuiltInAiIntentRoute | null {
  const priority = resolveEstimateIntentPriority({
    text: input.text,
    screenContext: input.resolvedScreenContext,
  });
  if (!priority.estimateIntentWins) return null;

  const route = routeUniversalEstimateIntent(input.text);
  return {
    originalText: input.text,
    screenContext: input.resolvedScreenContext,
    intent: "estimate",
    confidence: route.confidence === "low" ? "medium" : route.confidence,
    mustUseBackendTool: true,
    allowedTools: [],
    forbiddenFallbacks: ["role_qa", "foreman_status", "generic_chat", "template_gap_for_known_work"],
    traceId: createBuiltInAiTraceId(input.text, input.resolvedScreenContext),
    workKey: route.resolvedWorkKey,
    category: route.resolvedCategory,
    volume: route.volume,
    unit: route.unit,
  };
}

export function resolveEstimateIntentBeforeScreenRole(
  input: BuiltInAiInput & { resolvedScreenContext: BuiltInAiScreenContext },
): BuiltInAiIntentRoute | null {
  const estimateIntentDetected = estimateIntentTokenDetected(input.text) || isParsableConstructionWork(input.text);
  if (!estimateIntentDetected) return null;
  if (input.resolvedScreenContext !== "request" && input.resolvedScreenContext !== "foreman") return null;

  const route = routeUniversalEstimateIntent(input.text);
  const plan = buildEstimatorReasoningPlan({ text: input.text });
  const exactGovernedRoute =
    route.shouldCallEstimateTool &&
    route.confidence === "high" &&
    route.resolvedWorkKey !== "other_construction_work";
  const activePlan = exactGovernedRoute ? null : plan;
  const quantity =
    activePlan?.quantities.areaM2 ??
    activePlan?.quantities.lengthM ??
    activePlan?.quantities.count ??
    activePlan?.quantities.powerKw ??
    activePlan?.quantities.massTon ??
    activePlan?.quantities.floorCount ??
    route.volume;
  const unit =
    activePlan?.quantities.areaM2 !== undefined ? "sq_m" :
      activePlan?.quantities.lengthM !== undefined ? "linear_m" :
        activePlan?.quantities.powerKw !== undefined ? "kw" :
          activePlan?.quantities.massTon !== undefined ? "ton" :
            activePlan?.quantities.floorCount !== undefined || activePlan?.quantities.count !== undefined ? "pcs" :
            route.unit;
  return {
    originalText: input.text,
    screenContext: input.resolvedScreenContext,
    intent: "estimate",
    confidence: activePlan ? "high" : route.confidence === "low" ? "medium" : route.confidence,
    mustUseBackendTool: true,
    allowedTools: [],
    forbiddenFallbacks: ["role_qa", "foreman_status", "request_status", "generic_chat", "template_gap_for_parsable_work"],
    traceId: createBuiltInAiTraceId(input.text, input.resolvedScreenContext),
    workKey: activePlan?.workKey ?? route.resolvedWorkKey,
    category: activePlan?.category ?? route.resolvedCategory,
    volume: quantity,
    unit,
  };
}

export function validateEstimateIntentPriority(answer: BuiltInAiAnswer): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const text = answer.route.originalText.toLocaleLowerCase("ru-RU");
  const explicitEstimate = /СЃРјРµС‚|СЂР°СЃС‡РµС‚|СЂР°СЃС‡[РµС‘]С‚|СЃС‚РѕРёРј|estimate|boq|cost/.test(text);
  if (explicitEstimate && (answer.route.screenContext === "request" || answer.route.screenContext === "foreman")) {
    if (answer.route.intent !== "estimate") failures.push(`estimate_intent_lost:${answer.route.intent}`);
    if (!answer.route.mustUseBackendTool) failures.push("backend_tool_not_required_for_estimate");
    if (answer.toolResult.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE") failures.push("template_gap_for_estimate_intent");
  }
  return { passed: failures.length === 0, failures };
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
  const estimatorKernelPriorityRoute = resolveEstimateIntentBeforeScreenRole(input);
  if (estimatorKernelPriorityRoute) return estimatorKernelPriorityRoute;

  const priorityRoute = resolveEstimateIntentBeforeRoleContext(input);
  if (priorityRoute) return priorityRoute;

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
