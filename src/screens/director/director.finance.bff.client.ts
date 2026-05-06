import { supabase } from "../../lib/supabaseClient";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
  type BffReadonlyMobileAuthProvider,
} from "../../shared/scale/bffClient";
import type {
  DirectorFinanceBffRequestDto,
  DirectorFinanceBffResponseDto,
} from "./director.finance.bff.contract";

type DirectorFinanceBffRpcUnavailable = {
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

type DirectorFinanceBffRpcError = {
  status: "error";
  error: {
    code: string;
    message: string;
  };
};

type DirectorFinanceBffRpcSuccess = {
  status: "ok";
  payload: Record<string, unknown>;
};

export type DirectorFinanceBffRpcCallResult =
  | DirectorFinanceBffRpcSuccess
  | DirectorFinanceBffRpcUnavailable
  | DirectorFinanceBffRpcError;

export type DirectorFinanceBffRpcCallDeps = {
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

const getDirectorFinanceBffAccessToken: BffReadonlyMobileAuthProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export async function callDirectorFinanceBffRpc(
  request: DirectorFinanceBffRequestDto,
  deps: DirectorFinanceBffRpcCallDeps = {},
): Promise<DirectorFinanceBffRpcCallResult> {
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<DirectorFinanceBffResponseDto, DirectorFinanceBffRequestDto>({
    config: deps.config ?? runtime.clientConfig,
    operation: "director.finance.rpc.scope",
    input: request,
    getAccessToken: deps.getAccessToken ?? getDirectorFinanceBffAccessToken,
    fetchImpl: deps.fetchImpl,
  });

  if (!response.ok) {
    if (BFF_UNAVAILABLE_ERROR_CODES.has(response.error.code)) {
      return {
        status: "unavailable",
        reason: response.error.code as DirectorFinanceBffRpcUnavailable["reason"],
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
        code: "DIRECTOR_FINANCE_BFF_INVALID_RESPONSE",
        message: "Invalid director finance RPC response",
      },
    };
  }

  return {
    status: "ok",
    payload: response.data.payload,
  };
}
