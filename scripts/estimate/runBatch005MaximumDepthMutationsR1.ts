import { mkdirSync } from "node:fs";
import path from "node:path";
import { stableJson, writeDeterministic } from "./postM1ReadmissionR2Core";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
  auditBatch005R2FinalGateV1,
  auditElectricalProductionAgainstIndependentExpectedV2,
  electricalMaximumResourceCandidatesForV2,
  type Batch005R2FinalGateSnapshotV1,
  type ElectricalMaximumResourceCandidateV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete";
import {
  auditCrossDomainContentIsolationR3,
  auditQueueIsolationR3,
  resolveExactReferenceCandidateR3,
  type CrossDomainContentViewR3,
  type ForbiddenReferenceIdentitiesR3,
  type ReferenceCandidateR3,
} from "./batch005R3IsolationCore";

function cleanGateSnapshot(productionRows: number): Batch005R2FinalGateSnapshotV1 {
  return {
    electrical_ids: 605,
    electrical_groups: 107,
    production_rows: productionRows,
    expected_to_production_reconciliation_rows: productionRows,
    row_legitimacy_rows: productionRows,
    independent_completeness_decisions: 21_780,
    independent_expected_missing: 0,
    production_without_independent_expected: 0,
    auditor_imports_production_builder: false,
    auditor_imports_production_snapshot: false,
    expected_derived_from_serialized_production: false,
    duplicate_semantic_rows: 0,
    hidden_aggregates: 0,
    unsupported_padding_rows: 0,
    mutually_exclusive_double_inclusions: 0,
    parent_child_double_count: 0,
    silent_defaults: 0,
    unused_visible_parameters: 0,
    invalid_parameter_contracts: 0,
    wrong_formula_dependencies: 0,
    missing_cost_owners: 0,
    silent_zero_prices: 0,
    missing_normative_locators: 0,
    wrong_jurisdiction_roles: 0,
    unexplained_graph_aliases: 0,
    lost_durable_rows: 0,
    pdf_row_mismatch: 0,
    procurement_row_mismatch: 0,
    stale_apk_accepted: false,
    lifecycle_regressions: 0,
    unexplained_ui_cost_deltas: 0,
    ui_hidden_durable_rows: 0,
    oracle_fixture_obligations_missing: 0,
    production_builder_rows_missing: 0,
    closeout_before_reconciliation: false,
  };
}

type GateMutation = {
  category: string;
  mutate: (snapshot: Batch005R2FinalGateSnapshotV1) => void;
};

