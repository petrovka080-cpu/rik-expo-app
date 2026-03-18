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

function getSupabaseAny() {
  return supabase as any;
}

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

  const sb = getSupabaseAny();
  const [profileResult, ownedCompanyResult, listingCompanyResult] = await Promise.all([
    sb.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    sb.from("companies").select("id").eq("owner_user_id", user.id).maybeSingle(),
    sb
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
  const sb = getSupabaseAny();
  const { data, error } = await sb
    .from("chat_messages")
    .select("*")
    .eq("supplier_id", listingId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw toChatError(error, "Failed to load chat messages.");

  const rows = Array.isArray(data) ? (data as ChatMessage[]) : [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await sb
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
  const sb = getSupabaseAny();

  const { data, error } = await sb
    .from("chat_messages")
    .insert({
      company_id: actor.companyId,
      object_id: null,
      supplier_id: listingId,
      user_id: actor.userId,
      message_type: "text",
      content: content.trim(),
      mentions: [],
    })
    .select("*")
    .single();

  if (error) throw toChatError(error, "Failed to send message.");

  return {
    ...(data as ChatMessage),
    user: { name: actor.fullName },
  };
}

export async function markListingChatMessagesRead(messages: ChatMessage[]): Promise<void> {
  const { data: authResult } = await supabase.auth.getUser();
  const currentUserId = authResult.user?.id;
  if (!currentUserId) return;

  const sb = getSupabaseAny();
  const unread = messages.filter((message) => {
    if (message.user_id === currentUserId) return false;
    const readBy = Array.isArray(message.read_by) ? message.read_by : [];
    return !readBy.includes(currentUserId);
  });

  for (const message of unread) {
    const readBy = Array.isArray(message.read_by) ? message.read_by : [];
    const { error } = await sb
      .from("chat_messages")
      .update({ read_by: [...readBy, currentUserId] })
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

  const sb = getSupabaseAny();
  const { error } = await sb
    .from("chat_messages")
    .update({ is_deleted: true })
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
