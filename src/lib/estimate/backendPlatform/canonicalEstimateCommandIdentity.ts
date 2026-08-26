import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type {
  CanonicalEstimateCustomRow,
  CanonicalEstimateParameterInputValue,
  CanonicalEstimateRowOverride,
} from "./contracts";

export type CanonicalEstimateRecalculateCommandIdentity = {
  parentRevisionId: string;
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  rowOverrides: Record<string, CanonicalEstimateRowOverride>;
  customRows: CanonicalEstimateCustomRow[];
};

export function canonicalEstimateRecalculateIdempotencyKey(
  input: CanonicalEstimateRecalculateCommandIdentity,
): string {
  return `canonical-recalculate-${estimateDeterministicHash({
    parentRevisionId: input.parentRevisionId,
    parameters: input.parameters,
    rowOverrides: input.rowOverrides,
    customRows: input.customRows,
  })}`;
}

export function canonicalEstimateCandidateAdmissionIdempotencyKey(input: {
  clientIdempotencyKey: string;
  candidateSourceTree: string;
  isolatedCandidateTest: boolean;
}): string {
  if (!input.isolatedCandidateTest) return input.clientIdempotencyKey;

  const candidateSourceTree = input.candidateSourceTree.trim();
  if (!candidateSourceTree || candidateSourceTree === "UNSET") {
    throw new Error("CANONICAL_ESTIMATE_CANDIDATE_SOURCE_TREE_REQUIRED");
  }

  const suffix = `:candidate:${estimateDeterministicHash({ candidateSourceTree })}`;
  const maximumClientPrefixLength = 200 - suffix.length;
  const clientPrefix = input.clientIdempotencyKey.length <= maximumClientPrefixLength
    ? input.clientIdempotencyKey
    : `${input.clientIdempotencyKey.slice(0, maximumClientPrefixLength - 20)}:${estimateDeterministicHash({
      clientIdempotencyKey: input.clientIdempotencyKey,
    })}`;

  return `${clientPrefix}${suffix}`;
}
