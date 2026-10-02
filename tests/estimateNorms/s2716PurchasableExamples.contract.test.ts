import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ASPHALT_LEVEL_SMALL_AREA_S2716_ACCEPTANCE_INPUT,
  ASPHALT_LEVEL_SMALL_AREA_S2716_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS,
  ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
  asphaltMassFromGeometryS2716,
  compileAsphaltLevelSmallAreaS2716,
} from "../../src/lib/estimate/v4/asphaltLevelSmallAreaS2716";
import {
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256,
  compileSlabFoundationLocalRepairS2716,
  slabRepairMissingRequiredRows,
} from "../../src/lib/estimate/v4/slabFoundationLocalRepairS2716";

describe("S27.16 purchasable asphalt and slab examples", () => {
  it("computes 100 m² × 100 mm asphalt without the former 0.5 × 0.5 defect", async () => {
    const result = await compileAsphaltLevelSmallAreaS2716(
      ASPHALT_LEVEL_SMALL_AREA_S2716_ACCEPTANCE_INPUT,
    );
    const byId = new Map(result.rows.map((row) => [row.row_id, row]));

    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(byId.get("asphalt:control:geometric-compacted-volume")?.quantity).toBe("10");
    expect(byId.get("asphalt:material:hot-dense-fine-mix")?.quantity).toBe("23.58");
    expect(byId.get("asphalt:material:road-bitumen")?.quantity).toBe("0.02");
    expect(byId.get("asphalt:labor:road-workers")?.quantity).toBe("7");
    expect(byId.get("asphalt:equipment:smooth-roller-8t")?.quantity).toBe("0.255");
    expect(byId.get("asphalt:equipment:asphalt-paver")?.quantity).toBe("0.319");
    expect(byId.get("asphalt:material:hot-dense-fine-mix")?.title_ru)
      .toBe("Горячая асфальтобетонная смесь для выравнивающего слоя");
    expect(result.rows.some((row) => row.quantity === "2.5" && row.unit_id === "t")).toBe(false);
    expect(ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS.map((parameter) => parameter.parameter_id))
      .not.toEqual(expect.arrayContaining(["density", "density_t_m3", "waste_factor"]));

    for (const entry of ASPHALT_LEVEL_SMALL_AREA_S2716_INDEPENDENT_COMPLETENESS_MAP.entries) {
      expect(byId.has(entry.resolution.rowId)).toBe(true);
    }
    for (const row of result.rows.filter((candidate) =>
      candidate.row_id.startsWith("asphalt:quality:")
      || candidate.row_id.startsWith("asphalt:document:"))) {
      expect(row.included_in_estimate).toBe(false);
      expect(row.included_in_procurement).toBe(false);
    }
  });

  it("treats 0.5 percent as 1.005 in the explicit density arithmetic oracle", () => {
    expect(asphaltMassFromGeometryS2716({
      areaM2: 100,
      thicknessMm: 100,
      densityTPerM3: 2.4,
      wastePercent: 0.5,
    })).toEqual({
      volumeM3: 10,
      netMassT: 24,
      orderMassT: 24.12,
    });
  });

  it("keeps the complete local-repair material system visible before repair geometry is known", async () => {
    const result = await compileSlabFoundationLocalRepairS2716(
      SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SHORT_INPUT,
    );
    const needs = new Set(result.preliminaryNeeds.map((need) => need.row_id));

    expect(needs.has("slab-repair:material:repair-mortar-bags")).toBe(true);
    expect(needs.has("slab-repair:material:mixing-water")).toBe(true);
    expect(needs.has("slab-repair:work:remove-unsound-base")).toBe(true);
    expect(needs.has("slab-repair:work:prepare-substrate")).toBe(true);
    expect(needs.has("slab-repair:waste:removed-base")).toBe(true);
    const repairMortarNeed = result.preliminaryNeeds.find((need) =>
      need.row_id === "slab-repair:material:repair-mortar-bags");
    expect(repairMortarNeed?.missing_parameter_ids).toEqual(expect.arrayContaining([
      "local_repair_area_m2",
      "local_repair_depth_mm",
    ]));
  });

  it("produces the selected repair and liquid-curing procurement quantities automatically", async () => {
    const result = await compileSlabFoundationLocalRepairS2716(
      SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
    );
    const byId = new Map(result.rows.map((row) => [row.row_id, row]));

    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(byId.get("slab-repair:material:ready-mix")?.quantity).toBe("31.2");
    expect(byId.get("slab-repair:control:repair-mortar-net-mass")?.quantity).toBe("228");
    expect(byId.get("slab-repair:material:repair-mortar-bags")?.quantity).toBe("10");
    expect(byId.get("slab-repair:control:repair-mortar-dry-remainder")?.quantity).toBe("22");
    expect(byId.get("slab-repair:material:mixing-water")?.quantity).toBe("35.568");
    expect(byId.get("slab-repair:waste:removed-base")?.quantity).toBe("0.12");
    expect(byId.get("slab-repair:control:liquid-curing-net-volume")?.quantity).toBe("30");
    expect(byId.get("slab-repair:material:liquid-curing-packages")?.quantity).toBe("2");
    expect(byId.get("slab-repair:delivery:ready-mix")?.quantity).toBe("468");
    expect(byId.has("slab-repair:material:curing-sheet")).toBe(false);
    expect(byId.has("slab-repair:material:curing-water")).toBe(false);
    expect(byId.get("slab-repair:document:quality-set")?.included_in_estimate).toBe(false);
    expect(result.rows.some((row) => row.unit_id === "man_hour" || row.unit_id === "machine_hour"))
      .toBe(false);
    expect(String(byId.get("slab-repair:material:ready-mix")?.title_ru))
      .toContain("B25 W6 F150 P4 по проекту");
  });

  it("switches curing branches without treating sheet, liquid compound and water as one material", async () => {
    const sheet = await compileSlabFoundationLocalRepairS2716({
      ...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
      curing_method: "SHEET",
      curing_sheet_layout_factor: 1.1,
    });
    const sheetById = new Map(sheet.rows.map((row) => [row.row_id, row]));
    expect(sheetById.get("slab-repair:material:curing-sheet")?.quantity).toBe("165");
    expect(sheetById.get("slab-repair:material:curing-sheet")?.title_ru)
      .toContain("0,10 мм");
    expect(sheetById.has("slab-repair:material:liquid-curing-packages")).toBe(false);
    expect(sheetById.has("slab-repair:material:curing-water")).toBe(false);

    const water = await compileSlabFoundationLocalRepairS2716({
      ...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
      curing_method: "WATER",
      curing_water_l_per_m2: 8,
    });
    const waterById = new Map(water.rows.map((row) => [row.row_id, row]));
    expect(waterById.get("slab-repair:material:curing-water")?.quantity).toBe("1200");
    expect(waterById.has("slab-repair:material:liquid-curing-packages")).toBe(false);
    expect(waterById.has("slab-repair:material:curing-sheet")).toBe(false);
  });

  it("requires an unambiguous waterstop profile and never emits a lone numeric specification", async () => {
    const result = await compileSlabFoundationLocalRepairS2716({
      ...SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
      construction_joint_mode: "WATERSTOP",
      waterstop_product_profile: "Внутренняя ПВХ-П, ширина 150 мм",
      waterstop_length_m: 18,
    });
    const row = result.rows.find((candidate) => candidate.row_id === "slab-repair:material:waterstop");
    expect(row?.quantity).toBe("18");
    expect(row?.title_ru).toBe("Гидрошпонка рабочего шва — Внутренняя ПВХ-П, ширина 150 мм");
    expect(row?.title_ru).not.toMatch(/Гидрошпонка рабочего шва\s*[—-]?\s*150$/u);
  });

  it("fails the independent removal-mutation oracle for every applicable slab component", async () => {
    const result = await compileSlabFoundationLocalRepairS2716(
      SLAB_FOUNDATION_LOCAL_REPAIR_S2716_ACCEPTANCE_INPUT,
    );
    const rowIds = new Set(result.rows.map((row) => row.row_id));
    expect(slabRepairMissingRequiredRows(rowIds)).toEqual([]);

    const applicable = SLAB_FOUNDATION_LOCAL_REPAIR_S2716_INDEPENDENT_COMPLETENESS_MAP.entries
      .filter((entry) => [
        "always",
        "local repair selected",
        "separate delivery",
        "LIQUID_COMPOUND",
      ].includes(entry.condition));
    for (const entry of applicable) {
      const mutated = new Set(rowIds);
      mutated.delete(entry.resolution.rowId);
      expect(slabRepairMissingRequiredRows(mutated)).toContain(entry.resolution.rowId);
    }
  });

  it("binds the slab definition to the reviewed immutable source pack", () => {
    const bytes = readFileSync(resolve(
      process.cwd(),
      "data/estimate-benchmarks/source-packs/slab-foundation-local-repair-s27-16.json",
    ));
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(SLAB_FOUNDATION_LOCAL_REPAIR_S2716_SOURCE_PACK_SHA256);
  });

  it("binds the leveling definition to its own immutable 27-06-019-02 source pack", () => {
    const bytes = readFileSync(resolve(
      process.cwd(),
      "data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json",
    ));
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256);
  });
});
