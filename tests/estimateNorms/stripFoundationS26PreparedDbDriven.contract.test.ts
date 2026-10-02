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
const TARGET_CATALOG_ID = "canonical-work:expanded:strip_foundation";
const HISTORICAL_REVISION_ID = "fe215c4c-5b7f-40a0-a27a-6ef99bd847e4";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);

const sha256 = async (value: unknown): Promise<string> => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex");

describe("S27.3 prepared strip-foundation definition from the local database", () => {
  test("recompiles the saved 150 m revision without professional quantity questions", async () => {
    const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    expect(current.definitionReleaseStatus).toBe("prepared");
    expect(current.productionAccessed).toBe(false);
    expect(typeof current.owner).toBe("string");
    expect(current.owner).not.toHaveLength(0);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const definition = (await client.query(`
        select release.status release_status,release.parent_release_id::text,
          manifest.definition_version_id::text id,manifest.approved_template_baseline_id::text baseline_id,
          manifest.baseline_ready,manifest.scenario_ready,
          version.definition_version,version.source_metadata,baseline.input_values,baseline.input_classification
        from public.estimate_definition_release release
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id
        where release.id=$1 and manifest.catalog_id=$2
      `, [current.definitionReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      expect(definition).toMatchObject({
        release_status: "prepared",
        definition_version: 14,
        baseline_ready: true,
        scenario_ready: true,
      });
      expect(definition.source_metadata.contract).toBe(
        "rik-expo-app.r4-a13-6.strip-foundation-professional-composition-successor.v7",
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
      expect([parameters.length, formulas.length, resourceRows.length]).toEqual([120, 58, 76]);
      expect(resourceRows).toEqual(expect.arrayContaining([
        expect.objectContaining({ row_id: "material:concrete:curing-water" }),
        expect.objectContaining({ row_id: "delivery:formwork:return-kit" }),
        expect.objectContaining({
          row_id: "document:foundation:as-built-survey-record",
          category: "document",
          row_type: "service",
        }),
        expect.objectContaining({ row_id: "material:waterproofing:horizontal-cutoff" }),
        expect.objectContaining({ row_id: "material:earthworks:excavation-support" }),
        expect.objectContaining({ row_id: "service:foundation:construction-waste-disposal" }),
      ]));

      const defaultParameters = parameters.filter((parameter) => parameter.default_value != null);
      expect(defaultParameters.length).toBeGreaterThan(0);
      expect(defaultParameters.every((parameter) => {
        const provenance = parameter.truth_metadata?.provenance;
        return parameter.approved_template_baseline_id === definition.baseline_id
          && provenance != null
          && typeof provenance === "object"
          && (provenance as Json).baselineOwner === "approved-template-baseline:r54"
          && (provenance as Json).approvedTemplateBaselineId === definition.baseline_id;
      })).toBe(true);
      expect(resourceRows.filter((resource) =>
        resource.resource_graph?.costTreatment === "INCLUDED_IN_RESOURCE_ROWS",
      ).length).toBeGreaterThan(0);

      const revision = (await client.query(`
        select input_parameters from public.estimate_revision where id=$1
      `, [HISTORICAL_REVISION_ID])).rows[0] as Json;
      expect(revision?.input_parameters).toBeTruthy();

      const baselineParameters = canonicalApprovedBaselineRuntimeParameters({
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
        compilerVersion: "s27-3-strip-foundation-prepared-db-driven-contract-test",
        catalogId: TARGET_CATALOG_ID,
        primaryMeasureParameterId: "total_axis_length_m",
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters: revision.input_parameters,
        confirmedParameters: baselineParameters,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        priceItems: [],
        rowOverrides: {},
        customRows: [],
        maximumResourceRows: 200,
        hashJson: sha256,
      });

      expect(result.preliminaryNeeds).toEqual([]);
      expect(result.rows).toHaveLength(41);
      expect(result.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(result.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ row_id: "main_concrete", quantity: "150", unit_id: "m3" }),
        expect.objectContaining({
          row_id: "material:reinforcement:spacer-chairs",
          quantity: "2400",
          unit_id: "piece",
        }),
        expect.objectContaining({
          row_id: "work:foundation:axis-setting-out-control",
          quantity: "150",
          unit_id: "m",
        }),
        expect.objectContaining({ row_id: "material:formwork:release-agent", quantity: "6", unit_id: "l" }),
        expect.objectContaining({ row_id: "bituminous_waterproofing", quantity: "2000", unit_id: "l" }),
        expect.objectContaining({
          row_id: "material:waterproofing:system-primer",
          quantity: "25",
          unit_id: "l",
        }),
        expect.objectContaining({
          row_id: "material:waterproofing:detail-reinforcement",
          quantity: "550",
          unit_id: "m2",
        }),
      ]));
    } finally {
      await client.end();
    }
  }, 60_000);
});
