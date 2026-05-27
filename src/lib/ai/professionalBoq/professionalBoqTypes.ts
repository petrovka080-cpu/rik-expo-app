import type { GlobalEstimateSectionType, GlobalUnitInput } from "../globalEstimate";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

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
  sections: ProfessionalBoqSection[];
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  catalogGapWarnings: string[];
};