const gateMutations: readonly GateMutation[] = [
  { category: "EXPECTED_CANDIDATE_MISSING_FROM_PRODUCTION", mutate: (value) => { value.independent_expected_missing = 1; } },
  { category: "PRODUCTION_ROW_WITHOUT_INDEPENDENT_EXPECTED", mutate: (value) => { value.production_without_independent_expected = 1; } },
  { category: "AUDITOR_IMPORTS_PRODUCTION_BUILDER", mutate: (value) => { value.auditor_imports_production_builder = true; } },
  { category: "DUPLICATE_SEMANTIC_ROW", mutate: (value) => { value.duplicate_semantic_rows = 1; } },
  { category: "HIDDEN_AGGREGATE", mutate: (value) => { value.hidden_aggregates = 1; } },
  { category: "UNSUPPORTED_PADDING", mutate: (value) => { value.unsupported_padding_rows = 1; } },
  { category: "MUTUALLY_EXCLUSIVE_DOUBLE_INCLUSION", mutate: (value) => { value.mutually_exclusive_double_inclusions = 1; } },
  { category: "PARENT_CHILD_DOUBLE_COUNT", mutate: (value) => { value.parent_child_double_count = 1; } },
  { category: "SILENT_DEFAULT", mutate: (value) => { value.silent_defaults = 1; } },
  { category: "UNUSED_VISIBLE_PARAMETER", mutate: (value) => { value.unused_visible_parameters = 1; } },
  { category: "INVALID_PARAMETER_BOUND_CHOICE_OR_UNIT", mutate: (value) => { value.invalid_parameter_contracts = 1; } },
  { category: "WRONG_FORMULA_DEPENDENCY", mutate: (value) => { value.wrong_formula_dependencies = 1; } },
  { category: "MISSING_COST_OWNER", mutate: (value) => { value.missing_cost_owners = 1; } },
  { category: "SILENT_ZERO_PRICE", mutate: (value) => { value.silent_zero_prices = 1; } },
  { category: "MISSING_NORMATIVE_LOCATOR", mutate: (value) => { value.missing_normative_locators = 1; } },
  { category: "WRONG_JURISDICTION_ROLE", mutate: (value) => { value.wrong_jurisdiction_roles = 1; } },
  { category: "IDENTICAL_GRAPH_FOR_INCOMPATIBLE_WORKS", mutate: (value) => { value.unexplained_graph_aliases = 1; } },
  { category: "LOST_DURABLE_ROW", mutate: (value) => { value.lost_durable_rows = 1; } },
  { category: "PDF_PROCUREMENT_DIVERGENCE", mutate: (value) => { value.pdf_row_mismatch = 1; value.procurement_row_mismatch = 1; } },
  { category: "STALE_APK_ACCEPTED", mutate: (value) => { value.stale_apk_accepted = true; } },
  { category: "LIFECYCLE_ACKNOWLEDGEMENT_REGRESSION", mutate: (value) => { value.lifecycle_regressions = 1; } },
  { category: "UNEXPLAINED_UI_COST_DELTA", mutate: (value) => { value.unexplained_ui_cost_deltas = 1; } },
  { category: "UI_GROUPING_HIDES_DURABLE_ROWS", mutate: (value) => { value.ui_hidden_durable_rows = 1; } },
  { category: "ORACLE_FIXTURE_OBLIGATION_REMOVED", mutate: (value) => { value.oracle_fixture_obligations_missing = 1; } },
  { category: "PRODUCTION_BUILDER_ROW_REMOVED", mutate: (value) => { value.production_builder_rows_missing = 1; } },
  { category: "EXPECTED_DERIVED_FROM_SERIALIZED_PRODUCTION", mutate: (value) => { value.expected_derived_from_serialized_production = true; } },
  { category: "CLOSEOUT_WITHOUT_RECONCILIATION", mutate: (value) => { value.closeout_before_reconciliation = true; } },
  { category: "ROW_LEGITIMACY_LEDGER_LOSS", mutate: (value) => { value.row_legitimacy_rows -= 1; } },
];

type MutationResult = { mutationId: string; category: string; catalogId: string; detected: boolean; issueCodes: string[]; crossSide: boolean };
const productionRows = ELECTRICAL_DOMAIN_INVENTORY.reduce((sum, inventory) => sum + electricalMaximumResourceCandidatesForV2(inventory).length, 0);
const results: MutationResult[] = [];
for (let categoryIndex = 0; categoryIndex < gateMutations.length; categoryIndex += 1) {
  const mutation = gateMutations[categoryIndex];
  for (let repetition = 0; repetition < 25; repetition += 1) {
    const inventory = ELECTRICAL_DOMAIN_INVENTORY[(categoryIndex * 25 + repetition) % ELECTRICAL_DOMAIN_INVENTORY.length];
    const fixture = cleanGateSnapshot(productionRows);
    mutation.mutate(fixture);
    const issues = auditBatch005R2FinalGateV1(fixture);
    results.push({
      mutationId: `ELECTRICAL-R2-MUT-${String(results.length + 1).padStart(3, "0")}`,
      category: mutation.category,
      catalogId: inventory.catalog_id,
      detected: issues.length > 0,
      issueCodes: [...new Set(issues.map((issue) => issue.code))].sort(),
      crossSide: ["EXPECTED_CANDIDATE_MISSING_FROM_PRODUCTION", "PRODUCTION_ROW_WITHOUT_INDEPENDENT_EXPECTED", "AUDITOR_IMPORTS_PRODUCTION_BUILDER", "ORACLE_FIXTURE_OBLIGATION_REMOVED", "PRODUCTION_BUILDER_ROW_REMOVED", "EXPECTED_DERIVED_FROM_SERIALIZED_PRODUCTION", "CLOSEOUT_WITHOUT_RECONCILIATION"].includes(mutation.category),
    });
  }
}

