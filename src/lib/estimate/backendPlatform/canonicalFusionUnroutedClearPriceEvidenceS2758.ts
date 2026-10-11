import type { CanonicalDerivedQuantityClearEvidenceV1 } from './canonicalDerivedQuantityClearEvidenceV1';
import { canonicalDerivedQuantityClearParentPricesV1 } from './canonicalDerivedQuantityClearParentPricesV1';

/** First Fusion adoption only: independently loaded definitions must both have
 * ZERO price-route bindings. The existing v2 price resolver INNER JOINs these
 * bindings, so neither definition can resolve any source price item, even for
 * a nonempty selection. Manual prices belong to unchanged parent amendments,
 * not these source items. Identity/lineage/consent/source proof is still required. */
export function canonicalFusionUnroutedClearPriceEvidenceS2758(input: {
  clearEvidence: CanonicalDerivedQuantityClearEvidenceV1 | null;
  parentRouteBindings: unknown;
  targetRouteBindings: unknown;
  parentSelection: unknown;
  request: unknown;
  phase: 'INTAKE' | 'WORKER';
}): Readonly<{
  contractVersion: 'canonical-fusion-unrouted-clear-source-price-evidence/v1';
  sourceSemanticSha256: string;
  priceSnapshotIds: readonly string[];
  parentResolvedSourcePriceItems: readonly [];
  targetResolvedSourcePriceItems: readonly [];
}> | null {
  const clear = input.clearEvidence;
  if (!clear || clear.contractVersion !== 'canonical-derived-quantity-clear-source-amendment-evidence/v1'
    || !/^[a-f0-9]{64}$/u.test(clear.sourceSemanticSha256)
    || !Array.isArray(input.parentRouteBindings) || input.parentRouteBindings.length !== 0
    || !Array.isArray(input.targetRouteBindings) || input.targetRouteBindings.length !== 0) return null;
  const selection = canonicalDerivedQuantityClearParentPricesV1(input);
  if (!selection) return null;
  return { contractVersion: 'canonical-fusion-unrouted-clear-source-price-evidence/v1',
    sourceSemanticSha256: clear.sourceSemanticSha256, priceSnapshotIds: selection,
    parentResolvedSourcePriceItems: [], targetResolvedSourcePriceItems: [] };
}
