/**
 * Compatibility entry point for historical fixtures and evidence scripts.
 *
 * Immutable in-memory projection is owned by the canonical revision platform;
 * production and runtime callers import that owner directly.
 */
export * from "./backendPlatform/canonicalEstimateHistoricalDraftProjection";
