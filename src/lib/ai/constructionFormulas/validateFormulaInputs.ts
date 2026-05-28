import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionFormulaPolicy } from "./constructionFormulaRegistry";

export function validateFormulaInputs(primitive: WorldConstructionPrimitive): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const policy = getConstructionFormulaPolicy(primitive.domain);
  if (!Number.isFinite(primitive.volume) || primitive.volume <= 0) {
    failures.push(`INVALID_VOLUME:${primitive.volume}`);
  }
  if (!policy.allowedInputUnits.includes(primitive.unit)) {
    failures.push(`INPUT_UNIT_NOT_ALLOWED:${primitive.domain}:${primitive.unit}`);
  }
  if (policy.formulaCandidates.length === 0) {
    failures.push(`FORMULA_POLICY_MISSING:${primitive.domain}`);
  }
  return { passed: failures.length === 0, failures };
}
