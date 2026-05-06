import { supabase } from "../supabaseClient";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
  type BffReadonlyMobileAuthProvider,
} from "../../shared/scale/bffClient";
import type {
  CatalogTransportBffRequestDto,
  CatalogTransportBffResponseDto,
} from "./catalog.bff.contract";

type CatalogTransportBffUnavailable = {
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

type CatalogTransportBffError = {
  status: "error";
  error: {
    code: string;
    message: string;
  };
};

type CatalogTransportBffSuccess = {
  status: "ok";
  response: CatalogTransportBffResponseDto;
};

export type CatalogTransportBffCallResult =
  | CatalogTransportBffSuccess
  | CatalogTransportBffUnavailable
  | CatalogTransportBffError;

export type CatalogTransportBffCallDeps = {
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

const getCatalogTransportBffAccessToken: BffReadonlyMobileAuthProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export async function callCatalogTransportBffRead(
  request: CatalogTransportBffRequestDto,
  deps: CatalogTransportBffCallDeps = {},
): Promise<CatalogTransportBffCallResult> {
  const runtime = resolveBffReadonlyRuntimeConfig();
  const response = await callBffReadonlyMobile<
    CatalogTransportBffResponseDto,
    CatalogTransportBffRequestDto
  >({
    config: deps.config ?? runtime.clientConfig,
    operation: "catalog.transport.read.scope",
    input: request,
    getAccessToken: deps.getAccessToken ?? getCatalogTransportBffAccessToken,
    fetchImpl: deps.fetchImpl,
  });

  if (!response.ok) {
    if (BFF_UNAVAILABLE_ERROR_CODES.has(response.error.code)) {
      return {
        status: "unavailable",
        reason: response.error.code as CatalogTransportBffUnavailable["reason"],
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
        code: "CATALOG_TRANSPORT_BFF_INVALID_RESPONSE",
        message: "Invalid catalog transport read response",
      },
    };
  }

  return {
    status: "ok",
    response: response.data,
  };
}
