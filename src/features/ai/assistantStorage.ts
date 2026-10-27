import type { AssistantMessage } from "./assistant.types";
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from "../../lib/storage/classifiedStorage";

export type AssistantParsedItemSnapshot = {
  name: string;
  qty: number;
  unit: string;
  kind: "material" | "work" | "service";
  specs?: string | null;
};

export type ForemanAssistantSession = {
  draft_request_id: string | null;
  draft_display_no: string | null;
  pending_items: AssistantParsedItemSnapshot[];
};

const STORAGE_PREFIX = "gox.ai.chat.v1";
const FOREMAN_SESSION_PREFIX = "gox.ai.foreman.session.v1";
const AI_CHAT_TTL_MS = 24 * 60 * 60 * 1000;
const AI_FOREMAN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function buildAssistantChatStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}:${userId || "anonymous"}`;
}

export function buildForemanSessionStorageKey(userId: string): string {
  return `${FOREMAN_SESSION_PREFIX}:${userId}`;
}

export async function loadAssistantMessages(userId: string | null): Promise<AssistantMessage[]> {
  const stored = await readStoredJson<AssistantMessage[]>({
    screen: "ai",
    surface: "assistant_storage",
    key: buildAssistantChatStorageKey(userId),
    ttlMs: AI_CHAT_TTL_MS,
    webTarget: "session",
  });
  return Array.isArray(stored) ? stored : [];
}

export async function saveAssistantMessages(
  userId: string | null,
  messages: AssistantMessage[],
): Promise<void> {
  await writeStoredJson(
    {
      screen: "ai",
      surface: "assistant_storage",
      key: buildAssistantChatStorageKey(userId),
      ttlMs: AI_CHAT_TTL_MS,
      webTarget: "session",
    },
    messages.slice(-30),
  );
}

export async function clearAssistantMessages(userId: string | null): Promise<void> {
  await removeStoredValue({
    screen: "ai",
    surface: "assistant_storage",
    key: buildAssistantChatStorageKey(userId),
    webTarget: "session",
  });
}

export async function loadForemanAssistantSession(
  userId: string,
): Promise<ForemanAssistantSession> {
  const stored = await readStoredJson<ForemanAssistantSession>({
    screen: "ai",
    surface: "assistant_storage",
    key: buildForemanSessionStorageKey(userId),
    ttlMs: AI_FOREMAN_SESSION_TTL_MS,
    webTarget: "session",
  });

  if (!stored) {
    return {
      draft_request_id: null,
      draft_display_no: null,
      pending_items: [],
    };
  }

  return {
    draft_request_id: stored.draft_request_id ?? null,
    draft_display_no: stored.draft_display_no ?? null,
    pending_items: Array.isArray(stored.pending_items) ? stored.pending_items : [],
  };
}

export async function saveForemanAssistantSession(
  userId: string,
  session: ForemanAssistantSession,
): Promise<void> {
  await writeStoredJson(
    {
      screen: "ai",
      surface: "assistant_storage",
      key: buildForemanSessionStorageKey(userId),
      ttlMs: AI_FOREMAN_SESSION_TTL_MS,
      webTarget: "session",
    },
    {
      draft_request_id: session.draft_request_id ?? null,
      draft_display_no: session.draft_display_no ?? null,
      pending_items: Array.isArray(session.pending_items) ? session.pending_items.slice(0, 12) : [],
    },
  );
}

export async function clearForemanAssistantSession(userId: string): Promise<void> {
  await removeStoredValue({
    screen: "ai",
    surface: "assistant_storage",
    key: buildForemanSessionStorageKey(userId),
    webTarget: "session",
  });
}
