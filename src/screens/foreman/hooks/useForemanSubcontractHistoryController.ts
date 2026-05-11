import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";

import { listForemanSubcontracts, type Subcontract } from "../../subcontracts/subcontracts.shared";
import { readForemanProfileName } from "../foreman.dicts.repo";
import {
  loadCurrentForemanAuthIdentity,
  loadCurrentForemanAuthUserId,
} from "../foreman.auth.transport";
import { getForemanSubcontractErrorMessage } from "./foreman.subcontractController.telemetry";

type ForemanSubcontractHistoryControllerParams = {
  userId: string;
  setUserId: Dispatch<SetStateAction<string>>;
  setForemanName: Dispatch<SetStateAction<string>>;
  setHistoryLoading: Dispatch<SetStateAction<boolean>>;
  setHistory: Dispatch<SetStateAction<Subcontract[]>>;
  logDebugError: (scope: string, error: unknown) => void;
};

export function useForemanSubcontractHistoryController({
  userId,
  setUserId,
  setForemanName,
  setHistoryLoading,
  setHistory,
  logDebugError,
}: ForemanSubcontractHistoryControllerParams) {
  const loadHistory = useCallback(async (uid = userId) => {
    let nextUserId = String(uid || "").trim();
    if (!nextUserId) {
      nextUserId = await loadCurrentForemanAuthUserId() ?? "";
    }
    if (!nextUserId) return;
    setHistoryLoading(true);
    try {
      const rows = await listForemanSubcontracts(nextUserId);
      setHistory(rows);
    } catch (e) {
      Alert.alert(
        "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ",
        getForemanSubcontractErrorMessage(e, "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РёСЃС‚РѕСЂРёСЋ РїРѕРґСЂСЏРґРѕРІ."),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [setHistory, setHistoryLoading, userId]);

  useEffect(() => {
    (async () => {
      const identity = await loadCurrentForemanAuthIdentity();
      const uid = identity.id ?? "";
      if (!uid) return;
      setUserId(uid);

      const nm = identity.fullName;
      if (nm) setForemanName(nm);

      if (!nm) {
        try {
          const x = await readForemanProfileName(uid);
          if (x) setForemanName(x);
        } catch (e) {
          logDebugError("foreman profile load failed", e);
        }
      }

      await loadHistory(uid);
    })();
  }, [loadHistory, logDebugError, setForemanName, setUserId]);

  return { loadHistory };
}
