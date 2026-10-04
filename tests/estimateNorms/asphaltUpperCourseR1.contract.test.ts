import {
  ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT,
  ASPHALT_UPPER_COURSE_CATALOG_ID,
  ASPHALT_UPPER_COURSE_FORMULAS,
  ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_UPPER_COURSE_PARAMETERS,
  ASPHALT_UPPER_COURSE_RESOURCES,
  ASPHALT_UPPER_COURSE_SHORT_INPUT,
  compileAsphaltUpperCourseR1,
} from "../../src/lib/estimate/v4/asphaltUpperCourseR1";
import { validateIndependentCompletenessMapReferences } from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { ASPHALT_INSTALL_KRER27_RUNTIME_INPUT } from "../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

type Compiled = Awaited<ReturnType<typeof compileAsphaltUpperCourseR1>>;
const purchaseProvenance = { kind: "manual", reason: "VALIDATION_FIXTURE accepted bulk order; not a project approval or packaging norm" };
const mixOwner = "asphalt:material:hot-dense-fine-mix";
function compileAcceptedOrder(rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}) {
  return compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "asphalt-order-contract",
    catalogId: ASPHALT_UPPER_COURSE_CATALOG_ID, primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_UPPER_COURSE_PARAMETERS], formulaDefinitions: [...ASPHALT_UPPER_COURSE_FORMULAS],
    resourceDefinitions: [...ASPHALT_UPPER_COURSE_RESOURCES], submittedParameters: { area_m2: 5000, layer_thickness_mm: 50 },
    confirmedParameters: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT, currencyCode: "KGS", priceItems: [], rowOverrides,
    maximumResourceRows: ASPHALT_UPPER_COURSE_RESOURCES.length, hashJson: async value => estimateDeterministicHash(value) });
}

function row(result: Compiled, rowId: string) {
  const found = result.rows.find((candidate) => candidate.row_id === rowId);
  if (!found) throw new Error(`compiled row missing: ${rowId}`);
  return found;
}

