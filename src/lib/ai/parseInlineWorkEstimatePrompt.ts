import {
  extractWorkParamsFromInlinePrompt,
  type InlineWorkPromptExtractedParam,
} from "./extractWorkParamsFromInlinePrompt";
import {
  matchWorkTemplateFromPrompt,
  type InlineWorkTemplateCandidate,
  type InlineWorkTemplateMatch,
} from "./matchWorkTemplateFromPrompt";
import { getParameterSchemaForTemplate } from "../estimate/getParameterSchemaForTemplate";

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

function buildParamText(rawInput: string, matchedTemplate: InlineWorkTemplateMatch | null): string {
  if (!matchedTemplate) return rawInput.trim();
  const [start, end] = matchedTemplate.matchedTextSpan;
  const before = rawInput.slice(0, Math.max(0, start)).trim();
  const after = rawInput.slice(Math.min(rawInput.length, end)).trim();
  const combined = [before, after].filter(Boolean).join(" ").trim();
  return combined || rawInput.trim();
}

function buildMissingInputs(
  templateId: string | null | undefined,
  extractedParams: Record<string, InlineWorkPromptExtractedParam>,
): InlineWorkPromptMissingInput[] {
  if (!templateId) return [];
  const schema = getParameterSchemaForTemplate(templateId);
  if (!schema) return [];
  return [...schema.requiredParams, ...schema.optionalParams]
    .filter((param) => param.key !== "source_prompt")
    .filter((param) => !extractedParams[param.key])
    .map((param) => ({
      param: param.key,
      label: param.labelRu,
      requiredFor: param.requiredFor,
      blocksPreliminaryEstimate: false as const,
    }));
}

function buildAssumptions(
  templateId: string | null | undefined,
  extractedParams: Record<string, InlineWorkPromptExtractedParam>,
): InlineWorkPromptAssumption[] {
  const schema = templateId ? getParameterSchemaForTemplate(templateId) : null;
  const defaults = schema?.defaultAssumptions ?? [];
  const derived: InlineWorkPromptAssumption[] = [];
  if (extractedParams.volume_m3?.sourceText === "length_m * height_m * thickness_m") {
    derived.push({
      param: "volume_m3",
      value: extractedParams.volume_m3.value,
      reason: "Derived from user-entered length, height and thickness.",
      visibleToUser: true,
    });
  }
  return [...defaults, ...derived];
}

export function parseInlineWorkEstimatePrompt(
  input: string | ParseInlineWorkEstimatePromptInput,
): InlineWorkPromptParseResult {
  const parsedInput = typeof input === "string" ? { rawInput: input } : input;
  const rawInput = parsedInput.rawInput ?? "";
  const templateMatch = matchWorkTemplateFromPrompt(parsedInput);
  const extractedParams = extractWorkParamsFromInlinePrompt(rawInput);
  const templateId = templateMatch.matchedTemplate?.templateId ?? null;
  const missingInputs = buildMissingInputs(templateId, extractedParams);
  const assumptions = buildAssumptions(templateId, extractedParams);
  const rawInputPresent = rawInput.trim().length > 0;
  const canBuildPreliminaryEstimate =
    rawInputPresent &&
    Boolean(templateMatch.matchedTemplate) &&
    !templateMatch.mustAskUserToSelectTemplate;

  return {
    rawInput,
    matchedTemplate: templateMatch.matchedTemplate,
    candidateTemplates: templateMatch.candidateTemplates,
    paramText: buildParamText(rawInput, templateMatch.matchedTemplate),
    extractedParams,
    assumptions,
    missingInputs,
    canBuildPreliminaryEstimate,
    mustAskUserToSelectTemplate: templateMatch.mustAskUserToSelectTemplate,
    blockingReason: canBuildPreliminaryEstimate ? undefined : templateMatch.blockingReason,
  };
}
