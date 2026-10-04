import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import { aiEstimateRuUnitForParameter } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import {
  STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS,
  STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  STRIP_POUR_PROFILE_ACCEPTANCE_INPUT,
  STRIP_POUR_PROFILE_PARAMETERS,
  STRIP_POUR_PROFILE_FORMULAS,
  STRIP_POUR_PROFILE_CATALOG_ID,
  STRIP_POUR_PROFILE_RUNTIME_INPUT,
  STRIP_POUR_PROFILE_RESOURCES,
  STRIP_POUR_PROFILE_SHORT_INPUT,
  STRIP_POUR_SOURCE_PACK_SHA256,
  compileStripFoundationConcretePlacementPreliminaryProfileR1,
  stripPourMissingRequiredRows,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { canonicalEstimateRevisionRowFromStorage } from "../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper";
import { assertCanonicalPurchaseReadinessV1 } from "../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { buildCanonicalProcurementProjection, selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";

const ownerId = "strip-pour:material:ready-mix";
const manual = { kind: "manual", reason: "VALIDATION_FIXTURE selected concrete order; no engineering approval" };
const acceptedCompile = (rowOverrides: CanonicalEstimateCompileCoreInput["rowOverrides"] = {}, submitted = {}) =>
  compileCanonicalEstimateCore({ operation: "recalculate", compilerVersion: "concrete-order-contract", catalogId: STRIP_POUR_PROFILE_CATALOG_ID,
    primaryMeasureParameterId: "plan_dimension_concrete_volume_m3", parameterDefinitions: [...STRIP_POUR_PROFILE_PARAMETERS],
    formulaDefinitions: [...STRIP_POUR_PROFILE_FORMULAS], resourceDefinitions: [...STRIP_POUR_PROFILE_RESOURCES],
    submittedParameters: { ...STRIP_POUR_PROFILE_SHORT_INPUT, ...submitted }, confirmedParameters: STRIP_POUR_PROFILE_RUNTIME_INPUT,
    rowOverrides, priceItems: [], currencyCode: "KGS", maximumResourceRows: STRIP_POUR_PROFILE_RESOURCES.length,
    hashJson: async value => estimateDeterministicHash(value) });

const historicalLargeAreaInput = Object.freeze({
  placement_method: "pump",
  placement_location: "Ленточный фундамент; большой участок; захватка SF-POUR-LARGE-AREA",
  product_profile_id: "method-profile:nrmca-cip31:ready-mix-order:v1",
  mixture_designation: "B25 W6 F150 P4",
  producer_order_confirmation: "RMC-SF-POUR-LARGE-AREA-CONFIRMED",
  estimator_approval_reference: "EST-SF-POUR-LARGE-AREA-REV-A",
  selected_contingency_percent: 8,
  plan_dimension_concrete_volume_m3: 240,
  plan_volume_calculation_reference: "SF-POUR-LARGE-AREA-VOLUME-REV-A",
  contingency_selection_justification: "Резерв подтверждён сметчиком для захватки SF-POUR-LARGE-AREA",
  delivery_schedule_and_truck_capacity: "График SF-POUR-LARGE-AREA; автобетоносмесители 8 м³",
  mix_design_or_project_specification_reference: "SF-POUR-LARGE-AREA-MIX-B25-REV-A",
});

describe("S26.4 separate strip-foundation concrete placement preliminary profile", () => {
  it.each([["280.125", "36", "20.925", "0"], ["250", "32", "0", "9.2"]])(
    "reconciles accepted order %s against selected contingency without changing installation or laboratory lots", async (quantity, trips, excess, deficit) => {
      const base = await acceptedCompile();
      const result = await acceptedCompile({ [ownerId]: { quantity, includedInProcurement: true, provenance: manual } });
      const row = (id: string) => result.rows.find(value => value.row_id === id)!;
      expect(result.preliminaryNeeds).toEqual([]);
      expect(row(ownerId)).toMatchObject({ quantity, included_in_procurement: deficit === "0", calculation_trace: {
        purchaseBalance: { quantityMode: "canonical_decimal", quantum: null, requirementBasis: "selected_order_including_contingency",
          plannedConsumption: "240", requiredSelectedOrder: "259.2", effectiveOrder: quantity,
          consumptionShortage: deficit, excessOrderAboveRequiredConsumption: excess, procurementReady: deficit === "0" } } });
      for (const id of ["strip-pour:delivery:mixer-trips", "strip-pour:quality:delivery-acceptance", "strip-pour:document:delivery-tickets"])
        expect(row(id).quantity).toBe(trips);
      for (const id of ["strip-pour:work:place", "strip-pour:equipment:pump", "strip-pour:equipment:vibrator",
        "strip-pour:material:curing-sheet", "strip-pour:quality:slump", "strip-pour:quality:temperature", "strip-pour:quality:specimens"])
        expect(row(id).quantity).toBe(base.rows.find(value => value.row_id === id)!.quantity);
      const stored = JSON.parse(JSON.stringify(result.rows)) as typeof result.rows;
      stored.forEach(value => { delete value.procurement_readiness; });
      const reopened = stored.map(value => canonicalEstimateRevisionRowFromStorage(value, null));
      expect(reopened.find(value => value.rowId === ownerId)).toMatchObject({ quantity,
        calculationTrace: { manualAmendment: manual, purchaseBalance: { requiredSelectedOrder: "259.2", plannedConsumption: "240" } } });
      if (deficit !== "0") {
        expect(() => assertCanonicalPurchaseReadinessV1(reopened)).toThrow("заказ с выбранным резервом не покрыт на 9.2");
        const selection = selectCanonicalArtifactRows(stored);
        expect(() => buildCanonicalProcurementProjection({ revision: { id: "concrete-shortage", release_id: "test", catalog_id: STRIP_POUR_PROFILE_CATALOG_ID,
          checksum_sha256: "test", row_count: stored.length }, sourceRows: selection.sourceRows, procurementRows: selection.procurementRows })).toThrow("Закупка не готова");
      }
      expect((await acceptedCompile()).rows).toEqual(base.rows);
    });
  it("keeps included delivery absent despite manual inclusion while retaining physical acceptance and tickets", async () => {
    const override = { quantity: "99", unitPrice: "10", includedInEstimate: true, includedInProcurement: true, provenance: manual };
    const result = await acceptedCompile({ [ownerId]: { quantity: "280.125", provenance: manual },
      "strip-pour:delivery:mixer-trips": override }, { delivery_pricing_mode: "INCLUDED_IN_SUPPLY" });
    expect(result.rows.some(value => value.row_id === "strip-pour:delivery:mixer-trips")).toBe(false);
    for (const id of ["strip-pour:quality:delivery-acceptance", "strip-pour:document:delivery-tickets"])
      expect(result.rows.find(value => value.row_id === id)).toMatchObject({ quantity: "36", included_in_estimate: false });
    const separate = await acceptedCompile({ "strip-pour:delivery:mixer-trips": override });
    expect(separate.rows.find(value => value.row_id === "strip-pour:delivery:mixer-trips")).toMatchObject({ quantity: "99", included_in_estimate: true });
  });
  it("enforces minimum whole current mixer loads and changes selected contingency independently", async () => {
    for (const quantity of ["35", "36.5"]) await expect(acceptedCompile({ [ownerId]: { quantity: "280.125", provenance: manual },
      "strip-pour:delivery:mixer-trips": { quantity, provenance: manual } })).rejects.toMatchObject({ code: "ROW_AMENDMENT_INVALID" });
    const result = await acceptedCompile({ [ownerId]: { quantity: "250", provenance: manual } }, { selected_contingency_percent: 4 });
    expect(result.rows.find(value => value.row_id === ownerId)).toMatchObject({ included_in_procurement: true,
      calculation_trace: { purchaseBalance: { plannedConsumption: "240", requiredSelectedOrder: "249.6", excessOrderAboveRequiredConsumption: "0.4" } } });
  });
  it("shows the profile units as compact Russian labels beside editable values", () => {
    const expected = new Map([
      ["m3_per_hour", "м³/ч"],
      ["m2_per_m3", "м²/м³"],
      ["machine_hour_per_m3", "маш.-ч/м³"],
      ["ratio", "коэф."],
    ]);
    for (const [unit, label] of expected) {
      expect(aiEstimateRuUnitForParameter("test_parameter", unit)).toBe(label);
      expect(formatEstimateUnitLabel(unit)).toBe(label);
    }
  });

  it("builds the complete first estimate from volume and a visible selected profile", async () => {
    const compiled = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
      ...STRIP_POUR_PROFILE_SHORT_INPUT,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));

    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS.length);
    expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(stripPourMissingRequiredRows(new Set(rows.keys()))).toEqual([]);
    expect(rows.get("strip-pour:material:ready-mix")?.quantity).toBe("259.2");
    expect(rows.get("strip-pour:work:place")?.quantity).toBe("240");
    expect(Number(rows.get("strip-pour:material:curing-sheet")?.quantity)).toBeCloseTo(314.6, 6);
    expect(rows.get("strip-pour:equipment:pump")?.quantity).toBe("7.5");
    expect(rows.get("strip-pour:equipment:vibrator")?.quantity).toBe("63.84");
    expect(rows.get("strip-pour:delivery:mixer-trips")?.quantity).toBe("33");
    expect(rows.get("strip-pour:quality:slump")?.quantity).toBe("5");
  });

  it("recalculates the actual historical 240 m3 draft without blocked system quantities", async () => {
    const compiled = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
      ...historicalLargeAreaInput,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(compiled.parameters.pump_rated_output_m3_h).toBe(160);
    expect(compiled.parameters.vibrator_machine_h_per_m3).toBe(0.266);
    expect(compiled.parameters.qa_lot_volume_m3).toBe(50);
  });

  it("keeps every preliminary value editable and changes dependent quantities in one recalculation", async () => {
    const changed = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
      ...STRIP_POUR_PROFILE_SHORT_INPUT,
      selected_contingency_percent: 10,
      pump_site_utilization_factor: 0.25,
      mixer_capacity_m3: 9,
      qa_lot_volume_m3: 40,
    });
    const quantity = (rowId: string) => changed.rows.find((row) => row.row_id === rowId)?.quantity;
    expect(quantity("strip-pour:material:ready-mix")).toBe("264");
    expect(quantity("strip-pour:equipment:pump")).toBe("6");
    expect(quantity("strip-pour:delivery:mixer-trips")).toBe("30");
    expect(quantity("strip-pour:quality:slump")).toBe("6");
  });

  it("adds only the explicitly selected construction-joint branch", async () => {
    const compiled = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
      ...STRIP_POUR_PROFILE_SHORT_INPUT,
      construction_joint_mode: "WATERSTOP",
      construction_joint_waterstop_specification: "Гидрошпонка ПВХ по узлу КЖ-17",
      construction_joint_waterstop_length_m: 18,
    });
    const rowIds = new Set(compiled.rows.map((row) => row.row_id));
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(stripPourMissingRequiredRows(rowIds, { constructionJointMode: "WATERSTOP" })).toEqual([]);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "strip-pour:joint:waterstop", quantity: "18" }),
      expect.objectContaining({ row_id: "strip-pour:joint:install-waterstop", quantity: "18" }),
    ]));
  });

  it("fails completeness for every independently required component removed from a copy", () => {
    const complete = new Set(STRIP_POUR_PROFILE_RESOURCES.map((resource) => resource.row_id));
    expect(stripPourMissingRequiredRows(complete)).toEqual([]);
    for (const requiredRowId of STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS) {
      const mutated = new Set(complete);
      mutated.delete(requiredRowId);
      expect(stripPourMissingRequiredRows(mutated)).toContain(requiredRowId);
    }
  });

  it("keeps the source pack independent, immutable by hash and free of adjacent foundation scope", async () => {
    const sourcePackPath = resolve(
      "data/estimate-benchmarks/source-packs/strip-foundation-concrete-placement-preliminary-profile-r1.json",
    );
    const sourcePackHash = createHash("sha256").update(readFileSync(sourcePackPath)).digest("hex");
    expect(sourcePackHash).toBe(STRIP_POUR_SOURCE_PACK_SHA256);
    expect(STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP.generatedFromCurrentRows).toBe(false);
    const compiled = await compileStripFoundationConcretePlacementPreliminaryProfileR1({
      ...STRIP_POUR_PROFILE_ACCEPTANCE_INPUT,
    });
    const serialized = compiled.rows.map((row) => `${row.row_id}:${row.title_ru}`).join("|");
    expect(serialized).not.toMatch(/excavation|reinforc(?:ement|ing)|formwork/iu);
  });

  it("publishes compact inline guide metadata for norms and visible assumptions", () => {
    const byId = new Map(STRIP_POUR_PROFILE_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]));
    expect(byId.get("pump_rated_output_m3_h")?.truth_metadata).toMatchObject({
      visibility_role: "USER_INPUT",
      runtime_profile_classification: "NORMATIVE",
    });
    expect(byId.get("pump_site_utilization_factor")?.truth_metadata).toMatchObject({
      visibility_role: "USER_INPUT",
      runtime_profile_classification: "ASSUMPTION",
    });
    expect(byId.get("qa_lot_volume_m3")?.truth_metadata).toMatchObject({
      visibility_role: "USER_INPUT",
      runtime_profile_classification: "ASSUMPTION",
    });
  });
});
