import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT,
  HOUSE_WATER_CONNECTION_CATALOG_ID,
  HOUSE_WATER_CONNECTION_FORMULAS,
  HOUSE_WATER_CONNECTION_PARAMETERS,
  HOUSE_WATER_CONNECTION_RESOURCES,
  HOUSE_WATER_CONNECTION_RUNTIME_CLASSIFICATION,
  HOUSE_WATER_CONNECTION_RUNTIME_INPUT,
  HOUSE_WATER_CONNECTION_RUNTIME_SOURCE_IDS,
  HOUSE_WATER_CONNECTION_SHORT_INPUT,
  HOUSE_WATER_CONNECTION_SOURCE_ID,
  HOUSE_WATER_CONNECTION_SOURCE_METADATA,
  compileHouseWaterConnectionR1,
} from "../../src/lib/estimate/v4/houseWaterConnectionR1";

type Compiled = Awaited<ReturnType<typeof compileHouseWaterConnectionR1>>;

const quantity = (compiled: Compiled, rowId: string): number => {
  const value = compiled.rows.find((row) => row.row_id === rowId)?.quantity;
  if (value == null) throw new Error(`MISSING_HCW_TEST_ROW:${rowId}`);
  return Number(value);
};

function independentEarthOracle(depth = 1.5) {
  const route = 28;
  const trench = route * 0.6 * depth;
  const bedding = route * 0.6 * 0.1;
  const surroundGross = route * 0.45 * (0.032 + 0.2);
  const pipeDisplacement = route * Math.PI * 0.032 ** 2 / 4;
  const surround = surroundGross - pipeDisplacement;
  const placedBackfill = Math.max(0, trench - bedding - surroundGross);
  const importedBackfill = Math.max(0, placedBackfill - trench * 0.8);
  const excessSoil = Math.max(0, trench - Math.min(trench * 0.8, placedBackfill));
  return { trench, bedding, surround, placedBackfill, importedBackfill, excessSoil };
}

