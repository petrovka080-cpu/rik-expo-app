import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { buildCanonicalBaselinePlan } from
  "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";

type Json = Record<string, any>;

const RELEASE_ID = "a76ff40a-8030-5ee4-a83b-11ec0828fee4";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EVIDENCE_MAP_PATH = resolve(
  ".release-runtime/r4a13-6/s19-first-estimate/master-benchmark-evidence-map-v1/master-benchmark-evidence-map.json",
);

describe("MASTER-30 current prompt/schema ingress DB preflight", () => {
  test("selects a formula-connected primary measure for every current benchmark", async () => {
    const evidenceMap = JSON.parse(readFileSync(EVIDENCE_MAP_PATH, "utf8")) as Json;
    const mappings = evidenceMap.mappedBenchmarks as Json[];
    expect(mappings).toHaveLength(30);
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      const rows = (await client.query(`
        select definition.catalog_id,definition.definition_version,
          parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
          parameter.title_ru,parameter.required,parameter.default_value,
          parameter.constraints_json,parameter.truth_metadata
        from estimate_cumulative_manifest_entry manifest
        join estimate_definition_version definition on definition.id=manifest.definition_version_id
        join estimate_parameter_definition parameter on parameter.definition_version_id=definition.id
        where manifest.release_id=$1 and definition.catalog_id=any($2::text[])
        order by definition.catalog_id,parameter.ordinal
      `, [RELEASE_ID, mappings.map((mapping) => mapping.currentCatalogId)])).rows as Json[];
      const byCatalog = new Map<string, Json[]>();
      for (const row of rows) {
        const catalogRows = byCatalog.get(String(row.catalog_id)) ?? [];
        catalogRows.push(row);
        byCatalog.set(String(row.catalog_id), catalogRows);
      }
      const outcomes = mappings.map((mapping) => {
        const catalogId = String(mapping.currentCatalogId);
        const parameterRows = byCatalog.get(catalogId) ?? [];
        expect(parameterRows.length).toBeGreaterThan(0);
        const parameterSchema = parameterRows.map((row) => {
          const truth = (row.truth_metadata ?? {}) as Json;
          return {
            parameterId: String(row.parameter_id),
            ordinal: Number(row.ordinal),
            valueType: String(row.value_type),
            unitId: row.unit_id == null ? null : String(row.unit_id),
            titleRu: String(row.title_ru),
            required: Boolean(row.required),
            defaultValue: row.default_value,
            constraints: row.constraints_json ?? {},
            semanticParameterKey: String(truth.semantic_parameter_key ?? row.parameter_id),
            visibilityRole: truth.visibility_role,
            valueSourceRole: truth.value_source_role,
            preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
            normativeLinks: [],
            formulaConsumers: Array.isArray(truth.formula_consumers) ? truth.formula_consumers : [],
            resourceBranchConsumers: Array.isArray(truth.resource_branch_consumers)
              ? truth.resource_branch_consumers
              : [],
            validationRules: [],
            provenance: truth,
            guide: truth.guide,
          };
        }) as CanonicalEstimateCatalogItem["parameterSchema"];
        const catalog = {
          catalogId,
          workKey: catalogId.replace(/^canonical-work:(?:base|expanded):/u, ""),
          definitionVersion: Number(parameterRows[0].definition_version),
          parameterSchema,
        } as unknown as CanonicalEstimateCatalogItem;
        const plan = buildCanonicalBaselinePlan({
          catalog,
          prompt: String(mapping.historicalPromptRu),
        });
        const primary = parameterSchema.find(
          (parameter) => parameter.parameterId === plan.primaryMeasureParameterId,
        );
        if ((primary?.formulaConsumers?.length ?? 0) === 0) {
          throw new Error(`PRIMARY_FORMULA_DISCONNECTED:${String(mapping.ordinal)}:${plan.primaryMeasureParameterId}`);
        }
        return {
          ordinal: Number(mapping.ordinal),
          primaryMeasureParameterId: plan.primaryMeasureParameterId,
          extractedParameterCount: Object.keys(plan.parameters).length,
        };
      });
      expect(outcomes).toHaveLength(30);
      expect(outcomes.filter((outcome) => outcome.extractedParameterCount > 0)).toHaveLength(30);
    } finally {
      await client.end();
    }
  }, 120_000);
});
