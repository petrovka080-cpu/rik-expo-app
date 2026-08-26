import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";

export const TECHNOLOGY_PASSPORT_R1_CONTRACT =
  "real-useful-estimates.technology-passport-r1.v1" as const;

export type TechnologyPassportCapabilityGroupR1 =
  | "material"
  | "construction_work"
  | "machine_equipment"
  | "delivery"
  | "waste";

export type TechnologyPassportCapabilityR1 = {
  group: TechnologyPassportCapabilityGroupR1;
  status: "REQUIRED" | "CONDITIONAL" | "NOT_APPLICABLE";
  reasonRu: string;
  normSourceIds: readonly string[];
};

export type TechnologyPassportEvidenceR1 = {
  evidenceId: string;
  sourceKind:
    | "PROJECT_DOCUMENT"
    | "NORMATIVE_DOCUMENT"
    | "MANUFACTURER_TDS"
    | "ENGINEERING_SOURCE_PACK"
    | "ACCEPTED_PRELIMINARY_ASSUMPTION";
  title: string;
  locator: string;
  contentSha256: string;
};

export type TechnologyPassportNormSourceR1 = {
  sourceId: string;
  evidenceId: string;
  title: string;
  editionOrVersion: string;
  locator: string;
  applicabilityRu: string;
};

export type TechnologyPassportParameterR1 = {
  parameterId: string;
  titleRu: string;
  guideRu: string;
  unitId: string | null;
  required: boolean;
  acceptedDefault: string | number | boolean | null;
  defaultProvenanceId: string | null;
  formulaConsumerIds: readonly string[];
  expectationConsumerIds: readonly string[];
};

export type TechnologyPassportPreliminaryAssumptionR1 = {
  assumptionId: string;
  statementRu: string;
  acceptedValue: string | number | boolean;
  sourceId: string;
  userVisible: true;
  replacementInputId: string | null;
};

export type TechnologyPassportStageR1 = {
  stageId: string;
  sequence: number;
  titleRu: string;
  resultRu: string;
};

export type TechnologyPassportExpectedItemR1 = {
  expectationId: string;
  stageId: string;
  titleRu: string;
  purposeRu: string;
  formulaId: string;
  normSourceIds: readonly string[];
  inclusionCondition: string;
};

export type TechnologyPassportMaterialSelectionResolutionR33 = {
  contract: "real-useful-estimates.material-selection-resolution-r33.v1";
  strategy: "TECHNOLOGY_DERIVED" | "ACCEPTED_PRELIMINARY_VALUE" | "REQUIRED_PROJECT_INPUT";
  publicBoqTitleRu: string;
  technicalSpecificationRu: string;
  selectionParameterId: string;
  selectionParameterTitleRu: string;
  plainHintRu: string;
  preliminaryValueRu: string;
  allowedRangeRu: string | null;
  confirmationRequired: boolean;
  safetyCritical: boolean;
  materialUnitId: string;
  preliminaryNormPerResultUnit: number;
  preliminaryLossPercent: number;
  preliminaryPackageSize: number;
  packageUnitRu: string;
  sourceIds: readonly string[];
};

export type TechnologyPassportMaterialFamilyR1 = TechnologyPassportExpectedItemR1 & {
  familyId: string;
  specificationRequirementRu: string;
  procurementRuleId: string;
  selectionResolutionR33?: TechnologyPassportMaterialSelectionResolutionR33;
};

export type TechnologyPassportConditionalMaterialFamilyR1 =
  TechnologyPassportMaterialFamilyR1 & {
    exclusionId: string;
  };

export type TechnologyPassportConstructionOperationR1 =
  TechnologyPassportExpectedItemR1 & {
    operationId: string;
    required: boolean;
  };

export type TechnologyPassportEquipmentRuleR1 =
  TechnologyPassportExpectedItemR1 & {
    equipmentRuleId: string;
    equipmentClassRu: string;
    keyCharacteristicsRu: readonly string[];
    operationId: string;
    mutuallyExclusiveGroupId: string | null;
  };

export type TechnologyPassportDeliveryFlowR1 =
  TechnologyPassportExpectedItemR1 & {
    deliveryFlowId: string;
    cargoFamilyIds: readonly string[];
    vehicleTypeRu: string;
    capacityRequirementRu: string;
    distanceParameterId: string;
    deduplicationKey: string;
  };

export type TechnologyPassportWasteFlowR1 =
  TechnologyPassportExpectedItemR1 & {
    wasteFlowId: string;
    sourceMaterialFamilyIds: readonly string[];
    vehicleTypeRu: string;
    distanceParameterId: string;
    deduplicationKey: string;
  };

export type TechnologyPassportFormulaR1 = {
  formulaId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
  outputUnitId: string;
  roundingRule: string;
  lossRule: string;
  normSourceIds: readonly string[];
};

export type TechnologyPassportProcurementRuleR1 = {
  procurementRuleId: string;
  familyId: string;
  procurementEligible: boolean;
  packageUnitRu: string | null;
  packageSizeFormula: string | null;
  roundingRule: string;
  sourceIds: readonly string[];
};

export type TechnologyPassportExclusionR1 = {
  exclusionId: string;
  expectationId: string;
  conditionExpression: string;
  reasonRu: string;
  sourceIds: readonly string[];
};

export type TechnologyPassportIncompatibleVariantR1 = {
  variantId: string;
  reasonRu: string;
  sourceIds: readonly string[];
};

