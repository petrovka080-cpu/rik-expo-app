import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import type {
  CanonicalEstimateCustomRow,
  CanonicalEstimateParameterInputValue,
  CanonicalEstimateRowOverride,
  CanonicalEstimateRecalculateRequest,
} from "./contracts";

export type CanonicalEstimateRecalculateCommandIdentity = {
  selectedMaterialDeliveryV1?: CanonicalEstimateRecalculateRequest['selectedMaterialDeliveryV1'];
  parentRevisionId: string;
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  rowOverrides: Record<string, CanonicalEstimateRowOverride>;
  customRows: CanonicalEstimateCustomRow[];
  releaseMigration?: CanonicalEstimateRecalculateRequest["releaseMigration"];
  derivedQuantityClearV1?: CanonicalEstimateRecalculateRequest['derivedQuantityClearV1'];
  roofPrimerPrerequisiteV1?: CanonicalEstimateRecalculateRequest['roofPrimerPrerequisiteV1'];
  compositionSelectionV1?: CanonicalEstimateRecalculateRequest['compositionSelectionV1'];
};

export function canonicalEstimateRecalculateIdempotencyKey(
  input: CanonicalEstimateRecalculateCommandIdentity,
): string {
  return `canonical-recalculate-${estimateDeterministicHash({
    ...(Object.hasOwn(input,'selectedMaterialDeliveryV1')?{selectedMaterialDeliveryV1:input.selectedMaterialDeliveryV1,selectedDeliveryExactParameters:canonicalEstimateStableJson(input.parameters)}:{}),
    parentRevisionId: input.parentRevisionId,
    parameters: input.parameters,
    rowOverrides: input.rowOverrides,
    customRows: input.customRows,
    ...(input.releaseMigration ? { releaseMigration: input.releaseMigration } : {}),
    ...(input.derivedQuantityClearV1 ? { derivedQuantityClearV1: input.derivedQuantityClearV1 } : {}),
    ...(Object.hasOwn(input,'roofPrimerPrerequisiteV1') ? {roofPrimerPrerequisiteV1:input.roofPrimerPrerequisiteV1} : {}),
    ...(Object.hasOwn(input,'compositionSelectionV1') ? {compositionSelectionV1:parseCanonicalCompositionSelectionV1(input.compositionSelectionV1)} : {}),
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
import {parseCanonicalCompositionSelectionV1} from './canonicalEstimateCompositionSelectionV1';
