import type { AiLiveScreenButton } from "./aiLiveScreenButtonContract";
import { getAiLiveScreenButton, listAiLiveScreenButtonsForScreen } from "./aiLiveScreenButtonRegistry";

export const AI_LIVE_SCREEN_CLICK_PREFIX = "Готово от AI:";

export function buildAiLiveScreenButtonClickPayload(button: Pick<AiLiveScreenButton, "id" | "labelRu">): string {
  return `${AI_LIVE_SCREEN_CLICK_PREFIX} ${button.id} · ${button.labelRu}`;
}

export function parseAiLiveScreenButtonClickPayload(value: string): { buttonId: string } | null {
  const text = String(value || "").trim();
  const escapedPrefix = AI_LIVE_SCREEN_CLICK_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedPrefix}\\s+([^·]+)\\s+·`).exec(text);
  return match?.[1]?.trim() ? { buttonId: match[1].trim() } : null;
}

export function isAiLiveScreenButtonClickPayload(value: string): boolean {
  return parseAiLiveScreenButtonClickPayload(value) !== null;
}

export function resolveAiLiveScreenConcreteQuestion(input: {
  screenId: string;
  buttonIdOrPayloadOrLabel: string;
}): { button: AiLiveScreenButton; concreteQuestionRu: string } | null {
  const payload = parseAiLiveScreenButtonClickPayload(input.buttonIdOrPayloadOrLabel);
  if (payload) {
    const button = getAiLiveScreenButton(payload.buttonId);
    return { button, concreteQuestionRu: button.concreteQuestionRu };
  }
  const needle = input.buttonIdOrPayloadOrLabel.trim().toLowerCase();
  const button = listAiLiveScreenButtonsForScreen(input.screenId).find(
    (candidate) => candidate.id.toLowerCase() === needle || candidate.labelRu.toLowerCase() === needle,
  );
  return button ? { button, concreteQuestionRu: button.concreteQuestionRu } : null;
}
