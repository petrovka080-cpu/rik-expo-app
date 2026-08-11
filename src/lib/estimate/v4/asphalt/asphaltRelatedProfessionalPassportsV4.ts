import type {
  CompleteEstimateCategory,
  CompleteEstimateContract,
  MaterialCompletenessContract,
} from "../../materialCompletenessContract";
import {
  assertPassportOwnership,
  type ProfessionalEstimatePassportV4,
} from "../professionalEstimatePassportV4";
import {
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  asphaltRelatedCatalogBindingV4,
  getAsphaltRelatedProfileByCatalogRecordIdV4,
  type AsphaltRelatedProfileV4,
} from "./asphaltRelatedSemanticRegistryV4";

const COMPLETE_CATEGORIES: readonly CompleteEstimateCategory[] = Object.freeze([
  "materials",
  "works",
  "labor",
  "equipment",
  "services",
  "logistics",
  "laboratory",
  "documentation",
]);

function removalProfile(profile: AsphaltRelatedProfileV4): boolean {
  return [
    "FULL_DEPTH_DEMOLITION",
    "PARTIAL_DEPTH_MILLING",
    "PARTIAL_DEPTH_REMOVAL",
    "COLD_MILLING",
    "LOCAL_BREAKUP",
    "MECHANICAL_BREAKOUT",
    "REMOVE_AND_HAUL",
  ].includes(profile.operationClass);
}

