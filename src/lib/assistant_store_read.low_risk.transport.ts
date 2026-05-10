import { client, normalizePage } from "./api/_core";
import {
  ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS,
  type AssistantStoreReadBffReadErrorDto,
  type AssistantStoreReadBffReadResultDto,
  type AssistantStoreReadBffRequestDto,
} from "./assistant_store_read.bff.contract";
import { callAssistantStoreReadBff } from "./assistant_store_read.bff.client";
import { supabase } from "./supabaseClient";

export type LowRiskReadResult<T> = {
  data: T[] | null;
  error: { code?: string; message?: string } | null;
};

export type CurrentProfileFullNameRow = {
  full_name?: string | null;
};

export type ChatActorContextRow = {
  profile_full_name?: string | null;
  owned_company_id?: string | null;
  listing_company_id?: string | null;
};

export type ChatProfileNameRow = {
  user_id?: string | null;
  full_name?: string | null;
};

const CHAT_MESSAGE_SELECT =
  "id,company_id,object_id,supplier_id,user_id,message_type,content,mentions,media_url,media_thumbnail,media_duration,read_by,reply_to_id,reactions,is_pinned,pinned_at,pinned_by,is_deleted,created_at";

const bffErrorToReadError = (
  error: AssistantStoreReadBffReadErrorDto | { code?: string; message?: string },
): { code?: string; message?: string } => ({
  code: "code" in error ? error.code : undefined,
  message: error.message,
});

const bffResultToReadResult = <T>(
  result: AssistantStoreReadBffReadResultDto,
): LowRiskReadResult<T> => ({
  data: result.data === null ? null : (result.data as T[]),
  error: result.error ? bffErrorToReadError(result.error) : null,
});

export const loadAssistantStoreRowsViaBff = async <T>(
  request: AssistantStoreReadBffRequestDto,
  fallback: () => Promise<LowRiskReadResult<T>>,
): Promise<LowRiskReadResult<T>> => {
  const bffResult = await callAssistantStoreReadBff(request);
  if (bffResult.status === "ok") {
    return bffResultToReadResult<T>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToReadError(bffResult.error) };
  }
  return await fallback();
};

export async function loadCurrentProfileFullNameRow(
  userId: string,
): Promise<LowRiskReadResult<CurrentProfileFullNameRow>> {
  return await loadAssistantStoreRowsViaBff<CurrentProfileFullNameRow>(
    {
      operation: "profile.current.full_name",
      args: { userId },
    },
    async () => {
      const result = await supabase.from("user_profiles").select("full_name").eq("user_id", userId).maybeSingle();
      return {
        data: result.data ? [result.data as CurrentProfileFullNameRow] : [],
        error: result.error,
      };
    },
  );
}

export async function loadChatActorContextRows(
  userId: string,
): Promise<LowRiskReadResult<ChatActorContextRow>> {
  return await loadAssistantStoreRowsViaBff<ChatActorContextRow>(
    {
      operation: "chat.actor.context",
      args: { userId },
    },
    async () => {
      const [profileResult, ownedCompanyResult, listingCompanyResult] = await Promise.all([
        supabase.from("user_profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("companies").select("id").eq("owner_user_id", userId).maybeSingle(),
        supabase
          .from("market_listings")
          .select("company_id")
          .eq("user_id", userId)
          .not("company_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        data: [
          {
            profile_full_name: profileResult.data?.full_name ?? null,
            owned_company_id: ownedCompanyResult.data?.id ?? null,
            listing_company_id: listingCompanyResult.data?.company_id ?? null,
          },
        ],
        error: profileResult.error ?? ownedCompanyResult.error ?? listingCompanyResult.error ?? null,
      };
    },
  );
}

export async function loadListingChatMessageRows<T>(
  listingId: string,
  limit: number,
): Promise<LowRiskReadResult<T>> {
  return await loadAssistantStoreRowsViaBff<T>(
    {
      operation: "chat.listing.messages.list",
      args: { listingId, pageSize: limit },
    },
    async () => {
      const page = normalizePage({ pageSize: limit }, ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS);
      const result = await supabase
        .from("chat_messages" as never)
        .select(CHAT_MESSAGE_SELECT)
        .eq("supplier_id", listingId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(page.from, page.to);

      return {
        data: Array.isArray(result.data) ? (result.data as T[]) : [],
        error: result.error,
      };
    },
  );
}

export async function loadChatProfileRowsByUserIds(
  userIds: string[],
): Promise<LowRiskReadResult<ChatProfileNameRow>> {
  if (!userIds.length) return { data: [], error: null };
  return await loadAssistantStoreRowsViaBff<ChatProfileNameRow>(
    {
      operation: "chat.profiles_by_user_ids",
      args: { ids: userIds },
    },
    async () => {
      const profilePage = normalizePage(
        { pageSize: userIds.length },
        ASSISTANT_STORE_READ_BFF_CHAT_PAGE_DEFAULTS,
      );
      const result = await supabase
        .from("user_profiles")
        .select("user_id, full_name")
        .in("user_id", userIds)
        .order("user_id", { ascending: true })
        .range(profilePage.from, profilePage.to);

      return {
        data: Array.isArray(result.data) ? (result.data as ChatProfileNameRow[]) : [],
        error: result.error,
      };
    },
  );
}

export async function loadRequestsSubmittedAtCapability(): Promise<boolean> {
  const bffResult = await callAssistantStoreReadBff({
    operation: "request.submitted_at.capability",
    args: {},
  });
  if (bffResult.status === "ok") return true;

  const q = await client.from("requests").select("submitted_at").limit(1);
  if (q.error) throw q.error;
  return true;
}
