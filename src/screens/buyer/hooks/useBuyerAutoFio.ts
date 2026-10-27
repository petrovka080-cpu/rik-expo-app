import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBuyerAutoFioCandidate } from "./useBuyerAutoFio.auth.transport";

export function useBuyerAutoFio(params: {
  supabase: SupabaseClient;
  buyerFio: string;
  setBuyerFio: (value: string) => void;
}) {
  const { supabase, buyerFio, setBuyerFio } = params;

  useEffect(() => {
    (async () => {
      try {
        if (buyerFio) return;
        const fio = await loadBuyerAutoFioCandidate({ supabase });
        if (fio) setBuyerFio(fio);
      } catch (error) {
        void error;
        // no-op
      }
    })();
  }, [buyerFio, supabase, setBuyerFio]);
}
