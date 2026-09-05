import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";

export const R4_A6_PLATFORM30_SCENARIO_KINDS = [
  "nominal_compile",
  "edit_recalculate",
  "double_edit_idempotency",
  "confirm_idempotency",
  "professional_pdf_projection",
  "procurement_projection",
  "immutable_history_projection",
  "cold_restart_restore",
  "background_foreground_restore",
  "null_price_projection",
  "mixed_price_projection",
  "category_filter_projection",
  "photo_row_identity",
  "marketplace_send_idempotency",
  "long_russian_roundtrip",
] as const;

export type R4A6Platform30ScenarioKind =
  (typeof R4_A6_PLATFORM30_SCENARIO_KINDS)[number];

export type R4A6PlatformTransport = "WEB_JSON" | "ANDROID_API34_RN_BRIDGE_JSON";

export type R4A6PlatformExecution<T> = {
  transport: R4A6PlatformTransport;
  payload: T;
  wireSha256: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function assertR4A6Platform30ScenarioSet(): void {
  if (R4_A6_PLATFORM30_SCENARIO_KINDS.length !== 15) {
    throw new Error("STOP_PLATFORM30_SCENARIO_DENOMINATOR");
  }
  if (new Set(R4_A6_PLATFORM30_SCENARIO_KINDS).size !== 15) {
    throw new Error("STOP_PLATFORM30_DUPLICATE_SCENARIO");
  }
}

/** Browser transport boundary: canonical payload through a UTF-8 JSON response. */
export function webPlatformTransport<T>(payload: T): R4A6PlatformExecution<T> {
  const wire = canonicalEstimateStableJson(payload);
  return { transport: "WEB_JSON", payload: JSON.parse(wire) as T, wireSha256: sha256(wire) };
}

/**
 * React Native/Android bridge boundary. Base64 models the UTF-8 byte bridge and
 * catches accidental platform encoding/coercion without introducing a compiler.
 */
export function androidApi34PlatformTransport<T>(payload: T): R4A6PlatformExecution<T> {
  const wire = canonicalEstimateStableJson(payload);
  const bridgeBytes = Buffer.from(wire, "utf8").toString("base64");
  const restoredWire = Buffer.from(bridgeBytes, "base64").toString("utf8");
  return {
    transport: "ANDROID_API34_RN_BRIDGE_JSON",
    payload: JSON.parse(restoredWire) as T,
    wireSha256: sha256(restoredWire),
  };
}

export function assertR4A6PlatformPayloadParity(
  web: R4A6PlatformExecution<unknown>,
  android: R4A6PlatformExecution<unknown>,
): void {
  if (web.wireSha256 !== android.wireSha256
    || canonicalEstimateStableJson(web.payload) !== canonicalEstimateStableJson(android.payload)) {
    throw new Error("STOP_PLATFORM30_WEB_ANDROID_PARITY");
  }
}
