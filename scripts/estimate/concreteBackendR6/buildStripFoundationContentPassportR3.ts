import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentPassportR3,
  type EstimateContentProvenanceKindR3,
} from "../../../src/lib/estimate/backendPlatform/estimateContentPassportR3";
import type { InclusionGraphAst } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
} from "./reinforcedConcreteStripFoundationR1";

function inclusionParameterIds(ast: InclusionGraphAst): string[] {
  const kind = String(ast.kind ?? "");
  if (kind === "parameter") return [String(ast.id ?? "")].filter(Boolean);
  if (["equals", "not_equals", "in", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"].includes(kind)) {
    return [String(ast.parameterId ?? "")].filter(Boolean);
  }
  if (kind === "not" && ast.operand && typeof ast.operand === "object" && !Array.isArray(ast.operand)) {
    return inclusionParameterIds(ast.operand as InclusionGraphAst);
  }
  if ((kind === "and" || kind === "or") && Array.isArray(ast.operands)) {
    return ast.operands
      .filter((operand): operand is InclusionGraphAst => Boolean(operand) && typeof operand === "object" && !Array.isArray(operand))
      .flatMap(inclusionParameterIds);
  }
  return [];
}

export function buildStripFoundationContentPassportR3(
  catalogId = "concrete_foundation_interior_strip_foundation_form_standard",
): {
  passport: EstimateContentPassportR3;
  formulaConsumers: Record<string, string[]>;
  resourceConsumers: Record<string, string[]>;
  decision: ReturnType<typeof evaluateEstimateContentPassportR3>;
} {
  const titleParameters: Record<string, readonly string[]> = {
    concrete_class: ["main_concrete"],
    watertightness: ["main_concrete"],
    frost_resistance: ["main_concrete"],
    mobility: ["main_concrete"],
  };
  const formulaConsumers = Object.fromEntries(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    STRIP_FOUNDATION_FORMULAS
      .filter((formula) => formula.inputParameterIds.includes(parameter.parameterId))
      .map((formula) => formula.formulaId)
      .sort(),
  ]));
  const resourceConsumers = Object.fromEntries(STRIP_FOUNDATION_INPUTS.map((parameter) => {
    const formulaIds = new Set(formulaConsumers[parameter.parameterId] ?? []);
    const rows = STRIP_FOUNDATION_ROWS.filter((row) => formulaIds.has(row.formulaId)
      || inclusionParameterIds(row.applicabilityExpression).includes(parameter.parameterId)
      || titleParameters[parameter.parameterId]?.includes(row.rowId));
    return [parameter.parameterId, rows.map((row) => row.rowId).sort()];
  }));
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
  };
}
