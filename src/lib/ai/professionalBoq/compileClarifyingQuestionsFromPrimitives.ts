import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqClarifyingQuestions } from "./buildBoqClarifyingQuestions";

export function compileClarifyingQuestionsFromPrimitives(primitive: WorldConstructionPrimitive): string[] {
  return buildBoqClarifyingQuestions(primitive);
}
