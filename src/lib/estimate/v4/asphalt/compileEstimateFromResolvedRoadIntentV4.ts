import type { EstimateSemanticKind, RoadScopeIdV4, RoadScopeResolutionV4 } from "./roadScopeTruthV4";
import { compileAsphaltProfessionalEstimateV4, type AsphaltProfessionalEstimateCompilationV4 } from "./compileAsphaltProfessionalEstimateV4";

export type RoadResolutionOriginV4 =
  | "EXPLICIT_PROMPT"
  | "USER_SELECTION"
  | "CATALOG_BINDING"
  | "RESTORED_REVISION";

export type ResolvedRoadEstimateIntentV4 = {
  intentId: string;
  requestId: string;
  originalUserText: string;
  requestedCatalogWorkId: string;
  semanticKind: EstimateSemanticKind;
  selectedScope: RoadScopeIdV4;
  resolutionOrigin: RoadResolutionOriginV4;
  resolverEvidence: string[];
  assumptions: string[];
  exclusions: string[];
  resolverVersion: string;
  idempotencyKey: string;
};

const PROFILE_BY_SCOPE: Record<RoadScopeIdV4, string> = {
  ROAD_SURFACING_ONLY: "surfacing_on_prepared_base",
  FULL_PAVEMENT_STRUCTURE: "new_full_road_pavement",
  FULL_ROAD_INFRASTRUCTURE: "new_full_road_infrastructure",
  ROAD_REPAIR_REHABILITATION: "rehabilitation_with_milling",
};

function stableToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createResolvedRoadEstimateIntentV4(input: {
  resolution: RoadScopeResolutionV4;
  requestId: string;
  pendingIntentId?: string | null;
  sourceRevisionId?: string | null;
  resolutionOrigin: RoadResolutionOriginV4;
  resolverVersion: string;
}): ResolvedRoadEstimateIntentV4 {
  const resolution = input.resolution;
  if (resolution.resolverStatus !== "RESOLVED" || !resolution.selectedScopeId || !resolution.semanticKind) {
    throw new Error("ROAD_INTENT_NOT_RESOLVED");
  }
  const identity = [
    input.requestId,
    input.pendingIntentId ?? "",
    resolution.selectedScopeId,
    input.sourceRevisionId ?? "",
  ].join("|");
  const token = stableToken(identity);
  return {
    intentId: `road-intent:${token}`,
    requestId: input.requestId,
    originalUserText: resolution.originalText,
    requestedCatalogWorkId: resolution.requestedCatalogWorkId,
    semanticKind: resolution.semanticKind,
    selectedScope: resolution.selectedScopeId,
    resolutionOrigin: input.resolutionOrigin,
    resolverEvidence: [...resolution.evidence],
    assumptions: [...resolution.assumptions],
    exclusions: [...resolution.exclusions],
    resolverVersion: input.resolverVersion,
    idempotencyKey: `road-compile:${token}`,
  };
}

export function compileEstimateFromResolvedRoadIntentV4(input: {
  resolvedIntent: ResolvedRoadEstimateIntentV4;
  parameterOverrides?: Record<string, { value: unknown; source?: string | null }>;
}): AsphaltProfessionalEstimateCompilationV4 {
  const profile = PROFILE_BY_SCOPE[input.resolvedIntent.selectedScope];
  return compileAsphaltProfessionalEstimateV4({
    raw_text: input.resolvedIntent.originalUserText,
    parameter_overrides: {
      ...input.parameterOverrides,
      scope_profile: { value: profile, source: "resolved_road_intent" },
    },
  });
}