export type TechnologyPassportR1 = {
  contract: typeof TECHNOLOGY_PASSPORT_R1_CONTRACT;
  catalogId: string;
  technologyVariantId: string;
  publicWorkTitleRu: string;
  resultUnitId: string;
  provenance: {
    expectationBasis: "INDEPENDENT_ENGINEERING_EVIDENCE";
    runtimeRowsUsedAsExpectation: false;
    evidence: readonly TechnologyPassportEvidenceR1[];
    authorRole: "ENGINEER";
    review: {
      status: "ENGINEER_ACCEPTED" | "DRAFT";
      reviewerId: string;
      reviewedAt: string;
      reviewEvidenceSha256: string;
    };
  };
  applicabilityRu: readonly string[];
  exclusions: readonly TechnologyPassportExclusionR1[];
  userInputs: readonly TechnologyPassportParameterR1[];
  acceptedPreliminaryAssumptions: readonly TechnologyPassportPreliminaryAssumptionR1[];
  stages: readonly TechnologyPassportStageR1[];
  capabilities: readonly TechnologyPassportCapabilityR1[];
  requiredMaterialFamilies: readonly TechnologyPassportMaterialFamilyR1[];
  conditionalMaterialFamilies: readonly TechnologyPassportConditionalMaterialFamilyR1[];
  constructionOperations: readonly TechnologyPassportConstructionOperationR1[];
  equipmentRules: readonly TechnologyPassportEquipmentRuleR1[];
  deliveryFlows: readonly TechnologyPassportDeliveryFlowR1[];
  wasteFlows: readonly TechnologyPassportWasteFlowR1[];
  quantityFormulas: readonly TechnologyPassportFormulaR1[];
  normSources: readonly TechnologyPassportNormSourceR1[];
  procurementRules: readonly TechnologyPassportProcurementRuleR1[];
  incompatibleVariants: readonly TechnologyPassportIncompatibleVariantR1[];
};

export type TechnologyPassportRuntimeExclusionProofR1 = {
  expectationId: string;
  exclusionId: string;
  conditionExpression: string;
  conditionProven: boolean;
  evidenceSha256: string;
};

export type TechnologyPassportRuntimeOwnedRowR1 = {
  rowId: string;
  titleRu: string;
  stageId: string;
  unitId: string;
  formulaId: string;
  semanticOwnerId: string;
  costOwnerId: string;
  normSourceIds: readonly string[];
};

export type TechnologyPassportRuntimeMaterialRowR1 = TechnologyPassportRuntimeOwnedRowR1 & {
  familyId: string;
  specificationRu: string;
  purposeRu: string;
  netQuantity: string;
  grossQuantity: string;
  lossPercent: string;
  procurementRuleId: string;
  procurementEligible: boolean;
  package: null | {
    titleRu: string;
    size: string;
    unitId: string;
    procurementQuantity: string;
  };
};

export type TechnologyPassportRuntimeConstructionOperationRowR1 =
  TechnologyPassportRuntimeOwnedRowR1 & {
    operationId: string;
    purposeRu: string;
  };

export type TechnologyPassportRuntimeEquipmentRowR1 = TechnologyPassportRuntimeOwnedRowR1 & {
  equipmentRuleId: string;
  equipmentClassRu: string;
  keyCharacteristicsRu: readonly string[];
  operationId: string;
  inclusionCondition: string;
};

export type TechnologyPassportRuntimeDeliveryRowR1 = TechnologyPassportRuntimeOwnedRowR1 & {
  deliveryFlowId: string;
  cargoFamilyIds: readonly string[];
  vehicleTypeRu: string;
  capacityRequirementRu: string;
  distanceParameterId: string;
  deduplicationKey: string;
};

export type TechnologyPassportRuntimeWasteRowR1 = TechnologyPassportRuntimeOwnedRowR1 & {
  wasteFlowId: string;
  sourceMaterialFamilyIds: readonly string[];
  vehicleTypeRu: string;
  distanceParameterId: string;
  deduplicationKey: string;
};

/**
 * The runtime projection is emitted by the canonical compiler. It deliberately
 * contains only identities, never the expected lists used by the passport.
 */
export type TechnologyPassportRuntimeProjectionR1 = {
  catalogId: string;
  technologyVariantId: string;
  resultUnitId: string;
  technologyPassportSha256: string;
  runtimeDefinitionSha256: string;
  runtimeRowsSha256: string;
  sourceIdentity: string;
  parameterIds: readonly string[];
  materialRows: readonly TechnologyPassportRuntimeMaterialRowR1[];
  constructionOperationRows: readonly TechnologyPassportRuntimeConstructionOperationRowR1[];
  equipmentRows: readonly TechnologyPassportRuntimeEquipmentRowR1[];
  deliveryRows: readonly TechnologyPassportRuntimeDeliveryRowR1[];
  wasteRows: readonly TechnologyPassportRuntimeWasteRowR1[];
  formulaIds: readonly string[];
  procurementRuleIds: readonly string[];
  includedVariantIds: readonly string[];
  exclusionProofs: readonly TechnologyPassportRuntimeExclusionProofR1[];
};

export type TechnologyPassportDecisionR1 = {
  contract: typeof TECHNOLOGY_PASSPORT_R1_CONTRACT;
  allowed: boolean;
  status: "GREEN" | "RED";
  errors: readonly string[];
  passportSha256: string;
  metrics: {
    requiredMaterialFamilies: number;
    conditionalMaterialFamilies: number;
    constructionOperations: number;
    equipmentRules: number;
    deliveryFlows: number;
    wasteFlows: number;
    formulas: number;
    normSources: number;
  };
};