describe("MASTER asphalt upper-course automatic operation", () => {
  test.each([["650.125", "33", "13002.5", "49.5", "46.125", "0"], ["600", "30", "12000", "45", "0", "4"]])(
    "reconciles actual bulk order %s with delivery and temperature checks while preserving installation", async (quantity, trips, tonKm, hours, excess, shortage) => {
      const baseline = await compileAcceptedOrder();
      const result = await compileAcceptedOrder({ [mixOwner]: { quantity, includedInProcurement: true, provenance: purchaseProvenance } });
      expect(result.preliminaryNeeds).toEqual([]);
      expect(row(result, mixOwner)).toMatchObject({ quantity, included_in_procurement: shortage === "0",
        calculation_trace: { effectiveQuantityOutput: { basis: "manual_override", acceptedQuantity: quantity },
          purchaseBalance: { quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption", quantum: null,
            consumed: "604", excessOrderAboveRequiredConsumption: excess, consumptionShortage: shortage, procurementReady: shortage === "0" } } });
      expect(row(result, "asphalt:delivery:truck-trips")).toMatchObject({ quantity: trips, included_in_estimate: false });
      expect(row(result, "asphalt:delivery:ton-km")).toMatchObject({ quantity: tonKm, included_in_estimate: false });
      expect(row(result, "asphalt:delivery:truck-machine-hours").quantity).toBe(hours);
      expect(row(result, "asphalt:quality:mix-temperature")).toMatchObject({ quantity: trips, included_in_estimate: true });
      for (const id of ["asphalt:control:geometric-compacted-volume", "asphalt:operation:mix-receiving-feed",
        "asphalt:labor:road-workers", "asphalt:equipment:asphalt-paver", "asphalt:equipment:smooth-roller-8t"])
        expect(row(result, id).quantity).toBe(row(baseline, id).quantity);
      expect(row(result, "asphalt:operation:mix-receiving-feed").quantity).toBe("604");
      expect(result.rows.filter(value => value.row_id === "asphalt:quality:mix-temperature")).toHaveLength(1);
      expect((await compileAcceptedOrder()).revisionProjection).toEqual(baseline.revisionProjection);
    });
  test("preserves a decimal order and shortage in writer JSON/reopen and rejects procurement after row selection", async () => {
    const result = await compileAcceptedOrder({ [mixOwner]: { quantity: "600.125", includedInProcurement: true, provenance: purchaseProvenance } });
    const stored = JSON.parse(JSON.stringify(result.rows)) as typeof result.rows;
    stored.forEach(value => { delete value.procurement_readiness; });
    const reopened = stored.map(value => canonicalEstimateRevisionRowFromStorage(value, null));
    expect(reopened.find(value => value.rowId === mixOwner)).toMatchObject({ quantity: "600.125", includedInProcurement: false,
      calculationTrace: { manualAmendment: purchaseProvenance, purchaseBalance: { quantum: null, quantityMode: "canonical_decimal", consumptionShortage: "3.875" } } });
    expect(() => assertCanonicalPurchaseReadinessV1(reopened)).toThrow("Закупка не готова");
    const selection = selectCanonicalArtifactRows(stored);
    expect(selection.procurementRows.some(value => value.row_id === mixOwner)).toBe(false);
    expect(() => buildCanonicalProcurementProjection({ revision: { id: "bulk-shortage", release_id: "test", catalog_id: ASPHALT_UPPER_COURSE_CATALOG_ID,
      checksum_sha256: "test", row_count: stored.length }, sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("Закупка не готова");
  });
  test("enforces exact current haul minima without rounding bulk quantity into whole tonnes", async () => {
    const mix = { quantity: "650.125", provenance: purchaseProvenance };
    for (const [id, quantity] of [["truck-machine-hours", "49.499999999"], ["truck-machine-hours", "49.4999999999"],
      ["truck-trips", "32"], ["truck-trips", "33.5"], ["ton-km", "13002.499999999"]])
      await expect(compileAcceptedOrder({ [mixOwner]: mix, [`asphalt:delivery:${id}`]: { quantity, provenance: purchaseProvenance } })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    for (const quantity of ["49.5", "50.25"]) {
      const accepted = await compileAcceptedOrder({ [mixOwner]: mix, "asphalt:delivery:truck-machine-hours": { quantity, provenance: purchaseProvenance } });
      expect(row(accepted, "asphalt:delivery:truck-machine-hours")).toMatchObject({ quantity,
        calculation_trace: { transportQuantity: { minimumQuantity: "49.5", differsFromCalculated: quantity !== "49.5" } } });
    }
    const smaller = await compileAcceptedOrder({ [mixOwner]: { quantity: "600", provenance: purchaseProvenance },
      "asphalt:delivery:truck-machine-hours": { quantity: "45", provenance: purchaseProvenance } });
    expect(row(smaller, "asphalt:delivery:truck-machine-hours").quantity).toBe("45");
  });
  test("keeps only area and thickness as ordinary user geometry", () => {
    expect(ASPHALT_UPPER_COURSE_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard");
    expect(ASPHALT_UPPER_COURSE_PARAMETERS).toHaveLength(31);
    expect(ASPHALT_UPPER_COURSE_FORMULAS).toHaveLength(23);
    expect(ASPHALT_UPPER_COURSE_RESOURCES).toHaveLength(57);
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_UPPER_COURSE_FORMULAS,
      resourceDefinitions: ASPHALT_UPPER_COURSE_RESOURCES,
    })).toEqual([]);

    const userParameters = ASPHALT_UPPER_COURSE_PARAMETERS.filter((parameter) =>
      parameter.truth_metadata?.visibility_role === "USER_INPUT");
    expect(userParameters.map((parameter) => parameter.parameter_id))
      .toEqual(["area_m2", "layer_thickness_mm"]);
    expect(ASPHALT_UPPER_COURSE_PARAMETERS.find((parameter) =>
      parameter.parameter_id === "asphalt_mix_base_t_per_1000m2")?.truth_metadata)
      .toMatchObject({ preliminary_compilation_allowed: true });
  });

  test("calculates 900 m2 x 50 mm without asking for mass or machine-hours", async () => {
    const result = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows).toHaveLength(ASPHALT_UPPER_COURSE_RESOURCES.length);
    expect(row(result, "asphalt:control:geometric-compacted-volume")).toMatchObject({
      quantity: "45", unit_id: "m3",
    });
    expect(row(result, "asphalt:material:hot-dense-fine-mix")).toMatchObject({
      quantity: "108.72", unit_id: "t", included_in_procurement: true,
      title_ru: "Горячая асфальтобетонная смесь, тип и марка по проекту",
    });
    expect(row(result, "asphalt:labor:road-workers")).toMatchObject({
      quantity: "34.632", unit_id: "man_hour",
    });
    expect(row(result, "asphalt:equipment:smooth-roller-8t")).toMatchObject({
      quantity: "3.564", unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:equipment:asphalt-paver")).toMatchObject({
      quantity: "2.871", unit_id: "machine_hour",
    });
    expect(row(result, "asphalt:delivery:truck-trips")).toMatchObject({
      quantity: "6", unit_id: "trip",
    });
    expect(row(result, "asphalt:delivery:ton-km")).toMatchObject({
      quantity: "2174.4", unit_id: "t_km",
    });
    expect(row(result, "asphalt:delivery:truck-machine-hours")).toMatchObject({
      quantity: "9", unit_id: "machine_hour",
    });
  });

  test("acceptance input and ordinary input produce the same complete operation", async () => {
    const ordinary = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_SHORT_INPUT });
    const accepted = await compileAsphaltUpperCourseR1({ ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT });
    expect(accepted.preliminaryNeeds).toEqual([]);
    expect(accepted.rows).toEqual(ordinary.rows);
  });

  test("recalculates the profile after a supported thickness edit", async () => {
    const result = await compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
      layer_thickness_mm: 55,
    });
    expect(row(result, "asphalt:control:geometric-compacted-volume").quantity).toBe("49.5");
    expect(row(result, "asphalt:material:hot-dense-fine-mix").quantity).toBe("119.61");
    expect(row(result, "asphalt:labor:road-workers").quantity).toBe("34.713");
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileAsphaltUpperCourseR1({
      ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
      layer_thickness_mm: 52,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltUpperCourseR1(
      { ...ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT },
      { catalogId: `${ASPHALT_UPPER_COURSE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ASPHALT_UPPER_COURSE_CATALOG_UNSUPPORTED");
  });
});
