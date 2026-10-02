import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
  DISTRIBUTION_PIPELINE_CATALOG_ID,
  DISTRIBUTION_PIPELINE_FORMULAS,
  DISTRIBUTION_PIPELINE_PARAMETERS,
  DISTRIBUTION_PIPELINE_RESOURCES,
  DISTRIBUTION_PIPELINE_RUNTIME_CLASSIFICATION,
  DISTRIBUTION_PIPELINE_RUNTIME_INPUT,
  DISTRIBUTION_PIPELINE_RUNTIME_SOURCE_IDS,
  DISTRIBUTION_PIPELINE_SHORT_INPUT,
  DISTRIBUTION_PIPELINE_SOURCE_ID,
  DISTRIBUTION_PIPELINE_SOURCE_METADATA,
  compileDistributionPipelineR1,
} from "../../src/lib/estimate/v4/distributionPipelineR1";

type Compiled = Awaited<ReturnType<typeof compileDistributionPipelineR1>>;

const quantity = (compiled: Compiled, rowId: string): number => {
  const value = compiled.rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`MISSING_TEST_ROW:${rowId}`);
  return Number(value);
};

const baseGeometry: Readonly<{
  route: number;
  width: number;
  depth: number;
  bedding: number;
  surroundWidth: number;
  cover: number;
  outsideDiameter: number;
  reuse: number;
}> = Object.freeze({
  route: 1800,
  width: 1.2,
  depth: 2,
  bedding: 0.15,
  surroundWidth: 0.7,
  cover: 0.3,
  outsideDiameter: 0.225,
  reuse: 0.75,
});

function independentEarthOracle(input = baseGeometry) {
  const trench = input.route * input.width * input.depth;
  const bedding = input.route * input.width * input.bedding;
  const surroundGross = input.route * input.surroundWidth
    * (input.outsideDiameter + input.cover);
  const pipeDisplacement = input.route * Math.PI * input.outsideDiameter ** 2 / 4;
  const surround = surroundGross - pipeDisplacement;
  const backfillPlacement = Math.max(0, trench - bedding - surroundGross);
  const importedBackfill = Math.max(0, backfillPlacement - trench * input.reuse);
  const excessSoil = Math.max(0, trench - Math.min(trench * input.reuse, backfillPlacement));
  return { trench, bedding, surround, backfillPlacement, importedBackfill, excessSoil };
}