describe("S27.25 automatic complete house water connection", () => {
  test("asks ten primary facts and calculates the complete ordinary result", async () => {
    expect(HOUSE_WATER_CONNECTION_CATALOG_ID)
      .toBe("canonical-work:expanded:house_connection_water");
    expect(Object.keys(HOUSE_WATER_CONNECTION_SHORT_INPUT)).toHaveLength(10);
    expect(HOUSE_WATER_CONNECTION_PARAMETERS).toHaveLength(100);
    expect(HOUSE_WATER_CONNECTION_FORMULAS).toHaveLength(66);
    expect(HOUSE_WATER_CONNECTION_RESOURCES).toHaveLength(66);
    expect(Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT)).toHaveLength(82);
    expect(new Set(Object.values(HOUSE_WATER_CONNECTION_RUNTIME_CLASSIFICATION)))
      .toEqual(new Set(["ASSUMPTION"]));
    expect(Object.values(HOUSE_WATER_CONNECTION_RUNTIME_SOURCE_IDS).every(
      (ids) => ids.length === 1 && ids[0] === HOUSE_WATER_CONNECTION_SOURCE_ID,
    )).toBe(true);

    const forbiddenComputedInputs = new Set([
      "hcw_trench_volume_m3", "hcw_bedding_volume_m3", "hcw_surround_volume_m3",
      "hcw_backfill_volume_m3", "hcw_excess_soil_volume_m3", "hcw_pipe_ordered_m",
      "hcw_joint_count", "hcw_total_labor_h", "hcw_total_machine_h",
      "hcw_delivery_trip_count", "hcw_removal_trip_count",
    ]);
    expect(HOUSE_WATER_CONNECTION_PARAMETERS.every(
      (item) => !forbiddenComputedInputs.has(item.parameter_id),
    )).toBe(true);

    const compiled = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(62);
  });

  test("derives earthworks and layers from primary geometry", async () => {
    const compiled = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    });
    const oracle = independentEarthOracle();
    expect(quantity(compiled, "rc09:hcw_trench_excavation")).toBeCloseTo(oracle.trench, 9);
    expect(quantity(compiled, "rc09:hcw_bedding")).toBeCloseTo(oracle.bedding, 9);
    expect(quantity(compiled, "rc09:hcw_surround")).toBeCloseTo(oracle.surround, 9);
    expect(quantity(compiled, "rc09:hcw_backfill_placement"))
      .toBeCloseTo(oracle.placedBackfill, 9);
    expect(quantity(compiled, "rc09:hcw_imported_backfill"))
      .toBeCloseTo(oracle.importedBackfill, 9);
    expect(quantity(compiled, "rc09:hcw_excess_soil_removal"))
      .toBeCloseTo(oracle.excessSoil, 9);
    expect(quantity(compiled, "rc09:labor:hcw-earthworks"))
      .toBeCloseTo(oracle.trench * 0.28, 9);
    expect(quantity(compiled, "rc09:equipment:hcw-excavator"))
      .toBeCloseTo(oracle.trench / 8, 9);
  });

  test("recalculates dependent geometry without changing connection assemblies", async () => {
    const base = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    });
    const changed = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
      hcw_trench_depth_m: 1.8,
    });
    const oracle = independentEarthOracle(1.8);
    expect(quantity(changed, "rc09:hcw_trench_excavation"))
      .toBeCloseTo(oracle.trench, 9);
    expect(quantity(changed, "rc09:hcw_imported_backfill"))
      .toBeCloseTo(oracle.importedBackfill, 9);
    expect(quantity(changed, "rc09:hcw_tapping_saddle"))
      .toBe(quantity(base, "rc09:hcw_tapping_saddle"));
    expect(quantity(changed, "rc09:hcw_water_meter"))
      .toBe(quantity(base, "rc09:hcw_water_meter"));
    expect(quantity(changed, "rc09:hcw_pipe"))
      .toBe(quantity(base, "rc09:hcw_pipe"));
  });

  test("separates installed pipe topology from loss, stock and supplier packaging", async () => {
    const tenMetrePackages = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
      hcw_installed_pipe_piece_length_m: 12,
      hcw_pipe_supplier_package_length_m: 10,
    });
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:installed-net")).toBe(28);
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:expected-loss")).toBeCloseTo(0.84, 9);
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:total-need")).toBeCloseTo(30.84, 9);
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:package-count")).toBe(4);
    expect(quantity(tenMetrePackages, "rc09:hcw_pipe")).toBe(40);
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:remainder")).toBeCloseTo(11.16, 9);
    expect(quantity(tenMetrePackages, "rc09:hcw-pipe-balance:surplus-beyond-spare"))
      .toBeCloseTo(9.16, 9);
    expect(quantity(tenMetrePackages, "rc09:hcw_pipe_joint")).toBe(2);

    const withStock = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
      hcw_installed_pipe_piece_length_m: 12,
      hcw_pipe_supplier_package_length_m: 10,
      hcw_pipe_available_stock_m: 15,
    });
    expect(quantity(withStock, "rc09:hcw-pipe-balance:net-order-need"))
      .toBeCloseTo(15.84, 9);
    expect(quantity(withStock, "rc09:hcw_pipe")).toBe(20);
    expect(quantity(withStock, "rc09:hcw_pipe_joint")).toBe(2);
  });

  test("contains the full material, consumable, labor and mechanism chain", () => {
    const rowIds = new Set(HOUSE_WATER_CONNECTION_RESOURCES.map((row) => row.row_id));
    for (const rowId of [
      "rc09:hcw_pipe", "rc09:hcw_pipe_joint", "rc09:hcw_fusion_consumables",
      "rc09:hcw_tapping_saddle", "rc09:hcw_corporation_stop",
      "rc09:hcw_service_adapter", "rc09:hcw_curb_stop", "rc09:hcw_valve_box",
      "rc09:hcw_internal_stop_valve", "rc09:hcw_water_meter", "rc09:hcw_strainer",
      "rc09:hcw_check_valve", "rc09:hcw_union", "rc09:hcw_meter_seal",
      "rc09:hcw_wall_sleeve", "rc09:hcw_penetration_seal",
      "rc09:hcw_entry_insulation", "rc09:hcw_warning_tape", "rc09:hcw_tracer_wire",
      "rc09:hcw_flushing_water", "rc09:hcw_disinfection_reagent",
      "rc09:hcw_test_closure", "rc09:hcw_fill_air_drain_set",
      "rc09:hcw_pressure_measurement_set", "rc09:hcw_water_sample",
      "rc09:hcw_laboratory_analysis", "rc09:hcw_work_zone_safety",
      "rc09:hcw_compaction_water", "rc09:labor:hcw-tapping",
      "rc09:labor:hcw-entry-meter", "rc09:equipment:hcw-core-drill",
      "rc09:equipment:hcw-test-pump", "rc09:logistics:hcw-delivery",
    ]) expect(rowIds).toContain(rowId);
    expect(HOUSE_WATER_CONNECTION_RESOURCES.every((row) => row.source_metadata)).toBe(true);
  });

  test("keeps project-only branches conditional", async () => {
    const withoutBranches = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
    });
    expect(withoutBranches.rows).toHaveLength(62);
    expect(withoutBranches.rows.some((row) => row.row_id === "rc09:hcw_dewatering"))
      .toBe(false);

    const missingConditionalFacts = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
      hcw_dewatering_mode: "REQUIRED",
    });
    expect(missingConditionalFacts.preliminaryNeeds.flatMap(
      (need) => need.missing_parameter_ids,
    ).sort())
      .toEqual([
        "hcw_dewatering_designation",
        "hcw_dewatering_duration_h",
        "hcw_dewatering_pump_count",
      ]);

    const allBranches = await compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT,
      hcw_dewatering_mode: "REQUIRED",
      hcw_dewatering_designation: "SUBMERSIBLE-DEWATERING-PUMP",
      hcw_dewatering_pump_count: 2,
      hcw_dewatering_duration_h: 16,
      hcw_road_restoration_mode: "REQUIRED",
      hcw_road_restoration_designation: "ASPHALT-YARD-RESTORATION",
      hcw_road_restoration_area_m2: 24,
      hcw_external_meter_chamber_mode: "REQUIRED",
      hcw_external_meter_chamber_designation: "HCW-METER-CHAMBER-DN1000",
      hcw_trench_support_mode: "REQUIRED",
      hcw_trench_support_designation: "TRENCH-BOX-SYSTEM",
      hcw_trench_support_length_m: 12,
    });
    expect(allBranches.preliminaryNeeds).toEqual([]);
    expect(allBranches.rows).toHaveLength(66);
    expect(quantity(allBranches, "rc09:hcw_dewatering")).toBe(32);
    expect(quantity(allBranches, "rc09:hcw_road_restoration")).toBe(24);
    expect(quantity(allBranches, "rc09:hcw_external_meter_chamber")).toBe(1);
    expect(quantity(allBranches, "rc09:hcw_trench_support")).toBe(36);
  });

  test("binds the source pack and rejects impossible identities or diameters", async () => {
    const bytes = readFileSync(resolve(
      "data/estimate-benchmarks/source-packs/house-water-connection-geometric-automatic-s27-25.json",
    ));
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(HOUSE_WATER_CONNECTION_SOURCE_METADATA.artifact_sha256);
    expect(JSON.stringify(HOUSE_WATER_CONNECTION_FORMULAS)).not.toMatch(
      /villageWaterSupplyCalculator|length_m\s*\*\s*(?:0\.022|0\.55|1\.02)|length_m\s*\/\s*(?:300|400|500)/iu,
    );
    await expect(compileHouseWaterConnectionR1({
      ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
      hcw_existing_main_outside_diameter_mm: 32,
    })).rejects.toThrow("HOUSE_WATER_CONNECTION_SERVICE_DIAMETER_NOT_BELOW_MAIN");
    await expect(compileHouseWaterConnectionR1(
      { ...HOUSE_WATER_CONNECTION_SHORT_INPUT },
      { catalogId: `${HOUSE_WATER_CONNECTION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("HOUSE_WATER_CONNECTION_CATALOG_UNSUPPORTED");
  });
});
