import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  auditRoadworksWaveASemanticTruth,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  getRoadworksWaveAParameterKeys,
} from "../../src/lib/estimate/v4/roadworks";

const outputRoot = path.resolve("artifacts/roadworks-wave-a-semantic-truth");
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const timestamp = new Date().toISOString();
const command = "tsx scripts/estimate/auditRoadworksWaveASemanticTruth.ts";
const environment = { runtime: "node", platform: process.platform, node: process.version };
const audit = auditRoadworksWaveASemanticTruth();

const envelope = <T>(payload: T, blockers: readonly string[]) => ({
  timestamp,
  branch,
  exact_sha: exactSha,
  command,
  environment,
  passed: blockers.length === 0 ? 1 : 0,
  failed: blockers.length,
  blockers,
  fake_green_claimed: false,
  payload,
});

const modelRows = RoadworksWaveAInventory.map((item) => {
  const compilation = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS);
  return {
    work_id: item.workId,
    professional_name_ru: item.professionalNameRu,
    operation_family: getRoadworksWaveAOperation(item.workId),
    technology_family: item.technologyFamily,
    scope_profile: item.scopeProfile,
    scope_class: item.scopeClass,
    semantic_owner: item.semanticModelId,
    semantic_ownership: item.semanticOwnership,
    alias_of_work_id: item.aliasOfWorkId,
    primary_quantity: item.primaryQuantity,
    primary_unit: item.primaryUnit,
    result_unit: item.primaryUnit,
    applicability: "requires_domain_review",
    exclusions: [],
    p0_parameters: [],
    optional_parameters: getRoadworksWaveAParameterKeys(item.workId),
    silent_defaults_in_production_path: Object.keys(DEFAULT_ROADWORKS_WAVE_A_INPUTS),
    formula_graph: compilation.rows.map((row) => row.formulaId),
    output_rows: compilation.rows.map((row) => ({
      row_code: row.rowId,
      category: row.category,
      name_ru: row.nameRu,
      unit: row.unit,
      formula_id: row.formulaId,
      parameter_bindings: row.affectedBy,
      source_ids: row.sourceIds,
    })),
    manifest_id: item.manifestId,
    assembly_ids: item.assemblyIds,
    source_pack_id: item.sourcePackId,
    golden_fixture: null,
    migration_owner: item.semanticModelId,
    pdf_procurement_binding: "canonical_compiled_result_existing_contract",
    requires_domain_review: true,
  };
});

const blockers = [
  `${audit.catalog_aliases} catalog IDs are aliases rather than independent professional models`,
  `${audit.scope_profiles_ignored_by_compiler} scope profiles do not alter compiler semantics`,
  `${audit.missing_p0_parameters} models have no enforced P0 contract`,
  `${audit.silent_p0_defaults} models receive silent production defaults`,
  `${audit.missing_golden_fixtures} independent golden fixtures are missing`,
  "row-level normative quantity authority is not proven",
];

mkdirSync(outputRoot, { recursive: true });
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-semantic-audit.json"),
  `${JSON.stringify(envelope({ metrics: audit, models: modelRows }, blockers), null, 2)}\n`,
);
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-semantic-collisions.json"),
  `${JSON.stringify(envelope({
    exact: audit.exact_semantic_collisions,
    near: audit.near_semantic_collisions,
    aliases: modelRows.filter((item) => item.semantic_ownership === "catalog_alias")
      .map((item) => ({ work_id: item.work_id, alias_of_work_id: item.alias_of_work_id })),
  }, blockers.slice(0, 2)), null, 2)}\n`,
);
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-formula-source-ledger.json"),
  `${JSON.stringify(envelope(modelRows.map((item) => ({
    work_id: item.work_id,
    formula_graph: item.formula_graph,
    rows: item.output_rows.map((row) => ({
      row_code: row.row_code,
      formula_id: row.formula_id,
      source_ids: row.source_ids,
      normative_quantity_authority: "not_proven",
    })),
  })), ["row-level normative quantity authority is not proven"]), null, 2)}\n`,
);

const table = [
  "# Roadworks Wave A model matrix",
  "",
  `Generated: ${timestamp}`,
  `Branch: ${branch}`,
  `SHA: ${exactSha}`,
  `Status: ${audit.blockerStatus}`,
  `Fake green claimed: false`,
  "",
  "| Work ID | Operation | Scope | Ownership | Canonical owner | Rows |",
  "|---|---|---|---|---|---:|",
  ...modelRows.map((item) =>
    `| ${item.work_id} | ${item.operation_family} | ${item.scope_profile} | ${item.semantic_ownership} | ${item.alias_of_work_id ?? item.work_id} | ${item.output_rows.length} |`
  ),
  "",
  `Distinct professional models currently evidenced: ${audit.distinct_professional_models}/35.`,
  `Catalog aliases requiring reclassification or work-specific engineering: ${audit.catalog_aliases}.`,
].join("\n");
writeFileSync(path.join(outputRoot, "roadworks-wave-a-model-matrix.md"), `${table}\n`);

writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-golden-summary.json"),
  `${JSON.stringify(envelope({
    required: 35,
    independent: 0,
    normal_scenarios_passed: 0,
    generated_by_production_compiler_rejected: true,
  }, ["35 independent expert-authored golden fixtures are missing"]), null, 2)}\n`,
);
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-nlp-routing-summary.json"),
  `${JSON.stringify(envelope({
    required_positive: 350,
    current_non_exact_name_scope_cases: 35,
    current_positive_passed: 35,
    negative_cases_passed: 1,
    ambiguous_cases_passed: 1,
    acceptance_reached: false,
  }, ["315 additional positive cases and the full negative/ambiguous corpus are missing"]), null, 2)}\n`,
);
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-web-proof.json"),
  `${JSON.stringify(envelope({
    executed: false,
    reason: "Web proof is forbidden before semantic/formula/golden green",
  }, ["semantic/formula/golden layer is not green"]), null, 2)}\n`,
);
writeFileSync(
  path.join(outputRoot, "roadworks-wave-a-android-api34-proof.json"),
  `${JSON.stringify(envelope({
    executed: false,
    reason: "Android API 34 proof is forbidden before Web green",
  }, ["Web product proof is not green"]), null, 2)}\n`,
);

const acceptance = [
  "# Roadworks Wave A final acceptance",
  "",
  `Generated: ${timestamp}`,
  `Branch: ${branch}`,
  `SHA: ${exactSha}`,
  "Fake green claimed: false",
  "",
  `Final status: ${audit.blockerStatus}`,
  "",
  "- Accounted work IDs: 35/35",
  `- Distinct professional models evidenced: ${audit.distinct_professional_models}/35`,
  `- Catalog aliases: ${audit.catalog_aliases}`,
  `- Ignored scope profiles: ${audit.scope_profiles_ignored_by_compiler}`,
  "- Independent golden fixtures: 0/35",
  "- Web product proof: not run (semantic gate is red)",
  "- Android API 34 proof: not run (Web gate is red)",
  "- Domain expert approval: absent",
  "",
  "NO WAVE B. NO MASS MIGRATION. NO RELEASE. NO DEPLOY. NO MERGE.",
].join("\n");
writeFileSync(path.join(outputRoot, "roadworks-wave-a-final-acceptance.md"), `${acceptance}\n`);

console.info(JSON.stringify({
  output_root: outputRoot,
  status: audit.blockerStatus,
  total_work_ids: audit.total_work_ids,
  distinct_professional_models: audit.distinct_professional_models,
  aliases: audit.catalog_aliases,
  fake_green_claimed: false,
}, null, 2));
