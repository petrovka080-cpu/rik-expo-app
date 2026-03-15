import { Alert } from "react-native";
import { useCallback, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { listForemanSubcontracts, type Subcontract } from "../../subcontracts/subcontracts.shared";

const warnForemanSubcontractHistory = (error: unknown) => {
  if (__DEV__) {
    console.warn("[Foreman] listForemanSubcontracts:", error);
  }
};

export function useForemanSubcontractHistory() {
  const [history, setHistory] = useState<Subcontract[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

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

    setHistoryVisible(true);
    setHistoryLoading(true);
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
  }, []);

  const closeHistory = useCallback(() => setHistoryVisible(false), []);

  return {
    history,
    historyLoading,
    historyVisible,
    fetchHistory,
    closeHistory,
    setHistoryVisible,
  };
}
