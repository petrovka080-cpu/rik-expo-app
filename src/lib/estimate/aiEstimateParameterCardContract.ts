import type { EstimateDraftRevisionParam } from "./estimateDraftRevisionContract";
import type {
  AiEstimateParameterInputKind,
  AiEstimateParameterRequiredFor,
} from "./aiEstimateParameterSchema";

export type AiEstimateParameterCardSource =
  | "user_prompt"
  | "manual_override"
  | "catalog_default"
  | "formula_derived"
  | "schema_missing";

export type AiEstimateParameterCard = {
  key: string;
  labelRu: string;
  value: EstimateDraftRevisionParam["value"] | null;
  displayValueRu: string;
  unitRu: string;
  source: AiEstimateParameterCardSource;
  sourceLabelRu: string;
  inputKind: AiEstimateParameterInputKind;
  editable: true;
  clickAction: "open_parameter_editor";
  noStepperControls: true;
  missing: boolean;
  requiredFor: AiEstimateParameterRequiredFor;
  requiredForLabelRu: string;
  affectsRowIds: string[];
  affectsRowTitlesRu: string[];
  formulaRefs: string[];
  clarificationTier?: "critical" | "recommended" | "optional";
  clarificationControl?: string;
  whyItMattersRu?: string;
  howToAnswerRu?: string;
  exampleRu?: string;
  changesInEstimateRu?: string;
  missingValueConsequenceRu?: string;
  provenanceRu?: string;
  choices?: { value: string; labelRu: string }[];
};
