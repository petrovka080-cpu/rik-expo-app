import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import {
  ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID,
  ASPHALT_LEVEL_SMALL_AREA_S2716_FORMULAS,
  ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS,
  ASPHALT_LEVEL_SMALL_AREA_S2716_RESOURCES,
  ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT,
  ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_SOURCE_IDS,
  ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID,
} from "../../src/lib/estimate/v4/asphaltLevelSmallAreaS2716";

type Json = Record<string, any>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

describe("S27.21 asphalt-level 27-06-019-02 independent owner", () => {
  test("matches the accepted persisted graph instead of inheriting the 27-06-020 profile", async () => {
    const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const definition = (await client.query(`
        select manifest.definition_version_id::text id,
          version.source_metadata,baseline.input_values,baseline.normative_source_ids
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version version
          on version.id=manifest.definition_version_id
        join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id
        where manifest.release_id=$1 and manifest.catalog_id=$2
      `, [current.definitionReleaseId, ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID])).rows[0] as Json;

      expect(definition.source_metadata).toMatchObject({
        sourceId: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID,
        normId: "KRER-27-06-019-02-THICKNESS-INCREMENTS-S27-16",
      });

      const parameters = (await client.query(`
        select parameter_id from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal
      `, [definition.id])).rows.map((row) => row.parameter_id);
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS.map(
        (parameter) => parameter.parameter_id,
      )).toEqual(parameters);

      const formulas = (await client.query(`
        select formula_id,expression_source
        from public.estimate_formula_graph
        where definition_version_id=$1 order by formula_id
      `, [definition.id])).rows;
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_FORMULAS.map((formula) => ({
        formula_id: formula.formula_id,
        expression_source: formula.expression_source,
      }))).toEqual(formulas);

      const resources = (await client.query(`
        select row_id,formula_id
        from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal
      `, [definition.id])).rows;
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RESOURCES.map((resource) => ({
        row_id: resource.row_id,
        formula_id: resource.formula_id,
      }))).toEqual(resources);

      const runtimeBaseline = Object.fromEntries(Object.entries(definition.input_values)
        .filter(([parameterId]) => !["area_m2", "layer_thickness_mm"].includes(parameterId)));
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT).toEqual(runtimeBaseline);
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT).toMatchObject({
        krer_base_thickness_mm: 30,
        asphalt_mix_base_t_per_1000m2: 70.6,
        asphalt_mix_increment_t_per_1000m2: 11.8,
        towing_wire_t_per_1000m2: 0.00613,
        tractor_brush_machine_h_per_1000m2: 0.75,
        surface_grinder_increment_machine_h_per_1000m2: 0.04,
      });
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT)
        .not.toHaveProperty("roller_13t_machine_h_per_1000m2");
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT)
        .not.toHaveProperty("watering_machine_h_per_1000m2");
      expect(ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_SOURCE_IDS)
        .toEqual(Object.fromEntries(Object.entries(definition.normative_source_ids)
          .filter(([parameterId]) => !["area_m2", "layer_thickness_mm"].includes(parameterId))));
    } finally {
      await client.end();
    }
  }, 60_000);
});
