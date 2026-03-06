import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publishRfqAction } from "../buyer.actions";

type AlertFn = (title: string, message?: string) => void;

export function useBuyerRfqPublish(params: {
  pickedIds: string[];
  rfqDeadlineIso: string;
  rfqDeliveryDays: string;
  rfqCity: string;
  rfqAddressText: string;
  rfqPhone: string;
  rfqCountryCode: string;
  rfqEmail: string;
  rfqVisibility: "open" | "company_only";
  rfqNote: string;
  supabase: SupabaseClient;
  setRfqBusy: (v: boolean) => void;
  closeSheet: () => void;
  alertUser: AlertFn;
}) {
  const {
    pickedIds,
    rfqDeadlineIso,
    rfqDeliveryDays,
    rfqCity,
    rfqAddressText,
    rfqPhone,
    rfqCountryCode,
    rfqEmail,
    rfqVisibility,
    rfqNote,
    supabase,
    setRfqBusy,
    closeSheet,
    alertUser,
  } = params;

  const publishRfq = useCallback(async () => {
    await publishRfqAction({
      pickedIds,
      rfqDeadlineIso,
      rfqDeliveryDays,
      rfqCity,
      rfqAddressText,
      rfqPhone,
      rfqCountryCode,
      rfqEmail,
      rfqVisibility,
      rfqNote,
      supabase,
      setBusy: setRfqBusy,
      closeSheet,
      alert: alertUser,
    });
  }, [
    pickedIds,
    rfqDeadlineIso,
    rfqDeliveryDays,
    rfqCity,
    rfqAddressText,
    rfqPhone,
    rfqCountryCode,
    rfqEmail,
    rfqVisibility,
    rfqNote,
    supabase,
    setRfqBusy,
    closeSheet,
    alertUser,
  ]);

  return { publishRfq };
}

