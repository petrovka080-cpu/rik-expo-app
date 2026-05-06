import { supabase } from "../../lib/supabaseClient";
import { normalizePage } from "../../lib/api/_core";
import type { DbJson } from "../../lib/dbContract.types";
import {
  ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS,
  type AssistantStoreReadBffReadErrorDto,
  type AssistantStoreReadBffReadResultDto,
  type AssistantStoreReadBffRequestDto,
} from "../../lib/assistant_store_read.bff.contract";
import { callAssistantStoreReadBff } from "../../lib/assistant_store_read.bff.client";

export type AssistantActorReadScopeRow = {
  profile_full_name?: string | null;
  membership_company_id?: string | null;
  owned_company_id?: string | null;
  listing_company_id?: string | null;
};

export type AssistantMarketListingReadRow = {
  id?: string | null;
  title?: string | null;
  price?: number | string | null;
  city?: string | null;
  company_id?: string | null;
  user_id?: string | null;
  description?: string | null;
  kind?: string | null;
  items_json?: DbJson | null;
  status?: string | null;
  created_at?: string | null;
};

export type AssistantCompanyReadRow = {
  id?: string | null;
  name?: string | null;
};

export type AssistantProfileReadRow = {
  user_id?: string | null;
  full_name?: string | null;
};

type AssistantReadResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

const bffErrorToAssistantError = (
  error: AssistantStoreReadBffReadErrorDto | { message?: string },
): { message?: string } => ({
  message: error.message,
});

const bffResultToAssistantReadResult = <T,>(
  result: AssistantStoreReadBffReadResultDto,
): AssistantReadResult<T> => ({
  data: result.data === null ? null : (result.data as T[]),
  error: result.error ? bffErrorToAssistantError(result.error) : null,
});

const loadAssistantRowsViaBff = async <T,>(
  request: AssistantStoreReadBffRequestDto,
  fallback: () => Promise<AssistantReadResult<T>>,
): Promise<AssistantReadResult<T>> => {
  const bffResult = await callAssistantStoreReadBff(request);
  if (bffResult.status === "ok") {
    return bffResultToAssistantReadResult<T>(bffResult.response.result);
  }
  if (bffResult.status === "error") {
    return { data: null, error: bffErrorToAssistantError(bffResult.error) };
  }
  return await fallback();
};

export async function loadAssistantActorReadScope(
  userId: string,
): Promise<AssistantReadResult<AssistantActorReadScopeRow>> {
  return await loadAssistantRowsViaBff<AssistantActorReadScopeRow>(
    {
      operation: "assistant.actor.context",
      args: { userId },
    },
    async () => {
      const [profileResult, membershipResult, ownedCompanyResult, listingCompanyResult] = await Promise.all([
        supabase.from("user_profiles").select("full_name").eq("user_id", userId).maybeSingle(),
        supabase.from("company_members").select("company_id").eq("user_id", userId).limit(1).maybeSingle(),
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
            membership_company_id: membershipResult.data?.company_id ?? null,
            owned_company_id: ownedCompanyResult.data?.id ?? null,
            listing_company_id: listingCompanyResult.data?.company_id ?? null,
          },
        ],
        error: null,
      };
    },
  );
}

export async function loadAssistantMarketListingRows(): Promise<
  AssistantReadResult<AssistantMarketListingReadRow>
> {
  return await loadAssistantRowsViaBff<AssistantMarketListingReadRow>(
    {
      operation: "assistant.market.active_listings",
      args: { pageSize: ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS.pageSize },
    },
    async () => {
      const page = normalizePage(undefined, ASSISTANT_STORE_READ_BFF_MARKET_PAGE_DEFAULTS);
      const result = await supabase
        .from("market_listings")
        .select("id,title,price,city,company_id,user_id,description,kind,items_json,status,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page.from, page.to);

      return {
        data: Array.isArray(result.data) ? result.data : [],
        error: result.error,
      };
    },
  );
}

export async function loadAssistantCompanyRowsByIds(
  ids: string[],
): Promise<AssistantReadResult<AssistantCompanyReadRow>> {
  if (!ids.length) return { data: [], error: null };
  return await loadAssistantRowsViaBff<AssistantCompanyReadRow>(
    {
      operation: "assistant.market.companies_by_ids",
      args: { ids },
    },
    async () => {
      const result = await supabase.from("companies").select("id,name").in("id", ids);
      return {
        data: Array.isArray(result.data) ? result.data : [],
        error: result.error,
      };
    },
  );
}

export async function loadAssistantProfileRowsByUserIds(
  ids: string[],
): Promise<AssistantReadResult<AssistantProfileReadRow>> {
  if (!ids.length) return { data: [], error: null };
  return await loadAssistantRowsViaBff<AssistantProfileReadRow>(
    {
      operation: "assistant.market.profiles_by_user_ids",
      args: { ids },
    },
    async () => {
      const result = await supabase.from("user_profiles").select("user_id,full_name").in("user_id", ids);
      return {
        data: Array.isArray(result.data) ? result.data : [],
        error: result.error,
      };
    },
  );
}
