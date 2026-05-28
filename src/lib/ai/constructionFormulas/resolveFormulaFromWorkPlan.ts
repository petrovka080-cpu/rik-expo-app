import type { ConstructionWorkPlan } from "../constructionInterpreter";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionFormulaPolicy, type ConstructionFormulaPolicy } from "./constructionFormulaRegistry";

export function resolveFormulaFromWorkPlan(
  input: ConstructionWorkPlan | WorldConstructionPrimitive,
): ConstructionFormulaPolicy {
  return getConstructionFormulaPolicy(input.domain as ConstructionFormulaPolicy["domain"]);
}
