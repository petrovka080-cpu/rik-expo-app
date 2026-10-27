import { canonicalEstimateStableJson } from "../../../backendPlatform/canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "../../../backendPlatform/canonicalEstimateSha256";
import {
  evaluateTechnologyPassportRuntimeTruthR1,
  technologyPassportR1Sha256,
  type TechnologyPassportDecisionR1,
  type TechnologyPassportRuntimeExclusionProofR1,
  type TechnologyPassportRuntimeMaterialRowR1,
  type TechnologyPassportRuntimeProjectionR1,
} from "../../../backendPlatform/technologyPassportR1";
import { buildBatch001DrywallTechnologyPassportDraftR1 } from "./drywallCeilingBulkheadTechnologyPassportR1";

export const BATCH001_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT =
  "real-useful-estimates.batch001-shadow-compiler-r1.v1" as const;

const SHA256 = /^[a-f0-9]{64}$/u;
const EXACT_SPECIFICATION = /[а-яё].*\d+(?:[.,]\d+)?\s*(?:×\s*\d|мм|см|м(?=$|[\s,;:.)])|кг|л(?=$|[\s,;:.)])|кн|q[1-4]|%)/iu;
const FORBIDDEN_GENERIC = /(?:^|\b)(?:совместим(?:ый|ая|ое)|проектн(?:ый|ая|ое)\s+(?:материал|профиль)|прочие материалы|комплект расходников|оборудование доступа|механизм)(?:$|\b)/iu;

export type Batch001MaterialRuntimeInputR1 = {
  exactTitleRu: string;
  specificationRu: string;
  unitId: string;
  normPerM2: number;
  lossPercent: number;
  packageTitleRu: string;
  packageSize: number;
};

export type Batch001ConditionalMaterialRuntimeDecisionR1 =
  | { status: "INCLUDED"; material: Batch001MaterialRuntimeInputR1 }
  | { status: "EXCLUDED"; evidenceSha256: string };

export type Batch001AccessRuntimeDecisionR1 =
  | { kind: "IN_WORK_RATE"; towerExclusionEvidenceSha256: string; scissorExclusionEvidenceSha256: string }
  | { kind: "TOWER_5M"; productivityM2PerShift: number; scissorExclusionEvidenceSha256: string }
  | { kind: "SCISSOR_8M_230KG"; productivityM2PerShift: number; towerExclusionEvidenceSha256: string };

export type Batch001DeliveryRuntimeDecisionR1 =
  | { kind: "INCLUDED_BY_SUPPLIER"; exclusionEvidenceSha256: string }
  | { kind: "SEPARATE_5T_TRUCK"; cargoMassT: number; distanceKm: number };

export type Batch001RealUsefulShadowCompileInputR1 = {
  catalogId: string;
  sourceIdentity: string;
  resultAreaM2: number;
  requiredMaterials: Readonly<Record<string, Batch001MaterialRuntimeInputR1>>;
  conditionalMaterials: Readonly<Record<string, Batch001ConditionalMaterialRuntimeDecisionR1>>;
  access: Batch001AccessRuntimeDecisionR1;
  delivery: Batch001DeliveryRuntimeDecisionR1 | null;
};

export type Batch001RealUsefulShadowCompileResultR1 =
  | {
    status: "NEEDS_REQUIRED_INPUTS";
    catalogId: string;
    blockers: readonly string[];
    projection: null;
    decision: null;
  }
  | {
    status: "RED_DRAFT_REVIEW_REQUIRED";
    catalogId: string;
    blockers: readonly string[];
    projection: TechnologyPassportRuntimeProjectionR1;
    decision: TechnologyPassportDecisionR1;
  };

function decimal(value: number): string {
  return value.toFixed(8).replace(/0+$/u, "").replace(/\.$/u, "") || "0";
}

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function materialInputErrors(familyId: string, input: Batch001MaterialRuntimeInputR1 | undefined): string[] {
  if (!input) return [`MATERIAL_INPUT_MISSING:${familyId}`];
  const errors: string[] = [];
  if (!EXACT_SPECIFICATION.test(input.exactTitleRu) || FORBIDDEN_GENERIC.test(input.exactTitleRu)) {
    errors.push(`MATERIAL_EXACT_TITLE_INVALID:${familyId}`);
  }
  if (!EXACT_SPECIFICATION.test(input.specificationRu) || FORBIDDEN_GENERIC.test(input.specificationRu)) {
    errors.push(`MATERIAL_SPECIFICATION_INVALID:${familyId}`);
  }
  if (!input.unitId.trim()) errors.push(`MATERIAL_UNIT_MISSING:${familyId}`);
  if (!positive(input.normPerM2)) errors.push(`MATERIAL_NORM_INVALID:${familyId}`);
  if (!Number.isFinite(input.lossPercent) || input.lossPercent < 0 || input.lossPercent > 100) {
    errors.push(`MATERIAL_LOSS_INVALID:${familyId}`);
  }
  if (!/[а-яё]/iu.test(input.packageTitleRu) || !positive(input.packageSize)) {
    errors.push(`MATERIAL_PACKAGE_INVALID:${familyId}`);
  }
  return errors;
}

