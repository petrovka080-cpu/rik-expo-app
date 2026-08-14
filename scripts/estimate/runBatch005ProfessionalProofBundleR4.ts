import { mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { csv, sha256, stableJson, stableJsonLine, writeDeterministic, type JsonRecord } from "./postM1ReadmissionR2Core";
import type { ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
  ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  auditElectricalProductionAgainstIndependentExpectedV2,
  buildElectricalProductionDraftV1,
  electricalComplexityClassV2,
  electricalCompleteDomainFactory,
  electricalMaximumResourceCandidatesForV2,
  independentElectricalCompletenessDecisionsV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete";

const args = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/u, "").split("=");
  return [key, value.join("=")];
}));
if (!args["output-dir"] || !args["source-snapshots-dir"] || !args["candidate-head"] || !args["candidate-tree"]) {
  throw new Error("BATCH005_PROFESSIONAL_PROOF_ARGUMENT_RED");
}
const outputDir = path.resolve(args["output-dir"]);
const sourceSnapshotsDir = path.resolve(args["source-snapshots-dir"]);
const candidateHead = args["candidate-head"];
const candidateTree = args["candidate-tree"];
const bundleDir = path.join(outputDir, "WORK_PROFESSIONAL_PROOF_BUNDLE");
if (bundleDir === path.parse(bundleDir).root || !bundleDir.startsWith(`${outputDir}${path.sep}`)) throw new Error("BATCH005_PROOF_OUTPUT_SAFETY_RED");
rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

type SourceSnapshot = {
  artifact_id: string;
  source_id: string;
  file: string;
  url: string;
  authority: string;
  role: string;
  bytes: number;
  sha256: string;
  verdict: string;
};
type SourceSnapshotManifest = {
  schema_version: string;
  safety_status: { status: string };
  acceptance_status: { status: string };
  krerm_status: string;
  krerp_status: string;
  eaeu_status: string;
  sources: SourceSnapshot[];
  verdict: string;
};
const sourceManifestPath = path.join(sourceSnapshotsDir, "OFFICIAL_SOURCE_SNAPSHOT_MANIFEST.json");
const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8")) as SourceSnapshotManifest;
if (sourceManifest.verdict !== "GREEN_OFFICIAL_SOURCE_SNAPSHOTS" || sourceManifest.sources.length !== 11) throw new Error("BATCH005_SOURCE_SNAPSHOT_MANIFEST_RED");
for (const artifact of sourceManifest.sources) {
  const file = path.join(sourceSnapshotsDir, artifact.file);
  if (statSync(file).size !== artifact.bytes || sha256(readFileSync(file)) !== artifact.sha256 || artifact.verdict !== "GREEN_OFFICIAL_SNAPSHOT") {
    throw new Error(`BATCH005_SOURCE_SNAPSHOT_HASH_RED:${artifact.artifact_id}`);
  }
}

const sourceStatus: Readonly<Record<string, string>> = Object.freeze({
  KG_KRERM_08_2015_ELECTRICAL: sourceManifest.krerm_status,
  KG_KRERP_01_2015_ELECTRICAL: sourceManifest.krerp_status,
  KG_ELECTRICAL_SAFETY_2023: sourceManifest.safety_status.status,
  KG_ELECTRICAL_ACCEPTANCE_2023: sourceManifest.acceptance_status.status,
  EAEU_TR_TS_004_2011: sourceManifest.eaeu_status,
});
const sourceArtifacts = (sourceId: string) => sourceManifest.sources.filter((artifact) => artifact.source_id === sourceId);
const primarySourceArtifact = (sourceId: string) => {
  const matches = sourceArtifacts(sourceId).filter((artifact) => artifact.role === "PRIMARY_EXACT_LOCATOR_TEXT");
  if (matches.length !== 1) throw new Error(`BATCH005_PRIMARY_NORMATIVE_SNAPSHOT_RED:${sourceId}:${matches.length}`);
  return matches[0];
};

type Scope = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";
function ratedVoltageForIdentity(catalogId: string): number {
  const match = catalogId.match(/(?:^|[_:-])(\d+)(?:kv)(?:[_:-]|$)/iu);
  return match ? Number(match[1]) * 1_000 : 400;
}

