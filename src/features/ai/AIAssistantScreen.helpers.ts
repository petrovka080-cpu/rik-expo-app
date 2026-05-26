import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { AssistantMessage } from "./assistant.types";

export const recordAssistantScreenFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "ai",
    surface: "assistant_screen",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "assistant_screen_failed"),
    extra: {
      module: "ai.AIAssistantScreen",
      route: "/ai",
      role: "ai",
      owner: "assistant_screen",
      severity: "error",
      ...extra,
    },
  });

export function createAssistantScreenMessage(
  role: AssistantMessage["role"],
  content: string,
  extras: Partial<Pick<AssistantMessage, "estimatePdfSource" | "estimatePresentation" | "actions">> = {},
): AssistantMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

export function normalizeGroundedRouteParams(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | number | boolean | null | undefined> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}