function exclusionProof(input: {
  expectationId: string;
  exclusionId: string;
  conditionExpression: string;
  evidenceSha256: string;
}): TechnologyPassportRuntimeExclusionProofR1 {
  return {
    expectationId: input.expectationId,
    exclusionId: input.exclusionId,
    conditionExpression: input.conditionExpression,
    conditionProven: true,
    evidenceSha256: input.evidenceSha256,
  };
}

function runtimeMaterialRow(input: {
  catalogId: string;
  resultAreaM2: number;
  expectation: ReturnType<typeof buildBatch001DrywallTechnologyPassportDraftR1>["requiredMaterialFamilies"][number];
  material: Batch001MaterialRuntimeInputR1;
}): TechnologyPassportRuntimeMaterialRowR1 {
  const netQuantity = input.resultAreaM2 * input.material.normPerM2;
  const grossQuantity = netQuantity * (1 + input.material.lossPercent / 100);
  const procurementQuantity = Math.ceil(grossQuantity / input.material.packageSize);
  return {
    rowId: `${input.catalogId}:real-useful-shadow-r1:material:${input.expectation.familyId}`,
    titleRu: input.material.exactTitleRu.trim(),
    stageId: input.expectation.stageId,
    unitId: input.material.unitId,
    formulaId: input.expectation.formulaId,
    semanticOwnerId: `${input.catalogId}:real-useful-shadow-r1:semantic:material:${input.expectation.familyId}`,
    costOwnerId: `${input.catalogId}:real-useful-shadow-r1:cost:material:${input.expectation.familyId}`,
    normSourceIds: input.expectation.normSourceIds,
    familyId: input.expectation.familyId,
    specificationRu: input.material.specificationRu.trim(),
    purposeRu: input.expectation.purposeRu,
    netQuantity: decimal(netQuantity),
    grossQuantity: decimal(grossQuantity),
    lossPercent: decimal(input.material.lossPercent),
    procurementRuleId: input.expectation.procurementRuleId,
    procurementEligible: true,
    package: {
      titleRu: input.material.packageTitleRu.trim(),
      size: decimal(input.material.packageSize),
      unitId: input.material.unitId,
      procurementQuantity: decimal(procurementQuantity),
    },
  };
}