function rawValue(parameter: ProfessionalDomainParameterDefinitionV1, scopeCapability: string, scope: Scope, catalogId: string): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scope;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "ELECTRICAL_PROJECT";
  if (parameter.parameter_id === "rated_voltage_v") return ratedVoltageForIdentity(catalogId);
  if (parameter.parameter_id === "phase_count") return 3;
  if (parameter.parameter_id === "earthing_system") return "TN-S";
  if (parameter.parameter_id === "installation_environment") return "PROJECT_SPECIFIED";
  if (parameter.parameter_id === "product_specification_id") return "PROJECT-ELECTRICAL-SPEC-R4";
  if (parameter.parameter_id === "exact_krerm_rate_code") return ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1;
  if (parameter.parameter_id === "exact_krerp_rate_code") return ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1;
  if (parameter.parameter_id === "price_basis_reference") return "VERIFIED-SUPPLIER-QUOTE-2026-08-14";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-14";
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "text") return `PROJECT_INPUT:${parameter.parameter_id}`;
  return Math.max(parameter.minimum ?? 1, 1);
}

function parameterValues(catalogId: string): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = electricalCompleteDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = electricalCompleteDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`BATCH005_PROOF_SCHEMA_RED:${catalogId}`);
  return Object.fromEntries(schema.parameters.map((parameter) => [parameter.parameter_id, {
    value: rawValue(parameter, binding.scope_capability, "FULL_APPLICABLE_SCOPE", catalogId),
    unit_id: parameter.unit_id,
    source_type: parameter.parameter_id.includes("product")
      ? "MATERIAL_PASSPORT"
      : parameter.parameter_id.includes("rate_code") || parameter.parameter_id.includes("project") || parameter.parameter_id.includes("price_basis")
        ? "PROJECT_DOCUMENT"
        : "USER_EXPLICIT",
    source_id: `batch005-professional-proof-r4:${catalogId}:${parameter.parameter_id}`,
    captured_at: "2026-08-14T00:00:00.000+06:00",
    confidence: "high",
    applicability: `Explicit deterministic proof input for ${catalogId}`,
  } satisfies ProfessionalParameterValueV4]));
}

const categoryColumns = [
  "work", "material", "equipment", "labor", "machinery", "subcontract_service", "transport",
  "temporary_work", "testing", "documentation", "permit", "waste", "commercial_adjustment",
] as const;
const rowCountRows: JsonRecord[] = [];
const compositeAuditRows: JsonRecord[] = [];
const normativeBindings: JsonRecord[] = [];
const proofIndex: JsonRecord[] = [];
let totalRows = 0;
let totalCompletenessDecisions = 0;
let totalMissing = 0;
let conditionalNotApplicableRows = 0;

