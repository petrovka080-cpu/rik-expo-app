export const MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2 = [
  "INDIVIDUAL_CATALOG_IDENTITY",
  "EXACT_SCOPE_AND_TYPED_CHILD_BOUNDARIES",
  "COMPLEXITY_AWARE_DEPTH_NO_FIXED_ROW_QUOTA",
  "INDEPENDENT_EXPECTED_SCOPE_ORACLE",
  "COMPLETE_CANDIDATE_DISPOSITIONS",
  "NORM_BOUND_EDITABLE_PARAMETERS",
  "PER_ROW_QUANTITY_FORMULA",
  "PER_ROW_PHYSICAL_RESOURCE_IDENTITY",
  "PER_ROW_PRICE_ROUTE",
  "PER_ROW_NORM_SOURCE_AND_LOCATOR",
  "SINGLE_COST_OWNER_NO_DOUBLE_COUNT",
  "GRAPH_INDIVIDUALITY_AND_ALIAS_PROOF",
  "NO_AGGREGATES_NO_PADDING_NO_SILENT_DEFAULTS",
  "DURABLE_HISTORY_EXACTNESS",
  "PDF_PROCUREMENT_RESOURCE_BALANCE",
  "WEB_ANDROID_USER_EXPLAINABILITY",
  "INDEPENDENT_MUTATIONS_AND_REPLAY",
  "EXACT_SHA_EVIDENCE_QUEUE_AND_STOP",
] as const;

export type Master11610ProfessionalDepthInvariantV2 =
  typeof MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2[number];

export const MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2 = {
  contract_id: "MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2",
  version: 2,
  domain_neutral: true,
  generates_domain_content: false,
  inherited_by_successors: true,
  required_for_domains: "ALL_DOWNSTREAM_MASTER_11610_DOMAINS",
  invariant_ids: MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2,
} as const;

export type ProfessionalDepthEvidenceProofV2 = {
  status: "GREEN" | "RED";
  coverage: string;
  evidenceLocators: readonly string[];
  evidenceHashes: readonly string[];
};

export type Master11610ProfessionalDepthEvidenceViewV2 = {
  domainId: string;
  catalogIdentityCoverage: ProfessionalDepthEvidenceProofV2;
  scopeBoundaryProof: ProfessionalDepthEvidenceProofV2;
  complexityClassificationProof: ProfessionalDepthEvidenceProofV2 & { fixedRowQuotaUsed: boolean };
  independentOracleProof: ProfessionalDepthEvidenceProofV2 & { productionBuilderUsedAsOracle: boolean };
  candidateDispositionProof: ProfessionalDepthEvidenceProofV2 & {
    hiddenAggregates: number;
    paddingRows: number;
    silentDefaults: number;
  };
  parameterProof: ProfessionalDepthEvidenceProofV2;
  formulaResourcePriceNormTraceProof: {
    quantityFormula: ProfessionalDepthEvidenceProofV2;
    physicalResourceIdentity: ProfessionalDepthEvidenceProofV2;
    priceRoute: ProfessionalDepthEvidenceProofV2;
    normSourceAndLocator: ProfessionalDepthEvidenceProofV2;
  };
  ownerAndDoubleCountProof: ProfessionalDepthEvidenceProofV2 & { parentChildDoubleCount: number };
  graphIndividualityProof: ProfessionalDepthEvidenceProofV2 & { unexplainedAliases: number };
  durablePlatformProof: {
    durableHistory: ProfessionalDepthEvidenceProofV2;
    pdfProcurement: ProfessionalDepthEvidenceProofV2;
  };
  userExplainabilityProof: ProfessionalDepthEvidenceProofV2;
  mutationReplayProof: ProfessionalDepthEvidenceProofV2 & {
    executedMutations: number;
    detectedMutations: number;
    replayPasses: number;
  };
  exactSealProof: ProfessionalDepthEvidenceProofV2 & {
    queueIsolationGreen: boolean;
    terminalStopGreen: boolean;
  };
  domainIsolationProof: {
    crossDomainProductionImports: number;
    crossDomainContentContamination: number;
    contentCopiedFromReference: number;
  };
};