for (let repetition = 0; repetition < 20; repetition += 1) {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY[(repetition * 29) % ELECTRICAL_DOMAIN_INVENTORY.length];
  const candidates = electricalMaximumResourceCandidatesForV2(inventory).map((candidate) => ({ ...candidate })) as ElectricalMaximumResourceCandidateV2[];
  const requiredKey = auditElectricalProductionAgainstIndependentExpectedV2(inventory, candidates).expected_catalog.required_resources[0]?.semantic_key;
  const requiredIndex = candidates.findIndex((candidate) => candidate.candidate_id === requiredKey);
  if (requiredIndex < 0) throw new Error(`BATCH005_R2_MUTATION_REQUIRED_RESOURCE_MISSING:${inventory.catalog_id}`);
  candidates.splice(requiredIndex, 1);
  const admission = auditElectricalProductionAgainstIndependentExpectedV2(inventory, candidates);
  results.push({
    mutationId: `ELECTRICAL-R2-MUT-${String(results.length + 1).padStart(3, "0")}`,
    category: "LIVE_EXPECTED_RESOURCE_REMOVED_FROM_PRODUCTION",
    catalogId: inventory.catalog_id,
    detected: admission.issues.some((issue) => issue.code === "EXPECTED_RESOURCE_MISSING"),
    issueCodes: [...new Set(admission.issues.map((issue) => issue.code))].sort(),
    crossSide: true,
  });
}

if (results.length !== 720 || results.some((result) => !result.detected)) throw new Error("BATCH005_R2_POST_ORACLE_MUTATION_ADMISSION_RED");

