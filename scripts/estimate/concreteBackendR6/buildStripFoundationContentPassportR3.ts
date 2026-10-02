import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentPassportR3,
  type EstimateContentProvenanceKindR3,
} from "../../../src/lib/estimate/backendPlatform/estimateContentPassportR3";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  stripFoundationParameterConsumerRowIds,
} from "./reinforcedConcreteStripFoundationR1";
import { auditStripFoundationScopeCompletenessR1 } from "../../../src/lib/estimate/v4/stripFoundationScopeCompletenessR1";

export function buildStripFoundationContentPassportR3(
  catalogId = "concrete_foundation_interior_strip_foundation_form_standard",
): {
  passport: EstimateContentPassportR3;
  formulaConsumers: Record<string, string[]>;
  resourceConsumers: Record<string, string[]>;
  decision: ReturnType<typeof evaluateEstimateContentPassportR3>;
  scopeCompleteness: ReturnType<typeof auditStripFoundationScopeCompletenessR1>;
} {
  const formulaConsumers = Object.fromEntries(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    STRIP_FOUNDATION_FORMULAS
      .filter((formula) => formula.inputParameterIds.includes(parameter.parameterId))
      .map((formula) => formula.formulaId)
      .sort(),
  ]));
  const resourceConsumers = Object.fromEntries(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    stripFoundationParameterConsumerRowIds(parameter.parameterId),
  ]));
  const provenanceByCategory: Record<string, EstimateContentProvenanceKindR3> = {
    material: "CANONICAL_PHYSICAL_RESOURCE",
    construction_work: "EXPLICIT_CONSTRUCTION_OPERATION",
    machine_equipment: "EXPLICIT_EQUIPMENT",
    delivery: "EXPLICIT_CARGO_DELIVERY",
  };
  const passport: EstimateContentPassportR3 = {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    catalogId,
    titleRu: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.canonicalRuName,
    identityMode: "WORK",
    aliasesRu: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.searchAliases,
    physicalResultRu: "Готовый монолитный железобетонный ленточный фундамент",
    includedScopeRu: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.includedResults,
    excludedScopeRu: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.excludedDomains,
    parameters: STRIP_FOUNDATION_INPUTS.map((parameter) => ({
      parameterId: parameter.parameterId,
      titleRu: parameter.titleRu,
      guideRu: parameter.guideRu,
      visibilityRole: parameter.visibilityRole,
      formulaConsumerIds: formulaConsumers[parameter.parameterId] ?? [],
      resourceConsumerIds: resourceConsumers[parameter.parameterId] ?? [],
    })),
    formulas: STRIP_FOUNDATION_FORMULAS.map((formula) => ({
      formulaId: formula.formulaId,
      outputUnitId: formula.outputUnitId,
      expressionSource: formula.source,
      inputParameterIds: formula.inputParameterIds,
    })),
    resources: STRIP_FOUNDATION_ROWS.map((row) => ({
      rowId: row.rowId,
      group: row.category,
      titleRu: row.canonicalRuName,
      unitId: row.normalizedUom,
      formulaId: row.formulaId,
      semanticOwnerId: row.semanticOwnerId,
      costOwnerId: row.costOwner === "rate_item" ? `rate-item:${row.rateItemId}` : row.semanticOwnerId,
      resourceIdentity: row.resourceId,
      provenanceKind: provenanceByCategory[row.category]!,
      generationAxes: [],
      costingMode: row.includedInParentRate ? "INCLUDED_IN_PARENT" : "OWN_COST",
      procurementEligible: row.category !== "construction_work" && !row.includedInParentRate,
      normativeSource: { sourceKey: row.normSource.sourceKey, locator: row.normSource.locator },
      ...(row.cargo
        ? {
          delivery: {
            cargoRu: row.cargo.cargoRu,
            vehicleRu: row.cargo.vehicleRu,
            physicalQuantityFormulaId: row.cargo.physicalQuantityFormulaId,
            distanceParameterId: row.cargo.distanceParameterId,
          },
        }
        : {}),
    })),
    capabilityMatrix: (["material", "construction_work", "machine_equipment", "delivery"] as const).map((group) => ({
      group,
      status: "INCLUDED" as const,
      reasonRu: `Группа ${group} содержит только применимые строки технологического паспорта ленточного фундамента.`,
    })),
  };
  return {
    passport,
    formulaConsumers,
    resourceConsumers,
    decision: evaluateEstimateContentPassportR3(passport),
    scopeCompleteness: auditStripFoundationScopeCompletenessR1(),
  };
}
