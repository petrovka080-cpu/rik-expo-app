import { useEffect } from "react";

import { supabase } from "../../../lib/supabaseClient";
import { inferCountryCode as inferCountryCodeHelper, stripToLocal as stripToLocalHelper } from "../buyer.helpers";

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
        const { data } = await supabase.auth.getUser();
        const md = (data?.user?.user_metadata || {}) as {
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
        };

        if (!rfqCountryCodeTouchedRef.current) {
          setRfqCountryCode(inferCountryCodeHelper(rfqCityRef.current, md.phone ?? md.whatsapp));
        }
        if (!rfqEmailRef.current) setRfqEmail(String(md.email ?? "").trim());
        if (!rfqPhoneRef.current) setRfqPhone(stripToLocalHelper(md.phone ?? ""));
      } catch {
        // no-op: prefill is best-effort
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
