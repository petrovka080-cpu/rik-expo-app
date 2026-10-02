import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
  SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID,
  compileSlabFoundationFullCycleS2719,
  deriveSlabFoundationPlanPerimeterS2719,
  slabFullCycleMissingRequiredRows,
} from "../../src/lib/estimate/v4/slabFoundationFullCycleS2719";
import { compileCanonicalEstimateCore } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { buildCanonicalBaselinePlan } from
  "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";

const rowMap = (rows: Awaited<ReturnType<typeof compileSlabFoundationFullCycleS2719>>["rows"]) =>
  new Map(rows.map((row) => [row.row_id, row]));

function routeCatalog(catalogId: string, titleRu: string): CanonicalEstimateCatalogItem {
  return {
    catalogId,
    releaseId: "s27-23-foundation-route-contract",
    namespace: "global",
    domain: "concrete",
    workKey: catalogId.replace(/^canonical-work:(?:base|expanded):/u, ""),
    titleRu,
    definitionVersion: 8,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS.map((parameter) => {
      const catalogParameter = parameter as typeof parameter & {
        ordinal: number;
        unit_id: string | null;
        title_ru: string;
      };
      const truth = parameter.truth_metadata ?? {};
      return {
        parameterId: parameter.parameter_id,
        ordinal: catalogParameter.ordinal,
        valueType: parameter.value_type as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
        unitId: catalogParameter.unit_id,
        titleRu: catalogParameter.title_ru,
        required: parameter.required,
        defaultValue: parameter.default_value,
        constraints: parameter.constraints_json ?? {},
        semanticParameterKey: String(
          truth.semantic_parameter_key ?? parameter.parameter_id,
        ),
        visibilityRole: truth.visibility_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["visibilityRole"],
        valueSourceRole: truth.value_source_role as
          CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"],
        preliminaryCompilationAllowed:
          truth.preliminary_compilation_allowed === true,
      };
    }),
  };
}

