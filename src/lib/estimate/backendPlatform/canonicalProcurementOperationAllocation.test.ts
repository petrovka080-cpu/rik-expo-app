import {
  assertCanonicalProcurementJobRendererVersion,
  buildCanonicalProcurementProjection,
  canonicalArtifactFileIdentity,
  canonicalProcurementRequestKey,
  CANONICAL_PROCUREMENT_GENERATOR_VERSION,
  selectCanonicalArtifactRows,
} from "./canonicalEstimateArtifactContract";

const operation = (groupId: string, operationId: string) => ({
  contractVersion: "canonical-operation-resource/v1",
  groupId, operationId, groupTitleRu: "Бетонирование", operationTitleRu: operationId,
  completionCriterionRu: "Выполнена принятая проектная операция",
});
const row = (id: string, ref: unknown, included = true) => ({
  row_id: id, ordinal: 1, section: "materials", category: "material", title_ru: "Вода",
  unit_id: "m3", quantity: "3.200", unit_price: "10.00", amount: "32.00",
  included_in_estimate: included, included_in_procurement: included, procurement_eligible: included,
  ownership_status: "OWNED", row_sha256: id,
  calculation_trace: { resourceGraph: { operationCompositionV1: ref }, manualAmendment: { quantity: "3.200" } },
});
const revision = { id: "owned", release_id: "prepared", catalog_id: "pour", checksum_sha256: "checksum", row_count: 5 };

