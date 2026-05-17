import type {
  CatalogRequestUpdate,
} from "../../types/contracts/catalog";
import type {
  CatalogRequestsExtendedMetaUpdate,
} from "./catalog.request.transport";

export type RequestsUpdate = CatalogRequestUpdate;
export type RequestsExtendedMetaUpdate = CatalogRequestsExtendedMetaUpdate;
export type CatalogCompatError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null;

const BASE_REQUEST_PAYLOAD_KEYS = [
  "need_by",
  "comment",
  "object_type_code",
  "level_code",
  "system_code",
  "zone_code",
  "foreman_name",
] as const satisfies readonly (keyof RequestsUpdate)[];

type BaseRequestPayloadKey = (typeof BASE_REQUEST_PAYLOAD_KEYS)[number];

const basePayloadKeys = new Set<string>(BASE_REQUEST_PAYLOAD_KEYS);

export function isBaseRequestPayloadKey(key: string): key is BaseRequestPayloadKey {
  return basePayloadKeys.has(key);
}

export function pickBaseRequestPayload(
  payload: RequestsExtendedMetaUpdate,
): RequestsUpdate {
  const basePayload: RequestsUpdate = {};
  if (Object.prototype.hasOwnProperty.call(payload, "need_by"))
    basePayload.need_by = payload.need_by;
  if (Object.prototype.hasOwnProperty.call(payload, "comment"))
    basePayload.comment = payload.comment;
  if (Object.prototype.hasOwnProperty.call(payload, "object_type_code")) {
    basePayload.object_type_code = payload.object_type_code;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "level_code"))
    basePayload.level_code = payload.level_code;
  if (Object.prototype.hasOwnProperty.call(payload, "system_code"))
    basePayload.system_code = payload.system_code;
  if (Object.prototype.hasOwnProperty.call(payload, "zone_code"))
    basePayload.zone_code = payload.zone_code;
  if (Object.prototype.hasOwnProperty.call(payload, "foreman_name"))
    basePayload.foreman_name = payload.foreman_name;
  return basePayload;
}

export const getCompatErrorInfo = (error: CatalogCompatError) => ({
  message: String(error?.message ?? ""),
  code: String(error?.code ?? ""),
  details: error?.details ?? null,
  hint: error?.hint ?? null,
});