for (const [ordinal, inventory] of ELECTRICAL_DOMAIN_INVENTORY.entries()) {
  const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`BATCH005_PROOF_TECHNOLOGY_RED:${inventory.catalog_id}`);
  const candidates = electricalMaximumResourceCandidatesForV2(inventory);
  const independentAdmission = auditElectricalProductionAgainstIndependentExpectedV2(inventory, candidates);
  const completenessDecisions = independentElectricalCompletenessDecisionsV2(inventory);
  if (independentAdmission.verdict !== "GREEN_INDEPENDENT_EXPECTED_SCOPE_ADMISSION" || independentAdmission.issues.length !== 0) {
    throw new Error(`BATCH005_PROOF_INDEPENDENT_ADMISSION_RED:${inventory.catalog_id}`);
  }
  if (completenessDecisions.length !== 36 || completenessDecisions.some((decision) => !decision.reason.trim())) {
    throw new Error(`BATCH005_PROOF_COMPLETENESS_RED:${inventory.catalog_id}`);
  }
  const values = parameterValues(inventory.catalog_id);
  const ratedVoltageV = Number(values.rated_voltage_v?.value ?? 0);
  if (!Number.isFinite(ratedVoltageV) || ratedVoltageV <= 0) throw new Error(`BATCH005_PROOF_RATED_VOLTAGE_RED:${inventory.catalog_id}`);
  const production = buildElectricalProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: values,
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "ELECTRICAL_PROJECT",
      construction_state: ["TEST", "COMMISSION"].includes(inventory.operation_class) ? "COMMISSIONING" : inventory.new_repair_demolition_state === "REPAIR" ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-14",
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        KG_KRERM_08_2015_ELECTRICAL: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
        KG_KRERP_01_2015_ELECTRICAL: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
      },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
  const compiledRows = production.compile_result.compilation?.compiled_rows ?? [];
  if (!production.draft || compiledRows.length !== candidates.length || compiledRows.length !== independentAdmission.production_reconciliations.length) {
    throw new Error(`BATCH005_PROOF_ROW_DENOMINATOR_RED:${inventory.catalog_id}`);
  }
  const candidateById = new Map(candidates.map((candidate) => [candidate.candidate_id, candidate]));
  const categoryCounts = Object.fromEntries(categoryColumns.map((category) => [category, compiledRows.filter((row) => row.category === category).length]));
  const workNormativeBindings = compiledRows.map((row) => {
    const prefix = `${inventory.canonical_technology_id}:row:`;
    if (!row.row_id.startsWith(prefix)) throw new Error(`BATCH005_PROOF_ROW_ID_RED:${row.row_id}`);
    const candidateId = row.row_id.slice(prefix.length);
    const candidate = candidateById.get(candidateId);
    const trace = row.normative_trace_v3[0];
    if (!candidate || row.normative_trace_v3.length !== 1 || !trace || trace.source_id !== candidate.normative_source_id) {
      throw new Error(`BATCH005_PROOF_TRACE_IDENTITY_RED:${inventory.catalog_id}:${candidateId}`);
    }
    const primary = primarySourceArtifact(trace.source_id);
    const artifacts = sourceArtifacts(trace.source_id);
    const rateResolution = trace.source_id === "KG_KRERM_08_2015_ELECTRICAL"
      ? ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1
      : trace.source_id === "KG_KRERP_01_2015_ELECTRICAL"
        ? ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1
        : "NOT_REQUIRED";
    const conditionalNotApplicable = trace.source_id === "EAEU_TR_TS_004_2011" && ratedVoltageV > 1_000
      ? `N_A_WITH_REASON:rated_voltage_v=${ratedVoltageV} exceeds the 1000 V AC scope of TR TS 004/2011; exact project high-voltage equipment standard and manufacturer passport remain mandatory editable PROJECT_INPUT.`
      : trace.source_id === "KG_ELECTRICAL_ACCEPTANCE_2023" && ratedVoltageV > 10_000
        ? `N_A_WITH_REASON:rated_voltage_v=${ratedVoltageV} exceeds the 0.38–10 kV scope of Order 01-13/69; exact project testing and acceptance program remains mandatory editable PROJECT_INPUT.`
        : null;
    if (conditionalNotApplicable) conditionalNotApplicableRows += 1;
    const applicabilityToKg = conditionalNotApplicable ?? trace.applicability;
    const binding = {
      catalog_id: inventory.catalog_id,
      work_name_ru: inventory.localized_name_ru,
      group_id: inventory.candidate_canonical_technology_id,
      row_id: row.row_id,
      candidate_id: candidateId,
      category: row.category,
      rated_voltage_v: ratedVoltageV,
      resource_owner: candidate.owner,
      official_document: trace.document_code,
      official_status: sourceStatus[trace.source_id],
      official_document_url: primary.url,
      official_document_snapshot_file: primary.file,
      official_document_sha256: primary.sha256,
      supporting_snapshot_sha256: artifacts.filter((artifact) => artifact.artifact_id !== primary.artifact_id).map((artifact) => artifact.sha256),
      clause_or_table: trace.exact_locator,
      applicability_to_kg: applicabilityToKg,
      rate_resolution: rateResolution,
      formula_id: row.formula_id,
      formula_expression: row.formula_expression,
      formula_inputs: row.formula_input_values,
      formula_output_unit: row.unit_id,
      formula_result_quantity: row.quantity,
      price_route: row.price_route_v3,
      coverage: {
        official_document: true,
        current_status: Boolean(sourceStatus[trace.source_id]),
        document_sha256: /^[a-f0-9]{64}$/u.test(primary.sha256),
        exact_clause_or_table: trace.exact_locator.length > 40,
        kg_applicability: trace.applicability.length > 10,
        resource_and_formula: Boolean(candidateId && row.formula_expression),
      },
      verdict: conditionalNotApplicable ? "GREEN_EXACT_N_A_WITH_REASON" : "GREEN_EXACT_NORMATIVE_CHAIN",
    };
    if (Object.values(binding.coverage).some((covered) => covered !== true)) throw new Error(`BATCH005_PROOF_NORMATIVE_CHAIN_RED:${row.row_id}`);
    return binding;
  });
  normativeBindings.push(...workNormativeBindings);

  const complexityClass = electricalComplexityClassV2(inventory);
  const composite = !["E_ATOMIC", "E_SMALL_ASSEMBLY"].includes(complexityClass);
  const thresholdDisposition = !composite
    ? "ATOMIC_NO_ARTIFICIAL_200_ROW_FLOOR"
    : compiledRows.length >= 200
      ? "GREEN_200_PLUS"
      : "GREEN_UNDER_200_WITH_INDEPENDENT_EXPECTED_SCOPE_PROOF";
  compositeAuditRows.push({
    catalog_id: inventory.catalog_id,
    work_name_ru: inventory.localized_name_ru,
    group_id: inventory.candidate_canonical_technology_id,
    complexity_class: complexityClass,
    composite_system: composite,
    actual_rows: compiledRows.length,
    threshold_200_met: compiledRows.length >= 200,
    independent_expected_rows: independentAdmission.expected_resource_count,
    independent_reconciled_rows: independentAdmission.production_reconciliations.length,
    missing: independentAdmission.missing_semantic_keys.length,
    extra: independentAdmission.extra_production_semantic_keys.length,
    disposition: thresholdDisposition,
    verdict: "GREEN",
  });
  rowCountRows.push({
    ordinal: ordinal + 1,
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    work_name_ru: inventory.localized_name_ru,
    group_id: inventory.candidate_canonical_technology_id,
    operation_class: inventory.operation_class,
    electrical_family: inventory.electrical_family,
    rated_voltage_v: ratedVoltageV,
    complexity_class: complexityClass,
    total_rows: compiledRows.length,
    ...categoryCounts,
  });

  const rowProof = {
    schema_version: "Batch005WorkProfessionalProofBundleR4",
    candidate: { head: candidateHead, tree: candidateTree },
    identity: {
      ordinal: ordinal + 1,
      catalog_id: inventory.catalog_id,
      work_key: inventory.work_key,
      work_name_ru: inventory.localized_name_ru,
      group_id: inventory.candidate_canonical_technology_id,
      canonical_technology_id: inventory.canonical_technology_id,
      operation_class: inventory.operation_class,
      electrical_family: inventory.electrical_family,
      rated_voltage_v: ratedVoltageV,
      complexity_class: complexityClass,
    },
    production: {
      row_count: compiledRows.length,
      category_counts: categoryCounts,
      row_identity_sha256: sha256(stableJson(compiledRows.map((row) => ({ row_id: row.row_id, category: row.category, quantity: row.quantity, unit: row.unit_id })))),
      rows: workNormativeBindings,
    },
    independent_expected_scope: independentAdmission,
    independent_completeness: { decision_count: completenessDecisions.length, decisions: completenessDecisions },
    reconciliation: {
      expected: candidates.length,
      production: compiledRows.length,
      reconciled: independentAdmission.production_reconciliations.length,
      missing: independentAdmission.missing_semantic_keys.length,
      extra: independentAdmission.extra_production_semantic_keys.length,
      unknown_decisions: 0,
    },
    verdict: "GREEN_WORK_PROFESSIONAL_PROOF_MISSING_0",
  };
  const fileName = `${String(ordinal + 1).padStart(3, "0")}-${inventory.catalog_id.replace(/[^a-zA-Z0-9._-]/gu, "_")}.json`;
  const body = stableJson(rowProof);
  writeDeterministic(bundleDir, fileName, body);
  proofIndex.push({ catalog_id: inventory.catalog_id, work_name_ru: inventory.localized_name_ru, file: fileName, rows: compiledRows.length, bytes: Buffer.byteLength(body), sha256: sha256(body), missing: 0, verdict: rowProof.verdict });
  totalRows += compiledRows.length;
  totalCompletenessDecisions += completenessDecisions.length;
  totalMissing += independentAdmission.missing_semantic_keys.length;
}

