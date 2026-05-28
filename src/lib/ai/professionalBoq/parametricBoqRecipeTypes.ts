import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import type { ProfessionalBoqRow } from "./professionalBoqTypes";

export const PARAMETRIC_BOQ_RECIPE_COMPILER_ID = "ParametricBoqRecipeCompiler" as const;

export type ParametricBoqRecipeMode =
  | "exact_governed_recipe"
  | "family_derived_recipe"
  | "method_derived_recipe"
  | "material_system_derived_recipe"
  | "safe_template_gap_triage"
  | "dangerous_regulated_safe_estimate_mode";

export type ParametricBoqRecipeClassification =
  | "EXPANDED_PROFESSIONAL_BOQ_OK"
  | "AMBIGUOUS_NEEDS_CLARIFICATION"
  | "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE"
  | "DANGEROUS_REGULATED_SAFE_ESTIMATE"
  | "GENERIC_FALLBACK_FOR_KNOWN_WORK"
  | "WEAK_GENERIC_BOQ_ROWS"
  | "UNIT_SEMANTICS_FAILED"
  | "OBJECT_SCOPE_MISCLASSIFIED"
  | "EXACT_PROMPT_LOOKUP_FOUND"
  | "UNKNOWN_NEEDS_TRACE";

export type ParametricBoqRecipe = {
  compilerId: typeof PARAMETRIC_BOQ_RECIPE_COMPILER_ID;
  mode: ParametricBoqRecipeMode;
  classification: ParametricBoqRecipeClassification;
  primitive: WorldConstructionPrimitive;
  rows: ProfessionalBoqRow[];
  exclusions: string[];
  clarifyingQuestions: string[];
  assumptions: string[];
};

export type ParametricBoqRecipeValidation = {
  passed: boolean;
  failures: string[];
  weakGenericRows: string[];
  minimumRows: number;
  actualRows: number;
};
