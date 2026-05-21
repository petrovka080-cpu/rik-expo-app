import type { MediaLifecycleDecision, MediaLifecycleTransition } from "../mediaTypes";

const AI_ALLOWED_TRANSITIONS: readonly MediaLifecycleTransition[] = [
  "ai_processing_started",
  "ai_processed",
  "ai_needs_human_review",
  "ai_failed",
] as const;

export function decideMediaLifecycleTransition(input: {
  transition: MediaLifecycleTransition;
  actor: "ai" | "human" | "system";
}): MediaLifecycleDecision {
  const aiMayPerform = AI_ALLOWED_TRANSITIONS.includes(input.transition);
  if (input.actor === "ai" && !aiMayPerform) {
    return {
      allowed: false,
      reasonRu: "AI не может финально подтверждать, публиковать или связывать медиа.",
      aiMayPerform: false,
    };
  }

  return {
    allowed: true,
    reasonRu: input.actor === "ai" ? "AI может обновить только статус анализа." : "Действие требует человека или системной политики.",
    aiMayPerform,
  };
}
