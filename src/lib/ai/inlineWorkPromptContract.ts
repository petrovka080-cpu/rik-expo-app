import type { InlineWorkPromptExtractedParam } from "./extractWorkParamsFromInlinePrompt";
import type {
  InlineWorkTemplateCandidate,
  InlineWorkTemplateMatch,
} from "./matchWorkTemplateFromPrompt";
import type {
  RawInputFact,
  RawInputFactExtraction,
} from "../estimate/rawInputFactExtraction";

export type InlineWorkPromptAssumption = {
  param: string;
  value: unknown;
  reason: string;
  visibleToUser: true;
};

export type InlineWorkPromptMissingInput = {
  param: string;
  label: string;
  requiredFor: "better_accuracy" | "contract_ready" | "safety_review";
  blocksPreliminaryEstimate: false;
};

export type InlineWorkPromptParseResult = {
  rawInput: string;
  matchedTemplate: InlineWorkTemplateMatch | null;
  candidateTemplates: InlineWorkTemplateCandidate[];
  paramText: string;
  extractedParams: Record<string, InlineWorkPromptExtractedParam>;
  rawInputFacts: RawInputFact[];
  rawInputFactExtraction: RawInputFactExtraction;
  assumptions: InlineWorkPromptAssumption[];
  missingInputs: InlineWorkPromptMissingInput[];
  canBuildPreliminaryEstimate: boolean;
  mustAskUserToSelectTemplate: boolean;
  blockingReason?: string;
};

export type ParseInlineWorkEstimatePromptInput = {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  selectedTemplateName?: string | null;
};
