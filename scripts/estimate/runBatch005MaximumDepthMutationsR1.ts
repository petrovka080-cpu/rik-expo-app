import { mkdirSync } from "node:fs";
import path from "node:path";
import { stableJson, writeDeterministic } from "./postM1ReadmissionR2Core";
import { ELECTRICAL_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/electricalComplete/inventory";
import {
  electricalCompletenessDecisionsV2,
  electricalMaximumResourceCandidatesForV2,
  type ElectricalCompletenessDecisionV2,
  type ElectricalMaximumResourceCandidateV2,
} from "../../src/lib/estimate/v4/domains/electricalComplete/maximumResourceScopeV2";
import { electricalApplicableParameterProfileV2, type ElectricalParameterSeedV2 } from "../../src/lib/estimate/v4/domains/electricalComplete/parameterProfileV2";
import { auditElectricalMaximumScopeSnapshotV2 } from "../../src/lib/estimate/v4/domains/electricalComplete/maximumScopeAuditV2";

type MutableSnapshot = {
  inventory: (typeof ELECTRICAL_DOMAIN_INVENTORY)[number];
  candidates: ElectricalMaximumResourceCandidateV2[];
  decisions: ElectricalCompletenessDecisionV2[];
  parameters: ElectricalParameterSeedV2[];
};

function snapshot(index: number): MutableSnapshot {
  const inventory = ELECTRICAL_DOMAIN_INVENTORY[index % ELECTRICAL_DOMAIN_INVENTORY.length];
  const candidates = electricalMaximumResourceCandidatesForV2(inventory);
  return JSON.parse(JSON.stringify({
    inventory,
    candidates,
    decisions: electricalCompletenessDecisionsV2(inventory),
    parameters: electricalApplicableParameterProfileV2(inventory, candidates.map((candidate) => candidate.candidate_id)),
  })) as MutableSnapshot;
}

const mutations = [
  ["IDENTITY_MISSING", (value: MutableSnapshot) => { (value.inventory as { catalog_id: string }).catalog_id = ""; }],
  ["CANDIDATE_REMOVED", (value: MutableSnapshot) => { value.candidates.splice(0, 1); }],
  ["CANDIDATE_ID_DUPLICATE", (value: MutableSnapshot) => { value.candidates[1].candidate_id = value.candidates[0].candidate_id; }],
  ["CANDIDATE_TITLE_EMPTY", (value: MutableSnapshot) => { value.candidates[0].title_ru = ""; }],
  ["HIDDEN_AGGREGATE", (value: MutableSnapshot) => { value.candidates[0].title_ru = "Прочие материалы"; }],
  ["ROW_CONTRACT_INCOMPLETE", (value: MutableSnapshot) => { value.candidates[0].unit_id = ""; }],
  ["NORMATIVE_TRACE_INCOMPLETE", (value: MutableSnapshot) => { value.candidates[0].normative_source_id = ""; }],
  ["COMPLETENESS_SLOT_INVALID", (value: MutableSnapshot) => { (value.candidates[0] as { completeness_slot_v2: string }).completeness_slot_v2 = "UNKNOWN"; }],
  ["TYPED_CHILD_COST_BOUNDARY_INVALID", (value: MutableSnapshot) => { value.candidates[0].owner = "CIVIL_TYPED_CHILD"; }],
  ["FORMULA_BASIS_INVALID", (value: MutableSnapshot) => { (value.candidates[0] as { formula_basis: string }).formula_basis = "HIDDEN_DEFAULT"; }],
  ["DECISION_DENOMINATOR", (value: MutableSnapshot) => { value.decisions.splice(0, 1); }],
  ["DECISION_UNKNOWN", (value: MutableSnapshot) => { (value.decisions[0] as { disposition: string }).disposition = "UNKNOWN"; }],
  ["DECISION_REASON_EMPTY", (value: MutableSnapshot) => { value.decisions[0].reason_ru = ""; }],
  ["PARAMETER_BOUND_INVALID", (value: MutableSnapshot) => {
    const numeric = value.parameters.find((parameter) => parameter.input_type === "number");
    if (!numeric) throw new Error("BATCH005_MUTATION_NUMERIC_PARAMETER_MISSING");
    numeric.minimum = 10;
    numeric.maximum = 1;
  }],
  ["PARAMETER_UNUSED", (value: MutableSnapshot) => {
    if (value.parameters.length === 0) throw new Error("BATCH005_MUTATION_PARAMETER_MISSING");
    value.parameters[0].candidate_prefixes = ["not_a_real_candidate_prefix"];
  }],
] as const;

const results: { mutationId: string; category: string; catalogId: string; detected: boolean; issueCodes: string[] }[] = [];
for (let categoryIndex = 0; categoryIndex < mutations.length; categoryIndex += 1) {
  const [category, mutate] = mutations[categoryIndex];
  for (let repetition = 0; repetition < 48; repetition += 1) {
    const value = snapshot(categoryIndex * 48 + repetition);
    const catalogId = value.inventory.catalog_id;
    mutate(value);
    const issues = auditElectricalMaximumScopeSnapshotV2(value);
    results.push({
      mutationId: `ELECTRICAL-V2-MUT-${String(results.length + 1).padStart(3, "0")}`,
      category,
      catalogId,
      detected: issues.length > 0,
      issueCodes: [...new Set(issues.map((issue) => issue.code))].sort(),
    });
  }
}

if (results.length !== 720 || results.some((result) => !result.detected)) throw new Error("BATCH005_MUTATION_ADMISSION_RED");
const report = {
  schemaVersion: "Batch005ElectricalMaximumDepthMutationResultsR1",
  required: 720,
  executed: results.length,
  detected: results.filter((result) => result.detected).length,
  survived: results.filter((result) => !result.detected).length,
  categories: mutations.map(([category]) => category),
  results,
  verdict: "GREEN_720_OF_720",
};

const outputArgument = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
if (outputArgument) {
  const output = path.resolve(outputArgument);
  mkdirSync(path.dirname(output), { recursive: true });
  writeDeterministic(path.dirname(output), path.basename(output), stableJson(report));
}
process.stdout.write(stableJson({ required: report.required, executed: report.executed, detected: report.detected, survived: report.survived, verdict: report.verdict }));
