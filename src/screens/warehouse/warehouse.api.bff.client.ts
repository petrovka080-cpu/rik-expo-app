import { supabase } from "../../lib/supabaseClient";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
  type BffReadonlyMobileAuthProvider,
} from "../../shared/scale/bffClient";
import type {
  WarehouseApiBffRequestDto,
  WarehouseApiBffResponseDto,
} from "./warehouse.api.bff.contract";

type WarehouseApiBffUnavailable = {
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

type WarehouseApiBffError = {
  status: "error";
  error: {
    code: string;
    message: string;
  };
};

type WarehouseApiBffSuccess = {
  status: "ok";
  response: WarehouseApiBffResponseDto;
};

export type WarehouseApiBffCallResult =
  | WarehouseApiBffSuccess
  | WarehouseApiBffUnavailable
  | WarehouseApiBffError;

export type WarehouseApiBffCallDeps = {
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

const getWarehouseApiBffAccessToken: BffReadonlyMobileAuthProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export async function callWarehouseApiBffRead(
  request: WarehouseApiBffRequestDto,
  deps: WarehouseApiBffCallDeps = {},
): Promise<WarehouseApiBffCallResult> {
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<WarehouseApiBffResponseDto, WarehouseApiBffRequestDto>({
    config: deps.config ?? runtime.clientConfig,
    operation: "warehouse.api.read.scope",
    input: request,
    getAccessToken: deps.getAccessToken ?? getWarehouseApiBffAccessToken,
    fetchImpl: deps.fetchImpl,
  });

  if (!response.ok) {
    if (BFF_UNAVAILABLE_ERROR_CODES.has(response.error.code)) {
      return {
        status: "unavailable",
        reason: response.error.code as WarehouseApiBffUnavailable["reason"],
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
        code: "WAREHOUSE_API_BFF_INVALID_RESPONSE",
        message: "Invalid warehouse API read response",
      },
    };
  }

  return {
    status: "ok",
    response: response.data,
  };
}
