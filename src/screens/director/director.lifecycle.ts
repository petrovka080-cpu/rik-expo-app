import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { REQUEST_PENDING_EN, REQUEST_PENDING_STATUS, normalizeStatus } from "../../lib/api/requests.status";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";
import { logError } from "../../lib/logError";

type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunForce: boolean;
};

type RefreshStateRef = {
  current: RefreshState;
};

type RefreshFn = (force?: boolean) => Promise<void>;

type RefreshFnRef = {
  current: RefreshFn;
};

type Deps = {
  dirTab: string;
  finFrom: string | null;
  finTo: string | null;
  repFrom: string | null;
  repTo: string | null;
  isScreenFocused: boolean;
  fetchRows: (force?: boolean) => Promise<void>;
  fetchProps: (force?: boolean) => Promise<void>;
  fetchFinance: () => Promise<void>;
  fetchReport: () => Promise<void>;
  showRtToast: (title?: string, body?: string) => void;
};

const DIRECTOR_LIVE_REQUEST_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus(REQUEST_PENDING_EN),
]);

const DIRECTOR_LIVE_ITEM_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus("У директора"),
  normalizeStatus(REQUEST_PENDING_EN),
]);
const DIRECTOR_REQUESTS_POLL_MS = 5000;

const getRecordValue = (value: unknown, key: string): unknown => {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return (value as Record<string, unknown>)[key];
};

const shouldRefreshDirectorRowsForRequestChange = (payload: { new?: unknown; old?: unknown }) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  const nextSubmittedAt = String(getRecordValue(payload.new, "submitted_at") ?? "").trim();
  const prevSubmittedAt = String(getRecordValue(payload.old, "submitted_at") ?? "").trim();
  return (
    !!nextSubmittedAt ||
    !!prevSubmittedAt ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(nextStatus) ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(prevStatus)
  );
};

const shouldRefreshDirectorRowsForItemChange = (payload: { new?: unknown; old?: unknown }) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  return DIRECTOR_LIVE_ITEM_STATUSES.has(nextStatus) || DIRECTOR_LIVE_ITEM_STATUSES.has(prevStatus);
};

const logDirectorLive = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[director.live]", payload);
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
  const rowsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const propsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const financeRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const reportRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const rowsRefreshFnRef = useRef<RefreshFn>(fetchRows);
  const propsRefreshFnRef = useRef<RefreshFn>(fetchProps);
  const financeRefreshFnRef = useRef<RefreshFn>(() => fetchFinance());
  const reportRefreshFnRef = useRef<RefreshFn>(() => fetchReport());

  rowsRefreshFnRef.current = fetchRows;
  propsRefreshFnRef.current = fetchProps;
  financeRefreshFnRef.current = () => fetchFinance();
  reportRefreshFnRef.current = () => fetchReport();

  const runRefresh = (
    stateRef: RefreshStateRef,
    refreshRef: RefreshFnRef,
    options?: { force?: boolean; queueOnOverlap?: boolean },
  ) => {
    const force = !!options?.force;
    if (stateRef.current.inFlight) {
      if (force) {
        stateRef.current.rerunQueued = true;
        stateRef.current.rerunForce = true;
      } else if (options?.queueOnOverlap) {
        stateRef.current.rerunQueued = true;
      }
      return stateRef.current.inFlight;
    }

    const start = (nextForce: boolean) => {
      const p = (async () => {
        try {
          await refreshRef.current(nextForce);
        } finally {
          stateRef.current.inFlight = null;
          if (stateRef.current.rerunQueued) {
            const rerunForce = stateRef.current.rerunForce;
            stateRef.current.rerunQueued = false;
            stateRef.current.rerunForce = false;
            void start(rerunForce);
          }
        }
      })();
      stateRef.current.inFlight = p;
      return p;
    };

    return start(force);
  };

  const refreshRows = (force = false) => runRefresh(rowsRefreshRef, rowsRefreshFnRef, { force });
  const refreshProps = (force = false) => runRefresh(propsRefreshRef, propsRefreshFnRef, { force });
  const refreshFinance = () => runRefresh(financeRefreshRef, financeRefreshFnRef, { queueOnOverlap: true });
  const refreshReport = () => runRefresh(reportRefreshRef, reportRefreshFnRef, { queueOnOverlap: true });

  useEffect(() => {
    if (didInit.current || !isScreenFocused) return;
    didInit.current = true;

    (async () => {
      try {
        await ensureSignedIn();
        void refreshRows();
        void refreshProps();
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
      void refreshFinance();
    } else if (tabKey === "Отчёты") {
      void refreshReport();
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
        void refreshRows();
        void refreshProps();
      } else if (dirTab === "Финансы") {
        void refreshFinance();
      } else if (dirTab === "Отчёты") {
        void refreshReport();
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
    if (!isScreenFocused || dirTab !== "Заявки") return;

    const timer = setInterval(() => {
      if (rowsRefreshRef.current.inFlight) return;
      logDirectorLive({
        sourcePath: "director.lifecycle.poll",
        intervalMs: DIRECTOR_REQUESTS_POLL_MS,
      });
      rowsRefreshRef.current.inFlight = Promise.resolve(rowsRefreshFnRef.current(true)).finally(() => {
        if (rowsRefreshRef.current.inFlight) rowsRefreshRef.current.inFlight = null;
      });
    }, DIRECTOR_REQUESTS_POLL_MS);

    return () => clearInterval(timer);
  }, [dirTab, isScreenFocused]);

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
          void refreshRows(true);
          void refreshProps(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
        },
        (payload) => {
          if (dirTab !== "Заявки") return;
          if (!shouldRefreshDirectorRowsForRequestChange(payload)) return;
          logDirectorLive({
            sourcePath: "director.lifecycle.requests",
            eventType: payload.eventType,
            requestId:
              String(getRecordValue(payload.new, "id") ?? getRecordValue(payload.old, "id") ?? "").trim() || null,
            nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
            prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
          });
          void refreshRows(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_items",
        },
        (payload) => {
          if (dirTab !== "Заявки") return;
          if (!shouldRefreshDirectorRowsForItemChange(payload)) return;
          logDirectorLive({
            sourcePath: "director.lifecycle.request_items",
            eventType: payload.eventType,
            requestId:
              String(
                getRecordValue(payload.new, "request_id") ?? getRecordValue(payload.old, "request_id") ?? "",
              ).trim() || null,
            nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
            prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
          });
          void refreshRows(true);
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
  }, [dirTab, isScreenFocused, fetchRows, fetchProps, showRtToast]);
}
