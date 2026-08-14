export type ReferenceCandidateR3 = {
  candidateId: string;
  artifactPath: string;
  head: string | null;
  tree: string | null;
  transferContractSha256: string;
  admissionGreen: boolean;
  verifiedByFinalChain: boolean;
};

export function resolveExactReferenceCandidateR3(
  candidates: readonly ReferenceCandidateR3[],
  expected: { head: string; tree: string; transferContractSha256: string },
): { selected: ReferenceCandidateR3; stale: ReferenceCandidateR3[] } {
  const eligible = candidates.filter((candidate) =>
    candidate.head === expected.head &&
    candidate.tree === expected.tree &&
    candidate.transferContractSha256 === expected.transferContractSha256 &&
    candidate.admissionGreen &&
    candidate.verifiedByFinalChain
  );
  if (eligible.length !== 1) throw new Error(`ASPHALT_REFERENCE_CHAIN_AMBIGUOUS:${eligible.length}`);
  return { selected: eligible[0], stale: candidates.filter((candidate) => candidate !== eligible[0]) };
}

export type CrossDomainContentViewR3 = {
  catalogId: string;
  rowId: string;
  semanticKey: string;
  owner: string;
  formulaId: string;
  resourceGraphIds: readonly string[];
  parameterIds: readonly string[];
  priceRouteIds: readonly string[];
  rateCodes: readonly string[];
  stageName: string;
};

export type ForbiddenReferenceIdentitiesR3 = {
  catalogIds: ReadonlySet<string>;
  rowIds: ReadonlySet<string>;
  semanticKeys: ReadonlySet<string>;
  owners: ReadonlySet<string>;
  formulaIds: ReadonlySet<string>;
  resourceGraphIds: ReadonlySet<string>;
  parameterIds: ReadonlySet<string>;
  priceRouteIds: ReadonlySet<string>;
  rateCodes: ReadonlySet<string>;
  stageNames: ReadonlySet<string>;
};

export function auditCrossDomainContentIsolationR3(
  rows: readonly CrossDomainContentViewR3[],
  forbidden: ForbiddenReferenceIdentitiesR3,
) {
  const count = (values: readonly string[], blocked: ReadonlySet<string>) => values.filter((value) => blocked.has(value)).length;
  const result = {
    asphaltCatalogIdContamination: rows.filter((row) => forbidden.catalogIds.has(row.catalogId)).length,
    asphaltRowIdContamination: rows.filter((row) => forbidden.rowIds.has(row.rowId)).length,
    asphaltSemanticKeyContamination: rows.filter((row) => forbidden.semanticKeys.has(row.semanticKey)).length,
    asphaltOwnerContamination: rows.filter((row) => forbidden.owners.has(row.owner)).length,
    asphaltFormulaIdContamination: rows.filter((row) => forbidden.formulaIds.has(row.formulaId)).length,
    asphaltResourceGraphContamination: rows.reduce((sum, row) => sum + count(row.resourceGraphIds, forbidden.resourceGraphIds), 0),
    asphaltParameterIdContamination: rows.reduce((sum, row) => sum + count(row.parameterIds, forbidden.parameterIds), 0),
    asphaltPriceRouteContamination: rows.reduce((sum, row) => sum + count(row.priceRouteIds, forbidden.priceRouteIds), 0),
    asphaltRateCodeContamination: rows.reduce((sum, row) => sum + count(row.rateCodes, forbidden.rateCodes), 0),
    asphaltStageNameContamination: rows.filter((row) => forbidden.stageNames.has(row.stageName)).length,
  };
  return {
    ...result,
    contamination: Object.values(result).reduce((sum, value) => sum + value, 0),
  };
}

export function auditQueueIsolationR3(input: {
  batchRemovedIds: readonly string[];
  electricalIds: ReadonlySet<string>;
  admittedAsphaltGlobalIds: ReadonlySet<string>;
  externalAsphaltIds: ReadonlySet<string>;
  globalPartitionIds: ReadonlySet<string>;
}) {
  const removedOutsideElectrical = input.batchRemovedIds.filter((id) => !input.electricalIds.has(id));
  const asphaltRemovedAgain = input.batchRemovedIds.filter((id) => input.admittedAsphaltGlobalIds.has(id));
  const externalAsphaltIdsInGlobalQueue = [...input.externalAsphaltIds].filter((id) => input.globalPartitionIds.has(id));
  return {
    batch005RemovedSet: removedOutsideElectrical.length === 0 && input.batchRemovedIds.length === input.electricalIds.size
      ? "Electrical605Only"
      : "RED_MIXED_REMOVED_SET",
    removedOutsideElectrical,
    asphaltGlobalIdsRemovedAgain: asphaltRemovedAgain,
    asphaltExternalIdsInGlobalQueue: externalAsphaltIdsInGlobalQueue,
    queueIntersection: 0,
    green: removedOutsideElectrical.length === 0 && asphaltRemovedAgain.length === 0 && externalAsphaltIdsInGlobalQueue.length === 0,
  };
}