function buildPassport(profile: AsphaltRelatedProfileV4): ProfessionalEstimatePassportV4 {
  const removal = removalProfile(profile);
  const row = (suffix: string) => `${profile.canonicalWorkKey}:${suffix}`;
  const materialRows = removal ? [] : [row("asphalt_mix")];
  const laborRows = removal
    ? [row("survey_and_marking"), row("removal"), row("demolition_labor")]
    : [row("placement")];
  const equipmentRows = removal ? [row("demolition_equipment")] : [];
  const transportRows = removal ? [row("haul"), row("truck_trips")] : [];
  const serviceRows = removal ? [row("loading"), row("destination")] : [];
  const qualityControlRows = removal ? [row("base_acceptance")] : [row("scope_acceptance")];
  const documentationRows = removal ? [row("documentation")] : [row("quality_documentation")];
  const categoryRows: Record<CompleteEstimateCategory, readonly string[]> = {
    materials: materialRows,
    works: laborRows,
    labor: removal ? [row("demolition_labor")] : [],
    equipment: equipmentRows,
    services: serviceRows,
    logistics: transportRows,
    laboratory: qualityControlRows,
    documentation: documentationRows,
  };
  const notApplicableReasons = Object.fromEntries(
    COMPLETE_CATEGORIES
      .filter((category) => categoryRows[category].length === 0)
      .map((category) => [
        category,
        `${category} is explicitly not applicable to ${profile.operationClass}; the exact passport does not add padding rows.`,
      ]),
  ) as Partial<Record<CompleteEstimateCategory, string>>;
  const materialCompleteness: MaterialCompletenessContract = {
    contractId: `${profile.canonicalWorkKey}:material-completeness:v4`,
    contractVersion: "material-completeness-contract:v1",
    ownerWorkKey: profile.canonicalWorkKey,
    scopeId: `${profile.operationClass}:${profile.applicationContext}`,
    requiredMaterialRoles: materialRows,
    conditionalMaterialRoles: removal ? [row("reinstatement_mix")] : [],
    forbiddenMaterialRoles: removal ? ["new_asphalt_material", "tack_coat", "prime_coat"] : [],
    materialRoleConditions: removal
      ? { [row("reinstatement_mix")]: "work_scope=DEMOLITION_AND_REINSTATEMENT" }
      : {},
    materialRoleExclusionReasons: {},
  };
  const completeEstimate: CompleteEstimateContract = {
    contractId: `${profile.canonicalWorkKey}:complete-estimate:v4`,
    contractVersion: "complete-professional-estimate-contract:v1",
    ownerWorkKey: profile.canonicalWorkKey,
    scopeId: `${profile.operationClass}:${profile.applicationContext}`,
    requiredCategories: COMPLETE_CATEGORIES,
    notApplicableReasons,
  };
  const passport: ProfessionalEstimatePassportV4 = {
    passportId: profile.passportId,
    catalogWorkId: profile.canonicalWorkKey,
    version: profile.passportVersion,
    classification: {
      domain: removal ? "DEMOLITION" : "ROAD_CONSTRUCTION",
      section: "asphalt_related",
      workType: profile.operationClass,
      workSubtype: profile.applicationContext,
      technology: profile.canonicalWorkKey,
      verdictId: `${profile.canonicalWorkKey}:typed-classification:v4`,
      verdictReason: [
        `surface_material=${profile.surfaceMaterial}`,
        `operation_class=${profile.operationClass}`,
        `application_context=${profile.applicationContext}`,
      ],
    },
    identity: {
      professionalNameRu: profile.professionalNameRu,
      synonymsRu: [...profile.catalogRecordIds],
      resultQuantity: removal ? "removal_area_m2" : "area_m2",
      resultUnit: "m2",
    },
    applicability: [profile.applicationContext, ...profile.semanticDomains],
    exclusions: removal
      ? ["Installation rows are forbidden unless DEMOLITION_AND_REINSTATEMENT is explicitly selected."]
      : ["Demolition rows are forbidden unless the exact repair passport owns them."],
    parameters: {
      p0: [...profile.requiredParameters],
      p1: [...profile.optionalParameters],
      p2: [],
      validationRules: profile.requiredParameters.map((key) => `${key}:explicit-valid-value-required`),
      dependencies: profile.requiredParameters.map((key) => `${key}->${profile.formulaGraphVersion}`),
    },
    calculation: {
      calculationStrategyId: profile.calculationStrategyId,
      formulaGraphVersion: profile.formulaGraphVersion,
      formulaGraph: removal
        ? ["area*depth=volume", "volume*density=mass", "mass*distance=haul", "ceil(mass/payload)=trips"]
        : ["area*depth=volume", "volume*density=mass"],
      sharedPrimitives: ["area", "volume", "mass", "haul", "ceil-positive"],
      dimensionalContract: ["m2*mm/1000=m3", "m3*t/m3=t", "t*km=t*km"],
      roundingPolicy: ["measured quantities:round-half-up:4", "truck trips:ceil-positive"],
    },
    boq: {
      profileId: profile.calculationProfileId,
      semanticOwner: profile.passportId,
      rowOwnershipContract: `${profile.canonicalWorkKey}:row-ownership:v4`,
      materialRows,
      laborRows,
      equipmentRows,
      transportRows,
      serviceRows,
      qualityControlRows,
      documentationRows,
    },
    sources: {
      formulaSources: ["project_geometry", "project_material_density", "kg_krer_27_applicability"],
      quantitySources: ["canonical_parameter_session"],
      applicabilitySources: ["eaeu_tr_ts_014_2011", "kg_krer_2015_collection_27"],
      assumptions: [],
    },
    normativeComposition: {
      compositionId: profile.normativeCompositionId,
      technicalRequirementSourceIds: ["eaeu_tr_ts_014_2011"],
      estimateResourceNormSourceIds: ["kg_krer_2015_collection_27"],
      testMethodSourceIds: [],
      internationalCrosswalkSourceIds: [],
      marketPriceSourceIds: [],
      aiRecommendationSourceIds: [],
      userOverrideSourceIds: [],
      conflictResolution: ["Exact project inputs override defaults; missing numeric norms fail closed."],
      unresolvedConflictIds: [],
    },
    contracts: {
      readiness: {
        contractId: `${profile.canonicalWorkKey}:readiness:v4`,
        state: "CALCULATION_READY",
        requiredInputKeys: [...profile.requiredParameters],
      },
      revision: {
        contractId: `${profile.canonicalWorkKey}:immutable-revision:v4`,
        immutableSnapshotRequired: true,
      },
      pdfProjection: {
        contractId: `${profile.canonicalWorkKey}:pdf-projection:v4`,
        sourceOfTruth: "IMMUTABLE_REVISION",
      },
      procurementProjection: {
        contractId: `${profile.canonicalWorkKey}:procurement-projection:v4`,
        sourceOfTruth: "IMMUTABLE_REVISION",
        excludesControlAndDocumentRows: true,
      },
      materialCompleteness,
      completeEstimate: {
        ...completeEstimate,
        categoryPolicy: Object.fromEntries(
          COMPLETE_CATEGORIES.map((category) => [category, "REQUIRED_OR_EXPLICIT_NA"]),
        ) as Record<CompleteEstimateCategory, "REQUIRED_OR_EXPLICIT_NA">,
      },
    },
    pricing: {
      catalogBindings: [],
      manualPricePolicy: "Manual prices are bound to the immutable exact-owner revision.",
      missingPricePolicy: "PRICE_INPUT_REQUIRED_NO_FAKE_TOTAL",
    },
    migration: {
      previousPassportVersions: [],
      legacyTemplateIds: [...profile.catalogRecordIds],
      semanticOwner: profile.passportId,
    },
    evidence: {
      independentGoldenFixtures: [profile.positiveVectorId],
      domainReviewStatus: "approved",
    },
  };
  assertPassportOwnership(passport);
  return Object.freeze(passport);
}

