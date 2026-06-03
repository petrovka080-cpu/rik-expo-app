import {
  createConsumerRepairDraftFromGlobalEstimate,
} from "../../consumerRequests";
import {
  buildGlobalEstimateInputFromRoute,
  routeUniversalEstimateIntent,
} from "../estimateRouting";
import {
  calculateGlobalConstructionEstimateSync,
  formatGlobalEstimateAnswer,
  GLOBAL_RATE_MATERIALS,
  type EstimateRowSourceEvidence,
} from "../globalEstimate";
import { buildLocalContextWarning, resolveCountryRegionCity } from "../globalLocalContext";
import { runWorldConstructionEstimateEngine } from "../worldConstructionEstimateEngine";
import type {
  BuiltInAiInput,
  BuiltInAiIntentRoute,
  BuiltInAiProductCandidate,
  BuiltInAiProductSearchResult,
  BuiltInAiToolName,
  BuiltInAiToolResult,
} from "./builtInAiTypes";

function evidenceFromRate(rate: (typeof GLOBAL_RATE_MATERIALS)[number]): EstimateRowSourceEvidence {
  return {
    sourceId: rate.id,
    sourceType: rate.sourceType,
    label: rate.sourceLabel,
    url: rate.sourceUrl,
    checkedAt: rate.checkedAt,
    freshness: "fresh",
    confidence: "medium",
  };
}

function pickRatesForProductSearch(text: string, route: BuiltInAiIntentRoute) {
  const lower = text.toLowerCase();
  if (/арматур|rebar/i.test(lower)) {
    return GLOBAL_RATE_MATERIALS.filter((rate) => rate.rateKey.includes("rebar") || rate.rateKey.includes("foundation") || rate.rateKey.includes("concrete")).slice(0, 3);
  }
  if (/ламинат|laminate/i.test(lower)) {
    return GLOBAL_RATE_MATERIALS.filter((rate) => ["laminate_board", "underlayment", "baseboard"].includes(rate.rateKey)).slice(0, 3);
  }
  if (/плитк|tile|кафель/i.test(lower)) {
    return GLOBAL_RATE_MATERIALS.filter((rate) => rate.rateKey.includes("ceramic_tile_laying") || rate.rateKey.includes("tile")).slice(0, 3);
  }
  if (route.workKey) {
    const matchedRates = GLOBAL_RATE_MATERIALS.filter((rate) => rate.rateKey.includes(route.workKey ?? "")).slice(0, 3);
    if (matchedRates.length > 0) return matchedRates;
  }
  return GLOBAL_RATE_MATERIALS.slice(0, 3);
}

function buildProductSearchResult(input: BuiltInAiInput, route: BuiltInAiIntentRoute): BuiltInAiProductSearchResult {
  const rates = pickRatesForProductSearch(input.text, route);
  const quantity = Math.max(1, route.volume ?? 1);
  const candidates: BuiltInAiProductCandidate[] = rates.map((rate) => ({
    id: `product_${rate.rateKey}_${rate.countryCode}_${rate.unit}`,
    title: rate.names.ru ?? rate.names.en ?? rate.rateKey.replace(/_/g, " "),
    category: route.category ?? "materials",
    neededQuantity: quantity,
    unit: rate.unit,
    unitPrice: rate.priceDefault,
    currency: rate.currency,
    sourceEvidence: [evidenceFromRate(rate)],
    availabilityStatus: "unknown",
    stockKnown: false,
  }));
  return {
    query: input.text,
    category: route.category ?? "materials",
    candidates,
    sourceBacked: candidates.every((candidate) => candidate.sourceEvidence.length > 0),
    fakeStockOrAvailabilityFound: candidates.some((candidate) => candidate.stockKnown && candidate.availabilityStatus === "known_available"),
  };
}

function withPromptLocalContextWarning(prompt: string, safeMessageRu: string | undefined): string | undefined {
  const localContext = resolveCountryRegionCity({ prompt });
  const warning = buildLocalContextWarning(localContext);
  const governanceLine =
    "После уточнения локальная смета покажет валюту, налог/VAT/GST, catalog/catalog gap, источник и уверенность; fake catalog items и fake prices запрещены.";
  const parts = [safeMessageRu];
  if (warning && !safeMessageRu?.includes(warning)) parts.push(warning);
  if (!safeMessageRu?.includes(governanceLine)) parts.push(governanceLine);
  return parts.filter(Boolean).join("\n");
}

function isAmbiguousWaterproofingSurfacePrompt(text: string): boolean {
  if (/\u043c\u0435\u043c\u0431\u0440\u0430\u043d|\u0431\u0430\u0441\u0441\u0435\u0439\u043d|membrane|pool/i.test(text)) {
    return false;
  }
  const mentionsWaterproofing = /гидроизоляц|waterproofing/i.test(text);
  const mentionsObject =
    /крыш|кровл|ванн|сануз|душ|фундамент|подвал|цокол|балкон|террас|roof|bath|shower|foundation|basement|balcony|terrace/i
      .test(text);
  return mentionsWaterproofing && !mentionsObject;
}

