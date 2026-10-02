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
  STRIP_POUR_PROFILE_RESOURCES,
  STRIP_POUR_PROFILE_SHORT_INPUT,
  STRIP_POUR_SOURCE_PACK_SHA256,
  compileStripFoundationConcretePlacementPreliminaryProfileR1,
  stripPourMissingRequiredRows,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1";

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
