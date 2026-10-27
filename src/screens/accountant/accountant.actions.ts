import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { AccountantLoadTrigger } from "./accountant.repository";
import type { Tab } from "./types";

type LoadInbox = (force?: boolean, tabOverride?: Tab, trigger?: AccountantLoadTrigger) => Promise<void>;
type LoadHistory = (force?: boolean, trigger?: AccountantLoadTrigger) => Promise<void>;
type AccountantRefreshFailureEvent =
  | "accountant_manual_inbox_refresh_failed"
  | "accountant_manual_history_refresh_failed"
  | "accountant_realtime_scope_refresh_failed";

const getAccountantRefreshErrorClass = (error: unknown) =>
  error instanceof Error && error.name ? error.name : "unknown_error";

const recordAccountantRefreshFailure = (
  event: AccountantRefreshFailureEvent,
  error: unknown,
  trigger: AccountantLoadTrigger,
) => {
  recordPlatformObservability({
    screen: "accountant",
    surface: "refresh",
    category: "reload",
    event,
    result: "error",
    trigger,
    sourceKind: `accountant:${trigger}`,
    fallbackUsed: false,
    errorStage: "refresh",
    errorClass: getAccountantRefreshErrorClass(error),
    extra: {
      owner: "accountant.actions",
      propagation: "rethrow",
    },
  });
};

export const createAccountantRefreshHandlers = (params: {
  loadInbox: LoadInbox;
  loadHistory: LoadHistory;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
  setHistoryRefreshing: Dispatch<SetStateAction<boolean>>;
  tabRef: MutableRefObject<Tab>;
  historyTab: Tab;
}) => {
  const onRefresh = async () => {
    params.setRefreshing(true);
    try {
      await params.loadInbox(true, undefined, "manual");
    } catch (error) {
      recordAccountantRefreshFailure(
        "accountant_manual_inbox_refresh_failed",
        error,
        "manual",
      );
      throw error;
    } finally {
      params.setRefreshing(false);
    }
  };

  const onRefreshHistory = async () => {
    params.setHistoryRefreshing(true);
    try {
      await params.loadHistory(true, "manual");
    } catch (error) {
      recordAccountantRefreshFailure(
        "accountant_manual_history_refresh_failed",
        error,
        "manual",
      );
      throw error;
    } finally {
      params.setHistoryRefreshing(false);
    }
  };

  const refreshCurrentVisibleScope = async () => {
    try {
      if (params.tabRef.current === params.historyTab) {
        await params.loadHistory(true, "realtime");
        return;
      }
      await params.loadInbox(true, params.tabRef.current, "realtime");
    } catch (error) {
      recordAccountantRefreshFailure(
        "accountant_realtime_scope_refresh_failed",
        error,
        "realtime",
      );
      throw error;
    }
  };

  return {
    onRefresh,
    onRefreshHistory,
    refreshCurrentVisibleScope,
  };
};

export const createAccountantTabPreviewHandler = (params: {
  historyTab: Tab;
  tabRef: MutableRefObject<Tab>;
  setTab: Dispatch<SetStateAction<Tab>>;
  primeInboxPreviewForTab: (tab: Tab) => void;
}) => (nextTab: Tab) => {
  if (nextTab === params.tabRef.current) return;
  if (nextTab !== params.historyTab) {
    params.primeInboxPreviewForTab(nextTab);
  }
  params.setTab(nextTab);
};
