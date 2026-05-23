import type { EstimateIntentRoute } from "./estimateRoutingTypes";

export function assertEstimateIntentBeatsRoleContext(route: EstimateIntentRoute): void {
  if (route.isEstimateIntent && (route.confidence === "high" || route.confidence === "medium")) {
    if (!route.shouldCallEstimateTool || !route.forbiddenFallbackToRoleQa) {
      throw new Error("ESTIMATE_INTENT_MUST_ROUTE_TO_GLOBAL_ESTIMATE");
    }
  }
}

export function canFallbackToRoleQa(route: EstimateIntentRoute): boolean {
  return !route.forbiddenFallbackToRoleQa;
}