const CAPABILITY_GROUPS: readonly TechnologyPassportCapabilityGroupR1[] = [
  "material",
  "construction_work",
  "machine_equipment",
  "delivery",
  "waste",
];
const SHA256 = /^[a-f0-9]{64}$/u;
const DECIMAL = /^\d+(?:\.\d+)?$/u;
const FORBIDDEN_GENERIC_EQUIPMENT = /(?:^|\b)(?:оборудование доступа|механизм|техника по ппр|техника по проектному ппр|машина для работы|строительная техника|средства механизации|грузоподъ[её]мный механизм|оборудование по ппр)(?:$|\b)/iu;
const FORBIDDEN_GENERIC_PUBLIC_TITLE = /^(?:материал(?:ы)?|прочие материалы|комплект(?: материалов)?|работа|услуга|оборудование|механизм|машина|техника|доставка|логистика)$/iu;
const FORBIDDEN_MATERIAL_SELECTION_PLACEHOLDER = /(?:^\s*указать(?:\s|$)|project_system_specification_required|(?:выбранн|проектн)\S*\s+(?:материал|состав|издели|марка|тип|спецификац))/iu;
const NUMERIC_EQUIPMENT_CHARACTERISTIC = /\d[\d.,–—-]*\s*(?:м³\/ч|кг\/ч|об\/мин|мм²|м²|м³|м3|мм|см|м|кг|т|квт|вт|л|бар|мпа|а|в)(?=$|[\s,;:.)])/iu;
const RAW_PUBLIC_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);

function normalized(value: string): string {
  return value.normalize("NFKC").trim();
}

function nonBlank(value: string): boolean {
  return normalized(value).length > 0;
}

function hasCyrillic(value: string): boolean {
  return /[а-яё]/iu.test(value);
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  for (const raw of values) {
    const value = normalized(raw);
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found].sort();
}

