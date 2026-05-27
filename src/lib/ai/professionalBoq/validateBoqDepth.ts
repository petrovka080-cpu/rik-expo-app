import { requiredMinimumRows } from "../worldConstructionOntology";
import type { ProfessionalBoqResult } from "./professionalBoqTypes";

export function validateBoqDepth(result: ProfessionalBoqResult): { passed: boolean; failures: string[]; rowCount: number; minimum: number } {
  const rowCount = result.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const minimum = requiredMinimumRows(result.primitive.complexity);
  const passed = rowCount >= minimum;
  return {
    passed,
    rowCount,
    minimum,
    failures: passed ? [] : [`boq_depth:${result.primitive.workKey ?? result.primitive.workFamily}:${rowCount}/${minimum}`],
  };
}
