import { supabase } from "./supabaseClient";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
  type BffReadonlyMobileAuthProvider,
} from "../shared/scale/bffClient";
import type {
  AssistantStoreReadBffRequestDto,
  AssistantStoreReadBffResponseDto,
} from "./assistant_store_read.bff.contract";

type AssistantStoreReadBffUnavailable = {
  status: "unavailable";
  reason:
    | "BFF_DISABLED"
    | "BFF_CONTRACT_ONLY"
    | "BFF_BASE_URL_INVALID"
    | "BFF_MOBILE_AUTH_SESSION_REQUIRED"
    | "BFF_FETCH_UNAVAILABLE"
    | "BFF_NETWORK_ERROR"
    | "BFF_INVALID_RESPONSE_ENVELOPE";
};

type AssistantStoreReadBffError = {
  status: "error";
  error: {
    code: string;
    message: string;
  };
};

type AssistantStoreReadBffSuccess = {
  status: "ok";
  response: AssistantStoreReadBffResponseDto;
};

export type AssistantStoreReadBffCallResult =
  | AssistantStoreReadBffSuccess
  | AssistantStoreReadBffUnavailable
  | AssistantStoreReadBffError;

export type AssistantStoreReadBffCallDeps = {
  config?: ReturnType<typeof resolveBffReadonlyRuntimeConfig>["clientConfig"];
  getAccessToken?: BffReadonlyMobileAuthProvider;
  fetchImpl?: typeof fetch;
};

const BFF_UNAVAILABLE_ERROR_CODES = new Set([
  "BFF_DISABLED",
  "BFF_CONTRACT_ONLY",
  "BFF_BASE_URL_INVALID",
  "BFF_MOBILE_AUTH_SESSION_REQUIRED",
  "BFF_FETCH_UNAVAILABLE",
  "BFF_NETWORK_ERROR",
  "BFF_INVALID_RESPONSE_ENVELOPE",
]);

const getAssistantStoreReadBffAccessToken: BffReadonlyMobileAuthProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export async function callAssistantStoreReadBff(
  request: AssistantStoreReadBffRequestDto,
  deps: AssistantStoreReadBffCallDeps = {},
): Promise<AssistantStoreReadBffCallResult> {
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<
    AssistantStoreReadBffResponseDto,
    AssistantStoreReadBffRequestDto
  >({
    config: deps.config ?? runtime.clientConfig,
    operation: "assistant.store.read.scope",
    input: request,
    getAccessToken: deps.getAccessToken ?? getAssistantStoreReadBffAccessToken,
    fetchImpl: deps.fetchImpl,
  });

  if (!response.ok) {
    if (BFF_UNAVAILABLE_ERROR_CODES.has(response.error.code)) {
      return {
        status: "unavailable",
        reason: response.error.code as AssistantStoreReadBffUnavailable["reason"],
      };
    }
    return {
      status: "error",
      error: response.error,
    };
  }

  if (response.data.operation !== request.operation) {
    return {
      status: "error",
      error: {
        code: "ASSISTANT_STORE_READ_BFF_INVALID_RESPONSE",
        message: "Invalid assistant/store read response",
      },
    };
  }

  return {
    status: "ok",
    response: response.data,
  };
}
