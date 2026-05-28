import type { ProfessionalBoqRow } from "../professionalBoq";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionFormulaPolicy } from "./constructionFormulaRegistry";

export function validateFormulaOutputUnits(input: {
  primitive: WorldConstructionPrimitive;
  rows: readonly ProfessionalBoqRow[];
}): { passed: boolean; failures: string[] } {
  const policy = getConstructionFormulaPolicy(input.primitive.domain);
  const failures = input.rows
    .filter((row) => row.unit !== "hour" && !policy.outputUnits.includes(row.unit))
    .map((row) => `OUTPUT_UNIT_NOT_ALLOWED:${input.primitive.domain}:${row.code}:${row.unit}`);
  return { passed: failures.length === 0, failures };
}