describe("procurement operation allocation and renderer recovery", () => {
  it("exports the saved physical need and manual purchase balance without another rounding", () => {
    const water = { ...row("water", operation("concrete", "curing")), quantity: "5.100000000", calculation_trace: {
      purchaseBalance: { ownerRowId: "water", unitId: "m3", consumed: "3.2", stock: "0", reserve: "0", quantum: null,
        plannedConsumption: "3.2", effectiveOrder: "5.1", remaining: "1.9", freeBeyondReserve: "1.9", consumptionShortage: "0",
        reserveDeficit: "0", procurementReady: true, requirementBasis: "selected_supply_order" },
    } };
    const before = JSON.stringify(water);
    const result = buildCanonicalProcurementProjection({ revision, procurementRows: [water] });
    expect(result.rows[0]).toMatchObject({ netQuantity: "3.2", grossQuantity: "3.2", quantity: "5.1", procurementQuantity: "5.1",
      materialQuantityBasis: { stock: "0", reserve: "0", remaining: "1.9", lossQuantity: null, procurementPackageSize: null } });
    expect(JSON.stringify(water)).toBe(before);
    expect(() => buildCanonicalProcurementProjection({ revision, procurementRows: [{ ...water, row_id: "other-owner" }] }))
      .toThrow(expect.objectContaining({ code: "ARTIFACT_PURCHASE_BALANCE_INVALID" }));
    for (const invalid of [{ plannedConsumption: "-1" }, { plannedConsumption: "3.1234567891" },
      { plannedConsumption: 3.2 }, { quantum: "box" }, { quantum: "-1" }, { quantum: "0" }]) {
      const badWater = { ...water, calculation_trace: { purchaseBalance: { ...water.calculation_trace.purchaseBalance, ...invalid } } };
      expect(() => buildCanonicalProcurementProjection({ revision, procurementRows: [badWater] }))
        .toThrow(expect.objectContaining({ code: "ARTIFACT_PURCHASE_BALANCE_INVALID" }));
    }
  });

  it("shows physical rental items and days using the saved explicit schedule bindings", () => {
    const rental = { ...row("sheets", operation("slab", "formwork")), category: "equipment", unit_id: "piece_day", quantity: "1624",
      calculation_trace: { resourceGraph: { supplyMode: "RENTAL_RETURNABLE", returnable: true, rentalDurationParameterId: "days",
        sourceScheduleParameterIds: ["sheets", "days", "stage"], projectStageCountParameterId: "stage" } } };
    const result = buildCanonicalProcurementProjection({ revision: { ...revision, input_parameters: { sheets: 58, days: 28, stage: 1 } }, procurementRows: [rental] });
    expect(result.rows[0]).toMatchObject({ quantity: "1624", rentalBasis: { physicalQuantity: "58", durationDays: "28", billingQuantity: "1624", billingUnit: "piece_day", stageCount: 1 } });
    expect(() => buildCanonicalProcurementProjection({ revision, procurementRows: [rental] }))
      .toThrow(expect.objectContaining({ code: "ARTIFACT_RENTAL_BASIS_INVALID" }));
  });

  it("uses total cage assembly mass for the document heading while retaining the original primary input", () => {
    const cage = { ...row("work:rebar-cage:assemble-install", operation("cage", "reinforcement")), unit_id: "kg", quantity: "1500",
      calculation_trace: { formulaId: "rebar_cage_assembly_weight_v1", resourceGraph: { operationCompositionV1: {
        ...operation("cage", "reinforcement"), groupTitleRu: "Арматурный каркас" } } } };
    const result = buildCanonicalProcurementProjection({ revision: { ...revision, primary_measure_parameter_id: "rebar_d12_mass_kg",
      primary_measure_value: "640", primary_measure_unit_id: "kg", display_title_ru: "Арматурный каркас — 640 кг" },
      procurementRows: [], sourceRows: [cage] });
    expect(result.displayTitleRu).toBe("Арматурный каркас — 1 500 кг");
    expect(result.primaryMeasure).toMatchObject({ value: "1500", unitId: "kg", sourceRowId: cage.row_id });
    expect(result.sourcePrimaryMeasure).toMatchObject({ value: "640", parameterId: "rebar_d12_mass_kg" });
  });

  it("discloses counted kit components and removes an exact repeated specification title", () => {
    const kit = { ...row("kit", operation("embedded", "coating")), title_ru: "Щётка Щётка; скребок 1 шт.; салфетки 10 шт.",
      calculation_trace: { resourceGraph: { titleSpecificationMode: "APPEND", titleSpecificationSeparator: " ", titleSpecificationParameterIds: ["kit_spec"] } } };
    const result = buildCanonicalProcurementProjection({ revision: { ...revision, input_parameters: { kit_spec: "Щётка; скребок 1 шт.; салфетки 10 шт." } }, procurementRows: [kit] });
    expect(result.rows[0]?.titleRu).toBe("Щётка");
    expect(result.rows[0]?.specifications[0]?.parts).toEqual(["Щётка", "скребок 1 шт.", "салфетки 10 шт."]);
  });

  it.each([
    { winter_mode: true, curing_method: "water" },
    { placement_winter_mode: true, placement_curing_method: "water" },
  ])("keeps procurement open when winter/water compatibility lacks project conditions", parameters => {
    expect(() => buildCanonicalProcurementProjection({ revision: { ...revision, input_parameters: parameters }, procurementRows: [] }))
      .toThrow(expect.objectContaining({ code: "PROCUREMENT_TECHNOLOGY_COMPATIBILITY_REQUIRED" }));
    expect(() => buildCanonicalProcurementProjection({ revision: { ...revision, input_parameters: { ...parameters, winter_mode: false, placement_winter_mode: false } }, procurementRows: [] })).not.toThrow();
  });
  it("preserves exact quantities, prices, manual changes and row identity for each operation", () => {
    const refs = [operation("concrete", "supply"), operation("concrete", "curing")];
    const sourceRows = [row("water-supply", refs[0]), row("water-curing", refs[1]), row("kit-included", refs[1], false)];
    const before = JSON.stringify(sourceRows);
    const selected = selectCanonicalArtifactRows(sourceRows);
    const result = buildCanonicalProcurementProjection({ revision, ...selected });
    expect(result.rows.map(r => [r.rowId, r.quantity, r.unitId, r.amount, r.rowSha256, r.manualAmendment]))
      .toEqual(sourceRows.slice(0, 2).map(r => [r.row_id, r.quantity, r.unit_id, r.amount, r.row_sha256, r.calculation_trace.manualAmendment]));
    expect(result.operationGroups).toEqual([
      { operation: refs[0], rowIds: ["water-supply"] }, { operation: refs[1], rowIds: ["water-curing"] },
    ]);
    expect(result.groups).toEqual([{ section: "materials", category: "material", rowIds: ["water-supply", "water-curing"] }]);
    expect(result.selectedRowCount).toBe(2);
    expect(JSON.stringify(sourceRows)).toBe(before);
  });

  it("uses unambiguous group and operation pairs without merging different operations", () => {
    const sourceRows = [row("a", operation("a\u0000b", "c")), row("b", operation("a", "b\u0000c")), row("c", operation("a", "b\u0000c"))];
    const result = buildCanonicalProcurementProjection({ revision, procurementRows: sourceRows });
    expect(result.operationGroups.map(g => g.rowIds)).toEqual([["a"], ["b", "c"]]);
  });

  it("keeps legacy and invalid references readable without fabricating an operation", () => {
    const result = buildCanonicalProcurementProjection({ revision, procurementRows: [row("legacy", undefined), row("invalid", { ...operation("g", "o"), completionCriterionRu: "" })] });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every(r => !Object.hasOwn(r, "operation"))).toBe(true);
    expect(result.operationGroups).toEqual([]);
  });

  it("binds renderer-marked jobs and rejects malformed or stale payloads", () => {
    expect(() => assertCanonicalProcurementJobRendererVersion({})).not.toThrow();
    expect(() => assertCanonicalProcurementJobRendererVersion({ rendererVersion: CANONICAL_PROCUREMENT_GENERATOR_VERSION })).not.toThrow();
    for (const value of [null, [], "payload", { rendererVersion: null }, { rendererVersion: "canonical-procurement.r2" }]) {
      expect(() => assertCanonicalProcurementJobRendererVersion(value)).toThrow();
    }
  });

  it("isolates legacy caller keys by renderer and keeps maximum length input distinct", () => {
    const legacyKey = "consumer-procurement-owned";
    const key = canonicalProcurementRequestKey(legacyKey);
    expect(key).not.toBe(legacyKey);
    expect(canonicalProcurementRequestKey(` ${legacyKey} `)).toBe(key);
    expect(canonicalProcurementRequestKey("x".repeat(200))).not.toBe(canonicalProcurementRequestKey("x".repeat(199) + "y"));
    expect(canonicalProcurementRequestKey("x".repeat(200)).length).toBeLessThanOrEqual(200);
  });

  it("keeps earlier procurement and professional PDF bytes addressable on renderer change", () => {
    for (const kind of ["procurement", "professional_pdf"]) {
      expect(canonicalArtifactFileIdentity(kind, "revision", "old-bytes"))
        .not.toBe(canonicalArtifactFileIdentity(kind, "revision", "new-bytes"));
    }
    expect(canonicalArtifactFileIdentity("pdf", "revision", "new-bytes")).toBe("revision");
  });
});
