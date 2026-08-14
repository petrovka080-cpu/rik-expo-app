import {
  MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2,
  MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2,
  auditMaster11610ProfessionalDepthReferenceContractV2,
  type Master11610ProfessionalDepthEvidenceViewV2,
  type ProfessionalDepthEvidenceProofV2,
} from "../../src/lib/estimate/v4/professionalDepth/professionalDepthReferenceContractV2";

const proof = (coverage = "605/605"): ProfessionalDepthEvidenceProofV2 => ({
  status: "GREEN",
  coverage,
  evidenceLocators: ["exact/domain/evidence.json"],
  evidenceHashes: ["a".repeat(64)],
});

const greenView: Master11610ProfessionalDepthEvidenceViewV2 = {
  domainId: "ELECTRICAL_COMPLETE_V1",
  catalogIdentityCoverage: proof(),
  scopeBoundaryProof: proof(),
  complexityClassificationProof: { ...proof(), fixedRowQuotaUsed: false },
  independentOracleProof: { ...proof(), productionBuilderUsedAsOracle: false },
  candidateDispositionProof: { ...proof("21780/21780"), hiddenAggregates: 0, paddingRows: 0, silentDefaults: 0 },
  parameterProof: proof(),
  formulaResourcePriceNormTraceProof: {
    quantityFormula: proof("69723/69723"),
    physicalResourceIdentity: proof("69723/69723"),
    priceRoute: proof("69723/69723"),
    normSourceAndLocator: proof("69723/69723"),
  },
  ownerAndDoubleCountProof: { ...proof("69723/69723"), parentChildDoubleCount: 0 },
  graphIndividualityProof: { ...proof(), unexplainedAliases: 0 },
  durablePlatformProof: { durableHistory: proof(), pdfProcurement: proof() },
  userExplainabilityProof: proof(),
  mutationReplayProof: { ...proof("792/792;2/2"), executedMutations: 792, detectedMutations: 792, replayPasses: 2 },
  exactSealProof: { ...proof(), queueIsolationGreen: true, terminalStopGreen: true },
  domainIsolationProof: { crossDomainProductionImports: 0, crossDomainContentContamination: 0, contentCopiedFromReference: 0 },
};

describe("MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2", () => {
  it("admits exactly the 18 domain-neutral invariants", () => {
    const result = auditMaster11610ProfessionalDepthReferenceContractV2(greenView);
    expect(result.verdict).toBe("GREEN_MASTER_11610_PROFESSIONAL_DEPTH");
    expect(result.invariants).toBe("18/18");
    expect(result.unresolvedInvariants).toBe(0);
    expect(result.decisions.map((item) => item.invariantId)).toEqual(MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2);
  });

  it("blocks self-audit, content mixing, aliases and fixed reference row quotas", () => {
    const result = auditMaster11610ProfessionalDepthReferenceContractV2({
      ...greenView,
      complexityClassificationProof: { ...greenView.complexityClassificationProof, fixedRowQuotaUsed: true },
      independentOracleProof: { ...greenView.independentOracleProof, productionBuilderUsedAsOracle: true },
      graphIndividualityProof: { ...greenView.graphIndividualityProof, unexplainedAliases: 1 },
      domainIsolationProof: { ...greenView.domainIsolationProof, contentCopiedFromReference: 1 },
    });
    expect(result.verdict).toBe("RED_MASTER_11610_PROFESSIONAL_DEPTH");
    expect(result.unresolvedInvariants).toBeGreaterThanOrEqual(4);
  });

  it("is domain-neutral and never generates domain content", () => {
    expect(MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2.domain_neutral).toBe(true);
    expect(MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2.generates_domain_content).toBe(false);
    expect(MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2.invariant_ids).toHaveLength(18);
  });
});
