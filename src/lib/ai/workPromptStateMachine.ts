import {
  normalizeInlineWorkPromptText,
  extractWorkParamsFromInlinePrompt,
} from "./extractWorkParamsFromInlinePrompt";
import { parseInlineWorkEstimatePrompt, type InlineWorkPromptParseResult } from "./parseInlineWorkEstimatePrompt";

export type WorkPromptStateStatus =
  | "IDLE"
  | "TYPING_WORK"
  | "SUGGESTIONS_VISIBLE"
  | "TEMPLATE_SELECTED"
  | "TYPING_PARAMS_AFTER_SELECTION"
  | "AUTO_MATCHED_WITH_PARAMS"
  | "AMBIGUOUS_NEEDS_SELECTION"
  | "READY_TO_BUILD_PRELIMINARY"
  | "BUILDING_DRAFT"
  | "DRAFT_READY";

export type WorkPromptState = {
  status: WorkPromptStateStatus;
  rawInput: string;
  selectedTemplateId: string | null;
  selectedTemplateName: string | null;
  parseResult: InlineWorkPromptParseResult;
};

export type WorkPromptStateInput = {
  rawInput: string;
  selectedTemplateId?: string | null;
  selectedWorkKey?: string | null;
  selectedTemplateName?: string | null;
  previousState?: WorkPromptState | null;
  buildingDraft?: boolean;
  draftReady?: boolean;
};

function hasExtractedParams(rawInput: string): boolean {
  return Object.keys(extractWorkParamsFromInlinePrompt(rawInput)).length > 0;
}

export function shouldPreserveInlineSelectedTemplate(input: {
  previousState?: WorkPromptState | null;
  rawInput: string;
}): boolean {
  const previous = input.previousState;
  if (!previous?.selectedTemplateId) return false;
  const nextText = normalizeInlineWorkPromptText(input.rawInput);
  if (!nextText) return false;
  const previousRaw = normalizeInlineWorkPromptText(previous.rawInput);
  const previousName = normalizeInlineWorkPromptText(previous.selectedTemplateName ?? "");
  return (
    nextText.startsWith(previousRaw) ||
    Boolean(previousName && nextText.includes(previousName)) ||
    hasExtractedParams(nextText)
  );
}

export function deriveWorkPromptState(input: WorkPromptStateInput): WorkPromptState {
  const preservedSelectedTemplateId =
    input.selectedTemplateId ??
    input.selectedWorkKey ??
    (shouldPreserveInlineSelectedTemplate(input) ? input.previousState?.selectedTemplateId ?? null : null);
  const preservedSelectedTemplateName =
    input.selectedTemplateName ??
    (preservedSelectedTemplateId === input.previousState?.selectedTemplateId
      ? input.previousState?.selectedTemplateName ?? null
      : null);
  const parseResult = parseInlineWorkEstimatePrompt({
    rawInput: input.rawInput,
    selectedTemplateId: preservedSelectedTemplateId,
    selectedTemplateName: preservedSelectedTemplateName,
  });

  const selectedTemplateId = parseResult.matchedTemplate?.templateId ?? preservedSelectedTemplateId ?? null;
  const selectedTemplateName = parseResult.matchedTemplate?.templateName ?? preservedSelectedTemplateName ?? null;
  const paramsPresent = Object.keys(parseResult.extractedParams).length > 0;

  let status: WorkPromptStateStatus;
  if (input.draftReady) {
    status = "DRAFT_READY";
  } else if (input.buildingDraft) {
    status = "BUILDING_DRAFT";
  } else if (!input.rawInput.trim()) {
    status = "IDLE";
  } else if (parseResult.canBuildPreliminaryEstimate && paramsPresent) {
    status = parseResult.matchedTemplate?.matchSource === "user_selected"
      ? "READY_TO_BUILD_PRELIMINARY"
      : "AUTO_MATCHED_WITH_PARAMS";
  } else if (selectedTemplateId && paramsPresent) {
    status = "TYPING_PARAMS_AFTER_SELECTION";
  } else if (selectedTemplateId) {
    status = "TEMPLATE_SELECTED";
  } else if (parseResult.mustAskUserToSelectTemplate) {
    status = "AMBIGUOUS_NEEDS_SELECTION";
  } else if (parseResult.candidateTemplates.length > 0) {
    status = "SUGGESTIONS_VISIBLE";
  } else {
    status = "TYPING_WORK";
  }

  return {
    status,
    rawInput: input.rawInput,
    selectedTemplateId,
    selectedTemplateName,
    parseResult,
  };
}