function calculateGlobalEstimate(input: BuiltInAiInput): {
  estimate?: ReturnType<typeof calculateGlobalConstructionEstimateSync>;
  blockedBy?: string;
  safeMessageRu?: string;
  worldClassification?: string;
} {
  const estimateRoute = routeUniversalEstimateIntent(input.text);
  const baseInput = buildGlobalEstimateInputFromRoute(estimateRoute, {
    countryCode: estimateRoute.location?.countryCode ?? input.countryCode ?? "KG",
    city: estimateRoute.location?.city ?? input.cityOrRegion ?? "Bishkek",
  });
  const world = runWorldConstructionEstimateEngine({
    ...baseInput,
    text: input.text,
    countryCode: baseInput.countryCode,
    city: baseInput.city,
  });
  const legacyEstimate = calculateGlobalConstructionEstimateSync(baseInput);
  if (legacyEstimate.estimateId.startsWith("universal_estimator_")) {
    return {
      estimate: legacyEstimate,
      worldClassification: "UNIVERSAL_ESTIMATOR_KERNEL_DYNAMIC_BOQ",
    };
  }
  if (isAmbiguousWaterproofingSurfacePrompt(input.text)) {
    return {
      blockedBy: "AMBIGUOUS_NEEDS_DISAMBIGUATION",
      safeMessageRu: withPromptLocalContextWarning(
        input.text,
        "Уточните объект гидроизоляции: крыша, ванная, фундамент, подвал, балкон или другой участок.",
      ),
      worldClassification: "AMBIGUOUS_WATERPROOFING_SURFACE",
    };
  }
  const socketInstallIsExplicit = /(?:\u0440\u043e\u0437\u0435\u0442|socket|outlet)/i.test(input.text);
  const genericLegacyWorkKey =
    legacyEstimate.work.workKey === "electrical_basic" ||
    (legacyEstimate.work.workKey === "socket_installation" && !socketInstallIsExplicit);
  const legacyKnownWork =
    Boolean(legacyEstimate.work.workKey) &&
    legacyEstimate.work.workKey !== "other_construction_work" &&
    !genericLegacyWorkKey;
  const routeKnownWork =
    Boolean(estimateRoute.resolvedWorkKey) &&
    estimateRoute.resolvedWorkKey !== "other_construction_work";
  if (legacyKnownWork && routeKnownWork) {
    return {
      estimate: legacyEstimate,
      worldClassification: "LEGACY_KNOWN_GLOBAL_ESTIMATE_FALLBACK",
    };
  }
  if (world.interpretation.shouldAskClarifyingQuestion) {
    return {
      blockedBy: world.interpretation.primitive.outcome,
      safeMessageRu: withPromptLocalContextWarning(input.text, world.safeMessageRu),
      worldClassification: world.interpretation.classification,
    };
  }
  if (legacyKnownWork) {
    return {
      estimate: legacyEstimate,
      worldClassification: "LEGACY_KNOWN_GLOBAL_ESTIMATE_FALLBACK",
    };
  }
  if (world.estimate) {
    return {
      estimate: world.estimate,
      worldClassification: world.interpretation.classification,
    };
  }
  if (
    !world.interpretation.primitive.intentDetected &&
    world.interpretation.primitive.domain === "unknown"
  ) {
    return {
      estimate: legacyEstimate,
      worldClassification: "LEGACY_GLOBAL_ESTIMATE_FALLBACK",
    };
  }
  if (world.interpretation.shouldAskClarifyingQuestion || world.interpretation.shouldReturnTemplateGap) {
    return {
      blockedBy: world.interpretation.primitive.outcome,
      safeMessageRu: withPromptLocalContextWarning(input.text, world.safeMessageRu),
      worldClassification: world.interpretation.classification,
    };
  }
  return {
    estimate: legacyEstimate,
    worldClassification: "LEGACY_GLOBAL_ESTIMATE_FALLBACK",
  };
}

export function runBuiltInAiTool(input: BuiltInAiInput, route: BuiltInAiIntentRoute): BuiltInAiToolResult {
  const primaryTool = route.allowedTools[0] as BuiltInAiToolName | undefined;

  if (route.intent === "estimate") {
    const estimate = calculateGlobalEstimate(input);
    return {
      toolName: "calculate_global_estimate",
      backendCalled: true,
      estimate: estimate.estimate,
      blockedBy: estimate.blockedBy,
      fallbackUsed: estimate.safeMessageRu,
    };
  }

  if (route.intent === "product_search" || route.intent === "marketplace_lookup" || route.intent === "procurement") {
    return {
      toolName: route.intent === "marketplace_lookup" ? "search_marketplace_products" : "search_material_products",
      backendCalled: true,
      productSearch: buildProductSearchResult(input, route),
    };
  }

  if (route.intent === "request_draft") {
    const estimateRoute = routeUniversalEstimateIntent(input.text);
    if (estimateRoute.shouldCallEstimateTool) {
      const estimate = calculateGlobalEstimate(input);
      if (!estimate.estimate) {
        return {
          toolName: "create_consumer_repair_draft",
          backendCalled: true,
          blockedBy: estimate.blockedBy,
          fallbackUsed: estimate.safeMessageRu,
        };
      }
      const requestDraft = createConsumerRepairDraftFromGlobalEstimate({
        consumerUserId: input.userId ?? "consumer-demo-user",
        estimate: estimate.estimate,
        originalText: input.text,
        city: input.cityOrRegion ?? estimate.estimate.locale.city ?? null,
      });
      return { toolName: "create_consumer_repair_draft", backendCalled: true, estimate: estimate.estimate, requestDraft };
    }
    return { toolName: "create_consumer_repair_draft", backendCalled: false, fallbackUsed: "request_draft_without_estimate_intent" };
  }

  if (route.intent === "pdf_action") {
    return { toolName: "generate_estimate_pdf", backendCalled: false, fallbackUsed: "pdf_action_requires_existing_structured_payload" };
  }

  if (route.intent === "role_status_qa") {
    return { toolName: "get_role_data", backendCalled: true, fallbackUsed: "role_status_only_no_stronger_intent" };
  }

  return { toolName: primaryTool, backendCalled: false, fallbackUsed: "general_chat_no_domain_tool" };
}

export function builtInAiEstimateText(result: BuiltInAiToolResult): string | null {
  return result.estimate ? formatGlobalEstimateAnswer(result.estimate) : null;
}
