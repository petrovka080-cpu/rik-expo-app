import type { ElectricalDomainInventoryRow } from "./inventory";
import {
  ELECTRICAL_COMPLETENESS_SLOTS_V2,
  type ElectricalCompletenessDecisionV2,
  type ElectricalMaximumResourceCandidateV2,
} from "./maximumResourceScopeV2";
import type { ElectricalParameterSeedV2 } from "./parameterProfileV2";

export type ElectricalMaximumScopeAuditIssueV2 = {
  code: string;
  detail: string;
};

export type ElectricalMaximumScopeAuditSnapshotV2 = {
  inventory: ElectricalDomainInventoryRow;
  candidates: readonly ElectricalMaximumResourceCandidateV2[];
  decisions: readonly ElectricalCompletenessDecisionV2[];
  parameters: readonly ElectricalParameterSeedV2[];
};

const ALLOWED_DISPOSITIONS = new Set([
  "INCLUDED_AS_SEPARATE_ROW",
  "INCLUDED_AS_EXPLICIT_COMPONENT_OF_VERIFIED_MANUFACTURER_BOM",
  "PROJECT_INPUT_REQUIRED",
  "OWNED_BY_EXACT_TYPED_CHILD",
  "OWNED_BY_EXACT_PARENT",
  "MUTUALLY_EXCLUSIVE_VARIANT_NOT_SELECTED",
  "NOT_APPLICABLE_WITH_REASON",
]);

export function auditElectricalMaximumScopeSnapshotV2(snapshot: ElectricalMaximumScopeAuditSnapshotV2): readonly ElectricalMaximumScopeAuditIssueV2[] {
  const issues: ElectricalMaximumScopeAuditIssueV2[] = [];
  const { inventory, candidates, decisions, parameters } = snapshot;
  if (!inventory.catalog_id || !inventory.work_key || !inventory.localized_name_ru) issues.push({ code: "IDENTITY_MISSING", detail: inventory.catalog_id });
  if (candidates.length === 0) issues.push({ code: "CANDIDATES_EMPTY", detail: inventory.catalog_id });

  const candidateIds = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.candidate_id || candidateIds.has(candidate.candidate_id)) issues.push({ code: "CANDIDATE_ID_DUPLICATE", detail: candidate.candidate_id });
    candidateIds.add(candidate.candidate_id);
    if (!candidate.title_ru.trim()) issues.push({ code: "CANDIDATE_TITLE_EMPTY", detail: candidate.candidate_id });
    if (/^(комплект|прочие материалы|кабель и комплектующие|щит в комплекте|электроизмерения)$/iu.test(candidate.title_ru.trim())) issues.push({ code: "HIDDEN_AGGREGATE", detail: candidate.candidate_id });
    if (!candidate.unit_id || !candidate.section_ru || !candidate.category) issues.push({ code: "ROW_CONTRACT_INCOMPLETE", detail: candidate.candidate_id });
    if (!candidate.normative_source_id || !candidate.applicability) issues.push({ code: "NORMATIVE_TRACE_INCOMPLETE", detail: candidate.candidate_id });
    if (!ELECTRICAL_COMPLETENESS_SLOTS_V2.includes(candidate.completeness_slot_v2)) issues.push({ code: "COMPLETENESS_SLOT_INVALID", detail: candidate.candidate_id });
    if (candidate.formula_basis !== "EXACT_PROJECT_INPUT") issues.push({ code: "FORMULA_BASIS_INVALID", detail: candidate.candidate_id });
    if (candidate.owner !== "ELECTRICAL" && candidate.completeness_slot_v2 !== "TYPED_CHILD_INTERFACES") issues.push({ code: "TYPED_CHILD_COST_BOUNDARY_INVALID", detail: candidate.candidate_id });
  }

  const decisionSlots = new Set<string>();
  if (decisions.length !== 36) issues.push({ code: "DECISION_DENOMINATOR", detail: String(decisions.length) });
  for (const decision of decisions) {
    if (decisionSlots.has(decision.slot)) issues.push({ code: "DECISION_SLOT_DUPLICATE", detail: decision.slot });
    decisionSlots.add(decision.slot);
    if (!ALLOWED_DISPOSITIONS.has(decision.disposition)) issues.push({ code: "DECISION_UNKNOWN", detail: `${decision.slot}:${decision.disposition}` });
    if (!decision.reason_ru.trim()) issues.push({ code: "DECISION_REASON_EMPTY", detail: decision.slot });
    const expected = candidates.filter((candidate) => candidate.completeness_slot_v2 === decision.slot).map((candidate) => candidate.candidate_id).sort();
    const actual = [...decision.candidate_ids].sort();
    if (expected.join("|") !== actual.join("|")) issues.push({ code: "DECISION_CANDIDATE_MISMATCH", detail: decision.slot });
  }
  for (const slot of ELECTRICAL_COMPLETENESS_SLOTS_V2) if (!decisionSlots.has(slot)) issues.push({ code: "DECISION_SLOT_MISSING", detail: slot });

  const parameterIds = new Set<string>();
  for (const parameter of parameters) {
    if (!parameter.parameter_id || parameterIds.has(parameter.parameter_id)) issues.push({ code: "PARAMETER_ID_DUPLICATE", detail: parameter.parameter_id });
    parameterIds.add(parameter.parameter_id);
    if (!parameter.label_ru.trim() || !parameter.normative_source_id) issues.push({ code: "PARAMETER_TRACE_INCOMPLETE", detail: parameter.parameter_id });
    if (parameter.input_type === "number" && (parameter.minimum == null || parameter.maximum == null || parameter.minimum > parameter.maximum)) issues.push({ code: "PARAMETER_BOUND_INVALID", detail: parameter.parameter_id });
    if (parameter.input_type === "choice" && !(parameter.choices?.length)) issues.push({ code: "PARAMETER_CHOICES_EMPTY", detail: parameter.parameter_id });
    if (!parameter.candidate_prefixes.some((prefix) => candidates.some((candidate) => candidate.candidate_id.startsWith(prefix)))) issues.push({ code: "PARAMETER_UNUSED", detail: parameter.parameter_id });
  }
  return Object.freeze(issues);
}
