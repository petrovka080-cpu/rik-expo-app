import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { AccountantLoadTrigger } from "./accountant.repository";
import type { Tab } from "./types";

type LoadInbox = (force?: boolean, tabOverride?: Tab, trigger?: AccountantLoadTrigger) => Promise<void>;
type LoadHistory = (force?: boolean, trigger?: AccountantLoadTrigger) => Promise<void>;

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
    } finally {
      params.setRefreshing(false);
    }
  };

  const onRefreshHistory = async () => {
    params.setHistoryRefreshing(true);
    try {
      await params.loadHistory(true, "manual");
    } finally {
      params.setHistoryRefreshing(false);
    }
  };

  const refreshCurrentVisibleScope = async () => {
    if (params.tabRef.current === params.historyTab) {
      await params.loadHistory(true, "realtime");
      return;
    }
    await params.loadInbox(true, params.tabRef.current, "realtime");
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