export const ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4: readonly ProfessionalEstimatePassportV4[] =
  Object.freeze(ASPHALT_RELATED_EXTRA_PROFILES_V4.map(buildPassport));

const passportByWorkKey = new Map(
  ASPHALT_RELATED_PROFESSIONAL_PASSPORTS_V4.map((passport) => [passport.catalogWorkId, passport]),
);

export function getAsphaltRelatedProfessionalPassportV4(
  catalogRecordIdOrWorkKey: string | null | undefined,
): ProfessionalEstimatePassportV4 | null {
  const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(catalogRecordIdOrWorkKey);
  if (!profile) return null;
  const canonicalPassport = passportByWorkKey.get(profile.canonicalWorkKey) ?? null;
  if (!canonicalPassport) return null;
  const requestedCatalogRecordId = catalogRecordIdOrWorkKey?.trim() || profile.canonicalCatalogRecordId;
  const binding = asphaltRelatedCatalogBindingV4(profile, requestedCatalogRecordId);
  if (
    canonicalPassport.catalogWorkId === requestedCatalogRecordId &&
    canonicalPassport.passportId === binding.professionalPassportId
  ) {
    return canonicalPassport;
  }
  const aliasPassport: ProfessionalEstimatePassportV4 = {
    ...canonicalPassport,
    passportId: binding.professionalPassportId,
    catalogWorkId: requestedCatalogRecordId,
    classification: {
      ...canonicalPassport.classification,
      verdictId: `${requestedCatalogRecordId}:typed-classification:v4`,
    },
    parameters: {
      ...canonicalPassport.parameters,
      dependencies: canonicalPassport.parameters.dependencies.map((dependency) =>
        `${binding.formulaBindingId}:${dependency}`
      ),
    },
    boq: {
      ...canonicalPassport.boq,
      profileId: binding.boqBlueprintId,
      semanticOwner: binding.professionalPassportId,
      rowOwnershipContract: `${requestedCatalogRecordId}:row-ownership:v4`,
    },
    normativeComposition: {
      ...canonicalPassport.normativeComposition,
      compositionId: binding.normApplicabilityProfileId,
    },
    contracts: {
      ...canonicalPassport.contracts,
      readiness: {
        ...canonicalPassport.contracts.readiness,
        contractId: `${requestedCatalogRecordId}:readiness:v4`,
      },
      revision: {
        ...canonicalPassport.contracts.revision,
        contractId: `${requestedCatalogRecordId}:immutable-revision:v4`,
      },
      pdfProjection: {
        ...canonicalPassport.contracts.pdfProjection,
        contractId: `${requestedCatalogRecordId}:pdf-projection:v4`,
      },
      procurementProjection: {
        ...canonicalPassport.contracts.procurementProjection,
        contractId: `${requestedCatalogRecordId}:procurement-projection:v4`,
      },
      materialCompleteness: {
        ...canonicalPassport.contracts.materialCompleteness,
        contractId: `${requestedCatalogRecordId}:material-completeness:v4`,
        ownerWorkKey: requestedCatalogRecordId,
      },
      completeEstimate: {
        ...canonicalPassport.contracts.completeEstimate,
        contractId: `${requestedCatalogRecordId}:complete-estimate:v4`,
        ownerWorkKey: requestedCatalogRecordId,
      },
    },
    migration: {
      ...canonicalPassport.migration,
      legacyTemplateIds: [requestedCatalogRecordId],
      semanticOwner: binding.professionalPassportId,
    },
    evidence: {
      ...canonicalPassport.evidence,
      independentGoldenFixtures: [binding.deterministicFixtureId],
    },
  };
  assertPassportOwnership(aliasPassport);
  return Object.freeze(aliasPassport);
}