describe("S27.25 potable-water distribution-main automatic owner", () => {
  test("uses eight ordinary facts and a visible sourced profile instead of final-quantity questions", async () => {
    expect(DISTRIBUTION_PIPELINE_CATALOG_ID)
      .toBe("canonical-work:expanded:distribution_pipeline");
    expect(DISTRIBUTION_PIPELINE_PARAMETERS).toHaveLength(90);
    expect(DISTRIBUTION_PIPELINE_FORMULAS).toHaveLength(60);
    expect(DISTRIBUTION_PIPELINE_RESOURCES).toHaveLength(60);
    expect(Object.keys(DISTRIBUTION_PIPELINE_SHORT_INPUT)).toHaveLength(8);
    expect(Object.keys(DISTRIBUTION_PIPELINE_RUNTIME_INPUT).length).toBeGreaterThan(50);
    expect(new Set(Object.values(DISTRIBUTION_PIPELINE_RUNTIME_CLASSIFICATION)))
      .toEqual(new Set(["ASSUMPTION"]));
    expect(Object.values(DISTRIBUTION_PIPELINE_RUNTIME_SOURCE_IDS).every(
      (sourceIds) => sourceIds.length === 1 && sourceIds[0] === DISTRIBUTION_PIPELINE_SOURCE_ID,
    )).toBe(true);

    const computedOutputParameterIds = [
      "dpm_trench_excavation_volume_m3", "dpm_bedding_volume_m3",
      "dpm_surround_volume_m3", "dpm_backfill_volume_m3", "dpm_excess_soil_volume_m3",
      "dpm_joint_quantity_piece", "dpm_cover_quantity_piece", "dpm_warning_tape_length_m",
      "dpm_flushing_water_volume_m3", "dpm_pressure_test_length_m",
      "dpm_disinfection_length_m", "dpm_asbuilt_document_count", "dpm_survey_labor_h",
      "dpm_earthworks_labor_h", "dpm_pipe_appurtenance_install_labor_h",
      "dpm_qa_documentation_labor_h", "dpm_excavator_machine_h",
      "dpm_compactor_machine_h", "dpm_jointing_machine_h", "dpm_crane_machine_h",
      "dpm_removal_trip_count", "dpm_thrust_block_concrete_volume_m3",
      "dpm_disinfection_reagent_mass_kg", "dpm_hydrotest_pump_machine_h",
    ];
    const parameterIds = new Set(DISTRIBUTION_PIPELINE_PARAMETERS.map((item) => item.parameter_id));
    expect(computedOutputParameterIds.filter((id) => parameterIds.has(id))).toEqual([]);

    const compiled = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_SHORT_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(56);
  });

  test("resolves every one of the legacy 37 clarifications explicitly", () => {
    const sourcePackBytes = readFileSync(resolve(
      "data/estimate-benchmarks/source-packs/distribution-pipeline-geometric-automatic-s27-25.json",
    ));
    const sourcePack = JSON.parse(sourcePackBytes.toString("utf8")) as {
      classification: { legacy37ClarificationResolutionByRow: Record<string, string> };
    };
    const resolution = sourcePack.classification.legacy37ClarificationResolutionByRow;
    expect(Object.keys(resolution)).toHaveLength(37);
    expect(Object.values(resolution).every((value) =>
      /^(?:AUTOMATIC|VISIBLE_PRELIMINARY|CONDITIONAL_PROJECT_FACT)/u.test(value))).toBe(true);
    expect(createHash("sha256").update(sourcePackBytes).digest("hex"))
      .toBe(DISTRIBUTION_PIPELINE_SOURCE_METADATA.artifact_sha256);
  });

  test("calculates earthworks, layers, resources and completion consumables from primary facts", async () => {
    const compiled = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_SHORT_INPUT });
    const oracle = independentEarthOracle();
    expect(quantity(compiled, "rc09:dpm_trench_excavation")).toBeCloseTo(oracle.trench, 9);
    expect(quantity(compiled, "rc09:dpm_bedding")).toBeCloseTo(oracle.bedding, 9);
    expect(quantity(compiled, "rc09:dpm_surround")).toBeCloseTo(oracle.surround, 7);
    expect(quantity(compiled, "rc09:dpm_backfill_placement"))
      .toBeCloseTo(oracle.backfillPlacement, 9);
    expect(quantity(compiled, "rc09:dpm_backfill")).toBeCloseTo(oracle.importedBackfill, 9);
    expect(quantity(compiled, "rc09:dpm_excess_soil_removal"))
      .toBeCloseTo(oracle.excessSoil, 9);
    expect(quantity(compiled, "rc09:dpm_pipe_joint")).toBe(149);
    expect(quantity(compiled, "rc09:dpm_fusion_consumables")).toBe(149);
    expect(quantity(compiled, "rc09:dpm_flange_connection_kits")).toBe(20);
    expect(quantity(compiled, "rc09:dpm_temporary_test_end_closures")).toBe(12);
    expect(quantity(compiled, "rc09:dpm_test_water_connection_set")).toBe(1);
    expect(quantity(compiled, "rc09:dpm_disinfection_reagent")).toBeCloseTo(5.570361862, 8);
    expect(quantity(compiled, "rc09:labor:dpm-earthworks"))
      .toBeCloseTo(oracle.trench * 0.2731481481, 6);
    expect(quantity(compiled, "rc09:equipment:dpm-excavator"))
      .toBeCloseTo(oracle.trench / 10.2857142857, 7);
    expect(quantity(compiled, "rc09:equipment:dpm-compactor"))
      .toBeCloseTo(oracle.backfillPlacement / 10.1045454545, 7);
  });

  test("changing one primary depth recalculates only its dependent quantities", async () => {
    const base = await compileDistributionPipelineR1({ ...DISTRIBUTION_PIPELINE_SHORT_INPUT });
    const changed = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_trench_depth_m: 2.4,
    });
    const oracle = independentEarthOracle({ ...baseGeometry, depth: 2.4 });
    expect(quantity(changed, "rc09:dpm_trench_excavation")).toBeCloseTo(oracle.trench, 9);
    expect(quantity(changed, "rc09:dpm_backfill_placement"))
      .toBeCloseTo(oracle.backfillPlacement, 9);
    expect(quantity(changed, "rc09:dpm_backfill")).toBeCloseTo(oracle.importedBackfill, 9);
    expect(quantity(changed, "rc09:dpm_excess_soil_removal"))
      .toBeCloseTo(oracle.excessSoil, 9);
    expect(quantity(changed, "rc09:labor:dpm-earthworks"))
      .not.toBe(quantity(base, "rc09:labor:dpm-earthworks"));
    expect(quantity(changed, "rc09:equipment:dpm-excavator"))
      .not.toBe(quantity(base, "rc09:equipment:dpm-excavator"));

    for (const rowId of [
      "rc09:dpm_bedding", "rc09:dpm_surround", "rc09:dpm_pipe_joint",
      "rc09:dpm_fitting", "rc09:dpm_valve", "rc09:dpm_hydrant", "rc09:dpm_chamber",
      "rc09:dpm_pipe", "rc09:dpm-pipe-balance:segment-count",
    ]) expect(quantity(changed, rowId)).toBe(quantity(base, rowId));
  });

  test("sums distinct section cross-sections without changing pipe topology", async () => {
    const compiled = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_section_2_length_m: 300,
      dpm_section_2_trench_bottom_width_m: 1.5,
      dpm_section_2_trench_depth_m: 2.4,
      dpm_section_2_bedding_thickness_m: 0.2,
      dpm_section_2_surround_width_m: 0.9,
      dpm_section_2_surround_cover_above_pipe_m: 0.4,
    });
    const trench = 1500 * 1.2 * 2 + 300 * 1.5 * 2.4;
    const bedding = 1500 * 1.2 * 0.15 + 300 * 1.5 * 0.2;
    const surroundGross = 1500 * 0.7 * (0.225 + 0.3) + 300 * 0.9 * (0.225 + 0.4);
    const pipeDisplacement = 1800 * Math.PI * 0.225 ** 2 / 4;
    expect(quantity(compiled, "rc09:dpm_trench_excavation")).toBeCloseTo(trench, 9);
    expect(quantity(compiled, "rc09:dpm_bedding")).toBeCloseTo(bedding, 9);
    expect(quantity(compiled, "rc09:dpm_surround"))
      .toBeCloseTo(surroundGross - pipeDisplacement, 7);
    expect(quantity(compiled, "rc09:dpm_pipe_joint")).toBe(149);
    expect(quantity(compiled, "rc09:dpm_fitting")).toBe(34);
  });

  test("keeps installed topology separate from loss, stock, spare and supplier rounding", async () => {
    const twelveMetre = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_pipe_expected_loss_fraction: 0.02,
      dpm_pipe_retained_spare_m: 24,
      dpm_pipe_available_stock_m: 0,
      dpm_pipe_supplier_segment_length_m: 12,
    });
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:installed-net")).toBe(1800);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:expected-loss")).toBe(36);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:total-need")).toBe(1860);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:net-order-need")).toBe(1860);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:segment-count")).toBe(155);
    expect(quantity(twelveMetre, "rc09:dpm_pipe")).toBe(1860);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:remainder")).toBe(24);
    expect(quantity(twelveMetre, "rc09:dpm-pipe-balance:surplus-beyond-spare")).toBe(0);

    const hundredMetre = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_pipe_supplier_segment_length_m: 100,
    });
    expect(quantity(hundredMetre, "rc09:dpm_pipe")).toBe(1900);
    expect(quantity(hundredMetre, "rc09:dpm-pipe-balance:segment-count")).toBe(19);
    expect(quantity(hundredMetre, "rc09:dpm-pipe-balance:remainder")).toBe(64);
    expect(quantity(hundredMetre, "rc09:dpm-pipe-balance:surplus-beyond-spare")).toBe(40);
    expect(quantity(hundredMetre, "rc09:dpm_pipe_joint")).toBe(149);
    expect(quantity(hundredMetre, "rc09:dpm_fitting")).toBe(34);

    const withStock = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_pipe_available_stock_m: 60,
    });
    expect(quantity(withStock, "rc09:dpm-pipe-balance:net-order-need")).toBe(1800);
    expect(quantity(withStock, "rc09:dpm_pipe")).toBe(1800);
    expect(quantity(withStock, "rc09:dpm-pipe-balance:remainder")).toBe(24);
    expect(quantity(withStock, "rc09:dpm-pipe-balance:surplus-beyond-spare")).toBe(0);
  });

  test("contains the material and consumable chain needed to complete the work", () => {
    const rowIds = new Set(DISTRIBUTION_PIPELINE_RESOURCES.map((row) => row.row_id));
    for (const rowId of [
      "rc09:dpm_pipe", "rc09:dpm_pipe_joint", "rc09:dpm_fusion_consumables",
      "rc09:dpm_fitting", "rc09:dpm_valve", "rc09:dpm_flange_connection_kits",
      "rc09:dpm_hydrant", "rc09:dpm_chamber", "rc09:dpm_chamber_cover",
      "rc09:dpm_bedding", "rc09:dpm_surround", "rc09:dpm_backfill",
      "rc09:dpm_thrust_block_concrete", "rc09:dpm_thrust_restraint",
      "rc09:dpm_warning_tape", "rc09:dpm_marker_post", "rc09:dpm_flushing_water",
      "rc09:dpm_disinfection_reagent", "rc09:dpm_temporary_test_end_closures",
      "rc09:dpm_test_water_connection_set", "rc09:equipment:dpm-hydrotest-pump",
      "rc09:dpm_route_marking_consumables", "rc09:dpm_temporary_work_zone_safety",
      "rc09:dpm_compaction_water", "rc09:dpm_chamber_joint_sealant",
      "rc09:dpm_cover_bedding_mortar", "rc09:dpm_pressure_test_measurement_set",
      "rc09:dpm_trench_support",
    ]) expect(rowIds).toContain(rowId);
    expect(DISTRIBUTION_PIPELINE_RESOURCES.every((row) => row.source_metadata)).toBe(true);
  });

  test("keeps QA scope informational and special branches conditional", async () => {
    for (const rowId of [
      "rc09:dpm_network_install_acceptance", "rc09:dpm_trench_excavation",
      "rc09:dpm_pressure_test", "rc09:dpm_disinfection", "rc09:dpm_asbuilt_documents",
      "rc09:dpm_backfill_placement", "rc09:dpm-pipe-balance:expected-loss",
      "rc09:dpm-pipe-balance:available-stock", "rc09:dpm-pipe-balance:net-order-need",
    ]) {
      expect(DISTRIBUTION_PIPELINE_RESOURCES.find((row) => row.row_id === rowId)
        ?.resource_graph).toEqual(expect.objectContaining({ costTreatment: "INFORMATIONAL_SCOPE" }));
    }
    const conditional = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
      dpm_crossing_casing_mode: "REQUIRED",
      dpm_crossing_casing_designation: "STEEL-CASING-DN400-PN16",
      dpm_crossing_casing_length_m: 72,
      dpm_dewatering_mode: "REQUIRED",
      dpm_dewatering_designation: "WELLPOINT-DPM-SET",
      dpm_dewatering_machine_h: 420,
      dpm_road_restoration_mode: "REQUIRED",
      dpm_road_restoration_designation: "ROAD-REINSTATEMENT-DPM",
      dpm_road_restoration_area_m2: 2160,
    });
    expect(conditional.preliminaryNeeds).toEqual([]);
    expect(conditional.rows).toHaveLength(59);

    const withSupport = await compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT,
      ...{
        dpm_crossing_casing_mode: "REQUIRED",
        dpm_crossing_casing_designation: "STEEL-CASING-DN400-PN16",
        dpm_crossing_casing_length_m: 72,
        dpm_dewatering_mode: "REQUIRED",
        dpm_dewatering_designation: "WELLPOINT-DPM-SET",
        dpm_dewatering_machine_h: 420,
        dpm_road_restoration_mode: "REQUIRED",
        dpm_road_restoration_designation: "ROAD-REINSTATEMENT-DPM",
        dpm_road_restoration_area_m2: 2160,
      },
      dpm_trench_support_mode: "REQUIRED",
      dpm_trench_support_designation: "TRENCH-BOX-SYSTEM",
      dpm_trench_support_length_m: 1800,
    });
    expect(withSupport.preliminaryNeeds).toEqual([]);
    expect(withSupport.rows).toHaveLength(60);
    expect(quantity(withSupport, "rc09:dpm_trench_support")).toBe(7200);
  });

  test("rejects impossible geometry, invalid quantities and unrelated identities", async () => {
    await expect(compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_section_2_length_m: 1801,
    })).rejects.toThrow("DISTRIBUTION_PIPELINE_SECTION_LENGTH_EXCEEDS_ROUTE");
    await expect(compileDistributionPipelineR1({
      ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
      dpm_route_length_m: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileDistributionPipelineR1(
      { ...DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT },
      { catalogId: `${DISTRIBUTION_PIPELINE_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("DISTRIBUTION_PIPELINE_CATALOG_UNSUPPORTED");
    expect(JSON.stringify(DISTRIBUTION_PIPELINE_FORMULAS)).not.toMatch(
      /length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)|golden_rate|normFactor|villageWaterSupplyCalculator/iu,
    );
  });
});
