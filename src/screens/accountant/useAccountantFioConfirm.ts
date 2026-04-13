import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  loadStoredFioState,
  saveStoredFioState,
} from "../../lib/storage/fioPersistence";

const CONFIRM_TS_KEY = "accountant_confirm_ts";
const ACCOUNTANT_HISTORY_KEY = "accountant_history_v1";

export function useAccountantFioConfirm(params: {
  setAccountantFio: Dispatch<SetStateAction<string>>;
}) {
  const { setAccountantFio } = params;
  const [accountantHistory, setAccountantHistory] = useState<string[]>([]);
  const [isFioConfirmVisible, setIsFioConfirmVisible] = useState(false);
  const [isFioLoading, setIsFioLoading] = useState(false);

  const getTodaySixAM = useCallback(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          history,
          lastConfirmIso,
        } = await loadStoredFioState({
          screen: "accountant",
          surface: "accountant_fio_confirm",
          keys: {
            confirmKey: CONFIRM_TS_KEY,
            historyKey: ACCOUNTANT_HISTORY_KEY,
          },
        });

        if (active) {
          setAccountantHistory(history);

          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
          }
        }
      } catch (e) {
        if (__DEV__) console.warn("[accountantFio] load session failed", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [getTodaySixAM]);

  useFocusEffect(
    useCallback(() => {
      const checkFioDaily = async () => {
        const { lastConfirmIso } = await loadStoredFioState({
          screen: "accountant",
          surface: "accountant_fio_confirm",
          keys: {
            confirmKey: CONFIRM_TS_KEY,
            historyKey: ACCOUNTANT_HISTORY_KEY,
          },
        });
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmIso ? new Date(lastConfirmIso) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
        }
      };
      void checkFioDaily();
    }, [getTodaySixAM]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      setIsFioLoading(true);
      try {
        setAccountantFio(fio);
        const nextHist = await saveStoredFioState({
          screen: "accountant",
          surface: "accountant_fio_confirm",
          keys: {
            confirmKey: CONFIRM_TS_KEY,
            historyKey: ACCOUNTANT_HISTORY_KEY,
          },
          fio,
          history: accountantHistory,
        });
        setAccountantHistory(nextHist);
        setIsFioConfirmVisible(false);
      } catch (e) {
        if (__DEV__) console.warn(e);
      } finally {
        setIsFioLoading(false);
      }
    },
    [accountantHistory, setAccountantFio],
  );

  return {
    accountantHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  };
}
