import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { validateIndependentCompletenessMapReferences } from
  "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import {
  ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_COMPACTION_PROFILE_CATALOG_ID,
  ASPHALT_COMPACTION_PROFILE_FORMULAS,
  ASPHALT_COMPACTION_PROFILE_PARAMETERS,
  ASPHALT_COMPACTION_PROFILE_RESOURCES,
  ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
  ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  compileAsphaltCompactionPreliminaryProfileR1,
} from "../../src/lib/estimate/v4/asphaltCompactionPreliminaryProfileR1";

type Json = Record<string, any>;

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json",
);

describe("S26.4 detailed asphalt compaction preliminary profile", () => {
  test("binds the independent source pack by its exact byte hash", () => {
    const bytes = readFileSync(SOURCE_PACK_PATH);
    const sourcePack = JSON.parse(bytes.toString("utf8")) as Json;
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(ASPHALT_COMPACTION_SOURCE_PACK_SHA256);
    expect(sourcePack).toMatchObject({
      schemaVersion: "rik-expo-app.s26-4.asphalt-compaction-source-pack.v2",
      authoredIndependentlyFromDefinitionRows: true,
    });
    expect(ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP).toMatchObject({
      contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
      sourceKind: "TECHNOLOGY_MAP",
      generatedFromCurrentRows: false,
      evidenceSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
    });
    expect(ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(sourcePack.independentRequiredComponents.length);
  });

  test("publishes one connected detailed quantity model without scalar productivity fixtures", () => {
    expect(ASPHALT_COMPACTION_PROFILE_CATALOG_ID)
      .toBe("canonical-work:base:paving_roads_landscape_interior_asphalt_compact_standard");
    expect(ASPHALT_COMPACTION_PROFILE_PARAMETERS).toHaveLength(15);
    expect(ASPHALT_COMPACTION_PROFILE_FORMULAS).toHaveLength(11);
    expect(ASPHALT_COMPACTION_PROFILE_RESOURCES.length).toBeGreaterThan(11);
    expect(new Set(ASPHALT_COMPACTION_PROFILE_RESOURCES.map((row) => row.row_id)).size)
      .toBe(ASPHALT_COMPACTION_PROFILE_RESOURCES.length);
    expect(JSON.stringify(ASPHALT_COMPACTION_PROFILE_PARAMETERS))
      .not.toMatch(/productivity_m2_per_(?:machine|man)_hour/iu);
    expect(JSON.stringify(ASPHALT_COMPACTION_PROFILE_FORMULAS))
      .toContain("area_m2*breakdown_coverages/(roller_speed_km_h*1000*breakdown_roller_width_m*utilization_factor)");
  });

  test("fails independent completeness when any mapped resource is removed", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: ASPHALT_COMPACTION_PROFILE_FORMULAS as readonly Json[],
      resourceDefinitions: ASPHALT_COMPACTION_PROFILE_RESOURCES as readonly Json[],
    })).toEqual([]);

    for (const removed of ASPHALT_COMPACTION_PROFILE_RESOURCES) {
      const errors = validateIndependentCompletenessMapReferences({
        completenessMap: ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP,
        formulaDefinitions: ASPHALT_COMPACTION_PROFILE_FORMULAS as readonly Json[],
        resourceDefinitions: ASPHALT_COMPACTION_PROFILE_RESOURCES.filter(
          (candidate) => candidate.row_id !== removed.row_id,
        ) as readonly Json[],
      });
      expect({ removed: removed.row_id, errors }).toEqual({
        removed: removed.row_id,
        errors: expect.arrayContaining([
          expect.stringMatching(/_(?:ROW|PARENT_ROW)_REFERENCE$/u),
        ]),
      });
    }
  });

  test("returns the complete first estimate from area plus the visible runtime profile", async () => {
    const compiled = await compileAsphaltCompactionPreliminaryProfileR1({
      ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(ASPHALT_COMPACTION_PROFILE_RESOURCES.length);
    expect(compiled.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        row_id: "rc09:asphalt_compaction_breakdown_roller",
        quantity: "3.472222222",
        unit_id: "machine_hour",
      }),
      expect.objectContaining({
        row_id: "rc09:asphalt_compaction_intermediate_roller",
        quantity: "1.479640152",
        unit_id: "machine_hour",
      }),
      expect.objectContaining({
        row_id: "rc09:asphalt_compaction_finish_roller",
        quantity: "1.736111111",
        unit_id: "machine_hour",
      }),
      expect.objectContaining({
        row_id: "asphalt-compaction:quality:main-mat-density",
        quantity: "5",
        unit_id: "pcs",
      }),
      expect.objectContaining({
        row_id: "rc09:asphalt_compaction_crew",
        quantity: "13.888888888",
        unit_id: "man_hour",
      }),
      expect.objectContaining({
        row_id: "asphalt-compaction:included:wetting-water:breakdown",
        quantity: "3.472222222",
        included_in_estimate: false,
      }),
      expect.objectContaining({
        row_id: "asphalt-compaction:mobilization:intermediate-roller",
        quantity: "1",
        unit_id: "service",
      }),
    ]));
    expect(compiled.rows.filter((row) => row.category === "material").length).toBeGreaterThan(0);
    expect(compiled.rows.filter((row) => row.category === "construction_work").length).toBeGreaterThan(0);
    expect(compiled.rows.filter((row) => row.category === "equipment").length).toBeGreaterThan(0);
  });

  test("allows project data to replace preliminary assumptions", async () => {
    const compiled = await compileAsphaltCompactionPreliminaryProfileR1({
      ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
      breakdown_coverages: 6,
      roller_speed_km_h: 4,
      utilization_factor: 0.75,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toContainEqual(expect.objectContaining({
      row_id: "rc09:asphalt_compaction_breakdown_roller",
      quantity: "6.666666667",
    }));
  });

  test("rejects invalid profile values and adjacent catalog identities", async () => {
    await expect(compileAsphaltCompactionPreliminaryProfileR1({
      ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
      utilization_factor: 1.1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAsphaltCompactionPreliminaryProfileR1(
      { ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT },
      { catalogId: `${ASPHALT_COMPACTION_PROFILE_CATALOG_ID}:paving` },
    )).rejects.toThrow("ASPHALT_COMPACTION_PROFILE_CATALOG_UNSUPPORTED");
  });
});


test("the three-roller method rejects the retired area catalog", async () => {
  await expect(compileAsphaltCompactionPreliminaryProfileR1(
    { ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT },
    { catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_large_area" },
  )).rejects.toThrow("ASPHALT_COMPACTION_PROFILE_CATALOG_UNSUPPORTED");
});
