/**
 * Compatibility entry point for historical fixtures and evidence scripts.
 *
 * The implementation lives with the canonical revision platform. Product and
 * runtime callers must import that owner directly so this module cannot become
 * a second recalculation implementation.
 */
export {
  appendRecalculatedEstimateDraftRevision,
  buildPromptForEstimateDraftRevisionRecalc,
  recalculateEstimateDraftRevision,
  recalculateEstimateDraftRevisionBatch,
  type RecalculateEstimateDraftRevisionResult,
} from "./backendPlatform/canonicalEstimateHistoricalRecalculation";
