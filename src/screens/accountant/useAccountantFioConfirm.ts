import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

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
        const lastConfirmStr = await AsyncStorage.getItem(CONFIRM_TS_KEY);
        const histRaw = await AsyncStorage.getItem(ACCOUNTANT_HISTORY_KEY);
        const historyArr = histRaw ? JSON.parse(histRaw) : [];

        if (active) {
          if (Array.isArray(historyArr)) setAccountantHistory(historyArr);

          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
          }
        }
      } catch (e) {
        console.warn("[accountantFio] load session failed", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [getTodaySixAM]);

  useFocusEffect(
    useCallback(() => {
      const checkFioDaily = async () => {
        const lastConfirmStr = await AsyncStorage.getItem(CONFIRM_TS_KEY);
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
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
        const now = new Date().toISOString();

        const nextHist = [fio, ...accountantHistory.filter((x) => x !== fio)].slice(0, 12);
        setAccountantHistory(nextHist);

        await Promise.all([
          AsyncStorage.setItem(CONFIRM_TS_KEY, now),
          AsyncStorage.setItem(ACCOUNTANT_HISTORY_KEY, JSON.stringify(nextHist)),
        ]);
        setIsFioConfirmVisible(false);
      } catch (e) {
        console.warn(e);
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
