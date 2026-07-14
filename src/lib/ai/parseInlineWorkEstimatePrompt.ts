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
import {
  extractRawInputFactsFromPrompt,
  rawInputFactStringValue,
  type RawInputFact,
  type RawInputFactExtraction,
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
  rawInputFacts: readonly RawInputFact[],
  matchedFamily?: string | null,
): InlineWorkPromptMissingInput[] {
  const scaleClass = rawInputFactStringValue(rawInputFacts, "scale_class");
  if (matchedFamily === "solar_power_plant" && scaleClass === "utility_scale") {
    return [
      {
        param: "solar_capacity_basis",
        label: "100 МВт — это мощность DC или AC?",
        requiredFor: "better_accuracy",
        blocksPreliminaryEstimate: false as const,
      },
      {
        param: "solar_installation_type",
        label: "Наземная, крышная или плавучая станция?",
        requiredFor: "better_accuracy",
        blocksPreliminaryEstimate: false as const,
      },
      {
        param: "project_location",
        label: "Где расположена площадка?",
        requiredFor: "better_accuracy",
        blocksPreliminaryEstimate: false as const,
      },
      {
        param: "solar_mounting_type",
        label: "Фиксированные конструкции или трекеры?",
        requiredFor: "better_accuracy",
        blocksPreliminaryEstimate: false as const,
      },
      {
        param: "grid_connection_scope",
        label: "Входит ли подключение к электрической сети?",
        requiredFor: "better_accuracy",
        blocksPreliminaryEstimate: false as const,
      },
    ];
  }
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

function paramFromRawFact(fact: RawInputFact): InlineWorkPromptExtractedParam | null {
  if (
    fact.canonical_parameter_key === "work_family" ||
    fact.canonical_parameter_key === "capacity_unit"
  ) {
    return null;
  }
  return {
    value: fact.normalized_value,
    unit: fact.normalized_unit ?? undefined,
    canonicalUnit: fact.normalized_unit ?? undefined,
    sourceText: fact.raw_text,
    confidence: fact.confidence,
    factId: fact.fact_id,
    evidenceStart: fact.evidence_start,
    evidenceEnd: fact.evidence_end,
    passportOwner: fact.passport_owner,
    requiresConfirmation: fact.requires_confirmation,
    affectedFormulas: fact.affected_formulas,
  };
}

function mergeRawInputFactsIntoParams(
  extractedParams: Record<string, InlineWorkPromptExtractedParam>,
  rawInputFacts: readonly RawInputFact[],
): Record<string, InlineWorkPromptExtractedParam> {
  const merged = { ...extractedParams };
  for (const fact of rawInputFacts) {
    const param = paramFromRawFact(fact);
    if (!param) continue;
    merged[fact.canonical_parameter_key] = param;
  }
  return merged;
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
  const templateId = templateMatch.matchedTemplate?.templateId ?? null;
  const rawInputFactExtraction = extractRawInputFactsFromPrompt({
    rawInput,
    matchedFamily: templateMatch.matchedTemplate?.family,
    matchedTemplateId: templateId,
  });
  const extractedParams = mergeRawInputFactsIntoParams(
    extractWorkParamsFromInlinePrompt(rawInput),
    rawInputFactExtraction.facts,
  );
  const missingInputs = buildMissingInputs(
    templateId,
    extractedParams,
    rawInputFactExtraction.facts,
    templateMatch.matchedTemplate?.family,
  );
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
    rawInputFacts: rawInputFactExtraction.facts,
    rawInputFactExtraction,
    assumptions,
    missingInputs,
    canBuildPreliminaryEstimate,
    mustAskUserToSelectTemplate: templateMatch.mustAskUserToSelectTemplate,
    blockingReason: canBuildPreliminaryEstimate ? undefined : templateMatch.blockingReason,
  };
}
