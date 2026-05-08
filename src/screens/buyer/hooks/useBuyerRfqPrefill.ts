import { useEffect } from "react";

import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import { recordCatchDiscipline } from "../../../lib/observability/catchDiscipline";
import { inferCountryCode as inferCountryCodeHelper, stripToLocal as stripToLocalHelper } from "../buyer.helpers";
import { loadBuyerRfqPrefillAuthMetadata } from "./useBuyerRfqPrefill.auth.transport";

type StringRef = { current: string };
type BoolRef = { current: boolean };

type UseBuyerRfqPrefillParams = {
  sheetKind: string | null;
  rfqCityRef: StringRef;
  rfqEmailRef: StringRef;
  rfqPhoneRef: StringRef;
  rfqCountryCodeTouchedRef: BoolRef;
  setRfqCountryCode: (v: string | ((prev: string) => string)) => void;
  setRfqEmail: (v: string) => void;
  setRfqPhone: (v: string) => void;
};

type BuyerRfqPrefillMetadata = {
  phone?: string;
  whatsapp?: string;
  email?: string;
};

type BuyerRfqPrefillSnapshot =
  | { status: "loading" }
  | { status: "loaded"; metadata: unknown }
  | { status: "terminal"; error: unknown };

export type BuyerRfqPrefillBoundary =
  | { status: "loading"; metadata: BuyerRfqPrefillMetadata }
  | { status: "missing"; metadata: BuyerRfqPrefillMetadata }
  | { status: "invalid"; metadata: BuyerRfqPrefillMetadata; reason: string }
  | { status: "loaded"; metadata: BuyerRfqPrefillMetadata }
  | { status: "ready"; metadata: BuyerRfqPrefillMetadata }
  | { status: "terminal"; metadata: BuyerRfqPrefillMetadata; error: unknown };

export type BuyerRfqPrefillPatch = {
  countryCode?: string;
  email?: string;
  phone?: string;
};

const BUYER_RFQ_PREFILL_SOURCE = "hook:buyer:rfq_prefill";
const BUYER_RFQ_PREFILL_SURFACE = "buyer_rfq_prefill";
const EMPTY_RFQ_PREFILL_METADATA: BuyerRfqPrefillMetadata = {};
const RFQ_PREFILL_METADATA_KEYS = ["phone", "whatsapp", "email"] as const;

export function resolveBuyerRfqPrefillBoundary(
  snapshot: BuyerRfqPrefillSnapshot,
): BuyerRfqPrefillBoundary {
  if (snapshot.status === "loading") {
    return { status: "loading", metadata: EMPTY_RFQ_PREFILL_METADATA };
  }

  if (snapshot.status === "terminal") {
    return {
      status: "terminal",
      metadata: EMPTY_RFQ_PREFILL_METADATA,
      error: snapshot.error,
    };
  }

  const { metadata } = snapshot;
  if (metadata == null) {
    return { status: "missing", metadata: EMPTY_RFQ_PREFILL_METADATA };
  }

  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      status: "invalid",
      metadata: EMPTY_RFQ_PREFILL_METADATA,
      reason: "metadata_not_object",
    };
  }

  const record = metadata as Record<string, unknown>;
  const normalized: BuyerRfqPrefillMetadata = {};

  for (const key of RFQ_PREFILL_METADATA_KEYS) {
    const value = record[key];
    if (value == null) continue;
    if (typeof value !== "string") {
      return {
        status: "invalid",
        metadata: EMPTY_RFQ_PREFILL_METADATA,
        reason: `${key}_not_string`,
      };
    }

    const trimmed = value.trim();
    if (trimmed) normalized[key] = trimmed;
  }

  if (!Object.keys(normalized).length) {
    return { status: "loaded", metadata: EMPTY_RFQ_PREFILL_METADATA };
  }

  return {
    status: "ready",
    metadata: normalized,
  };
}

export function buildBuyerRfqPrefillPatch(params: {
  boundary: BuyerRfqPrefillBoundary;
  rfqCity: string;
  currentEmail: string;
  currentPhone: string;
  countryCodeTouched: boolean;
}): BuyerRfqPrefillPatch {
  const { boundary, rfqCity, currentEmail, currentPhone, countryCodeTouched } = params;

  if (
    boundary.status === "loading" ||
    boundary.status === "invalid" ||
    boundary.status === "terminal"
  ) {
    return {};
  }

  const metadata = boundary.metadata;
  const contactPhone = metadata.phone ?? metadata.whatsapp;
  const patch: BuyerRfqPrefillPatch = {};

  if (!countryCodeTouched) {
    patch.countryCode = inferCountryCodeHelper(rfqCity, contactPhone);
  }
  if (!currentEmail) {
    patch.email = metadata.email ?? "";
  }
  if (!currentPhone) {
    patch.phone = stripToLocalHelper(metadata.phone ?? "");
  }

  return patch;
}

const reportBuyerRfqPrefillInvalidPayload = (reason: string) => {
  recordPlatformObservability({
    screen: "buyer",
    surface: BUYER_RFQ_PREFILL_SURFACE,
    category: "fetch",
    event: "rfq_prefill_invalid_payload",
    result: "error",
    sourceKind: BUYER_RFQ_PREFILL_SOURCE,
    fallbackUsed: true,
    errorStage: "invalid",
    errorClass: "BuyerRfqPrefillInvalidPayload",
    errorMessage: reason,
  });
};

export function useBuyerRfqPrefill({
  sheetKind,
  rfqCityRef,
  rfqEmailRef,
  rfqPhoneRef,
  rfqCountryCodeTouchedRef,
  setRfqCountryCode,
  setRfqEmail,
  setRfqPhone,
}: UseBuyerRfqPrefillParams) {
  useEffect(() => {
    if (sheetKind !== "rfq") return;

    (async () => {
      try {
        const metadata = await loadBuyerRfqPrefillAuthMetadata();
        const boundary = resolveBuyerRfqPrefillBoundary({
          status: "loaded",
          metadata,
        });

        if (boundary.status === "invalid") {
          reportBuyerRfqPrefillInvalidPayload(boundary.reason);
          return;
        }

        const patch = buildBuyerRfqPrefillPatch({
          boundary,
          rfqCity: rfqCityRef.current,
          currentEmail: rfqEmailRef.current,
          currentPhone: rfqPhoneRef.current,
          countryCodeTouched: rfqCountryCodeTouchedRef.current,
        });

        if (typeof patch.countryCode === "string") setRfqCountryCode(patch.countryCode);
        if (typeof patch.email === "string") setRfqEmail(patch.email);
        if (typeof patch.phone === "string") setRfqPhone(patch.phone);
      } catch (error) {
        recordCatchDiscipline({
          screen: "buyer",
          surface: BUYER_RFQ_PREFILL_SURFACE,
          event: "rfq_prefill_failed",
          error,
          kind: "soft_failure",
          category: "fetch",
          sourceKind: BUYER_RFQ_PREFILL_SOURCE,
          errorStage: "terminal",
          extra: {
            sheetKind,
          },
        });
      }
    })();
  }, [
    sheetKind,
    rfqCityRef,
    rfqCountryCodeTouchedRef,
    rfqEmailRef,
    rfqPhoneRef,
    setRfqCountryCode,
    setRfqEmail,
    setRfqPhone,
  ]);
}
