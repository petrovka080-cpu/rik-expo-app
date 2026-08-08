import type {
  CompleteEstimateCategory,
  CompleteEstimateContract,
  MaterialCompletenessContract,
} from "../materialCompletenessContract";

export type ProfessionalEstimatePassportV4 = {
  passportId: string;
  catalogWorkId: string;
  version: string;
  classification: {
    domain: string;
    section: string;
    workType: string;
    workSubtype: string;
    technology: string;
    verdictId: string;
    verdictReason: readonly string[];
  };
  identity: {
    professionalNameRu: string;
    synonymsRu: readonly string[];
    resultQuantity: string;
    resultUnit: string;
  };
  applicability: readonly string[];
  exclusions: readonly string[];
  parameters: {
    p0: readonly string[];
    p1: readonly string[];
    p2: readonly string[];
    validationRules: readonly string[];
    dependencies: readonly string[];
  };
  calculation: {
    calculationStrategyId: string;
    formulaGraphVersion: string;
    formulaGraph: readonly string[];
    sharedPrimitives: readonly string[];
    dimensionalContract: readonly string[];
    roundingPolicy: readonly string[];
  };
  boq: {
    profileId: string;
    semanticOwner: string;
    rowOwnershipContract: string;
    materialRows: readonly string[];
    laborRows: readonly string[];
    equipmentRows: readonly string[];
    transportRows: readonly string[];
    serviceRows: readonly string[];
    qualityControlRows: readonly string[];
    documentationRows: readonly string[];
  };
  sources: {
    formulaSources: readonly string[];
    quantitySources: readonly string[];
    applicabilitySources: readonly string[];
    assumptions: readonly string[];
  };
  normativeComposition: {
    compositionId: string;
    technicalRequirementSourceIds: readonly string[];
    estimateResourceNormSourceIds: readonly string[];
    testMethodSourceIds: readonly string[];
    internationalCrosswalkSourceIds: readonly string[];
    marketPriceSourceIds: readonly string[];
    aiRecommendationSourceIds: readonly string[];
    userOverrideSourceIds: readonly string[];
    conflictResolution: readonly string[];
    unresolvedConflictIds: readonly string[];
  };
  contracts: {
    readiness: {
      contractId: string;
      state: "CALCULATION_READY" | "NEEDS_REQUIRED_INPUTS";
      requiredInputKeys: readonly string[];
    };
    revision: {
      contractId: string;
      immutableSnapshotRequired: true;
    };
    pdfProjection: {
      contractId: string;
      sourceOfTruth: "IMMUTABLE_REVISION";
    };
    procurementProjection: {
      contractId: string;
      sourceOfTruth: "IMMUTABLE_REVISION";
      excludesControlAndDocumentRows: true;
    };
    materialCompleteness: MaterialCompletenessContract;
    completeEstimate: CompleteEstimateContract & {
      categoryPolicy: Readonly<Record<CompleteEstimateCategory, "REQUIRED_OR_EXPLICIT_NA">>;
    };
  };
  pricing: {
    catalogBindings: readonly string[];
    manualPricePolicy: string;
    missingPricePolicy: string;
  };
  migration: {
    previousPassportVersions: readonly string[];
    legacyTemplateIds: readonly string[];
    semanticOwner: string;
  };
  evidence: {
    independentGoldenFixtures: readonly string[];
    domainReviewStatus: "pending" | "approved" | "rejected";
  };
};

export function professionalEstimatePassportId(catalogWorkId: string): string {
  return `professional-estimate-passport:v4:${catalogWorkId}`;
}

export function assertPassportOwnership(passport: ProfessionalEstimatePassportV4): void {
  if (passport.passportId !== professionalEstimatePassportId(passport.catalogWorkId)) {
    throw new Error(`PASSPORT_OWNER_MISMATCH:${passport.catalogWorkId}`);
  }
  if (passport.migration.semanticOwner !== passport.passportId) {
    throw new Error(`PASSPORT_SEMANTIC_OWNER_MISMATCH:${passport.catalogWorkId}`);
  }
}
