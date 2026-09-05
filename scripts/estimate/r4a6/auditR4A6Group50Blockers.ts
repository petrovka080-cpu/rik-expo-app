import { Client } from "pg";

import {
  isGenericPublicBoqResourceName,
  isPublicBoqNameStructurallyValid,
} from "../../../src/lib/estimate/semanticBoqGate";

const RELEASE_ID = "ad825133-a41e-527d-a2f2-e1dd0e65ea86";
const SEARCH_RELEASE_ID = "0a1f5b96-24c1-5e2f-8ac4-edecab5ed3b6";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

type Json = Record<string, any>;

function isApplicable(row: Json): boolean {
  return !(row.inclusion_ast?.kind === "literal" && row.inclusion_ast?.value === false)
    && row.resource_graph?.r4A6ProfessionalBoq?.applicable !== false;
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const baselineRows = (await client.query(`select
        manifest.catalog_id,baseline.id::text baseline_id,baseline.input_values,
        array_agg(parameter.parameter_id order by parameter.ordinal)
          filter(where parameter.value_type='text' and not parameter.required
            and coalesce(baseline.input_values->>parameter.parameter_id,'')='') empty_optional_text
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_approved_template_baseline baseline
        on baseline.id=manifest.approved_template_baseline_id
      join public.estimate_parameter_definition parameter
        on parameter.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1
      group by manifest.catalog_id,baseline.id,baseline.input_values
      having count(*) filter(where parameter.value_type='text' and not parameter.required
        and coalesce(baseline.input_values->>parameter.parameter_id,'')='')>0
      order by manifest.catalog_id`, [RELEASE_ID])).rows as Json[];
    const resourceRows = (await client.query(`select
        manifest.catalog_id,document.canonical_name_ru work_title_ru,
        resource.definition_version_id::text,resource.row_id,resource.ordinal,resource.category,
        resource.title_ru,resource.unit_id,resource.formula_id,resource.cost_owner_id,
        resource.inclusion_ast,resource.resource_graph
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_search_document document
        on document.definition_version_id=manifest.definition_version_id
        and document.catalog_id=manifest.catalog_id
        and document.search_release_id=$2
        and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
      join public.estimate_resource_spec resource
        on resource.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1
      order by manifest.catalog_id,resource.ordinal`, [RELEASE_ID, SEARCH_RELEASE_ID])).rows as Json[];
    const totals = {
      resources: resourceRows.length,
      applicable: 0,
      excluded: 0,
      semanticApplicable: 0,
      semanticExcluded: 0,
      genericApplicable: 0,
      genericExcluded: 0,
    };
    const examples: Json[] = [];
    const genericTitleCounts = new Map<string, number>();
    const affectedCatalogIds = new Set<string>();
    for (const row of resourceRows) {
      const applicable = isApplicable(row);
      const semantic = !isPublicBoqNameStructurallyValid(row.title_ru, row.work_title_ru);
      const generic = isGenericPublicBoqResourceName(row.title_ru);
      totals[applicable ? "applicable" : "excluded"] += 1;
      if (semantic) totals[applicable ? "semanticApplicable" : "semanticExcluded"] += 1;
      if (generic) totals[applicable ? "genericApplicable" : "genericExcluded"] += 1;
      if (applicable && (semantic || generic)) affectedCatalogIds.add(String(row.catalog_id));
      if (generic && applicable) {
        genericTitleCounts.set(row.title_ru, (genericTitleCounts.get(row.title_ru) ?? 0) + 1);
      }
      if ((semantic || generic) && examples.length < 40) {
        examples.push({
          catalogId: row.catalog_id,
          rowId: row.row_id,
          titleRu: row.title_ru,
          applicable,
          semantic,
          generic,
          professionalDisposition: row.resource_graph?.r4A6ProfessionalBoq?.disposition ?? null,
        });
      }
    }
    const firstGeneric = resourceRows.find((row) => isApplicable(row)
      && isGenericPublicBoqResourceName(row.title_ru));
    const neighborRows = firstGeneric
      ? resourceRows.filter((row) => row.definition_version_id === firstGeneric.definition_version_id
        && Math.abs(Number(row.ordinal) - Number(firstGeneric.ordinal)) <= 2)
        .map((row) => ({
          rowId: row.row_id,
          ordinal: row.ordinal,
          category: row.category,
          titleRu: row.title_ru,
          unitId: row.unit_id,
          formulaId: row.formula_id,
          costOwnerId: row.cost_owner_id,
          inclusionAst: row.inclusion_ast,
          resourceGraph: row.resource_graph,
        }))
      : [];
    const neighborFormulaIds = neighborRows.map((row) => row.formulaId);
    const neighborFormulas = firstGeneric
      ? (await client.query(`select formula_id,expression_source,ast,input_parameter_ids
          from public.estimate_formula_graph
          where definition_version_id=$1 and formula_id=any($2::text[])
          order by formula_id`, [firstGeneric.definition_version_id, neighborFormulaIds])).rows
      : [];
    process.stdout.write(`${JSON.stringify({
      releaseId: RELEASE_ID,
      baselineDefects: baselineRows.length,
      affectedContentDefinitions: affectedCatalogIds.size,
      baselineExamples: baselineRows.slice(0, 10).map((row) => ({
        catalogId: row.catalog_id,
        baselineId: row.baseline_id,
        emptyOptionalText: row.empty_optional_text,
      })),
      totals,
      genericTitleCounts: [...genericTitleCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 40)
        .map(([titleRu, count]) => ({ titleRu, count })),
      firstGenericNeighborhood: { rows: neighborRows, formulas: neighborFormulas },
      examples,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