export type Master11610ProfessionalDepthInvariantDecisionV2 = {
  invariantId: Master11610ProfessionalDepthInvariantV2;
  universalMeaning: string;
  electricalEvidenceLocators: readonly string[];
  electricalEvidenceHashes: readonly string[];
  comparisonMode: "STRUCTURAL_CONFORMANCE_NOT_CONTENT_COPY";
  status: "GREEN" | "RED";
  unresolvedReason: string | null;
};

const MEANINGS: Record<Master11610ProfessionalDepthInvariantV2, string> = {
  INDIVIDUAL_CATALOG_IDENTITY: "Every admitted work has its own exact catalog/passport/technology identity.",
  EXACT_SCOPE_AND_TYPED_CHILD_BOUNDARIES: "Scope and typed-child boundaries are explicit and do not transfer cost ownership.",
  COMPLEXITY_AWARE_DEPTH_NO_FIXED_ROW_QUOTA: "Depth follows the work's real complexity and never a reference row quota.",
  INDEPENDENT_EXPECTED_SCOPE_ORACLE: "Expected scope is reconstructed without the production builder as oracle.",
  COMPLETE_CANDIDATE_DISPOSITIONS: "Every expected candidate has an explicit included, project-input, typed-child or N/A disposition.",
  NORM_BOUND_EDITABLE_PARAMETERS: "Visible editable parameters are bounded, source-owned and formula-consumed.",
  PER_ROW_QUANTITY_FORMULA: "Every admitted row has an explicit quantity formula and input dependencies.",
  PER_ROW_PHYSICAL_RESOURCE_IDENTITY: "Every row represents one independently legitimate physical resource, process or deliverable.",
  PER_ROW_PRICE_ROUTE: "Every priced row has an explicit non-silent price route.",
  PER_ROW_NORM_SOURCE_AND_LOCATOR: "Every row has an applicable source role and exact locator.",
  SINGLE_COST_OWNER_NO_DOUBLE_COUNT: "Every cost has one owner and parent/typed-child double count is absent.",
  GRAPH_INDIVIDUALITY_AND_ALIAS_PROOF: "Formula/resource graphs are identity-specific or have an explicit proven alias.",
  NO_AGGREGATES_NO_PADDING_NO_SILENT_DEFAULTS: "Hidden aggregates, padding and silent quantitative defaults are rejected.",
  DURABLE_HISTORY_EXACTNESS: "The canonical estimate and history reopen without row or revision loss.",
  PDF_PROCUREMENT_RESOURCE_BALANCE: "PDF and procurement are projections of the same canonical resource balance.",
  WEB_ANDROID_USER_EXPLAINABILITY: "Web and Android expose navigable professional depth and explanations.",
  INDEPENDENT_MUTATIONS_AND_REPLAY: "Independent post-oracle mutations and fresh replay reject weakened gates.",
  EXACT_SHA_EVIDENCE_QUEUE_AND_STOP: "Exact evidence, queue isolation, program state and successor stop are sealed together.",
};

function decision(
  invariantId: Master11610ProfessionalDepthInvariantV2,
  proof: ProfessionalDepthEvidenceProofV2,
  extraGreen = true,
  extraReason = "additional invariant condition failed",
): Master11610ProfessionalDepthInvariantDecisionV2 {
  const green = proof.status === "GREEN" && extraGreen;
  return {
    invariantId,
    universalMeaning: MEANINGS[invariantId],
    electricalEvidenceLocators: proof.evidenceLocators,
    electricalEvidenceHashes: proof.evidenceHashes,
    comparisonMode: "STRUCTURAL_CONFORMANCE_NOT_CONTENT_COPY",
    status: green ? "GREEN" : "RED",
    unresolvedReason: green ? null : proof.status === "RED" ? `domain evidence RED (${proof.coverage})` : extraReason,
  };
}

