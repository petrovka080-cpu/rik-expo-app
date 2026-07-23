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
