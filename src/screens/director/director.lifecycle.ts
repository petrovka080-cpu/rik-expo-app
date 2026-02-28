import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";
import { logError } from "../../lib/logError";

type Deps = {
  dirTab: string;
  finFrom: string | null;
  finTo: string | null;
  repFrom: string | null;
  repTo: string | null;
  isScreenFocused: boolean;
  fetchRows: () => Promise<void>;
  fetchProps: () => Promise<void>;
  fetchFinance: () => Promise<void>;
  fetchReport: () => Promise<void>;
  showRtToast: (title?: string, body?: string) => void;
};

export function useDirectorLifecycle({
  dirTab,
  finFrom,
  finTo,
  repFrom,
  repTo,
  isScreenFocused,
  fetchRows,
  fetchProps,
  fetchFinance,
  fetchReport,
  showRtToast,
}: Deps) {
  const didInit = useRef(false);
  const lastInitedTabRef = useRef<string | null>(null);
  const lastInitedPeriodRef = useRef<string>("");
  const appStateRef = useRef(AppState.currentState);
  const rtChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (didInit.current || !isScreenFocused) return;
    didInit.current = true;

    (async () => {
      try {
        await ensureSignedIn();
        void fetchRows();
        void fetchProps();
      } catch (e) {
        logError("director.lifecycle.ensureSignedIn", e);
      }
    })();
  }, [isScreenFocused, fetchRows, fetchProps]);

  useEffect(() => {
    if (!isScreenFocused) return;

    const periodKey = `${finFrom}-${finTo}-${repFrom}-${repTo}`;
    const tabKey = dirTab;

    if (lastInitedTabRef.current === tabKey && lastInitedPeriodRef.current === periodKey) return;

    lastInitedTabRef.current = tabKey;
    lastInitedPeriodRef.current = periodKey;

    if (tabKey === "Финансы") {
      void fetchFinance();
    } else if (tabKey === "Отчёты") {
      void fetchReport();
    }
    // "Подряды" — DirectorSubcontractTab загружает данные самостоятельно
  }, [isScreenFocused, dirTab, finFrom, finTo, repFrom, repTo, fetchFinance, fetchReport]);

  useEffect(() => {
    if (!isScreenFocused) return;

    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      const resumed = (prev === "background" || prev === "inactive") && nextState === "active";
      if (!resumed) return;

      if (dirTab === "Заявки") {
        void fetchRows();
        void fetchProps();
      } else if (dirTab === "Финансы") {
        void fetchFinance();
      } else if (dirTab === "Отчёты") {
        void fetchReport();
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {
        // no-op
      }
    };
  }, [isScreenFocused, dirTab, fetchRows, fetchProps, fetchFinance, fetchReport]);

  useEffect(() => {
    try {
      if (rtChannelRef.current) {
        supabase.removeChannel(rtChannelRef.current);
        rtChannelRef.current = null;
      }
    } catch {
      // no-op
    }

    if (!isScreenFocused) return;

    const ch = supabase
      .channel(`notif-director-rt:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "role=eq.director",
        },
        (payload) => {
          const next = payload.new;
          const n = next && typeof next === "object" ? (next as { title?: string; body?: string }) : {};
          showRtToast(n.title, n.body);
          void fetchRows();
          void fetchProps();
        },
      )
      .subscribe();
    rtChannelRef.current = ch;

    return () => {
      try {
        ch.unsubscribe();
      } catch {
        // no-op
      }
      try {
        supabase.removeChannel(ch);
      } catch {
        // no-op
      }
      if (rtChannelRef.current === ch) rtChannelRef.current = null;
    };
  }, [isScreenFocused, fetchRows, fetchProps, showRtToast]);
}
