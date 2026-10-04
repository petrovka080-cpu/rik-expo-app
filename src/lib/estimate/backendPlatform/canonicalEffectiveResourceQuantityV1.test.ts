import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "./canonicalEstimateCompileCore";
import { buildAutomaticConstructionOwnerR1, type AutomaticRowSpec } from "../v4/automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "../v4/effectivePurchaseBalanceR1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { canonicalEstimateRevisionRowFromStorage } from "./canonicalEstimateRevisionReadMapper";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "./canonicalEstimateArtifactContract";
import { assertCanonicalPurchaseReadinessV1, canonicalPurchaseShortageMessageV1,
  validateCanonicalManualTransportQuantityV1, resolveCanonicalPurchaseBalanceV1 } from "./canonicalPurchaseBalanceV1";

const provenance = { kind: "manual", reason: "synthetic MASTER arithmetic control; not a construction norm" };
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
