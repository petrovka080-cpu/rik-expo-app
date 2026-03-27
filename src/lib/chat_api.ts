import { supabase } from "./supabaseClient";

export type ChatMessageType = "text" | "photo" | "voice" | "file" | "system";

export type ChatMessage = {
  id: string;
  company_id: string | null;
  object_id: string | null;
  supplier_id: string | null;
  user_id: string;
  message_type: ChatMessageType;
  content: string | null;
  mentions: string[];
  media_url?: string | null;
  media_thumbnail?: string | null;
  media_duration?: number | null;
  read_by?: string[];
  reply_to_id?: string | null;
  reactions?: Record<string, string[]>;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  is_deleted: boolean;
  created_at: string;
  user?: {
    name: string;
  };
};

type ChatActor = {
  userId: string;
  fullName: string;
  companyId: string | null;
};

export const CHAT_BACKEND_HINT =
  "Apply db/20260317_chat_backend_foundation.sql to the current Supabase project before using chat.";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toTrimmedText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
};

const toChatMessage = (value: unknown): ChatMessage | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = toTrimmedText(record.id);
  const userId = toTrimmedText(record.user_id);
  const createdAt = toTrimmedText(record.created_at);
  const messageType = toTrimmedText(record.message_type) as ChatMessageType | null;
  if (!id || !userId || !createdAt || !messageType) return null;

  return {
    id,
    company_id: toTrimmedText(record.company_id),
    object_id: toTrimmedText(record.object_id),
    supplier_id: toTrimmedText(record.supplier_id),
    user_id: userId,
    message_type: messageType,
    content: toTrimmedText(record.content),
    mentions: toStringArray(record.mentions),
    media_url: toTrimmedText(record.media_url),
    media_thumbnail: toTrimmedText(record.media_thumbnail),
    media_duration: typeof record.media_duration === "number" ? record.media_duration : null,
    read_by: toStringArray(record.read_by),
    reply_to_id: toTrimmedText(record.reply_to_id),
    reactions: asRecord(record.reactions) as Record<string, string[]> | undefined,
    is_pinned: record.is_pinned === true,
    pinned_at: toTrimmedText(record.pinned_at),
    pinned_by: toTrimmedText(record.pinned_by),
    is_deleted: record.is_deleted === true,
    created_at: createdAt,
  };
};

function toChatError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    if (isChatBackendMissingError(error)) {
      return new Error(`Chat backend is not available yet. ${CHAT_BACKEND_HINT}`);
    }
    return error;
  }
  return new Error(fallback);
}

export function isChatBackendMissingError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return (
    message.includes("public.chat_messages") ||
    message.includes("public.chat_typing") ||
    message.includes("schema cache")
  );
}

async function loadCurrentChatActor(): Promise<ChatActor> {
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const user = authResult.user;
  if (!user) {
    throw new Error("User is not authenticated.");
  }

  const [profileResult, ownedCompanyResult, listingCompanyResult] = await Promise.all([
    supabase.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("companies").select("id").eq("owner_user_id", user.id).maybeSingle(),
    supabase
      .from("market_listings")
      .select("company_id")
      .eq("user_id", user.id)
      .not("company_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    userId: user.id,
    fullName: profileResult.data?.full_name || "User",
    companyId: ownedCompanyResult.data?.id || listingCompanyResult.data?.company_id || null,
  };
}

export async function fetchListingChatMessages(
  listingId: string,
  limit = 120,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages" as never)
    .select("*")
    .eq("supplier_id", listingId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw toChatError(error, "Failed to load chat messages.");

  const rows = Array.isArray(data) ? data.map(toChatMessage).filter((row): row is ChatMessage => Boolean(row)) : [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    for (const profile of profiles ?? []) {
      if (profile?.user_id) {
        userMap.set(profile.user_id, profile.full_name || "User");
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    user: {
      name: userMap.get(row.user_id) || "User",
    },
  }));
}

export async function sendListingChatMessage(
  listingId: string,
  content: string,
): Promise<ChatMessage> {
  const actor = await loadCurrentChatActor();

  const { data, error } = await supabase
    .from("chat_messages" as never)
    .insert({
      company_id: actor.companyId,
      object_id: null,
      supplier_id: listingId,
      user_id: actor.userId,
      message_type: "text",
      content: content.trim(),
      mentions: [],
    } as never)
    .select("*")
    .single();

  if (error) throw toChatError(error, "Failed to send message.");

  const message = toChatMessage(data);
  if (!message) {
    throw new Error("Failed to normalize sent message.");
  }

  return {
    ...message,
    user: { name: actor.fullName },
  };
}

export async function markListingChatMessagesRead(messages: ChatMessage[]): Promise<void> {
  const { data: authResult } = await supabase.auth.getUser();
  const currentUserId = authResult.user?.id;
  if (!currentUserId) return;

  const unread = messages.filter((message) => {
    if (message.user_id === currentUserId) return false;
    const readBy = Array.isArray(message.read_by) ? message.read_by : [];
    return !readBy.includes(currentUserId);
  });

  for (const message of unread) {
    const readBy = Array.isArray(message.read_by) ? message.read_by : [];
    const { error } = await supabase
      .from("chat_messages" as never)
      .update({ read_by: [...readBy, currentUserId] } as never)
      .eq("id", message.id);

    if (error && !isChatBackendMissingError(error)) {
      console.warn("[markListingChatMessagesRead]", error.message || error);
    }
  }
}

export async function deleteListingChatMessage(messageId: string): Promise<void> {
  const { data: authResult } = await supabase.auth.getUser();
  const currentUserId = authResult.user?.id;
  if (!currentUserId) {
    throw new Error("User is not authenticated.");
  }

  const { error } = await supabase
    .from("chat_messages" as never)
    .update({ is_deleted: true } as never)
    .eq("id", messageId)
    .eq("user_id", currentUserId);

  if (error) throw toChatError(error, "Failed to delete message.");
}

export function subscribeToListingChatMessages(
  listingId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`chat:listing:${listingId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `supplier_id=eq.${listingId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
