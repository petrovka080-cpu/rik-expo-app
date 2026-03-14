import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const BUYER_FIO_KEY = "buyer_fio";
const CONFIRM_TS_KEY = "buyer_confirm_ts";
const BUYER_HISTORY_KEY = "buyer_history_v1";

const warnBuyerFio = (scope: "load" | "confirm", error: unknown) => {
  if (__DEV__) {
    console.warn(`[buyerFio] ${scope} failed`, error);
  }
};

export function useBuyerFioConfirm(params: {
  setBuyerFio: Dispatch<SetStateAction<string>>;
}) {
  const { setBuyerFio } = params;
  const [buyerHistory, setBuyerHistory] = useState<string[]>([]);
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
        const saved = await AsyncStorage.getItem(BUYER_FIO_KEY);
        const lastConfirmStr = await AsyncStorage.getItem(CONFIRM_TS_KEY);
        const histRaw = await AsyncStorage.getItem(BUYER_HISTORY_KEY);
        const historyArr = histRaw ? JSON.parse(histRaw) : [];

        if (active) {
          if (saved) setBuyerFio(saved);
          if (Array.isArray(historyArr)) setBuyerHistory(historyArr);

          const sixAM = getTodaySixAM();
          const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
          if (!lastConfirm || lastConfirm < sixAM) {
            setIsFioConfirmVisible(true);
          }
        }
      } catch (e) {
        warnBuyerFio("load", e);
      }
    })();

    return () => {
      active = false;
    };
  }, [getTodaySixAM, setBuyerFio]);

  useFocusEffect(
    useCallback(() => {
      const checkFio = async () => {
        const lastConfirmStr = await AsyncStorage.getItem(CONFIRM_TS_KEY);
        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
        }
      };
      void checkFio();
    }, [getTodaySixAM]),
  );

  const handleFioConfirm = useCallback(
    async (fio: string) => {
      setIsFioLoading(true);
      try {
        setBuyerFio(fio);
        const now = new Date().toISOString();

        const nextHist = [fio, ...buyerHistory.filter((x) => x !== fio)].slice(0, 12);
        setBuyerHistory(nextHist);

        await Promise.all([
          AsyncStorage.setItem(BUYER_FIO_KEY, fio),
          AsyncStorage.setItem(CONFIRM_TS_KEY, now),
          AsyncStorage.setItem(BUYER_HISTORY_KEY, JSON.stringify(nextHist)),
        ]);
        setIsFioConfirmVisible(false);
      } catch (e) {
        warnBuyerFio("confirm", e);
      } finally {
        setIsFioLoading(false);
      }
    },
    [buyerHistory, setBuyerFio],
  );

  return {
    buyerHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  };
}
