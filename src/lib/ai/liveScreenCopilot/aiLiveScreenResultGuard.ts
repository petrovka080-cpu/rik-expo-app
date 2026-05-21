import type { AiSourceRef } from "../appContextGraph";
import type { UniversalRoleQaAnswer } from "../universalRoleQa";
import type {
  AiLiveButtonResultGuard,
  AiLiveScreenButton,
} from "./aiLiveScreenButtonContract";
import type { AiLiveScreenPresentedOpenLink } from "./aiLiveScreenAnswerPresenter";
import { validateAiLiveScreenNoise } from "./aiLiveScreenNoiseGuard";
import { findAiLiveRussianCopyIssues } from "./aiLiveScreenRussianCopyGuard";

function includesAny(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function findFailure(input: {
  clicked: boolean;
  resultVisible: boolean;
  answerMatchesButton: boolean;
  hasSourceSection: boolean;
  hasNextStep: boolean;
  hasStatus: boolean;
  hasOpenLinksWhenExpected: boolean;
  noBlankModal: boolean;
  noEnglishNoise: boolean;
  noDebugNoise: boolean;
  noProviderNoise: boolean;
  noDangerousMutation: boolean;
}): AiLiveButtonResultGuard["failureReason"] | undefined {
  if (!input.clicked) return "button_not_clickable";
  if (!input.resultVisible) return "no_result_visible";
  if (!input.noBlankModal) return "blank_modal";
  if (!input.answerMatchesButton) return "answer_mismatch";
  if (!input.hasSourceSection) return "missing_sources";
  if (!input.hasNextStep) return "missing_next_step";
  if (!input.hasStatus) return "missing_status";
  if (!input.hasOpenLinksWhenExpected) return "missing_sources";
  if (!input.noEnglishNoise) return "english_noise";
  if (!input.noDebugNoise) return "debug_noise";
  if (!input.noProviderNoise) return "provider_noise";
  if (!input.noDangerousMutation) return "dangerous_mutation";
  return undefined;
}

export function validateAiLiveButtonResult(input: {
  button: AiLiveScreenButton;
  answerTextRu: string;
  sourceRefs: readonly AiSourceRef[];
  openLinks: readonly AiLiveScreenPresentedOpenLink[];
  safetyStatus: UniversalRoleQaAnswer["safetyStatus"];
  clicked: boolean;
  resultVisible: boolean;
}): AiLiveButtonResultGuard {
  const text = String(input.answerTextRu || "");
  const russian = findAiLiveRussianCopyIssues(text);
  const noise = validateAiLiveScreenNoise(text);
  const answerMatchesButton =
    includesAny(text, input.button.expectedAnswerSignalsRu) &&
    !includesAny(text, input.button.forbiddenAnswerSignalsRu);
  const hasShortAnswer = text.includes("Коротко:");
  const hasSourceSection = text.includes("Источник ответа:");
  const hasNextStep = text.includes("Следующий шаг:");
  const hasStatus = text.includes("Статус:");
  const hasOpenLinksWhenExpected =
    input.sourceRefs.length === 0 ||
    input.openLinks.length > 0 ||
    input.button.expectedOpenLinkTypes.length === 0;
  const noBlankModal = text.trim().length > 60;
  const noEnglishNoise = russian.englishSignals.length === 0 && russian.mojibakeSignals.length === 0;
  const noDebugNoise = noise.debugSignals.length === 0 && !noise.rawPayloadVisible;
  const noProviderNoise = noise.providerSignals.length === 0;
  const noDangerousMutation =
    input.safetyStatus.changedData === false &&
    input.safetyStatus.finalSubmit === false &&
    input.safetyStatus.autoApproval === false &&
    input.safetyStatus.dangerousMutation === false;

  const base = {
    buttonId: input.button.id,
    screenId: input.button.screenId,
    clicked: input.clicked,
    resultVisible: input.resultVisible,
    answerMatchesButton,
    hasShortAnswer,
    hasSourceSection,
    hasNextStep,
    hasStatus,
    hasOpenLinksWhenExpected,
    noBlankModal,
    noEnglishNoise,
    noDebugNoise,
    noProviderNoise,
    noDangerousMutation,
  };

  return {
    ...base,
    failureReason: findFailure(base),
  };
}
