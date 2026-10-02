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

type Json = Record<string, any>;
type ParameterRow = CanonicalEstimateParameterDefinition & Json;
type FormulaRow = CanonicalEstimateFormulaDefinition & Json;
type ResourceRow = CanonicalEstimateResourceDefinition & Json & { _binding_price_keys: string[] };

const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const TARGET_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_large_area";
const HISTORICAL_REVISION_ID = "65dbc2bd-238b-4666-b2d2-430f30097331";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

const sha256 = async (value: unknown): Promise<string> => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

describe("S26 prepared separate strip-foundation concrete placement definition", () => {
  test("recompiles the saved 150 m scenario without blocked professional quantities", async () => {
    const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    expect(current).toMatchObject({
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      productionAccessed: false,
    });
    expect(typeof current.owner).toBe("string");
    expect(current.owner).not.toHaveLength(0);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const definition = (await client.query(`
        select release.status release_status,manifest.definition_version_id::text id,
          manifest.approved_template_baseline_id::text baseline_id,
          manifest.baseline_ready,manifest.scenario_ready,version.source_metadata,
          baseline.input_values,baseline.input_classification
        from public.estimate_definition_release release
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id
        where release.id=$1 and manifest.catalog_id=$2
      `, [current.definitionReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      expect(definition).toMatchObject({
        release_status: "prepared",
        baseline_ready: true,
        scenario_ready: true,
      });
      expect(definition.source_metadata.contract).toBe(
        "rik-expo-app.s26-4.master-strip-foundation-concrete-placement-complete-successor.v1",
      );

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
          select array_agg(distinct route_binding.price_key order by route_binding.price_key) price_keys
          from public.estimate_resource_price_route_binding route_binding
          where route_binding.resource_spec_id=resource.id
        ) binding on true
        where resource.definition_version_id=$1 order by resource.ordinal
      `, [definition.id])).rows as ResourceRow[];
      expect([parameters.length, formulas.length, resourceRows.length]).toEqual([25, 16, 38]);

      const runtimeProfileParameters = parameters.filter((parameter) =>
        ["NORMATIVE", "ASSUMPTION", "DERIVED"].includes(
          String(definition.input_classification[parameter.parameter_id]),
        ));
      expect(runtimeProfileParameters).toHaveLength(15);
      expect(runtimeProfileParameters.every((parameter) =>
        parameter.default_value == null
          && parameter.approved_template_baseline_id === definition.baseline_id,
      )).toBe(true);

      const revision = (await client.query(`
        select input_parameters from public.estimate_revision where id=$1
      `, [HISTORICAL_REVISION_ID])).rows[0] as Json;
      expect(revision?.input_parameters).toMatchObject({
        plan_dimension_concrete_volume_m3: 240,
        selected_contingency_percent: 8,
        placement_method: "pump",
      });

      const confirmedParameters = canonicalApprovedBaselineRuntimeParameters({
        input_values: definition.input_values,
        input_classification: definition.input_classification,
      });
      const resources = bindCanonicalEstimateResourcePriceKeys(
        resourceRows,
        resourceRows.flatMap((resource) => (resource._binding_price_keys as string[]).map((priceKey) => ({
          resource_spec_id: String(resource.id),
          price_key: String(priceKey),
        }))),
      );
      const result = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s26-strip-foundation-concrete-placement-prepared-db-driven-contract-test",
        catalogId: TARGET_CATALOG_ID,
        primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters: revision.input_parameters,
        confirmedParameters,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        priceItems: [],
        rowOverrides: {},
        customRows: [],
        maximumResourceRows: resourceRows.length,
        hashJson: sha256,
      });

      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows).toHaveLength(36);
      expect(result.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(result.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          row_id: "strip-pour:material:ready-mix",
          quantity: "259.2",
          unit_id: "m3",
        }),
        expect.objectContaining({
          row_id: "strip-pour:equipment:pump",
          quantity: "7.5",
          unit_id: "machine_hour",
        }),
        expect.objectContaining({
          row_id: "strip-pour:equipment:vibrator",
          quantity: "63.84",
          unit_id: "machine_hour",
        }),
        expect.objectContaining({
          row_id: "strip-pour:delivery:mixer-trips",
          quantity: "33",
          unit_id: "service",
        }),
        expect.objectContaining({
          row_id: "strip-pour:quality:compression",
          quantity: "5",
          unit_id: "pcs",
        }),
      ]));
      expect(result.rows.map((row) => `${row.row_id}:${row.title_ru}`).join("|"))
        .not.toMatch(/excavation|reinforc(?:ement|ing)|formwork/iu);
    } finally {
      await client.end();
    }
  }, 60_000);
});
