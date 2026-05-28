import type { GlobalEstimateSectionType, GlobalUnitInput } from "../globalEstimate";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import type {
  PARAMETRIC_BOQ_RECIPE_COMPILER_ID,
  ParametricBoqRecipeMode,
} from "./parametricBoqRecipeTypes";

export type ProfessionalBoqRow = {
  sectionType: GlobalEstimateSectionType;
  code: string;
  nameRu: string;
  unit: GlobalUnitInput["normalizedUnit"] | "hour";
  quantityFactor: number;
  unitPrice: number;
  materialKey?: string;
  rateKey: string;
  sourcePolicy: "configured_reference" | "manual_review";
  catalogPolicy: "candidate_or_gap_warning" | "not_material";
  commentRu: string;
};

export type ProfessionalBoqSection = {
  type: GlobalEstimateSectionType;
  titleRu: string;
  rows: ProfessionalBoqRow[];
};

export type ProfessionalBoqResult = {
  primitive: WorldConstructionPrimitive;
  compilerId?: typeof PARAMETRIC_BOQ_RECIPE_COMPILER_ID;
  recipeMode?: ParametricBoqRecipeMode;
  sections: ProfessionalBoqSection[];
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  catalogGapWarnings: string[];
};