export function compileBatch001RealUsefulShadowR1(
  input: Batch001RealUsefulShadowCompileInputR1,
): Batch001RealUsefulShadowCompileResultR1 {
  const passport = buildBatch001DrywallTechnologyPassportDraftR1(input.catalogId);
  const blockers: string[] = [];
  if (!input.sourceIdentity.trim()) blockers.push("SOURCE_IDENTITY_MISSING");
  if (!positive(input.resultAreaM2)) blockers.push("RESULT_AREA_INVALID");

  for (const expected of passport.requiredMaterialFamilies) {
    blockers.push(...materialInputErrors(expected.familyId, input.requiredMaterials[expected.familyId]));
  }
  for (const expected of passport.conditionalMaterialFamilies) {
    const decision = input.conditionalMaterials[expected.familyId];
    if (!decision) {
      blockers.push(`CONDITIONAL_MATERIAL_DECISION_MISSING:${expected.familyId}`);
    } else if (decision.status === "INCLUDED") {
      blockers.push(...materialInputErrors(expected.familyId, decision.material));
    } else if (!SHA256.test(decision.evidenceSha256)) {
      blockers.push(`CONDITIONAL_MATERIAL_EXCLUSION_EVIDENCE_INVALID:${expected.familyId}`);
    }
  }
  const unexpectedRequired = Object.keys(input.requiredMaterials)
    .filter((familyId) => !passport.requiredMaterialFamilies.some((item) => item.familyId === familyId));
  const unexpectedConditional = Object.keys(input.conditionalMaterials)
    .filter((familyId) => !passport.conditionalMaterialFamilies.some((item) => item.familyId === familyId));
  blockers.push(...unexpectedRequired.map((familyId) => `UNEXPECTED_REQUIRED_MATERIAL_INPUT:${familyId}`));
  blockers.push(...unexpectedConditional.map((familyId) => `UNEXPECTED_CONDITIONAL_MATERIAL_INPUT:${familyId}`));

  if (input.access.kind === "IN_WORK_RATE") {
    if (!SHA256.test(input.access.towerExclusionEvidenceSha256)) blockers.push("TOWER_EXCLUSION_EVIDENCE_INVALID");
    if (!SHA256.test(input.access.scissorExclusionEvidenceSha256)) blockers.push("SCISSOR_EXCLUSION_EVIDENCE_INVALID");
  } else {
    if (!positive(input.access.productivityM2PerShift)) blockers.push("ACCESS_PRODUCTIVITY_INVALID");
    const evidence = input.access.kind === "TOWER_5M"
      ? input.access.scissorExclusionEvidenceSha256
      : input.access.towerExclusionEvidenceSha256;
    if (!SHA256.test(evidence)) blockers.push("ALTERNATIVE_ACCESS_EXCLUSION_EVIDENCE_INVALID");
  }

  const expectedDelivery = passport.deliveryFlows[0] ?? null;
  if (!expectedDelivery && input.delivery != null) blockers.push("DELIVERY_INPUT_NOT_APPLICABLE");
  if (expectedDelivery && input.delivery == null) blockers.push("DELIVERY_DECISION_MISSING");
  if (input.delivery?.kind === "INCLUDED_BY_SUPPLIER" && !SHA256.test(input.delivery.exclusionEvidenceSha256)) {
    blockers.push("DELIVERY_EXCLUSION_EVIDENCE_INVALID");
  }
  if (input.delivery?.kind === "SEPARATE_5T_TRUCK"
    && (!positive(input.delivery.cargoMassT) || !positive(input.delivery.distanceKm))) {
    blockers.push("DELIVERY_CARGO_OR_DISTANCE_INVALID");
  }
  if (blockers.length > 0) {
    return {
      status: "NEEDS_REQUIRED_INPUTS",
      catalogId: input.catalogId,
      blockers: [...new Set(blockers)].sort(),
      projection: null,
      decision: null,
    };
  }

  const materialRows: TechnologyPassportRuntimeMaterialRowR1[] = [];
  for (const expected of passport.requiredMaterialFamilies) {
    materialRows.push(runtimeMaterialRow({
      catalogId: input.catalogId,
      resultAreaM2: input.resultAreaM2,
      expectation: expected,
      material: input.requiredMaterials[expected.familyId]!,
    }));
  }
  const exclusionProofs: TechnologyPassportRuntimeExclusionProofR1[] = [];
  for (const expected of passport.conditionalMaterialFamilies) {
    const decision = input.conditionalMaterials[expected.familyId]!;
    if (decision.status === "INCLUDED") {
      materialRows.push(runtimeMaterialRow({
        catalogId: input.catalogId,
        resultAreaM2: input.resultAreaM2,
        expectation: expected,
        material: decision.material,
      }));
    } else {
      const exclusion = passport.exclusions.find((item) => item.exclusionId === expected.exclusionId)!;
      exclusionProofs.push(exclusionProof({
        expectationId: expected.expectationId,
        exclusionId: exclusion.exclusionId,
        conditionExpression: exclusion.conditionExpression,
        evidenceSha256: decision.evidenceSha256,
      }));
    }
  }

  const constructionOperationRows = passport.constructionOperations.map((expected) => ({
    rowId: `${input.catalogId}:real-useful-shadow-r1:work:${expected.operationId}`,
    titleRu: expected.titleRu,
    stageId: expected.stageId,
    unitId: "m2",
    formulaId: expected.formulaId,
    semanticOwnerId: `${input.catalogId}:real-useful-shadow-r1:semantic:work:${expected.operationId}`,
    costOwnerId: `${input.catalogId}:real-useful-shadow-r1:cost:work:${expected.operationId}`,
    normSourceIds: expected.normSourceIds,
    operationId: expected.operationId,
    purposeRu: expected.purposeRu,
  }));

  const equipmentRows = [] as TechnologyPassportRuntimeProjectionR1["equipmentRows"][number][];
  for (const expected of passport.equipmentRules) {
    const selected = (input.access.kind === "TOWER_5M" && expected.equipmentRuleId === "mobile_tower_5m")
      || (input.access.kind === "SCISSOR_8M_230KG" && expected.equipmentRuleId === "self_propelled_scissor_lift_8m_230kg");
    if (selected) {
      equipmentRows.push({
        rowId: `${input.catalogId}:real-useful-shadow-r1:equipment:${expected.equipmentRuleId}`,
        titleRu: expected.titleRu,
        stageId: expected.stageId,
        unitId: "shift",
        formulaId: expected.formulaId,
        semanticOwnerId: `${input.catalogId}:real-useful-shadow-r1:semantic:equipment:${expected.equipmentRuleId}`,
        costOwnerId: `${input.catalogId}:real-useful-shadow-r1:cost:equipment:${expected.equipmentRuleId}`,
        normSourceIds: expected.normSourceIds,
        equipmentRuleId: expected.equipmentRuleId,
        equipmentClassRu: expected.equipmentClassRu,
        keyCharacteristicsRu: expected.keyCharacteristicsRu,
        operationId: expected.operationId,
        inclusionCondition: expected.inclusionCondition,
      });
    } else {
      const exclusion = passport.exclusions.find((item) => item.expectationId === expected.expectationId)!;
      const evidenceSha256 = input.access.kind === "IN_WORK_RATE"
        ? expected.equipmentRuleId === "mobile_tower_5m"
          ? input.access.towerExclusionEvidenceSha256
          : input.access.scissorExclusionEvidenceSha256
        : input.access.kind === "TOWER_5M"
          ? input.access.scissorExclusionEvidenceSha256
          : input.access.towerExclusionEvidenceSha256;
      exclusionProofs.push(exclusionProof({
        expectationId: expected.expectationId,
        exclusionId: exclusion.exclusionId,
        conditionExpression: exclusion.conditionExpression,
        evidenceSha256,
      }));
    }
  }

  const deliveryRows = [] as TechnologyPassportRuntimeProjectionR1["deliveryRows"][number][];
  if (expectedDelivery && input.delivery?.kind === "SEPARATE_5T_TRUCK") {
    const trips = Math.ceil(input.delivery.cargoMassT / 5);
    deliveryRows.push({
      rowId: `${input.catalogId}:real-useful-shadow-r1:delivery:${expectedDelivery.deliveryFlowId}`,
      titleRu: `${expectedDelivery.titleRu} — ${trips} рейс., ${decimal(input.delivery.distanceKm)} км`,
      stageId: expectedDelivery.stageId,
      unitId: "t_km",
      formulaId: expectedDelivery.formulaId,
      semanticOwnerId: `${input.catalogId}:real-useful-shadow-r1:semantic:delivery:${expectedDelivery.deliveryFlowId}`,
      costOwnerId: `${input.catalogId}:real-useful-shadow-r1:cost:delivery:${expectedDelivery.deliveryFlowId}`,
      normSourceIds: expectedDelivery.normSourceIds,
      deliveryFlowId: expectedDelivery.deliveryFlowId,
      cargoFamilyIds: materialRows.map((row) => row.familyId),
      vehicleTypeRu: expectedDelivery.vehicleTypeRu,
      capacityRequirementRu: expectedDelivery.capacityRequirementRu,
      distanceParameterId: expectedDelivery.distanceParameterId,
      deduplicationKey: expectedDelivery.deduplicationKey,
    });
  } else if (expectedDelivery && input.delivery?.kind === "INCLUDED_BY_SUPPLIER") {
    const exclusion = passport.exclusions.find((item) => item.expectationId === expectedDelivery.expectationId)!;
    exclusionProofs.push(exclusionProof({
      expectationId: expectedDelivery.expectationId,
      exclusionId: exclusion.exclusionId,
      conditionExpression: exclusion.conditionExpression,
      evidenceSha256: input.delivery.exclusionEvidenceSha256,
    }));
  }

  const rowPayload = { materialRows, constructionOperationRows, equipmentRows, deliveryRows, wasteRows: [] };
  const runtimeDefinitionSha256 = canonicalEstimateSha256HexText(canonicalEstimateStableJson({
    contract: BATCH001_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT,
    catalogId: input.catalogId,
    sourceIdentity: input.sourceIdentity,
  }));
  const runtimeRowsSha256 = canonicalEstimateSha256HexText(canonicalEstimateStableJson(rowPayload));
  const projection: TechnologyPassportRuntimeProjectionR1 = {
    catalogId: passport.catalogId,
    technologyVariantId: passport.technologyVariantId,
    resultUnitId: passport.resultUnitId,
    technologyPassportSha256: technologyPassportR1Sha256(passport),
    runtimeDefinitionSha256,
    runtimeRowsSha256,
    sourceIdentity: input.sourceIdentity,
    parameterIds: passport.userInputs.map((item) => item.parameterId),
    materialRows,
    constructionOperationRows,
    equipmentRows,
    deliveryRows,
    wasteRows: [],
    formulaIds: passport.quantityFormulas.map((item) => item.formulaId),
    procurementRuleIds: passport.procurementRules.map((item) => item.procurementRuleId),
    includedVariantIds: [],
    exclusionProofs,
  };
  const decision = evaluateTechnologyPassportRuntimeTruthR1(passport, projection);
  return {
    status: "RED_DRAFT_REVIEW_REQUIRED",
    catalogId: input.catalogId,
    blockers: decision.errors,
    projection,
    decision,
  };
}
