import { Alert } from "react-native";
import { useCallback, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { listForemanSubcontracts, type Subcontract } from "../../subcontracts/subcontracts.shared";
import { useForemanHistoryStore } from "../foremanHistory.store";

const warnForemanSubcontractHistory = (error: unknown) => {
  if (__DEV__) {
    console.warn("[Foreman] listForemanSubcontracts:", error);
  }
};

export function useForemanSubcontractHistory() {
  const [history, setHistory] = useState<Subcontract[]>([]);
  const historyLoading = useForemanHistoryStore((state) => state.subcontractHistoryLoading);
  const setHistoryLoading = useForemanHistoryStore((state) => state.setSubcontractHistoryLoading);
  const historyVisible = useForemanHistoryStore((state) => state.subcontractHistoryVisible);
  const openSubcontractHistory = useForemanHistoryStore((state) => state.openSubcontractHistory);
  const closeSubcontractHistory = useForemanHistoryStore((state) => state.closeSubcontractHistory);
  const setRefreshReason = useForemanHistoryStore((state) => state.setRefreshReason);

  const fetchHistory = useCallback(async (userId?: string | null) => {
    let uid = String(userId || "").trim();
    if (!uid) {
      const auth = await supabase.auth.getUser();
      uid = String(auth.data?.user?.id || "").trim();
    }

    if (!uid) {
      Alert.alert("История подрядов", "Пользователь не определён.");
      return;
    }

    openSubcontractHistory();
    setHistoryLoading(true);
    setRefreshReason("history:subcontracts");
    try {
      const rows = await listForemanSubcontracts(uid);
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (e) {
      warnForemanSubcontractHistory(e);
      Alert.alert("История подрядов", "Не удалось загрузить историю подрядов.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [openSubcontractHistory, setHistoryLoading, setRefreshReason]);

  const closeHistory = useCallback(() => closeSubcontractHistory(), [closeSubcontractHistory]);

  return {
    history,
    historyLoading,
    historyVisible,
    fetchHistory,
    closeHistory,
  };
}