function acceptedIsoTimestamp(value: string): boolean {
  const timestamp = new Date(value).getTime();
  return nonBlank(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function technologyPassportR1Sha256(passport: TechnologyPassportR1): string {
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson(passport));
}

export function evaluateTechnologyPassportR1(
  passport: TechnologyPassportR1,
  runtimeSourceHashes: readonly string[],
): TechnologyPassportDecisionR1 {
  const errors: string[] = [];
  const add = (code: string): void => {
    errors.push(code);
  };
  const requireRu = (value: string, code: string): void => {
    if (!nonBlank(value) || !hasCyrillic(value)) add(code);
  };

  if (passport.contract !== TECHNOLOGY_PASSPORT_R1_CONTRACT) add("TECHNOLOGY_PASSPORT_CONTRACT_DRIFT");
  if (!nonBlank(passport.catalogId)) add("CATALOG_ID_MISSING");
  if (!nonBlank(passport.technologyVariantId)) add("TECHNOLOGY_VARIANT_ID_MISSING");
  if (!nonBlank(passport.resultUnitId)) add("RESULT_UNIT_ID_MISSING");
  requireRu(passport.publicWorkTitleRu, "PUBLIC_WORK_TITLE_RU_MISSING");
  if (passport.applicabilityRu.length === 0 || passport.applicabilityRu.some((value) => !hasCyrillic(value))) {
    add("APPLICABILITY_MISSING");
  }

  if (passport.provenance.expectationBasis !== "INDEPENDENT_ENGINEERING_EVIDENCE") {
    add("EXPECTATION_NOT_INDEPENDENT");
  }
  if (passport.provenance.runtimeRowsUsedAsExpectation !== false) add("RUNTIME_ROWS_USED_AS_EXPECTATION");
  if (passport.provenance.authorRole !== "ENGINEER") add("ENGINEERING_AUTHOR_MISSING");
  if (passport.provenance.review.status !== "ENGINEER_ACCEPTED") add("ENGINEER_ACCEPTANCE_MISSING");
  if (!nonBlank(passport.provenance.review.reviewerId)) add("ENGINEER_REVIEWER_ID_MISSING");
  if (!acceptedIsoTimestamp(passport.provenance.review.reviewedAt)) add("ENGINEER_REVIEW_TIMESTAMP_INVALID");
  if (!SHA256.test(passport.provenance.review.reviewEvidenceSha256)) add("ENGINEER_REVIEW_EVIDENCE_INVALID");
  if (passport.provenance.evidence.length === 0) add("INDEPENDENT_EVIDENCE_EMPTY");

  const runtimeHashes = new Set(runtimeSourceHashes.map((value) => value.toLowerCase()));
  for (const evidence of passport.provenance.evidence) {
    if (!nonBlank(evidence.evidenceId) || !nonBlank(evidence.title) || !nonBlank(evidence.locator)) {
      add(`EVIDENCE_INCOMPLETE:${evidence.evidenceId}`);
    }
    const evidenceHash = evidence.contentSha256.toLowerCase();
    if (!SHA256.test(evidenceHash)) add(`EVIDENCE_SHA256_INVALID:${evidence.evidenceId}`);
    if (runtimeHashes.has(evidenceHash)) add(`EVIDENCE_REUSES_RUNTIME_SOURCE:${evidence.evidenceId}`);
  }

  const evidenceIds = new Set(passport.provenance.evidence.map((item) => item.evidenceId));
  const normSources = new Map(passport.normSources.map((source) => [source.sourceId, source]));
  const formulas = new Map(passport.quantityFormulas.map((formula) => [formula.formulaId, formula]));
  const parameters = new Map(passport.userInputs.map((parameter) => [parameter.parameterId, parameter]));
  const stages = new Map(passport.stages.map((stage) => [stage.stageId, stage]));
  const procurementRules = new Map(passport.procurementRules.map((rule) => [rule.procurementRuleId, rule]));
  const exclusions = new Map(passport.exclusions.map((item) => [item.exclusionId, item]));

  const uniqueSets: ReadonlyArray<[string, readonly string[]]> = [
    ["EVIDENCE_ID", passport.provenance.evidence.map((item) => item.evidenceId)],
    ["NORM_SOURCE_ID", passport.normSources.map((item) => item.sourceId)],
    ["PARAMETER_ID", passport.userInputs.map((item) => item.parameterId)],
    ["STAGE_ID", passport.stages.map((item) => item.stageId)],
    ["FORMULA_ID", passport.quantityFormulas.map((item) => item.formulaId)],
    ["PROCUREMENT_RULE_ID", passport.procurementRules.map((item) => item.procurementRuleId)],
    ["EXCLUSION_ID", passport.exclusions.map((item) => item.exclusionId)],
    ["EXPECTATION_ID", [
      ...passport.requiredMaterialFamilies,
      ...passport.conditionalMaterialFamilies,
      ...passport.constructionOperations,
      ...passport.equipmentRules,
      ...passport.deliveryFlows,
      ...passport.wasteFlows,
    ].map((item) => item.expectationId)],
  ];
  for (const [kind, values] of uniqueSets) {
    for (const duplicate of duplicates(values)) add(`DUPLICATE_${kind}:${duplicate}`);
  }

  if (passport.stages.length === 0) add("TECHNOLOGY_STAGES_EMPTY");
  const stageSequences = passport.stages.map((stage) => String(stage.sequence));
  if (stageSequences.some((value) => !Number.isInteger(Number(value)) || Number(value) < 1)) add("STAGE_SEQUENCE_INVALID");
  for (const duplicate of duplicates(stageSequences)) add(`DUPLICATE_STAGE_SEQUENCE:${duplicate}`);
  for (const stage of passport.stages) {
    requireRu(stage.titleRu, `STAGE_TITLE_RU_MISSING:${stage.stageId}`);
    requireRu(stage.resultRu, `STAGE_RESULT_RU_MISSING:${stage.stageId}`);
  }

  const capabilityByGroup = new Map(passport.capabilities.map((item) => [item.group, item]));
  if (capabilityByGroup.size !== CAPABILITY_GROUPS.length) add("CAPABILITY_MATRIX_INCOMPLETE");
  for (const group of CAPABILITY_GROUPS) {
    const capability = capabilityByGroup.get(group);
    if (!capability) continue;
    requireRu(capability.reasonRu, `CAPABILITY_REASON_RU_MISSING:${group}`);
    if (capability.normSourceIds.length === 0) add(`CAPABILITY_SOURCE_MISSING:${group}`);
  }

  for (const source of passport.normSources) {
    if (!evidenceIds.has(source.evidenceId)) add(`NORM_SOURCE_EVIDENCE_MISSING:${source.sourceId}`);
    if (![source.title, source.editionOrVersion, source.locator, source.applicabilityRu].every(nonBlank)) {
      add(`NORM_SOURCE_INCOMPLETE:${source.sourceId}`);
    }
  }
  for (const formula of passport.quantityFormulas) {
    if (![formula.expressionSource, formula.outputUnitId, formula.roundingRule, formula.lossRule].every(nonBlank)) {
      add(`FORMULA_INCOMPLETE:${formula.formulaId}`);
    }
    for (const inputId of formula.inputParameterIds) {
      if (!parameters.has(inputId)) add(`FORMULA_PARAMETER_MISSING:${formula.formulaId}:${inputId}`);
    }
    for (const sourceId of formula.normSourceIds) {
      if (!normSources.has(sourceId)) add(`FORMULA_NORM_SOURCE_MISSING:${formula.formulaId}:${sourceId}`);
    }
  }
  for (const parameter of passport.userInputs) {
    requireRu(parameter.titleRu, `PARAMETER_TITLE_RU_MISSING:${parameter.parameterId}`);
    if (parameter.guideRu.trim().length < 12 || !hasCyrillic(parameter.guideRu)) {
      add(`PARAMETER_GUIDE_RU_MISSING:${parameter.parameterId}`);
    }
    if (parameter.formulaConsumerIds.length + parameter.expectationConsumerIds.length === 0) {
      add(`VISIBLE_PARAMETER_UNUSED:${parameter.parameterId}`);
    }
    if (parameter.acceptedDefault !== null && !parameter.defaultProvenanceId) {
      add(`PARAMETER_DEFAULT_PROVENANCE_MISSING:${parameter.parameterId}`);
    }
  }

  const expectedItems: readonly TechnologyPassportExpectedItemR1[] = [
    ...passport.requiredMaterialFamilies,
    ...passport.conditionalMaterialFamilies,
    ...passport.constructionOperations,
    ...passport.equipmentRules,
    ...passport.deliveryFlows,
    ...passport.wasteFlows,
  ];
  for (const item of expectedItems) {
    requireRu(item.titleRu, `EXPECTATION_TITLE_RU_MISSING:${item.expectationId}`);
    requireRu(item.purposeRu, `EXPECTATION_PURPOSE_RU_MISSING:${item.expectationId}`);
    if (!stages.has(item.stageId)) add(`EXPECTATION_STAGE_MISSING:${item.expectationId}:${item.stageId}`);
    if (!formulas.has(item.formulaId)) add(`EXPECTATION_FORMULA_MISSING:${item.expectationId}:${item.formulaId}`);
    if (!nonBlank(item.inclusionCondition)) add(`EXPECTATION_CONDITION_MISSING:${item.expectationId}`);
    if (item.normSourceIds.length === 0) add(`EXPECTATION_NORM_SOURCE_EMPTY:${item.expectationId}`);
    for (const sourceId of item.normSourceIds) {
      if (!normSources.has(sourceId)) add(`EXPECTATION_NORM_SOURCE_MISSING:${item.expectationId}:${sourceId}`);
    }
  }
  for (const material of [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies]) {
    requireRu(material.specificationRequirementRu, `MATERIAL_SPECIFICATION_RU_MISSING:${material.expectationId}`);
    const procurement = procurementRules.get(material.procurementRuleId);
    if (!procurement) add(`MATERIAL_PROCUREMENT_RULE_MISSING:${material.expectationId}`);
    else if (procurement.familyId !== material.familyId) add(`MATERIAL_PROCUREMENT_FAMILY_MISMATCH:${material.expectationId}`);
    const resolution = material.selectionResolutionR33;
    if (resolution) {
      if (resolution.contract !== "real-useful-estimates.material-selection-resolution-r33.v1") {
        add(`MATERIAL_SELECTION_CONTRACT_DRIFT:${material.expectationId}`);
      }
      for (const [field, value] of [
        ["PUBLIC_TITLE", resolution.publicBoqTitleRu],
        ["TECHNICAL_SPECIFICATION", resolution.technicalSpecificationRu],
        ["PLAIN_HINT", resolution.plainHintRu],
        ["PRELIMINARY_VALUE", resolution.preliminaryValueRu],
      ] as const) {
        requireRu(value, `MATERIAL_SELECTION_${field}_RU_MISSING:${material.expectationId}`);
        if (FORBIDDEN_MATERIAL_SELECTION_PLACEHOLDER.test(value)) {
          add(`MATERIAL_SELECTION_${field}_PLACEHOLDER:${material.expectationId}`);
        }
      }
      if (material.titleRu !== resolution.publicBoqTitleRu) {
        add(`MATERIAL_SELECTION_PUBLIC_TITLE_MISMATCH:${material.expectationId}`);
      }
      const selectionParameter = parameters.get(resolution.selectionParameterId);
      if (!selectionParameter) add(`MATERIAL_SELECTION_PARAMETER_MISSING:${material.expectationId}`);
      else {
        if (selectionParameter.titleRu !== resolution.selectionParameterTitleRu) {
          add(`MATERIAL_SELECTION_PARAMETER_TITLE_MISMATCH:${material.expectationId}`);
        }
        if (selectionParameter.guideRu !== resolution.plainHintRu) {
          add(`MATERIAL_SELECTION_PARAMETER_HINT_MISMATCH:${material.expectationId}`);
        }
        if (selectionParameter.acceptedDefault !== resolution.preliminaryValueRu) {
          add(`MATERIAL_SELECTION_PRELIMINARY_DEFAULT_MISMATCH:${material.expectationId}`);
        }
      }
      if (resolution.confirmationRequired !== (resolution.strategy === "REQUIRED_PROJECT_INPUT")) {
        add(`MATERIAL_SELECTION_CONFIRMATION_POLICY_MISMATCH:${material.expectationId}`);
      }
      if (![resolution.preliminaryNormPerResultUnit, resolution.preliminaryPackageSize].every((value) => Number.isFinite(value) && value > 0)
        || !Number.isFinite(resolution.preliminaryLossPercent) || resolution.preliminaryLossPercent < 0) {
        add(`MATERIAL_SELECTION_NUMERIC_DEFAULT_INVALID:${material.expectationId}`);
      }
      if (![resolution.materialUnitId, resolution.packageUnitRu, resolution.selectionParameterId].every(nonBlank)) {
        add(`MATERIAL_SELECTION_UNIT_OR_PARAMETER_MISSING:${material.expectationId}`);
      }
      for (const sourceId of resolution.sourceIds) {
        if (!normSources.has(sourceId)) add(`MATERIAL_SELECTION_SOURCE_MISSING:${material.expectationId}:${sourceId}`);
      }
    }
  }
  for (const conditional of passport.conditionalMaterialFamilies) {
    const exclusion = exclusions.get(conditional.exclusionId);
    if (!exclusion || exclusion.expectationId !== conditional.expectationId) {
      add(`CONDITIONAL_EXCLUSION_MISSING:${conditional.expectationId}`);
    }
  }
  for (const equipment of passport.equipmentRules) {
    requireRu(equipment.equipmentClassRu, `EQUIPMENT_CLASS_RU_MISSING:${equipment.expectationId}`);
    if (FORBIDDEN_GENERIC_EQUIPMENT.test(equipment.equipmentClassRu)
      || FORBIDDEN_GENERIC_EQUIPMENT.test(equipment.titleRu)) {
      add(`GENERIC_EQUIPMENT_RULE:${equipment.expectationId}`);
    }
    if (equipment.keyCharacteristicsRu.length === 0 || equipment.keyCharacteristicsRu.some((value) => !hasCyrillic(value))) {
      add(`EQUIPMENT_CHARACTERISTICS_MISSING:${equipment.expectationId}`);
    }
    if (!equipment.keyCharacteristicsRu.some((value) => NUMERIC_EQUIPMENT_CHARACTERISTIC.test(value))) {
      add(`EQUIPMENT_NUMERIC_CHARACTERISTIC_MISSING:${equipment.expectationId}`);
    }
    if (!passport.constructionOperations.some((operation) => operation.operationId === equipment.operationId)) {
      add(`EQUIPMENT_OPERATION_MISSING:${equipment.expectationId}:${equipment.operationId}`);
    }
  }
  for (const flow of passport.deliveryFlows) {
    if (flow.cargoFamilyIds.length === 0 || !hasCyrillic(flow.vehicleTypeRu)
      || !hasCyrillic(flow.capacityRequirementRu) || !parameters.has(flow.distanceParameterId)
      || !nonBlank(flow.deduplicationKey)) {
      add(`DELIVERY_FLOW_INCOMPLETE:${flow.expectationId}`);
    }
  }
  for (const flow of passport.wasteFlows) {
    if (flow.sourceMaterialFamilyIds.length === 0 || !hasCyrillic(flow.vehicleTypeRu)
      || !parameters.has(flow.distanceParameterId) || !nonBlank(flow.deduplicationKey)) {
      add(`WASTE_FLOW_INCOMPLETE:${flow.expectationId}`);
    }
  }
  for (const assumption of passport.acceptedPreliminaryAssumptions) {
    requireRu(assumption.statementRu, `PRELIMINARY_ASSUMPTION_RU_MISSING:${assumption.assumptionId}`);
    if (!normSources.has(assumption.sourceId)) add(`PRELIMINARY_ASSUMPTION_SOURCE_MISSING:${assumption.assumptionId}`);
    if (assumption.userVisible !== true) add(`PRELIMINARY_ASSUMPTION_NOT_VISIBLE:${assumption.assumptionId}`);
  }
  for (const exclusion of passport.exclusions) {
    if (!nonBlank(exclusion.conditionExpression) || !hasCyrillic(exclusion.reasonRu)
      || exclusion.sourceIds.length === 0) add(`EXCLUSION_INCOMPLETE:${exclusion.exclusionId}`);
  }

  const uniqueErrors = [...new Set(errors)].sort();
  return {
    contract: TECHNOLOGY_PASSPORT_R1_CONTRACT,
    allowed: uniqueErrors.length === 0,
    status: uniqueErrors.length === 0 ? "GREEN" : "RED",
    errors: uniqueErrors,
    passportSha256: technologyPassportR1Sha256(passport),
    metrics: {
      requiredMaterialFamilies: passport.requiredMaterialFamilies.length,
      conditionalMaterialFamilies: passport.conditionalMaterialFamilies.length,
      constructionOperations: passport.constructionOperations.length,
      equipmentRules: passport.equipmentRules.length,
      deliveryFlows: passport.deliveryFlows.length,
      wasteFlows: passport.wasteFlows.length,
      formulas: passport.quantityFormulas.length,
      normSources: passport.normSources.length,
    },
  };
}

function requireExpectedOrExcluded(
  expected: readonly { expectationId: string }[],
  actualIds: ReadonlySet<string>,
  proofs: ReadonlyMap<string, TechnologyPassportRuntimeExclusionProofR1>,
  exclusions: ReadonlyMap<string, TechnologyPassportExclusionR1>,
  missingCode: string,
  errors: string[],
): void {
  for (const item of expected) {
    if (actualIds.has(item.expectationId)) continue;
    const proof = proofs.get(item.expectationId);
    const exclusion = exclusions.get(item.expectationId);
    if (!proof || !exclusion || proof.exclusionId !== exclusion.exclusionId
      || proof.conditionProven !== true || proof.conditionExpression !== exclusion.conditionExpression
      || !SHA256.test(proof.evidenceSha256)) {
      errors.push(`${missingCode}:${item.expectationId}`);
    }
  }
}

export function evaluateTechnologyPassportRuntimeTruthR1(
  passport: TechnologyPassportR1,
  runtime: TechnologyPassportRuntimeProjectionR1,
): TechnologyPassportDecisionR1 {
  const decision = evaluateTechnologyPassportR1(passport, [
    runtime.runtimeDefinitionSha256,
    runtime.runtimeRowsSha256,
  ]);
  const errors = [...decision.errors];
  const add = (code: string): void => {
    errors.push(code);
  };
  const passportSha256 = technologyPassportR1Sha256(passport);
  if (runtime.catalogId !== passport.catalogId) add("RUNTIME_CATALOG_ID_MISMATCH");
  if (runtime.technologyVariantId !== passport.technologyVariantId) add("RUNTIME_TECHNOLOGY_VARIANT_MISMATCH");
  if (runtime.resultUnitId !== passport.resultUnitId) add("RUNTIME_RESULT_UNIT_MISMATCH");
  if (runtime.technologyPassportSha256 !== passportSha256) add("RUNTIME_PASSPORT_BINDING_MISMATCH");
  if (![runtime.runtimeDefinitionSha256, runtime.runtimeRowsSha256].every((value) => SHA256.test(value))) {
    add("RUNTIME_SOURCE_HASH_INVALID");
  }
  if (!nonBlank(runtime.sourceIdentity)) add("RUNTIME_SOURCE_IDENTITY_MISSING");

  const runtimeRows: readonly TechnologyPassportRuntimeOwnedRowR1[] = [
    ...runtime.materialRows,
    ...runtime.constructionOperationRows,
    ...runtime.equipmentRows,
    ...runtime.deliveryRows,
    ...runtime.wasteRows,
  ];
  for (const duplicate of duplicates(runtimeRows.map((item) => item.rowId))) add(`RUNTIME_DUPLICATE_ROW_ID:${duplicate}`);
  for (const duplicate of duplicates(runtimeRows.map((item) => item.semanticOwnerId))) add(`RUNTIME_DUPLICATE_SEMANTIC_OWNER:${duplicate}`);
  for (const duplicate of duplicates(runtimeRows.map((item) => item.costOwnerId))) add(`RUNTIME_DUPLICATE_COST_OWNER:${duplicate}`);
  const passportNormSourceIds = new Set(passport.normSources.map((item) => item.sourceId));
  const passportStageIds = new Set(passport.stages.map((item) => item.stageId));
  for (const row of runtimeRows) {
    if (![row.rowId, row.titleRu, row.stageId, row.unitId, row.formulaId,
      row.semanticOwnerId, row.costOwnerId].every(nonBlank)) add(`RUNTIME_ROW_INCOMPLETE:${row.rowId}`);
    if (!hasCyrillic(row.titleRu) || FORBIDDEN_GENERIC_PUBLIC_TITLE.test(normalized(row.titleRu))) {
      add(`RUNTIME_PUBLIC_TITLE_NOT_EXACT_RU:${row.rowId}`);
    }
    if (RAW_PUBLIC_UNITS.has(normalized(row.unitId).toLocaleLowerCase("ru-RU"))) {
      add(`RUNTIME_RAW_INTERNAL_UNIT:${row.rowId}:${row.unitId}`);
    }
    if (!passportStageIds.has(row.stageId)) add(`RUNTIME_STAGE_UNKNOWN:${row.rowId}:${row.stageId}`);
    if (!runtime.formulaIds.includes(row.formulaId)) add(`RUNTIME_ROW_FORMULA_UNKNOWN:${row.rowId}:${row.formulaId}`);
    if (row.normSourceIds.length === 0) add(`RUNTIME_ROW_NORM_SOURCE_EMPTY:${row.rowId}`);
    for (const sourceId of row.normSourceIds) {
      if (!passportNormSourceIds.has(sourceId)) add(`RUNTIME_ROW_NORM_SOURCE_UNKNOWN:${row.rowId}:${sourceId}`);
    }
  }

  const materialFamilies = new Set(runtime.materialRows.map((item) => item.familyId));
  const expectedMaterialFamilies = new Set([
    ...passport.requiredMaterialFamilies,
    ...passport.conditionalMaterialFamilies,
  ].map((item) => item.familyId));
  for (const material of runtime.materialRows) {
    if (!expectedMaterialFamilies.has(material.familyId)) add(`UNEXPECTED_MATERIAL_FAMILY:${material.familyId}`);
    if (!hasCyrillic(material.specificationRu) || !hasCyrillic(material.purposeRu)) {
      add(`RUNTIME_MATERIAL_SPECIFICATION_OR_PURPOSE_MISSING:${material.rowId}`);
    }
    if (![material.netQuantity, material.grossQuantity, material.lossPercent].every((value) => DECIMAL.test(value))) {
      add(`RUNTIME_MATERIAL_QUANTITY_INVALID:${material.rowId}`);
    } else if (Number(material.grossQuantity) < Number(material.netQuantity) || Number(material.lossPercent) < 0) {
      add(`RUNTIME_MATERIAL_NET_GROSS_LOSS_INVALID:${material.rowId}`);
    }
    if (material.procurementEligible) {
      if (!material.package || !hasCyrillic(material.package.titleRu)
        || !DECIMAL.test(material.package.size) || !DECIMAL.test(material.package.procurementQuantity)
        || Number(material.package.size) <= 0 || Number(material.package.procurementQuantity) <= 0) {
        add(`RUNTIME_MATERIAL_PROCUREMENT_PACKAGE_INVALID:${material.rowId}`);
      }
    } else if (material.package) {
      add(`RUNTIME_MATERIAL_PACKAGE_ON_NON_PROCUREMENT_ROW:${material.rowId}`);
    }
    const expected = [...passport.requiredMaterialFamilies, ...passport.conditionalMaterialFamilies]
      .find((item) => item.familyId === material.familyId);
    if (expected && (expected.stageId !== material.stageId || expected.formulaId !== material.formulaId
      || expected.procurementRuleId !== material.procurementRuleId)) {
      add(`RUNTIME_MATERIAL_EXPECTATION_BINDING_MISMATCH:${material.rowId}`);
    }
  }
  for (const item of passport.requiredMaterialFamilies) {
    if (!materialFamilies.has(item.familyId)) add(`REQUIRED_MATERIAL_FAMILY_MISSING:${item.familyId}`);
  }
  const proofs = new Map(runtime.exclusionProofs.map((proof) => [proof.expectationId, proof]));
  const exclusionsByExpectation = new Map(passport.exclusions.map((item) => [item.expectationId, item]));
  const conditionalFamilyExpectations = passport.conditionalMaterialFamilies.map((item) => ({
    expectationId: item.expectationId,
    inclusionCondition: item.inclusionCondition,
  }));
  const presentConditionalExpectations = new Set(passport.conditionalMaterialFamilies
    .filter((item) => materialFamilies.has(item.familyId)).map((item) => item.expectationId));
  requireExpectedOrExcluded(conditionalFamilyExpectations, presentConditionalExpectations, proofs,
    exclusionsByExpectation,
    "CONDITIONAL_MATERIAL_UNRESOLVED", errors);

  const requiredOperations = passport.constructionOperations.filter((item) => item.required);
  for (const item of requiredOperations) {
    if (!runtime.constructionOperationRows.some((row) => row.operationId === item.operationId)) {
      add(`REQUIRED_CONSTRUCTION_OPERATION_MISSING:${item.operationId}`);
    }
  }
  const expectedOperationIds = new Set(passport.constructionOperations.map((item) => item.operationId));
  for (const operation of runtime.constructionOperationRows) {
    if (!expectedOperationIds.has(operation.operationId)) add(`UNEXPECTED_CONSTRUCTION_OPERATION:${operation.operationId}`);
    if (!hasCyrillic(operation.purposeRu)) add(`RUNTIME_CONSTRUCTION_OPERATION_PURPOSE_MISSING:${operation.rowId}`);
  }
  const conditionalOperations = passport.constructionOperations.filter((item) => !item.required);
  const operationExpectations = new Set(conditionalOperations
    .filter((item) => runtime.constructionOperationRows.some((row) => row.operationId === item.operationId))
    .map((item) => item.expectationId));
  requireExpectedOrExcluded(conditionalOperations, operationExpectations, proofs,
    exclusionsByExpectation,
    "CONDITIONAL_CONSTRUCTION_OPERATION_UNRESOLVED", errors);

  const projections: ReadonlyArray<[
    readonly TechnologyPassportExpectedItemR1[],
    readonly string[],
    (item: TechnologyPassportExpectedItemR1) => string,
    string,
  ]> = [
    [passport.equipmentRules, runtime.equipmentRows.map((item) => item.equipmentRuleId), (item) => (item as TechnologyPassportEquipmentRuleR1).equipmentRuleId, "EQUIPMENT_RULE_UNRESOLVED"],
    [passport.deliveryFlows, runtime.deliveryRows.map((item) => item.deliveryFlowId), (item) => (item as TechnologyPassportDeliveryFlowR1).deliveryFlowId, "DELIVERY_FLOW_UNRESOLVED"],
    [passport.wasteFlows, runtime.wasteRows.map((item) => item.wasteFlowId), (item) => (item as TechnologyPassportWasteFlowR1).wasteFlowId, "WASTE_FLOW_UNRESOLVED"],
  ];
  for (const [expected, actual, identity, code] of projections) {
    const actualIds = new Set(actual);
    const present = new Set(expected.filter((item) => actualIds.has(identity(item))).map((item) => item.expectationId));
    requireExpectedOrExcluded(expected, present, proofs, exclusionsByExpectation, code, errors);
  }
  const expectedEquipment = new Map(passport.equipmentRules.map((item) => [item.equipmentRuleId, item]));
  for (const equipment of runtime.equipmentRows) {
    const expected = expectedEquipment.get(equipment.equipmentRuleId);
    if (!expected) add(`UNEXPECTED_EQUIPMENT_RULE:${equipment.equipmentRuleId}`);
    if (FORBIDDEN_GENERIC_EQUIPMENT.test(equipment.titleRu)
      || FORBIDDEN_GENERIC_EQUIPMENT.test(equipment.equipmentClassRu)) {
      add(`RUNTIME_GENERIC_EQUIPMENT:${equipment.rowId}`);
    }
    if (equipment.keyCharacteristicsRu.length === 0
      || !equipment.keyCharacteristicsRu.some((value) => NUMERIC_EQUIPMENT_CHARACTERISTIC.test(value))) {
      add(`RUNTIME_EQUIPMENT_NUMERIC_CHARACTERISTIC_MISSING:${equipment.rowId}`);
    }
    if (expected && (equipment.operationId !== expected.operationId
      || equipment.inclusionCondition !== expected.inclusionCondition)) {
      add(`RUNTIME_EQUIPMENT_EXPECTATION_BINDING_MISMATCH:${equipment.rowId}`);
    }
  }
  const expectedDelivery = new Map(passport.deliveryFlows.map((item) => [item.deliveryFlowId, item]));
  for (const delivery of runtime.deliveryRows) {
    const expected = expectedDelivery.get(delivery.deliveryFlowId);
    if (!expected) add(`UNEXPECTED_DELIVERY_FLOW:${delivery.deliveryFlowId}`);
    if (delivery.cargoFamilyIds.length === 0 || !hasCyrillic(delivery.vehicleTypeRu)
      || !NUMERIC_EQUIPMENT_CHARACTERISTIC.test(delivery.capacityRequirementRu)
      || !runtime.parameterIds.includes(delivery.distanceParameterId) || !nonBlank(delivery.deduplicationKey)) {
      add(`RUNTIME_DELIVERY_FLOW_INCOMPLETE:${delivery.rowId}`);
    }
    if (expected && (delivery.distanceParameterId !== expected.distanceParameterId
      || delivery.deduplicationKey !== expected.deduplicationKey)) {
      add(`RUNTIME_DELIVERY_EXPECTATION_BINDING_MISMATCH:${delivery.rowId}`);
    }
  }
  const expectedWaste = new Map(passport.wasteFlows.map((item) => [item.wasteFlowId, item]));
  for (const waste of runtime.wasteRows) {
    const expected = expectedWaste.get(waste.wasteFlowId);
    if (!expected) add(`UNEXPECTED_WASTE_FLOW:${waste.wasteFlowId}`);
    if (waste.sourceMaterialFamilyIds.length === 0 || !hasCyrillic(waste.vehicleTypeRu)
      || !runtime.parameterIds.includes(waste.distanceParameterId) || !nonBlank(waste.deduplicationKey)) {
      add(`RUNTIME_WASTE_FLOW_INCOMPLETE:${waste.rowId}`);
    }
  }

  for (const formula of passport.quantityFormulas) {
    if (!runtime.formulaIds.includes(formula.formulaId)) add(`RUNTIME_FORMULA_MISSING:${formula.formulaId}`);
  }
  for (const parameter of passport.userInputs) {
    if (!runtime.parameterIds.includes(parameter.parameterId)) add(`RUNTIME_PARAMETER_MISSING:${parameter.parameterId}`);
  }
  for (const rule of passport.procurementRules.filter((item) => item.procurementEligible)) {
    if (!runtime.procurementRuleIds.includes(rule.procurementRuleId)) {
      add(`RUNTIME_PROCUREMENT_RULE_MISSING:${rule.procurementRuleId}`);
    }
  }
  for (const incompatible of passport.incompatibleVariants) {
    if (runtime.includedVariantIds.includes(incompatible.variantId)) {
      add(`INCOMPATIBLE_VARIANT_INCLUDED:${incompatible.variantId}`);
    }
  }

  const uniqueErrors = [...new Set(errors)].sort();
  return {
    ...decision,
    allowed: uniqueErrors.length === 0,
    status: uniqueErrors.length === 0 ? "GREEN" : "RED",
    errors: uniqueErrors,
    passportSha256,
  };
}

export function assertTechnologyPassportRuntimeTruthR1(
  passport: TechnologyPassportR1,
  runtime: TechnologyPassportRuntimeProjectionR1,
): void {
  const decision = evaluateTechnologyPassportRuntimeTruthR1(passport, runtime);
  if (!decision.allowed) {
    throw new Error(`TECHNOLOGY_PASSPORT_R1_RED:${decision.errors.join("|")}`);
  }
}
