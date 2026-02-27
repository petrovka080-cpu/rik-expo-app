import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";

type Deps = {
  dirTab: string;
  finFrom: string | null;
  finTo: string | null;
  repFrom: string | null;
  repTo: string | null;
  fetchRows: () => Promise<void>;
  fetchProps: () => Promise<void>;
  fetchFinance: () => Promise<void>;
  fetchReportOptions: () => Promise<void>;
  fetchReport: () => Promise<void>;
  showRtToast: (title?: string, body?: string) => void;
};

export function useDirectorLifecycle({
  dirTab,
  finFrom,
  finTo,
  repFrom,
  repTo,
  fetchRows,
  fetchProps,
  fetchFinance,
  fetchReportOptions,
  fetchReport,
  showRtToast,
}: Deps) {
  const didInit = useRef(false);
  const lastInitedTabRef = useRef<string | null>(null);
  const lastInitedPeriodRef = useRef<string>("");
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        await ensureSignedIn();
        void fetchRows();
        void fetchProps();
      } catch (e) {
        console.warn("[Director] ensureSignedIn]:", (e as any)?.message || e);
      }
    })();
  }, [fetchRows, fetchProps]);

  useEffect(() => {
    const periodKey = `${finFrom}-${finTo}-${repFrom}-${repTo}`;
    const tabKey = dirTab;

    if (lastInitedTabRef.current === tabKey && lastInitedPeriodRef.current === periodKey) return;

    lastInitedTabRef.current = tabKey;
    lastInitedPeriodRef.current = periodKey;

    if (tabKey === "Р¤РёРЅР°РЅСЃС‹") {
      void fetchFinance();
    } else if (tabKey === "РћС‚С‡С‘С‚С‹") {
      void fetchReport();
    }
  }, [dirTab, finFrom, finTo, repFrom, repTo, fetchFinance, fetchReportOptions, fetchReport]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      const resumed = (prev === "background" || prev === "inactive") && nextState === "active";
      if (!resumed) return;

      if (dirTab === "Р—Р°СЏРІРєРё") {
        void fetchRows();
        void fetchProps();
      } else if (dirTab === "Р¤РёРЅР°РЅСЃС‹") {
        void fetchFinance();
      } else if (dirTab === "РћС‚С‡С‘С‚С‹") {
      void fetchReport();
      }
    });
    return () => {
      try { sub.remove(); } catch { }
    };
  }, [dirTab, fetchRows, fetchProps, fetchFinance, fetchReportOptions, fetchReport]);

  useEffect(() => {
    const ch = supabase.channel("notif-director-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: "role=eq.director",
      }, (payload: any) => {
        const n = payload?.new || {};
        showRtToast(n.title, n.body);
        void fetchRows();
        void fetchProps();
      })
      .subscribe();

    return () => {
      try { ch.unsubscribe(); } catch { }
      try { supabase.removeChannel(ch); } catch { }
    };
  }, [fetchRows, fetchProps, showRtToast]);
}

