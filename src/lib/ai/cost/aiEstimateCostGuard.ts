import type {
  AiEstimateCostGuardDecision,
  AiEstimateCostUsage,
} from "./aiEstimateCostTypes";

export const AI_ESTIMATE_COST_LIMITS: AiEstimateCostUsage = {
  estimateRequestsForSession: 120,
  pdfGenerationsForSession: 10,
  catalogLookupsForEstimate: 100,
  localRateSourceLookupsForEstimate: 100,
  retriesForFailedEstimate: 2,
  repeatedFailedPrompts: 3,
  concurrentPdfJobs: 25,
  concurrentCatalogBindings: 100,
  proofRunnerFixtureBatchSize: 50_000,
};

const PDF_LIMIT_MESSAGE_RU =
  "\u041b\u0438\u043c\u0438\u0442 \u0433\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u0438 PDF \u043d\u0430 \u0441\u0435\u0441\u0441\u0438\u044e \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0443\u0442. \u0421\u043c\u0435\u0442\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0430, PDF \u043c\u043e\u0436\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u043e\u0437\u0436\u0435.";

const SOURCE_DEFER_MESSAGE_RU =
  "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e. \u0421\u0435\u0439\u0447\u0430\u0441 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e \u043e\u0440\u0438\u0435\u043d\u0442\u0438\u0440\u043e\u0432\u043e\u0447\u043d\u0443\u044e \u0441\u043c\u0435\u0442\u0443 \u0441 \u043f\u0440\u0435\u0434\u0443\u043f\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0435\u043c.";

function decisionFor(
  key: keyof AiEstimateCostUsage,
  observed: number,
  limit: number,
): AiEstimateCostGuardDecision {
  if (observed <= limit) {
    return { key, action: "allow", limit, observed };
  }
  if (key === "pdfGenerationsForSession" || key === "concurrentPdfJobs") {
    return { key, action: "defer", limit, observed, visibleMessageRu: PDF_LIMIT_MESSAGE_RU };
  }
  if (key === "localRateSourceLookupsForEstimate") {
    return {
      key,
      action: "fallback_to_boq_without_price",
      limit,
      observed,
      visibleMessageRu: SOURCE_DEFER_MESSAGE_RU,
    };
  }
  return { key, action: "deny", limit, observed };
}

export function evaluateAiEstimateCostGuard(
  usage: AiEstimateCostUsage,
  limits: AiEstimateCostUsage = AI_ESTIMATE_COST_LIMITS,
): AiEstimateCostGuardDecision[] {
  return (Object.keys(limits) as (keyof AiEstimateCostUsage)[]).map((key) =>
    decisionFor(key, usage[key], limits[key]),
  );
}

export function buildAiEstimateCostGuardReport(usage: AiEstimateCostUsage) {
  const decisions = evaluateAiEstimateCostGuard(usage);
  return {
    cost_guard_ready: true,
    provider_calls_allowed: 0,
    network_calls_allowed_in_sync_estimate: 0,
    estimated_provider_cost_usd_allowed: 0,
    rate_limits_active: decisions.every((decision) => decision.limit > 0),
    blocked: decisions.filter((decision) => decision.action !== "allow"),
    decisions,
  };
}
