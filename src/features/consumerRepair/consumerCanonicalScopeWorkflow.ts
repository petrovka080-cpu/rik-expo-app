import {
  beginConsumerRepairCanonicalRoadScopeSelection,
  bindConsumerRepairCanonicalRoadScopeChoice,
} from "../../lib/consumerRequests/consumerRequestService";
import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests/consumerRequestTypes";
import {
  asphaltScopeSelectionQuestionForIntentV5,
  isRoadScopeIdV4,
  resolveRoadEstimateScopeV4,
  resolveRoadSurfaceTechnologyV4,
  ROAD_SCOPE_RESOLVER_VERSION_V4,
  type AsphaltScopeSelectionIdV5,
} from "../../lib/estimate/v4/asphalt";
import { isConsumerCanonicalBroadAsphaltIdentity } from "./consumerCanonicalBaselineCompile";

export type ConsumerCanonicalScopeSelectionId = AsphaltScopeSelectionIdV5;

export const CONSUMER_CANONICAL_SCOPE_RESOLVER_VERSION = ROAD_SCOPE_RESOLVER_VERSION_V4;

export function isConsumerCanonicalScopedWorkIdentity(value: string | null | undefined): boolean {
  return isConsumerCanonicalBroadAsphaltIdentity(value);
}

export function resolveConsumerCanonicalSurfaceTechnology(input: {
  originalText: string;
  requestedCatalogWorkId: string;
}) {
  return resolveRoadSurfaceTechnologyV4(input);
}

export function resolveConsumerCanonicalEstimateScope(input: {
  originalText: string;
  requestedCatalogWorkId: string;
}) {
  return resolveRoadEstimateScopeV4(input);
}

export function consumerCanonicalScopeSelectionQuestionForIntent(originalText: string) {
  return asphaltScopeSelectionQuestionForIntentV5(originalText);
}

export function beginConsumerCanonicalScopeSelection(input: Parameters<
  typeof beginConsumerRepairCanonicalRoadScopeSelection
>[0]): ConsumerRepairDraftBundle {
  return beginConsumerRepairCanonicalRoadScopeSelection(input);
}

export function isConsumerCanonicalScopeSelectionId(
  value: string,
): value is ConsumerCanonicalScopeSelectionId {
  return isRoadScopeIdV4(value);
}

export function bindConsumerCanonicalScopeChoice(input: {
  requestDraftId: string;
  userId: string;
  selectedScope: ConsumerCanonicalScopeSelectionId;
}): ConsumerRepairDraftBundle {
  return bindConsumerRepairCanonicalRoadScopeChoice(input);
}