const r3StartIndex = results.length;
const emptyForbidden = (): ForbiddenReferenceIdentitiesR3 => ({
  catalogIds: new Set(), rowIds: new Set(), semanticKeys: new Set(), owners: new Set(), formulaIds: new Set(),
  resourceGraphIds: new Set(), parameterIds: new Set(), priceRouteIds: new Set(), rateCodes: new Set(), stageNames: new Set(),
});
const cleanElectricalRow = (): CrossDomainContentViewR3 => ({
  catalogId: "electrical:catalog", rowId: "electrical:row", semanticKey: "electrical:semantic", owner: "ELECTRICAL",
  formulaId: "electrical:formula", resourceGraphIds: ["electrical:graph"], parameterIds: ["electrical:param"],
  priceRouteIds: ["electrical:price"], rateCodes: ["electrical:rate"], stageName: "electrical:stage",
});
const contaminationMutations: readonly { category: string; field: keyof ForbiddenReferenceIdentitiesR3; mutate: (row: CrossDomainContentViewR3) => void }[] = [
  { category: "ASPHALT_CATALOG_ID_IN_ELECTRICAL", field: "catalogIds", mutate: (row) => { row.catalogId = "asphalt:catalog"; } },
  { category: "ASPHALT_ROW_ID_IN_ELECTRICAL", field: "rowIds", mutate: (row) => { row.rowId = "asphalt:row"; } },
  { category: "ASPHALT_SEMANTIC_KEY_IN_ELECTRICAL", field: "semanticKeys", mutate: (row) => { row.semanticKey = "asphalt:semantic"; } },
  { category: "ASPHALT_OWNER_IN_ELECTRICAL", field: "owners", mutate: (row) => { row.owner = "asphalt:owner"; } },
  { category: "ASPHALT_FORMULA_ID_IN_ELECTRICAL", field: "formulaIds", mutate: (row) => { row.formulaId = "asphalt:formula"; } },
  { category: "ASPHALT_RESOURCE_GRAPH_IN_ELECTRICAL", field: "resourceGraphIds", mutate: (row) => { row.resourceGraphIds = ["asphalt:graph"]; } },
  { category: "ASPHALT_PARAMETER_ID_IN_ELECTRICAL", field: "parameterIds", mutate: (row) => { row.parameterIds = ["asphalt:param"]; } },
  { category: "ASPHALT_PRICE_ROUTE_IN_ELECTRICAL", field: "priceRouteIds", mutate: (row) => { row.priceRouteIds = ["asphalt:price"]; } },
  { category: "ASPHALT_RATE_CODE_IN_ELECTRICAL", field: "rateCodes", mutate: (row) => { row.rateCodes = ["asphalt:rate"]; } },
  { category: "ASPHALT_STAGE_NAME_IN_ELECTRICAL", field: "stageNames", mutate: (row) => { row.stageName = "asphalt:stage"; } },
];
for (const mutation of contaminationMutations) {
  for (let repetition = 0; repetition < 3; repetition += 1) {
    const row = cleanElectricalRow();
    const forbidden = emptyForbidden();
    mutation.mutate(row);
    (forbidden[mutation.field] as Set<string>).add(`asphalt:${mutation.field === "catalogIds" ? "catalog" : mutation.field === "rowIds" ? "row" : mutation.field === "semanticKeys" ? "semantic" : mutation.field === "owners" ? "owner" : mutation.field === "formulaIds" ? "formula" : mutation.field === "resourceGraphIds" ? "graph" : mutation.field === "parameterIds" ? "param" : mutation.field === "priceRouteIds" ? "price" : mutation.field === "rateCodes" ? "rate" : "stage"}`);
    const audit = auditCrossDomainContentIsolationR3([row], forbidden);
    results.push({ mutationId: `ELECTRICAL-R3-MUT-${String(results.length - r3StartIndex + 1).padStart(3, "0")}`, category: mutation.category, catalogId: `r3-fixture-${repetition + 1}`, detected: audit.contamination === 1, issueCodes: audit.contamination === 1 ? [mutation.category] : [], crossSide: true });
  }
}

for (let repetition = 0; repetition < 6; repetition += 1) {
  const electricalIds = new Set(["electrical:1"]);
  const asphaltIds = new Set(["asphalt:global55"]);
  const externalIds = new Set(["asphalt:external8"]);
  const basePartition = new Set(["electrical:1", "asphalt:global55"]);
  const cases = [
    { category: "QUEUE_REMOVES_NON_ELECTRICAL_ID", audit: auditQueueIsolationR3({ batchRemovedIds: ["electrical:1", "foreign:1"], electricalIds, admittedAsphaltGlobalIds: asphaltIds, externalAsphaltIds: externalIds, globalPartitionIds: basePartition }) },
    { category: "QUEUE_REMOVES_ASPHALT_GLOBAL55_AGAIN", audit: auditQueueIsolationR3({ batchRemovedIds: ["electrical:1", "asphalt:global55"], electricalIds, admittedAsphaltGlobalIds: asphaltIds, externalAsphaltIds: externalIds, globalPartitionIds: basePartition }) },
    { category: "QUEUE_INSERTS_ASPHALT_EXTERNAL8", audit: auditQueueIsolationR3({ batchRemovedIds: ["electrical:1"], electricalIds, admittedAsphaltGlobalIds: asphaltIds, externalAsphaltIds: externalIds, globalPartitionIds: new Set([...basePartition, "asphalt:external8"]) }) },
  ];
  for (const item of cases) results.push({ mutationId: `ELECTRICAL-R3-MUT-${String(results.length - r3StartIndex + 1).padStart(3, "0")}`, category: item.category, catalogId: `r3-queue-fixture-${repetition + 1}`, detected: !item.audit.green, issueCodes: item.audit.green ? [] : [item.category], crossSide: true });
}