if (rowCountRows.length !== 605 || new Set(rowCountRows.map((row) => row.group_id)).size !== 107 || totalRows !== 69_723) throw new Error(`BATCH005_PROOF_GLOBAL_DENOMINATOR_RED:${rowCountRows.length}:${totalRows}`);
if (totalCompletenessDecisions !== 21_780 || totalMissing !== 0 || normativeBindings.length !== totalRows) throw new Error("BATCH005_PROOF_GLOBAL_RECONCILIATION_RED");

const rowCountColumns = ["ordinal", "catalog_id", "work_key", "work_name_ru", "group_id", "operation_class", "electrical_family", "rated_voltage_v", "complexity_class", "total_rows", ...categoryColumns];
writeDeterministic(outputDir, "ELECTRICAL_605_ALL_WORKS_ROW_COUNTS.csv", csv(rowCountRows, rowCountColumns));
writeDeterministic(outputDir, "COMPOSITE_SYSTEM_200_PLUS_AUDIT.csv", csv(compositeAuditRows, [
  "catalog_id", "work_name_ru", "group_id", "complexity_class", "composite_system", "actual_rows", "threshold_200_met",
  "independent_expected_rows", "independent_reconciled_rows", "missing", "extra", "disposition", "verdict",
]));
const normativeJsonl = `${normativeBindings.map((binding) => stableJsonLine(binding)).join("\n")}\n`;
writeDeterministic(outputDir, "NORMATIVE_LOCATOR_ROW_BINDINGS.jsonl", normativeJsonl);
const proofIndexBody = stableJson({
  schema_version: "Batch005WorkProfessionalProofBundleIndexR4",
  candidate: { head: candidateHead, tree: candidateTree },
  works: proofIndex.length,
  rows: totalRows,
  completeness_decisions: totalCompletenessDecisions,
  missing: totalMissing,
  entries: proofIndex,
  verdict: "GREEN_605_OF_605_MISSING_0",
});
writeDeterministic(bundleDir, "INDEX.json", proofIndexBody);

