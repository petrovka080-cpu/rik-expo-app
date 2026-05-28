import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import type { ParametricBoqRecipe } from "./parametricBoqRecipeTypes";

export function validateNoGenericFallbackForKnownWork(input: {
  primitive: WorldConstructionPrimitive;
  recipe: ParametricBoqRecipe;
}): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const knownDomain = input.primitive.intentDetected && input.primitive.domain !== "unknown";
  if (knownDomain && input.recipe.mode === "safe_template_gap_triage") {
    failures.push(`GENERIC_FALLBACK_FOR_KNOWN_WORK:${input.primitive.domain}`);
  }
  if (knownDomain && input.recipe.rows.length === 0) {
    failures.push(`KNOWN_WORK_WITHOUT_BOQ_ROWS:${input.primitive.domain}`);
  }
  return { passed: failures.length === 0, failures };
}
