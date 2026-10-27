import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { validateIndependentCompletenessMapReferences } from
  "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";
import { canonicalApprovedBaselineRuntimeParameters } from
  "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  bindCanonicalEstimateResourcePriceKeys,
  compileCanonicalEstimateCore,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { ASPHALT_INSTALL_KRER27_CATALOG_ID } from
  "../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1";

import {asphaltInstallExistingStandardPackR564 as pack} from "../../src/lib/estimate/v4/asphaltInstallExistingStandardR564";

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

describe("current prepared full asphalt-install definition from the local database", () => {
  test("compiles the persisted independent composition for 5000 m2", async () => {
    const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    expect(current).toMatchObject({
      definitionReleaseStatus: "prepared",
      productionAccessed: false,
    });
    // The pointer follows the newest cumulative successor. The exact asphalt
    // definition identity is its persisted source contract, checked below.
    expect(String(current.owner ?? "")).not.toHaveLength(0);

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const definition = (await client.query(`
        select release.status release_status,release.activated_at,
          manifest.definition_version_id::text id,
          manifest.approved_template_baseline_id::text baseline_id,
          manifest.baseline_ready,manifest.scenario_ready,
          version.definition_version,version.source_metadata,version.passport,
          content_passport.decision content_passport_decision,
          baseline.input_values,baseline.input_classification,baseline.normative_source_ids
        from public.estimate_definition_release release
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id
        join public.estimate_content_passport_r3 content_passport
          on content_passport.definition_version_id=manifest.definition_version_id
        where release.id=$1 and manifest.catalog_id=$2
      `, [current.definitionReleaseId, ASPHALT_INSTALL_KRER27_CATALOG_ID])).rows[0] as Json;
      expect(definition).toMatchObject({
        release_status: "prepared",
        activated_at: null,
        baseline_ready: true,
        scenario_ready: true,
      });
      expect(Number.isInteger(Number(definition.definition_version))).toBe(true);
      expect(Number(definition.definition_version)).toBeGreaterThanOrEqual(10);
      expect(definition.source_metadata.contract).toBe(
        pack.contract,
      );
      const independentMap = definition.content_passport_decision.independentCompletenessMap;
      expect(independentMap).toMatchObject({
        contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
        generatedFromCurrentRows: false,
        evidenceSha256: "4d861329b43bb096533f97d9d75d3a745acc161b009a92dee31ee046d3fdbcd0",
      });

      const parameters = (await client.query(`
        select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal
      `, [definition.id])).rows as ParameterRow[];
      const formulas = (await client.query(`
        select formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
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
      expect([parameters.length, formulas.length, resourceRows.length]).toEqual([58, 50, 84]);
      expect(validateIndependentCompletenessMapReferences({
        completenessMap: independentMap,
        formulaDefinitions: formulas,
        resourceDefinitions: resourceRows,
      })).toEqual([]);
      const deletedMixErrors = validateIndependentCompletenessMapReferences({
        completenessMap: independentMap,
        formulaDefinitions: formulas,
        resourceDefinitions: resourceRows.filter((resource) =>
          resource.row_id !== pack.prefix+"asphalt:material:hot-dense-fine-mix"),
      });
      expect(deletedMixErrors).toContain("ENTRY_8_ROW_REFERENCE");

      const runtimeBaseline = canonicalApprovedBaselineRuntimeParameters({
        input_values: definition.input_values,
        input_classification: definition.input_classification,
      });
      expect(runtimeBaseline).not.toHaveProperty("area_m2");
      expect(runtimeBaseline).not.toHaveProperty(pack.areaId);
      expect(runtimeBaseline).not.toHaveProperty(pack.haulId);
      expect(runtimeBaseline).toHaveProperty(pack.selectorId, pack.selectedValueRu);
      expect(parameters.find(p=>p.parameter_id===pack.areaId)?.default_value).toBeNull();
      expect(parameters.find(p=>p.parameter_id===pack.selectorId)?.truth_metadata?.visibility_role).toBe("INTERNAL_ONLY");
      expect(definition.normative_source_ids[pack.prefix+"layer_thickness_mm"]).toEqual([pack.source.key]);
      expect(definition.normative_source_ids[pack.prefix+"asphalt_mix_base_t_per_1000m2"])
        .toEqual(["kg_krer_27_06_020_01_021_01_2015"]);

      const resources = bindCanonicalEstimateResourcePriceKeys(
        resourceRows,
        resourceRows.flatMap((resource) => (resource._binding_price_keys as string[]).map(
          (priceKey) => ({
            resource_spec_id: String(resource.id),
            price_key: String(priceKey),
          }),
        )),
      );
      const result = await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "s26-4-asphalt-install-prepared-db-driven-contract-test",
        catalogId: ASPHALT_INSTALL_KRER27_CATALOG_ID,
        primaryMeasureParameterId: pack.areaId,
        parameterDefinitions: parameters,
        formulaDefinitions: formulas,
        resourceDefinitions: resources,
        submittedParameters: { [pack.areaId]: 5_000, [pack.siteId]: pack.siteReadyRu, [pack.haulId]:20 },
        confirmedParameters: runtimeBaseline,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        priceItems: [],
        rowOverrides: {},
        customRows: [],
        maximumResourceRows: resourceRows.length,
        hashJson: sha256,
      });

      expect(result.preliminaryNeeds.map(need=>need.row_id).sort())
        .toEqual(pack.gaps.map(gap=>pack.prefix+"open:"+gap.id).sort());
      expect(result.rows.every(row=>row.row_id.startsWith(pack.prefix))).toBe(true);
      expect(result.rows).toHaveLength(56);
      expect(result.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
      expect(result.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({
          row_id: pack.prefix+"asphalt:material:hot-dense-fine-mix",
          quantity: "604",
          unit_id: "t",
        }),
        expect.objectContaining({
          row_id: pack.prefix+"asphalt:labor:road-workers",
          quantity: "192.4",
          unit_id: "man_hour",
        }),
        expect.objectContaining({
          row_id: pack.prefix+"asphalt:equipment:asphalt-paver",
          quantity: "15.95",
          unit_id: "machine_hour",
        }),
        expect.objectContaining({
          row_id: pack.prefix+"asphalt:delivery:truck-machine-hours",
          quantity: "46.5",
          included_in_estimate: true,
        }),
        expect.objectContaining({
          row_id: pack.prefix+"asphalt:delivery:truck-trips",
          quantity: "31",
          included_in_estimate: false,
        }),
      ]));
      expect(result.totals).toMatchObject({
        pricedRowCount: 0,
        unpricedRowCount: 26,
      });
    } finally {
      await client.end();
    }
  }, 60_000);
});
