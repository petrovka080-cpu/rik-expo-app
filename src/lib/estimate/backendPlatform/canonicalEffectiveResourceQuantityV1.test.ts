import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "./canonicalEstimateCompileCore";
import { buildAutomaticConstructionOwnerR1, type AutomaticRowSpec } from "../v4/automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "../v4/effectivePurchaseBalanceR1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { canonicalEstimateRevisionRowFromStorage } from "./canonicalEstimateRevisionReadMapper";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "./canonicalEstimateArtifactContract";
import { assertCanonicalPurchaseReadinessV1, canonicalPurchaseShortageMessageV1,
  validateCanonicalManualTransportQuantityV1, resolveCanonicalPurchaseBalanceV1 } from "./canonicalPurchaseBalanceV1";

const provenance = { kind: "manual", reason: "synthetic MASTER arithmetic control; not a construction norm" };
test("persisted scoped discrete shortage labels do not invent a reserve and leave bulk and legacy labels intact", () => {
  const trace = { unitId: "item", quantityMode: "supply_quantum", balanceScope: "new_order_vs_required_consumption",
    requirementBasis: "selected_order_including_contingency", plannedConsumption: "13", requiredSelectedOrder: "13",
    consumptionShortage: "1", reserveDeficit: "0", procurementReady: false };
  const message = (balance: Record<string, unknown>) => canonicalPurchaseShortageMessageV1(JSON.parse(JSON.stringify([
    { title_ru: "Комплект", calculation_trace: { purchaseBalance: balance } },
  ])));
  expect(message(trace)).toContain("не хватает до расчётного заказа 1 item");
  expect(message(trace)).not.toContain("с выбранным резервом");
  expect(message({ ...trace, quantityMode: "canonical_decimal", unitId: "m3" })).toContain("заказ с выбранным резервом не покрыт на 1 m3");
  expect(message({ ...trace, requirementBasis: undefined, balanceScope: undefined, unitId: "kg" }))
    .toContain("не хватает для расхода 1 kg; резерв не покрыт на 0 kg");
});
const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: "material:order", orderUnitId: "kg", consumed: "consumed",
  stock: "stock", reserve: "reserve", quantum: "quantum" });
