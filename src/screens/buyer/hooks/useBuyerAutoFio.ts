import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

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
        const { data } = await supabase.auth.getUser();
        const fio =
          data?.user?.user_metadata?.full_name?.trim() ||
          data?.user?.user_metadata?.name?.trim() ||
          "";
        if (fio) setBuyerFio(fio);
      } catch {
        // no-op
      }
    })();
  }, [buyerFio, supabase, setBuyerFio]);
}

