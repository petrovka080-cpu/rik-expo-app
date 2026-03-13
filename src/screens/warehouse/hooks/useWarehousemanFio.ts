import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

type UseWarehousemanFioArgs = {
  getTodaySixAM: () => Date;
  onError?: (e: unknown) => void;
};

type UseWarehousemanFioResult = {
  warehousemanFio: string;
  warehousemanHistory: string[];
  isFioConfirmVisible: boolean;
  isFioLoading: boolean;
  setIsFioConfirmVisible: (value: boolean) => void;
  handleFioConfirm: (fio: string) => Promise<void>;
};

const CONFIRM_TS_KEY = "wh_warehouseman_confirm_ts";
const WAREHOUSEMAN_HISTORY_KEY = "wh_warehouseman_history_v1";

export function useWarehousemanFio({ getTodaySixAM, onError }: UseWarehousemanFioArgs): UseWarehousemanFioResult {
  const [warehousemanFio, setWarehousemanFio] = useState("");
  const [warehousemanHistory, setWarehousemanHistory] = useState<string[]>([]);
  const [isFioConfirmVisible, setIsFioConfirmVisible] = useState(false);
  const [isFioLoading, setIsFioLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("wh_warehouseman_fio");
        const lastConfirmStr = await AsyncStorage.getItem(CONFIRM_TS_KEY);
        const histRaw = await AsyncStorage.getItem(WAREHOUSEMAN_HISTORY_KEY);
        const historyArr = histRaw ? JSON.parse(histRaw) : [];

        if (!active) return;

        if (saved) setWarehousemanFio(saved);
        if (Array.isArray(historyArr)) setWarehousemanHistory(historyArr);

        const sixAM = getTodaySixAM();
        const lastConfirm = lastConfirmStr ? new Date(lastConfirmStr) : null;
        if (!lastConfirm || lastConfirm < sixAM) {
          setIsFioConfirmVisible(true);
        }
      } catch (e) {
        if (__DEV__) {
          console.warn("[warehousemanFio] load failed", e);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [getTodaySixAM]);

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
        setWarehousemanFio(fio);
        const now = new Date().toISOString();

        const nextHist = [fio, ...warehousemanHistory.filter((x) => x !== fio)].slice(0, 12);
        setWarehousemanHistory(nextHist);

        await Promise.all([
          AsyncStorage.setItem("wh_warehouseman_fio", fio),
          AsyncStorage.setItem(CONFIRM_TS_KEY, now),
          AsyncStorage.setItem(WAREHOUSEMAN_HISTORY_KEY, JSON.stringify(nextHist)),
        ]);
        setIsFioConfirmVisible(false);
      } catch (e) {
        onError?.(e);
      } finally {
        setIsFioLoading(false);
      }
    },
    [warehousemanHistory, onError],
  );

  return {
    warehousemanFio,
    warehousemanHistory,
    isFioConfirmVisible,
    isFioLoading,
    setIsFioConfirmVisible,
    handleFioConfirm,
  };
}
