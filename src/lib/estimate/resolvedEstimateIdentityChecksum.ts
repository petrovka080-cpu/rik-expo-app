import type { EstimateResolvedIdentity } from "./estimateDraftRevisionContract";
import { estimateDeterministicHash } from "./estimateDeterministicHash";

/**
 * Stable identity checksum shared by immutable readers and migration adapters.
 * This module intentionally has no dependency on a frontend estimate compiler.
 */
export function resolvedEstimateIdentityChecksum(
  identity: Omit<EstimateResolvedIdentity, "checksum">,
): string {
  return estimateDeterministicHash({
    ...identity,
    resolvedParameters: Object.fromEntries(
      Object.entries(identity.resolvedParameters)
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    sourceBindingVersions: [...identity.sourceBindingVersions]
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
}
