import type { GlobalWorkCategory } from "../globalEstimate";

export type EstimateIntentConfidence = "high" | "medium" | "low";

export type EstimateIntentRoute = {
  isEstimateIntent: boolean;
  confidence: EstimateIntentConfidence;
  originalText: string;
  language: string;
  resolvedWorkKey?: string;
  resolvedCategory?: GlobalWorkCategory | string;
  volume?: number;
  unit?: string;
  location?: {
    countryCode?: string;
    stateOrRegion?: string;
    city?: string;
    postalCode?: string;
  };
  shouldCallEstimateTool: boolean;
  forbiddenFallbackToRoleQa: boolean;
};

export type EstimateIntentExtraction = {
  normalizedText: string;
  language: string;
  volume?: number;
  unit?: string;
  location?: EstimateIntentRoute["location"];
};