export function auditMaster11610ProfessionalDepthReferenceContractV2(
  view: Master11610ProfessionalDepthEvidenceViewV2,
): {
  contractId: typeof MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2.contract_id;
  domainId: string;
  decisions: Master11610ProfessionalDepthInvariantDecisionV2[];
  invariants: string;
  unresolvedInvariants: number;
  contentCopiedFromReference: number;
  verdict: "GREEN_MASTER_11610_PROFESSIONAL_DEPTH" | "RED_MASTER_11610_PROFESSIONAL_DEPTH";
} {
  const isolated = view.domainIsolationProof.crossDomainProductionImports === 0 &&
    view.domainIsolationProof.crossDomainContentContamination === 0 &&
    view.domainIsolationProof.contentCopiedFromReference === 0;
  const decisions = [
    decision("INDIVIDUAL_CATALOG_IDENTITY", view.catalogIdentityCoverage, isolated, "domain isolation failed"),
    decision("EXACT_SCOPE_AND_TYPED_CHILD_BOUNDARIES", view.scopeBoundaryProof),
    decision("COMPLEXITY_AWARE_DEPTH_NO_FIXED_ROW_QUOTA", view.complexityClassificationProof, !view.complexityClassificationProof.fixedRowQuotaUsed, "fixed reference row quota used"),
    decision("INDEPENDENT_EXPECTED_SCOPE_ORACLE", view.independentOracleProof, !view.independentOracleProof.productionBuilderUsedAsOracle, "production builder used as expected-scope oracle"),
    decision("COMPLETE_CANDIDATE_DISPOSITIONS", view.candidateDispositionProof),
    decision("NORM_BOUND_EDITABLE_PARAMETERS", view.parameterProof),
    decision("PER_ROW_QUANTITY_FORMULA", view.formulaResourcePriceNormTraceProof.quantityFormula),
    decision("PER_ROW_PHYSICAL_RESOURCE_IDENTITY", view.formulaResourcePriceNormTraceProof.physicalResourceIdentity),
    decision("PER_ROW_PRICE_ROUTE", view.formulaResourcePriceNormTraceProof.priceRoute),
    decision("PER_ROW_NORM_SOURCE_AND_LOCATOR", view.formulaResourcePriceNormTraceProof.normSourceAndLocator),
    decision("SINGLE_COST_OWNER_NO_DOUBLE_COUNT", view.ownerAndDoubleCountProof, view.ownerAndDoubleCountProof.parentChildDoubleCount === 0, "parent/child double count found"),
    decision("GRAPH_INDIVIDUALITY_AND_ALIAS_PROOF", view.graphIndividualityProof, view.graphIndividualityProof.unexplainedAliases === 0, "unexplained graph alias found"),
    decision(
      "NO_AGGREGATES_NO_PADDING_NO_SILENT_DEFAULTS",
      view.candidateDispositionProof,
      view.candidateDispositionProof.hiddenAggregates === 0 && view.candidateDispositionProof.paddingRows === 0 && view.candidateDispositionProof.silentDefaults === 0,
      "aggregate, padding or silent default found",
    ),
    decision("DURABLE_HISTORY_EXACTNESS", view.durablePlatformProof.durableHistory),
    decision("PDF_PROCUREMENT_RESOURCE_BALANCE", view.durablePlatformProof.pdfProcurement),
    decision("WEB_ANDROID_USER_EXPLAINABILITY", view.userExplainabilityProof),
    decision(
      "INDEPENDENT_MUTATIONS_AND_REPLAY",
      view.mutationReplayProof,
      view.mutationReplayProof.executedMutations > 0 &&
        view.mutationReplayProof.detectedMutations === view.mutationReplayProof.executedMutations &&
        view.mutationReplayProof.replayPasses === 2,
      "mutations or replay incomplete",
    ),
    decision(
      "EXACT_SHA_EVIDENCE_QUEUE_AND_STOP",
      view.exactSealProof,
      view.exactSealProof.queueIsolationGreen && view.exactSealProof.terminalStopGreen,
      "queue isolation or terminal stop failed",
    ),
  ];
  const unresolved = decisions.filter((item) => item.status === "RED").length;
  return {
    contractId: MASTER_11610_PROFESSIONAL_DEPTH_REFERENCE_CONTRACT_V2.contract_id,
    domainId: view.domainId,
    decisions,
    invariants: `${decisions.length - unresolved}/${decisions.length}`,
    unresolvedInvariants: unresolved,
    contentCopiedFromReference: view.domainIsolationProof.contentCopiedFromReference,
    verdict: unresolved === 0
      ? "GREEN_MASTER_11610_PROFESSIONAL_DEPTH"
      : "RED_MASTER_11610_PROFESSIONAL_DEPTH",
  };
}
