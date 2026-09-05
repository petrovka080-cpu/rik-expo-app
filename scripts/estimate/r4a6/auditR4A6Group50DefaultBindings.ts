import { Client } from "pg";

const RELEASE_ID = "de952048-ed95-50c9-b776-68e5280a7e0d";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

type Json = Record<string, any>;

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function sameMembers(left: unknown, right: unknown): boolean {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return left.every((value) => right.includes(value)) && right.every((value) => left.includes(value));
}

function failureReasons(row: Json): string[] {
  const truth = record(row.truth_metadata);
  const provenance = record(truth.provenance);
  const binding = record(provenance.approvedTemplateBinding);
  const reasons: string[] = [];
  if (truth.value_source_role !== "VISIBLE_BASELINE_ASSUMPTION") reasons.push("VALUE_SOURCE_ROLE");
  if (!String(truth.baseline_assumption_id ?? "")) reasons.push("ASSUMPTION_ID");
  if (provenance.sourceCatalogId !== row.catalog_id) reasons.push("SOURCE_CATALOG");
  if (provenance.baselineOwner !== "approved-template-baseline:r54") reasons.push("BASELINE_OWNER");
  if (row.approved_template_baseline_id !== row.manifest_baseline_id) reasons.push("MANIFEST_BASELINE_ID");
  if (provenance.approvedTemplateBaselineId !== row.approved_template_baseline_id) reasons.push("PROVENANCE_BASELINE_ID");
  if (provenance.acceptanceEvidenceSha256 !== row.acceptance_evidence_sha256) reasons.push("PROVENANCE_EVIDENCE");
  if (binding.baselineId !== row.approved_template_baseline_id) reasons.push("BINDING_BASELINE_ID");
  if (binding.catalogId !== row.catalog_id) reasons.push("BINDING_CATALOG");
  if (binding.parameterId !== row.parameter_id) reasons.push("BINDING_PARAMETER");
  if (binding.definitionVersionId !== provenance.sourceDefinitionVersionId) reasons.push("BINDING_DEFINITION");
  if (binding.parameterSchemaSha256 !== provenance.sourceParameterSchemaId) reasons.push("BINDING_SCHEMA");
  if (binding.acceptanceEvidenceSha256 !== provenance.acceptanceEvidenceSha256) reasons.push("BINDING_EVIDENCE");
  if (!["ASSUMPTION", "NORMATIVE", "DERIVED"].includes(String(binding.inputClassification))) {
    reasons.push("BINDING_CLASSIFICATION");
  }
  if (!sameMembers(binding.formulaConsumerIds, truth.formula_consumers)) reasons.push("FORMULA_CONSUMERS");
  if (!Array.isArray(truth.resource_branch_consumers) || truth.resource_branch_consumers.length === 0
    || !sameMembers(binding.resourceConsumerRowIds, truth.resource_branch_consumers)) {
    reasons.push("RESOURCE_CONSUMERS");
  }
  if (!Array.isArray(binding.normativeSourceIds)) reasons.push("NORMATIVE_SOURCES");
  if (JSON.stringify(binding.value) !== JSON.stringify(row.default_value)) reasons.push("DEFAULT_VALUE");
  return reasons;
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const rows = (await client.query(`select manifest.catalog_id,
        manifest.approved_template_baseline_id::text manifest_baseline_id,
        parameter.parameter_id,parameter.default_value,parameter.truth_metadata,
        parameter.approved_template_baseline_id::text,
        baseline.acceptance_evidence_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_parameter_definition parameter
        on parameter.definition_version_id=manifest.definition_version_id
      join public.estimate_approved_template_baseline baseline
        on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and parameter.default_value is not null
      order by manifest.catalog_id,parameter.ordinal`, [RELEASE_ID])).rows as Json[];
    const reasonCounts = new Map<string, number>();
    const examples: Json[] = [];
    let failed = 0;
    for (const row of rows) {
      const reasons = failureReasons(row);
      if (reasons.length === 0) continue;
      failed += 1;
      for (const reason of reasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      if (examples.length < 5) {
        const truth = record(row.truth_metadata);
        examples.push({
          catalogId: row.catalog_id,
          parameterId: row.parameter_id,
          reasons,
          defaultValue: row.default_value,
          provenance: truth.provenance,
          formulaConsumers: truth.formula_consumers,
          resourceConsumers: truth.resource_branch_consumers,
        });
      }
    }
    process.stdout.write(`${JSON.stringify({
      releaseId: RELEASE_ID,
      defaultParameters: rows.length,
      green: rows.length - failed,
      failed,
      reasonCounts: Object.fromEntries([...reasonCounts.entries()].sort()),
      examples,
    }, null, 2)}\n`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