function testInput(): CanonicalEstimateCompileCoreInput {
  const rows: AutomaticRowSpec[] = [
    { rowId: "transport:trips", formulaId: "trips", section: "Transport", category: "transport", title: "Actual divisible cargo trips", unitId: "trip",
      expression: `ceil(${balance.effective}/payload)`, costTreatment: "OWN_COST", procurement: true,
      inclusion: { kind: "formula_greater_than", expression: balance.effective, unitId: "kg", value: 0 }, inputParameterIds: ["delivery_detail"],
      manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
    { rowId: "material:remaining", formulaId: "remaining", section: "Balance", category: "material", title: "Usable remainder", unitId: "kg",
      expression: balance.remaining, costTreatment: "INFORMATIONAL_SCOPE" },
    { rowId: "material:shortage", formulaId: "shortage", section: "Balance", category: "material", title: "Consumption shortage", unitId: "kg",
      expression: balance.consumptionShortage, costTreatment: "INFORMATIONAL_SCOPE" },
    { rowId: "material:reserve_deficit", formulaId: "reserve_deficit", section: "Balance", category: "material", title: "Reserve deficit", unitId: "kg",
      expression: balance.reserveDeficit, costTreatment: "INFORMATIONAL_SCOPE" },
    { rowId: "material:order", formulaId: "order", section: "Purchase", category: "material", title: "Selected actual material", unitId: "kg",
      expression: "ceil(max(0,consumed+reserve-stock)/quantum)*quantum", costTreatment: "OWN_COST", procurement: true,
      titleParameterIds: ["product"], inputParameterIds: ["product", "safety"], ...balance.owner },
    { rowId: "material:consumed", formulaId: "consumed", section: "Installation", category: "material", title: "Original consumption", unitId: "kg",
      expression: "consumed", costTreatment: "INFORMATIONAL_SCOPE" },
  ];
  const definition = buildAutomaticConstructionOwnerR1({ contract: "effective-quantity-test", semanticOwner: "test", sourceId: "synthetic-MASTER-control",
    normId: "not-a-construction-norm", sourceMetadata: { source_title: "Synthetic arithmetic fixture only", source_document_version: "test",
      definition_hash: "a".repeat(64), exact_locator: "MASTER 20.32.7 arithmetic control", artifact_sha256: "a".repeat(64) },
    applicabilityRu: "Synthetic control, never a published engineering default", profile: [], excludedUnownedAssumptions: [], rows,
    ordinary: ["consumed", "stock", "reserve", "quantum", "payload"].map(id => ({ id, title: id, kind: "ordinary", valueType: "decimal", unitId: "kg", min: id === "quantum" || id === "payload" ? 0.000001 : 0 })),
    conditional: [{ id: "product", title: "Selected product", kind: "ordinary", valueType: "text", unitId: null },
      { id: "safety", title: "Actual compatibility/safety evidence", kind: "ordinary", valueType: "text", unitId: null },
      { id: "delivery_detail", title: "Actual truck/route evidence", kind: "conditional", valueType: "text", unitId: null,
        requiredWhen: { kind: "formula_greater_than", expression: balance.effective, unitId: "kg", value: 0 } }],
  });
  return { operation: "recalculate", compilerVersion: "effective-test", catalogId: "test", primaryMeasureParameterId: "consumed",
    parameterDefinitions: [...definition.parameters], formulaDefinitions: [...definition.formulas], resourceDefinitions: [...definition.resources],
    submittedParameters: { consumed: 105, stock: 5, reserve: 0, quantum: 20, payload: 50, product: "TEST selected material", safety: "TEST original safety evidence", delivery_detail: "TEST divisible cargo compatible vehicle" },
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: definition.resources.length, hashJson: estimateDeterministicHash,
    rowOverrides: { "material:order": { unitPrice: "10", provenance } } };
}
const row = (result: Awaited<ReturnType<typeof compileCanonicalEstimateCore>>, rowId: string) => result.rows.find(value => value.row_id === rowId)!;

describe("authoritative effective resource quantities", () => {
  it("enforces a decimal supplier order without claiming physical consumption or a retained reserve", () => {
    const policy = { unitId: "kg", consumedExpression: "12.75", stockExpression: "0", reserveExpression: "0",
      quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
      requirementBasis: "selected_supply_order", plannedConsumptionExpression: "12.75" };
    const resolve = (quantity: string, raw: unknown = policy) => resolveCanonicalPurchaseBalanceV1(raw, "supplier-order", "kg", quantity, {}, new Set());
    const reopened = JSON.parse(JSON.stringify(resolve("12.5")));
    expect(reopened).toMatchObject({ quantum: null, plannedConsumption: "12.75", requiredSelectedOrder: "12.75",
      effectiveOrder: "12.5", consumptionShortage: "0.25", reserveDeficit: "0", procurementReady: false });
    const rows = [{ titleRu: "Исходный заказ", calculationTrace: { purchaseBalance: reopened } }];
    expect(() => assertCanonicalPurchaseReadinessV1(rows)).toThrow(expect.objectContaining({ code: "PROCUREMENT_MATERIAL_SHORTAGE" }));
    expect(canonicalPurchaseShortageMessageV1(rows)).toContain("не хватает до расчётного заказа 0.25 kg");
    expect(canonicalPurchaseShortageMessageV1(rows)).not.toContain("с выбранным резервом");
    expect(resolve("0")).toMatchObject({ consumptionShortage: "12.75", procurementReady: false });
    expect(resolve("13.125")).toMatchObject({ excessOrderAboveRequiredConsumption: "0.375", procurementReady: true });
    for (const quantity of ["13.1250000001", "-1"]) expect(() => resolve(quantity)).toThrow();
    for (const raw of [{ ...policy, stockExpression: "5" }, { ...policy, reserveExpression: "1" },
      { ...policy, plannedConsumptionExpression: "13" }, { ...policy, orderQuantumExpression: "1" }]) expect(() => resolve("13.125", raw)).toThrow();
  });
  it("keeps a neutral whole-supply order basis distinct from physically retained reserve and legacy contingency", () => {
    const policy = { unitId: "item", consumedExpression: "2", stockExpression: "0", reserveExpression: "0",
      quantityMode: "supply_quantum", orderQuantumExpression: "1", balanceScope: "new_order_vs_required_consumption",
      requirementBasis: "selected_supply_order", plannedConsumptionExpression: "1" };
    const resolve = (quantity: string, raw: unknown = policy) => resolveCanonicalPurchaseBalanceV1(raw, "pipe", "item", quantity, {}, new Set());
    expect(resolve("1")).toMatchObject({ plannedConsumption: "1", requiredSelectedOrder: "2", consumed: "2", reserve: "0",
      requirementBasis: "selected_supply_order", consumptionShortage: "1", procurementReady: false });
    expect(resolve("2.0000")).toMatchObject({ quantum: "1", consumptionShortage: "0", procurementReady: true });
    expect(resolve("0")).toMatchObject({ consumptionShortage: "2", remaining: "0", procurementReady: false });
    for (const quantity of ["1.5", "2.0000000001"]) expect(() => resolve(quantity)).toThrow();
    for (const raw of [{ ...policy, quantityMode: "canonical_decimal", orderQuantumExpression: undefined },
      { ...policy, balanceScope: undefined }, { ...policy, stockExpression: "1" }, { ...policy, reserveExpression: "1" },
      { ...policy, plannedConsumptionExpression: undefined }]) expect(() => resolve("2", raw)).toThrow();
    expect(canonicalPurchaseShortageMessageV1([{ titleRu: "Пачки трубы", calculationTrace: { purchaseBalance: resolve("1") } }]))
      .toContain("не хватает до расчётного заказа 1 item");
  });
  it("keeps a scoped whole-supply quantum distinct from the planned count and enforces submitted precision", () => {
    const policy = { unitId: "item", consumedExpression: "508", stockExpression: "0", reserveExpression: "0",
      quantityMode: "supply_quantum", orderQuantumExpression: "1", balanceScope: "new_order_vs_required_consumption",
      requirementBasis: "selected_order_including_contingency", plannedConsumptionExpression: "484" };
    const resolve = (quantity: string, raw: unknown = policy) => resolveCanonicalPurchaseBalanceV1(raw, "profile", "item", quantity, {}, new Set());
    expect(resolve("500")).toMatchObject({ quantum: "1", plannedConsumption: "484", requiredSelectedOrder: "508",
      effectiveOrder: "500", consumptionShortage: "8", procurementReady: false });
    for (const quantity of ["510", "510.0000"]) expect(resolve(quantity)).toMatchObject({ excessOrderAboveRequiredConsumption: "2", procurementReady: true });
    expect(resolve("0")).toMatchObject({ consumptionShortage: "508", remaining: "0", procurementReady: false });
    for (const quantity of ["510.5", "510.0000000001", "510.0000000000", "-1"]) expect(() => resolve(quantity)).toThrow();
    for (const raw of [{ ...policy, stockExpression: "1" }, { ...policy, reserveExpression: "1" },
      { ...policy, requirementBasis: null }, { ...policy, plannedConsumptionExpression: undefined },
      { ...policy, plannedConsumptionExpression: "509" }, { ...policy, balanceScope: "warehouse" }]) expect(() => resolve("510", raw)).toThrow();
    expect(resolveCanonicalPurchaseBalanceV1({ unitId: "item", consumedExpression: "105", stockExpression: "5",
      reserveExpression: "20", orderQuantumExpression: "20" }, "legacy", "item", "120", {}, new Set()))
      .toMatchObject({ consumptionShortage: "0", reserveDeficit: "0", remaining: "20", quantum: "20", procurementReady: true });
  });
  it("keeps the selected contingency requirement distinct from planned consumption and rejects undeclared basis inputs", () => {
    const policy = { unitId: "m3", consumedExpression: "259.2", stockExpression: "0", reserveExpression: "0",
      quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption",
      requirementBasis: "selected_order_including_contingency", plannedConsumptionExpression: "240" };
    const resolve = (raw: unknown = policy) => resolveCanonicalPurchaseBalanceV1(raw, "concrete", "m3", "250", {}, new Set());
    expect(resolve()).toMatchObject({ plannedConsumption: "240", requiredSelectedOrder: "259.2", consumptionShortage: "9.2", procurementReady: false });
    for (const raw of [{ ...policy, requirementBasis: null }, { ...policy, requirementBasis: "actual_stock" },
      { ...policy, plannedConsumptionExpression: "unknown" }, { ...policy, plannedConsumptionExpression: "260" },
      { ...policy, plannedConsumptionExpression: undefined }]) expect(() => resolve(raw)).toThrow();
  });
  it("accepts exact bulk decimals without fabricating a supplier quantum or available stock", () => {
    const policy = { unitId: "t", consumedExpression: "604", stockExpression: "0", reserveExpression: "0",
      quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" };
    const resolve = (quantity: string, raw: unknown = policy) => resolveCanonicalPurchaseBalanceV1(raw, "bulk", "t", quantity, {}, new Set());
    expect(resolve("650.125")).toMatchObject({ quantum: null, quantityMode: "canonical_decimal",
      effectiveOrder: "650.125", excessOrderAboveRequiredConsumption: "46.125", consumptionShortage: "0", procurementReady: true });
    expect(resolve("600")).toMatchObject({ consumptionShortage: "4", remaining: "0", procurementReady: false });
    for (const quantity of ["-1", "Infinity", "650.1250000001", "650.1250000000"]) expect(() => resolve(quantity)).toThrow("exact canonical decimal domain");
    for (const raw of [{ ...policy, quantityMode: "unknown" }, { ...policy, quantityMode: null },
      { ...policy, orderQuantumExpression: "1" }, { ...policy, stockExpression: "5" }, { ...policy, unitId: "kg" },
      { ...policy, balanceScope: "usable_hot_mix_inventory" }]) expect(() => resolve("650.125", raw)).toThrow(/purchase (?:quantity mode|balance unit\/keys) invalid/u);
    const declared = effectivePurchaseBalanceExpressionsR1({ ownerRowId: "bulk", orderUnitId: "t", consumed: "604",
      stock: "0", reserve: "0", quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
    expect(declared.packages).toBeNull();
    expect(declared.owner.purchaseBalance).not.toHaveProperty("orderQuantumExpression");
    expect(() => resolve("100.5", { unitId: "t", consumedExpression: "100", stockExpression: "0", reserveExpression: "0", orderQuantumExpression: "20" }))
      .toThrow("whole supply quantum");
  });
  it("enforces physical haul minimum and whole trips beyond binary integer precision", () => {
    const policy = { unitId: "trip", minimum: "calculated_quantity", integer: true };
    expect(() => validateCanonicalManualTransportQuantityV1(policy, "haul", "trip", "9007199254740992", "9007199254740993"))
      .toThrow("manual transport below physical minimum");
    expect(() => validateCanonicalManualTransportQuantityV1(policy, "haul", "trip", "9007199254740992.5", "1"))
      .toThrow("manual transport below physical minimum");
    expect(validateCanonicalManualTransportQuantityV1(policy, "haul", "trip", "9007199254740993", "9007199254740992"))
      .toMatchObject({ differsFromCalculated: true, acceptedQuantity: "9007199254740993" });
  });
  it("preserves manual 80 shortage through writer row JSON and reopen, and refuses procurement even when that row is filtered out", async () => {
    const input = testInput();
    input.rowOverrides!["material:order"] = { quantity: "80", unitPrice: "10", includedInProcurement: true, provenance };
    const result = await compileCanonicalEstimateCore(input);
    // The existing canonical writer sends compiled rows as p_rows. The SQL
    // writer persists calculation_trace; a new top-level field is not needed.
    const stored = (JSON.parse(JSON.stringify(result.rows)) as typeof result.rows).map(value => {
      delete value.procurement_readiness;
      return value;
    });
    const reopened = stored.map((value: Record<string, unknown>) => canonicalEstimateRevisionRowFromStorage(value, null));
    expect(reopened.find((value: { rowId: string }) => value.rowId === "material:order")).toMatchObject({ quantity: "80",
      includedInProcurement: false, calculationTrace: { purchaseBalance: { consumptionShortage: "20", procurementReady: false } } });
    expect(canonicalPurchaseShortageMessageV1(reopened)).toContain("20 kg");
    expect(() => assertCanonicalPurchaseReadinessV1(reopened)).toThrow("Закупка не готова");
    const selection = selectCanonicalArtifactRows(stored);
    expect(selection.procurementRows.some(value => value.row_id === "material:order")).toBe(false);
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "saved-80", release_id: "test", catalog_id: "test",
      checksum_sha256: "test", row_count: stored.length }, sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("Закупка не готова");
    const fixed = await compileCanonicalEstimateCore({ ...input,
      rowOverrides: { "material:order": { quantity: "120", unitPrice: "10", provenance } } });
    expect(() => assertCanonicalPurchaseReadinessV1(fixed.rows)).not.toThrow();
    expect(fixed.rows.find(value => value.row_id === "material:consumed")?.quantity).toBe("105");
  });
  it("matches exact MASTER 105/5/0/20 arithmetic, resets, preserves original consumption and ordinal", async () => {
    const input = testInput();
    const automatic = await compileCanonicalEstimateCore(input);
    expect(row(automatic, "material:order")).toMatchObject({ quantity: "100", amount: "1000" });
    expect(row(automatic, "material:remaining").quantity).toBe("0");
    expect(row(automatic, "transport:trips").quantity).toBe("2");
    input.rowOverrides!["material:order"] = { quantity: "120", unitPrice: "10", provenance };
    const manual = await compileCanonicalEstimateCore(input);
    expect(row(manual, "material:order")).toMatchObject({ quantity: "120", amount: "1200", procurement_readiness: "READY", included_in_procurement: true });
    expect(row(manual, "material:remaining").quantity).toBe("20");
    expect(row(manual, "transport:trips").quantity).toBe("3");
    expect(row(manual, "material:consumed").quantity).toBe("105");
    expect(manual.rows.map(value => value.row_id)).toEqual(input.resourceDefinitions.map(value => value.row_id));
    const reset = await compileCanonicalEstimateCore({ ...input, rowOverrides: { "material:order": { unitPrice: "10", provenance } } });
    expect(reset.revisionProjection).toEqual(automatic.revisionProjection);
  });

  it("shows consumption and reserve deficits separately and prevents shortage procurement", async () => {
    const input = testInput();
    input.rowOverrides!["material:order"] = { quantity: "80", unitPrice: "10", includedInProcurement: true, provenance };
    const result = await compileCanonicalEstimateCore(input);
    expect(row(result, "material:shortage").quantity).toBe("20");
    expect(row(result, "material:reserve_deficit").quantity).toBe("0");
    expect(row(result, "material:order")).toMatchObject({ quantity: "80", amount: "800", included_in_estimate: true, included_in_procurement: false,
      procurement_readiness: "SHORTAGE", calculation_trace: { purchaseBalance: { consumptionShortage: "20", reserveDeficit: "0", procurementReady: false } } });
    const reserve = await compileCanonicalEstimateCore({ ...input, submittedParameters: { ...input.submittedParameters, reserve: 20 } });
    expect(row(reserve, "material:shortage").quantity).toBe("20");
    expect(row(reserve, "material:reserve_deficit").quantity).toBe("20");
  });

  it("ignores stale submitted/confirmed derived outputs and exports excluded physical supply", async () => {
    const input = testInput();
    input.submittedParameters[balance.effective] = "99999";
    input.confirmedParameters[balance.effective] = "77777";
    input.rowOverrides!["material:order"] = { quantity: "120", includedInEstimate: false, provenance };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.derivedParameters[balance.effective]).toBe("120");
    expect(row(result, "material:remaining").quantity).toBe("20");
    expect(row(result, "transport:trips").quantity).toBe("3");
  });

  it("keeps source/product guards and propagates original missing facts despite source and haul overrides", async () => {
    const input = testInput();
    delete input.submittedParameters.safety;
    input.submittedParameters[balance.effective] = 999;
    input.rowOverrides = { "material:order": { quantity: "120", unitPrice: "10", provenance }, "transport:trips": { quantity: "999", provenance } };
    const result = await compileCanonicalEstimateCore(input);
    expect(result.derivedParameters).not.toHaveProperty(balance.effective);
    expect(result.rows.map(value => value.row_id)).toEqual(["material:consumed"]);
    for (const need of result.preliminaryNeeds) expect(need.missing_parameter_ids).toEqual(["safety"]);
    expect(result.preliminaryNeeds.find(need => need.row_id === "material:order")).toMatchObject({ quantity: "120", unit_price: "10" });
  });

  it("activates original transport facts on a zero-to-positive manual order and skips them for zero", async () => {
    const input = testInput();
    input.submittedParameters.stock = 105;
    delete input.submittedParameters.delivery_detail;
    const zero = await compileCanonicalEstimateCore(input);
    expect(zero.preliminaryNeeds).toEqual([]);
    expect(zero.rows.some(value => value.row_id === "transport:trips")).toBe(false);
    const positive = await compileCanonicalEstimateCore({ ...input, rowOverrides: { "material:order": { quantity: "120", provenance } } });
    expect(positive.preliminaryNeeds.find(need => need.row_id === "transport:trips")?.missing_parameter_ids).toEqual(["delivery_detail"]);
  });

  it.each(["100.5", "110", "1000000000.000001"])("rejects purchase quantities outside whole supply quantum: %s", async quantity => {
    const input = testInput();
    input.rowOverrides!["material:order"] = { quantity, provenance };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });
  it("accepts the nearest exact large whole supply quantum without a floating tolerance", async () => {
    const input = testInput();
    input.rowOverrides!["material:order"] = { quantity: "1000000000", provenance };
    expect(row(await compileCanonicalEstimateCore(input), "material:order").quantity).toBe("1000000000");
  });

  it.each(["2", "3.5"])("rejects impossible or fractional manual haul: %s", async quantity => {
    const input = testInput();
    input.rowOverrides = { "material:order": { quantity: "120", provenance }, "transport:trips": { quantity, provenance } };
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
  });

  it("preserves a safe separate haul override with the new computed requirement in trace", async () => {
    const input = testInput();
    input.rowOverrides = { "material:order": { quantity: "120", provenance }, "transport:trips": { quantity: "4", provenance } };
    expect(row(await compileCanonicalEstimateCore(input), "transport:trips")).toMatchObject({ quantity: "4",
      calculation_trace: { transportQuantity: { minimumQuantity: "3", acceptedQuantity: "4", differsFromCalculated: true } } });
  });

  it.each(["binding_unit", "formula_unit", "source_row", "cycle"])("rejects corrupt authoritative binding: %s", async corruption => {
    const input = testInput();
    const owner = input.resourceDefinitions.find(value => value.row_id === "material:order")!;
    if (corruption === "binding_unit") owner.resource_graph = { ...owner.resource_graph, effectiveQuantityOutputV1: { parameterId: balance.effective, unitId: "m" } };
    if (corruption === "formula_unit") input.formulaDefinitions.find(value => value.formula_id === "order")!.output_unit_id = "m";
    if (corruption === "source_row") input.parameterDefinitions.find(value => value.parameter_id === balance.effective)!.truth_metadata = {
      visibility_role: "INTERNAL_ONLY", effective_resource_quantity_v1: { sourceRowId: "material:other", unitId: "kg" } };
    if (corruption === "cycle") {
      const formula = input.formulaDefinitions.find(value => value.formula_id === "order")!;
      formula.ast = { kind: "parameter", id: balance.effective }; formula.input_parameter_ids = [balance.effective];
    }
    await expect(compileCanonicalEstimateCore(input)).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });
});
