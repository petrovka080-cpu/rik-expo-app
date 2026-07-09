import type { AiEstimateCatalogIndexEntry } from "../catalog/AiEstimateCatalogIndex";

export type AiEstimateSemanticWorkFamily =
  | "apartment_repair"
  | "bathroom_repair"
  | "road"
  | "water_supply"
  | "sewerage"
  | "power_line"
  | "substation"
  | "facade"
  | "roof"
  | "drilling"
  | "fence"
  | "dam"
  | "bridge"
  | "boiler"
  | "ventilation"
  | "electrical"
  | "heating"
  | "demolition"
  | "concrete"
  | "glazing"
  | "other";

export type AiEstimateWorkClassification = {
  family: AiEstimateSemanticWorkFamily;
  confidence: number;
  matchedRules: string[];
  parameterHints: string[];
};

export type AiEstimateWorkClassifier = {
  classify(input: string | AiEstimateCatalogIndexEntry): AiEstimateWorkClassification;
};
