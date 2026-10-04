import { buildConsumerCanonicalPrecompileParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterInputValue } from "../../src/lib/estimate/backendPlatform/contracts";

const choose = { kind: "equals", parameterId: "operation_mode", value: "separate" };
const own = { kind: "and", operands: [choose, { kind: "equals", parameterId: "supply_mode", value: "own" }] };
const catalog: CanonicalEstimateCatalogItem = { catalogId: "fixture-operations", releaseId: "fixture", namespace: "global", domain: "roadworks",
  workKey: "fixture", titleRu: "Операция", definitionVersion: 1, applicability: {}, professionalMetadata: {}, parameterSchema: [
    { parameterId: "operation_mode", titleRu: "Применимость операции", valueType: "enum", constraints: { values: ["separate", "notRequired"] } },
    { parameterId: "supply_mode", titleRu: "Владелец поставки", valueType: "enum", constraints: { values: ["own", "included"], requiredWhen: choose } },
    { parameterId: "consumption_rate", titleRu: "Подтверждённый расход", valueType: "decimal", constraints: { min: 0, requiredWhen: choose } },
    { parameterId: "stock", titleRu: "Пригодное наличие", valueType: "decimal", constraints: { min: 0, requiredWhen: own } },
    { parameterId: "freight_capacity", titleRu: "Вместимость машины", valueType: "decimal", constraints: { min: 1, requiredWhen: {
      kind: "and", operands: [own, { kind: "greater_than", parameterId: "compiler_order_quantity", value: 0 }] } } },
  ].map((p, ordinal) => ({ ...p, valueType: p.valueType as "enum" | "decimal", ordinal, unitId: null, required: false, defaultValue: null,
    visibilityRole: "USER_INPUT", formulaConsumers: ["fixture-resource"], resourceBranchConsumers: ["fixture-resource"] })) };
const session = (parameters: Record<string, CanonicalEstimateParameterInputValue>) => buildConsumerCanonicalPrecompileParameterSession({
  catalog, draftId: "frontier", parameters, missingParameterIds: ["stock", "consumption_rate", "freight_capacity"], userExplicitParameterIds: Object.keys(parameters),
});

describe("operation applicability question frontier", () => {
  it("asks the operation choice before facts of competing branches while retaining every unresolved input", () => {
    const result = session({});
    expect(result.blockingMissingParameterIds).toEqual(["operation_mode"]);
    expect(result.status).toBe("BLOCKING_REQUIRED");
    expect(result.inactiveConditionalParameters?.map(p => p.parameterId)).toEqual(["supply_mode", "consumption_rate", "stock", "freight_capacity"]);
  });
  it("advances to applicable sources after a choice, then to stock without inventing its value", () => {
    const selected = session({ operation_mode: "separate" });
    expect(selected.blockingMissingParameterIds).toEqual(["supply_mode", "consumption_rate"]);
    expect(selected.inactiveConditionalParameters?.some(p => p.parameterId === "stock")).toBe(true);
    const owned = session({ operation_mode: "separate", supply_mode: "own", consumption_rate: 2 });
    expect(owned.blockingMissingParameterIds).toContain("stock");
    expect(owned.parameters.find(p => p.parameterId === "stock")?.value).toBeNull();
  });
  it("keeps disabled branch values for reactivation and never treats an undecided choice as zero consumption", () => {
    const disabled = session({ operation_mode: "notRequired", stock: 3 });
    expect(disabled.blockingMissingParameterIds).toEqual([]);
    expect(disabled.inactiveConditionalParameters?.find(p => p.parameterId === "stock")).toMatchObject({ value: 3, source: "USER_EXPLICIT" });
    expect(session({ operation_mode: "separate", stock: 3 }).blockingMissingParameterIds).toContain("supply_mode");
  });
});
