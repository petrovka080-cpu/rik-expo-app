import { Client } from "pg";

type Json = Record<string, unknown>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFINITION_IDS = String(process.env.R4A13_DEFINITION_VERSION_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const RELEASE_ID = process.env.R4A13_DEFINITION_RELEASE_ID
  ?? "c26dc62b-7473-50c5-b6cf-f06bda839f44";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`CATALOG_SOURCE_OWNERSHIP_INSPECTION:${code}`);
}

async function main(): Promise<void> {
  invariant(DEFINITION_IDS.length > 0, "DEFINITION_VERSION_IDS_REQUIRED");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const definitions = (await client.query(
      `select definition.id::text definition_version_id,definition.catalog_id,
        definition.definition_version,definition.passport
       from public.estimate_definition_version definition
       where definition.id=any($1::uuid[])
       order by definition.catalog_id`,
      [DEFINITION_IDS],
    )).rows as Json[];
    const resources = (await client.query(
      `select resource.id::text resource_spec_id,resource.definition_version_id::text,
        resource.row_id,resource.formula_id,resource.resource_graph,resource.source_metadata
       from public.estimate_resource_spec resource
       where resource.definition_version_id=any($1::uuid[])
       order by resource.definition_version_id,resource.ordinal`,
      [DEFINITION_IDS],
    )).rows as Json[];
    const normalizedBindings = (await client.query(
      `select binding.definition_version_id::text,binding.resource_spec_id::text,
        binding.applicability,locator.locator_key,locator.locator,
        source.source_key,source.artifact_sha256,
        source.metadata source_metadata
       from public.estimate_work_normative_binding binding
       join public.estimate_normative_locator locator on locator.id=binding.locator_id
       join public.estimate_normative_source source on source.id=locator.source_id
       where binding.definition_version_id=any($1::uuid[])
       order by binding.definition_version_id,binding.resource_spec_id`,
      [DEFINITION_IDS],
    )).rows as Json[];
    const parameters = (await client.query(
      `select parameter.definition_version_id::text,parameter.parameter_id,
        parameter.value_type,parameter.truth_metadata
       from public.estimate_parameter_definition parameter
       where parameter.definition_version_id=any($1::uuid[])
       order by parameter.definition_version_id,parameter.ordinal`,
      [DEFINITION_IDS],
    )).rows as Json[];
    const baselines = (await client.query(
      `select manifest.definition_version_id::text,baseline.input_values,
        baseline.input_classification,baseline.normative_source_ids,
        baseline.validation_scenario_refs,baseline.acceptance_evidence_sha256
       from public.estimate_cumulative_manifest_entry manifest
       join public.estimate_approved_template_baseline baseline
         on baseline.id=manifest.approved_template_baseline_id
       where manifest.release_id=$1 and manifest.definition_version_id=any($2::uuid[])
       order by manifest.definition_version_id`,
      [RELEASE_ID, DEFINITION_IDS],
    )).rows as Json[];

    const result = definitions.map((definition) => {
      const definitionVersionId = String(definition.definition_version_id);
      return {
        ...definition,
        approvedBaseline: baselines.find((baseline) =>
          String(baseline.definition_version_id) === definitionVersionId) ?? null,
        professionalParameters: parameters.filter((parameter) =>
          String(parameter.definition_version_id) === definitionVersionId
          && /(?:^quantity_|productivity|consumption|worker_h|machine_h|_rate_|_kg_m|_item_m2)/u
            .test(String(parameter.parameter_id))),
        resources: resources
          .filter((resource) => String(resource.definition_version_id) === definitionVersionId)
          .map((resource) => ({
            resourceSpecId: resource.resource_spec_id,
            rowId: resource.row_id,
            formulaId: resource.formula_id,
            professionalPhysicalNormBindingV1:
              (resource.resource_graph as Json | undefined)?.professionalPhysicalNormBindingV1 ?? null,
            normativeTrace: (resource.source_metadata as Json | undefined)?.normativeTrace ?? [],
          })),
        normalizedBindings: normalizedBindings.filter((binding) =>
          String(binding.definition_version_id) === definitionVersionId),
      };
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