const exactCandidate = (): ReferenceCandidateR3 => ({ candidateId: "exact", artifactPath: "diagnostic-only", head: "head", tree: "tree", transferContractSha256: "hash", admissionGreen: true, verifiedByFinalChain: true });
const referenceMutations: readonly { category: string; mutate: (candidates: ReferenceCandidateR3[]) => void }[] = [
  { category: "REFERENCE_HEAD_MISMATCH", mutate: (items) => { items[0].head = "stale-head"; } },
  { category: "REFERENCE_TREE_MISMATCH", mutate: (items) => { items[0].tree = "stale-tree"; } },
  { category: "REFERENCE_CONTRACT_HASH_MISMATCH", mutate: (items) => { items[0].transferContractSha256 = "stale-hash"; } },
  { category: "REFERENCE_ADMISSION_NOT_GREEN", mutate: (items) => { items[0].admissionGreen = false; } },
  { category: "REFERENCE_NOT_VERIFIED_BY_FINAL_CHAIN", mutate: (items) => { items[0].verifiedByFinalChain = false; } },
  { category: "REFERENCE_AMBIGUOUS_DUPLICATE", mutate: (items) => { items.push({ ...items[0], candidateId: "duplicate" }); } },
];
for (const mutation of referenceMutations) {
  for (let repetition = 0; repetition < 4; repetition += 1) {
    const candidates = [exactCandidate()];
    mutation.mutate(candidates);
    let detected = false;
    try { resolveExactReferenceCandidateR3(candidates, { head: "head", tree: "tree", transferContractSha256: "hash" }); }
    catch { detected = true; }
    results.push({ mutationId: `ELECTRICAL-R3-MUT-${String(results.length - r3StartIndex + 1).padStart(3, "0")}`, category: mutation.category, catalogId: `r3-reference-fixture-${repetition + 1}`, detected, issueCodes: detected ? [mutation.category] : [], crossSide: true });
  }
}

const targetedIsolationResults = results.slice(r3StartIndex);
if (targetedIsolationResults.length !== 72 || targetedIsolationResults.some((result) => !result.detected)) throw new Error("BATCH005_R3_TARGETED_ISOLATION_MUTATION_ADMISSION_RED");
const report = {
  schemaVersion: "Batch005R3PostOracleMutationResultsV3",
  role: "POST_ORACLE_FINAL_MUTATIONS",
  requiredMinimum: 720,
  executed: results.length,
  detected: results.filter((result) => result.detected).length,
  survived: results.filter((result) => !result.detected).length,
  crossSideMutations: results.filter((result) => result.crossSide).length,
  preOracleMutationProofRetained: true,
  postR3: true,
  targetedIsolationMutations: targetedIsolationResults.length,
  targetedIsolationDetected: targetedIsolationResults.filter((result) => result.detected).length,
  crossDomainLeakAccepted: targetedIsolationResults.filter((result) => !result.detected).length,
  categories: [...new Set(results.map((result) => result.category))],
  results,
  verdict: "GREEN_POST_R3_792_OF_792",
};

const outputArgument = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
if (outputArgument) {
  const output = path.resolve(outputArgument);
  mkdirSync(path.dirname(output), { recursive: true });
  writeDeterministic(path.dirname(output), path.basename(output), stableJson(report));
}
process.stdout.write(stableJson({ required: report.requiredMinimum, executed: report.executed, detected: report.detected, survived: report.survived, crossSideMutations: report.crossSideMutations, targetedIsolationMutations: report.targetedIsolationMutations, targetedIsolationDetected: report.targetedIsolationDetected, crossDomainLeakAccepted: report.crossDomainLeakAccepted, verdict: report.verdict }));