describe("S27.19 slab foundation full-cycle composition", () => {
  it("routes an ordinary 500 m2 full-work request into the area-driven complete definition", () => {
    const catalog = routeCatalog(
        "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
        "Устройство монолитного плитного фундамента полного цикла",
    );

    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Нужна полная смета устройства монолитного плитного фундамента 500 м².",
    });

    expect(plan.primaryMeasureParameterId).toBe("slab_area_m2");
    expect(plan.parameters).toEqual({ slab_area_m2: "500" });
    expect(plan.assumptions).toContain(
      "Исходная смета рассчитана по явно показанным базовым допущениям; их необходимо проверить перед договором.",
    );
  });

  it("routes the ordinary 150 m2 repair request to the complete repair owner", () => {
    const catalog = routeCatalog(
      SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID,
      "Устройство плитного фундамента полного цикла с локальным ремонтом основания",
    );
    const plan = buildCanonicalBaselinePlan({
      catalog,
      prompt: "Нужна полная смета плитного фундамента 150 м² с локальным ремонтом основания.",
    });

    expect(plan.primaryMeasureParameterId).toBe("slab_area_m2");
    expect(plan.parameters).toEqual({ slab_area_m2: "150" });
  });

  it("binds the independently authored source pack and every required 12-stage row", async () => {
    const sourcePath = resolve(
      "data/estimate-benchmarks/source-packs/slab-foundation-full-cycle-s27-19.json",
    );
    expect(createHash("sha256").update(readFileSync(sourcePath)).digest("hex"))
      .toBe(SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256);

    const result = await compileSlabFoundationFullCycleS2719(
      SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT,
    );
    const ids = new Set(result.rows.map((row) => row.row_id));
    const requiredIds = new Set(
      SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries
        .flatMap((entry) => entry.requiredRowIds),
    );

    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(slabFullCycleMissingRequiredRows(ids)).toEqual([]);
    expect([...requiredIds].every((rowId) => ids.has(rowId))).toBe(true);
    expect(result.rows.length).toBeGreaterThan(requiredIds.size);
    expect(new Set(result.rows.map((row) => row.section)).size).toBe(12);
  });

  it("returns a complete preliminary 500 m2 estimate and one physical procurement view", async () => {
    const result = await compileSlabFoundationFullCycleS2719({ slab_area_m2: 500 });
    const rows = rowMap(result.rows);

    expect(deriveSlabFoundationPlanPerimeterS2719(500)).toBe(90);
    expect(rows.get("slab-full:01:material:marking-cord")?.quantity).toBe("180");
    expect(rows.get("slab-full:03:material:separation-geotextile-rolls")?.quantity).toBe("6");
    expect(rows.get("slab-full:04:material:sand")?.quantity).toBe("57.5");
    expect(rows.get("slab-full:06:material:membrane-rolls")?.quantity).toBe("55");
    expect(rows.get("slab-full:06:material:xps-packages")?.quantity).toBe("122");
    expect(rows.get("slab-full:09:material:ready-mix")?.quantity).toBe("108");
    expect(rows.get("slab-full:11:consumable:test-sets")?.quantity).toBe("2");
    expect(rows.get("slab-full:12:material:repair-mortar-bags")?.quantity).toBe("4");

    const procurementRows = result.rows.filter((row) => row.included_in_procurement);
    expect(procurementRows.length).toBeGreaterThan(35);
    expect(procurementRows.every((row) =>
      ["material"].includes(String(row.category)))).toBe(true);
    expect(procurementRows.some((row) => row.row_id.includes(":labor:"))).toBe(false);
    expect(procurementRows.some((row) => row.row_id.includes(":equipment:"))).toBe(false);
    expect(procurementRows.some((row) => row.row_id.includes(":document:"))).toBe(false);
  });

  it("uses the complete 12-stage scope for the 150 m2 local-repair work ID", async () => {
    const result = await compileSlabFoundationFullCycleS2719(
      SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
      { catalogId: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID },
    );
    const rows = rowMap(result.rows);

    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(new Set(result.rows.map((row) => row.section)).size).toBe(12);
    expect(result.rows.length).toBeGreaterThan(100);
    expect(result.rows.filter((row) => row.included_in_procurement)).toHaveLength(46);
    expect(rows.get("slab-full:09:material:ready-mix")?.quantity).toBe("32.4");
    expect(rows.get("slab-full:12:control:repair-net")?.quantity).toBe("228");
    expect(rows.get("slab-full:12:material:repair-mortar-bags")?.quantity).toBe("10");
    expect(rows.get("slab-full:12:consumable:repair-water")?.quantity).toBe("35.568");
    expect(rows.get("slab-full:12:labor:defect-repair")?.quantity).toBe("12");
    expect(rows.get("slab-full:12:equipment:repair-tools")?.quantity).toBe("3");
    expect(rows.has("slab-full:08:material:rebar-d12")).toBe(true);
    expect(rows.has("slab-full:07:material:formwork-panels")).toBe(true);
    expect(rows.has("slab-full:02:equipment:excavator")).toBe(true);
  });

  it("changes perimeter resources without changing area resources", async () => {
    const derived = rowMap((await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
    })).rows);
    const explicit = rowMap((await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
      plan_perimeter_m: 120,
    })).rows);

    expect(derived.get("slab-full:01:material:marking-cord")?.quantity).toBe("180");
    expect(explicit.get("slab-full:01:material:marking-cord")?.quantity).toBe("240");
    expect(explicit.get("slab-full:07:fastener:ties")?.quantity)
      .not.toBe(derived.get("slab-full:07:fastener:ties")?.quantity);
    expect(explicit.get("slab-full:09:material:ready-mix")?.quantity)
      .toBe(derived.get("slab-full:09:material:ready-mix")?.quantity);
    expect(explicit.get("slab-full:04:material:sand")?.quantity)
      .toBe(derived.get("slab-full:04:material:sand")?.quantity);
  });

  it("derives perimeter inside the published backend graph when only area changes", async () => {
    const result = await compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "slab-foundation-published-graph-contract",
      catalogId: "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
      primaryMeasureParameterId: "slab_area_m2",
      parameterDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS],
      formulaDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS],
      resourceDefinitions: [...SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES],
      submittedParameters: { slab_area_m2: 1_000 },
      confirmedParameters: { ...SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT },
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES.length,
      hashJson: async (value) => estimateDeterministicHash(value),
    });
    const rows = rowMap(result.rows);

    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(rows.get("slab-full:01:material:marking-cord")?.quantity).toBe("254.558441224");
    expect(rows.get("slab-full:09:material:ready-mix")?.quantity).toBe("216");
  });

  it("recalculates thickness-dependent concrete and the explicitly labelled reinforcement budget", async () => {
    const standard = rowMap((await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
    })).rows);
    const thicker = rowMap((await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
      slab_thickness_mm: 250,
    })).rows);

    expect(standard.get("slab-full:09:material:ready-mix")?.quantity).toBe("108");
    expect(thicker.get("slab-full:09:material:ready-mix")?.quantity).toBe("135");
    expect(standard.get("slab-full:08:material:rebar-d12")?.quantity).toBe("10368");
    expect(thicker.get("slab-full:08:material:rebar-d12")?.quantity).toBe("12960");
    expect(thicker.get("slab-full:08:material:rebar-d12")?.title_ru)
      .toMatch(/предварительн|бюджетн/iu);
    expect(thicker.get("slab-full:11:consumable:test-sets")?.quantity).toBe("3");
  });

  it("keeps drainage, waterproofing, insulation and curing alternatives mutually applicable", async () => {
    const noDrainage = await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
      drainage_selected: false,
    });
    expect(noDrainage.rows.some((row) => row.row_id === "slab-full:03:material:drain-pipe"))
      .toBe(false);
    expect(slabFullCycleMissingRequiredRows(
      new Set(noDrainage.rows.map((row) => row.row_id)),
      { drainageSelected: false },
    )).toEqual([]);

    const sheet = await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
      curing_method: "SHEET",
    });
    expect(sheet.rows.some((row) => row.row_id === "slab-full:10:material:curing-sheet-rolls"))
      .toBe(true);
    expect(sheet.rows.some((row) => row.row_id === "slab-full:10:material:liquid-curing-packages"))
      .toBe(false);

    const water = await compileSlabFoundationFullCycleS2719({
      slab_area_m2: 500,
      curing_method: "WATER",
    });
    expect(water.rows.some((row) => row.row_id === "slab-full:10:material:curing-water"))
      .toBe(true);
    expect(water.rows.some((row) => row.row_id === "slab-full:10:material:curing-sheet-rolls"))
      .toBe(false);
  });

  it("detects removal of every independently required row", async () => {
    const result = await compileSlabFoundationFullCycleS2719({ slab_area_m2: 500 });
    const allIds = new Set(result.rows.map((row) => row.row_id));
    for (const entry of SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries) {
      for (const requiredRowId of entry.requiredRowIds) {
        const mutated = new Set(allIds);
        mutated.delete(requiredRowId);
        expect(slabFullCycleMissingRequiredRows(mutated)).toContain(requiredRowId);
      }
    }
  });
});
