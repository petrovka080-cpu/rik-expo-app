import { measuredConcreteProjectInputR533 } from "./fixtures/concreteMeasuredProjectInputsR533";
import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
} from "../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";
import {
  STRIP_FOUNDATION_INPUTS,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";
import {
  STRIP_FOUNDATION_INDEPENDENT_SCOPE_EXPECTATIONS_R1,
  auditStripFoundationScopeCompletenessR1,
} from "../../src/lib/estimate/v4/stripFoundationScopeCompletenessR1";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  compileStripFoundationConcretePlacementR1,
  stripFoundationConcretePlacementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";
import {
  STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2,
  compileStripFoundationProfessionalGoldR2,
} from "../../src/lib/estimate/v4/stripFoundationProfessionalCompositionR2";
import {
  compileStripFoundationAutomaticS2723,
} from "../../src/lib/estimate/v4/stripFoundationAutomaticInputS2723";

/**
 * A concrete S27.15 acceptance project, not a production default or a universal norm.
 * Every quantity outside geometric formulas is an explicit project-schedule fixture.
 */
const FULL_FOUNDATION_150M_ACCEPTANCE_INPUT = Object.freeze({
  ...STRIP_FOUNDATION_PROFESSIONAL_GOLD_INPUT_R2,
  total_axis_length_m: 150,
  strip_width_m: 0.8,
  strip_height_m: 2,
  concrete_order_allowance_percent: 8,
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  plan_volume_calculation_reference: "S27.15-ACCEPTANCE-КЖ: 150 м × 0,8 м × 2,0 м",
  mix_design_or_project_specification_reference: "S27.15-ACCEPTANCE-СПЕЦ-БЕТОН-01",
  mixture_designation: "B25 W6 F150 P4 — приёмочная проектная фикстура",
  placement_location: "S27.15-ACCEPTANCE: лента по осям 1–12",
  contingency_selection_justification:
    "8% выбраны только для этой приёмочной фикстуры по согласованной схеме заказа; это не универсальная норма",
  delivery_schedule_and_truck_capacity: "S27.15-ACCEPTANCE: график поставки и вместимость миксеров подтверждены",
  producer_order_confirmation: "S27.15-ACCEPTANCE-РБУ-01",
  estimator_approval_reference: "S27.15-ACCEPTANCE-СМЕТЧИК-01",
  preparation_thickness_m: 0.1,
  reinforcement_mass_t: 28.8,
  binding_wire_mass_kg: 345.6,
  formwork_transport_mass_t: 45,
  pump_productivity_m3_h: 45,
  concrete_delivery_distance_km: 25,
  reinforcement_delivery_distance_km: 30,
  formwork_delivery_distance_km: 18,
  excavation_volume_m3: 540,
  excavator_productivity_m3_h: 30,
  foundation_bedding_volume_m3: 36,
  compactor_productivity_m3_h: 12,
  bedding_delivery_distance_km: 20,
  waterproofing_area_m2: 600,
  backfill_volume_m3: 210,
  soil_disposal_distance_km: 15,
  mechanical_coupler_quantity_piece: 144,
  lifting_machine_h: 24,
  construction_joint_waterstop_length_m: 60,
  construction_joint_installation_worker_h: 24,
  formwork_return_distance_km: 18,
  horizontal_cutoff_waterproofing_area_m2: 120,
  formwork_tie_consumables_quantity_piece: 600,
  excavation_support_area_m2: 900,
  excavation_dewatering_machine_h: 40,
  site_cleanup_worker_h: 36,
  non_soil_waste_mass_t: 3.5,
  non_soil_waste_haul_distance_km: 15,
  non_soil_waste_packaging_quantity_piece: 70,
});

describe("S27.15 full strip-foundation composition", () => {
  it("builds the first complete 150 m estimate without asking for final masses or machine-hours", () => {
    const result = compileStripFoundationAutomaticS2723({ total_axis_length_m: 150 });
    const quantities = new Map(result.rows.map((row) => [row.rowId, row.evaluatedQuantity]));
    const names = new Map(result.rows.map((row) => [row.rowId, row.canonicalRuName]));

    expect(result.derived).toMatchObject({
      concreteNetM3: 240,
      reinforcementMassT: 28.8,
      bindingWireMassKg: 345.6,
      formworkTransportMassT: 45,
      excavationVolumeM3: 540,
      beddingVolumeM3: 36,
      waterproofingAreaM2: 600,
      backfillVolumeM3: 210,
    });
    expect(quantities.get("concrete_placement")).toBe("240");
    expect(quantities.get("main_concrete")).toBe("259.2");
    expect(quantities.get("reinforcement")).toBe("28.8");
    expect(quantities.get("binding_wire")).toBe("345.6");
    expect(quantities.get("excavator")).toBe("18");
    expect(names.get("reinforcement")).toContain("Предварительный бюджет арматуры");
    expect(result.rows.some((row) => row.rowId === "mechanical_couplers")).toBe(false);
    expect(result.rows.some((row) => row.rowId === "construction_joint_waterstop")).toBe(false);
  });

  it("recalculates the automatic preliminary quantities when the strip length changes", () => {
    const oneHundredFifty = compileStripFoundationAutomaticS2723({
      total_axis_length_m: 150,
    });
    const threeHundred = compileStripFoundationAutomaticS2723({
      total_axis_length_m: 300,
    });
    const quantities = (rows: typeof oneHundredFifty.rows) =>
      new Map(rows.map((row) => [row.rowId, Number(row.evaluatedQuantity)]));
    const first = quantities(oneHundredFifty.rows);
    const second = quantities(threeHundred.rows);

    for (const rowId of [
      "main_concrete",
      "reinforcement",
      "binding_wire",
      "formwork_system",
      "excavation_work",
      "foundation_bedding_work",
      "bituminous_waterproofing",
      "backfill_work",
    ]) {
      expect(second.get(rowId)).toBeCloseTo(Number(first.get(rowId)) * 2, 9);
    }
  });

  it("preserves the 150 m -> 240 m3 -> 259.2 m3 chain with an explicit, scenario-only 8% order allowance", () => {
    const compiled = compileStripFoundationProfessionalGoldR2(
      FULL_FOUNDATION_150M_ACCEPTANCE_INPUT,
    );
    const quantities = new Map(compiled.map((row) => [row.rowId, row.evaluatedQuantity]));

    expect(quantities.get("concrete_placement")).toBe("240");
    expect(quantities.get("main_concrete")).toBe("259.2");
    expect(quantities.get("concrete_delivery")).toBe("6480");
    expect(STRIP_FOUNDATION_INPUTS.find(
      (parameter) => parameter.parameterId === "concrete_order_allowance_percent",
    )?.defaultValue).toBe(0);
  });

  it("contains the complete applicable technology instead of the former 24-row reduced scope", () => {
    const compiled = compileStripFoundationProfessionalGoldR2(
      FULL_FOUNDATION_150M_ACCEPTANCE_INPUT,
    );
    const rowIds = new Set(compiled.map((row) => row.rowId));

    expect([...rowIds]).toEqual(expect.arrayContaining([
      "work:foundation:axis-setting-out-control",
      "excavation_work",
      "excavator",
      "excavated_soil_disposal",
      "bedding_sand",
      "foundation_bedding_work",
      "preparation_concrete",
      "formwork_system",
      "material:formwork:release-agent",
      "reinforcement",
      "material:reinforcement:spacer-chairs",
      "work:reinforcement:unload-store",
      "main_concrete",
      "concrete_placement",
      "deep_vibrator",
      "service:concrete:acceptance-control",
      "curing_membrane",
      "curing_work",
      "bituminous_waterproofing",
      "material:waterproofing:system-primer",
      "backfill_work",
      "service:foundation:as-built-survey",
      "document:foundation:as-built-survey-record",
      "work:foundation:site-cleanup",
      "delivery:foundation:construction-waste-haul",
    ]));
    expect(new Set(compiled.map((row) => row.category))).toEqual(new Set([
      "material",
      "construction_work",
      "machine_equipment",
      "delivery",
      "service",
      "document",
    ]));
    expect(compiled.every((row) => Number(row.evaluatedQuantity) > 0)).toBe(true);
  });

  it("does not turn an unknown delivery route into zero kilometres", () => {
    for (const parameterId of [
      "concrete_delivery_distance_km",
      "reinforcement_delivery_distance_km",
      "formwork_delivery_distance_km",
    ]) {
      const parameter = STRIP_FOUNDATION_INPUTS.find(
        (candidate) => candidate.parameterId === parameterId,
      );
      expect(parameter).toMatchObject({
        parameterId,
        required: true,
        defaultValue: null,
        requiredWhen: expect.any(Object),
      });
      expect(parameter?.guideRu).toContain("нельзя заменять нулём");
    }
  });

  it("uses meaningful material names while leaving unknown project characteristics explicit", () => {
    const compiled = compileStripFoundationProfessionalGoldR2(
      FULL_FOUNDATION_150M_ACCEPTANCE_INPUT,
    );
    const names = new Map(compiled.map((row) => [row.rowId, row.canonicalRuName]));

    expect(names.get("preparation_concrete")).toContain("класс по рабочей документации");
    expect(names.get("formwork_system")).toContain("по проектной раскладке");
    expect(names.get("curing_membrane")).toContain("влажностного ухода");
    expect(STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.find(
      (row) => row.rowId === "main_concrete",
    )?.titleSpecificationParameterIds).toEqual([
      "concrete_class",
      "watertightness",
      "frost_resistance",
      "mobility",
    ]);
  });

  it("fails the independent completeness oracle when any expected technology block is removed", () => {
    const completeRowIds = STRIP_FOUNDATION_PROFESSIONAL_ROWS_R2.map((row) => row.rowId);
    expect(auditStripFoundationScopeCompletenessR1({
      currentDefinitionRowIds: completeRowIds,
    }).status).toBe("GREEN");

    for (const expectation of STRIP_FOUNDATION_INDEPENDENT_SCOPE_EXPECTATIONS_R1) {
      const removed = new Set([
        ...expectation.currentDefinitionRowIds,
        ...expectation.typedChildRowIds,
      ]);
      const mutated = completeRowIds.filter((rowId) => !removed.has(rowId));
      const audit = auditStripFoundationScopeCompletenessR1({
        currentDefinitionRowIds: mutated,
        typedChildRowIds: [],
      });
      expect(audit.status).toBe("RED");
      expect(audit.unresolvedExpectationIds).toContain(expectation.expectationId);
    }
  });

  it("keeps separate concreting complete but free of earthworks, reinforcement and formwork", async () => {
    const target = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.find(
      (candidate) => candidate.contextKey === "standard",
    );
    if (!target) throw new Error("S2715_STANDARD_CONCRETING_TARGET_MISSING");
    const input = measuredConcreteProjectInputR533("stripFoundationConcretePlacementAcceptanceInputR1", "extended");
    const compiled = await compileStripFoundationConcretePlacementR1(
      { ...input },
      { catalogId: target.catalogId },
    );
    const readyMix = compiled.rows.find(
      (row) => row.row_id === "material:concrete:ready-mix",
    );

    expect(input.plan_dimension_concrete_volume_m3).toBe(240);
    expect(input.selected_contingency_percent).toBe(8);
    expect(readyMix?.quantity).toBe("259.2");
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(JSON.stringify(compiled.rows)).not.toMatch(
      /excavation|reinforcement|formwork|foundation[_ -]waterproofing/iu,
    );
  });
});