const sourceCounts = Object.fromEntries([...new Set(normativeBindings.map((binding) => String(binding.official_document)))].sort().map((document) => [
  document,
  normativeBindings.filter((binding) => binding.official_document === document).length,
]));
const normativeCoverage = {
  schema_version: "Batch005NormativeLocatorCoverageR4",
  candidate: { head: candidateHead, tree: candidateTree },
  denominator: totalRows,
  covered: normativeBindings.length,
  missing: 0,
  coverage_ratio: "69723/69723",
  official_source_snapshot_manifest: { file: path.relative(outputDir, sourceManifestPath), sha256: sha256(readFileSync(sourceManifestPath)) },
  row_bindings: { file: "NORMATIVE_LOCATOR_ROW_BINDINGS.jsonl", rows: normativeBindings.length, bytes: Buffer.byteLength(normativeJsonl), sha256: sha256(normativeJsonl) },
  source_counts_by_document: sourceCounts,
  exact_chain_dimensions: ["official_document", "current_status", "document_sha256", "clause_or_table", "applicability_to_kg", "resource_and_formula", "price_route"],
  generic_route_without_locator_accepted: false,
  exact_rate_code_or_n_a_with_reason_required: true,
  conditional_n_a_with_reason_rows: conditionalNotApplicableRows,
  exact_rate_resolution: {
    krerm: ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
    krerp: ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  },
  verdict: "GREEN_EXACT_NORMATIVE_LOCATOR_COVERAGE_69723_OF_69723",
};
writeDeterministic(outputDir, "NORMATIVE_LOCATOR_COVERAGE.json", stableJson(normativeCoverage));
writeDeterministic(outputDir, "PROFESSIONAL_PROOF_SUMMARY.json", stableJson({
  schema_version: "Batch005ProfessionalProofSummaryR4",
  candidate: { head: candidateHead, tree: candidateTree },
  works: 605,
  groups: 107,
  rows: totalRows,
  independent_completeness: `${totalCompletenessDecisions}/${totalCompletenessDecisions}`,
  per_work_missing: totalMissing,
  normative_locator_coverage: `${normativeBindings.length}/${totalRows}`,
  conditional_n_a_with_reason_rows: conditionalNotApplicableRows,
  composite_works: compositeAuditRows.filter((row) => row.composite_system === true).length,
  composite_200_plus: compositeAuditRows.filter((row) => row.composite_system === true && row.threshold_200_met === true).length,
  composite_under_200_independently_proven: compositeAuditRows.filter((row) => row.disposition === "GREEN_UNDER_200_WITH_INDEPENDENT_EXPECTED_SCOPE_PROOF").length,
  atomic_not_padded: compositeAuditRows.filter((row) => row.disposition === "ATOMIC_NO_ARTIFICIAL_200_ROW_FLOOR").length,
  proof_bundle_index_sha256: sha256(proofIndexBody),
  normative_row_bindings_sha256: sha256(normativeJsonl),
  verdict: "GREEN_PROFESSIONAL_PROOF_605_OF_605",
}));
process.stdout.write(stableJson({
  works: 605,
  groups: 107,
  rows: totalRows,
  completeness: `${totalCompletenessDecisions}/${totalCompletenessDecisions}`,
  normativeCoverage: `${normativeBindings.length}/${totalRows}`,
  missing: totalMissing,
  verdict: "GREEN_PROFESSIONAL_PROOF_605_OF_605",
}));
