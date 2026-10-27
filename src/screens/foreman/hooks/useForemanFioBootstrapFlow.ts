import {
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../../lib/storage/fioPersistence";
import {
  loadForemanHistory,
  saveForemanToHistory,
} from "../foreman.helpers";
import { loadCurrentForemanAuthIdentity } from "../foreman.auth.transport";

export type ForemanAuthIdentity = {
  fullName: string;
  email: string;
  phone: string;
};

type IsActive = () => boolean;

export type ForemanFioBootstrapRunner = (isActive: IsActive) => Promise<void>;

type UseForemanFioBootstrapFlowArgs = {
  foreman: string;
  setForeman: (value: string) => void;
  setAuthIdentity: Dispatch<SetStateAction<ForemanAuthIdentity>>;
  fioBootstrapScopeKey: string | null;
  setFioBootstrapScopeKey: (value: string | null) => void;
  setForemanHistory: (value: string[]) => void;
  setIsFioConfirmVisible: (value: boolean) => void;
  setIsFioLoading: (value: boolean) => void;
};

function buildFioBootstrapScopeKey(userId?: string | null, date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${userId || "anonymous"}:${year}-${month}-${day}`;
}

export function useForemanFioBootstrapFlow(args: UseForemanFioBootstrapFlowArgs) {
  const {
    foreman,
    setForeman,
    setAuthIdentity,
    fioBootstrapScopeKey,
    setFioBootstrapScopeKey,
    setForemanHistory,
    setIsFioConfirmVisible,
    setIsFioLoading,
  } = args;

  const refreshForemanHistory = useCallback(async () => {
    setForemanHistory(await loadForemanHistory());
  }, [setForemanHistory]);

  const runFioBootstrap = useCallback<ForemanFioBootstrapRunner>(async (isActive) => {
    const authUser = await loadCurrentForemanAuthIdentity();
    const nextIdentity = {
      fullName: authUser.fullName,
      email: authUser.email,
      phone: authUser.phone,
    };
    if (isActive()) {
      setAuthIdentity(nextIdentity);
    }
    const scopeKey = buildFioBootstrapScopeKey(authUser.id);
    if (!isActive() || fioBootstrapScopeKey === scopeKey) return;
    const sixAM = new Date();
    sixAM.setHours(6, 0, 0, 0);
    const {
      currentFio,
      history,
      lastConfirmIso,
    } = await loadStoredFioState({
      screen: "foreman",
      surface: "foreman_fio_confirm",
      keys: {
        currentKey: "foreman_fio",
        confirmKey: "foreman_confirm_ts",
        historyKey: "foreman_name_history_v1",
      },
    });
    const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
    if (!isActive()) return;
    if (currentFio) setForeman(currentFio);
    setForemanHistory(history);
    if (!lastConfirm || Number.isNaN(lastConfirm.getTime()) || lastConfirm < sixAM) {
      setIsFioConfirmVisible(true);
    }
    setFioBootstrapScopeKey(scopeKey);
  }, [
    fioBootstrapScopeKey,
    setAuthIdentity,
    setFioBootstrapScopeKey,
    setForeman,
    setForemanHistory,
    setIsFioConfirmVisible,
  ]);

  const handleFioConfirm = useCallback(async (fio: string) => {
    setIsFioLoading(true);
    try {
      setForeman(fio);
      const nextHistory = await saveStoredFioState({
        screen: "foreman",
        surface: "foreman_fio_confirm",
        keys: {
          currentKey: "foreman_fio",
          confirmKey: "foreman_confirm_ts",
          historyKey: "foreman_name_history_v1",
        },
        fio,
        history: await loadForemanHistory(),
      });
      setForemanHistory(nextHistory);
      const authUser = await loadCurrentForemanAuthIdentity();
      setFioBootstrapScopeKey(buildFioBootstrapScopeKey(authUser.id));
      setIsFioConfirmVisible(false);
    } finally {
      setIsFioLoading(false);
    }
  }, [
    setFioBootstrapScopeKey,
    setForeman,
    setForemanHistory,
    setIsFioConfirmVisible,
    setIsFioLoading,
  ]);

  const finalizeAfterSubmit = useCallback(async () => {
    await saveForemanToHistory(foreman);
    await refreshForemanHistory();
  }, [foreman, refreshForemanHistory]);

  return {
    finalizeAfterSubmit,
    handleFioConfirm,
    refreshForemanHistory,
    runFioBootstrap,
  };
}

export function useForemanFioHistoryRefreshEffect(refreshForemanHistory: () => Promise<void>) {
  useEffect(() => {
    void refreshForemanHistory();
  }, [refreshForemanHistory]);
}

export function useForemanFioBootstrapEffect(runFioBootstrap: ForemanFioBootstrapRunner) {
  useEffect(() => {
    let active = true;
    void runFioBootstrap(() => active);
    return () => {
      active = false;
    };
  }, [runFioBootstrap]);
}
