import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";

import {STANDARD_ASPHALT_COMPACTION_R567_CATALOG_ID,STANDARD_ASPHALT_COMPACTION_R567_AREA,STANDARD_ASPHALT_COMPACTION_R567_METHOD,STANDARD_ASPHALT_COMPACTION_R567_PACK as pack} from "../../src/lib/estimate/v4/standardAsphaltCompactionR567";

type Json = Record<string, any>;
type ParameterRow = CanonicalEstimateParameterDefinition & Json;
type FormulaRow = CanonicalEstimateFormulaDefinition & Json;
type ResourceRow = CanonicalEstimateResourceDefinition & Json & { _binding_price_keys: string[] };

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve(
  process.env.R4A13_CURRENT_RELEASE_PATH ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

const sha256 = async (value: unknown): Promise<string> => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

describe("S26.4 prepared detailed asphalt-compaction definition from the local database", () => {
  test("compiles 5000 m2 from the persisted area plus the replaceable runtime profile", async () => {
    const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    expect(current).toMatchObject({
      definitionReleaseStatus: "prepared",
      productionAccessed: false,
    });
    // The pointer follows the newest cumulative successor. A later foundation
    // or concrete-placement publisher must not make this persisted asphalt
    // definition look stale; its own contract and rows are asserted below.
    expect(String(current.owner ?? "")).not.toHaveLength(0);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const definition = (await client.query(`
        select release.status release_status,release.activated_at,
          manifest.definition_version_id::text id,
          manifest.approved_template_baseline_id::text baseline_id,
          manifest.baseline_ready,manifest.scenario_ready,
          version.source_metadata,version.passport,
          content_passport.decision content_passport_decision,
          baseline.input_values,baseline.input_classification
        from public.estimate_definition_release release
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id
        join public.estimate_content_passport_r3 content_passport
          on content_passport.definition_version_id=manifest.definition_version_id
        where release.id=$1 and manifest.catalog_id=$2
      `, [current.definitionReleaseId, STANDARD_ASPHALT_COMPACTION_R567_CATALOG_ID])).rows[0] as Json;
      expect(definition).toMatchObject({
        release_status: "prepared",
        activated_at: null,
        baseline_ready: true,
        scenario_ready: true,
      });
      expect(definition.source_metadata.contract).toBe(
        pack.contract,
      );
      expect(definition.content_passport_decision.independentCompletenessMap).toMatchObject({
        contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
        generatedFromCurrentRows: false,
      });

      const parameters = (await client.query(`
        select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal
      `, [definition.id])).rows as ParameterRow[];
      const formulas = (await client.query(`
        select formula_id,ast,input_parameter_ids,ast_sha256
        from public.estimate_formula_graph where definition_version_id=$1 order by formula_id
      `, [definition.id])).rows as FormulaRow[];
      const resourceRows = (await client.query(`
        select resource.*,
          coalesce(binding.price_keys,'{}'::text[]) _binding_price_keys
        from public.estimate_resource_spec resource
        left join lateral (
          select array_agg(distinct route.price_key order by route.price_key) price_keys
          from public.estimate_resource_price_route_binding route
          where route.resource_spec_id=resource.id
        ) binding on true
        where resource.definition_version_id=$1 order by resource.ordinal
      `, [definition.id])).rows as ResourceRow[];
      expect([parameters.length, formulas.length, resourceRows.length]).toEqual([24, 21, 59]);

      const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters({
        input_values: definition.input_values,
        input_classification: definition.input_classification,
      });
      expect(runtimeBaseline).not.toHaveProperty("area_m2");
      expect(Object.keys(runtimeBaseline)).toHaveLength(15);
      expect(runtimeBaseline[STANDARD_ASPHALT_COMPACTION_R567_METHOD]).toBe(pack.profileVersion);
      for(const id of [STANDARD_ASPHALT_COMPACTION_R567_AREA,'r567_compaction_traffic_control_setup_count','r567_compaction_mobilization_count_per_unique_machine'])expect(runtimeBaseline).not.toHaveProperty(id);
      for(const id of [STANDARD_ASPHALT_COMPACTION_R567_AREA,'r567_compaction_traffic_control_setup_count','r567_compaction_mobilization_count_per_unique_machine'])expect(parameters.find(p=>p.parameter_id===id)?.default_value).toBeNull();
      expect(new Set(Object.values(definition.input_classification))).toEqual(
        new Set(["VALIDATION_FIXTURE", "NORMATIVE", "ASSUMPTION", "DERIVED", "RUNTIME_STRUCTURAL_DEFAULT"]),
      );

      const resources = bindCanonicalEstimateResourcePriceKeys(
        resourceRows,
        resourceRows.flatMap((resource) => (resource._binding_price_keys as string[]).map((priceKey) => ({
          resource_spec_id: String(resource.id),
          price_key: String(priceKey),
        }))),
      );
      const result = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s26-3-asphalt-compaction-prepared-db-driven-contract-test",
        catalogId: STANDARD_ASPHALT_COMPACTION_R567_CATALOG_ID,
        primaryMeasureParameterId: STANDARD_ASPHALT_COMPACTION_R567_AREA,
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters: { [STANDARD_ASPHALT_COMPACTION_R567_AREA]:5_000,r567_compaction_traffic_control_setup_count:1,r567_compaction_mobilization_count_per_unique_machine:1 },
        confirmedParameters: runtimeBaseline,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        priceItems: [],
        rowOverrides: {},
        customRows: [],
        maximumResourceRows: 200,
        hashJson: sha256,
      });

      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows).toHaveLength(49);
      expect(result.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(result.rows).toEqual(expect.arrayContaining([
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
          row_id: "asphalt-compaction:included:wetting-water:breakdown",
          quantity: "3.472222222",
          included_in_estimate: false,
        }),
      ]));
      expect(result.totals).toMatchObject({
        pricedRowCount: 0,
        unpricedRowCount: 16,
      });
      expect(result.rows.filter((row) => row.included_in_estimate && row.unit_price == null))
        .toHaveLength(16);
    } finally {
      await client.end();
    }
  }, 60_000);
});
